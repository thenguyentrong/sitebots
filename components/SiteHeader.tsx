import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { NavLinks } from '@/components/NavLinks';
import { ui } from '@/lib/ui';

/** Sticky, translucent. On phones the nav gets its own scrollable row instead of squeezing beside the logo. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-edge/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <NavLinks className="hidden md:flex" />
        <Link href="/#matcher" className={`${ui.btn} h-9 px-4`}>
          Find a robot
        </Link>
      </div>
      <div className="border-t border-edge/60 md:hidden">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 py-2 sm:px-6">
          <NavLinks className="w-max" />
        </div>
      </div>
    </header>
  );
}
