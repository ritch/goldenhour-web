'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  children: string;
  className?: string;
};

export function ChatMarkdown({ children, className }: Props) {
  const trimmed = children.trim();
  if (!trimmed) return null;

  return (
    <div className={['chat-markdown', className].filter(Boolean).join(' ')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
