'use client';

import { useMemo, useState } from 'react';
import type { HouseholdMemberRow } from '@/lib/household';
import {
  removeHouseholdMember,
  updateHouseholdMemberRole,
} from '@/lib/household';
import {
  HOUSEHOLD_ROLE_LABELS,
  assignableRoles,
  canEditMemberRole,
  canRemoveMember,
  type HouseholdRole,
} from '@/types/householdRoles';

type Props = {
  userId: string;
  householdId: string;
  callerRole: HouseholdRole | null;
  createdByUserId: string | null;
  members: HouseholdMemberRow[];
  onRefresh: () => void;
  onLeftHousehold?: () => void;
  onMessage?: (text: string) => void;
};

export function HouseholdMemberManager({
  userId,
  householdId,
  callerRole,
  createdByUserId,
  members,
  onRefresh,
  onLeftHousehold,
  onMessage,
}: Props) {
  const [editing, setEditing] = useState<HouseholdMemberRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<HouseholdMemberRow | null>(null);

  const managerCount = useMemo(
    () => members.filter((m) => m.role === 'manager').length,
    [members]
  );

  const roleOptions = callerRole ? assignableRoles(callerRole) : [];

  const setRole = async (member: HouseholdMemberRow, newRole: HouseholdRole) => {
    if (!householdId || newRole === member.role) {
      setEditing(null);
      return;
    }
    setBusy(true);
    const result = await updateHouseholdMemberRole(householdId, member.userId, newRole);
    setBusy(false);
    if (result.ok) {
      setEditing(null);
      onRefresh();
      onMessage?.('Role updated');
    } else {
      onMessage?.(result.error);
    }
  };

  const removeMember = async (member: HouseholdMemberRow) => {
    setBusy(true);
    const result = await removeHouseholdMember(householdId, member.userId);
    setBusy(false);
    setConfirmRemove(null);
    if (result.ok) {
      if (member.userId === userId) {
        onLeftHousehold?.();
      } else {
        onRefresh();
        onMessage?.('Member removed');
      }
    } else {
      onMessage?.(result.error);
    }
  };

  return (
    <div className="space-y-2">
      <p className="font-extrabold text-sm">Members ({members.length})</p>
      <div className="divide-y divide-border rounded-xl border-2 border-border overflow-hidden">
        {members.map((member) => {
          const isSelf = member.userId === userId;
          const isCreator = createdByUserId === member.userId;
          const canEdit = canEditMemberRole(callerRole, member, createdByUserId);
          const canRemove = canRemoveMember({
            callerRole,
            callerUserId: userId,
            target: member,
            createdByUserId,
            managerCount,
          });

          return (
            <div
              key={member.userId}
              className="flex items-center gap-3 px-4 py-3 bg-surface"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">
                  {member.displayName}
                  {isSelf ? <span className="text-muted font-semibold"> (you)</span> : null}
                </p>
                <p className="text-muted text-sm">
                  {HOUSEHOLD_ROLE_LABELS[member.role]}
                  {isCreator ? ' · creator' : ''}
                </p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  className="btn-secondary text-sm py-1.5 px-3"
                  disabled={busy}
                  onClick={() => setEditing(member)}
                >
                  Edit
                </button>
              ) : null}
              {canRemove ? (
                <button
                  type="button"
                  className="text-sm font-bold text-red-400 hover:text-red-300 px-2"
                  disabled={busy}
                  onClick={() => setConfirmRemove(member)}
                >
                  {isSelf ? 'Leave' : 'Remove'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md space-y-3">
            <p className="font-extrabold text-lg">Change role</p>
            <p className="text-muted text-sm">{editing.displayName}</p>
            <div className="grid grid-cols-2 gap-2">
              {roleOptions.map((role) => (
                <button
                  key={role}
                  type="button"
                  disabled={busy}
                  className={`rounded-xl border-2 py-3 font-bold ${
                    editing.role === role
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-accent'
                  }`}
                  onClick={() => void setRole(editing, role)}
                >
                  {HOUSEHOLD_ROLE_LABELS[role]}
                </button>
              ))}
            </div>
            <button type="button" className="btn-secondary w-full" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {confirmRemove ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md space-y-3">
            <p className="font-extrabold text-lg">
              {confirmRemove.userId === userId ? 'Leave household?' : 'Remove member?'}
            </p>
            <p className="text-muted text-sm">
              {confirmRemove.userId === userId
                ? 'You will lose access to this household’s chat, tasks, and shared data.'
                : `${confirmRemove.displayName} will be removed from the household.`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1 bg-red-600 border-red-600"
                disabled={busy}
                onClick={() => void removeMember(confirmRemove)}
              >
                {confirmRemove.userId === userId ? 'Leave' : 'Remove'}
              </button>
              <button
                type="button"
                className="btn-secondary flex-1"
                disabled={busy}
                onClick={() => setConfirmRemove(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
