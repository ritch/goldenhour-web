export type ReminderRepeat = 'none' | 'daily';

export type Reminder = {
  id: string;
  title: string;
  body: string;
  fireAt: number;
  repeat: ReminderRepeat;
  enabled: boolean;
  createdAt: number;
};

export function newReminderId(): string {
  return `rem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
