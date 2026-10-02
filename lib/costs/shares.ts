import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Server side. Cost shares per trade from the weights of the official construction price indices
// and personnel cost shares per branch, both from Destatis (data/costs/trade-shares.json).

export type Source = { title: string; publisher: string; published: string; url: string; basis: string };
export type BuildingType = 'wohn' | 'buero' | 'gewerbe';
export type CivilType = 'strasse' | 'kanal' | 'bruecke';
export type Trade = { de: string; en: string; section: 'rohbau' | 'ausbau' | 'tga'; values: Record<BuildingType, number | null>; setting: string | null; where: string };
export type CivilWork = { de: string; en: string; values: Record<CivilType, number | null>; setting: string | null; where: string };
export type Branch = { wz: string; de: string; en: string; value: number; where: string };
export type TradeShares = {
  checkedAt: string;
  sources: { weights: Source; labour: Source };
  buildings: { types: { id: BuildingType; de: string; en: string }[]; totals: Record<BuildingType, { rohbau: number; ausbau: number }>; trades: Trade[] };
  civil: { types: { id: CivilType; de: string; en: string }[]; works: CivilWork[] };
  labour: Branch[];
};

let cache: TradeShares | null = null;
export function loadTradeShares(): TradeShares {
  if (cache) return cache;
  const data = JSON.parse(readFileSync(join(process.cwd(), 'data', 'costs', 'trade-shares.json'), 'utf8')) as TradeShares;
  if (process.env.NODE_ENV === 'production') cache = data;
  return data;
}

/** Shell, finishing and building services of one building type, in percent of the work on the structure. */
export function blocks(data: TradeShares, type: BuildingType) {
  const sum = (section: Trade['section']) => Math.round(data.buildings.trades.filter((t) => t.section === section).reduce((s, t) => s + (t.values[type] ?? 0), 0) * 10) / 10;
  return { rohbau: sum('rohbau'), ausbau: sum('ausbau'), tga: sum('tga') };
}
