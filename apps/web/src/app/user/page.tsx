'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /user is the user dashboard — served by the main app at /
// This page simply redirects there while preserving the clean URL convention.
export default function UserPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null;
}
