'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/hooks/useSession';
import { useTodos } from '@/hooks/useTodos';
import { assigneeDisplay } from '@/lib/todoSync';
import type { ContentVisibility } from '@/types/contentVisibility';
import { VISIBILITY_LABELS } from '@/types/contentVisibility';
import type { TodoAssigneeOption } from '@/types/todo';

function parseLocalInput(value: string): number | null {
  if (!value.trim()) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function formatWhen(ms: number | null): string | null {
  if (ms == null) return null;
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TodoPage() {
  const { user, loading } = useSession();
  const {
    ready,
    noHousehold,
    error,
    lists,
    todos,
    members,
    activeList,
    activeListId,
    setActiveListId,
    assigneeOptions,
    addTodo,
    toggleTodo,
    removeTodo,
    refresh,
    migratedCount,
  } = useTodos();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [assignee, setAssignee] = useState<TodoAssigneeOption>({ userId: null, label: 'Anyone' });
  const [visibility, setVisibility] = useState<ContentVisibility>('private');
  const [dueAt, setDueAt] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [localError, setLocalError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setLocalError('Add a title.');
      return;
    }
    setBusy(true);
    setLocalError(undefined);
    const result = await addTodo({
      title: trimmed,
      summary,
      assignee,
      visibility,
      dueAt: parseLocalInput(dueAt),
      remindAt: parseLocalInput(remindAt),
    });
    setBusy(false);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setTitle('');
    setSummary('');
    setDueAt('');
    setRemindAt('');
    setVisibility('private');
  };

  if (loading || !user || !ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  if (noHousehold) {
    return (
      <AppShell title="Todo" subtitle="Tasks & reminders">
        <p className="text-muted">
          Join a household to share tasks with your family and caregivers.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Todo" subtitle={activeList?.name ?? 'Household tasks'}>
      {migratedCount > 0 ? (
        <p className="text-accent text-sm font-bold mb-3">
          Imported {migratedCount} reminder{migratedCount === 1 ? '' : 's'} from the old Remind page.
        </p>
      ) : null}
      {lists.length > 1 ? (
        <div className="flex gap-2 flex-wrap mb-4">
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              className={
                activeListId === list.id
                  ? 'rounded-xl border-2 border-accent bg-accent-muted px-3 py-1 font-bold text-sm'
                  : 'rounded-xl border-2 border-border px-3 py-1 font-bold text-sm text-muted'
              }
              onClick={() => setActiveListId(list.id)}
            >
              {list.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="card space-y-2 mb-4">
        <p className="font-extrabold text-sm">New task</p>
        <input
          className="input"
          placeholder="Title — e.g. Schedule follow-up MRI"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input resize-none"
          rows={2}
          placeholder="Summary (optional)"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <p className="text-muted text-xs font-bold">Assign to</p>
        <div className="flex flex-wrap gap-2">
          {assigneeOptions.map((opt) => (
            <button
              key={`${opt.userId ?? 'x'}-${opt.label}`}
              type="button"
              className={
                assignee.label === opt.label && assignee.userId === opt.userId
                  ? 'rounded-full border-2 border-accent bg-accent-muted px-3 py-1 text-xs font-bold'
                  : 'rounded-full border-2 border-border px-3 py-1 text-xs font-bold text-muted'
              }
              onClick={() => setAssignee(opt)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-muted text-xs font-bold">Visibility</p>
        <div className="flex flex-wrap gap-2">
          {(['private', 'public'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={
                visibility === v
                  ? 'rounded-full border-2 border-accent bg-accent-muted px-3 py-1 text-xs font-bold'
                  : 'rounded-full border-2 border-border px-3 py-1 text-xs font-bold text-muted'
              }
              onClick={() => setVisibility(v)}
            >
              {VISIBILITY_LABELS[v]}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-muted text-xs font-bold">Due (optional)</span>
          <input
            className="input mt-1"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-muted text-xs font-bold">Remind (optional)</span>
          <input
            className="input mt-1"
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
          />
        </label>
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleAdd()}>
          {busy ? 'Saving…' : 'Add task'}
        </button>
      </div>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-muted text-sm">No tasks yet. Ask AI or add one above.</p>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className="card space-y-2">
              <div className="flex gap-3 items-start">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                  checked={todo.status === 'done'}
                  onChange={(e) => void toggleTodo(todo.id, e.target.checked)}
                />
                <div className="flex-1">
                  <p
                    className={
                      todo.status === 'done'
                        ? 'font-extrabold line-through text-muted'
                        : 'font-extrabold'
                    }
                  >
                    {todo.title}
                  </p>
                  <p className="text-accent text-xs font-bold">{assigneeDisplay(todo, members)}</p>
                  <p className="text-muted text-xs font-semibold mt-0.5">
                    {VISIBILITY_LABELS[todo.visibility]}
                    {formatWhen(todo.dueAt) ? ` · Due ${formatWhen(todo.dueAt)}` : ''}
                    {formatWhen(todo.remindAt) ? ` · Remind ${formatWhen(todo.remindAt)}` : ''}
                  </p>
                  {todo.summary ? (
                    <p className="text-muted text-sm mt-1 whitespace-pre-wrap">{todo.summary}</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="text-warning text-xs font-bold"
                onClick={() => void removeTodo(todo.id)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <button type="button" className="text-muted text-sm font-bold mt-4" onClick={() => void refresh()}>
        Refresh
      </button>

      {localError || error ? (
        <p className="text-warning text-sm mt-2">{localError ?? error}</p>
      ) : null}
    </AppShell>
  );
}
