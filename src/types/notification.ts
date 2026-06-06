export type NotificationType = 'chat_mention' | 'todo_assigned' | 'reminder' | 'general';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  linkPath: string;
  readAt: number | null;
  createdAt: number;
  householdId: string | null;
};
