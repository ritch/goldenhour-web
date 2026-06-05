'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/hooks/useSession';
import { ensureAccountProfile } from '@/lib/profile';
import { displayName } from '@/lib/pronouns';
import { loadFamilyChat } from '@/lib/webStorage';
import { DEFAULT_CHANNELS } from '@/types/familyChat';

export default function FamilyListPage() {
  const { user, loading } = useSession();
  const [author, setAuthor] = useState('Family');
  const [unread, setUnread] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    void ensureAccountProfile(user.id).then((r) => {
      if (r.ok) setAuthor(displayName(r.profile));
    });
    const state = loadFamilyChat();
    const counts: Record<string, number> = {};
    for (const ch of DEFAULT_CHANNELS) {
      const lastRead = state.lastReadAt[ch.id] ?? 0;
      counts[ch.id] =
        state.messagesByChannel[ch.id]?.filter((m) => m.createdAt > lastRead).length ?? 0;
    }
    setUnread(counts);
  }, [user]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <AppShell title="Family Chat" subtitle={`Posting as ${author}`}>
      <p className="text-muted text-xs mb-4">Saved in this browser — syncs with AI chat context.</p>
      <div className="space-y-2">
        {DEFAULT_CHANNELS.map((ch) => (
          <Link
            key={ch.id}
            href={`/family/${ch.id}`}
            className="card flex items-center justify-between hover:border-accent"
          >
            <div>
              <p className="font-extrabold">#{ch.name}</p>
              <p className="text-muted text-sm">{ch.description}</p>
            </div>
            {(unread[ch.id] ?? 0) > 0 ? (
              <span className="bg-accent text-[#2a1810] rounded-full px-2 py-1 text-xs font-black">
                {unread[ch.id]}
              </span>
            ) : (
              <span className="text-muted">→</span>
            )}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
