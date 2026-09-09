import * as cheerio from 'cheerio';
import { mapSpecLabel } from '../../_lib/specmap';
import type { IndexEntry, RawField, RawRecord, Snapshot, SourceAdapter } from '../../_lib/types';

/**
 * 1x.tech/neo: the fullest humanoid spec sheet any maker publishes, as
 * <article><h5>Section</h5> rows of <p>label</p><p>value</p>. Imperial units
 * (5’6”, 66 lbs) and labels that repeat across sections ("Hands" is a DOF
 * count, a speed and an IP rating), so the section is part of the mapping.
 */
const PAGE = 'https://www.1x.tech/neo';

export const onex: SourceAdapter = {
  id: 'onex',
  source: { id: '1x.tech', domain: '1x.tech', tier: 1, kind: 'manufacturer', name: '1X Technologies' },
  engine: 'fetch',

  async fetchIndex() {
    return [{ slug: 'neo', url: PAGE }];
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const $ = cheerio.load(snapshot.body);
    const fields: RawField[] = [];
    let bodyIp: string | null = null;
    let handIp: string | null = null;

    $('article').each((_, art) => {
      const section = $(art).find('h5').first().text().replace(/\s+/g, ' ').trim();
      if (!section) return;
      $(art)
        .find('div.flex.justify-between')
        .each((__, row) => {
          const ps = $(row).find('p');
          if (ps.length < 2) return;
          const label = $(ps[0]).text().replace(/\s+/g, ' ').trim();
          const value = $(ps[ps.length - 1]).text().replace(/\s+/g, ' ').trim();
          if (/ingress/i.test(section)) {
            if (/^body/i.test(label)) bodyIp = value;
            if (/^hands?/i.test(label)) handIp = value;
            return;
          }
          if (/^speed/i.test(section) && /^hands?/i.test(label)) return; // hand tip speed, not locomotion
          fields.push(...mapSpecLabel(label, value, { formFactor: 'humanoid', section }));
        });
    });

    // The body rating governs where the robot may work; the hands' IP68 is a remark.
    if (bodyIp) {
      const ipFields = mapSpecLabel('Ingress protection', bodyIp, { formFactor: 'humanoid' });
      for (const x of ipFields) fields.push({ ...x, note: `body ${bodyIp}${handIp ? `; hands ${handIp}` : ''}` });
    }

    if (!fields.length) return [];
    return [
      {
        adapter: 'onex',
        source_id: '1x.tech',
        source_url: entry.url,
        observed_at: snapshot.fetchedAt,
        subject: { manufacturer_raw: '1X Technologies', model_raw: '1X NEO', form_factor_hint: 'humanoid' },
        fields,
        prices: [],
        availability: [{ region: 'US', status: 'pre_order', lead_time_text: '$200 deposit; no ship date published' }],
        assets: [],
      },
    ];
  },
};
