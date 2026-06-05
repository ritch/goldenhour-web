import type { AiProposalState } from '@/types/aiProposals';

type Props = {
  items: AiProposalState[];
  busyId?: string;
  onConfirm: (id: string) => void;
  onDismiss: (id: string) => void;
};

function title(item: AiProposalState): string {
  const p = item.proposal;
  if (p.type === 'family_message') return `Post to ${p.channel_name ?? p.channel_id}`;
  if (p.type === 'reminder') return 'New reminder';
  if (p.type === 'medication') return 'Add medication';
  return 'Save to memory';
}

function body(item: AiProposalState): string {
  const p = item.proposal;
  if (p.type === 'family_message') return p.message;
  if (p.type === 'reminder') {
    return `${p.title}\n${p.when_label ?? p.fire_at_iso}${p.repeat === 'daily' ? ' · daily' : ''}`;
  }
  if (p.type === 'medication') {
    return [p.name, p.strength, p.instructions, `Times: ${p.suggested_times.join(', ')}`]
      .filter(Boolean)
      .join(' · ');
  }
  return p.text;
}

export function ChatProposals({ items, busyId, onConfirm, onDismiss }: Props) {
  const visible = items.filter((i) => i.status === 'pending' || i.status === 'error');
  if (!visible.length) return null;

  return (
    <div className="space-y-3 mt-4">
      {visible.map((item) => (
        <div key={item.proposal.proposal_id} className="card border-accent">
          <p className="text-accent text-xs font-extrabold uppercase tracking-wide">{title(item)}</p>
          <p className="whitespace-pre-wrap text-sm mt-2">{body(item)}</p>
          {item.error ? <p className="text-warning text-sm mt-1">{item.error}</p> : null}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="btn-secondary flex-1"
              disabled={busyId === item.proposal.proposal_id}
              onClick={() => onDismiss(item.proposal.proposal_id)}
            >
              Not now
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={busyId === item.proposal.proposal_id}
              onClick={() => onConfirm(item.proposal.proposal_id)}
            >
              {busyId === item.proposal.proposal_id ? '…' : 'Confirm'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
