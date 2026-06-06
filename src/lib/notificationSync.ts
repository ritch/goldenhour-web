import { createClient } from '@/lib/supabase/client';
import { getHarnessUrl } from '@/lib/config';
import { harnessAuthHeaders } from '@/lib/harness';
import type { AppNotification, NotificationType } from '@/types/notification';

type MemberLike = { userId: string; displayName: string };

type NotificationRow = {
  id: string;
  user_id: string;
  household_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  link_path: string;
  read_at: string | null;
  created_at: string;
};

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    readAt: row.read_at ? new Date(row.read_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
    householdId: row.household_id,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findMentionedUserIds(
  text: string,
  members: MemberLike[],
  excludeUserId?: string
): string[] {
  const found = new Set<string>();
  for (const member of members) {
    const name = member.displayName.trim();
    if (!name || member.userId === excludeUserId) continue;
    const pattern = new RegExp(`@${escapeRegex(name)}(?![\\w-])`, 'i');
    if (pattern.test(text)) found.add(member.userId);
  }
  return [...found];
}

export async function fetchNotifications(limit = 80): Promise<AppNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, user_id, household_id, type, title, body, link_path, read_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as NotificationRow[]).map(mapRow);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  await supabase.rpc('mark_notification_read', { n_id: notificationId });
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  await supabase.rpc('mark_all_notifications_read');
}

async function sendPushToUsers(input: {
  recipientIds: string[];
  title: string;
  body: string;
  linkPath: string;
}): Promise<void> {
  const serverUrl = getHarnessUrl();
  if (!serverUrl) return;

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return;

  try {
    await fetch(`${serverUrl}/v1/push/send`, {
      method: 'POST',
      headers: harnessAuthHeaders(token),
      body: JSON.stringify({
        user_ids: input.recipientIds,
        title: input.title,
        body: input.body,
        data: { link_path: input.linkPath },
      }),
    });
  } catch {
    /* best-effort */
  }
}

export async function dispatchNotification(input: {
  recipientIds: string[];
  type: NotificationType;
  title: string;
  body?: string;
  linkPath?: string;
  householdId?: string | null;
  sendPush?: boolean;
}): Promise<void> {
  const supabase = createClient();
  const recipients = [...new Set(input.recipientIds.filter(Boolean))];
  if (!recipients.length) return;

  const title = input.title.trim();
  if (!title) return;

  const body = (input.body ?? '').trim();
  const linkPath = (input.linkPath ?? '').trim();

  const { error } = await supabase.rpc('notify_users', {
    recipient_ids: recipients,
    n_type: input.type,
    n_title: title,
    n_body: body,
    n_link_path: linkPath,
    h_id: input.householdId ?? null,
  });

  if (error || input.sendPush === false) return;
  await sendPushToUsers({ recipientIds: recipients, title, body, linkPath });
}

export async function notifyChatMentions(input: {
  householdId: string;
  channelSlug: string;
  channelName: string;
  authorLabel: string;
  authorUserId: string;
  text: string;
  members: MemberLike[];
}): Promise<void> {
  const mentioned = findMentionedUserIds(input.text, input.members, input.authorUserId);
  if (!mentioned.length) return;

  const preview =
    input.text.length > 120 ? `${input.text.slice(0, 117)}…` : input.text;

  await dispatchNotification({
    recipientIds: mentioned,
    type: 'chat_mention',
    title: `${input.authorLabel} mentioned you in #${input.channelName}`,
    body: preview,
    linkPath: `family/${input.channelSlug}`,
    householdId: input.householdId,
  });
}

export async function notifyTodoAssigned(input: {
  householdId: string;
  assigneeUserId: string;
  assignerLabel: string;
  todoTitle: string;
  currentUserId: string;
}): Promise<void> {
  if (input.assigneeUserId === input.currentUserId) return;

  await dispatchNotification({
    recipientIds: [input.assigneeUserId],
    type: 'todo_assigned',
    title: 'New task assigned to you',
    body: `${input.assignerLabel} assigned "${input.todoTitle}"`,
    linkPath: 'todos',
    householdId: input.householdId,
  });
}

type NotificationListener = () => void;

let notificationChannel: ReturnType<ReturnType<typeof createClient>['channel']> | null =
  null;
const notificationListeners = new Set<NotificationListener>();

function notifyNotificationListeners(): void {
  for (const listener of notificationListeners) listener();
}

export function subscribeNotifications(onChange: () => void): () => void {
  const supabase = createClient();
  notificationListeners.add(onChange);

  if (!notificationChannel) {
    notificationChannel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => notifyNotificationListeners()
      )
      .subscribe();
  }

  return () => {
    notificationListeners.delete(onChange);
    if (notificationListeners.size === 0 && notificationChannel) {
      void supabase.removeChannel(notificationChannel);
      notificationChannel = null;
    }
  };
}

export type NotificationNavTarget =
  | { kind: 'family'; channelId: string }
  | { kind: 'todos' }
  | { kind: 'reminders' }
  | { kind: 'none' };

export function parseNotificationLink(linkPath: string): NotificationNavTarget {
  const path = linkPath.replace(/^\//, '').trim();
  if (!path) return { kind: 'none' };
  if (path === 'todos' || path === 'todos/') return { kind: 'todos' };
  if (path === 'reminders' || path === 'reminders/') return { kind: 'reminders' };
  const familyPrefix = 'family/';
  if (path.startsWith(familyPrefix)) {
    const slug = path.slice(familyPrefix.length).replace(/\/$/, '');
    if (slug) return { kind: 'family', channelId: slug };
  }
  return { kind: 'none' };
}

export function notificationHref(linkPath: string): string | null {
  const target = parseNotificationLink(linkPath);
  if (target.kind === 'family') return `/family/${target.channelId}`;
  if (target.kind === 'todos') return '/todos';
  if (target.kind === 'reminders') return '/reminders';
  return null;
}
