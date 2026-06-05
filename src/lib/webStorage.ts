'use client';

import { emptyFamilyChatState, type FamilyChatState } from '@/types/familyChat';
import { emptyMemory, type PersonMemory } from '@/types/memory';
import type { Medication } from '@/types/medication';
import type { Reminder } from '@/types/reminder';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const ACTIVE_HOUSEHOLD = 'gh-web/active-household';

export function getActiveHouseholdId(): string | null {
  return readJson<string | null>(ACTIVE_HOUSEHOLD, null);
}

export function setActiveHouseholdId(id: string): void {
  writeJson(ACTIVE_HOUSEHOLD, id);
}

export function memoryKey(userId: string): string {
  return `gh-web/memory/${userId}`;
}

export function medsKey(userId: string): string {
  return `gh-web/meds/${userId}`;
}

export function remindersKey(): string {
  return 'gh-web/reminders';
}

export function familyChatKey(): string {
  return 'gh-web/family-chat';
}

export function loadMemory(userId: string): PersonMemory {
  return readJson(memoryKey(userId), emptyMemory());
}

export function saveMemory(userId: string, memory: PersonMemory): void {
  writeJson(memoryKey(userId), memory);
}

export function appendMemoryEntry(userId: string, text: string): PersonMemory {
  const trimmed = text.trim();
  const memory = loadMemory(userId);
  if (!trimmed) return memory;
  const next: PersonMemory = {
    ...memory,
    entries: [
      ...memory.entries,
      { id: `m-${Date.now()}`, text: trimmed, capturedAt: Date.now() },
    ],
  };
  saveMemory(userId, next);
  return next;
}

export function loadMedications(userId: string): Medication[] {
  return readJson(medsKey(userId), []);
}

export function saveMedications(userId: string, meds: Medication[]): void {
  writeJson(medsKey(userId), meds);
}

export function loadReminders(): Reminder[] {
  return readJson(remindersKey(), []);
}

export function saveReminders(reminders: Reminder[]): void {
  writeJson(remindersKey(), reminders);
}

export function loadFamilyChat(): FamilyChatState {
  return readJson(familyChatKey(), emptyFamilyChatState());
}

export function saveFamilyChat(state: FamilyChatState): void {
  writeJson(familyChatKey(), state);
}
