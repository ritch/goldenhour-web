import { DEFAULT_CHANNELS } from '@/types/familyChat';
import type { FamilyChatMessage } from '@/types/familyChat';
import type { PersonMemory } from '@/types/memory';
import type { Medication } from '@/types/medication';
import type { Reminder } from '@/types/reminder';

export type HarnessClientContext = {
  medications: {
    name: string;
    strength: string;
    form: string;
    instructions: string;
    schedule_times: string[];
    enabled: boolean;
  }[];
  reminders: {
    title: string;
    body: string;
    fire_at: string;
    repeat: 'none' | 'daily';
    enabled: boolean;
  }[];
  memory: {
    summary: string;
    entries: { text: string; captured_at: string }[];
  };
  family_chat: {
    channels: {
      id: string;
      name: string;
      unread_count: number;
      recent_messages: { author: string; text: string; created_at: string }[];
    }[];
  };
  doctor_visits: [];
};

type FamilyChatSnapshot = {
  messagesByChannel: Record<string, FamilyChatMessage[]>;
  lastReadAt: Record<string, number>;
};

export function buildHarnessClientContext(input: {
  medications: Medication[];
  reminders: Reminder[];
  memory: PersonMemory;
  familyChat: FamilyChatSnapshot;
}): HarnessClientContext {
  const channels = DEFAULT_CHANNELS.map((ch) => {
    const messages = input.familyChat.messagesByChannel[ch.id] ?? [];
    const lastRead = input.familyChat.lastReadAt[ch.id] ?? 0;
    return {
      id: ch.id,
      name: ch.name,
      unread_count: messages.filter((m) => m.createdAt > lastRead).length,
      recent_messages: messages.slice(-10).map((m) => ({
        author: m.authorLabel,
        text: m.text,
        created_at: new Date(m.createdAt).toISOString(),
      })),
    };
  });

  return {
    medications: input.medications.map((m) => ({
      name: m.name,
      strength: m.strength,
      form: m.form,
      instructions: m.instructions,
      schedule_times: m.scheduleTimes,
      enabled: m.enabled,
    })),
    reminders: input.reminders.map((r) => ({
      title: r.title,
      body: r.body,
      fire_at: new Date(r.fireAt).toISOString(),
      repeat: r.repeat,
      enabled: r.enabled,
    })),
    memory: {
      summary: input.memory.summary.trim(),
      entries: input.memory.entries.map((e) => ({
        text: e.text,
        captured_at: new Date(e.capturedAt).toISOString(),
      })),
    },
    family_chat: { channels },
    doctor_visits: [],
  };
}
