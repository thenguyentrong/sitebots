'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FamilyId, SettingGroup } from '@/lib/content/vocab';
import { emptyContext } from '@/lib/context/schema';
import { factText } from '@/lib/journey/fact-text';
import { PLACE_LABELS } from '@/lib/journey/labels';
import { projectFromCard, snapshotFromCard } from '@/lib/plan/from-task';
import { answeredKeys, screenForSite } from '@/lib/plan/screen';
import { PROJECT_LIMIT, usePlan } from '@/lib/plan/store';
import type { Facts } from '@/lib/screen/facts';
import type { FactKey } from '@/lib/screen/types';
import type { LabelMap, MachineClassOption, TaskCard } from '@/lib/tasks/types';
import { ui } from '@/lib/ui';
import { CheckResult, VerdictLine } from './CheckResult';
import { FactInputs, type FactChange } from './FactInputs';
import { Icon } from './Icon';
import { Saved } from './StationHead';

/** What differs from one site to the next; asked first. */
const SITE_KEYS: readonly FactKey[] = ['incumbent_automation', 'dust', 'environment', 'wet'];
/** The task itself; folded away unless the record leaves one of its hard tests open. */
const TASK_KEYS: readonly FactKey[] = ['object_mass_kg', 'variability', 'error_tolerance', 'safety_criticality', 'reach_height_m', 'data_sensitivity', 'runtime_continuous_min'];
const HARD_TASK_KEYS: readonly FactKey[] = ['object_mass_kg', 'variability', 'error_tolerance', 'safety_criticality'];
export const SITE_QUESTIONS: Partial<Record<FactKey, string>> = {
  incumbent_automation: 'Does a machine already do this?',
  dust: 'Dust where the work happens',
  environment: 'Indoors or outdoors?',
  wet: 'Wet conditions',
};

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

/**
 * Step 2 on a task page. The record stands for a typical place of its kind;
 * the visitor changes only what differs on theirs and sees the verdict move.
 * Before the task is on the shortlist the answers live in this component;
 * afterwards they are the project's own and are saved as they change.
 */
export function TaskCheck({ card, group, machineClasses, machineClassFamilies, solutionClasses }: { card: TaskCard; group: SettingGroup; machineClasses: MachineClassOption[]; machineClassFamilies: Record<string, readonly FamilyId[]>; solutionClasses: LabelMap }) {
  const plan = usePlan();
  const [draft, setDraft] = useState<Partial<Facts>>({});
  const saved = plan.workspace?.projects.find((p) => p.task.kind === 'library' && p.task.snapshot.id === card.id) ?? null;
  const snapshot = saved?.task.kind === 'library' ? saved.task.snapshot : null;
  const typical: Partial<Facts> = snapshot?.facts ?? card.facts;
  const answers: Partial<Facts> = saved ? saved.factOverrides : draft;
  const result = screenForSite(saved ?? { ...projectFromCard('preview', card, emptyContext()), factOverrides: draft }, machineClassFamilies);
  const machines = Object.fromEntries(machineClasses.map((m) => [m.id, m.title.en]));
  const place = PLACE_LABELS[group];
  const changed = answeredKeys(answers).length;
  const full = !saved && (plan.workspace?.projects.length ?? 0) >= PROJECT_LIMIT;

  const change: FactChange = (key, value) => {
    const next: Partial<Facts> = { ...answers };
    if (value === null || same(value, typical[key])) delete next[key];
    else (next as Record<FactKey, unknown>)[key] = value;
    if (saved) plan.updateProject(saved.id, (p) => ({ ...p, factOverrides: next, gate: 'unknown', screenConfirmedAt: '' }));
    else setDraft(next);
  };
  const reset = () => (saved ? plan.updateProject(saved.id, (p) => ({ ...p, factOverrides: {}, gate: 'unknown', screenConfirmedAt: '' })) : setDraft({}));
  const add = () => plan.addProject({ ...projectFromCard(crypto.randomUUID(), card, emptyContext()), factOverrides: draft });
  const remove = () => { if (!saved) return; setDraft(saved.factOverrides); plan.removeProject(saved.id); };
  const refresh = () => saved && plan.updateProject(saved.id, (p) => ({ ...p, task: { kind: 'library', snapshot: snapshotFromCard(card) }, gate: 'unknown', screenConfirmedAt: '' }));

  const missing = (k: FactKey) => typical[k] === null || typical[k] === undefined;
  const first = [...HARD_TASK_KEYS.filter(missing), ...SITE_KEYS];
  const rest = TASK_KEYS.filter((k) => !first.includes(k));
  const hints = Object.fromEntries([...first, ...rest].map((k) => [k, missing(k) ? 'Not established for this task. Answer it to get a verdict.' : `Typical: ${factText(k, typical, machines)}.`]));
  const restChanged = rest.filter((k) => answeredKeys(answers).includes(k)).length;
  const inputs = (keys: readonly FactKey[]) => <FactInputs facts={answers} typical={typical} onChange={change} keys={keys} labels={SITE_QUESTIONS} hints={hints} machineClasses={machineClasses} brief />;

  return <section id="check" className="jp-card check-card" aria-labelledby="check-title" data-verdict={result.verdict}>
    <div className="jp-card-head"><h2 id="check-title">Does it hold on {place.your}?</h2><p>The verdict starts from {place.typical}. Change what is different on yours and it updates as you answer.</p></div>
    {snapshot && snapshot.sources_reviewed_at !== card.sources_reviewed_at ? <p className="jp-notice">This record was reviewed again on {card.sources_reviewed_at}, after you added it. Your shortlist still uses the version from {snapshot.sources_reviewed_at}. <button type="button" className="jp-link" onClick={refresh}>Use the current record</button></p> : null}
    <CheckResult result={result} where={changed ? `on ${place.your}` : `on ${place.typical}`} machineLabel={(id) => machines[id] ?? id} solutionClasses={solutionClasses} record={{ verdict: card.reference_verdict, better: card.better_answer }} />
    <div className="check-questions">
      <h3 className="jp-h3">What is different on {place.your}?</h3>
      {inputs(first)}
      <details className="jp-details" open={restChanged > 0 || undefined}>
        <summary>The task itself is different{restChanged ? ` (${restChanged} changed)` : ''}</summary>
        {inputs(rest)}
      </details>
    </div>
    <div className="check-foot">
      <div className="flex flex-wrap items-center gap-6"><p className="check-echo"><span className="jp-muted">{changed ? `On ${place.your}` : `On ${place.typical}`}</span><VerdictLine verdict={result.verdict} /></p>{saved ? <Saved /> : null}</div>
      <div className="jp-actions">
        {changed ? <button type="button" className={ui.btnGhost} onClick={reset}>Back to typical</button> : null}
        {saved ? <>
          <span className="check-added" data-testid="task-added"><Icon name="pass" size={16} />In your shortlist</span>
          <button type="button" className={ui.btnGhost} onClick={remove}>Remove</button>
          <Link className={ui.btn} href="/plan">Go to my shortlist <Icon name="arrow" size={16} /></Link>
        </> : <button type="button" className={ui.btn} disabled={!plan.ready || full} onClick={add}>{full ? `Shortlist is full (${PROJECT_LIMIT})` : 'Add to my shortlist'}</button>}
      </div>
    </div>
  </section>;
}
