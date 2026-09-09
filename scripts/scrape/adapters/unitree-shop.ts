import type { RawRecord, Snapshot, SourceAdapter } from '../_lib/types';
import type { EquipmentItem } from '@/lib/spec/parts';

/**
 * shop.unitree.com is a Shopify store, and Shopify exposes the public
 * catalogue as JSON at /products.json. One request, every variant with its
 * price and availability flag, no HTML to parse. This is the only manufacturer
 * price feed we have; everything else is quote-only.
 *
 * Two things the feed does that would poison the data if taken literally:
 *
 * 1. Quote-only products are listed at exactly $100,000 as a placeholder —
 *    H2 Plus, B2, B2-W, A2, B1 and the enterprise arm variants all share that
 *    number, and the H1 title literally says "Contact us for the real price".
 *    Those are recorded as availability `enterprise_only`, never as a price.
 * 2. `grams` is a shipping weight for the parcel, not the robot (G1 shows
 *    50 kg for a 35 kg robot). It is ignored.
 *
 * A Shopify "variant" is sometimes a product variant in our sense (Go2 Air vs
 * Go2 Pro — different robots) and sometimes a colour or a bundle (R1 white vs
 * red, Go2 with or without controller). The variant title minus colour and
 * bundle words becomes `variant_raw`, which entity resolution maps onto our
 * variant key; the bundle becomes the price `config`.
 */

const FEED = 'https://shop.unitree.com/products.json?limit=250';
const PLACEHOLDER_PRICE = 100000;

// Parts, batteries, motors, arms and service fees are not robots. Dropping
// them here keeps .cache/unresolved.jsonl about things worth resolving.
const ACCESSORY = /\b(motor|battery|charger|controller|remote|lidar|servo|fees|arm|module|cable|package)\b|SV1|Z1|IM6014|GO-M8010|L1 PM|L2\b/i;

type ShopifyVariant = {
  id: number;
  title: string;
  sku: string | null;
  price: string;
  available: boolean;
  grams: number;
};

type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  body_html?: string;
  variants: ShopifyVariant[];
  images: { src: string }[];
};

/** The robots an accessory says it fits, read from its title, variants and description. No \b: word edges spelled out. */
const FITS = /(?<![A-Za-z0-9])(Go2|G1|H1|H2|B2|R1|A2|Go1|B1)(?![A-Za-z0-9])/g;

/** What an accessory is. Components (motors, servos) and services are not equipment. */
function accessoryType(title: string): EquipmentItem['type'] | null {
  const t = ` ${title.toLowerCase()} `;
  const has = (...words: string[]) => words.some((w) => t.includes(` ${w} `) || t.includes(` ${w}s `));
  if (has('motor', 'servo', 'fee', 'service', 'cable', 'package') || /im6014|go-m8010/.test(t)) return null;
  if (t.includes('lidar') || t.includes(' l1 pm') || has('l2')) return 'lidar';
  if (t.includes('battery')) return 'battery';
  if (t.includes('charg')) return 'charger';
  if (t.includes('controller') || t.includes('remote')) return 'controller';
  if (has('arm', 'z1', 'd1')) return 'arm';
  if (t.includes('dex') || t.includes('gripper') || t.includes('hand')) return 'hand';
  if (has('case', 'bag')) return 'case';
  if (t.includes('dock')) return 'dock';
  if (has('module', 'camera', 'sensor')) return 'other';
  return null;
}

function spacedText(html: string | undefined): string {
  return (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
}

type Feed = { products: ShopifyProduct[] };

function stripTitle(title: string): { name: string; contactUs: boolean } {
  const contactUs = /contact us/i.test(title);
  const name = title
    .replace(/[（(][^)）]*[)）]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { name, contactUs };
}

/** "Go2 Pro（with controller）" → { variant: "Go2 Pro", config: "controller" }; "R1 EDU (White)" → { variant: "R1 EDU", config: "base" }. */
function splitVariant(title: string): { variant: string; config: string } {
  if (title === 'Default Title') return { variant: '', config: 'base' };
  const bundle = /with controller/i.test(title) ? 'controller' : 'base';
  const variant = title
    .replace(/[（(][^)）]*[)）]/g, ' ')
    .replace(/\b(white|red|black|grey|gray)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { variant, config: bundle };
}

const VARIANT_WORDS = new Set(['pro', 'air', 'edu', 'plus', 'standard', 'basic', 'x', 'w', 'd', 'max', 'ultimate']);

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const unitreeShop: SourceAdapter = {
  id: 'unitree-shop',
  source: { id: 'shop.unitree.com', domain: 'shop.unitree.com', tier: 1, kind: 'manufacturer', name: 'Unitree store' },
  engine: 'fetch',

  async fetchIndex() {
    return [{ slug: 'products', url: FEED }];
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url, { accept: 'application/json' });
  },

  parse(snapshot: Snapshot): RawRecord[] {
    const feed = JSON.parse(snapshot.body) as Feed;
    const observed_at = snapshot.fetchedAt;
    const out: RawRecord[] = [];

    // Accessories are gathered per robot they name and emitted after the loop
    // as one equipment_options record each; nothing is guessed for products
    // that name no robot (a bare "L1 lidar" fits several).
    const equipment = new Map<string, EquipmentItem[]>();

    for (const p of feed.products) {
      if (ACCESSORY.test(p.title)) {
        const type = accessoryType(p.title);
        if (!type) continue;
        const hay = [p.title, ...p.variants.map((v) => v.title), spacedText(p.body_html)].join(' ');
        const fits = new Set([...hay.matchAll(FITS)].map((m) => m[1].replace(/^go/i, 'Go')));
        for (const robot of fits) {
          const list = equipment.get(robot) ?? [];
          if (!list.some((i) => i.name === stripTitle(p.title).name)) {
            list.push({ type, name: stripTitle(p.title).name, maker: 'Unitree', url: `https://shop.unitree.com/products/${p.handle}`, included: false });
          }
          equipment.set(robot, list);
        }
        continue;
      }
      const { name, contactUs } = stripTitle(p.title);
      const productUrl = `https://shop.unitree.com/products/${p.handle}`;
      const byVariant = new Map<string, RawRecord>();

      for (const v of p.variants) {
        const { variant, config } = splitVariant(v.title);
        let rec = byVariant.get(variant);
        if (!rec) {
          rec = {
            adapter: 'unitree-shop',
            source_id: 'shop.unitree.com',
            source_url: productUrl,
            observed_at,
            subject: { manufacturer_raw: p.vendor || 'Unitree', model_raw: name, variant_raw: variant || undefined },
            fields: [],
            prices: [],
            availability: [],
            assets: p.images.slice(0, 1).map((i) => ({
              kind: 'image' as const,
              url: i.src,
              licence: 'unknown',
              attribution: 'Unitree Robotics, product listing',
            })),
          };
          byVariant.set(variant, rec);
        }

        const amount = Number(v.price);
        if (contactUs || amount === PLACEHOLDER_PRICE) {
          if (!rec.availability.some((a) => a.status === 'enterprise_only')) {
            rec.availability.push({
              region: 'US',
              status: 'enterprise_only',
              in_stock: false,
              lead_time_text: 'Quote only — the store lists a placeholder price',
            });
          }
          continue;
        }

        // A variant title that only repeats the product name ("G1" under
        // "Unitree G1") is the base configuration, not a config of its own,
        // and a variant word (Pro, Air, EDU…) is the robot's variant, resolved
        // from variant_raw — only what is left ("A5" in "R1-A5-D") is a config.
        const nameTokens = new Set(slug(name).split('-'));
        const extra = slug(variant)
          .split('-')
          .filter((t) => t && !nameTokens.has(t) && !VARIANT_WORDS.has(t))
          .join('-');
        const configKey = [extra || null, config === 'base' ? null : config].filter(Boolean).join('+') || 'base';

        rec.prices.push({
          amount,
          currency: 'USD',
          region: 'US',
          tier: 1,
          direct: true,
          config: configKey,
          includes_vat: false,
          sku: v.sku || undefined,
          note: v.title === 'Default Title' ? undefined : v.title,
        });
        const status = v.available ? 'for_sale' : 'pre_order';
        if (!rec.availability.some((a) => a.status === status)) {
          rec.availability.push({
            region: 'US',
            status,
            in_stock: v.available,
            lead_time_text: v.available ? undefined : 'Listed, not in stock',
          });
        }
      }
      out.push(...byVariant.values());
    }
    for (const [robot, items] of equipment) {
      out.push({
        adapter: 'unitree-shop',
        source_id: 'shop.unitree.com',
        source_url: 'https://shop.unitree.com/products.json',
        observed_at,
        subject: { manufacturer_raw: 'Unitree', model_raw: robot },
        fields: [{ field: 'equipment_options', value: items as unknown as Record<string, unknown>[], note: 'Accessories in the Unitree store that name this robot.' }],
        prices: [],
        availability: [],
        assets: [],
      });
    }
    return out;
  },
};
