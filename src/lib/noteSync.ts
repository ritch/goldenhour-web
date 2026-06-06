import { createClient } from '@/lib/supabase/client';
import { fetchMyHousehold } from '@/lib/household';
import type { ContentVisibility } from '@/types/contentVisibility';
import type { Note } from '@/types/note';

type NoteRow = {
  id: string;
  household_id: string | null;
  author_id: string;
  title: string;
  body: string;
  visibility: ContentVisibility;
  created_at: string;
  updated_at: string;
};

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    householdId: row.household_id,
    authorId: row.author_id,
    title: row.title ?? '',
    body: row.body ?? '',
    visibility: row.visibility === 'public' ? 'public' : 'private',
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function fetchNotes(): Promise<
  { ok: true; notes: Note[] } | { ok: false; error: string }
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notes')
    .select('id, household_id, author_id, title, body, visibility, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, notes: (data as NoteRow[]).map(mapNote) };
}

export async function createNote(input: {
  title: string;
  body: string;
  visibility?: ContentVisibility;
}): Promise<Note | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const household = await fetchMyHousehold();
  const householdId =
    household.ok && !('empty' in household && household.empty) ? household.id : null;

  const { data, error } = await supabase
    .from('notes')
    .insert({
      author_id: user.id,
      household_id: householdId,
      title: input.title.trim(),
      body: input.body.trim(),
      visibility: input.visibility ?? 'private',
    })
    .select('id, household_id, author_id, title, body, visibility, created_at, updated_at')
    .single();

  if (error || !data) return null;
  return mapNote(data as NoteRow);
}

export async function updateNote(
  noteId: string,
  input: { title?: string; body?: string; visibility?: ContentVisibility }
): Promise<boolean> {
  const supabase = createClient();

  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.body !== undefined) patch.body = input.body.trim();
  if (input.visibility !== undefined) patch.visibility = input.visibility;

  const { error } = await supabase.from('notes').update(patch).eq('id', noteId);
  return !error;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('notes').delete().eq('id', noteId);
  return !error;
}

export function subscribeNotes(onChange: () => void): (() => void) | undefined {
  const supabase = createClient();

  const channel = supabase
    .channel('notes:all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => onChange())
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
