'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AdminSkeleton } from '../../components/Skeleton';

const AdminDashboard = dynamic(
  () => import('../../components/AdminDashboard').then((m) => m.AdminDashboard),
  { loading: () => <AdminSkeleton />, ssr: false }
);

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    fullName: string;
    email: string;
    phone: string;
    role: string;
    avatar?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyAndLoad = async () => {
      try {
        // 1. Load user from localStorage
        const savedUser = localStorage.getItem('seelibrary_user') || localStorage.getItem('quickcheck_user');
        if (!savedUser) {
          router.replace('/');
          return;
        }

        const parsedUser = JSON.parse(savedUser);
        if (!parsedUser?.email) {
          router.replace('/');
          return;
        }

        const cleanEmail = (parsedUser.email || '').toLowerCase().trim();
        const isKnownSuperAdmin =
          cleanEmail === 'shubhamrewamp17@gmail.com' ||
          cleanEmail === 'kushwahashubham5932@gmail.com' ||
          (Boolean(process.env.NEXT_PUBLIC_ADMIN_EMAIL) && cleanEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase().trim());

        if (isKnownSuperAdmin) {
          const canonicalUser = {
            fullName: parsedUser.fullName || 'Super Admin',
            email: cleanEmail,
            phone: parsedUser.phone || '',
            role: 'SUPER_ADMIN',
            avatar: parsedUser.avatar,
          };
          setCurrentUser(canonicalUser);
          setIsVerifying(false);

          // Asynchronously sync in background without blocking
          fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, fullName: parsedUser.fullName || '' }),
          }).catch(() => {});
          return;
        }

        // 2. Verify role from DB via /api/auth/sync or directly from Render backend
        let data: any = null;
        try {
          const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, fullName: parsedUser.fullName || '' }),
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            data = await res.json();
          }
        } catch (e) {
          console.warn('[admin page] /api/auth/sync failed:', e);
        }

        if (!data?.user || data.user.role !== 'SUPER_ADMIN') {
          try {
            const directRes = await fetch('https://seelibrarybackend.onrender.com/api/v1/auth/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, fullName: parsedUser.fullName || '' }),
              signal: AbortSignal.timeout(5000),
            });
            if (directRes.ok) {
              const rData = await directRes.json();
              if (rData?.user) {
                data = rData;
              }
            }
          } catch (e) {
            console.warn('[admin page] Render direct sync failed:', e);
          }
        }

        const canonicalRole = data?.user?.role || (parsedUser.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'USER');

        if (canonicalRole !== 'SUPER_ADMIN') {
          router.replace('/');
          return;
        }

        // 3. Update localStorage with canonical user
        const canonicalUser = {
          fullName: data?.user?.fullName || parsedUser.fullName || '',
          email: data?.user?.email || cleanEmail,
          phone: data?.user?.phone || parsedUser.phone || '',
          role: 'SUPER_ADMIN',
          avatar: data?.user?.avatar || parsedUser.avatar,
        };
        try {
          localStorage.setItem('seelibrary_user', JSON.stringify(canonicalUser));
        } catch {}

        setCurrentUser(canonicalUser);
      } catch (err) {
        console.error('[admin page] Error verifying admin:', err);
        const saved = localStorage.getItem('seelibrary_user');
        if (saved) {
          try {
            const u = JSON.parse(saved);
            const clean = (u.email || '').toLowerCase().trim();
            if (u.role === 'SUPER_ADMIN' || clean === 'shubhamrewamp17@gmail.com' || clean === 'kushwahashubham5932@gmail.com') {
              setCurrentUser({ ...u, role: 'SUPER_ADMIN' });
              return;
            }
          } catch {}
        }
        router.replace('/');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAndLoad();
  }, [router]);

  if (isVerifying || !currentUser) {
    return <AdminSkeleton />;
  }

  const handleLogout = () => {
    try {
      localStorage.removeItem('seelibrary_user');
      localStorage.removeItem('quickcheck_user');
      localStorage.removeItem('seelibrary_libraries');
      localStorage.removeItem('seelibrary_active_lib_id');
      sessionStorage.clear();
      document.cookie = 'seelibrary_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch {}
    router.replace('/');
  };

  const handleSwitchToLibraryView = (targetLibId?: string) => {
    try {
      sessionStorage.setItem('seelibrary_view_mode', 'library');
      if (targetLibId) {
        localStorage.setItem('seelibrary_active_lib_id', targetLibId);
      }
    } catch {}
    router.push('/?view=library');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white transition-colors">
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdminDashboard
          currentUser={currentUser}
          onSwitchToLibraryView={handleSwitchToLibraryView}
          onLogout={handleLogout}
        />
      </main>
    </div>
  );
}
