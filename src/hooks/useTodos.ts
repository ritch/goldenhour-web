'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HouseholdMemberRow } from '@/lib/household';
import { migrateLocalRemindersToTodos } from '@/lib/reminderMigration';
import {
  buildAssigneeOptions,
  createTodo,
  deleteTodo,
  fetchHouseholdTodos,
  setTodoStatus,
} from '@/lib/todoSync';
import { createClient } from '@/lib/supabase/client';
import type { ContentVisibility } from '@/types/contentVisibility';
import type { TodoAssigneeOption, TodoItem, TodoList } from '@/types/todo';

export function useTodos() {
  const [lists, setLists] = useState<TodoList[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [members, setMembers] = useState<HouseholdMemberRow[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [noHousehold, setNoHousehold] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [migratedCount, setMigratedCount] = useState(0);

  const refresh = useCallback(async () => {
    setError(undefined);
    const migrated = await migrateLocalRemindersToTodos();
    if (migrated > 0) setMigratedCount(migrated);
    const result = await fetchHouseholdTodos();
    if (!result.ok) {
      setError(result.error);
      setReady(true);
      return;
    }
    if ('empty' in result && result.empty) {
      setNoHousehold(true);
      setLists([]);
      setTodos([]);
      setMembers([]);
      setHouseholdId(null);
      setReady(true);
      return;
    }

    setNoHousehold(false);
    setHouseholdId(result.householdId);
    setLists(result.lists);
    setTodos(result.todos);
    setMembers(result.members);
    setActiveListId((prev) => {
      if (prev && result.lists.some((l) => l.id === prev)) return prev;
      return result.lists.find((l) => l.isDefault)?.id ?? result.lists[0]?.id ?? null;
    });
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!householdId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`todos:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
          filter: `household_id=eq.${householdId}`,
        },
        () => void refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, refresh]);

  const assigneeOptions = useMemo(() => buildAssigneeOptions(members), [members]);
  const activeList = useMemo(
    () => lists.find((l) => l.id === activeListId) ?? lists.find((l) => l.isDefault) ?? lists[0],
    [lists, activeListId]
  );
  const visibleTodos = useMemo(() => {
    if (!activeList) return todos;
    return todos.filter((t) => t.listId === activeList.id);
  }, [todos, activeList]);

  const addTodo = useCallback(
    async (input: {
      title: string;
      summary?: string;
      assignee?: TodoAssigneeOption;
      visibility?: ContentVisibility;
      dueAt?: number | null;
      remindAt?: number | null;
    }): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!householdId || !activeList) {
        return { ok: false, error: 'Join a household first.' };
      }
      const result = await createTodo({
        householdId,
        listId: activeList.id,
        title: input.title,
        summary: input.summary,
        assigneeUserId: input.assignee?.userId ?? null,
        assigneeLabel:
          input.assignee?.userId == null && input.assignee?.label ? input.assignee.label : '',
        visibility: input.visibility,
        dueAt: input.dueAt,
        remindAt: input.remindAt,
      });
      if (!result.ok) {
        setError(result.error);
        return result;
      }
      setTodos((prev) => [result.todo, ...prev]);
      return { ok: true };
    },
    [householdId, activeList]
  );

  const toggleTodo = useCallback(async (todoId: string, done: boolean) => {
    const status = done ? 'done' : 'open';
    const ok = await setTodoStatus(todoId, status);
    if (!ok) return false;
    setTodos((prev) =>
      prev.map((t) => (t.id === todoId ? { ...t, status, updatedAt: Date.now() } : t))
    );
    return true;
  }, []);

  const removeTodo = useCallback(async (todoId: string) => {
    const ok = await deleteTodo(todoId);
    if (!ok) return false;
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    return true;
  }, []);

  return {
    ready,
    noHousehold,
    error,
    lists,
    todos: visibleTodos,
    members,
    activeList,
    activeListId,
    setActiveListId,
    assigneeOptions,
    refresh,
    addTodo,
    toggleTodo,
    removeTodo,
    migratedCount,
  };
}
