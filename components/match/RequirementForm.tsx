import Link from 'next/link';
import { AUTONOMY, DUST, ENVIRONMENTS, MATCH_REGIONS, TERRAINS, WET, type Requirements } from '@/lib/match/requirements';
import { FORM_FACTOR_LABEL } from '@/lib/spec/display';
import { CERTIFICATIONS, FORM_FACTORS, TASK_CAPABILITIES } from '@/lib/spec/enums';
import { ui } from '@/lib/ui';

/**
 * A plain GET form. The URL is the query, so results are a link that can be
 * sent to a colleague, and nothing runs in the browser.
 */

const TASK_LABEL: Record<string, string> = {
  carry_payload: 'Carry material',
  fetch_and_deliver: 'Fetch and deliver',
  shelf_pick: 'Pick from shelves',
  tool_handoff: 'Hand over tools',
  site_inspection: 'Site inspection',
  progress_scan_360: '360° progress capture',
  lidar_scan: 'LiDAR scanning',
  layout_marking: 'Layout marking',
  drilling: 'Drilling',
  screwing: 'Screwing',
  cleaning_sweep: 'Sweeping',
  material_sorting: 'Sorting material',
  patrol_monitoring: 'Patrol / monitoring',
  teleoperated_manipulation: 'Teleoperated handling',
  autonomous_nav_indoor: 'Navigate indoors alone',
  autonomous_nav_outdoor: 'Navigate outdoors alone',
  stair_climbing: 'Climb stairs',
};

const TERRAIN_LABEL: Record<string, string> = { paved: 'Paved / slab', gravel: 'Gravel', rubble: 'Rubble', mud: 'Mud' };
const ENV_LABEL: Record<string, string> = { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Both' };
const DUST_LABEL: Record<string, string> = { low: 'Normal', high: 'Heavy dust' };
const WET_LABEL: Record<string, string> = { dry: 'Dry', damp: 'Damp / splashes', rain: 'Rain' };
const AUTONOMY_LABEL: Record<string, string> = { teleop_ok: 'Teleoperation is fine', supervised: 'Autonomous, supervised', autonomous: 'Fully autonomous' };

function Field({ label, children, hint, unit }: { label: string; children: React.ReactNode; hint?: string; unit?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {unit ? (
        <span className="relative block">
          {children}
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-faint">{unit}</span>
        </span>
      ) : (
        children
      )}
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 px-5 py-5">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-subtle text-[11px] font-semibold text-muted">{n}</span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {hint ? <p className="text-xs text-faint">{hint}</p> : null}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

function Options({ list, labels }: { list: readonly string[]; labels: Record<string, string> }) {
  return (
    <>
      {list.map((v) => (
        <option key={v} value={v}>
          {labels[v] ?? v}
        </option>
      ))}
    </>
  );
}

export function RequirementForm({ req }: { req: Requirements }) {
  const input = `${ui.input} pr-12`;
  return (
    <form action="/" method="get" className="card">
      <div className="divide-y divide-edge/70">
        <Section n={1} title="The job" hint="Tick what the robot has to do">
          <div className="flex flex-wrap gap-2">
            {TASK_CAPABILITIES.map((t) => (
              <label key={t} className="chip">
                <input type="checkbox" name="tasks" value={t} defaultChecked={req.tasks.includes(t)} />
                <span>{TASK_LABEL[t] ?? t}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payload" unit="kg" hint="What it must carry, not lift once.">
              <input type="number" name="payload_kg" min="0.1" step="any" defaultValue={req.payload_kg ?? ''} className={input} placeholder="12" />
            </Field>
            <Field label="Reach height" unit="m" hint="Shelf or work height.">
              <input type="number" name="reach_height_m" min="0.1" step="any" defaultValue={req.reach_height_m ?? ''} className={input} placeholder="1.8" />
            </Field>
          </div>
        </Section>

        <Section n={2} title="The site" hint="Ground, weather and the way up">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ground">
              <select name="terrain" className={ui.select} defaultValue={req.terrain}>
                <Options list={TERRAINS} labels={TERRAIN_LABEL} />
              </select>
            </Field>
            <Field label="Stairs">
              <select name="stairs" className={ui.select} defaultValue={req.stairs}>
                <option value="none">Not needed</option>
                <option value="required">Must climb stairs</option>
              </select>
            </Field>
            <Field label="Where">
              <select name="environment" className={ui.select} defaultValue={req.environment}>
                <Options list={ENVIRONMENTS} labels={ENV_LABEL} />
              </select>
            </Field>
            <Field label="Slope" unit="°">
              <input type="number" name="slope_deg" min="0" max="60" step="any" defaultValue={req.slope_deg ?? ''} className={input} />
            </Field>
            <Field label="Dust">
              <select name="dust" className={ui.select} defaultValue={req.dust}>
                <Options list={DUST} labels={DUST_LABEL} />
              </select>
            </Field>
            <Field label="Wet">
              <select name="wet" className={ui.select} defaultValue={req.wet}>
                <Options list={WET} labels={WET_LABEL} />
              </select>
            </Field>
            <Field label="Coldest" unit="°C">
              <input type="number" name="temp_min_c" step="any" defaultValue={req.temp_min_c ?? ''} className={input} />
            </Field>
            <Field label="Hottest" unit="°C">
              <input type="number" name="temp_max_c" step="any" defaultValue={req.temp_max_c ?? ''} className={input} />
            </Field>
          </div>
        </Section>

        <Section n={3} title="The shift">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hours per shift" unit="h">
              <input type="number" name="runtime_h_per_shift" min="0.5" step="any" defaultValue={req.runtime_h_per_shift ?? ''} className={input} />
            </Field>
            <Field label="Operation">
              <select name="autonomy" className={ui.select} defaultValue={req.autonomy}>
                <Options list={AUTONOMY} labels={AUTONOMY_LABEL} />
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" name="hot_swap_acceptable" value="1" defaultChecked={req.hot_swap_acceptable} className="h-4 w-4 rounded accent-[var(--foreground)]" />
            Battery swaps during the shift are acceptable
          </label>
        </Section>

        <Section n={4} title="Buying">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget" unit="€">
              <input type="number" name="budget_eur" min="100" step="any" defaultValue={req.budget_eur ?? ''} className={input} />
            </Field>
            <Field label="Region">
              <select name="region" className={ui.select} defaultValue={req.region}>
                {MATCH_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Needed by">
              <input type="date" name="needed_by" defaultValue={req.needed_by ?? ''} className={ui.input} />
            </Field>
            <Field label="Form factor">
              <select name="form_factor" className={ui.select} defaultValue={req.form_factor}>
                <option value="any">Any</option>
                {FORM_FACTORS.map((f) => (
                  <option key={f} value={f}>
                    {FORM_FACTOR_LABEL[f]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Noise limit" unit="dB">
              <input type="number" name="noise_limit_db" min="30" max="130" step="any" defaultValue={req.noise_limit_db ?? ''} className={input} />
            </Field>
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">Required certifications</span>
            <div className="flex flex-wrap gap-2">
              {CERTIFICATIONS.map((c) => (
                <label key={c} className="chip">
                  <input type="checkbox" name="certifications_required" value={c} defaultChecked={req.certifications_required.includes(c)} />
                  <span>{c.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-2.5 rounded-xl border border-edge bg-subtle/60 p-3 text-sm">
            <input type="checkbox" name="strict_unknowns" value="1" defaultChecked={req.strict_unknowns} className="mt-0.5 h-4 w-4 rounded accent-[var(--foreground)]" />
            <span>
              <span className="font-medium">Strict mode</span>
              <span className="block text-xs text-muted">Exclude robots whose maker has not published a value I asked about. Off by default: unknown is shown as unverified, not as a fail.</span>
            </span>
          </label>
        </Section>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-b-2xl border-t border-edge/70 bg-card/95 px-5 py-3 backdrop-blur">
        <Link href="/" className="text-sm text-muted underline-offset-4 hover:underline">
          Reset
        </Link>
        <button type="submit" className={`${ui.btn} px-6`}>
          Find robots
        </button>
      </div>
    </form>
  );
}
