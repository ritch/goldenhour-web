export type ChatChannel = {
  id: string;
  name: string;
  description: string;
};

export type FamilyChatMessage = {
  id: string;
  channelId: string;
  authorLabel: string;
  text: string;
  createdAt: number;
};

export type FamilyChatState = {
  messagesByChannel: Record<string, FamilyChatMessage[]>;
  lastReadAt: Record<string, number>;
};

export const DEFAULT_CHANNELS: ChatChannel[] = [
  { id: 'general', name: 'General', description: 'Everyone — everyday notes and hello' },
  { id: 'updates', name: 'Updates', description: 'Plans, arrivals, and quick status' },
  { id: 'help', name: 'Help', description: 'Ask for a hand or check in' },
  { id: 'caregivers', name: 'Caregivers', description: 'Care team coordination' },
];

export function emptyFamilyChatState(): FamilyChatState {
  const messagesByChannel: FamilyChatState['messagesByChannel'] = {};
  const lastReadAt: FamilyChatState['lastReadAt'] = {};
  for (const ch of DEFAULT_CHANNELS) {
    messagesByChannel[ch.id] = [];
    lastReadAt[ch.id] = Date.now();
  }
  return { messagesByChannel, lastReadAt };
}

export function newChatMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
