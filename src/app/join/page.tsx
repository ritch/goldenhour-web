'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { joinHousehold } from '@/lib/household';

function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get('code')?.trim().toUpperCase() ?? '';
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!code) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace(`/login?next=/join?code=${encodeURIComponent(code)}`);
        return;
      }
      setStatus('busy');
      const result = await joinHousehold(code);
      if (result.ok) {
        setStatus('ok');
        setMessage('Joined household!');
        setTimeout(() => router.replace('/household'), 1200);
      } else {
        setStatus('err');
        setMessage(result.error);
      }
    });
  }, [code, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <h1 className="text-xl font-extrabold">Join household</h1>
      {code ? (
        <p className="text-muted">
          {status === 'busy' ? 'Joining…' : status === 'ok' ? message : status === 'err' ? message : '…'}
        </p>
      ) : (
        <p className="text-muted">No invite code in link.</p>
      )}
      <Link href="/household" className="text-accent font-bold">
        Go to Household
      </Link>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <JoinInner />
    </Suspense>
  );
}
