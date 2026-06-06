'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/config';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setChecking(false);
      return;
    }

    const supabase = createClient();

    const finishCheck = async () => {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const code = new URLSearchParams(window.location.search).get('code');

      if (code) {
        router.replace(`/auth/callback?code=${encodeURIComponent(code)}&type=recovery`);
        return;
      }

      if (hashParams.get('type') === 'recovery') {
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            setError(sessionError.message);
            setChecking(false);
            return;
          }
          window.history.replaceState(null, '', '/auth/reset-password');
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setReady(true);
      } else {
        setError('This reset link is invalid or has expired. Request a new one from the login page.');
      }
      setChecking(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        setChecking(false);
        setError(undefined);
      }
    });

    void finishCheck();

    return () => subscription.unsubscribe();
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    router.replace('/login?reset=success');
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-warning">Supabase is not configured.</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted">Verifying reset link…</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm space-y-3 text-center">
          <p className="text-warning text-sm">{error ?? 'Unable to open reset link.'}</p>
          <button type="button" className="btn-primary w-full" onClick={() => router.replace('/login')}>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={(e) => void submit(e)} className="space-y-4 max-w-sm w-full">
        <h1 className="text-2xl font-extrabold text-center">Set a new password</h1>
        <p className="text-muted text-center text-sm">Choose a new password for your Golden Hour account.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          required
          minLength={6}
          className="input"
          autoComplete="new-password"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          required
          minLength={6}
          className="input"
          autoComplete="new-password"
        />

        {error ? <p className="text-warning text-sm">{error}</p> : null}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? '…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
