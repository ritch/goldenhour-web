'use client';

import Link from 'next/link';
import { AlertsButton } from '@/components/AlertsButton';
import { BottomNav } from '@/components/BottomNav';
import { SidebarNav } from '@/components/SidebarNav';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
};

export function AppShell({ title, subtitle, children, backHref }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
          {backHref ? (
            <Link href={backHref} className="text-muted text-sm font-bold hover:text-accent shrink-0">
              ← Back
            </Link>
          ) : (
            <span className="w-0 md:w-0" />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold truncate">{title}</h1>
            {subtitle ? <p className="text-muted text-sm truncate">{subtitle}</p> : null}
          </div>
          <AlertsButton />
        </header>
        <main className="flex-1 p-4 max-w-3xl w-full mx-auto pb-nav md:pb-4">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
