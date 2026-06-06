import { createClient } from '@/lib/supabase/client';
import { notifyTodoAssigned } from '@/lib/notificationSync';
import { fetchMyHousehold, type HouseholdMemberRow } from '@/lib/household';
import type { ContentVisibility } from '@/types/contentVisibility';
import type { TodoAssigneeOption, TodoItem, TodoList, TodoStatus } from '@/types/todo';
import { HOUSEHOLD_ROLE_LABELS, isHouseholdRole, type HouseholdRole } from '@/types/householdRoles';

const TODOS_MIGRATION_HINT =
  'Tasks need the Supabase todos migration — run speak-easy/supabase/migrations/20250606140000_todos.sql in the SQL Editor.';

function todoApiErrorMessage(error: { message?: string; code?: string; status?: number } | null): string {
  const msg = error?.message ?? '';
  const code = error?.code ?? '';
  if (
    error?.status === 404 ||
    /404|not found|schema cache|PGRST202|PGRST205/i.test(`${code} ${msg}`)
  ) {
    return TODOS_MIGRATION_HINT;
  }
  return msg || 'Could not reach tasks API';
}

type ListRow = {
  id: string;
  household_id: string;
  name: string;
  is_default: boolean;
};

type TodoRow = {
  id: string;
  list_id: string;
  household_id: string;
  title: string;
  summary: string;
  status: TodoStatus;
  assignee_user_id: string | null;
  assignee_label: string;
  visibility: ContentVisibility;
  due_at: string | null;
  remind_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapList(row: ListRow): TodoList {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    isDefault: row.is_default,
  };
}

function mapTodo(row: TodoRow, listName: string): TodoItem {
  return {
    id: row.id,
    listId: row.list_id,
    listName,
    householdId: row.household_id,
    title: row.title,
    summary: row.summary ?? '',
    status: row.status === 'done' ? 'done' : 'open',
    assigneeUserId: row.assignee_user_id,
    assigneeLabel: row.assignee_label ?? '',
    visibility: row.visibility === 'public' ? 'public' : 'private',
    dueAt: row.due_at ? new Date(row.due_at).getTime() : null,
    remindAt: row.remind_at ? new Date(row.remind_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export function assigneeDisplay(todo: TodoItem, members: HouseholdMemberRow[]): string {
  if (todo.assigneeLabel.trim()) return todo.assigneeLabel.trim();
  if (!todo.assigneeUserId) return 'Anyone';
  const member = members.find((m) => m.userId === todo.assigneeUserId);
  return member?.displayName ?? 'Household member';
}

export function buildAssigneeOptions(members: HouseholdMemberRow[]): TodoAssigneeOption[] {
  const options: TodoAssigneeOption[] = [{ userId: null, label: 'Anyone' }];
  for (const m of members) {
    const roleLabel = HOUSEHOLD_ROLE_LABELS[m.role as HouseholdRole] ?? m.role;
    options.push({ userId: m.userId, label: m.displayName || roleLabel });
  }
  options.push({ userId: null, label: 'Caregiver' });
  return options;
}

export async function fetchHouseholdTodos() {
  const supabase = createClient();
  const household = await fetchMyHousehold();
  if (!household.ok) return { ok: false as const, error: household.error };
  if ('empty' in household && household.empty) return { ok: true as const, empty: true as const };

  const householdId = household.id;
  const { error: ensureErr } = await supabase.rpc('ensure_default_todo_list', {
    h_id: householdId,
  });
  if (ensureErr) {
    return { ok: false as const, error: todoApiErrorMessage(ensureErr) };
  }

  const [listsRes, todosRes, membersRes] = await Promise.all([
    supabase
      .from('todo_lists')
      .select('id, household_id, name, is_default')
      .eq('household_id', householdId)
      .order('is_default', { ascending: false }),
    supabase
      .from('todos')
      .select(
        'id, list_id, household_id, title, summary, status, assignee_user_id, assignee_label, visibility, due_at, remind_at, created_at, updated_at'
      )
      .eq('household_id', householdId)
      .order('status', { ascending: true })
      .order('updated_at', { ascending: false }),
    supabase
      .from('household_members')
      .select('user_id, role, display_name, created_at')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true }),
  ]);

  if (listsRes.error) return { ok: false as const, error: todoApiErrorMessage(listsRes.error) };
  if (todosRes.error) return { ok: false as const, error: todoApiErrorMessage(todosRes.error) };

  const lists = (listsRes.data as ListRow[]).map(mapList);
  const listNameById = new Map(lists.map((l) => [l.id, l.name]));
  const todos = (todosRes.data as TodoRow[]).map((row) =>
    mapTodo(row, listNameById.get(row.list_id) ?? 'Tasks')
  );

  const members: HouseholdMemberRow[] = (membersRes.data ?? []).map((row) => ({
    userId: row.user_id,
    role: isHouseholdRole(row.role) ? row.role : 'member',
    displayName: row.display_name,
    createdAt: row.created_at,
  }));

  return { ok: true as const, householdId, lists, todos, members };
}

export async function createTodo(input: {
  householdId: string;
  listId: string;
  title: string;
  summary?: string;
  assigneeUserId?: string | null;
  assigneeLabel?: string;
  visibility?: ContentVisibility;
  dueAt?: number | null;
  remindAt?: number | null;
}): Promise<{ ok: true; todo: TodoItem } | { ok: false; error: string }> {
  const supabase = createClient();
  const trimmed = input.title.trim();
  if (!trimmed) return { ok: false, error: 'Add a title.' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in required' };

  const { data, error } = await supabase
    .from('todos')
    .insert({
      list_id: input.listId,
      household_id: input.householdId,
      title: trimmed,
      summary: (input.summary ?? '').trim(),
      status: 'open',
      assignee_user_id: input.assigneeUserId ?? null,
      assignee_label: (input.assigneeLabel ?? '').trim(),
      visibility: input.visibility ?? 'private',
      due_at: input.dueAt ? new Date(input.dueAt).toISOString() : null,
      remind_at: input.remindAt ? new Date(input.remindAt).toISOString() : null,
      created_by: user.id,
    })
    .select(
      'id, list_id, household_id, title, summary, status, assignee_user_id, assignee_label, visibility, due_at, remind_at, created_at, updated_at'
    )
    .single();

  if (error || !data) {
    return { ok: false, error: todoApiErrorMessage(error) };
  }

  const { data: listRow } = await supabase
    .from('todo_lists')
    .select('name')
    .eq('id', input.listId)
    .maybeSingle();

  const todo = mapTodo(data as TodoRow, listRow?.name ?? 'Tasks');

  if (input.assigneeUserId && input.assigneeUserId !== user.id) {
    const { data: authorMember } = await supabase
      .from('household_members')
      .select('display_name')
      .eq('household_id', input.householdId)
      .eq('user_id', user.id)
      .maybeSingle();

    void notifyTodoAssigned({
      householdId: input.householdId,
      assigneeUserId: input.assigneeUserId,
      assignerLabel: authorMember?.display_name?.trim() || 'Someone',
      todoTitle: trimmed,
      currentUserId: user.id,
    });
  }

  return { ok: true, todo };
}

export async function setTodoStatus(todoId: string, status: TodoStatus) {
  const supabase = createClient();
  const { error } = await supabase
    .from('todos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', todoId);
  return !error;
}

export async function updateTodo(
  todoId: string,
  input: {
    title?: string;
    summary?: string;
    visibility?: ContentVisibility;
    dueAt?: number | null;
    remindAt?: number | null;
  }
): Promise<boolean> {
  const supabase = createClient();

  const patch: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.summary !== undefined) patch.summary = input.summary.trim();
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.dueAt !== undefined) {
    patch.due_at = input.dueAt ? new Date(input.dueAt).toISOString() : null;
  }
  if (input.remindAt !== undefined) {
    patch.remind_at = input.remindAt ? new Date(input.remindAt).toISOString() : null;
  }

  const { error } = await supabase.from('todos').update(patch).eq('id', todoId);
  return !error;
}

export async function deleteTodo(todoId: string) {
  const supabase = createClient();
  const { error } = await supabase.from('todos').delete().eq('id', todoId);
  return !error;
}
