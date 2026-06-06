import { createClient } from '@/lib/supabase/client';
import { fetchMyHousehold } from '@/lib/household';
import { loadLastReadAt, saveLastReadAt } from '@/lib/webStorage';
import { DEFAULT_CHANNELS } from '@/types/familyChat';
import type { FamilyChatMessage } from '@/types/familyChat';

export type SyncChannel = {
  uuid: string;
  slug: string;
  name: string;
  description: string;
};

type MessageRow = {
  id: string;
  channel_id: string;
  household_id: string;
  author_id: string;
  author_label: string;
  body: string;
  created_at: string;
};

type ChannelRow = {
  id: string;
  household_id: string;
  slug: string;
  name: string;
  description: string | null;
};

const MESSAGE_LIMIT = 200;

const SEED_CHANNELS = DEFAULT_CHANNELS.map((ch) => ({
  slug: ch.id,
  name: ch.name,
  description: ch.description,
}));

function rowToMessage(row: MessageRow, slugByUuid: Map<string, string>): FamilyChatMessage | null {
  const channelSlug = slugByUuid.get(row.channel_id);
  if (!channelSlug) return null;
  return {
    id: row.id,
    channelId: channelSlug,
    authorLabel: row.author_label.trim() || 'Family',
    text: row.body.trim(),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function emptyMessagesForSlugs(slugs: Iterable<string>): Record<string, FamilyChatMessage[]> {
  const bySlug: Record<string, FamilyChatMessage[]> = {};
  for (const ch of DEFAULT_CHANNELS) bySlug[ch.id] = [];
  for (const slug of slugs) {
    if (!bySlug[slug]) bySlug[slug] = [];
  }
  return bySlug;
}

function groupMessages(
  rows: MessageRow[],
  slugByUuid: Map<string, string>
): Record<string, FamilyChatMessage[]> {
  const bySlug = emptyMessagesForSlugs(slugByUuid.values());
  for (const row of rows) {
    const msg = rowToMessage(row, slugByUuid);
    if (!msg) continue;
    if (!bySlug[msg.channelId]) bySlug[msg.channelId] = [];
    bySlug[msg.channelId].push(msg);
  }
  for (const slug of Object.keys(bySlug)) {
    bySlug[slug].sort((a, b) => a.createdAt - b.createdAt);
  }
  return bySlug;
}

export async function resolveHouseholdChat() {
  const result = await fetchMyHousehold();
  if (!result.ok) return { ok: false as const, error: result.error };
  if ('empty' in result && result.empty) return { ok: true as const, empty: true as const };
  return { ok: true as const, householdId: result.id, householdName: result.name };
}

async function ensureDefaultChannels(householdId: string): Promise<void> {
  const supabase = createClient();
  const { data: existing } = await supabase.from('channels').select('slug').eq('household_id', householdId);
  const have = new Set((existing ?? []).map((r) => r.slug));
  const missing = SEED_CHANNELS.filter((c) => !have.has(c.slug));
  if (!missing.length) return;
  await supabase.from('channels').insert(
    missing.map((c) => ({
      household_id: householdId,
      slug: c.slug,
      name: c.name,
      description: c.description,
    }))
  );
}

export async function fetchHouseholdChannels(householdId: string): Promise<SyncChannel[]> {
  const supabase = createClient();
  await ensureDefaultChannels(householdId);

  const { data, error } = await supabase
    .from('channels')
    .select('id, household_id, slug, name, description')
    .eq('household_id', householdId)
    .order('slug');

  if (error || !data?.length) {
    return SEED_CHANNELS.map((c) => ({
      uuid: '',
      slug: c.slug,
      name: c.name,
      description: c.description,
    }));
  }

  return (data as ChannelRow[]).map((row) => ({
    uuid: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description?.trim() || '',
  }));
}

export async function fetchHouseholdMessages(
  householdId: string,
  channels: SyncChannel[]
): Promise<Record<string, FamilyChatMessage[]>> {
  const supabase = createClient();
  const slugByUuid = new Map(channels.filter((c) => c.uuid).map((c) => [c.uuid, c.slug]));
  const uuids = channels.map((c) => c.uuid).filter(Boolean);
  if (!uuids.length) {
    return emptyMessagesForSlugs(channels.map((c) => c.slug));
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, channel_id, household_id, author_id, author_label, body, created_at')
    .eq('household_id', householdId)
    .in('channel_id', uuids)
    .order('created_at', { ascending: true })
    .limit(MESSAGE_LIMIT);

  if (error || !data) {
    return emptyMessagesForSlugs(channels.map((c) => c.slug));
  }

  return groupMessages(data as MessageRow[], slugByUuid);
}

export async function postHouseholdMessage(input: {
  householdId: string;
  channelUuid: string;
  channelSlug: string;
  authorLabel: string;
  text: string;
}): Promise<FamilyChatMessage | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const trimmed = input.text.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel_id: input.channelUuid,
      household_id: input.householdId,
      author_id: user.id,
      author_label: input.authorLabel.trim() || 'Family',
      body: trimmed,
    })
    .select('id, channel_id, household_id, author_id, author_label, body, created_at')
    .single();

  if (error || !data) return null;

  const row = data as MessageRow;
  return {
    id: row.id,
    channelId: input.channelSlug,
    authorLabel: row.author_label.trim() || 'Family',
    text: row.body.trim(),
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function subscribeHouseholdMessages(
  householdId: string,
  channels: SyncChannel[],
  onMessage: (message: FamilyChatMessage) => void
): () => void {
  const supabase = createClient();
  const slugByUuid = new Map(channels.filter((c) => c.uuid).map((c) => [c.uuid, c.slug]));

  const channel = supabase
    .channel(`family-chat:${householdId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        const row = payload.new as MessageRow;
        const msg = rowToMessage(row, slugByUuid);
        if (msg) onMessage(msg);
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function channelUuidForSlug(channels: SyncChannel[], slug: string): string | null {
  return channels.find((c) => c.slug === slug)?.uuid ?? null;
}

export async function fetchFamilyChatHarnessSnapshot(): Promise<{
  messagesByChannel: Record<string, FamilyChatMessage[]>;
  lastReadAt: Record<string, number>;
} | null> {
  const household = await resolveHouseholdChat();
  if (!household.ok || ('empty' in household && household.empty)) return null;

  const channels = await fetchHouseholdChannels(household.householdId);
  const [messages, lastReadAt] = await Promise.all([
    fetchHouseholdMessages(household.householdId, channels),
    Promise.resolve(loadLastReadAt(household.householdId)),
  ]);
  return { messagesByChannel: messages, lastReadAt };
}
