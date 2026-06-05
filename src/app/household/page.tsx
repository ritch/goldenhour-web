'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/hooks/useSession';
import { createHousehold, fetchMyHousehold, householdJoinUrl, joinHousehold } from '@/lib/household';

export default function HouseholdPage() {
  const { user, loading } = useSession();
  const [name, setName] = useState('Golden Hour');
  const [joinCode, setJoinCode] = useState('');
  const [household, setHousehold] = useState<{ name: string; inviteCode: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const result = await fetchMyHousehold();
    if (result.ok && !('empty' in result)) {
      setHousehold({ name: result.name, inviteCode: result.inviteCode });
    } else {
      setHousehold(null);
    }
  };

  useEffect(() => {
    if (user) void refresh();
  }, [user]);

  const handleCreate = async () => {
    setBusy(true);
    const result = await createHousehold(name);
    setBusy(false);
    if (result.ok) {
      setHousehold({ name, inviteCode: result.inviteCode });
      setMsg('Household created');
    } else setMsg(result.error);
  };

  const handleJoin = async () => {
    setBusy(true);
    const result = await joinHousehold(joinCode);
    setBusy(false);
    if (result.ok) {
      setMsg('Joined!');
      void refresh();
    } else setMsg(result.error);
  };

  const copyLink = async () => {
    if (!household) return;
    await navigator.clipboard.writeText(householdJoinUrl(household.inviteCode));
    setMsg('Invite link copied');
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <AppShell title="Household" subtitle="Family group">
      {household ? (
        <div className="card space-y-3">
          <p className="font-extrabold text-lg">{household.name}</p>
          <p className="text-muted text-sm">Invite code</p>
          <p className="text-accent text-2xl font-black tracking-widest">{household.inviteCode}</p>
          <p className="text-muted text-xs break-all">{householdJoinUrl(household.inviteCode)}</p>
          <button type="button" className="btn-primary" onClick={() => void copyLink()}>
            Copy invite link
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card space-y-2">
            <p className="font-extrabold">Create household</p>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Household name" />
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleCreate()}>
              Create
            </button>
          </div>
          <div className="card space-y-2">
            <p className="font-extrabold">Join with code</p>
            <input
              className="input uppercase tracking-widest"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
            />
            <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleJoin()}>
              Join
            </button>
          </div>
        </div>
      )}
      {msg ? <p className="text-sm text-accent mt-4">{msg}</p> : null}
    </AppShell>
  );
}
