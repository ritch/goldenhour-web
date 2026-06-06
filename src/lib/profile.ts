import { createClient } from '@/lib/supabase/client';
import { GENERIC_PROFILE, type AccountProfile, type PronounSet } from '@/types/profile';

export function parsePronounSet(value: unknown): PronounSet {
  if (value === 'he' || value === 'she' || value === 'they') return value;
  return 'they';
}

export function profileFromRegistration(
  firstName?: string | null,
  pronouns?: unknown
): AccountProfile | null {
  const name = firstName?.trim();
  if (!name) return null;
  return {
    ...GENERIC_PROFILE,
    displayName: name,
    pronouns: parsePronounSet(pronouns),
  };
}

type ProfileRow = {
  user_id: string;
  display_name: string;
  system_prompt: string;
  facts: string;
  voice: string;
  pronouns: string;
};

function rowToProfile(row: ProfileRow): AccountProfile {
  return {
    displayName: row.display_name,
    systemPrompt: row.system_prompt,
    facts: row.facts,
    voice: row.voice === 'onyx' ? 'onyx' : 'nova',
    pronouns:
      row.pronouns === 'he' || row.pronouns === 'she' || row.pronouns === 'they'
        ? row.pronouns
        : 'they',
  };
}

function profileToRow(userId: string, profile: AccountProfile) {
  return {
    user_id: userId,
    display_name: profile.displayName.trim(),
    system_prompt: profile.systemPrompt.trim(),
    facts: profile.facts.trim(),
    voice: profile.voice,
    pronouns: profile.pronouns,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchAccountProfile(
  userId: string
): Promise<{ ok: true; profile: AccountProfile } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, display_name, system_prompt, facts, voice, pronouns')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'not_found' };
  return { ok: true, profile: rowToProfile(data as ProfileRow) };
}

export async function upsertAccountProfile(
  userId: string,
  profile: AccountProfile
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const { error } = await supabase.from('user_profiles').upsert(profileToRow(userId, profile));
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function ensureAccountProfile(
  userId: string
): Promise<{ ok: true; profile: AccountProfile } | { ok: false; error: string }> {
  const existing = await fetchAccountProfile(userId);
  if (existing.ok) return existing;
  if (existing.error !== 'not_found') return { ok: false, error: existing.error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = user?.user_metadata ?? {};
  const profile =
    profileFromRegistration(
      (meta.first_name as string | undefined) ?? (meta.display_name as string | undefined),
      meta.pronouns
    ) ?? { ...GENERIC_PROFILE };

  const saved = await upsertAccountProfile(userId, profile);
  if (!saved.ok) return { ok: false, error: saved.error };
  return { ok: true, profile };
}
