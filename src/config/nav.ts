import type { HouseholdPermissions } from '@/types/householdRoles';

export type NavItemId = 'write' | 'health' | 'todo' | 'family' | 'menu';

export type NavItem = {
  id: NavItemId;
  label: string;
  href: string;
  matchPrefixes?: string[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'write',
    label: 'Write',
    href: '/write',
    matchPrefixes: ['/write', '/chat'],
  },
  {
    id: 'health',
    label: 'Health',
    href: '/health',
    matchPrefixes: ['/health', '/meds'],
  },
  {
    id: 'todo',
    label: 'Todo',
    href: '/todo',
    matchPrefixes: ['/todo', '/reminders', '/todos'],
  },
  {
    id: 'family',
    label: 'Family',
    href: '/family',
    matchPrefixes: ['/family'],
  },
  {
    id: 'menu',
    label: 'Menu',
    href: '/menu',
    matchPrefixes: ['/menu', '/settings', '/household'],
  },
];

export const DEFAULT_NAV_HREF = '/write';

export function isNavItemVisible(id: NavItemId, permissions: HouseholdPermissions): boolean {
  switch (id) {
    case 'family':
      return permissions.canSeeFamilyChat || permissions.canSeeCaregiverChat;
    case 'health':
      return permissions.canViewMeds || permissions.canViewDoctorNotes;
    default:
      return true;
  }
}

export function visibleNavItems(permissions: HouseholdPermissions): NavItem[] {
  return NAV_ITEMS.filter((item) => isNavItemVisible(item.id, permissions));
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  const prefixes = item.matchPrefixes ?? [item.href];
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
