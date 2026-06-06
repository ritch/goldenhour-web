'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/hooks/useSession';
import { loadMemory, saveMemory } from '@/lib/webStorage';
import type { PersonMemory } from '@/types/memory';

export default function MenuDataPage() {
  const { user, loading } = useSession();
  const [memory, setMemory] = useState<PersonMemory | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    setMemory(loadMemory(user.id));
  }, [user]);

  const resetMemory = () => {
    if (!user) return;
    const empty = { summary: '', entries: [] };
    saveMemory(user.id, empty);
    setMemory(empty);
    setMsg('Memory cleared');
  };

  if (loading || !user || !memory) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <AppShell title="Data" subtitle="Memory & import" backHref="/menu">
      <div className="space-y-4">
        <div className="card">
          <p className="font-extrabold">Memory</p>
          <p className="text-muted text-sm mt-1">{memory.entries.length} entries</p>
          {memory.summary ? (
            <p className="text-sm mt-2 whitespace-pre-wrap">{memory.summary}</p>
          ) : null}
          <button type="button" className="btn-secondary mt-3" onClick={resetMemory}>
            Clear memory
          </button>
        </div>

        <div className="card" id="import">
          <p className="font-extrabold">Import & Export</p>
          <p className="text-muted text-sm mt-2">
            Import and export tools are available on the mobile app. Web support coming soon.
          </p>
        </div>

        {msg ? <p className="text-sm text-accent">{msg}</p> : null}
      </div>
    </AppShell>
  );
}
