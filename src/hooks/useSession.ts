'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useSession(requireAuth = true) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (requireAuth && !data.user) router.replace('/login');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (requireAuth && !session?.user) router.replace('/login');
    });

    return () => subscription.unsubscribe();
  }, [requireAuth, router]);

  return { user, loading };
}
