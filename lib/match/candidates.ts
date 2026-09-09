import { getSql } from '@/lib/db';
import { coerceRows } from '@/lib/queries/coerce';
import type { AvailabilityCurrent, PriceCurrent, RobotCard } from '@/lib/spec/types';
import type { Candidate } from './types';

/**
 * Everything the matcher needs, in three queries. A few hundred robots with a
 * handful of price and availability rows each is small enough to rank in
 * memory on every request; caching would only add a way to serve stale data.
 */
export async function loadCandidates(): Promise<{ candidates: Candidate[]; usdToEur: number }> {
  const sql = await getSql();
  const [cards, prices, availability, settings] = await Promise.all([
    sql`select * from robot_cards`,
    sql`select * from price_current`,
    sql`select * from availability_current`,
    sql`select usd_to_eur from settings where id = 1`,
  ]);
  const byRobotPrice = new Map<string, PriceCurrent[]>();
  for (const p of coerceRows<PriceCurrent>(prices)) {
    const l = byRobotPrice.get(p.robot_id) ?? [];
    l.push(p);
    byRobotPrice.set(p.robot_id, l);
  }
  const byRobotAvail = new Map<string, AvailabilityCurrent[]>();
  for (const a of coerceRows<AvailabilityCurrent>(availability)) {
    const l = byRobotAvail.get(a.robot_id) ?? [];
    l.push(a);
    byRobotAvail.set(a.robot_id, l);
  }
  const candidates = coerceRows<RobotCard>(cards).map((card) => ({
    card,
    prices: byRobotPrice.get(card.id) ?? [],
    availability: byRobotAvail.get(card.id) ?? [],
  }));
  const usdToEur = Number(settings[0]?.usd_to_eur ?? 0.92);
  return { candidates, usdToEur: Number.isFinite(usdToEur) ? usdToEur : 0.92 };
}
