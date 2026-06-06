'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isNavItemActive, visibleNavItems } from '@/config/nav';
import { useHouseholdRole } from '@/hooks/useHouseholdRole';
import { householdPermissions } from '@/types/householdRoles';
import { NavIcon } from './NavIcon';

export function SidebarNav() {
  const pathname = usePathname();
  const household = useHouseholdRole();
  const permissions = household.ready
    ? household.permissions
    : householdPermissions(null, false);
  const items = visibleNavItems(permissions);

  return (
    <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r-2 md:border-border md:bg-surface">
      <div className="px-4 py-5 border-b-2 border-border">
        <img src="/golden-hour-logo.svg" alt="Golden Hour" className="w-full aspect-[3/2]" />
      </div>
      <nav className="flex flex-col gap-1 p-3" aria-label="Main navigation">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 font-extrabold text-sm transition-colors ${
                active
                  ? 'border-accent bg-accent-muted text-foreground'
                  : 'border-transparent text-muted hover:border-border hover:text-foreground'
              }`}
            >
              <NavIcon id={item.id} className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
