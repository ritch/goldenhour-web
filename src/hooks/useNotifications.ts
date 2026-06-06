'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from '@/lib/notificationSync';
import type { AppNotification } from '@/types/notification';

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await fetchNotifications();
    setItems(rows);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const unsub = subscribeNotifications(() => {
      void refresh();
    });
    return unsub;
  }, [refresh]);

  const unreadCount = useMemo(
    () => items.filter((n) => n.readAt == null).length,
    [items]
  );

  const markRead = useCallback(async (notificationId: string) => {
    await markNotificationRead(notificationId);
    setItems((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, readAt: Date.now() } : n
      )
    );
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setItems((prev) =>
      prev.map((n) => (n.readAt == null ? { ...n, readAt: Date.now() } : n))
    );
  }, []);

  return {
    items,
    ready,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
  };
}
