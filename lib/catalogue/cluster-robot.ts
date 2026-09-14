import { reviewedRobotStatus } from '@/lib/ingest/status-review';
import { canonicalManufacturerSlug, manufacturerDisplayName } from '@/lib/manufacturers';
import { TASK_LABEL } from '@/lib/profile/tasks';
import type { TaskCapability } from '@/lib/spec/enums';
import type { RobotCard } from '@/lib/spec/types';
import { USE_CASES, type ClusterRobot, type MarketStage } from './landscape';

const stageByStatus: Record<string, MarketStage> = { concept: 'upcoming', prototype: 'upcoming', pre_order: 'upcoming', shipping: 'commercial', unknown: 'unconfirmed' };
const statusLabels: Record<string, string> = { concept: 'Concept', prototype: 'Prototype', pre_order: 'Pre-order', shipping: 'Commercial / shipping', discontinued: 'Discontinued', unknown: 'Status not established' };
/** Keep task evidence and sales lifecycle independent. Neither a price nor the body type establishes either axis. */
export function toClusterRobot(robot: RobotCard): ClusterRobot {
  const reviewed = reviewedRobotStatus(robot.manufacturer_slug, robot.model_slug, robot.variant);
  const status = reviewed?.status ?? robot.status;
  const stage = stageByStatus[status] ?? null;
  const spec = robot.specs?.task_capabilities;
  const evidenceUrl = spec?.evidence_url || spec?.source_url;
  const hasSource = Boolean(evidenceUrl && /^https?:\/\//.test(evidenceUrl));
  const trust = spec?.trust === 'verified' && !hasSource ? 'assessed' : spec?.trust ?? 'unknown';
  const listed = Array.isArray(spec?.value) ? spec.value.filter((value): value is string => typeof value === 'string') : robot.task_capabilities ?? [];
  const supported = Boolean(evidenceUrl) && trust !== 'unknown' ? new Set(listed) : new Set<string>();
  const groups = USE_CASES.filter((group) => group.tasks.some((task) => supported.has(task))).map((group) => group.id);
  const reasons = [!groups.length ? 'Use case needs evidence' : null, !stage ? status === 'discontinued' ? 'Discontinued' : 'Market stage needs confirmation' : null].filter(Boolean);
  return {
    id: robot.id, name: robot.name, variant: robot.variant,
    href: '/robots/' + robot.manufacturer_slug + '/' + robot.model_slug + (robot.variant === 'base' ? '' : '?variant=' + encodeURIComponent(robot.variant)),
    maker: manufacturerDisplayName(robot.manufacturer_slug, robot.manufacturer_name), makerSlug: canonicalManufacturerSlug(robot.manufacturer_slug), image: robot.image_url, form: robot.form_factor,
    groups, stage, stageLabel: statusLabels[status] ?? statusLabels.unknown,
    tasks: [...supported].filter((id) => id in TASK_LABEL).map((id) => ({ id, label: TASK_LABEL[id as TaskCapability] })), trust,
    taskSource: hasSource ? evidenceUrl! : null, taskDate: spec?.observed_at ?? null,
    stageSource: reviewed?.sourceUrl ?? robot.specs?.status?.source_url ?? null,
    stageDate: reviewed?.observedAt ?? robot.specs?.status?.observed_at ?? null,
    unmappedReason: reasons.length ? reasons.join(' · ') : null,
  };
}