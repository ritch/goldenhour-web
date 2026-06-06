'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isNavItemActive, visibleNavItems } from '@/config/nav';
import { useHouseholdRole } from '@/hooks/useHouseholdRole';
import { householdPermissions } from '@/types/householdRoles';
import { NavIcon } from './NavIcon';

export function BottomNav() {
  const pathname = usePathname();
  const household = useHouseholdRole();
  const permissions = household.ready
    ? household.permissions
    : householdPermissions(null, false);
  const items = visibleNavItems(permissions);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t-2 border-border bg-background pb-safe"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around px-1 pt-1">
        {items.map((item) => {
          const active = isNavItemActive(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-2 min-w-0 ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              <NavIcon id={item.id} className="w-5 h-5" />
              <span className="text-[10px] font-extrabold truncate w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
