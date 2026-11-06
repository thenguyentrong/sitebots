import Link from 'next/link';
import { STATUS_LABELS } from '@/lib/market/cards';
import { MAX_PRICES, MIN_PAYLOADS, isFiltered, type Filters } from '@/lib/market/filters';
import { ui } from '@/lib/ui';

// A plain GET form like the search next to it: works without script, and the result is a link.

const euro = (amount: number) => '€' + amount.toLocaleString('en-GB');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0">
    <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
    {children}
  </label>;
}

export function MarketFilters({ filters, keep }: { filters: Filters; keep: Record<string, string | undefined> }) {
  const clear = '/robots' + (keep.type ? '?type=' + keep.type : '');
  return <form action="/robots" method="get" className="card mt-3 p-4" aria-label="Filter robots">
    {Object.entries(keep).map(([name, value]) => value ? <input key={name} type="hidden" name={name} value={value} /> : null)}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Field label="Price up to (incl. VAT)">
        <select name="max" className={ui.select} defaultValue={filters.maxPrice ?? ''}>
          <option value="">Any price</option>
          {MAX_PRICES.map((amount) => <option key={amount} value={amount}>{euro(amount)}</option>)}
        </select>
      </Field>
      <Field label="Availability">
        <select name="status" className={ui.select} defaultValue={filters.status ?? ''}>
          <option value="">Any</option>
          {(['buy_now', 'quote', 'preorder'] as const).map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
        </select>
      </Field>
      <Field label="Seller based in">
        <select name="seller" className={ui.select} defaultValue={filters.seller ?? ''}>
          <option value="">Anywhere</option>
          <option value="de">Germany</option>
          <option value="eu">The EU</option>
        </select>
      </Field>
      <Field label="Payload per arm">
        <select name="payload" className={ui.select} defaultValue={filters.minPayload ?? ''}>
          <option value="">Any</option>
          {MIN_PAYLOADS.map((kg) => <option key={kg} value={kg}>{kg} kg or more</option>)}
        </select>
      </Field>
      <Field label="Sort">
        <select name="sort" className={ui.select} defaultValue={filters.sort ?? ''}>
          <option value="">Best proof first</option>
          <option value="price_asc">Price, low to high</option>
          <option value="price_desc">Price, high to low</option>
        </select>
      </Field>
      <div className="flex min-w-0 flex-col justify-end">
        <label className="flex h-10 items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="hands" value="1" defaultChecked={filters.hands} className="h-4 w-4 accent-foreground" />
          Hands included
        </label>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="submit" className={ui.btn}>Show robots</button>
      {isFiltered(filters) ? <Link href={clear} className={ui.btnGhost}>Clear filters</Link> : null}
      <p className="text-xs text-muted">Net prices are compared with 19% VAT added. Robots without a published price or payload drop out when you set one.</p>
    </div>
  </form>;
}
