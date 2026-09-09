import Link from 'next/link';
import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import type { CompareRow } from '@/lib/queries/compare';
import { FORM_FACTOR_LABEL, formatMoney, formatSpec, PRICE_TIER_LABEL, qualifierLabel } from '@/lib/spec/display';
import { GROUPS, splitSpecKey, visibleFields } from '@/lib/spec/fields';
import type { SpecValue } from '@/lib/spec/types';
import { cn } from '@/lib/utils';

/**
 * Robots as columns, fields as rows, registry order. A row is shown when any
 * column has a value or the field is one a site buyer needs to see missing.
 * Numeric rows mark the best value; "best" means more for payload, runtime,
 * speed, slope and step height, and less for weight — nothing else is judged.
 */
const MORE_IS_BETTER = new Set(['payload_kg', 'runtime_h', 'max_speed_ms', 'walk_speed_ms', 'max_slope_deg', 'step_height_m', 'battery_wh', 'reach_m', 'dof_total']);
const LESS_IS_BETTER = new Set(['weight_kg', 'charge_time_h', 'noise_db']);

function numeric(s: SpecValue | undefined): number | null {
  if (!s) return null;
  if (typeof s.value === 'number') return s.value;
  if (s.min != null) return s.min;
  return null;
}

type Cell = { s: SpecValue | undefined; best: boolean };
type TableRow = { key: string; label: string; cells: Cell[] };

export function CompareTable({ rows }: { rows: CompareRow[] }) {
  const allKeys = new Set(rows.flatMap((r) => Object.keys(r.card.specs ?? {})));
  const present = new Set([...allKeys].map((k) => splitSpecKey(k).field));
  const formFactor = rows.every((r) => r.card.form_factor === rows[0].card.form_factor) ? rows[0].card.form_factor : 'humanoid';
  const fields = visibleFields(formFactor, present);

  return (
    <div className="card overflow-x-auto" data-compare-table>
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-edge align-top">
            <th className="w-48 px-5 py-4 text-left font-normal" />
            {rows.map((r) => (
              <th key={r.card.id} className="px-4 py-4 text-left">
                <div className="flex items-start gap-3">
                  {r.card.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- card picture, remote or /renders
                    <img src={r.card.image_url} alt="" referrerPolicy="no-referrer" className={`h-10 w-10 shrink-0 rounded-xl bg-subtle object-contain`} />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-normal text-muted">{r.card.manufacturer_name}</p>
                    <Link
                      href={`/robots/${r.card.manufacturer_slug}/${r.card.model_slug}${r.card.variant === 'base' ? '' : `?variant=${r.card.variant}`}`}
                      className="block text-base font-semibold leading-tight tracking-tight underline-offset-4 hover:underline"
                    >
                      {r.card.name}
                    </Link>
                    <p className="mt-0.5 text-xs font-normal text-faint">{FORM_FACTOR_LABEL[r.card.form_factor]}</p>
                  </div>
                </div>
              </th>
            ))}
          </tr>
          <tr className="border-b border-edge/60 bg-subtle/40">
            <th className="px-5 py-2.5 text-left text-xs font-medium text-muted">Price</th>
            {rows.map((r) => {
              const p = r.prices.find((x) => x.tier <= 2) ?? r.prices[0];
              return (
                <td key={r.card.id} className="px-4 py-2.5 align-top">
                  {p ? (
                    <>
                      <span className="num font-semibold">{formatMoney(p.amount, p.currency)}</span>
                      <span className="block text-xs text-faint">
                        {p.region} · {PRICE_TIER_LABEL[p.tier]}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-faint">Quote only</span>
                  )}
                </td>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {GROUPS.filter((g) => !g.panel || g.id === 'parts').map((group) => {
            const defs = fields.filter((f) => f.group === group.id);
            const keys = defs.flatMap((def) => {
              const matching = [...allKeys].filter((k) => splitSpecKey(k).field === def.id).sort();
              return matching.length ? matching.map((k) => ({ key: k, def })) : [{ key: def.id, def }];
            });
            if (!keys.length) return null;
            const tableRows: TableRow[] = keys.map(({ key, def }) => {
              const values = rows.map((r) => r.card.specs?.[key]);
              const nums = values.map(numeric);
              let bestIdx = -1;
              if (MORE_IS_BETTER.has(def.id) || LESS_IS_BETTER.has(def.id)) {
                const known = nums.map((n, i) => [n, i] as const).filter(([n]) => n !== null) as [number, number][];
                if (known.length > 1) {
                  known.sort((a, b) => (MORE_IS_BETTER.has(def.id) ? b[0] - a[0] : a[0] - b[0]));
                  if (known[0][0] !== known[1][0]) bestIdx = known[0][1];
                }
              }
              const q = qualifierLabel(splitSpecKey(key).qualifier);
              return { key, label: def.label + (q ? ` · ${q}` : ''), cells: values.map((s, i) => ({ s, best: i === bestIdx })) };
            });
            return <GroupRows key={group.id} label={group.label} rows={tableRows} />;
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({ label, rows }: { label: string; rows: TableRow[] }) {
  return (
    <>
      <tr>
        <th colSpan={rows[0] ? rows[0].cells.length + 1 : 1} className="eyebrow px-5 pt-6 pb-2 text-left">
          {label}
        </th>
      </tr>
      {rows.map((row) => (
        <tr key={row.key} className="border-t border-edge/60 align-top transition hover:bg-subtle/50">
          <th className="px-5 py-2.5 text-left font-normal text-muted">{row.label}</th>
          {row.cells.map(({ s, best }, i) => (
            <td key={i} className={cn('num px-4 py-2.5', best && 'bg-safety-soft font-semibold text-foreground')}>
              {s ? (
                <>
                  <span className="flex items-baseline gap-2">
                    {formatSpec(row.key, s)}
                    {best ? <span className="text-[10px] font-semibold uppercase tracking-wider text-safety">best</span> : null}
                  </span>
                  <span className="mt-1 block">
                    <EvidenceBadge trust={s.trust} />
                  </span>
                </>
              ) : (
                <span className="text-faint">not published</span>
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
