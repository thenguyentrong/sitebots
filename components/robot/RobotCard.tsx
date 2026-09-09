import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { FORM_FACTOR_LABEL, formatMoney, pickPayloadKey, PRICE_TIER_LABEL, qualifierLabel } from '@/lib/spec/display';
import type { RobotCard as Card } from '@/lib/spec/types';
import { RobotPhoto } from './RobotPhoto';

function num(v: number | null, unit: string, decimals = 1): string {
  if (v === null) return '—';
  return `${v.toLocaleString('en-GB', { maximumFractionDigits: decimals })}${unit === '°' ? '' : ' '}${unit}`;
}

function payloadText(c: Card): string {
  if (c.payload_kg_conservative === null) return '—';
  const key = pickPayloadKey(c.specs ?? {});
  const q = key ? qualifierLabel(key.split(':')[1]) : null;
  return `${num(c.payload_kg_conservative, 'kg', 1)}${q ? ` ${q.split(',')[0]}` : ''}`;
}

export function robotHref(r: { manufacturer_slug: string; model_slug: string; variant: string }): string {
  return `/robots/${r.manufacturer_slug}/${r.model_slug}${r.variant === 'base' ? '' : `?variant=${r.variant}`}`;
}

/**
 * The whole card is the link (stretched via the title's ::after); anything
 * passed as `action` sits above it and stays clickable on its own.
 */
export function RobotCard({ robot, action }: { robot: Card; action?: React.ReactNode }) {
  const href = robotHref(robot);
  const verified = robot.verified_fields?.length ?? 0;
  const total = Object.keys(robot.specs ?? {}).length;
  const share = total ? Math.round((verified / total) * 100) : 0;

  const figures: { label: string; value: React.ReactNode }[] = [
    {
      label: 'Height',
      value:
        robot.height_min_m !== null && robot.height_max_m !== null && robot.height_min_m !== robot.height_max_m
          ? `${robot.height_min_m}–${robot.height_max_m} m`
          : num(robot.height_m, 'm', 2),
    },
    { label: 'Weight', value: num(robot.weight_kg, 'kg', 1) },
    { label: 'Payload', value: payloadText(robot) },
    { label: 'Runtime', value: num(robot.runtime_h, 'h', 1) },
    { label: 'IP rating', value: robot.ip_rating ?? <span className="font-normal text-faint">not published</span> },
    { label: 'Stairs', value: robot.stair_capable === null ? <span className="font-normal text-faint">unknown</span> : robot.stair_capable ? 'Yes' : 'No' },
  ];

  return (
    <article className="card group relative flex flex-col transition duration-200 hover:-translate-y-0.5 hover:shadow-float">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">{robot.manufacturer_name}</p>
          <h3 className="mt-0.5 truncate text-base font-semibold leading-tight tracking-tight">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-[inherit] after:content-['']">
              {robot.name}
            </Link>
          </h3>
        </div>
        {robot.image_url ? (
          <RobotPhoto
            url={robot.image_url}
            alt={robot.image_alt}
            formFactor={robot.form_factor}
            fit="contain"
            className="h-16 w-16 shrink-0 rounded-xl"
          />
        ) : null}
      </div>

      <dl className="grid grid-cols-3 gap-px border-y border-edge/70 bg-edge/50 text-sm">
        {figures.map((f) => (
          <div key={f.label} className="bg-card px-4 py-2.5">
            <dt className="label">{f.label}</dt>
            <dd className="num mt-0.5 truncate font-medium">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 px-4 pt-3 pb-3">
        <Badge variant="outline">{FORM_FACTOR_LABEL[robot.form_factor]}</Badge>
        {robot.price_amount !== null && robot.price_currency ? (
          <span className="text-right">
            <span className="num block text-sm font-semibold">{formatMoney(robot.price_amount, robot.price_currency)}</span>
            <span className="block text-[11px] text-faint">
              {robot.price_region} · {PRICE_TIER_LABEL[robot.price_tier ?? 3]}
            </span>
          </span>
        ) : (
          <span className="text-xs text-faint">Quote only</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-edge/70 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[11px] text-faint">
            <span className="truncate">{total === 0 ? 'Store listing only' : `${verified} of ${total} values verified`}</span>
            {total > 0 ? <span className="num">{share}%</span> : null}
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-trust-verified" style={{ width: `${share}%` }} />
          </div>
        </div>
        {action ? <div className="relative z-10 shrink-0">{action}</div> : null}
      </div>
    </article>
  );
}
