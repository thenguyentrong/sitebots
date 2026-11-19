import Link from '@/components/LocaleLink';
import { germanyStatusLabel } from '@/lib/market/cards';
import { MAX_PRICES, MIN_PAYLOADS, isFiltered, type Filters } from '@/lib/market/filters';
import { localePath, type Lang } from '@/lib/i18n/config';
import { formatEur, formatNumber } from '@/lib/i18n/format';
import { LISTING_TEXT } from '@/lib/i18n/listing';
import { ui } from '@/lib/ui';

// A plain GET form like the search next to it: works without script, and the result is a link. Its
// action carries the page's language, so a German visitor stays on /de/robots.

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0">
    <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
    {children}
  </label>;
}

export function MarketFilters({ filters, keep, lang }: { filters: Filters; keep: Record<string, string | undefined>; lang: Lang }) {
  const t = LISTING_TEXT[lang];
  const clear = '/robots' + (keep.type ? '?type=' + keep.type : '');
  return <form action={localePath('/robots', lang)} method="get" className="card mt-3 p-4" aria-label={t.filterLabel}>
    {Object.entries(keep).map(([name, value]) => value ? <input key={name} type="hidden" name={name} value={value} /> : null)}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Field label={t.maxPrice}>
        <select name="max" className={ui.select} defaultValue={filters.maxPrice ?? ''}>
          <option value="">{t.anyPrice}</option>
          {MAX_PRICES.map((amount) => <option key={amount} value={amount}>{formatEur(amount, lang)}</option>)}
        </select>
      </Field>
      <Field label={t.availability}>
        <select name="status" className={ui.select} defaultValue={filters.status ?? ''}>
          <option value="">{t.any}</option>
          {(['buy_now', 'quote', 'preorder'] as const).map((status) => <option key={status} value={status}>{germanyStatusLabel(status, lang)}</option>)}
        </select>
      </Field>
      <Field label={t.sellerIn}>
        <select name="seller" className={ui.select} defaultValue={filters.seller ?? ''}>
          <option value="">{t.anywhere}</option>
          <option value="de">{t.sellerDe}</option>
          <option value="eu">{t.sellerEu}</option>
        </select>
      </Field>
      <Field label={t.payload}>
        <select name="payload" className={ui.select} defaultValue={filters.minPayload ?? ''}>
          <option value="">{t.any}</option>
          {MIN_PAYLOADS.map((kg) => <option key={kg} value={kg}>{t.payloadAtLeast(formatNumber(kg, lang))}</option>)}
        </select>
      </Field>
      <Field label={t.sort}>
        <select name="sort" className={ui.select} defaultValue={filters.sort ?? ''}>
          <option value="">{t.sortProof}</option>
          <option value="price_asc">{t.sortAsc}</option>
          <option value="price_desc">{t.sortDesc}</option>
        </select>
      </Field>
      <div className="flex min-w-0 flex-col justify-end">
        <label className="flex h-10 items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="hands" value="1" defaultChecked={filters.hands} className="h-4 w-4 accent-foreground" />
          {t.hands}
        </label>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="submit" className={ui.btn}>{t.showRobots}</button>
      {isFiltered(filters) ? <Link href={clear} className={ui.btnGhost}>{t.clearFilters}</Link> : null}
      <p className="text-xs text-muted">{t.filterNote}</p>
    </div>
  </form>;
}
