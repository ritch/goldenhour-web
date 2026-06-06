'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchHouseholdMembers,
  fetchMyHousehold,
  type HouseholdMemberRow,
} from '@/lib/household';
import {
  householdPermissions,
  type HouseholdPermissions,
  type HouseholdRole,
} from '@/types/householdRoles';

export function useHouseholdRole() {
  const [role, setRole] = useState<HouseholdRole | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [createdByUserId, setCreatedByUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMemberRow[]>([]);
  const [ready, setReady] = useState(false);
  const [noHousehold, setNoHousehold] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    setError(undefined);
    const result = await fetchMyHousehold();
    if (!result.ok) {
      setError(result.error);
      setReady(true);
      return;
    }
    if ('empty' in result && result.empty) {
      setNoHousehold(true);
      setRole(null);
      setHouseholdId(null);
      setHouseholdName(null);
      setInviteCode(null);
      setCreatedByUserId(null);
      setMembers([]);
      setReady(true);
      return;
    }

    setNoHousehold(false);
    setHouseholdId(result.id);
    setHouseholdName(result.name);
    setInviteCode(result.inviteCode);
    setCreatedByUserId(result.createdByUserId);
    setRole(result.role);

    const memberResult = await fetchHouseholdMembers(result.id);
    if (memberResult.ok) setMembers(memberResult.members);

    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const inHousehold = Boolean(householdId && role);
  const permissions: HouseholdPermissions = useMemo(
    () => householdPermissions(role, inHousehold),
    [role, inHousehold]
  );

  return {
    ready,
    noHousehold,
    error,
    role,
    householdId,
    householdName,
    inviteCode,
    createdByUserId,
    members,
    permissions,
    inHousehold,
    refresh,
  };
}
