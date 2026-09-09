import * as cheerio from 'cheerio';
import type { FormFactor } from '@/lib/spec/enums';
import type { IndexEntry, RawField, RawRecord, Snapshot, SourceAdapter } from '../_lib/types';

/**
 * humanoidhub.ai: Next.js, and only the detail pages are server-rendered —
 * the /explore listing is an empty shell, so URLs come from the sitemap.
 * Each page carries a schema.org Product block (name, brand, image) and a
 * "Quick Facts" definition list where every value says which source it was
 * checked against and when. Values that read "Not specified …" are exactly
 * that and are skipped, which is the honest behaviour we want from a source.
 *
 * Tier 3, trust medium: their blog links to one of the AI-content farms on
 * the denylist. Only the catalogue facts are read, never the prose.
 */

const SITEMAP = 'https://www.humanoidhub.ai/sitemap.xml';
const ROBOT_URL = /^https:\/\/www\.humanoidhub\.ai\/robots\/([a-z0-9-]+)$/;
const UNKNOWN = /not (specified|publicly|disclosed|verified|available)|request quote|contact/i;

type Product = {
  '@type': 'Product';
  name: string;
  model?: string;
  description?: string;
  category?: string;
  brand?: { name?: string };
  image?: { contentUrl?: string; url?: string; caption?: string }[] | string;
  url?: string;
};

function formFactor(category: string | undefined): FormFactor | undefined {
  if (!category) return undefined;
  if (/quadruped|dog/i.test(category)) return 'quadruped';
  if (/wheel/i.test(category)) return 'mobile_manipulator';
  if (/humanoid/i.test(category)) return 'humanoid';
  return undefined;
}

export const humanoidHub: SourceAdapter = {
  id: 'humanoidhub',
  source: { id: 'humanoidhub.ai', domain: 'humanoidhub.ai', tier: 3, kind: 'aggregator', name: 'HumanoidHub' },
  engine: 'fetch',

  async fetchIndex(ctx) {
    const snap = await ctx.fetch(SITEMAP, { accept: 'application/xml,text/xml' });
    const urls = [...snap.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    const entries: IndexEntry[] = [];
    for (const url of urls) {
      const m = ROBOT_URL.exec(url);
      if (m) entries.push({ slug: m[1], url });
    }
    return entries;
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const $ = cheerio.load(snapshot.body);
    let product: Product | null = null;
    $('script[type="application/ld+json"]').each((_, s) => {
      try {
        const json = JSON.parse($(s).html() ?? '') as Product;
        if (json['@type'] === 'Product' && !product) product = json;
      } catch {
        // skip malformed block
      }
    });
    if (!product) return [];
    const p = product as Product;

    // Quick Facts: <dt>Label</dt><dd>Value Source checked Jul 6, 2026</dd>
    const facts = new Map<string, string>();
    $('dt').each((_, dt) => {
      const label = $(dt).text().trim();
      const value = $(dt)
        .next('dd')
        .text()
        .replace(/\s+/g, ' ')
        .replace(/Source checked.*$/i, '')
        .trim();
      if (label && value) facts.set(label, value);
    });
    const fact = (label: string): string | null => {
      const v = facts.get(label);
      return v && !UNKNOWN.test(v) ? v : null;
    };

    const fields: RawField[] = [];
    const push = (field: string, value: string | null, extra: Partial<RawField> = {}) => {
      if (value) fields.push({ field, value, ...extra });
    };
    push('height_m', fact('Height'));
    push('weight_kg', fact('Weight'));
    push('runtime_h', fact('Runtime')?.replace(/^up to\s*/i, '') ?? null, { qualifier: 'unstated' });
    push('availability_note', facts.get('Availability') ?? null);

    const images = Array.isArray(p.image) ? p.image : [];
    const img = images[0];
    // The maker's own site, linked as "Website" on every HumanoidHub page — the only place many small makers' sites are named.
    const website = $('a[href^="http"]')
      .filter((_, el) => /^website$/i.test($(el).text().trim()))
      .first()
      .attr('href');

    return [
      {
        adapter: 'humanoidhub',
        source_id: 'humanoidhub.ai',
        source_url: entry.url,
        observed_at: snapshot.fetchedAt,
        subject: {
          manufacturer_raw: p.brand?.name ?? facts.get('Manufacturer') ?? '',
          website_hint: website && !/humanoidhub/i.test(website) ? website : undefined,
          model_raw: p.model ?? p.name,
          form_factor_hint: formFactor(p.category ?? facts.get('Category')),
          summary_hint: p.description?.slice(0, 300) || undefined,
        },
        fields,
        prices: [],
        availability: [],
        assets: img?.contentUrl || img?.url
          ? [{ kind: 'image', url: (img.contentUrl ?? img.url) as string, licence: 'unknown', attribution: img.caption ?? 'via HumanoidHub' }]
          : [],
      },
    ];
  },
};
