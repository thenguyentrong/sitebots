import type { IndexEntry, RawRecord, Snapshot, SourceAdapter } from '../../_lib/types';

/**
 * openelab.io, a Shopify reseller. Product JSON at /products/{handle}.json.
 * Their product titles carry the delivery time in brackets — "(Delivery time:
 * two months)" — which is one of only three lead-time signals we have found
 * anywhere, so the title is parsed for it.
 */
const HANDLES = ['unitree-g1-humanoid-robot'];

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, ten: 10, twelve: 12 };

/** "(Delivery time: two months)" → { days: 60, text }. */
export function leadTime(title: string): { days: number; text: string } | null {
  const m = /delivery time:?\s*([a-z0-9]+)\s*(day|week|month)s?/i.exec(title);
  if (!m) return null;
  const n = Number(m[1]) || WORDS[m[1].toLowerCase()];
  if (!n) return null;
  const per = m[2].toLowerCase() === 'day' ? 1 : m[2].toLowerCase() === 'week' ? 7 : 30;
  return { days: n * per, text: m[0] };
}

type Product = {
  title: string;
  vendor: string;
  handle: string;
  variants: { title: string; price: string; available?: boolean; sku?: string | null }[];
  images: { src: string }[];
};

export const openelab: SourceAdapter = {
  id: 'openelab',
  source: { id: 'openelab.io', domain: 'openelab.io', tier: 2, kind: 'distributor', name: 'OpenELAB' },
  engine: 'fetch',

  async fetchIndex() {
    return HANDLES.map((h) => ({ slug: h, url: `https://openelab.io/products/${h}.json` }));
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url, { accept: 'application/json' });
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const p = (JSON.parse(snapshot.body) as { product: Product }).product;
    if (!p) return [];
    const lt = leadTime(p.title);
    const name = p.title.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const pageUrl = `https://openelab.io/products/${p.handle}`;
    return [
      {
        adapter: 'openelab',
        source_id: 'openelab.io',
        source_url: pageUrl,
        observed_at: snapshot.fetchedAt,
        subject: { manufacturer_raw: p.vendor, model_raw: name },
        fields: [],
        prices: p.variants
          .filter((v) => Number(v.price) > 0)
          .map((v) => ({
            amount: Number(v.price),
            currency: 'USD',
            region: 'GLOBAL',
            tier: 2,
            direct: true,
            config: v.title === 'Default Title' ? 'base' : v.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            sku: v.sku ?? undefined,
            note: `OpenELAB listing${lt ? `, ${lt.text}` : ''}`,
          })),
        availability: [
          {
            region: 'GLOBAL',
            status: 'for_sale',
            in_stock: p.variants.some((v) => v.available === true) ? true : undefined,
            lead_time_days_min: lt?.days,
            lead_time_days_max: lt?.days,
            lead_time_text: lt?.text,
          },
        ],
        assets: [],
      },
    ];
  },
};
