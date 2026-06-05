'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string | null;
};

export function AppShell({ title, subtitle, children, backHref = '/' }: Props) {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        {backHref ? (
          <Link href={backHref} className="text-muted text-sm font-bold hover:text-accent">
            ← Back
          </Link>
        ) : (
          <span className="w-12" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold truncate">{title}</h1>
          {subtitle ? <p className="text-muted text-sm truncate">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm font-bold text-muted hover:text-accent shrink-0"
        >
          Sign out
        </button>
      </header>
      <main className="p-4 max-w-3xl mx-auto w-full">{children}</main>
    </div>
  );
}
