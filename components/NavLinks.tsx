'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Find a robot', match: (p: string) => p === '/' },
  { href: '/robots', label: 'Robots', match: (p: string) => p.startsWith('/robots') },
  { href: '/brands', label: 'Makers', match: (p: string) => p.startsWith('/brands') },
  { href: '/compare', label: 'Compare', match: (p: string) => p.startsWith('/compare') },
];

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname() ?? '/';
  return (
    <nav className={cn('flex items-center gap-1 rounded-full border border-edge bg-subtle/80 p-1', className)} aria-label="Main">
      {ITEMS.map((it) => {
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={cn('whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition', active ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted hover:text-foreground')}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
