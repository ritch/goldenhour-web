'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/hooks/useSession';
import { ensureAccountProfile, upsertAccountProfile } from '@/lib/profile';
import type { AccountProfile } from '@/types/profile';

export default function MenuAccountPage() {
  const { user, loading } = useSession();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void ensureAccountProfile(user.id).then((r) => {
      if (r.ok) setProfile(r.profile);
    });
  }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const result = await upsertAccountProfile(user.id, profile);
    setSaving(false);
    setMsg(result.ok ? 'Saved' : result.error);
  };

  if (loading || !user || !profile) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  const set = (patch: Partial<AccountProfile>) => setProfile({ ...profile, ...patch });

  return (
    <AppShell title="Account" subtitle="Profile & preferences" backHref="/menu">
      <div className="space-y-4">
        <label className="block">
          <span className="text-muted text-sm font-bold">Display name</span>
          <input
            className="input mt-1"
            value={profile.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="text-muted text-sm font-bold">Pronouns</span>
          <select
            className="input mt-1"
            value={profile.pronouns}
            onChange={(e) => set({ pronouns: e.target.value as AccountProfile['pronouns'] })}
          >
            <option value="they">they/them</option>
            <option value="she">she/her</option>
            <option value="he">he/him</option>
          </select>
        </label>

        <label className="block" id="ai">
          <span className="text-muted text-sm font-bold">AI instructions</span>
          <textarea
            className="input mt-1"
            rows={4}
            value={profile.systemPrompt}
            onChange={(e) => set({ systemPrompt: e.target.value })}
          />
        </label>

        <label className="block" id="facts">
          <span className="text-muted text-sm font-bold">Facts (one per line)</span>
          <textarea
            className="input mt-1"
            rows={5}
            value={profile.facts}
            onChange={(e) => set({ facts: e.target.value })}
          />
        </label>

        <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>

        {msg ? <p className="text-sm text-accent">{msg}</p> : null}
      </div>
    </AppShell>
  );
}
