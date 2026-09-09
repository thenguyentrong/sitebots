import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { SITE } from '@/lib/site';
import { TRUST_HINT } from '@/lib/spec/display';
import type { Trust } from '@/lib/spec/enums';

const TRUSTS: Trust[] = ['verified', 'assessed', 'reported', 'unknown'];
const LINKS = [
  { href: '/', label: 'Find a robot' },
  { href: '/robots', label: 'All robots' },
  { href: '/brands', label: 'Makers' },
  { href: '/compare', label: 'Compare' },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-edge bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm text-muted">
            Every figure links to the page it was read from. A value is marked verified only when the manufacturer
            states it. Unknown stays unknown.
          </p>
        </div>
        <div>
          <p className="eyebrow">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted transition hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">How to read a value</p>
          <ul className="mt-3 space-y-2.5 text-sm">
            {TRUSTS.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <EvidenceBadge trust={t} className="mt-0.5 shrink-0" />
                <span className="text-muted">{TRUST_HINT[t]}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-edge/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-faint sm:px-6">
          <span>
            © {new Date().getFullYear()} {SITE.name}
          </span>
          <span>Data from manufacturer pages, EU distributors and public databases, attributed on every page.</span>
        </div>
      </div>
    </footer>
  );
}
