import Link from '@/components/LocaleLink';
import { GlobeHemisphereWest } from '@phosphor-icons/react/dist/ssr';
import { GermanFlag } from './Flag';
import { localePath, type Lang } from '@/lib/i18n/config';
import { LISTING_TEXT } from '@/lib/i18n/listing';
import { ui } from '@/lib/ui';
import { cn } from '@/lib/utils';

// Shared by both views of the robots page, so switching between them keeps the same frame.

/** In Germany: what a buyer here can get. Worldwide: every robot we track, prototypes included. */
export function ScopeSwitch({ world, q, lang }: { world: boolean; q?: string; lang: Lang }) {
  const t = LISTING_TEXT[lang];
  const search = q ? 'q=' + encodeURIComponent(q) : '';
  return <nav className={cn(ui.segment, 'mb-4')} aria-label={t.scopeNav}>
    <Link href={'/robots' + (search ? '?' + search : '')} className={cn(ui.segmentItem, 'px-4 py-1.5', !world && ui.segmentActive)} aria-current={!world ? 'page' : undefined}><span className="inline-flex items-center gap-2"><GermanFlag title={t.germany} />{t.inGermany}</span></Link>
    <Link href={'/robots?scope=world' + (search ? '&' + search : '')} className={cn(ui.segmentItem, 'px-4 py-1.5', world && ui.segmentActive)} aria-current={world ? 'page' : undefined}><span className="inline-flex items-center gap-2"><GlobeHemisphereWest size={16} weight="regular" aria-hidden />{t.worldwide}</span></Link>
  </nav>;
}

/** A GET form to the robots page in the page's language, so the results stay German on /de. */
export function RobotSearch({ q, keep, lang }: { q?: string; keep: Record<string, string | undefined>; lang: Lang }) {
  const t = LISTING_TEXT[lang];
  return <form action={localePath('/robots', lang)} method="get" className="ml-auto flex w-full items-center gap-2 sm:w-auto">
    {Object.entries(keep).map(([name, value]) => value ? <input key={name} type="hidden" name={name} value={value} /> : null)}
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{t.searchLabel}</span>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input key={q ?? ''} type="search" name="q" defaultValue={q ?? ''} placeholder={t.searchPlaceholder} className={`${ui.input} h-9 w-full pl-9 sm:w-52`} />
    </label>
    <button type="submit" className={`${ui.btn} h-9 shrink-0 px-4`}>{t.search}</button>
  </form>;
}
