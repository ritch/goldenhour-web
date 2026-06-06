'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useHouseholdRole } from '@/hooks/useHouseholdRole';
import { useNotes } from '@/hooks/useNotes';
import { useSession } from '@/hooks/useSession';
import { ensureAccountProfile } from '@/lib/profile';
import { displayName } from '@/lib/pronouns';
import type { ContentVisibility } from '@/types/contentVisibility';
import { VISIBILITY_LABELS } from '@/types/contentVisibility';

type ActionLink = {
  href: string;
  label: string;
  desc: string;
  show: boolean;
};

export default function WritePage() {
  const { user, loading } = useSession();
  const household = useHouseholdRole();
  const notes = useNotes();
  const [text, setText] = useState('');
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<ContentVisibility>('private');
  const [noteStatus, setNoteStatus] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    void ensureAccountProfile(user.id).then((r) => {
      if (r.ok) {
        setName(displayName(r.profile));
        setReady(true);
      }
    });
  }, [user]);

  const handleSaveNote = async () => {
    const body = text.trim();
    if (!body) return;
    setNoteStatus(undefined);
    const title = body.split(/\r?\n/)[0]?.slice(0, 80) || 'Note';
    const created = await notes.saveNote({ title, body, visibility: noteVisibility });
    if (!created) {
      setNoteStatus('Could not save note.');
      return;
    }
    setNoteStatus(noteVisibility === 'public' ? 'Saved (family can see)' : 'Saved (private)');
    setText('');
  };

  if (loading || !user || !ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  const permissions = household.ready ? household.permissions : null;
  const chatHref = text.trim() ? `/chat?seed=${encodeURIComponent(text.trim())}` : '/chat';
  const showFamily = Boolean(
    permissions?.canSeeFamilyChat || permissions?.canSeeCaregiverChat
  );

  const actions: ActionLink[] = [
    {
      href: chatHref,
      label: 'AI Chat',
      desc: 'Talk with your assistant',
      show: permissions?.canUseAi ?? true,
    },
    {
      href: '/family',
      label: permissions?.canSeeFamilyChat ? 'Family' : 'Caregivers',
      desc: 'Household channels',
      show: showFamily,
    },
    {
      href: '/health',
      label: 'Health',
      desc: 'Meds & doctor visits',
      show: Boolean(permissions?.canViewMeds || permissions?.canViewDoctorNotes),
    },
    {
      href: '/todo',
      label: 'Tasks',
      desc: 'Shared household todos',
      show: true,
    },
  ];

  return (
    <AppShell title="Write" subtitle={name ? `Hello, ${name}` : 'Compose a message'}>
      {notes.notes.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto mb-3 pb-1">
          {notes.notes.slice(0, 8).map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => setText(note.body)}
              className="shrink-0 rounded-xl border-2 border-border bg-surface px-3 py-2 text-left max-w-[10rem]"
            >
              <span className="text-xs font-bold truncate block">
                {note.visibility === 'public' ? '👥 ' : ''}
                {note.title || 'Note'}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="What do you want to say?"
        className="input w-full text-lg leading-relaxed"
      />

      <p className="text-muted text-xs font-bold mt-3 mb-1">Note visibility</p>
      <div className="flex gap-2 mb-2">
        {(['private', 'public'] as ContentVisibility[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setNoteVisibility(v)}
            className={
              noteVisibility === v
                ? 'rounded-xl border-2 border-accent bg-accent-muted px-3 py-1 text-xs font-bold'
                : 'rounded-xl border-2 border-border px-3 py-1 text-xs font-bold text-muted'
            }
          >
            {VISIBILITY_LABELS[v]}
          </button>
        ))}
      </div>
      <p className="text-muted text-[10px] font-semibold mb-3">
        {noteVisibility === 'public'
          ? 'Family members can read saved notes (not caregivers).'
          : 'Only you can read saved notes.'}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => setText('')}>
          Clear
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void navigator.clipboard.writeText(text)}
        >
          Copy
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={!text.trim()}
          onClick={() => void handleSaveNote()}
        >
          Save note
        </button>
        {(permissions?.canUseAi ?? true) ? (
          <Link href={chatHref} className="btn-primary inline-block text-center">
            Send to AI
          </Link>
        ) : null}
      </div>
      {noteStatus ? <p className="text-accent text-sm font-bold mt-2">{noteStatus}</p> : null}

      <p className="text-muted text-xs font-bold mt-6 mb-2">Quick actions</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions
          .filter((action) => action.show)
          .map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-2xl border-2 border-border bg-surface p-4 flex flex-col justify-center items-center text-center hover:border-accent transition-colors min-h-[5.5rem]"
            >
              <span className="text-sm font-extrabold leading-tight">{action.label}</span>
              <span className="text-muted text-[10px] mt-1 font-semibold leading-tight">
                {action.desc}
              </span>
            </Link>
          ))}
      </div>
    </AppShell>
  );
}
