'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /user is the user dashboard — served by the main app at /
// This page redirects there with view=library mode so even Super Admins view normal user dashboard.
export default function UserPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      sessionStorage.setItem('seelibrary_view_mode', 'library');
    } catch {}
    router.replace('/?view=library');
  }, [router]);

  return null;
}
