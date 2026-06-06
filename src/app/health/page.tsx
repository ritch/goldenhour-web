'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useHouseholdRole } from '@/hooks/useHouseholdRole';
import { useSession } from '@/hooks/useSession';

type HealthSection = {
  href?: string;
  label: string;
  desc: string;
  show: boolean;
  stub?: boolean;
};

export default function HealthPage() {
  const { user, loading } = useSession();
  const household = useHouseholdRole();

  if (loading || !user || !household.ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  const { permissions } = household;

  const sections: HealthSection[] = [
    {
      href: '/meds',
      label: 'Medications',
      desc: permissions.canEditMeds ? 'Medication list' : 'View medications',
      show: permissions.canViewMeds,
    },
    {
      href: '/health/visits',
      label: 'Doctor visits',
      desc: 'Visit transcripts & notes',
      show: permissions.canViewDoctorNotes,
    },
    {
      label: 'My doctors',
      desc: 'Coming soon',
      show: permissions.canViewDoctorNotes,
      stub: true,
    },
    {
      label: 'Diagnosis',
      desc: 'Coming soon',
      show: permissions.canViewDoctorNotes,
      stub: true,
    },
    {
      label: 'Symptoms',
      desc: 'Coming soon',
      show: permissions.canViewDoctorNotes,
      stub: true,
    },
    {
      label: 'Questions for doctor',
      desc: 'Coming soon',
      show: permissions.canViewDoctorNotes,
      stub: true,
    },
  ];

  const visible = sections.filter((s) => s.show);

  return (
    <AppShell title="Health" subtitle="Meds, visits & care info">
      {visible.length === 0 ? (
        <p className="text-muted text-sm">Health information is not available for your household role.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((section) =>
            section.stub || !section.href ? (
              <div key={section.label} className="card opacity-70">
                <p className="font-extrabold">{section.label}</p>
                <p className="text-muted text-sm mt-1">{section.desc}</p>
              </div>
            ) : (
              <Link
                key={section.href}
                href={section.href}
                className="card flex items-center justify-between hover:border-accent"
              >
                <div>
                  <p className="font-extrabold">{section.label}</p>
                  <p className="text-muted text-sm mt-1">{section.desc}</p>
                </div>
                <span className="text-muted">→</span>
              </Link>
            )
          )}
        </div>
      )}
    </AppShell>
  );
}
