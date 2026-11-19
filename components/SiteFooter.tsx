'use client';

import Link from '@/components/LocaleLink';
import { COMMON } from '@/lib/i18n/common';
import { useLang, usePagePath } from '@/lib/i18n/client';

/** Hidden on the adviser, which fills the screen and carries the same links itself. */
export function SiteFooter() {
  const lang = useLang();
  const t = COMMON[lang];
  // The adviser lives on /advisor since 19 Nov 2026; the start page needs the legal links (§ 5 DDG).
  if (usePagePath().startsWith('/advisor')) return null;
  return (
    <footer className="mt-16 border-t border-edge">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
        <p>{t.footer}</p>
        <nav className="flex gap-5" aria-label={t.legal}>
          <Link href="/privacy" className="hover:text-foreground">{t.privacy}</Link>
          <Link href="/impressum" className="hover:text-foreground">{t.impressum}</Link>
        </nav>
      </div>
    </footer>
  );
}
