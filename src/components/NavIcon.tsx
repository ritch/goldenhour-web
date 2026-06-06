import type { NavItemId } from '@/config/nav';

type Props = {
  id: NavItemId;
  className?: string;
};

export function NavIcon({ id, className = 'w-6 h-6' }: Props) {
  const stroke = 'currentColor';
  const common = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (id) {
    case 'write':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case 'health':
      return (
        <svg {...common}>
          <path d="M19.5 12.5c0 4.14-3.36 7.5-7.5 7.5S4.5 16.64 4.5 12.5 7.86 5 12 5s7.5 3.36 7.5 7.5Z" />
          <path d="M12 8v7" />
          <path d="M8.5 11.5h7" />
        </svg>
      );
    case 'todo':
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'family':
      return (
        <svg {...common}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      );
    default:
      return null;
  }
}
