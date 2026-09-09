import * as cheerio from 'cheerio';
import { mapSpecLabel } from '../../_lib/specmap';
import type { IndexEntry, RawRecord, Snapshot, SourceAdapter } from '../../_lib/types';

/** pal-robotics.com/robot/talos/: an honest HTML table, th label / td value. */
const PAGES = [{ url: 'https://pal-robotics.com/robot/talos/', model: 'TALOS', formFactor: 'humanoid' as const }];

export const pal: SourceAdapter = {
  id: 'pal',
  source: { id: 'pal-robotics.com', domain: 'pal-robotics.com', tier: 1, kind: 'manufacturer', name: 'PAL Robotics' },
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
    const fields = $('table tr')
      .map((_, tr) => {
        const label = $(tr).find('th').first().text().replace(/\s+/g, ' ').trim();
        const value = $(tr).find('td').first().text().replace(/\s+/g, ' ').trim();
        return label ? mapSpecLabel(label, value, { formFactor: page.formFactor }) : [];
      })
      .get()
      .flat();
    if (!fields.length) return [];
    return [
      {
        adapter: 'pal',
        source_id: 'pal-robotics.com',
        source_url: entry.url,
        observed_at: snapshot.fetchedAt,
        subject: { manufacturer_raw: 'PAL Robotics', model_raw: page.model, form_factor_hint: page.formFactor },
        fields,
        prices: [],
        availability: [{ region: 'EU', status: 'enterprise_only', lead_time_text: 'Quote only' }],
        assets: [],
      },
    ];
  },
};
