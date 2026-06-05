export type VoicePreference = 'nova' | 'onyx';
export type PronounSet = 'she' | 'he' | 'they';

export type AccountProfile = {
  displayName: string;
  systemPrompt: string;
  facts: string;
  voice: VoicePreference;
  pronouns: PronounSet;
};

export const GENERIC_PROFILE: AccountProfile = {
  displayName: 'Guest',
  systemPrompt:
    'You are helping someone who has difficulty speaking. Be warm, clear, and patient.',
  facts: '',
  voice: 'nova',
  pronouns: 'they',
};
