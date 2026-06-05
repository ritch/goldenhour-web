import type { AiProposal } from '@/types/aiProposals';
import { newMedicationId, type Medication } from '@/types/medication';
import { newReminderId } from '@/types/reminder';
import { newChatMessageId } from '@/types/familyChat';
import {
  appendMemoryEntry,
  loadFamilyChat,
  loadMedications,
  loadReminders,
  saveFamilyChat,
  saveMedications,
  saveReminders,
} from '@/lib/webStorage';

export async function applyAiProposal(
  proposal: AiProposal,
  userId: string,
  authorLabel: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (proposal.type === 'memory') {
    appendMemoryEntry(userId, proposal.text);
    return { ok: true };
  }

  if (proposal.type === 'family_message') {
    const state = loadFamilyChat();
    const message = {
      id: newChatMessageId(),
      channelId: proposal.channel_id,
      authorLabel,
      text: proposal.message,
      createdAt: Date.now(),
    };
    const messages = [...(state.messagesByChannel[proposal.channel_id] ?? []), message];
    saveFamilyChat({
      ...state,
      messagesByChannel: { ...state.messagesByChannel, [proposal.channel_id]: messages },
      lastReadAt: { ...state.lastReadAt, [proposal.channel_id]: Date.now() },
    });
    return { ok: true };
  }

  if (proposal.type === 'reminder') {
    const fireAt = new Date(proposal.fire_at_iso).getTime();
    if (Number.isNaN(fireAt)) return { ok: false, error: 'Invalid reminder time' };
    const reminders = loadReminders();
    saveReminders([
      ...reminders,
      {
        id: newReminderId(),
        title: proposal.title,
        body: proposal.body ?? '',
        fireAt,
        repeat: proposal.repeat,
        enabled: true,
        createdAt: Date.now(),
      },
    ]);
    return { ok: true };
  }

  if (proposal.type === 'medication') {
    const meds = loadMedications(userId);
    const med: Medication = {
      id: newMedicationId(),
      name: proposal.name,
      strength: proposal.strength ?? '',
      form: proposal.form ?? '',
      instructions: proposal.instructions ?? '',
      scheduleTimes: proposal.suggested_times.length ? proposal.suggested_times : ['08:00'],
      enabled: true,
      createdAt: Date.now(),
    };
    saveMedications(userId, [...meds, med]);
    return { ok: true };
  }

  return { ok: false, error: 'Unknown proposal' };
}
