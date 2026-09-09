import * as cheerio from 'cheerio';
import type { IndexEntry, RawRecord, Snapshot, SourceAdapter } from '../../_lib/types';

/**
 * generationrobots.com, the French distributor for Unitree, Booster and
 * others, on PrestaShop. The product page prints "From €27,000.00 VAT incl.
 * €22,500.00 VAT excl."; the per-version prices and the stock label are
 * filled in by JavaScript and are not in the HTML we fetch, so only the base
 * net price is recorded and availability is left unknown.
 *
 * PrestaShop's robots.txt disallows the search controller, so discovery is a
 * fixed list of product URLs, maintained by hand.
 */
const PAGES = [
  'https://www.generationrobots.com/en/404241-g1-humanoid-robot-2105.html',
  'https://www.generationrobots.com/en/404449-unitree-robotics-h2-humanoid-robot-2161.html',
  'https://www.generationrobots.com/en/404470-unitree-h2-plus-humanoid-robot-2217.html',
  'https://www.generationrobots.com/en/404414-unitree-r1-humanoid-robot-2119.html',
  'https://www.generationrobots.com/en/404154-h1-humanoid-robot-2116.html',
  'https://www.generationrobots.com/en/404129-unitree-go2-pro-quadruped-robot.html',
  'https://www.generationrobots.com/en/404402-unitree-go2x-quadruped-roboter.html',
  'https://www.generationrobots.com/en/404127-go2-quadruped-robot-edu-plus-2076.html',
  'https://www.generationrobots.com/en/404401-go2-w-wheeled-quadruped-robot-2097.html',
  'https://www.generationrobots.com/en/404198-b2-quadruped-robot-dog-2080.html',
  'https://www.generationrobots.com/en/404199-b2-wheeled-quadruped-robot-2082.html',
  'https://www.generationrobots.com/en/404403-unitree-a2-quadruped-robot-2093.html',
  'https://www.generationrobots.com/en/404479-unitree-g-d-humanoid-robot-2285.html',
];

/** "€22,500.00" → 22500. */
export function euroEn(text: string): number | null {
  const m = /€\s*([\d,]+(?:\.\d{2})?)/.exec(text);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export const generationRobots: SourceAdapter = {
  id: 'generation-robots',
  source: { id: 'generationrobots.com', domain: 'generationrobots.com', tier: 2, kind: 'distributor', name: 'Génération Robots' },
  engine: 'fetch',

  async fetchIndex() {
    return PAGES.map((url) => ({ slug: url.split('/').pop()!.replace(/\.html$/, ''), url }));
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const $ = cheerio.load(snapshot.body);
    const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
    if (!h1) return [];
    const priceText = $('.product-price').first().text().replace(/\s+/g, ' ');
    const excl = /€\s*[\d,]+(?:\.\d{2})?\s*VAT excl/i.exec(priceText)?.[0];
    const amount = excl ? euroEn(excl) : euroEn(priceText);
    const includesVat = !excl;
    const fromPrice = /from/i.test(priceText);
    const versions = $('.product-variants select option, select[name*="group"] option')
      .map((_, o) => $(o).text().replace(/\s+/g, ' ').trim())
      .get()
      .filter((t) => t && !/please select/i.test(t));

    // "Unitree G1 humanoid robot" → the resolver only needs the maker and model words.
    const model = h1.replace(/\b(humanoid|quadruped|wheeled|robot|dog|with wheels)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    const manufacturer = /unitree/i.test(h1) ? 'Unitree' : /booster/i.test(h1) ? 'Booster Robotics' : '';

    return [
      {
        adapter: 'generation-robots',
        source_id: 'generationrobots.com',
        source_url: entry.url,
        observed_at: snapshot.fetchedAt,
        subject: { manufacturer_raw: manufacturer, model_raw: model },
        fields: [],
        prices:
          amount !== null
            ? [
                {
                  amount,
                  currency: 'EUR',
                  region: 'EU',
                  tier: 2,
                  direct: true,
                  config: 'base',
                  includes_vat: includesVat,
                  note: `${fromPrice ? 'Starting price' : 'Price'} at Génération Robots${versions.length ? `; versions: ${versions.slice(0, 6).join(', ')}${versions.length > 6 ? ', …' : ''}` : ''}`,
                },
              ]
            : [],
        availability: [],
        assets: [],
      },
    ];
  },
};
