import { createTodo, fetchHouseholdTodos } from '@/lib/todoSync';
import { loadReminders, saveReminders } from '@/lib/webStorage';

const MIGRATED_KEY = 'gh-web/reminders-migrated-v1';

export async function migrateLocalRemindersToTodos(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (localStorage.getItem(MIGRATED_KEY) === 'done') return 0;

  const reminders = loadReminders();
  if (reminders.length === 0) {
    localStorage.setItem(MIGRATED_KEY, 'done');
    return 0;
  }

  const household = await fetchHouseholdTodos();
  if (!household.ok || ('empty' in household && household.empty)) return 0;

  const defaultList = household.lists.find((l) => l.isDefault) ?? household.lists[0];
  if (!defaultList) {
    localStorage.setItem(MIGRATED_KEY, 'done');
    saveReminders([]);
    return 0;
  }

  let migrated = 0;
  for (const reminder of reminders) {
    if (!reminder.enabled || reminder.fireAt <= Date.now()) continue;
    const result = await createTodo({
      householdId: household.householdId,
      listId: defaultList.id,
      title: reminder.title,
      summary: reminder.body,
      visibility: 'private',
      remindAt: reminder.fireAt,
    });
    if (result.ok) migrated += 1;
  }

  saveReminders([]);
  localStorage.setItem(MIGRATED_KEY, 'done');
  return migrated;
}
