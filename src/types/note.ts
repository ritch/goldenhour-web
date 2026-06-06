import type { ContentVisibility } from './contentVisibility';

export type Note = {
  id: string;
  householdId: string | null;
  authorId: string;
  title: string;
  body: string;
  visibility: ContentVisibility;
  createdAt: number;
  updatedAt: number;
};
