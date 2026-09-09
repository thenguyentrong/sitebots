import { getSql } from '@/lib/db';
import type { AvailabilityCurrent, PriceCurrent, RobotCard } from '@/lib/spec/types';
import { coerceRows } from './coerce';

export const COMPARE_MAX = 4;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CompareRow = { card: RobotCard; prices: PriceCurrent[]; availability: AvailabilityCurrent[] };

/** Up to four robots by id, in the order asked. Unknown ids are dropped, not errors. */
export async function getCompareRows(ids: string[]): Promise<CompareRow[]> {
  const wanted = [...new Set(ids.filter((id) => UUID.test(id)))].slice(0, COMPARE_MAX);
  if (!wanted.length) return [];
  const sql = await getSql();
  const [cards, prices, availability] = await Promise.all([
    sql.query(`select * from robot_cards where id = any($1::uuid[])`, [wanted]),
    sql.query(`select * from price_current where robot_id = any($1::uuid[]) order by tier, region`, [wanted]),
    sql.query(`select * from availability_current where robot_id = any($1::uuid[])`, [wanted]),
  ]);
  const byId = new Map(coerceRows<RobotCard>(cards).map((c) => [c.id, c]));
  const p = coerceRows<PriceCurrent>(prices);
  const a = coerceRows<AvailabilityCurrent>(availability);
  return wanted
    .filter((id) => byId.has(id))
    .map((id) => ({
      card: byId.get(id)!,
      prices: p.filter((x) => x.robot_id === id),
      availability: a.filter((x) => x.robot_id === id),
    }));
}
