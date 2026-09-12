import * as cheerio from 'cheerio';
import type { RawField, SourceAdapter } from '../../_lib/types';

const URL = 'https://store.westwoodrobotics.io/product/bruce-humanoid-open-platform-16-dof-kid-size-biped-robot/';

export function bruceFields(body: string): RawField[] {
  const $ = cheerio.load(body);
  if (!/BRUCE/i.test($('h1').text())) return [];
  const text = $('.woocommerce-product-details__short-description, #tab-description').text().replace(/\s+/g, ' ');
  const fields: RawField[] = [];
  for (const [field, pattern, unit] of [
    ['height_m', /Height:\s*(\d+(?:\.\d+)?)\s*cm/i, 'cm'],
    ['weight_kg', /Weight:\s*(\d+(?:\.\d+)?)\s*kg/i, 'kg'],
    ['dof_total', /Total DoF:\s*(\d+)/i, undefined],
  ] as const) {
    const match = text.match(pattern);
    if (match) fields.push({ field, value: Number(match[1]), unit, note: 'BRUCE Humanoid Open-Platform; manufacturer store specification.' });
  }
  return fields;
}

export const westwood: SourceAdapter = {
  id: 'westwood',
  source: { id: 'westwoodrobotics.io', domain: 'westwoodrobotics.io', tier: 1, kind: 'manufacturer', name: 'Westwood Robotics' },
  engine: 'fetch',
  async fetchIndex() { return [{ slug: 'bruce', url: URL }]; },
  async fetchRecord(entry, ctx) { return ctx.fetch(entry.url); },
  parse(snapshot, entry) {
    const fields = bruceFields(snapshot.body);
    if (!fields.length) return [];
    return [{ adapter: 'westwood', source_id: 'westwoodrobotics.io', source_url: entry.url, observed_at: snapshot.fetchedAt,
      subject: { manufacturer_raw: 'Westwood Robotics', model_raw: 'BRUCE', form_factor_hint: 'humanoid' },
      fields, prices: [], availability: [], assets: [] }];
  },
};
