'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createNote,
  deleteNote,
  fetchNotes,
  updateNote,
} from '@/lib/noteSync';
import type { ContentVisibility } from '@/types/contentVisibility';
import type { Note } from '@/types/note';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    setError(undefined);
    const result = await fetchNotes();
    if (!result.ok) {
      setError(result.error);
      setReady(true);
      return;
    }
    setNotes(result.notes);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveNote = useCallback(
    async (input: { title: string; body: string; visibility?: ContentVisibility }) => {
      const created = await createNote(input);
      if (!created) return null;
      setNotes((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  const editNote = useCallback(
    async (
      noteId: string,
      input: { title?: string; body?: string; visibility?: ContentVisibility }
    ) => {
      const ok = await updateNote(noteId, input);
      if (!ok) return false;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? {
                ...n,
                title: input.title ?? n.title,
                body: input.body ?? n.body,
                visibility: input.visibility ?? n.visibility,
                updatedAt: Date.now(),
              }
            : n
        )
      );
      return true;
    },
    []
  );

  const removeNote = useCallback(async (noteId: string) => {
    const ok = await deleteNote(noteId);
    if (!ok) return false;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    return true;
  }, []);

  return { notes, ready, error, refresh, saveNote, editNote, removeNote };
}
