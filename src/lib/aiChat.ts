import { getHarnessUrl, isHarnessConfigured } from '@/lib/config';
import { harnessAuthHeaders } from '@/lib/harness';
import { parseAiProposals, type AiProposal } from '@/types/aiProposals';
import type { HarnessClientContext } from '@/lib/buildHarnessContext';

export type ApiChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type StreamChatCallbacks = {
  onDelta: (text: string) => void;
  onProposals?: (proposals: AiProposal[]) => void;
};

function parseSseChunk(
  chunk: string,
  callbacks: StreamChatCallbacks
): string {
  let remainder = '';
  const lines = chunk.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i];
    if (i === lines.length - 1 && !chunk.endsWith('\n')) {
      remainder = line;
      break;
    }
    line = line.trim();
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') continue;
    try {
      const parsed = JSON.parse(data) as {
        choices?: { delta?: { content?: string } }[];
        golden_hour?: { proposals?: unknown[] };
      };
      const ghProposals = parsed.golden_hour?.proposals;
      if (ghProposals?.length && callbacks.onProposals) {
        callbacks.onProposals(parseAiProposals(ghProposals));
      }
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) callbacks.onDelta(content);
    } catch {
      /* partial */
    }
  }
  return remainder;
}

export async function streamChatCompletion(
  messages: ApiChatMessage[],
  accessToken: string,
  clientContext: HarnessClientContext,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isHarnessConfigured()) {
    return {
      ok: false,
      error: 'Set NEXT_PUBLIC_SUPABASE_URL to use AI chat (llm-harness).',
    };
  }

  try {
    const res = await fetch(`${getHarnessUrl()}/v1/chat/stream`, {
      method: 'POST',
      headers: harnessAuthHeaders(accessToken),
      body: JSON.stringify({ messages, client_context: clientContext }),
      signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg =
        (body as { detail?: string })?.detail ??
        (body as { error?: { message?: string } })?.error?.message ??
        `Harness error ${res.status}`;
      return { ok: false, error: msg };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      let buffer = text;
      buffer = parseSseChunk(buffer, callbacks);
      if (buffer) parseSseChunk(`${buffer}\n`, callbacks);
      return { ok: true };
    }

    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = parseSseChunk(buffer, callbacks);
    }
    if (buffer) parseSseChunk(`${buffer}\n`, callbacks);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: 'Cancelled' };
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
