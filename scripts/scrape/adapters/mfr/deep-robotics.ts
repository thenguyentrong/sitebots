import * as cheerio from 'cheerio';
import { mapSpecLabel } from '../../_lib/specmap';
import type { IndexEntry, RawRecord, Snapshot, SourceAdapter } from '../../_lib/types';

/**
 * deeprobotics.cn X30 page: a `.pms` block per model (#pro_1 = X30, #pro_2 =
 * X30 Pro), each a run of `.c1` label / `.c2` value cells under `.t` group
 * titles. Temperatures are written "-20°~55°" without the C; the mapper adds it.
 */
const PAGE = 'https://www.deeprobotics.cn/en/index/product3.html';
const MODELS: Record<string, string> = { pro_1: 'X30', pro_2: 'X30 Pro' };

export const deepRobotics: SourceAdapter = {
  id: 'deep-robotics',
  source: { id: 'deeprobotics.cn', domain: 'deeprobotics.cn', tier: 1, kind: 'manufacturer', name: 'Deep Robotics' },
  engine: 'fetch',

  async fetchIndex() {
    return [{ slug: 'x30', url: PAGE }];
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const $ = cheerio.load(snapshot.body);
    const out: RawRecord[] = [];
    $('.pms').each((_, block) => {
      const id = $(block).attr('id') ?? '';
      const model = MODELS[id];
      if (!model) return;
      const fields = $(block)
        .find('.c1')
        .map((__, c1) => {
          const label = $(c1).text().replace(/\s+/g, ' ').trim();
          const value = $(c1).next('.c2').text().replace(/\s+/g, ' ').trim();
          return mapSpecLabel(label, value, { formFactor: 'quadruped' });
        })
        .get()
        .flat();
      if (!fields.length) return;
      out.push({
        adapter: 'deep-robotics',
        source_id: 'deeprobotics.cn',
        source_url: entry.url,
        observed_at: snapshot.fetchedAt,
        subject: { manufacturer_raw: 'Deep Robotics', model_raw: model, form_factor_hint: 'quadruped' },
        fields,
        prices: [],
        availability: [],
        assets: [],
      });
    });
    return out;
  },
};
