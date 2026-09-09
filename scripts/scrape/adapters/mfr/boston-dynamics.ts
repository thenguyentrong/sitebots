import * as cheerio from 'cheerio';
import { mapSpecLabel } from '../../_lib/specmap';
import type { IndexEntry, RawRecord, Snapshot, SourceAdapter } from '../../_lib/types';

/**
 * bostondynamics.com/products/spot/: the spec sheet is a Beaver Builder list,
 * one `.fl-list-item-wrapper` per line with a heading (label) and a content
 * block (value). The PDF datasheet linked from the page says the same things;
 * the HTML is enough.
 */
const PAGES = [{ url: 'https://bostondynamics.com/products/spot/', model: 'Spot', formFactor: 'quadruped' as const }];

export const bostonDynamics: SourceAdapter = {
  id: 'boston-dynamics',
  source: { id: 'bostondynamics.com', domain: 'bostondynamics.com', tier: 1, kind: 'manufacturer', name: 'Boston Dynamics' },
  engine: 'fetch',

  async fetchIndex() {
    return PAGES.map((p) => ({ slug: p.model.toLowerCase(), url: p.url }));
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const page = PAGES.find((p) => p.url === entry.url) ?? PAGES[0];
    const $ = cheerio.load(snapshot.body);
    // The page lists the robot first, then its arm and the payload rail (each
    // with its own Length/Width/Weight), and repeats everything for a second
    // layout. The robot's section ends where a label first repeats; from the
    // accessory sections only "Max Weight" — the payload rail's capacity, i.e.
    // what Spot carries — is taken.
    const pairs = $('.fl-list-item-wrapper')
      .map((_, w) => ({
        label: $(w).find('.fl-list-item-heading-text').text().replace(/\s+/g, ' ').trim(),
        value: $(w).find('.fl-list-item-content-text').text().replace(/\s+/g, ' ').trim(),
      }))
      .get();
    const seen = new Set<string>();
    const fields = [];
    let inRobot = true;
    let payloadTaken = false;
    for (const { label, value } of pairs) {
      if (inRobot && seen.has(label)) inRobot = false;
      seen.add(label);
      if (inRobot) {
        fields.push(...mapSpecLabel(label, value, { formFactor: page.formFactor }));
      } else if (!payloadTaken && /^max weight$/i.test(label)) {
        fields.push(...mapSpecLabel('Max payload', value, { formFactor: page.formFactor }));
        payloadTaken = true;
      }
    }
    if (!fields.length) return [];
    return [
      {
        adapter: 'boston-dynamics',
        source_id: 'bostondynamics.com',
        source_url: entry.url,
        observed_at: snapshot.fetchedAt,
        subject: { manufacturer_raw: 'Boston Dynamics', model_raw: page.model, form_factor_hint: page.formFactor },
        fields,
        prices: [],
        availability: [{ region: 'GLOBAL', status: 'enterprise_only', lead_time_text: 'Quote only' }],
        assets: [],
      },
    ];
  },
};
