'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useSession } from '@/hooks/useSession';
import { ensureAccountProfile } from '@/lib/profile';
import { displayName } from '@/lib/pronouns';
import { loadFamilyChat, saveFamilyChat } from '@/lib/webStorage';
import { DEFAULT_CHANNELS, newChatMessageId, type FamilyChatMessage } from '@/types/familyChat';

export default function FamilyChannelPage() {
  const params = useParams();
  const channelId = String(params.channelId ?? '');
  const channel = DEFAULT_CHANNELS.find((c) => c.id === channelId);
  const { user, loading } = useSession();
  const [author, setAuthor] = useState('Family');
  const [messages, setMessages] = useState<FamilyChatMessage[]>([]);
  const [draft, setDraft] = useState('');

  const markRead = useCallback(() => {
    const state = loadFamilyChat();
    const msgs = state.messagesByChannel[channelId] ?? [];
    const latestAt = msgs.reduce((max, m) => Math.max(max, m.createdAt), 0);
    const lastRead = state.lastReadAt[channelId] ?? 0;
    if (latestAt > 0 && lastRead >= latestAt) return;
    saveFamilyChat({
      ...state,
      lastReadAt: { ...state.lastReadAt, [channelId]: Date.now() },
    });
  }, [channelId]);

  useEffect(() => {
    if (!user) return;
    void ensureAccountProfile(user.id).then((r) => {
      if (r.ok) setAuthor(displayName(r.profile));
    });
    const state = loadFamilyChat();
    setMessages(state.messagesByChannel[channelId] ?? []);
    markRead();
  }, [user, channelId, markRead]);

  const post = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const state = loadFamilyChat();
    const message: FamilyChatMessage = {
      id: newChatMessageId(),
      channelId,
      authorLabel: author,
      text: trimmed,
      createdAt: Date.now(),
    };
    const next = [...(state.messagesByChannel[channelId] ?? []), message];
    saveFamilyChat({
      ...state,
      messagesByChannel: { ...state.messagesByChannel, [channelId]: next },
      lastReadAt: { ...state.lastReadAt, [channelId]: Date.now() },
    });
    setMessages(next);
    setDraft('');
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  if (!channel) {
    return <AppShell title="Not found" backHref="/family"><p>Unknown channel</p></AppShell>;
  }

  return (
    <AppShell title={`#${channel.name}`} subtitle={channel.description} backHref="/family">
      <div className="space-y-3 min-h-[50vh] mb-4">
        {messages.length === 0 ? (
          <p className="text-muted text-sm text-center">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.authorLabel === author ? 'bubble-user' : 'bubble-assistant'}>
              <p className="text-muted text-xs font-bold mb-1">{m.authorLabel}</p>
              <p className="text-sm whitespace-pre-wrap">{m.text}</p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          onKeyDown={(e) => e.key === 'Enter' && post()}
        />
        <button type="button" className="btn-primary" onClick={post}>
          Post
        </button>
      </div>
    </AppShell>
  );
}
