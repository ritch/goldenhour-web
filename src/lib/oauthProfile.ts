import type { User } from '@supabase/supabase-js';
import { fetchAccountProfile, profileFromRegistration, upsertAccountProfile } from '@/lib/profile';

function firstNameFromMetadata(meta: Record<string, unknown>): string | null {
  const given = meta.given_name ?? meta.first_name;
  if (typeof given === 'string' && given.trim()) return given.trim();

  const full = meta.full_name ?? meta.name;
  if (typeof full === 'string' && full.trim()) {
    return full.trim().split(/\s+/)[0] ?? null;
  }

  return null;
}

export async function ensureOAuthProfile(user: User): Promise<void> {
  const existing = await fetchAccountProfile(user.id);
  if (existing.ok) return;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName = firstNameFromMetadata(meta);
  const profile = profileFromRegistration(firstName, meta.pronouns);
  if (!profile) return;

  await upsertAccountProfile(user.id, profile);
}
