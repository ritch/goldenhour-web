import { createClient } from '@/lib/supabase/client';
import { fetchMyHousehold } from '@/lib/household';
import type { ContentVisibility } from '@/types/contentVisibility';
import type { VisitTranscript } from '@/types/visitTranscript';

type TranscriptRow = {
  id: string;
  household_id: string | null;
  user_id: string;
  title: string;
  transcript: string;
  duration_ms: number;
  recorded_at: string;
  visibility: ContentVisibility;
  created_at: string;
  updated_at: string;
};

function mapTranscript(row: TranscriptRow): VisitTranscript {
  return {
    id: row.id,
    userId: row.user_id,
    householdId: row.household_id,
    title: row.title,
    transcript: row.transcript ?? '',
    durationMs: row.duration_ms ?? 0,
    recordedAt: new Date(row.recorded_at).getTime(),
    visibility: row.visibility === 'public' ? 'public' : 'private',
  };
}

export async function fetchVisitTranscripts(): Promise<
  { ok: true; visits: VisitTranscript[] } | { ok: false; error: string }
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('visit_transcripts')
    .select(
      'id, household_id, user_id, title, transcript, duration_ms, recorded_at, visibility, created_at, updated_at'
    )
    .order('recorded_at', { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, visits: (data as TranscriptRow[]).map(mapTranscript) };
}

export async function createVisitTranscript(input: {
  title: string;
  transcript: string;
  durationMs: number;
  recordedAt?: number;
  visibility?: ContentVisibility;
}): Promise<VisitTranscript | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const household = await fetchMyHousehold();
  const householdId =
    household.ok && !('empty' in household && household.empty) ? household.id : null;

  const { data, error } = await supabase
    .from('visit_transcripts')
    .insert({
      user_id: user.id,
      household_id: householdId,
      title: input.title.trim(),
      transcript: input.transcript.trim(),
      duration_ms: input.durationMs,
      recorded_at: new Date(input.recordedAt ?? Date.now()).toISOString(),
      visibility: input.visibility ?? 'private',
    })
    .select(
      'id, household_id, user_id, title, transcript, duration_ms, recorded_at, visibility, created_at, updated_at'
    )
    .single();

  if (error || !data) return null;
  return mapTranscript(data as TranscriptRow);
}

export async function updateVisitTranscript(
  id: string,
  input: { title?: string; transcript?: string; visibility?: ContentVisibility }
): Promise<boolean> {
  const supabase = createClient();

  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.transcript !== undefined) patch.transcript = input.transcript.trim();
  if (input.visibility !== undefined) patch.visibility = input.visibility;

  const { error } = await supabase.from('visit_transcripts').update(patch).eq('id', id);
  return !error;
}

export async function deleteVisitTranscript(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('visit_transcripts').delete().eq('id', id);
  return !error;
}
