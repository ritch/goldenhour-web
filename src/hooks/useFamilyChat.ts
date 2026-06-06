'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  channelUuidForSlug,
  fetchHouseholdChannels,
  fetchHouseholdMessages,
  postHouseholdMessage,
  resolveHouseholdChat,
  subscribeHouseholdMessages,
  type SyncChannel,
} from '@/lib/familyChatSync';
import { FAMILY_AI_AUTHOR, shouldRequestFamilyAi } from '@/lib/familyChatAiConstants';
import { generateFamilyChannelAiReply } from '@/lib/familyChatAi';
import { fetchHouseholdMembers } from '@/lib/household';
import { notifyChatMentions } from '@/lib/notificationSync';
import { loadLastReadAt, saveLastReadAt } from '@/lib/webStorage';
import { DEFAULT_CHANNELS } from '@/types/familyChat';
import type { FamilyChatMessage } from '@/types/familyChat';
import type { AccountProfile } from '@/types/profile';
import type { HouseholdPermissions } from '@/types/householdRoles';

function emptyMessages(): Record<string, FamilyChatMessage[]> {
  const map: Record<string, FamilyChatMessage[]> = {};
  for (const ch of DEFAULT_CHANNELS) map[ch.id] = [];
  return map;
}

export function useFamilyChat(
  authorLabel: string,
  userId: string,
  profile: AccountProfile | null,
  permissions?: HouseholdPermissions
) {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [syncChannels, setSyncChannels] = useState<SyncChannel[]>([]);
  const [messagesByChannel, setMessagesByChannel] = useState(emptyMessages);
  const [lastReadAt, setLastReadAt] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [noHousehold, setNoHousehold] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [aiReplyingChannel, setAiReplyingChannel] = useState<string | null>(null);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const syncChannelsRef = useRef(syncChannels);
  const householdIdRef = useRef(householdId);
  const messagesRef = useRef(messagesByChannel);
  syncChannelsRef.current = syncChannels;
  householdIdRef.current = householdId;
  messagesRef.current = messagesByChannel;

  const visibleSlugs = useMemo(
    () => new Set(permissions?.visibleChannelSlugs ?? DEFAULT_CHANNELS.map((c) => c.id)),
    [permissions?.visibleChannelSlugs]
  );

  const channels = useMemo(
    () =>
      DEFAULT_CHANNELS.filter((ch) => visibleSlugs.has(ch.id)).map((ch) => {
        const remote = syncChannels.find((c) => c.slug === ch.id);
        return remote
          ? { ...ch, name: remote.name, description: remote.description || ch.description }
          : ch;
      }),
    [syncChannels, visibleSlugs]
  );

  const refresh = useCallback(async () => {
    if (!userId) return;

    setLoadError(undefined);
    try {
      const household = await resolveHouseholdChat();
      if (!household.ok) {
        setLoadError(household.error);
        return;
      }
      if ('empty' in household && household.empty) {
        setNoHousehold(true);
        setHouseholdId(null);
        setHouseholdName(null);
        setSyncChannels([]);
        setMessagesByChannel(emptyMessages());
        return;
      }

      setNoHousehold(false);
      setHouseholdId(household.householdId);
      setHouseholdName(household.householdName);

      const channelRows = await fetchHouseholdChannels(household.householdId);
      const [readMap, messages] = await Promise.all([
        Promise.resolve(loadLastReadAt(household.householdId)),
        fetchHouseholdMessages(household.householdId, channelRows),
      ]);

      setSyncChannels(channelRows);
      setLastReadAt(readMap);
      setMessagesByChannel(messages);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load family chat');
    } finally {
      setReady(true);
    }
  }, [userId]);

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!householdId || !syncChannels.length) return;
    return subscribeHouseholdMessages(householdId, syncChannels, (message) => {
      setMessagesByChannel((prev) => {
        const list = prev[message.channelId] ?? [];
        if (list.some((m) => m.id === message.id)) return prev;
        const next = { ...prev };
        if (!next[message.channelId]) next[message.channelId] = [];
        next[message.channelId] = [...list, message].sort(
          (a, b) => a.createdAt - b.createdAt
        );
        return next;
      });
    });
  }, [householdId, syncChannels]);

  const unreadByChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ch of DEFAULT_CHANNELS) {
      const lastRead = lastReadAt[ch.id] ?? 0;
      counts[ch.id] =
        messagesByChannel[ch.id]?.filter((m) => m.createdAt > lastRead).length ?? 0;
    }
    return counts;
  }, [messagesByChannel, lastReadAt]);

  const markChannelRead = useCallback(
    async (channelSlug: string) => {
      if (!householdId) return;
      const messages = messagesByChannel[channelSlug] ?? [];
      const latestAt = messages.reduce((max, m) => Math.max(max, m.createdAt), 0);
      const lastRead = lastReadAt[channelSlug] ?? 0;
      if (latestAt > 0 && lastRead >= latestAt) return;
      const next = { ...lastReadAt, [channelSlug]: Date.now() };
      setLastReadAt(next);
      saveLastReadAt(householdId, next);
    },
    [householdId, messagesByChannel, lastReadAt]
  );

  const postMessage = useCallback(
    async (
      channelSlug: string,
      text: string,
      options?: { requestAi?: boolean }
    ) => {
      const hId = householdIdRef.current;
      const chs = syncChannelsRef.current;
      if (!hId) return false;

      const channelUuid = channelUuidForSlug(chs, channelSlug);
      if (!channelUuid) return false;

      const label = authorLabel.trim() || 'Family';
      const message = await postHouseholdMessage({
        householdId: hId,
        channelUuid,
        channelSlug,
        authorLabel: label,
        text,
      });
      if (!message) return false;

      const channelMeta = DEFAULT_CHANNELS.find((c) => c.id === channelSlug);
      const channelName = channelMeta?.name ?? channelSlug;
      const membersResult = await fetchHouseholdMembers(hId);
      if (membersResult.ok) {
        void notifyChatMentions({
          householdId: hId,
          channelSlug,
          channelName,
          authorLabel: label,
          authorUserId: userId,
          text,
          members: membersResult.members.map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
          })),
        });
      }

      setMessagesByChannel((prev) => {
        const list = prev[channelSlug] ?? [];
        if (list.some((m) => m.id === message.id)) return prev;
        return { ...prev, [channelSlug]: [...list, message] };
      });

      const nextRead = { ...lastReadAt, [channelSlug]: Date.now() };
      setLastReadAt(nextRead);
      saveLastReadAt(hId, nextRead);

      if (!shouldRequestFamilyAi(text, options?.requestAi)) return true;
      if (permissions && !permissions.canUseAi) return true;

      const transcript = [...(messagesRef.current[channelSlug] ?? []), message];

      setAiReplyingChannel(channelSlug);
      try {
        const aiResult = await generateFamilyChannelAiReply({
          userId,
          channelName,
          messages: transcript,
          trigger: message,
          profile: profileRef.current,
        });
        if (!aiResult.ok) return true;

        const aiMessage = await postHouseholdMessage({
          householdId: hId,
          channelUuid,
          channelSlug,
          authorLabel: FAMILY_AI_AUTHOR,
          text: aiResult.text,
        });
        if (!aiMessage) return true;

        setMessagesByChannel((prev) => {
          const list = prev[channelSlug] ?? [];
          if (list.some((m) => m.id === aiMessage.id)) return prev;
          return { ...prev, [channelSlug]: [...list, aiMessage] };
        });

        const readAfterAi = { ...nextRead, [channelSlug]: Date.now() };
        setLastReadAt(readAfterAi);
        saveLastReadAt(hId, readAfterAi);
      } finally {
        setAiReplyingChannel((current) => (current === channelSlug ? null : current));
      }

      return true;
    },
    [authorLabel, lastReadAt, userId]
  );

  return {
    ready,
    noHousehold,
    loadError,
    householdName,
    channels,
    messagesByChannel,
    unreadByChannel,
    markChannelRead,
    postMessage,
    refresh,
    aiReplyingChannel,
  };
}
