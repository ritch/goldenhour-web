import { createClient } from '@/lib/supabase/client';
import { getActiveHouseholdId, setActiveHouseholdId } from '@/lib/webStorage';

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

export async function joinHousehold(code: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Sign in first' };

  const { data, error } = await supabase.rpc('join_household', {
    invite: code.trim().toUpperCase(),
  });
  if (error || !data) return { ok: false as const, error: error?.message ?? 'Invalid code' };

  setActiveHouseholdId(data);
  return { ok: true as const, householdId: data };
}

export async function fetchMyHousehold() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Sign in first' };

  const { data: memberships, error: memberError } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1);

  if (memberError) return { ok: false as const, error: memberError.message };
  const householdId = memberships?.[0]?.household_id;
  if (!householdId) return { ok: true as const, empty: true as const };

  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, name, invite_code')
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
  };
}

export function householdJoinUrl(code: string): string {
  if (typeof window === 'undefined') return `/join?code=${code}`;
  return `${window.location.origin}/join?code=${encodeURIComponent(code)}`;
}

export { getActiveHouseholdId };
