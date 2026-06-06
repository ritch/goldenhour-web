import type { FamilyChatMessage } from '@/types/familyChat';

export const FAMILY_AI_AUTHOR = 'Golden Hour AI';

const AI_MENTION = /@ai\b/i;

export function messageMentionsAi(text: string): boolean {
  return AI_MENTION.test(text);
}

export function shouldRequestFamilyAi(text: string, requestAi?: boolean): boolean {
  return Boolean(requestAi) || messageMentionsAi(text);
}

export function isFamilyAiMessage(message: FamilyChatMessage): boolean {
  return message.authorLabel === FAMILY_AI_AUTHOR;
}
