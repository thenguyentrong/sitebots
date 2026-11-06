'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Hidden on the chat, which fills the screen and carries the same links itself. */
export function SiteFooter() {
  if (usePathname() === '/') return null;
  return (
    <footer className="mt-16 border-t border-edge">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
        <p>Unknown stays unknown. Every value links to its source.</p>
        <nav className="flex gap-5" aria-label="Legal">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/impressum" className="hover:text-foreground">Impressum</Link>
        </nav>
      </div>
    </footer>
  );
}
