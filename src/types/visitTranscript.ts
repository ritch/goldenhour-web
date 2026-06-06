import type { ContentVisibility } from './contentVisibility';

export type VisitTranscript = {
  id: string;
  userId: string;
  householdId: string | null;
  title: string;
  transcript: string;
  durationMs: number;
  recordedAt: number;
  visibility: ContentVisibility;
};

export function defaultVisitTitle(recordedAt: number): string {
  return `Doctor visit · ${new Date(recordedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}
