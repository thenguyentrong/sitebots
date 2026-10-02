import { getSql } from '@/lib/db';
import { getRobotModel } from '@/lib/models/index';
import { STATUS_LABEL, formatMoney } from '@/lib/spec/display';
import type { RobotImage } from '@/lib/queries/robots';
import type { RobotCard } from '@/lib/spec/types';
import { STATUS_LABELS, TYPE_LABELS, priceText, toCard, type RobotCardData } from './cards';
import { cataloguePathFor, marketByPath } from './links';
import type { MarketRobot, Picture } from './load';

// Server side. Market records and catalogue rows become the same robot card, so both views of the
// robots page look alike: pictures to page through, the 3D model where one exists, price and the
// German status.

export type TilePicture = { src: string; alt: string; credit: string | null; href: string | null };
export type TileModel = { key: string; form: string; credit: string; creditUrl: string };
export type TileData = {
  id: string;
  href: string;
  name: string;
  kicker: string;
  summary: string | null;
  pictures: TilePicture[];
  model: TileModel | null;
  price: string | null;
  status: { label: string; tone: string };
  fine: string | null;
  compare: { id: string; name: string } | null;
};

const MAX_PICTURES = 8;
const RANK = { buy_now: 0, quote: 1, preorder: 2, not_sold: 3 } as const;
const PREVIEW_LICENCES = ['maker-preview', 'BSD-3-Clause', 'BSD-2-Clause', 'MIT', 'Apache-2.0'];

type Row = { id: string; manufacturer_slug: string; model_slug: string; variant: string; name: string; form_factor: string };
type Shot = TilePicture & { url: string; render: boolean };

const host = (url: string | null) => {
  try {
    return url ? new URL(url).host.replace(/^www[.]/, '') : null;
  } catch {
    return null;
  }
};
const norm = (name: string) => name.toLowerCase().split(' ').filter(Boolean).join(' ');

/** The catalogue configuration a market record is about: the longest catalogue name the record's
 * name starts with as whole words ("Unitree G1 EDU with Dex3-1 hands" is a G1 EDU; "Unitree B2-W"
 * is not a B2). The catalogue sometimes leaves the maker out ("X30" for "DEEP Robotics X30").
 * No match, no borrowing: an A2-W must not show the A2's pictures or model. */
function rowFor<T extends { name: string }>(name: string, rows: T[], maker = ''): T | null {
  const full = norm(name);
  const prefix = norm(maker) + ' ';
  const wanted = maker && full.startsWith(prefix) ? [full, full.slice(prefix.length)] : [full];
  let best: T | null = null;
  for (const row of rows) {
    const candidate = norm(row.name);
    if (wanted.some((item) => item === candidate || item.startsWith(candidate + ' ')) && (!best || candidate.length > norm(best.name).length)) best = row;
  }
  return best;
}

async function catalogueRows(paths: string[]): Promise<Row[]> {
  if (!paths.length) return [];
  const sql = await getSql();
  return (await sql.query(
    `select id::text as id, manufacturer_slug, model_slug, variant, name, form_factor from robot_cards
     where (manufacturer_slug || '/' || model_slug) = any($1::text[]) order by (variant = 'base') desc, variant`,
    [paths],
  )) as Row[];
}

/** Catalogue pictures by robot id: the maker's pictures first, then free-licence photographs, renders last. */
async function cataloguePictures(ids: string[]): Promise<Map<string, Shot[]>> {
  const out = new Map<string, Shot[]>();
  if (!ids.length) return out;
  const sql = await getSql();
  const rows = await sql.query(
    `select robot_id::text as robot_id, url, alt, licence, attribution, source_url from robot_assets
     where kind in ('hero', 'image') and robot_id::text = any($1::text[])
     order by robot_id, case when licence = any($2::text[]) then 0 when url like '/renders/%' then 2 else 1 end, is_primary desc, sort asc`,
    [ids, PREVIEW_LICENCES],
  );
  for (const row of rows as { robot_id: string; url: string; alt: string | null; licence: string | null; attribution: string | null; source_url: string | null }[]) {
    const url = row.url;
    const render = url.startsWith('/renders/');
    const credit = render
      ? 'Render of the published model'
      : row.licence && PREVIEW_LICENCES.includes(row.licence)
        ? 'From ' + (host(row.source_url ?? url) ?? 'the maker')
        : [row.attribution ?? 'Wikimedia Commons', row.licence].filter(Boolean).join(' · ');
    const list = out.get(row.robot_id) ?? [];
    list.push({ src: url, url, alt: row.alt ?? '', credit, href: row.source_url ?? null, render });
    out.set(row.robot_id, list);
  }
  return out;
}

/** The pictures of the market records about one catalogue configuration (`id` among the page's
 * configurations), in the robot page gallery's shape. Pictures the catalogue already holds are left out. */
export function marketImagesFor(records: MarketRobot[], configurations: { id: string; name: string }[], id: string, known: string[] = []): RobotImage[] {
  const skip = new Set(known.map((url) => url.split('?')[0]));
  return records.filter((record) => rowFor(record.name, configurations, record.maker)?.id === id).sort((a, b) => RANK[a.germany.status] - RANK[b.germany.status])
    .flatMap((record) => [record.picture, ...record.gallery])
    .flatMap((picture) => picture && !skip.has((picture.sourceUrl ?? '').split('?')[0]) ? [marketImage(picture)] : []);
}

export const marketImage = (picture: Picture): RobotImage => ({ url: picture.src, alt: picture.alt, licence: 'maker-preview', attribution: picture.credit, source_url: picture.pageUrl, width: picture.width, height: picture.height, kind: 'preview', own: true });

const marketShots = (robot: MarketRobot): Shot[] => [robot.picture, ...robot.gallery].flatMap((picture) =>
  picture ? [{ src: picture.src, url: picture.sourceUrl ?? picture.src, alt: picture.alt, credit: picture.credit, href: picture.pageUrl, render: false }] : []);

/** One list per card: duplicates dropped by source address. With a live 3D model the render stills
 * are left out, unless they are the only pictures there are. */
function merge(lists: Shot[][], hasModel: boolean): TilePicture[] {
  const photos = pick(lists, hasModel);
  return photos.length ? photos : pick(lists, false);
}

function pick(lists: Shot[][], skipRenders: boolean): TilePicture[] {
  const seen = new Set<string>();
  const out: TilePicture[] = [];
  for (const shot of lists.flat()) {
    if (skipRenders && shot.render) continue;
    const key = shot.url.split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ src: shot.src, alt: shot.alt, credit: shot.credit, href: shot.href });
    if (out.length >= MAX_PICTURES) break;
  }
  return out;
}

function modelFor(row: Row): TileModel | null {
  const entry = getRobotModel(row.manufacturer_slug + '/' + row.model_slug, row.variant);
  if (!entry) return null;
  return {
    key: row.manufacturer_slug + '/' + row.model_slug + (row.variant === 'base' ? '' : '#' + row.variant),
    form: row.form_factor,
    credit: entry.credits.source.repo,
    creditUrl: entry.credits.source.url,
  };
}

const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');

/** Cards for the German view, in the order given. */
export async function germanTiles(robots: RobotCardData[], market: Map<string, MarketRobot>, fits: Record<string, number>): Promise<TileData[]> {
  const pathOf = (id: string) => cataloguePathFor(id)?.replace(/^[/]robots[/]/, '') ?? null;
  const paths = [...new Set(robots.map((robot) => pathOf(robot.id)).filter((path): path is string => Boolean(path)))];
  const rows = await catalogueRows(paths);
  const rowsByPath = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row.manufacturer_slug + '/' + row.model_slug;
    rowsByPath.set(key, [...(rowsByPath.get(key) ?? []), row]);
  }
  const shots = await cataloguePictures(rows.map((row) => row.id));
  return robots.map((card) => {
    const path = pathOf(card.id);
    const pageRows = path ? rowsByPath.get(path) ?? [] : [];
    const row = rowFor(card.name, pageRows, card.maker);
    const base = pageRows.find((item) => item.variant === 'base');
    const model = row ? modelFor(row) : null;
    const record = market.get(card.id);
    const own = row ? shots.get(row.id) ?? [] : [];
    const sellers = card.germany.sellers.length;
    const jobs = fits[card.id] ?? 0;
    return {
      id: card.id,
      href: card.href,
      name: card.name,
      kicker: TYPE_LABELS[card.robotType] + ' · ' + card.body,
      summary: card.summary,
      pictures: merge([record ? marketShots(record) : [], own.length || !base || row?.variant === 'base' ? own : shots.get(base.id) ?? []], Boolean(model)),
      model,
      price: priceText(card),
      status: { label: STATUS_LABELS[card.germany.status], tone: card.germany.status },
      fine: (sellers ? plural(sellers, 'seller') + ' · ' : '') + (jobs ? 'fits ' + plural(jobs, 'job') + ' on the map' : 'no job on the map yet'),
      compare: row ? { id: row.id, name: row.name } : null,
    };
  });
}

/** Cards for the worldwide view: every catalogue configuration, with its German status where the market research covers it. */
export async function worldTiles(rows: RobotCard[]): Promise<TileData[]> {
  const byPath = marketByPath();
  const pathOf = (row: { manufacturer_slug: string; model_slug: string }) => row.manufacturer_slug + '/' + row.model_slug;
  // Every configuration of the listed pages, also the ones this view leaves out, so records land on the right one.
  const pages = new Map<string, Row[]>();
  for (const row of await catalogueRows([...new Set(rows.map(pathOf))])) pages.set(pathOf(row), [...(pages.get(pathOf(row)) ?? []), row]);
  const bases = new Map([...pages].flatMap(([path, list]) => list.filter((row) => row.variant === 'base').map((row) => [path, row.id] as const)));
  const shots = await cataloguePictures([...rows.map((row) => row.id), ...bases.values()]);
  const recordsFor = (row: RobotCard) => (byPath.get(pathOf(row)) ?? [])
    .filter((record) => rowFor(record.name, pages.get(pathOf(row)) ?? [], record.maker)?.id === row.id)
    // The record named exactly like the configuration first, then the easiest to buy, then the cheapest.
    .sort((a, b) => Number(rowFor(b.name, [row], b.maker) !== null && norm(b.name).endsWith(norm(row.name))) - Number(rowFor(a.name, [row], a.maker) !== null && norm(a.name).endsWith(norm(row.name))) || RANK[a.germany.status] - RANK[b.germany.status] || (a.germany.priceEur?.amount ?? Infinity) - (b.germany.priceEur?.amount ?? Infinity));
  return rows.map((row) => {
    const records = recordsFor(row);
    const best = records[0];
    const model = modelFor({ id: row.id, manufacturer_slug: row.manufacturer_slug, model_slug: row.model_slug, variant: row.variant, name: row.name, form_factor: row.form_factor });
    const own = shots.get(row.id) ?? [];
    const base = bases.get(pathOf(row));
    // The market pictures were checked by eye, so they lead; the catalogue adds what they lack.
    const pictures = merge([...records.map(marketShots), own.length || !base ? own : shots.get(base) ?? []], Boolean(model));
    const sold = best && best.germany.status !== 'not_sold';
    const sellers = best ? best.germany.sellers.length : 0;
    const abroad = row.price_amount !== null && row.price_currency ? formatMoney(row.price_amount, row.price_currency) + (row.price_region ? ' (' + row.price_region + ')' : '') : null;
    const type = TYPE_LABELS[row.form_factor as keyof typeof TYPE_LABELS] ?? row.form_factor;
    return {
      id: row.id,
      href: '/robots/' + row.manufacturer_slug + '/' + row.model_slug + (row.variant === 'base' ? '' : '?variant=' + row.variant),
      name: row.name,
      kicker: type + ' · ' + (best ? toCard(best).body : row.manufacturer_country ?? row.manufacturer_name),
      summary: row.summary ?? best?.summary ?? null,
      pictures,
      model,
      price: sold ? priceText(toCard(best)) : abroad,
      status: best ? { label: STATUS_LABELS[best.germany.status], tone: best.germany.status } : { label: STATUS_LABEL[row.status] ?? 'Status unknown', tone: 'other' },
      fine: sold ? (sellers ? plural(sellers, 'seller') + ' in Germany' : 'Sold in Germany') : best ? null : 'No German seller found',
      compare: { id: row.id, name: row.name },
    };
  });
}
