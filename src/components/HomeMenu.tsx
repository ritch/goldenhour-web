'use client';

import Link from 'next/link';
import type { HouseholdPermissions } from '@/types/householdRoles';

type Card = {
  href: string;
  label: string;
  desc: string;
  show: boolean;
  badge?: number;
};

export function HomeMenu({
  name,
  permissions,
  notificationUnread = 0,
}: {
  name: string;
  permissions: HouseholdPermissions;
  notificationUnread?: number;
}) {
  const showFamily = permissions.canSeeFamilyChat || permissions.canSeeCaregiverChat;

  const cards: Card[] = [
    { href: '/write', label: 'Write', desc: 'Compose a message', show: true },
    {
      href: '/chat',
      label: 'AI Chat',
      desc: 'Talk with your assistant',
      show: permissions.canUseAi,
    },
    {
      href: '/family',
      label: permissions.canSeeFamilyChat ? 'Family' : 'Caregivers',
      desc: 'Household channels',
      show: showFamily,
    },
    {
      href: '/notifications',
      label: 'Alerts',
      desc: 'Mentions, tasks & reminders',
      show: true,
      badge: notificationUnread,
    },
    {
      href: '/reminders',
      label: 'Remind',
      desc: 'Scheduled alerts',
      show: permissions.canUseAi,
    },
    { href: '/todos', label: 'Tasks', desc: 'Shared household todos', show: true },
    {
      href: '/meds',
      label: 'Meds',
      desc: permissions.canEditMeds ? 'Medication list' : 'View medications',
      show: permissions.canViewMeds,
    },
    {
      href: '/settings',
      label: 'Settings',
      desc: 'Profile & memory',
      show: permissions.canUseAi,
    },
    {
      href: '/household',
      label: 'Household',
      desc: 'Family group & roles',
      show: permissions.canInviteMembers || permissions.canManageRoles,
    },
  ];

  return (
    <div>
      <img
        src="/golden-hour-logo.svg"
        alt="Golden Hour"
        className="w-full aspect-[3/2] mb-4"
      />
      <p className="text-muted mb-4">
        Hello, <span className="text-foreground font-bold">{name}</span>
      </p>
      <div className="grid grid-cols-3 gap-3">
        {cards
          .filter((c) => c.show)
          .map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="relative aspect-square rounded-2xl border-2 border-border bg-surface p-4 flex flex-col justify-center items-center text-center hover:border-accent transition-colors"
            >
              {card.badge != null && card.badge > 0 ? (
                <span className="absolute top-2 right-2 min-w-[1.375rem] h-[1.375rem] rounded-full bg-red-500 text-white text-xs font-extrabold flex items-center justify-center px-1">
                  {card.badge > 9 ? '9+' : card.badge}
                </span>
              ) : null}
              <span className="text-sm sm:text-base font-extrabold leading-tight">{card.label}</span>
              <span className="text-muted text-[10px] sm:text-xs mt-1 font-semibold leading-tight">{card.desc}</span>
            </Link>
          ))}
      </div>
    </div>
  );
}
