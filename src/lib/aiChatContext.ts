import { hasMemoryContent, type PersonMemory } from '@/types/memory';
import type { AccountProfile } from '@/types/profile';
import { displayName, pronounForms } from '@/lib/pronouns';

function factsToBulletList(facts: string): string {
  const lines = facts
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines.map((l) => `- ${l}`).join('\n') : '';
}

function formatMemoryBlock(memory: PersonMemory): string {
  const parts: string[] = [];
  if (memory.summary.trim()) parts.push(memory.summary.trim());
  const recent = memory.entries.slice(-15);
  if (recent.length) parts.push(recent.map((e) => `- ${e.text}`).join('\n'));
  if (!parts.length) return '';
  return `Conversation memory (optional context):\n${parts.join('\n\n')}`;
}

export function buildAiChatSystemMessage(
  profile: AccountProfile,
  memory: PersonMemory
): string {
  const name = displayName(profile);
  const { subject, possessive } = pronounForms(profile.pronouns);
  const factsBlock = factsToBulletList(profile.facts);
  const memoryBlock = hasMemoryContent(memory) ? formatMemoryBlock(memory) : '';

  return [
    `You are a warm, patient assistant helping ${name}, who has difficulty speaking.`,
    profile.systemPrompt.trim(),
    factsBlock ? `Facts about ${name}:\n${factsBlock}` : '',
    memoryBlock,
    `Speak clearly and simply. ${subject} may read your replies aloud. Use ${possessive} name when natural.`,
    'For medical research questions, use search_medical_literature then get_medical_study for papers you cite. ' +
      'Cite PMIDs or NCT IDs. Summarize in plain language — not medical advice.',
    'For follow-ups, supplies, or caregiver tasks, use get_household_todos and create_todo (shared household Tasks list).',
  ]
    .filter(Boolean)
    .join('\n\n');
}
