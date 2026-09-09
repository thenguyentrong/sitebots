import type { FormFactor, RobotStatus } from '@/lib/spec/enums';
import type { IndexEntry, RawField, RawRecord, Snapshot, SourceAdapter } from '../_lib/types';

/**
 * humanoid.guide runs on WooCommerce and lists each robot as a product, so
 * the public Store API returns the whole catalogue as JSON with the spec
 * sheet as product attributes. 100 per page, five pages, no HTML.
 *
 * Their catalogue is their product (they sell buyer introductions and
 * reports on top of it), so this is a tier-3 cross-check with visible
 * attribution, never a silent backing store. The feed also mixes in the
 * reports, hands, sensors and gloves they sell, and six language copies of
 * every robot; only English robot entries with a Platform attribute pass.
 */

const BASE = 'https://humanoid.guide/wp-json/wc/store/v1/products';
const PER_PAGE = 100;
const MAX_PAGES = 10;

type Term = { id: number; name: string; slug: string };
type Attribute = { id: number; name: string; taxonomy: string | null; terms: Term[] };
type Product = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  short_description: string;
  categories: { name: string }[];
  attributes: Attribute[];
  prices: { price: string; currency_code: string; currency_minor_unit: number };
  images: { src: string; alt?: string }[];
};

const NOT_A_ROBOT = new Set(['Report', 'Matchmaking', 'Brains', 'Hands', 'Training Hardware']);

const NOT_A_VALUE = /^(n\/?a|na|none|unknown|tb[ad]|-|—|0(\.0)?|not (specified|disclosed|available|stated|published)\b.*)$/i;
// The editors' own guesses are labelled as such; they are not facts about the robot.
const GUESSED = /\b(assumed|estimate[ds]?|likely|probably|approx(imately)?\.? (indoor|industrial))\b/i;

function attr(p: Product, name: string): string | null {
  const a = p.attributes.find((x) => x.name === name);
  if (!a || !a.terms.length) return null;
  const v = a.terms.map((t) => t.name).join(', ').trim();
  return !v || NOT_A_VALUE.test(v) || GUESSED.test(v) ? null : v;
}

/** Value plus the unit the column header promises; the parser drops a unit the value already carries. */
function measured(p: Product, name: string, unit: string): string | null {
  const v = attr(p, name);
  return v ? `${v} ${unit}` : null;
}

function formFactor(platform: string | null): FormFactor | undefined {
  if (!platform) return undefined;
  if (/quadruped|four.?legged|dog/i.test(platform)) return 'quadruped';
  if (/wheel|mobile/i.test(platform)) return 'mobile_manipulator';
  if (/biped|humanoid|legged/i.test(platform)) return 'humanoid';
  return undefined;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#8217;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export const humanoidGuide: SourceAdapter = {
  id: 'humanoid-guide',
  source: { id: 'humanoid.guide', domain: 'humanoid.guide', tier: 3, kind: 'aggregator', name: 'Humanoid Guide' },
  engine: 'fetch',

  async fetchIndex(ctx) {
    // Page until a short page. The pages are re-fetched by fetchRecord, which
    // is free because the disk cache already has them.
    const entries: IndexEntry[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${BASE}?per_page=${PER_PAGE}&page=${page}`;
      const snap = await ctx.fetch(url, { accept: 'application/json' });
      const products = JSON.parse(snap.body) as Product[];
      if (!products.length) break;
      entries.push({ slug: `page-${page}`, url });
      if (products.length < PER_PAGE) break;
    }
    return entries;
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url, { accept: 'application/json' });
  },

  parse(snapshot: Snapshot): RawRecord[] {
    const products = JSON.parse(snapshot.body) as Product[];
    const out: RawRecord[] = [];

    for (const p of products) {
      if (p.categories.some((c) => NOT_A_ROBOT.has(c.name))) continue;
      if (!/humanoid\.guide\/product\//.test(p.permalink)) continue; // language copies live under /de/produkt/ etc.
      const manufacturer = attr(p, 'Manufacturer');
      const platform = attr(p, 'Platform');
      // Hands, gloves, motion-capture rigs and foundation models share the
      // attribute set. A robot has a body: height, a walking speed, or the
      // site's own locomotion score.
      const hasBody =
        attr(p, 'Height [cm]') || attr(p, 'Walking Speed [km/h]') || attr(p, 'Navigation performance') || platform;
      if (!manufacturer || !hasBody) continue;
      if (/\bhand\b|glove|exoskeleton/i.test(p.name) && !attr(p, 'Height [cm]')) continue;

      const fields: RawField[] = [];
      const push = (field: string, value: string | null, extra: Partial<RawField> = {}) => {
        if (value) fields.push({ field, value, ...extra });
      };

      push('height_m', measured(p, 'Height [cm]', 'cm'));
      push('weight_kg', measured(p, 'Weight [kg]', 'kg'));
      push('dof_total', attr(p, 'Degrees of freedom, overall'));
      push('dof_hands', attr(p, 'Degrees of freedom, hands'));
      push('max_speed_ms', measured(p, 'Max speed (km/h)', 'km/h'));
      push('walk_speed_ms', measured(p, 'Walking Speed [km/h]', 'km/h'));
      push('payload_kg', measured(p, 'Strength [kg]', 'kg'), {
        note: 'Listed as "Strength" by humanoid.guide; measurement basis not stated.',
      });
      push('runtime_h', measured(p, 'Runtime pr charge (hours)', 'h'), { qualifier: 'unstated' });
      // Only a stated code. "Estimate IP30–IP40", "assumed indoor (IP20–IP54)"
      // and "indoor use, low IP rating" are the editor's guesses, not facts.
      const ip = attr(p, 'Ingress protection');
      if (ip && /^IP\s?[0-6][0-9]$/i.test(ip.trim())) push('ip_rating', ip.trim());
      push('collaborative', attr(p, 'Safe with humans'));
      push('compute_module', attr(p, 'CPU/GPU'));
      push('connectivity', attr(p, 'Connectivity'));
      push('structural_material', attr(p, 'Main structural material'));
      const fingers = attr(p, 'Number of fingers');
      const fingerNum = fingers && /(\d+)/.exec(fingers)?.[1];
      if (fingerNum) fields.push({ field: 'finger_count', value: Number(fingerNum), note: fingers.trim() === fingerNum ? undefined : fingers });
      push('availability_note', attr(p, 'Availability'));

      const website = attr(p, 'Website');
      const availability = attr(p, 'Availability');
      const status: RobotStatus | undefined = !availability
        ? undefined
        : /pre-?order/i.test(availability)
          ? 'pre_order'
          : /production|commercial|business-ready|deployment/i.test(availability) && !/prototype/i.test(availability)
            ? 'shipping'
            : /prototype|pilot|concept/i.test(availability)
              ? 'prototype'
              : undefined;
      const price = Number(p.prices?.price);
      const minor = p.prices?.currency_minor_unit ?? 0;
      let amount = Number.isFinite(price) && price > 0 ? price / 10 ** minor : null;
      // 22 of 240 robots carry exactly $100,000: the catalogue's "unknown" value,
      // and the same number the Unitree store uses as its quote-only marker.
      if (amount === 100000) amount = null;

      out.push({
        adapter: 'humanoid-guide',
        source_id: 'humanoid.guide',
        source_url: p.permalink,
        observed_at: snapshot.fetchedAt,
        subject: {
          manufacturer_raw: manufacturer ?? '',
          model_raw: p.name,
          form_factor_hint: formFactor(platform),
          status_hint: status,
          website_hint: website ?? undefined,
          country_hint: attr(p, 'Nationality') ?? undefined,
          summary_hint: stripHtml(p.short_description ?? '').slice(0, 300) || undefined,
        },
        fields,
        prices:
          amount !== null
            ? [
                {
                  amount,
                  currency: p.prices.currency_code || 'USD',
                  region: 'GLOBAL',
                  tier: 3,
                  direct: false,
                  config: 'base',
                  note: 'Estimate listed by humanoid.guide; not read on a store. Round figures are editorial.',
                },
              ]
            : [],
        availability: [],
        assets: p.images.slice(0, 1).map((i) => ({
          kind: 'image' as const,
          url: i.src,
          licence: 'unknown',
          attribution: 'via humanoid.guide',
          alt: i.alt,
        })),
      });
    }
    return out;
  },
};
