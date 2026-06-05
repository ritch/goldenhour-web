export type FamilyMessageProposal = {
  proposal_id: string;
  type: 'family_message';
  channel_id: string;
  channel_name?: string;
  message: string;
};

export type ReminderProposal = {
  proposal_id: string;
  type: 'reminder';
  title: string;
  body?: string;
  fire_at_iso: string;
  repeat: 'none' | 'daily';
  when_label?: string;
};

export type MedicationProposal = {
  proposal_id: string;
  type: 'medication';
  name: string;
  strength?: string;
  form?: string;
  instructions?: string;
  suggested_times: string[];
  notes?: string;
};

export type MemoryProposal = {
  proposal_id: string;
  type: 'memory';
  text: string;
};

export type AiProposal =
  | FamilyMessageProposal
  | ReminderProposal
  | MedicationProposal
  | MemoryProposal;

export type ProposalStatus = 'pending' | 'applied' | 'dismissed' | 'error';

export type AiProposalState = {
  proposal: AiProposal;
  status: ProposalStatus;
  error?: string;
};

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function parseAiProposal(raw: unknown): AiProposal | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const proposal_id = asString(o.proposal_id);
  const type = asString(o.type);
  if (!proposal_id || !type) return null;

  if (type === 'family_message') {
    const channel_id = asString(o.channel_id);
    const message = asString(o.message);
    if (!channel_id || !message) return null;
    return {
      proposal_id,
      type: 'family_message',
      channel_id,
      channel_name: asString(o.channel_name) || undefined,
      message,
    };
  }

  if (type === 'reminder') {
    const title = asString(o.title);
    const fire_at_iso = asString(o.fire_at_iso);
    if (!title || !fire_at_iso) return null;
    return {
      proposal_id,
      type: 'reminder',
      title,
      body: asString(o.body) || undefined,
      fire_at_iso,
      repeat: o.repeat === 'daily' ? 'daily' : 'none',
      when_label: asString(o.when_label) || undefined,
    };
  }

  if (type === 'medication') {
    const name = asString(o.name);
    if (!name) return null;
    const suggested_times = Array.isArray(o.suggested_times)
      ? o.suggested_times.map((t) => String(t).trim()).filter(Boolean)
      : ['08:00'];
    return {
      proposal_id,
      type: 'medication',
      name,
      strength: asString(o.strength) || undefined,
      form: asString(o.form) || undefined,
      instructions: asString(o.instructions) || undefined,
      suggested_times: suggested_times.length ? suggested_times : ['08:00'],
      notes: asString(o.notes) || undefined,
    };
  }

  if (type === 'memory') {
    const text = asString(o.text);
    if (!text) return null;
    return { proposal_id, type: 'memory', text };
  }

  return null;
}

export function parseAiProposals(raw: unknown): AiProposal[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseAiProposal).filter((p): p is AiProposal => p != null);
}
