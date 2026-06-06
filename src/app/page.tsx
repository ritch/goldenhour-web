'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Preserve auth tokens from Supabase emails before routing into the app shell. */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const { hash, search } = window.location;

    if (hash.includes('type=recovery')) {
      router.replace(`/auth/reset-password${hash}`);
      return;
    }

    if (new URLSearchParams(search).get('code')) {
      router.replace(`/auth/callback${search}`);
      return;
    }

    router.replace('/write');
  }, [router]);

  return null;
}
