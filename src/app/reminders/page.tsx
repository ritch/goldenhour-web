'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/hooks/useSession';
import { loadReminders, saveReminders } from '@/lib/webStorage';
import { newReminderId, type Reminder, type ReminderRepeat } from '@/types/reminder';

export default function RemindersPage() {
  const { user, loading } = useSession();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [when, setWhen] = useState('');
  const [repeat, setRepeat] = useState<ReminderRepeat>('none');

  useEffect(() => {
    setReminders(loadReminders().sort((a, b) => a.fireAt - b.fireAt));
  }, []);

  const add = () => {
    if (!title.trim() || !when) return;
    const fireAt = new Date(when).getTime();
    if (Number.isNaN(fireAt)) return;
    const next = [
      ...reminders,
      {
        id: newReminderId(),
        title: title.trim(),
        body: body.trim(),
        fireAt,
        repeat,
        enabled: true,
        createdAt: Date.now(),
      },
    ].sort((a, b) => a.fireAt - b.fireAt);
    saveReminders(next);
    setReminders(next);
    setTitle('');
    setBody('');
  };

  const remove = (id: string) => {
    const next = reminders.filter((r) => r.id !== id);
    saveReminders(next);
    setReminders(next);
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <AppShell title="Reminders" subtitle="Stored locally — no push on web">
      <div className="card space-y-2 mb-4">
        <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" placeholder="Details (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <select className="input" value={repeat} onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}>
          <option value="none">One time</option>
          <option value="daily">Daily</option>
        </select>
        <button type="button" className="btn-primary" onClick={add}>Add reminder</button>
      </div>
      <div className="space-y-2">
        {reminders.map((r) => (
          <div key={r.id} className="card flex justify-between gap-2">
            <div>
              <p className="font-extrabold">{r.title}</p>
              <p className="text-sm text-muted">
                {new Date(r.fireAt).toLocaleString()} {r.repeat === 'daily' ? '· daily' : ''}
              </p>
              {r.body ? <p className="text-sm">{r.body}</p> : null}
            </div>
            <button type="button" className="text-warning text-sm font-bold" onClick={() => remove(r.id)}>Remove</button>
          </div>
        ))}
        {reminders.length === 0 ? <p className="text-muted text-sm">No reminders yet.</p> : null}
      </div>
    </AppShell>
  );
}
