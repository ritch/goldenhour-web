import type { ContentVisibility } from './contentVisibility';

export type TodoStatus = 'open' | 'done';

export type TodoList = {
  id: string;
  householdId: string;
  name: string;
  isDefault: boolean;
};

export type TodoItem = {
  id: string;
  listId: string;
  listName: string;
  householdId: string;
  title: string;
  summary: string;
  status: TodoStatus;
  assigneeUserId: string | null;
  assigneeLabel: string;
  visibility: ContentVisibility;
  dueAt: number | null;
  remindAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type TodoAssigneeOption = {
  userId: string | null;
  label: string;
};
