import * as cheerio from 'cheerio';
import type { FormFactor } from '@/lib/spec/enums';
import { mapSpecLabel, spacedText } from '../../_lib/specmap';
import type { IndexEntry, RawField, RawPrice, RawRecord, Snapshot, SourceAdapter } from '../../_lib/types';

/**
 * unitree.com product pages. Nuxt renders the parameter tables as lists, in
 * three shapes depending on the page's age:
 *
 *   G1:  <li><div class="valPart">label</div><div class="valPart">G1</div><div class="valPart">G1 EDU</div></li>
 *        with a first row "Model | G1 | G1 EDU" naming the columns
 *   Go2: <ul class="versions"> AIR PRO X EDU </ul> then <ul class="params"><li><p class="name">…</p><div class="values">…</div>×4
 *   B2 / H1: <ul class="parameter"><li><div class="name">…</div><div class="value">…</div>   (one column)
 *            or <div class="versions"><div class="version">…</div>×2               (H1 | H1-2, named in `columns`)
 *
 * Columns become variants (G1 EDU, Go2 Pro) or sibling models (H1-2); the
 * resolver decides which from data/aliases.yaml. The H2 has no page yet.
 */

type Page = { url: string; model: string; formFactor: FormFactor; columns?: string[] };

const PAGES: Page[] = [
  { url: 'https://www.unitree.com/g1', model: 'Unitree G1', formFactor: 'humanoid' },
  { url: 'https://www.unitree.com/go2', model: 'Unitree Go2', formFactor: 'quadruped' },
  { url: 'https://www.unitree.com/b2', model: 'Unitree B2', formFactor: 'quadruped' },
  { url: 'https://www.unitree.com/h1', model: 'Unitree H1', formFactor: 'humanoid', columns: ['Unitree H1', 'Unitree H1-2'] },
];

type Column = { model: string; variant?: string; fields: RawField[]; prices: RawPrice[]; enterpriseOnly: boolean };

function newColumn(model: string, variant?: string): Column {
  return { model, variant, fields: [], prices: [], enterpriseOnly: false };
}

/** "US $13.5K" → 13500; "Contact sales" → null. */
function price(text: string): number | null {
  const m = /\$\s*([\d,.]+)\s*([kK])?/.exec(text);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? (m[2] ? n * 1000 : n) : null;
}

function apply(col: Column, label: string, value: string, formFactor: FormFactor) {
  if (/^price/i.test(label)) {
    const p = price(value);
    if (p) col.prices.push({ amount: p, currency: 'USD', region: 'US', tier: 1, direct: true, config: 'base', includes_vat: false, note: `${label}: ${value}` });
    else if (/contact/i.test(value)) col.enterpriseOnly = true;
    return;
  }
  col.fields.push(...mapSpecLabel(label, value, { formFactor }));
}

export const unitree: SourceAdapter = {
  id: 'unitree',
  source: { id: 'unitree.com', domain: 'unitree.com', tier: 1, kind: 'manufacturer', name: 'Unitree Robotics' },
  engine: 'fetch',

  async fetchIndex() {
    return PAGES.map((p) => ({ slug: p.url.split('/').pop()!, url: p.url, hint: p as unknown as Record<string, unknown> }));
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const page = (entry.hint as unknown as Page | undefined) ?? PAGES.find((p) => p.url === entry.url);
    if (!page) return [];
    const $ = cheerio.load(snapshot.body);
    const columns: Column[] = [];
    const text = (el: cheerio.Cheerio<import('domhandler').Element>) => spacedText(el.html());

    // Shape 1: valPart rows with a "Model" header row.
    const valRows = $('li').filter((_, li) => $(li).find('div.valPart').length > 1);
    if (valRows.length) {
      let names: string[] = [];
      valRows.each((_, li) => {
        const cells = $(li)
          .find('div.valPart')
          .map((__, c) => text($(c)))
          .get();
        if (/^model$/i.test(cells[0])) {
          names = cells.slice(1);
          for (const n of names) columns.push(newColumn(page.model, n));
          return;
        }
        if (!columns.length) for (let i = 1; i < cells.length; i++) columns.push(newColumn(page.model, page.columns?.[i - 1]));
        cells.slice(1).forEach((v, i) => columns[i] && apply(columns[i], cells[0], v, page.formFactor));
      });
    }

    // Shape 2: versions header + params rows.
    const versions = $('ul.versions li p.name')
      .map((_, p) => text($(p)))
      .get();
    if (versions.length && $('ul.params li').length) {
      for (const v of versions) columns.push(newColumn(page.model, v));
      $('ul.params li').each((_, li) => {
        const label = text($(li).find('p.name').first());
        $(li)
          .find('div.values')
          .each((i, v) => columns[i] && apply(columns[i], label, text($(v)), page.formFactor));
      });
    }

    // Shape 3: parameter blocks, single or multi column.
    if (!columns.length) {
      $('div.params').each((_, block) => {
        const title = text($(block).find('p.title').first()) || page.model;
        const lis = $(block).find('ul.parameter li');
        if (!lis.length) return;
        const multi = lis.first().find('.versions .version').length;
        const cols: Column[] = multi
          ? Array.from({ length: multi }, (__, i) => newColumn(page.columns?.[i] ?? `${title} ${i + 1}`))
          : [newColumn(title)];
        lis.each((__, li) => {
          const label = text($(li).find('.name').first());
          if (multi) {
            $(li)
              .find('.versions .version')
              .each((i, v) => cols[i] && apply(cols[i], label, text($(v)), page.formFactor));
          } else {
            apply(cols[0], label, text($(li).find('.value').first()), page.formFactor);
          }
        });
        columns.push(...cols);
      });
    }

    return columns
      .filter((c) => c.fields.length || c.prices.length)
      .map((c) => ({
        adapter: 'unitree',
        source_id: 'unitree.com',
        source_url: entry.url,
        observed_at: snapshot.fetchedAt,
        subject: { manufacturer_raw: 'Unitree', model_raw: c.model, variant_raw: c.variant, form_factor_hint: page.formFactor },
        fields: c.fields,
        prices: c.prices,
        availability: c.enterpriseOnly ? [{ region: 'US', status: 'enterprise_only', lead_time_text: 'Contact sales' }] : c.prices.length ? [{ region: 'US', status: 'for_sale' }] : [],
        assets: [],
      }));
  },
};
