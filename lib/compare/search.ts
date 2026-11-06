import { FOCUSED_FORM_FACTORS } from '@/lib/browse-scope';
import { isPublicRobot } from '@/lib/catalogue-policy';
import { catalogueType } from '@/lib/compare/facts';
import { getSql } from '@/lib/db';
import { TYPE_LABELS } from '@/lib/market/cards';
import { marketByPath } from '@/lib/market/links';
import { loadMarket, type MarketRobot } from '@/lib/market/load';
import { norm, pageIdentity } from '@/lib/market/tiles';
import type { FormFactor } from '@/lib/spec/enums';

// The search box on /compare. The index lives on the server and a query returns a few short rows,
// so the page does not ship a list of a thousand robots to every visitor.

export type CompareHit = { id: string; name: string; maker: string; type: string; picture: string | null };
type Entry = CompareHit & { text: string };
export type IndexRow = { id: string; manufacturer_slug: string; manufacturer_name: string; model_slug: string; variant: string; name: string; form_factor: string; image_url: string | null };

export const COMPARE_HITS = 8;

/** Every robot once: market records by their compare id, then the public catalogue rows no record speaks for. */
export function buildIndex(records: MarketRobot[], rows: IndexRow[], pages: Map<string, MarketRobot[]>): Entry[] {
  const rowsByPath = new Map<string, IndexRow[]>();
  for (const row of rows) {
    const path = row.manufacturer_slug + '/' + row.model_slug;
    rowsByPath.set(path, [...(rowsByPath.get(path) ?? []), row]);
  }
  const compareIds = new Map<string, string>();
  const spoken = new Set<string>();
  for (const [path, list] of pages) {
    const identity = pageIdentity(rowsByPath.get(path) ?? [], list);
    for (const record of list) compareIds.set(record.id, identity.compareId(record));
    for (const rowId of identity.recordFor.keys()) spoken.add(rowId);
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  const entries = new Map<string, Entry>();
  for (const record of records) {
    const id = compareIds.get(record.id) ?? record.id;
    if (entries.has(id)) continue;
    const row = byId.get(id);
    // The catalogue name stays searchable: the Kepler K2 record is the Forerunner K2 row.
    entries.set(id, { id, name: record.name, maker: record.maker, type: TYPE_LABELS[record.robotType], picture: record.picture?.src ?? row?.image_url ?? null, text: norm([record.name, record.maker, record.model, record.variant, row?.name].filter(Boolean).join(' ')) });
  }
  for (const row of rows) {
    if (spoken.has(row.id) || entries.has(row.id) || !isPublicRobot(row.manufacturer_slug, row.model_slug)) continue;
    entries.set(row.id, { id: row.id, name: row.name, maker: row.manufacturer_name, type: catalogueType(row.form_factor as FormFactor), picture: row.image_url, text: norm([row.name, row.manufacturer_name, row.model_slug.replaceAll('-', ' ')].join(' ')) });
  }
  return [...entries.values()];
}

/** Every word must match. A name that starts with the query comes first, then a word in the name, then the shortest name. */
export function searchIndex(index: Entry[], query: string, limit = COMPARE_HITS): CompareHit[] {
  const wanted = norm(query);
  const words = wanted.split(' ').filter(Boolean);
  if (!words.length) return [];
  const rank = (entry: Entry) => {
    const name = norm(entry.name);
    return name.startsWith(wanted) ? 0 : (' ' + name).includes(' ' + wanted) ? 1 : 2;
  };
  return index.filter((entry) => words.every((word) => entry.text.includes(word)))
    .sort((a, b) => rank(a) - rank(b) || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ id, name, maker, type, picture }) => ({ id, name, maker, type, picture }));
}

let cached: { at: number; index: Promise<Entry[]> } | null = null;
// Long enough to spare a query per keystroke; a catalogue change shows up within minutes.
const INDEX_TTL_MS = 5 * 60_000;

async function loadIndex(): Promise<Entry[]> {
  const sql = await getSql();
  const rows = await sql.query(
    `select id::text as id, manufacturer_slug, manufacturer_name, model_slug, variant, name, form_factor, image_url
     from robot_cards where form_factor = any($1::text[]) order by manufacturer_name, name, variant`,
    [FOCUSED_FORM_FACTORS],
  );
  return buildIndex(loadMarket(), rows as IndexRow[], marketByPath());
}

export async function searchRobots(query: string): Promise<CompareHit[]> {
  if (!cached || Date.now() - cached.at > INDEX_TTL_MS) {
    const index = loadIndex();
    cached = { at: Date.now(), index };
    index.catch(() => { cached = null; });
  }
  return searchIndex(await cached.index, query);
}
