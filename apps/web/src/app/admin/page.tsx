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

        // 2. Always verify role from DB via /api/auth/sync (source of truth)
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: parsedUser.email, fullName: parsedUser.fullName || '' }),
        });

        if (!res.ok) {
          router.replace('/');
          return;
        }

        const data = await res.json();
        const canonicalRole = data?.user?.role;

        if (canonicalRole !== 'SUPER_ADMIN') {
          // Not an admin — redirect to user dashboard
          router.replace('/user');
          return;
        }

        // 3. Update localStorage with canonical user
        const canonicalUser = {
          fullName: data.user.fullName || parsedUser.fullName || '',
          email: data.user.email,
          phone: data.user.phone || parsedUser.phone || '',
          role: 'SUPER_ADMIN',
          avatar: data.user.avatar || parsedUser.avatar,
        };
        try {
          localStorage.setItem('seelibrary_user', JSON.stringify(canonicalUser));
        } catch {}

        setCurrentUser(canonicalUser);
      } catch (err) {
        console.error('[admin page] Error verifying admin:', err);
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

  return (
    <AdminDashboard
      currentUser={currentUser}
      onSwitchToLibraryView={() => {
        router.push('/user');
      }}
    />
  );
}
