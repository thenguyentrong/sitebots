'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/Logo';

/** The chat draws its own header over the job site, so this one is for the pages it links to. */
export function SiteHeader() {
  if (usePathname() === '/') return null;
  return (
    <header className="border-b border-edge bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-6 text-sm text-muted" aria-label="Main">
          <Link href="/" className="font-medium text-foreground transition hover:text-safety">Ask the adviser</Link>
          <Link href="/robots" className="transition hover:text-foreground">Robots</Link>
          <Link href="/compare" className="transition hover:text-foreground">Compare</Link>
        </nav>
      </div>
    </header>
  );
}
