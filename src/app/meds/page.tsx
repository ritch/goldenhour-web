'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/hooks/useSession';
import { loadMedications, saveMedications } from '@/lib/webStorage';
import { newMedicationId, type Medication } from '@/types/medication';

export default function MedsPage() {
  const { user, loading } = useSession();
  const [meds, setMeds] = useState<Medication[]>([]);
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [times, setTimes] = useState('08:00');

  useEffect(() => {
    if (user) setMeds(loadMedications(user.id));
  }, [user]);

  const add = () => {
    if (!user || !name.trim()) return;
    const med: Medication = {
      id: newMedicationId(),
      name: name.trim(),
      strength: strength.trim(),
      form: '',
      instructions: '',
      scheduleTimes: times.split(',').map((t) => t.trim()).filter(Boolean),
      enabled: true,
      createdAt: Date.now(),
    };
    const next = [...meds, med];
    saveMedications(user.id, next);
    setMeds(next);
    setName('');
    setStrength('');
  };

  const remove = (id: string) => {
    if (!user) return;
    const next = meds.filter((m) => m.id !== id);
    saveMedications(user.id, next);
    setMeds(next);
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <AppShell title="Medications" subtitle="No camera scan on web">
      <div className="card space-y-2 mb-4">
        <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Strength" value={strength} onChange={(e) => setStrength(e.target.value)} />
        <input className="input" placeholder="Times (comma-separated, e.g. 08:00, 20:00)" value={times} onChange={(e) => setTimes(e.target.value)} />
        <button type="button" className="btn-primary" onClick={add}>Add medication</button>
      </div>
      <div className="space-y-2">
        {meds.map((m) => (
          <div key={m.id} className="card flex justify-between gap-2">
            <div>
              <p className="font-extrabold">{m.name}</p>
              {m.strength ? <p className="text-muted text-sm">{m.strength}</p> : null}
              <p className="text-sm">{m.scheduleTimes.join(' · ')}</p>
            </div>
            <button type="button" className="text-warning text-sm font-bold" onClick={() => remove(m.id)}>Remove</button>
          </div>
        ))}
        {meds.length === 0 ? <p className="text-muted text-sm">No medications yet.</p> : null}
      </div>
    </AppShell>
  );
}
