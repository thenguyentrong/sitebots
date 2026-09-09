import * as cheerio from 'cheerio';
import type { IndexEntry, RawPrice, RawRecord, Snapshot, SourceAdapter } from '../../_lib/types';

/**
 * quadruped.de, a German Unitree distributor on a JTL shop. The product page
 * prints the net price ("23.000,00 € excl. 19% VAT") and a Version select
 * whose options carry surcharges ("EDU-U1 + 8.500,00 €"). That is the only
 * place we have found a EUR price for a humanoid that a German buyer could
 * actually pay, so every version becomes a price row.
 *
 * Fixed URL list: the shop has no sitemap and we do not crawl menus.
 */
const PAGES = [{ url: 'https://www.quadruped.de/Unitree-G1_1', model: 'Unitree G1' }];

/** "23.000,00" → 23000; "6.399,00" → 6399 (German thousands and decimal marks). */
export function euro(text: string): number | null {
  const m = /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*€/.exec(text);
  if (!m) return null;
  const n = Number(m[1].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export const quadrupedDe: SourceAdapter = {
  id: 'quadruped-de',
  source: { id: 'quadruped.de', domain: 'quadruped.de', tier: 2, kind: 'distributor', name: 'QUADRUPED Robotics' },
  engine: 'fetch',

  async fetchIndex() {
    return PAGES.map((p) => ({ slug: p.url.split('/').pop()!, url: p.url }));
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const page = PAGES.find((p) => p.url === entry.url);
    const $ = cheerio.load(snapshot.body);
    const model = $('h1').first().text().replace(/\s+/g, ' ').trim() || page?.model;
    if (!model) return [];
    const priceText = $('.price_wrapper').first().text().replace(/\s+/g, ' ');
    const base = euro(priceText);
    if (base === null) return [];
    const includesVat = !/excl\.?\s*\d+%\s*(VAT|MwSt)/i.test(priceText);

    // Options: base price applies to the first; others add their surcharge.
    type Opt = { name: string; amount: number };
    const options: Opt[] = $('select[name^="eigenschaftwert"] option')
      .map((_, o) => {
        const name = ($(o).attr('data-original') ?? $(o).text()).replace(/\s+/g, ' ').trim();
        const badge = $(o).attr('data-content') ?? '';
        const add = /\+\s*([\d.,]+)\s*(?:&euro;|€)/.exec(badge.replace(/&amp;/g, '&'));
        const surcharge = add ? euro(add[1] + ' €') ?? 0 : 0;
        return { name, amount: base + surcharge };
      })
      .get()
      .filter((o) => o.name);
    if (!options.length) options.push({ name: 'base', amount: base });

    // EDU options describe the EDU variant; everything else is the base robot.
    const groups = new Map<string, { variant?: string; prices: RawPrice[] }>();
    for (const o of options) {
      const variant = /\bEDU\b/i.test(o.name) ? 'EDU' : undefined;
      const key = variant ?? 'base';
      const g = groups.get(key) ?? { variant, prices: [] };
      g.prices.push({
        amount: o.amount,
        currency: 'EUR',
        region: 'DE',
        tier: 2,
        direct: true,
        config: o.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'base',
        includes_vat: includesVat,
        note: `${o.name} at quadruped.de${includesVat ? '' : ', excl. VAT'}`,
      });
      groups.set(key, g);
    }

    return [...groups.values()].map((g) => ({
      adapter: 'quadruped-de',
      source_id: 'quadruped.de',
      source_url: entry.url,
      observed_at: snapshot.fetchedAt,
      subject: { manufacturer_raw: 'Unitree', model_raw: model, variant_raw: g.variant },
      fields: [],
      prices: g.prices,
      availability: [{ region: 'DE', status: 'for_sale', lead_time_text: 'Listed by a German distributor; lead time not shown' }],
      assets: [],
    }));
  },
};
