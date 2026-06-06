'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/config';
import { GoogleLogo } from '@/components/GoogleLogo';
import { profileFromRegistration, upsertAccountProfile } from '@/lib/profile';
import type { PronounSet } from '@/types/profile';

const PRONOUNS: PronounSet[] = ['she', 'he', 'they'];
const PRONOUN_LABELS: Record<PronounSet, string> = {
  she: 'She / her',
  he: 'He / him',
  they: 'They / them',
};

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [pronouns, setPronouns] = useState<PronounSet>('they');
  const [error, setError] = useState<string | undefined>();
  const [info, setInfo] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

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

    if (mode === 'signup' && !firstName.trim()) {
      setBusy(false);
      setError('Enter your first name');
      return;
    }

    const result =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName.trim(),
                display_name: firstName.trim(),
                pronouns,
              },
            },
          });

    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === 'signup' && result.data.user) {
      const profile = profileFromRegistration(firstName, pronouns);
      if (profile) {
        await upsertAccountProfile(result.data.user.id, profile);
      }
    }

    router.replace('/');
    router.refresh();
  };

  const signInWithGoogle = async () => {
    setGoogleBusy(true);
    setError(undefined);
    setInfo(undefined);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/write`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    setGoogleBusy(false);
    if (oauthError) setError(oauthError.message);
  };

  const requestReset = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap forgot password');
      return;
    }
    setForgotBusy(true);
    setError(undefined);
    setInfo(undefined);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setForgotBusy(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo('Check your email for a password reset link.');
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4 max-w-sm mx-auto">
      <h1 className="text-2xl font-extrabold text-center">Golden Hour</h1>
      <p className="text-muted text-center text-sm">Web companion for caregivers & family</p>

      <div className="flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-xl border-2 py-2 font-bold ${
            mode === 'signin' ? 'border-accent bg-accent/10' : 'border-border'
          }`}
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`flex-1 rounded-xl border-2 py-2 font-bold ${
            mode === 'signup' ? 'border-accent bg-accent/10' : 'border-border'
          }`}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>

      <button
        type="button"
        disabled={busy || googleBusy}
        className="w-full rounded-xl border-2 border-border py-3 font-bold bg-surface flex items-center justify-center gap-2"
        onClick={() => void signInWithGoogle()}
      >
        {googleBusy ? (
          '…'
        ) : (
          <>
            <GoogleLogo size={20} />
            <span>Continue with Google</span>
          </>
        )}
      </button>

      <p className="text-muted text-xs text-center font-bold">or use email</p>

      {mode === 'signup' ? (
        <>
          <div>
            <label className="text-muted text-xs font-bold block mb-1">First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="How should we call you?"
              required
              autoCapitalize="words"
              className="input"
            />
          </div>
          <div>
            <label className="text-muted text-xs font-bold block mb-1">Pronouns</label>
            <div className="flex flex-wrap gap-2">
              {PRONOUNS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-bold ${
                    pronouns === p ? 'border-accent bg-accent/10' : 'border-border'
                  }`}
                  onClick={() => setPronouns(p)}
                >
                  {PRONOUN_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

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
      {info ? <p className="text-muted text-sm">{info}</p> : null}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>

      {mode === 'signin' ? (
        <button
          type="button"
          disabled={forgotBusy}
          className="w-full text-sm text-muted underline"
          onClick={() => void requestReset()}
        >
          {forgotBusy ? 'Sending…' : 'Forgot password?'}
        </button>
      ) : null}

      {mode === 'signup' ? (
        <p className="text-muted text-xs text-center">
          Your first name is used as your display name in chat and household.
        </p>
      ) : null}
    </form>
  );
}
