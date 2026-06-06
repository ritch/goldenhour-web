'use client';

import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';

export function AlertsButton() {
  const { unreadCount } = useNotifications();

  return (
    <Link
      href="/notifications"
      className="relative shrink-0 rounded-xl border-2 border-border p-2 text-muted hover:border-accent hover:text-accent transition-colors"
      aria-label={unreadCount > 0 ? `${unreadCount} unread alerts` : 'Alerts'}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center px-0.5">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
