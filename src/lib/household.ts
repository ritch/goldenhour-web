import { createClient } from '@/lib/supabase/client';
import { fetchAccountProfile } from '@/lib/profile';
import {
  clearActiveHouseholdId,
  getActiveHouseholdId,
  setActiveHouseholdId,
} from '@/lib/webStorage';
import type { HouseholdRole, JoinInviteRole } from '@/types/householdRoles';
import { isHouseholdRole, isJoinInviteRole } from '@/types/householdRoles';

export type HouseholdMemberRow = {
  userId: string;
  role: HouseholdRole;
  displayName: string;
  createdAt: string;
};

function inviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createHousehold(name: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Sign in first' };

  const invite = inviteCode();
  const { data, error } = await supabase.rpc('create_household', {
    h_name: name.trim() || 'Golden Hour',
    invite,
  });

  if (error || !data) return { ok: false as const, error: error?.message ?? 'Could not create' };
  const row = data as { household_id?: string; invite_code?: string };
  if (!row.household_id) return { ok: false as const, error: 'Could not create household' };

  setActiveHouseholdId(row.household_id);
  return {
    ok: true as const,
    householdId: row.household_id,
    inviteCode: row.invite_code ?? invite,
  };
}

export async function joinHousehold(code: string, joinRole: JoinInviteRole = 'member') {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Sign in first' };

  const role = isJoinInviteRole(joinRole) ? joinRole : 'member';
  const { data, error } = await supabase.rpc('join_household', {
    invite: code.trim().toUpperCase(),
    join_role: role,
  });
  if (error || !data) return { ok: false as const, error: error?.message ?? 'Invalid code' };

  const profileResult = await fetchAccountProfile(user.id);
  if (profileResult.ok && profileResult.profile.displayName.trim()) {
    await supabase
      .from('household_members')
      .update({ display_name: profileResult.profile.displayName.trim() })
      .eq('household_id', data)
      .eq('user_id', user.id);
  }

  setActiveHouseholdId(data);
  return { ok: true as const, householdId: data };
}

export async function fetchMyHousehold() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Sign in first' };

  const activeId = getActiveHouseholdId();

  let membershipQuery = supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', user.id);

  if (activeId) {
    membershipQuery = membershipQuery.eq('household_id', activeId);
  }

  const { data: memberships, error: memberError } = await membershipQuery.limit(1);

  if (memberError) return { ok: false as const, error: memberError.message };
  const membership = memberships?.[0];
  const householdId = membership?.household_id;
  if (!householdId) return { ok: true as const, empty: true as const };

  const roleRaw = membership?.role;
  const role: HouseholdRole = isHouseholdRole(roleRaw) ? roleRaw : 'member';

  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, name, invite_code, created_by')
    .eq('id', householdId)
    .single();

  if (householdError || !household) {
    return { ok: false as const, error: householdError?.message ?? 'Not found' };
  }

  setActiveHouseholdId(household.id);
  return {
    ok: true as const,
    id: household.id,
    name: household.name,
    inviteCode: household.invite_code,
    role,
    createdByUserId: household.created_by ?? null,
  };
}

export async function fetchHouseholdMembers(householdId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id, role, display_name, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (error) return { ok: false as const, error: error.message };

  const members: HouseholdMemberRow[] = (data ?? []).map((row) => ({
    userId: row.user_id,
    role: isHouseholdRole(row.role) ? row.role : 'member',
    displayName: row.display_name,
    createdAt: row.created_at,
  }));

  return { ok: true as const, members };
}

export async function updateHouseholdMemberRole(
  householdId: string,
  targetUserId: string,
  newRole: HouseholdRole
) {
  const supabase = createClient();
  const { error } = await supabase.rpc('update_household_member_role', {
    h_id: householdId,
    target_user_id: targetUserId,
    new_role: newRole,
  });
  if (error) {
    const msg = error.message;
    if (/update_household_member_role|schema cache/i.test(msg)) {
      return {
        ok: false as const,
        error: `${msg} — Run 20250606210000_household_member_management.sql in Supabase SQL Editor.`,
      };
    }
    return { ok: false as const, error: msg };
  }
  return { ok: true as const };
}

export async function removeHouseholdMember(householdId: string, targetUserId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.rpc('remove_household_member', {
    h_id: householdId,
    target_user_id: targetUserId,
  });
  if (error) {
    const msg = error.message;
    if (/remove_household_member|schema cache/i.test(msg)) {
      return {
        ok: false as const,
        error: `${msg} — Run 20250606210000_household_member_management.sql in Supabase SQL Editor.`,
      };
    }
    return { ok: false as const, error: msg };
  }
  if (user?.id === targetUserId) {
    clearActiveHouseholdId();
  }
  return { ok: true as const };
}

export function householdJoinUrl(code: string, role?: JoinInviteRole): string {
  const params = new URLSearchParams({ code });
  if (role && role !== 'member') params.set('role', role);
  const qs = params.toString();
  if (typeof window === 'undefined') return `/join?${qs}`;
  return `${window.location.origin}/join?${qs}`;
}

export { getActiveHouseholdId };
