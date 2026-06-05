'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/');
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AuthForm />
    </div>
  );
}
