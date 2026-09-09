import * as cheerio from 'cheerio';
import type { AvailabilityStatus, FormFactor } from '@/lib/spec/enums';
import type { RawField, RawPrice, RawRecord, Snapshot, SourceAdapter } from '../_lib/types';

/**
 * robotpriceindex.com is one static page with a table per robot type:
 * Model | Maker (Country) | Price (USD) | Status | Height | Weight | DoF or Payload.
 * The humanoid and quadruped tables are read; arms, toys, service robots and
 * exoskeletons are out of scope.
 *
 * Prices are ranges more often than not ("$4,150–$5,900"), and the site is
 * explicit that they are compiled, not read on a store — so they land as
 * tier-3 observations, the low end as config `base` and the high end as
 * config `max`, each carrying the full range in its note. The status column
 * is the most useful thing here: it is the only aggregator that separates
 * "for sale" from "enterprise only" from "not sold yet".
 */

const PAGE = 'https://robotpriceindex.com/';

const STATUS: Record<string, AvailabilityStatus> = {
  'for sale': 'for_sale',
  'pre-order': 'pre_order',
  preorder: 'pre_order',
  'enterprise only': 'enterprise_only',
  'not sold yet': 'not_sold',
  'not sold': 'not_sold',
  discontinued: 'discontinued',
};

function money(cell: string): { min: number | null; max: number | null } {
  const nums = [...cell.matchAll(/\$\s?([\d,]+(?:\.\d+)?)/g)].map((m) => Number(m[1].replace(/,/g, '')));
  if (!nums.length) return { min: null, max: null };
  return { min: Math.min(...nums), max: nums.length > 1 ? Math.max(...nums) : null };
}

/** Each table sits in a <section id="humanoids"|"quadrupeds"|"industrial"|…>; the id is the type. */
function tableKind(headers: string[], sectionId: string | undefined): FormFactor | null {
  if (headers[0] !== 'Model' || headers[1] !== 'Maker') return null;
  if (sectionId === 'humanoids') return 'humanoid';
  if (sectionId === 'quadrupeds') return 'quadruped';
  return null;
}

export const robotPriceIndex: SourceAdapter = {
  id: 'robotpriceindex',
  source: { id: 'robotpriceindex.com', domain: 'robotpriceindex.com', tier: 3, kind: 'aggregator', name: 'Robot Price Index' },
  engine: 'fetch',

  async fetchIndex() {
    return [{ slug: 'index', url: PAGE }];
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot): RawRecord[] {
    const $ = cheerio.load(snapshot.body);
    const out: RawRecord[] = [];

    $('table').each((_, table) => {
      const rows = $(table).find('tr').toArray();
      if (rows.length < 2) return;
      const headers = $(rows[0])
        .find('th,td')
        .map((__, c) => $(c).text().trim())
        .get();
      const kind = tableKind(headers, $(table).closest('section').attr('id'));
      if (!kind) return;

      for (const row of rows.slice(1)) {
        const cells = $(row)
          .find('td')
          .map((__, c) => $(c).text().trim())
          .get();
        if (cells.length < 7) continue;
        const [model, makerRaw, priceCell, statusCell, height, weight, last] = cells;
        const href = $(row).find('a').first().attr('href');
        const evidence = href ? new URL(href, PAGE).toString() : undefined;
        const country = /\(([^)]+)\)\s*$/.exec(makerRaw)?.[1];
        const maker = makerRaw.replace(/\s*\([^)]*\)\s*$/, '').trim();

        const fields: RawField[] = [];
        const push = (field: string, value: string, extra: Partial<RawField> = {}) => {
          if (value && value !== '—' && value !== '-') fields.push({ field, value, evidence_url: evidence, ...extra });
        };
        push('height_m', height);
        push('weight_kg', weight);
        if (kind === 'humanoid') push('dof_total', last);
        else push('payload_kg', last, { qualifier: 'sustained' });

        const { min, max } = money(priceCell);
        const prices: RawPrice[] = [];
        if (min !== null) {
          prices.push({
            amount: min,
            currency: 'USD',
            region: 'GLOBAL',
            tier: 3,
            direct: false,
            config: 'base',
            evidence_url: evidence,
            note: max !== null ? `Low end of the published range ${priceCell} (Robot Price Index).` : `Listed as ${priceCell} by Robot Price Index.`,
          });
          if (max !== null) {
            prices.push({
              amount: max,
              currency: 'USD',
              region: 'GLOBAL',
              tier: 3,
              direct: false,
              config: 'max',
              evidence_url: evidence,
              note: `High end of the published range ${priceCell} (Robot Price Index).`,
            });
          }
        }

        const st = STATUS[statusCell.toLowerCase()];

        out.push({
          adapter: 'robotpriceindex',
          source_id: 'robotpriceindex.com',
          source_url: evidence ?? PAGE,
          observed_at: snapshot.fetchedAt,
          subject: { manufacturer_raw: maker, model_raw: model, form_factor_hint: kind, country_hint: country },
          fields,
          prices,
          availability: st ? [{ region: 'GLOBAL', status: st, lead_time_text: statusCell }] : [],
          assets: [],
        });
      }
    });
    return out;
  },
};
