import { FOCUSED_FORM_FACTORS } from '@/lib/browse-scope';
import { catalogueFacts, marketFacts, mergeFacts, type Facts } from '@/lib/compare/facts';
import { getSql } from '@/lib/db';
import { cataloguePathFor, marketByPath } from '@/lib/market/links';
import { loadMarket, type MarketRobot } from '@/lib/market/load';
import { catalogueRows, pageIdentity } from '@/lib/market/tiles';
import { germanyBuyingRoutes } from '@/lib/purchasing';
import type { AvailabilityCurrent, PriceCurrent, RobotCard } from '@/lib/spec/types';
import { coerceRows } from './coerce';

export const COMPARE_MAX = 4;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CompareRow = { card: RobotCard; prices: PriceCurrent[]; availability: AvailabilityCurrent[] };

async function catalogueCompareRows(ids: string[]): Promise<CompareRow[]> {
  if (!ids.length) return [];
  const sql = await getSql();
  const [cards, prices, availability] = await Promise.all([
    sql.query(`select * from robot_cards where id = any($1::uuid[]) and form_factor = any($2::text[])`, [ids, FOCUSED_FORM_FACTORS]),
    sql.query(`select * from price_current where robot_id = any($1::uuid[]) order by tier, region`, [ids]),
    sql.query(`select * from availability_current where robot_id = any($1::uuid[])`, [ids]),
  ]);
  const byId = new Map(coerceRows<RobotCard>(cards).map((c) => [c.id, c]));
  const p = coerceRows<PriceCurrent>(prices);
  const a = coerceRows<AvailabilityCurrent>(availability);
  return ids
    .filter((id) => byId.has(id))
    .map((id) => ({
      card: byId.get(id)!,
      prices: p.filter((x) => x.robot_id === id),
      availability: a.filter((x) => x.robot_id === id),
    }));
}

/** Up to four catalogue robots by id, in the order asked. Unknown ids are dropped, not errors. */
export async function getCompareRows(ids: string[]): Promise<CompareRow[]> {
  return catalogueCompareRows([...new Set(ids.filter((id) => UUID.test(id)))].slice(0, COMPARE_MAX));
}

export type CompareColumn = {
  /** The id a Compare button uses for this robot, so one robot is one column however it was added. */
  id: string;
  name: string;
  maker: string;
  /** The robot's page, without an anchor, so the Sources row can add its own. */
  href: string;
  picture: { src: string; alt: string } | null;
  facts: Facts;
};

export type CompareResult = {
  columns: CompareColumn[];
  /** Different robots asked for, before the limit, so the page can say some were left out. */
  robots: number;
  /** Ids that match no robot on the site. */
  unknown: number;
};

const cardPath = (card: RobotCard) => card.manufacturer_slug + '/' + card.model_slug;
const pathOfRecord = (id: string) => cataloguePathFor(id)?.replace(/^[/]robots[/]/, '') ?? null;

function pictureOf(record: MarketRobot | null, card: RobotCard | null): CompareColumn['picture'] {
  const own = record?.picture ?? record?.gallery[0];
  if (own) return { src: own.src, alt: own.alt };
  return card?.image_url ? { src: card.image_url, alt: card.image_alt ?? card.name } : null;
}

function columnFor(id: string, record: MarketRobot | null, row: CompareRow | null): CompareColumn {
  const card = row?.card ?? null;
  const routes = card ? germanyBuyingRoutes(card.manufacturer_slug, card.model_slug, card.variant, row!.prices).map(({ name, url, region }) => ({ name, url, region })) : [];
  const page = card ? '/robots/' + cardPath(card) + (card.variant === 'base' ? '' : '?variant=' + card.variant) : cataloguePathFor(record!.id) ?? '/market/' + record!.id;
  return {
    id,
    name: record?.name ?? card!.name,
    maker: record?.maker ?? card!.manufacturer_name,
    href: page,
    picture: pictureOf(record, card),
    facts: mergeFacts(record ? marketFacts(record) : null, row ? catalogueFacts(row.card, row.prices, row.availability, routes) : null),
  };
}

/** Columns for /compare: market ids and catalogue ids, mixed, in the order asked. Where a catalogue
 * row and a market record are one robot they become one column and the market record speaks first. */
export async function getCompareColumns(requested: string[]): Promise<CompareResult> {
  const ids = [...new Set(requested)];
  const market = new Map(loadMarket().map((robot) => [robot.id, robot]));
  const known = await catalogueCompareRows(ids.filter((id) => UUID.test(id)));
  const rowsById = new Map(known.map((row) => [row.card.id, row]));

  const paths = [...new Set([...known.map((row) => cardPath(row.card)), ...ids.flatMap((id) => (market.has(id) ? pathOfRecord(id) ?? [] : []))])];
  const pageRows = await catalogueRows(paths);
  const byPath = marketByPath();
  const identities = new Map(paths.map((path) => [path, pageIdentity(pageRows.filter((row) => row.manufacturer_slug + '/' + row.model_slug === path), byPath.get(path) ?? [])]));

  // Keyed by compare id, so asking for one robot by both of its ids yields one column.
  const wanted = new Map<string, { record: MarketRobot | null; rowId: string | null }>();
  let unknown = 0;
  for (const id of ids) {
    const row = rowsById.get(id);
    const record = market.get(id);
    if (row) {
      if (!wanted.has(id)) wanted.set(id, { record: identities.get(cardPath(row.card))?.recordFor.get(id) ?? null, rowId: id });
    } else if (record) {
      const path = pathOfRecord(id);
      const identity = path ? identities.get(path) : undefined;
      const key = identity ? identity.compareId(record) : id;
      if (!wanted.has(key)) wanted.set(key, { record, rowId: identity?.rowOf.get(id) ?? null });
    } else unknown++;
  }

  const chosen = [...wanted].slice(0, COMPARE_MAX);
  const missing = chosen.flatMap(([, { rowId }]) => (rowId && !rowsById.has(rowId) ? [rowId] : []));
  for (const row of await catalogueCompareRows(missing)) rowsById.set(row.card.id, row);
  return {
    columns: chosen.map(([id, { record, rowId }]) => columnFor(id, record, (rowId && rowsById.get(rowId)) || null)),
    robots: wanted.size,
    unknown,
  };
}
