import { Badge } from '@/components/ui/badge';
import { recordLang, type Lang } from '@/lib/i18n/config';
import { PANEL_TEXT } from '@/lib/i18n/robot';
import { availabilityLabel, formatDate, formatMoney, priceTierLabel } from '@/lib/spec/display';
import type { AvailabilityCurrent, PriceCurrent } from '@/lib/spec/types';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

const AVAIL_VARIANT: Record<string, 'success' | 'info' | 'neutral' | 'warn'> = {
  for_sale: 'success',
  pre_order: 'info',
  enterprise_only: 'neutral',
  not_sold: 'neutral',
  discontinued: 'warn',
  unknown: 'neutral',
};

/**
 * Prices by region, each with its evidence tier and the date it was seen.
 * A US list price is a fact about the US store, not an EU purchase price —
 * duties, VAT and CE work roughly double it — so it is labelled as such
 * rather than converted.
 */
export function PricePanel({ prices, availability, lang = 'en' }: { prices: PriceCurrent[]; availability: AvailabilityCurrent[]; lang?: Lang }) {
  const t = PANEL_TEXT[lang];
  const region = (code: string) => (code === 'GLOBAL' ? t.global : code);
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold">{t.price}</h2>
        <span className="text-xs text-faint">{prices.length ? t.priceCounts(prices.filter(p => p.tier <= 2 && p.direct).length, prices.filter(p => p.tier > 2 || !p.direct).length) : t.noPrice}</span>
      </header>

      {prices.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted">
          {t.nothingPrice}{availability.some((a) => a.status === 'enterprise_only') ? t.quotation : ''}
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="label text-left">
              <th className="px-5 pt-3 pb-2 font-medium">{t.region}</th>
              <th className="px-2 pt-3 pb-2 font-medium">{t.config}</th>
              <th className="px-2 pt-3 pb-2 text-right font-medium">{t.priceCol}</th>
              <th className="hidden px-5 pt-3 pb-2 font-medium sm:table-cell">{t.evidence}</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => {
              // On a phone the evidence goes under the configuration instead of a fourth column.
              const evidence = (
                <>
                  <span className="block">
                    {priceTierLabel(p.tier, lang) ?? t.tier(p.tier)}
                    {p.direct ? t.direct : ''}
                  </span>
                  <span className="block text-faint">
                    <a href={p.source_url} rel="nofollow noopener" target="_blank" className="underline-offset-2 hover:text-foreground hover:underline">
                      {hostOf(p.source_url)}
                    </a>{' '}
                    · {formatDate(p.observed_at, lang)}
                    {p.stale ? <span className="ml-1 font-medium text-safety">{t.stale}</span> : null}
                  </span>
                </>
              );
              return (
              <tr key={`${p.region}-${p.config}`} className="border-t border-edge/60 align-top">
                <td className="px-5 py-2.5 font-medium">{region(p.region)}</td>
                <td className="px-2 py-2.5 text-muted">
                  {p.config}
                  <div className="mt-1 text-xs sm:hidden">{evidence}</div>
                </td>
                <td className="num px-2 py-2.5 text-right font-semibold">
                  {formatMoney(p.amount, p.currency, lang)}
                  {p.includes_vat === false ? <span className="block text-[11px] font-normal text-faint">{t.exVat}</span> : null}
                </td>
                <td className="hidden px-5 py-2.5 text-xs text-muted sm:table-cell">{evidence}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {availability.length > 0 ? (
        <ul className="space-y-2 border-t border-edge/70 bg-subtle/40 px-5 py-3 text-sm">
          {availability.map((a) => (
            <li key={a.region} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="w-14 text-xs font-medium text-muted">{region(a.region)}</span>
              <Badge variant={a.source_tier != null && a.source_tier <= 2 ? AVAIL_VARIANT[a.status] ?? 'neutral' : 'neutral'} dot>
                {a.source_kind === 'manufacturer' && a.source_tier === 1 ? '' : a.source_kind === 'distributor' && a.source_tier === 2 ? t.sellerLists : t.reported}{availabilityLabel(a.status, lang)}
              </Badge>
              {a.in_stock === true && a.source_tier != null && a.source_tier <= 2 ? <span className="text-xs text-trust-verified">{t.inStock}</span> : null}
              {a.lead_time_days_min != null || a.lead_time_days_max != null ? (
                <span className="num text-xs text-muted">
                  {t.days(String(a.lead_time_days_min ?? '?'), String(a.lead_time_days_max ?? '?'))}
                </span>
              ) : null}
              {a.lead_time_text ? <span className="text-xs text-faint" lang={recordLang(lang)}>{a.lead_time_text}</span> : null}
              <span className="text-xs text-faint">{a.source_kind === 'manufacturer' && a.source_tier === 1 ? t.manufacturer : ''}<a href={a.source_url} rel="nofollow noopener" target="_blank" className="underline underline-offset-2 hover:text-foreground">{hostOf(a.source_url)}</a> · {formatDate(a.observed_at, lang)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
