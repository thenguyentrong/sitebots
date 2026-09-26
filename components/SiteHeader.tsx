import { Logo } from '@/components/Logo';
import { NavLinks } from '@/components/NavLinks';
import { ShortlistLink } from '@/components/ShortlistLink';

/** Static, in the page flow; nothing floats over the content. On phones the nav gets its own scrollable row instead of squeezing beside the logo. */
export function SiteHeader() {
  return (
    <header className="border-b border-edge bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <NavLinks className="hidden md:flex" />
        <ShortlistLink />
      </div>
      <div className="border-t border-edge md:hidden">
        <div className="mx-auto max-w-6xl overflow-x-auto px-4 py-2 sm:px-6">
          <NavLinks className="w-max" />
        </div>
      </div>
    </header>
  );
}
