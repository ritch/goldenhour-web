'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { createClient } from '@/lib/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resetMessage, setResetMessage] = useState<string | undefined>();

  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      setResetMessage('Password updated. Sign in with your new password.');
      return;
    }
    const authError = searchParams.get('error');
    if (authError === 'auth_callback') {
      setResetMessage('Google sign-in failed. Try again or use email.');
    } else if (authError) {
      setResetMessage('Sign-in link expired or invalid. Try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/write');
    });
  }, [router]);

  return (
    <div className="w-full max-w-sm space-y-3">
      {resetMessage ? <p className="text-muted text-sm text-center">{resetMessage}</p> : null}
      <AuthForm />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
