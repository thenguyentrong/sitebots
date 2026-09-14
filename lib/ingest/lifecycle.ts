import type { SqlClient } from '@/lib/db';
import type { AvailabilityStatus, RobotStatus } from '@/lib/spec/enums';
import { reviewedRobotStatus } from './status-review';

export type LifecycleEvidence = { status: AvailabilityStatus; source_url: string; observed_at: string | Date; source_kind: string | null; source_tier: number | null };
const lifecycle: Partial<Record<AvailabilityStatus, RobotStatus>> = { for_sale: 'shipping', enterprise_only: 'shipping', pre_order: 'pre_order', discontinued: 'discontinued' };

/** Only a fresh manufacturer's explicit availability can replace an imported lifecycle hint. */
export function lifecycleFromEvidence(rows: LifecycleEvidence[], now = Date.now()) {
  const official = rows.filter(r => r.source_kind === 'manufacturer' && r.source_tier === 1
    && new Date(r.observed_at).getTime() <= now + 86400000
    && now - new Date(r.observed_at).getTime() <= 90 * 86400000);
  official.sort((a, b) => +new Date(b.observed_at) - +new Date(a.observed_at) || a.source_url.localeCompare(b.source_url));
  if (!official.length) return null;
  // Simultaneous disagreement (including unknown or not-sold) needs review, not an arbitrary winner.
  const latest = official.filter(r => +new Date(r.observed_at) === +new Date(official[0].observed_at));
  const statuses = new Set(latest.map(r => lifecycle[r.status] ?? null));
  if (statuses.size !== 1 || !lifecycle[latest[0].status]) return null;
  return { status: lifecycle[latest[0].status]!, sourceUrl: latest[0].source_url, observedAt: latest[0].observed_at };
}

export async function reconcileRobotLifecycle(sql: SqlClient, robotId: string) {
  const [robot] = await sql.query(`select r.status, r.model_slug, r.variant, m.slug as manufacturer from robots r join manufacturers m on m.id = r.manufacturer_id where r.id = $1`, [robotId]);
  if (!robot) return;
  const rows = await sql.query(`select status, source_url, observed_at, source_kind, source_tier from availability_current where robot_id = $1`, [robotId]);
  const derived = lifecycleFromEvidence(rows as LifecycleEvidence[]);
  const review = reviewedRobotStatus(String(robot.manufacturer), String(robot.model_slug), String(robot.variant));
  const status = review && (!derived || +new Date(review.observedAt) >= +new Date(derived.observedAt)) ? review.status : derived?.status;
  if (status && status !== robot.status) await sql.query('update robots set status = $1, updated_at = now() where id = $2', [status, robotId]);
}
