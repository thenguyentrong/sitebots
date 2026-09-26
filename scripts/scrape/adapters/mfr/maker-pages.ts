import * as cheerio from 'cheerio';
import { readFileSync } from 'node:fs';
import specificationPages from '@/data/specifications/pages.json';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { mapSpecLabel } from '../../_lib/specmap';
import type { IndexEntry, RawField, RawRecord, Snapshot, SourceAdapter } from '../../_lib/types';
import type { FormFactor } from '@/lib/spec/enums';

/**
 * Specification pages are approved independently in data/specifications/pages.json.
 * A gallery may include related variants, so image approval never authorizes
 * importing that page's specifications. This adapter visits each of
 * them once more and takes every label / value pair the page prints — spec
 * tables, definition lists, "Label: value" lines — through the shared label
 * mapper. Whatever the mapper does not recognise is dropped, never guessed.
 *
 * Robots are named by their catalogue slugs, so the subject is the canonical
 * maker and model name from the alias files and resolves exactly.
 */
type ApprovedPage = { robot: string; url: string; fields: string[]; reviewedAt: string };
function approvedPages(): ApprovedPage[] {
  return specificationPages.pages;
}

type Names = { makers: Map<string, string>; models: Map<string, { name: string; formFactor?: FormFactor }> };

function names(): Names {
  const makers = new Map<string, string>();
  const models = new Map<string, { name: string; formFactor?: FormFactor }>();
  // Literal paths let the deployment tracer include just these two files.
  const documents = [
    readFileSync(join(process.cwd(), 'data', 'aliases.yaml'), 'utf8'),
    readFileSync(join(process.cwd(), 'data', 'aliases.generated.yaml'), 'utf8'),
  ];
  for (const document of documents) {
    const y = parseYaml(document) as {
      manufacturers?: Record<string, { name: string }>;
      robots?: Record<string, Record<string, { name: string; form_factor?: FormFactor }>>;
    };
    for (const [slug, m] of Object.entries(y.manufacturers ?? {})) if (!makers.has(slug)) makers.set(slug, m.name);
    for (const [maker, list] of Object.entries(y.robots ?? {}))
      for (const [slug, m] of Object.entries(list)) if (!models.has(`${maker}/${slug}`)) models.set(`${maker}/${slug}`, { name: m.name, formFactor: m.form_factor });
  }
  return { makers, models };
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const LABEL = /^([A-Za-z][A-Za-z0-9 /()%°.·+-]{1,40}?)\s*[:：]\s*(.{1,120})$/;

/** Every label / value pair a page prints, in document order, before mapping. */
export function pairsOf(body: string): [string, string][] {
  const $ = cheerio.load(body);
  $('script, style, noscript, nav, footer').remove();
  const out: [string, string][] = [];
  $('table tr').each((_, tr) => {
    const cells = $(tr).children('th, td').map((__, c) => clean($(c).text())).get();
    if (cells.length >= 2 && cells[0] && cells[1]) out.push([cells[0], cells[1]]);
  });
  $('dl').each((_, dl) => {
    const dts = $(dl).children('dt').map((__, d) => clean($(d).text())).get();
    const dds = $(dl).children('dd').map((__, d) => clean($(d).text())).get();
    dts.forEach((dt, i) => dt && dds[i] && out.push([dt, dds[i]]));
  });
  // Two short sibling cells, the first ending like a label (Unitree, Deep Robotics, most Chinese makers).
  $('li, p, div, span').each((_, el) => {
    if ($(el).children().length > 3) return;
    const text = clean($(el).text());
    if (text.length > 160) return;
    const m = LABEL.exec(text);
    if (m) out.push([m[1], m[2]]);
  });
  return out;
}

export const makerPages: SourceAdapter = {
  id: 'maker-pages',
  source: { id: 'maker-pages', domain: 'maker-pages.invalid', tier: 1, kind: 'manufacturer', name: 'Manufacturer product pages' },
  engine: 'fetch',

  async fetchIndex() {
    const out: IndexEntry[] = approvedPages().filter(page => page.fields.length > 0).map(page => ({ slug: page.robot, url: page.url }));
    return out;
  },

  async fetchRecord(entry, ctx) {
    return ctx.fetch(entry.url);
  },

  parse(snapshot: Snapshot, entry: IndexEntry): RawRecord[] {
    const approval = approvedPages().find(page => page.robot === entry.slug && page.url === entry.url);
    if (!approval) return [];
    const [maker] = entry.slug.split('/');
    const n = names();
    const makerName = n.makers.get(maker);
    const m = n.models.get(entry.slug);
    if (!makerName || !m) return [];
    const seen = new Set<string>();
    const fields: RawField[] = [];
    for (const [label, value] of pairsOf(snapshot.body)) {
      for (const f of mapSpecLabel(label, value, { formFactor: m.formFactor })) {
        if (!approval.fields.includes(f.field)) continue;
        f.note ??= `${label}: ${value}`;
        const k = `${f.field}|${f.qualifier ?? ''}`;
        if (seen.has(k)) continue;
        seen.add(k);
        fields.push(f);
      }
    }
    if (!fields.length) return [];
    return [
      {
        adapter: 'maker-pages',
        source_id: 'maker-pages',
        source_url: snapshot.url,
        observed_at: snapshot.fetchedAt,
        subject: { manufacturer_raw: makerName, model_raw: m.name, form_factor_hint: m.formFactor },
        fields,
        prices: [],
        availability: [],
        assets: [],
      },
    ];
  },
};
