'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ChatMarkdown } from '@/components/ChatMarkdown';
import { useFamilyChat } from '@/hooks/useFamilyChat';
import { useHouseholdRole } from '@/hooks/useHouseholdRole';
import { useSession } from '@/hooks/useSession';
import { FAMILY_AI_AUTHOR } from '@/lib/familyChatAiConstants';
import { ensureAccountProfile } from '@/lib/profile';
import { displayName } from '@/lib/pronouns';
import type { AccountProfile } from '@/types/profile';
import { DEFAULT_CHANNELS } from '@/types/familyChat';

function bubbleClass(authorLabel: string, selfLabel: string): string {
  if (authorLabel === FAMILY_AI_AUTHOR) return 'bubble-ai';
  if (authorLabel === selfLabel) return 'bubble-user';
  return 'bubble-assistant';
}

export default function FamilyChannelPage() {
  const params = useParams();
  const channelId = String(params.channelId ?? '');
  const channel = DEFAULT_CHANNELS.find((c) => c.id === channelId);
  const { user, loading } = useSession();
  const [author, setAuthor] = useState('Family');
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const household = useHouseholdRole();
  const familyChat = useFamilyChat(
    author,
    user?.id ?? '',
    profile,
    household.ready ? household.permissions : undefined
  );
  const [draft, setDraft] = useState('');
  const [postError, setPostError] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    void ensureAccountProfile(user.id).then((r) => {
      if (r.ok) {
        setProfile(r.profile);
        setAuthor(displayName(r.profile));
      }
    });
  }, [user]);

  useEffect(() => {
    if (!familyChat.ready || familyChat.noHousehold) return;
    void familyChat.markChannelRead(channelId);
  }, [familyChat.ready, familyChat.noHousehold, channelId, familyChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [familyChat.messagesByChannel, channelId, familyChat.aiReplyingChannel]);

  const post = async (requestAi = false) => {
    setPostError(undefined);
    const trimmed = draft.trim();
    if (!trimmed) return;
    const ok = await familyChat.postMessage(channelId, trimmed, { requestAi });
    if (!ok) {
      setPostError('Could not post — check household membership.');
      return;
    }
    setDraft('');
  };

  if (loading || !user || !familyChat.ready) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  if (familyChat.loadError) {
    return (
      <AppShell title="Family Chat" backHref="/family">
        <p className="text-muted mb-4">{familyChat.loadError}</p>
        <button type="button" className="btn-primary" onClick={() => void familyChat.refresh()}>
          Try again
        </button>
      </AppShell>
    );
  }

  if (!channel) {
    return (
      <AppShell title="Not found" backHref="/family">
        <p>Unknown channel</p>
      </AppShell>
    );
  }

  if (
    household.ready &&
    !household.permissions.canSeeFamilyChat &&
    !household.permissions.canSeeCaregiverChat
  ) {
    return (
      <AppShell title="Family Chat" backHref="/family">
        <p className="text-muted">Your role does not include access to household chat.</p>
      </AppShell>
    );
  }

  if (familyChat.noHousehold) {
    return (
      <AppShell title={`#${channel.name}`} backHref="/family">
        <p className="text-muted">Join a household to view and post in channels.</p>
      </AppShell>
    );
  }

  const displayChannel = familyChat.channels.find((c) => c.id === channelId) ?? channel;
  const messages = familyChat.messagesByChannel[channelId] ?? [];
  const aiReplying = familyChat.aiReplyingChannel === channelId;

  return (
    <AppShell
      title={`#${displayChannel.name}`}
      subtitle={displayChannel.description}
      backHref="/family"
    >
      <div className="space-y-3 min-h-[50vh] mb-4">
        {messages.length === 0 && !aiReplying ? (
          <p className="text-muted text-sm text-center">
            No messages yet. Say hello or mention @ai for help.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={bubbleClass(m.authorLabel, author)}>
              <p className="text-muted text-xs font-bold mb-1">{m.authorLabel}</p>
              <ChatMarkdown>{m.text}</ChatMarkdown>
            </div>
          ))
        )}
        {aiReplying ? (
          <div className="bubble-ai">
            <p className="text-muted text-xs font-bold mb-1">{FAMILY_AI_AUTHOR}</p>
            <p className="text-sm text-muted">Thinking…</p>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>
      {postError ? <p className="text-warning text-sm mb-2">{postError}</p> : null}
      <div className="flex gap-2">
        <input
          className="input flex-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message #${displayChannel.name}… (type @ai to ask)`}
          disabled={aiReplying}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void post(false);
          }}
        />
        {household.permissions.canUseAi ? (
          <button
            type="button"
            className="btn-secondary"
            disabled={!draft.trim() || aiReplying}
            onClick={() => void post(true)}
          >
            Send to AI
          </button>
        ) : null}
        <button
          type="button"
          className="btn-primary"
          disabled={!draft.trim() || aiReplying}
          onClick={() => void post(false)}
        >
          Post
        </button>
      </div>
    </AppShell>
  );
}
