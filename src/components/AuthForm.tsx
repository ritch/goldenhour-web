'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/config';

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <p className="text-warning">
        Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const supabase = createClient();

    const result =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.replace('/');
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4 max-w-sm mx-auto">
      <h1 className="text-2xl font-extrabold text-center">Golden Hour</h1>
      <p className="text-muted text-center text-sm">Web companion for caregivers & family</p>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="input"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        minLength={6}
        className="input"
      />

      {error ? <p className="text-warning text-sm">{error}</p> : null}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>

      <button
        type="button"
        className="text-sm text-muted w-full text-center hover:text-accent"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
      >
        {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
