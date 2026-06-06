import { FAMILY_AI_AUTHOR } from '@/lib/familyChatAiConstants';
import { completeChatCompletion, type ApiChatMessage } from '@/lib/aiChat';
import { buildHarnessClientContext } from '@/lib/buildHarnessContext';
import { fetchFamilyChatHarnessSnapshot } from '@/lib/familyChatSync';
import { displayName } from '@/lib/pronouns';
import { loadMedications, loadMemory, loadReminders } from '@/lib/webStorage';
import type { FamilyChatMessage } from '@/types/familyChat';
import type { AccountProfile } from '@/types/profile';

const CONTEXT_LIMIT = 40;

function formatTranscript(messages: FamilyChatMessage[]): string {
  return messages
    .slice(-CONTEXT_LIMIT)
    .map((m) => {
      const who = m.authorLabel === FAMILY_AI_AUTHOR ? 'AI' : m.authorLabel;
      return `${who}: ${m.text}`;
    })
    .join('\n');
}

function buildFamilyAiMessages(input: {
  channelName: string;
  messages: FamilyChatMessage[];
  trigger: FamilyChatMessage;
  profile: AccountProfile | null;
}): ApiChatMessage[] {
  const name = input.profile ? displayName(input.profile) : 'the family';
  const transcript = formatTranscript(input.messages);

  const system = [
    `You are ${FAMILY_AI_AUTHOR}, a warm assistant participating in the #${input.channelName} family channel.`,
    `You are helping ${name}'s household. Keep replies short (1–4 sentences), clear, and useful for everyone.`,
    'Respond inline as part of the conversation — not as a private chat.',
    'Do not mention @ai or that you are an AI unless helpful. No markdown.',
    transcript ? `Recent channel messages:\n${transcript}` : 'The channel is just getting started.',
  ].join('\n\n');

  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Reply to the latest message from ${input.trigger.authorLabel}: "${input.trigger.text}"`,
    },
  ];
}

export async function generateFamilyChannelAiReply(input: {
  userId: string;
  channelName: string;
  messages: FamilyChatMessage[];
  trigger: FamilyChatMessage;
  profile: AccountProfile | null;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const apiMessages = buildFamilyAiMessages(input);

  const [medications, reminders, memory, familyChatSnap] = await Promise.all([
    Promise.resolve(loadMedications(input.userId)),
    Promise.resolve(loadReminders()),
    Promise.resolve(loadMemory(input.userId)),
    fetchFamilyChatHarnessSnapshot(),
  ]);

  const clientContext = buildHarnessClientContext({
    medications,
    reminders,
    memory,
    familyChat: familyChatSnap ?? {
      messagesByChannel: { general: [], updates: [], help: [], caregivers: [] },
      lastReadAt: { general: 0, updates: 0, help: 0, caregivers: 0 },
    },
  });

  const result = await completeChatCompletion(apiMessages, clientContext);
  if (!result.ok) return result;

  const text = result.text.trim();
  if (!text) return { ok: false, error: 'AI returned an empty reply' };
  return { ok: true, text };
}
