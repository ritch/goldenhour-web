'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ChatProposals } from '@/components/ChatProposals';
import { useSession } from '@/hooks/useSession';
import { streamChatCompletion } from '@/lib/aiChat';
import { buildAiChatSystemMessage } from '@/lib/aiChatContext';
import { applyAiProposal } from '@/lib/applyProposal';
import { buildHarnessClientContext } from '@/lib/buildHarnessContext';
import { ensureAccountProfile } from '@/lib/profile';
import { displayName } from '@/lib/pronouns';
import { createClient } from '@/lib/supabase/client';
import {
  loadFamilyChat,
  loadMedications,
  loadMemory,
  loadReminders,
} from '@/lib/webStorage';
import type { AiProposalState } from '@/types/aiProposals';
import type { AccountProfile } from '@/types/profile';
import type { PersonMemory } from '@/types/memory';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const { user, loading } = useSession();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [memory, setMemory] = useState<PersonMemory | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [proposals, setProposals] = useState<AiProposalState[]>([]);
  const [busyProposal, setBusyProposal] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    void ensureAccountProfile(user.id).then((r) => {
      if (r.ok) setProfile(r.profile);
    });
    setMemory(loadMemory(user.id));
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, proposals]);

  useEffect(() => {
    if (seededRef.current || typeof window === 'undefined') return;
    const seed = new URLSearchParams(window.location.search).get('seed')?.trim();
    if (!seed) return;
    seededRef.current = true;
    setInput(seed);
  }, []);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || streaming || !user || !profile || !memory) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    const assistantId = `a-${Date.now()}`;
    setInput('');
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);
    setStreaming(true);
    setError(undefined);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setStreaming(false);
      setError('Sign in required');
      return;
    }

    const history = [...messages, userMsg];
    const clientContext = buildHarnessClientContext({
      medications: loadMedications(user.id),
      reminders: loadReminders(),
      memory,
      familyChat: loadFamilyChat(),
    });

    const result = await streamChatCompletion(
      [
        { role: 'system', content: buildAiChatSystemMessage(profile, memory) },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ],
      token,
      clientContext,
      {
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m))
          );
        },
        onProposals: (incoming) => {
          setProposals((prev) => {
            const seen = new Set(prev.map((p) => p.proposal.proposal_id));
            const added = incoming
              .filter((p) => !seen.has(p.proposal_id))
              .map((p) => ({ proposal: p, status: 'pending' as const }));
            return added.length ? [...prev, ...added] : prev;
          });
        },
      },
      controller.signal
    );

    setStreaming(false);
    if (!result.ok && result.error !== 'Cancelled') setError(result.error);
  }, [input, streaming, user, profile, memory, messages]);

  const confirmProposal = async (id: string) => {
    if (!user || !profile) return;
    const item = proposals.find((p) => p.proposal.proposal_id === id);
    if (!item || item.status !== 'pending') return;
    setBusyProposal(id);
    const result = await applyAiProposal(item.proposal, user.id, displayName(profile));
    setBusyProposal(undefined);
    setProposals((prev) =>
      prev.map((p) =>
        p.proposal.proposal_id === id
          ? { ...p, status: result.ok ? 'applied' : 'error', error: result.ok ? undefined : result.error }
          : p
      )
    );
    if (result.ok && item.proposal.type === 'memory') {
      setMemory(loadMemory(user.id));
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <AppShell title="AI Chat" subtitle={profile ? displayName(profile) : ''}>
      <div className="flex flex-col gap-3 min-h-[60vh]">
        {messages.length === 0 ? (
          <p className="text-muted text-sm">Ask anything — meds, family, reminders, memory.</p>
        ) : null}
        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'bubble-user' : 'bubble-assistant'}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content || (streaming ? '…' : '')}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="text-warning text-sm mt-2">{error}</p> : null}

      <ChatProposals
        items={proposals}
        busyId={busyProposal}
        onConfirm={(id) => void confirmProposal(id)}
        onDismiss={(id) =>
          setProposals((prev) =>
            prev.map((p) => (p.proposal.proposal_id === id ? { ...p, status: 'dismissed' } : p))
          )
        }
      />

      <div className="sticky bottom-0 pt-4 flex gap-2 bg-background">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Type your message…"
          className="input flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="button" className="btn-primary shrink-0" disabled={streaming || !input.trim()} onClick={() => void send()}>
          Send
        </button>
      </div>
    </AppShell>
  );
}
