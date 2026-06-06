'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useHouseholdRole } from '@/hooks/useHouseholdRole';
import { useSession } from '@/hooks/useSession';
import { createClient } from '@/lib/supabase/client';

type MenuRow = {
  href: string;
  label: string;
  value?: string;
  show: boolean;
};

export default function MenuPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const household = useHouseholdRole();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading || !user || !household.ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  const accountRows: MenuRow[] = [
    { href: '/menu/account', label: 'You', show: true },
    {
      href: '/menu/account#ai',
      label: 'AI Instructions',
      show: household.permissions.canUseAi,
    },
    {
      href: '/menu/account#facts',
      label: 'Facts',
      show: household.permissions.canUseAi,
    },
  ];

  const dataRows: MenuRow[] = [
    { href: '/menu/data', label: 'Memory', show: household.permissions.canUseAi },
    { href: '/menu/data#import', label: 'Import & Export', show: household.permissions.canUseAi },
  ];

  const householdRows: MenuRow[] = [
    {
      href: '/menu/household',
      label: 'Household',
      value: household.noHousehold ? 'Not joined' : household.householdName ?? 'Joined',
      show: household.permissions.canInviteMembers || household.permissions.canManageRoles || household.noHousehold,
    },
  ];

  const renderSection = (title: string, rows: MenuRow[]) => {
    const visible = rows.filter((r) => r.show);
    if (visible.length === 0) return null;
    return (
      <section className="card p-0 overflow-hidden">
        <p className="px-4 pt-3 pb-1 text-muted text-xs font-extrabold uppercase tracking-wide">{title}</p>
        {visible.map((row, i) => (
          <Link
            key={row.href}
            href={row.href}
            className={`flex items-center justify-between px-4 py-3 hover:bg-background/40 ${
              i < visible.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <span className="font-extrabold">{row.label}</span>
            <span className="text-muted text-sm font-semibold">{row.value ?? '→'}</span>
          </Link>
        ))}
      </section>
    );
  };

  return (
    <AppShell title="Menu" subtitle="Account, data & household">
      <div className="space-y-4">
        {renderSection('Account', accountRows)}
        {renderSection('Data', dataRows)}
        {renderSection('Household', householdRows)}

        <section className="card p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full px-4 py-3 text-left font-extrabold text-warning hover:bg-background/40"
          >
            Sign out
          </button>
        </section>
      </div>
    </AppShell>
  );
}
