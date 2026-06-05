'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { HomeMenu } from '@/components/HomeMenu';
import { useSession } from '@/hooks/useSession';
import { ensureAccountProfile } from '@/lib/profile';
import { displayName } from '@/lib/pronouns';

export default function HomePage() {
  const { user, loading } = useSession();
  const [name, setName] = useState('…');

  useEffect(() => {
    if (!user) return;
    void ensureAccountProfile(user.id).then((r) => {
      if (r.ok) setName(displayName(r.profile));
    });
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>
    );
  }

  return (
    <AppShell title="Golden Hour" subtitle="Home" backHref={null}>
      <HomeMenu name={name} />
    </AppShell>
  );
}
