'use client';

import { AppShell } from '@/components/AppShell';
import { useHouseholdRole } from '@/hooks/useHouseholdRole';
import { useSession } from '@/hooks/useSession';

export default function HealthVisitsPage() {
  const { user, loading } = useSession();
  const household = useHouseholdRole();

  if (loading || !user || !household.ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  if (!household.permissions.canViewDoctorNotes) {
    return (
      <AppShell title="Doctor visits" backHref="/health">
        <p className="text-muted">Doctor visit notes are not available for your household role.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Doctor visits" subtitle="Visit transcripts" backHref="/health">
      <div className="card">
        <p className="font-extrabold">Coming soon</p>
        <p className="text-muted text-sm mt-2">
          Cloud-stored visit transcripts with private or family-visible sharing will appear here.
          Use the mobile app to record visits in the meantime.
        </p>
      </div>
    </AppShell>
  );
}
