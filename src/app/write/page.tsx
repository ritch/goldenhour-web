'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/hooks/useSession';
import { ensureAccountProfile } from '@/lib/profile';

export default function WritePage() {
  const { user, loading } = useSession();
  const [text, setText] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    void ensureAccountProfile(user.id).then(() => setReady(true));
  }, [user]);

  if (loading || !user || !ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  const chatHref = text.trim() ? `/chat?seed=${encodeURIComponent(text.trim())}` : '/chat';

  return (
    <AppShell title="Write" subtitle="Compose a message">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="What do you want to say?"
        className="input w-full text-lg leading-relaxed"
      />
      <div className="flex flex-wrap gap-2 mt-4">
        <button type="button" className="btn-secondary" onClick={() => setText('')}>
          Clear
        </button>
        <button type="button" className="btn-secondary" onClick={() => void navigator.clipboard.writeText(text)}>
          Copy
        </button>
        <Link href={chatHref} className="btn-primary inline-block text-center">
          Open in AI Chat
        </Link>
      </div>
      <p className="text-muted text-xs mt-4">
        Full AAC keyboard from the mobile app is not on web yet — use AI Chat for help composing.
      </p>
    </AppShell>
  );
}
