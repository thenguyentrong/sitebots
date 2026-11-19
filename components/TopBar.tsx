'use client';

import type { ReactNode } from 'react';
import { AccountButton } from '@/components/account/AccountButton';
import { LangSwitch } from '@/components/LangSwitch';
import Link from '@/components/LocaleLink';
import { Logo } from '@/components/Logo';
import { ACCESS_TEXT } from '@/lib/chat/i18n';
import { useLang, usePagePath } from '@/lib/i18n/client';

/** One header for every page: the adviser, the robots and the use cases (compare opens from a robot), the current one marked,
 *  the language switch and the account on the right. `overlay` lays it over the job-site scene on the opening screen. */
export function TopBar({ overlay = false, extra }: { overlay?: boolean; extra?: ReactNode }) {
  const lang = useLang();
  const path = usePagePath();
  const t = ACCESS_TEXT[lang].nav;
  const links = [
    { href: '/advisor', label: t.adviser, short: t.adviserShort, active: path.startsWith('/advisor') },
    { href: '/robots', label: t.robots, short: t.robots, active: path.startsWith('/robots') || path.startsWith('/market') || path.startsWith('/brands') },
    { href: '/use-cases', label: t.useCases, short: t.useCasesShort, active: path.startsWith('/use-cases') },
  ];
  return <header className={overlay ? 'absolute inset-x-0 top-0 z-10 top-overlay' : 'sticky top-0 z-20 border-b border-edge bg-background'}>
    <div className="mx-auto flex h-16 max-w-6xl items-center gap-1.5 px-4 sm:gap-4 sm:px-6">
      <Logo compact className={overlay ? 'text-white' : undefined} />
      <nav className="ml-auto flex min-w-0 items-center gap-0.5 sm:gap-1" aria-label={t.main}>
        {links.map((link) => <Link key={link.href} href={link.href} aria-current={link.active ? 'page' : undefined} className="top-link">
          <span className="max-sm:hidden">{link.label}</span><span className="sm:hidden">{link.short}</span>
        </Link>)}
      </nav>
      <LangSwitch overlay={overlay} />
      {extra}
      <AccountButton lang={lang} overlay={overlay} />
    </div>
  </header>;
}
