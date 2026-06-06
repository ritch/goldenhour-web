'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { HouseholdMemberManager } from '@/components/HouseholdMemberManager';
import { useHouseholdRole } from '@/hooks/useHouseholdRole';
import { useSession } from '@/hooks/useSession';
import {
  createHousehold,
  householdJoinUrl,
  joinHousehold,
} from '@/lib/household';
import { HOUSEHOLD_ROLE_LABELS, type JoinInviteRole } from '@/types/householdRoles';

export default function MenuHouseholdPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const household = useHouseholdRole();
  const [name, setName] = useState('Golden Hour');
  const [joinCode, setJoinCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void household.refresh();
  }, [user, household]);

  const handleCreate = async () => {
    setBusy(true);
    const result = await createHousehold(name);
    setBusy(false);
    if (result.ok) {
      setMsg('Household created — you are the manager');
      void household.refresh();
    } else setMsg(result.error);
  };

  const handleJoin = async () => {
    setBusy(true);
    const result = await joinHousehold(joinCode);
    setBusy(false);
    if (result.ok) {
      setMsg('Joined!');
      void household.refresh();
    } else setMsg(result.error);
  };

  const copyLink = async (role?: JoinInviteRole) => {
    if (!household.inviteCode) return;
    await navigator.clipboard.writeText(householdJoinUrl(household.inviteCode, role));
    setMsg(
      role
        ? `${HOUSEHOLD_ROLE_LABELS[role === 'caregiver' ? 'caregiver' : 'doctor']} invite copied`
        : 'Invite link copied'
    );
  };

  if (loading || !user || !household.ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  const hasHousehold = !household.noHousehold && household.householdId;
  const creatorName = household.createdByUserId
    ? household.members.find((m) => m.userId === household.createdByUserId)?.displayName
    : undefined;
  const isCreator = Boolean(user?.id && household.createdByUserId === user.id);

  return (
    <AppShell title="Household" subtitle="Family group & roles" backHref="/menu">
      {hasHousehold ? (
        <div className="space-y-4">
          <div className="card space-y-3">
            <p className="font-extrabold text-lg">{household.householdName}</p>
            {creatorName ? (
              <p className="text-muted text-sm">
                {isCreator ? 'You created this household' : `Created by ${creatorName}`}
              </p>
            ) : null}
            {household.role ? (
              <p className="text-accent text-sm font-bold">
                Your role: {HOUSEHOLD_ROLE_LABELS[household.role]}
              </p>
            ) : null}
            <p className="text-muted text-sm">Invite code</p>
            <p className="text-accent text-2xl font-black tracking-widest">{household.inviteCode}</p>
            {household.permissions.canInviteMembers ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => void copyLink()}>
                  Copy member link
                </button>
                <button type="button" className="btn-secondary" onClick={() => void copyLink('caregiver')}>
                  Caregiver link
                </button>
                <button type="button" className="btn-secondary" onClick={() => void copyLink('doctor')}>
                  Doctor link
                </button>
              </div>
            ) : null}
          </div>

          {household.members.length > 0 ? (
            <div className="card">
              <HouseholdMemberManager
                userId={user.id}
                householdId={household.householdId!}
                callerRole={household.role}
                createdByUserId={household.createdByUserId}
                members={household.members}
                onRefresh={() => void household.refresh()}
                onLeftHousehold={() => router.replace('/menu/household')}
                onMessage={setMsg}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card space-y-2">
            <p className="font-extrabold">Create household</p>
            <p className="text-muted text-sm">You will be added as the manager.</p>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Household name"
            />
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
