'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useNotifications } from '@/hooks/useNotifications';
import { notificationHref } from '@/lib/notificationSync';
import type { AppNotification } from '@/types/notification';

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function NotificationItem({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: () => void;
}) {
  const href = notificationHref(item.linkPath);
  const unread = item.readAt == null;

  const content = (
    <div
      className={`rounded-xl border-2 p-4 ${
        unread ? 'border-accent bg-surface' : 'border-border bg-surface'
      }`}
    >
      <div className="flex items-start gap-2">
        <p className="font-bold flex-1">{item.title}</p>
        {unread ? <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1.5" /> : null}
      </div>
      {item.body ? <p className="text-muted text-sm mt-1">{item.body}</p> : null}
      <div className="flex justify-between items-center mt-2 text-xs text-muted font-semibold">
        <span>{formatWhen(item.createdAt)}</span>
        {href ? <span className="text-accent">View →</span> : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onOpen} className="block hover:opacity-90">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onOpen} className="block w-full text-left">
      {content}
    </button>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { items, ready, unreadCount, markRead, markAllRead } = useNotifications();

  const handleOpen = async (item: AppNotification) => {
    if (item.readAt == null) await markRead(item.id);
    const href = notificationHref(item.linkPath);
    if (href) router.push(href);
  };

  return (
    <AppShell
      title="Notifications"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      backHref="/write"
    >
      {unreadCount > 0 ? (
        <button
          type="button"
          onClick={() => void markAllRead()}
          className="text-sm font-bold text-accent mb-4"
        >
          Mark all read
        </button>
      ) : null}
      {!ready ? (
        <p className="text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-muted">No notifications yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              onOpen={() => void handleOpen(item)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
