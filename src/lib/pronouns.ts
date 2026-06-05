import type { AccountProfile, PronounSet } from '@/types/profile';

export function pronounForms(pronouns: PronounSet) {
  switch (pronouns) {
    case 'he':
      return { subject: 'he', object: 'him', possessive: 'his', Possessive: 'His' };
    case 'she':
      return { subject: 'she', object: 'her', possessive: 'her', Possessive: 'Her' };
    default:
      return { subject: 'they', object: 'them', possessive: 'their', Possessive: 'Their' };
  }
}

export function displayName(profile: AccountProfile): string {
  return profile.displayName.trim() || 'User';
}
