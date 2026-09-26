import { RULE_IDS, type RuleId, type RuleStatus, type SolutionClassId, type Verdict } from '@/lib/content/vocab';
import { VERDICT_HINTS, VERDICT_LABELS } from '@/lib/journey/labels';
import { formatMessage } from '@/lib/screen/messages';
import type { ScreenResult } from '@/lib/screen/types';
import type { L10n } from '@/lib/content/l10n';
import type { LabelMap } from '@/lib/tasks/types';
import { Icon } from './Icon';
import { HoldsBack, TestStrip } from './TestStrip';

export const VERDICT_ICON = { candidate: 'pass', marginal: 'marginal', ruled_out: 'fail', unscreened: 'unknown' } as const;

/** The verdict in one line: mark, word, colour. */
export function VerdictLine({ verdict }: { verdict: Verdict }) {
  return <span className={'verdict-big verdict-' + verdict}><Icon name={VERDICT_ICON[verdict]} size={16} />{VERDICT_LABELS[verdict]}</span>;
}

/** Each test's reason as a sentence; machine classes by name. */
export function reasonsOf(result: ScreenResult, machineLabel: (id: string) => string): Partial<Record<RuleId, string>> {
  const reasons: Partial<Record<RuleId, string>> = {};
  for (const id of RULE_IDS) {
    const r = result.results[id];
    const machines = r.params?.machines;
    const params = typeof machines === 'string' ? { ...r.params, machines: machines.split(', ').map(machineLabel).join(', ') } : r.params;
    reasons[id] = formatMessage(r.message, params);
  }
  return reasons;
}

/** The one sentence that explains a verdict: the failing test, the open hard test, or the borderline one. */
export function mainReason(result: ScreenResult, machineLabel: (id: string) => string): string {
  const reasons = reasonsOf(result, machineLabel);
  const first = (status: RuleStatus, hardOnly: boolean) => RULE_IDS.find((rule) => result.results[rule].status === status && (!hardOnly || result.results[rule].kind === 'hard'));
  const id = result.verdict === 'ruled_out' ? first('fail', false) : result.verdict === 'unscreened' ? first('unknown', true) : result.verdict === 'marginal' ? first('marginal', false) : undefined;
  return id ? reasons[id] ?? '' : 'Passes the five tests.';
}

type RecordAnswer = { verdict: Verdict; better: { class: SolutionClassId | null; note: L10n } };

/**
 * A screened task: where it was judged, the verdict, the ten tests, what
 * holds it back, then the better answer (ruled out) or what to compare next.
 * A library record's own note replaces the engine's sentence where both name
 * the same better answer.
 */
export function CheckResult({ result, where, machineLabel, solutionClasses, record }: { result: ScreenResult; where: string; machineLabel: (id: string) => string; solutionClasses: LabelMap; record?: RecordAnswer }) {
  const reasons = reasonsOf(result, machineLabel);
  const statuses = Object.fromEntries(RULE_IDS.map((id) => [id, result.results[id].status])) as Record<RuleId, RuleStatus>;
  // While hard tests are open, list only those (once per sentence); the advisory ones stay visible as dashed tiles.
  const shown = (id: RuleId) => result.results[id].status !== 'pass' && (result.verdict !== 'unscreened' || result.results[id].status !== 'unknown' || result.results[id].kind === 'hard');
  const holds = RULE_IDS.filter(shown).map((id) => ({ id, status: result.results[id].status, text: reasons[id] ?? '' })).filter((item, i, all) => all.findIndex((other) => other.text === item.text) === i);
  const label = (c: string) => solutionClasses[c]?.en ?? c.replaceAll('_', ' ');
  const better = result.better_answer.class;
  const others = result.suggested_solution_classes.filter((c) => c !== better);
  const compare = result.suggested_solution_classes.length ? result.suggested_solution_classes : (['mobile_manipulator_wheeled', 'humanoid'] as SolutionClassId[]);
  const recordNote = record?.better.note.en ?? '';
  return <div className="check-result" data-verdict={result.verdict} data-testid="check-result">
    <div className="check-verdict">
      <p className="check-verdict-line"><VerdictLine verdict={result.verdict} /><span className="jp-muted">{where}</span></p>
      <p className="jp-muted">{VERDICT_HINTS[result.verdict]}</p>
    </div>
    <TestStrip statuses={statuses} reasons={reasons} />
    <HoldsBack items={holds} />
    {result.verdict === 'ruled_out' ? <div className="better-answer" data-testid="better-answer"><Icon name="better" size={16} /><div>
      {better && record?.better.class === better && recordNote ? <><strong>Better answer: {label(better)}</strong>{recordNote}</> : <strong>{formatMessage(result.better_answer.message)}</strong>}
      {others.length ? <span className="jp-muted mt-1 block">Also worth comparing: {others.map(label).join(', ')}.</span> : null}
    </div></div>
      : result.verdict !== 'unscreened' ? <div className="flex flex-col gap-3">
        <div className="compare-next"><strong>Compare next</strong>{compare.map((c) => <span key={c}>{label(c)}</span>)}</div>
        {record && record.verdict !== 'ruled_out' && recordNote ? <p className="jp-muted">{recordNote}</p> : null}
      </div> : null}
  </div>;
}
