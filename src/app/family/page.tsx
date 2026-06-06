'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useFamilyChat } from '@/hooks/useFamilyChat';
import { useHouseholdRole } from '@/hooks/useHouseholdRole';
import { useSession } from '@/hooks/useSession';
import { ensureAccountProfile } from '@/lib/profile';
import { displayName } from '@/lib/pronouns';
import type { AccountProfile } from '@/types/profile';

export default function FamilyListPage() {
  const { user, loading } = useSession();
  const [author, setAuthor] = useState('Family');
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const household = useHouseholdRole();
  const familyChat = useFamilyChat(
    author,
    user?.id ?? '',
    profile,
    household.ready ? household.permissions : undefined
  );

  useEffect(() => {
    if (!user) return;
    void ensureAccountProfile(user.id).then((r) => {
      if (r.ok) {
        setProfile(r.profile);
        setAuthor(displayName(r.profile));
      }
    });
  }, [user]);

  if (
    household.ready &&
    !household.permissions.canSeeFamilyChat &&
    !household.permissions.canSeeCaregiverChat
  ) {
    return (
      <AppShell title="Family Chat">
        <p className="text-muted">Your role does not include access to household chat.</p>
      </AppShell>
    );
  }

  if (loading || !user || !familyChat.ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  if (familyChat.loadError) {
    return (
      <AppShell title="Family Chat">
        <p className="text-muted mb-4">{familyChat.loadError}</p>
        <button type="button" className="btn-primary" onClick={() => void familyChat.refresh()}>
          Try again
        </button>
      </AppShell>
    );
  }

  const subtitle = familyChat.noHousehold
    ? 'Join a household first'
    : familyChat.householdName
      ? `${familyChat.householdName} · posting as ${author}`
      : `Posting as ${author}`;

  return (
    <AppShell title="Family Chat" subtitle={subtitle}>
      {familyChat.noHousehold ? (
        <p className="text-muted text-sm mb-4">
          Create or join a household under Menu → Household. Everyone in the family shares these channels.
        </p>
      ) : null}
      <div className="space-y-2">
        {familyChat.channels.map((ch) => (
          <Link
            key={ch.id}
            href={familyChat.noHousehold ? '/menu/household' : `/family/${ch.id}`}
            className="card flex items-center justify-between hover:border-accent"
          >
            <div>
              <p className="font-extrabold">#{ch.name}</p>
              <p className="text-muted text-sm">{ch.description}</p>
            </div>
            {(familyChat.unreadByChannel[ch.id] ?? 0) > 0 ? (
              <span className="bg-accent text-on-accent rounded-full px-2 py-1 text-xs font-black">
                {familyChat.unreadByChannel[ch.id]}
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
