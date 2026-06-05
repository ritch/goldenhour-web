import Link from 'next/link';

const CARDS = [
  { href: '/write', label: 'Write', desc: 'Compose a message' },
  { href: '/chat', label: 'AI Chat', desc: 'Talk with your assistant' },
  { href: '/family', label: 'Family', desc: 'Household channels' },
  { href: '/reminders', label: 'Reminders', desc: 'Scheduled alerts (browser)' },
  { href: '/meds', label: 'Meds', desc: 'Medication list' },
  { href: '/settings', label: 'Settings', desc: 'Profile & memory' },
  { href: '/household', label: 'Household', desc: 'Family group & invite' },
] as const;

export function HomeMenu({ name }: { name: string }) {
  return (
    <div>
      <p className="text-muted mb-4">Hello, <span className="text-foreground font-bold">{name}</span></p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="aspect-square rounded-2xl border-2 border-border bg-surface p-4 flex flex-col justify-center items-center text-center hover:border-accent transition-colors"
          >
            <span className="text-xl font-extrabold">{card.label}</span>
            <span className="text-muted text-xs mt-1 font-semibold">{card.desc}</span>
          </Link>
        ))}
      </div>
      <p className="text-muted text-xs mt-6 text-center">
        Web app — camera, mic recording, and push notifications are on mobile only.
      </p>
    </div>
  );
}
