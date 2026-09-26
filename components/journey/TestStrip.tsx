import type { RuleId, RuleStatus } from '@/lib/content/vocab';
import { RULE_LABELS, STATUS_LABELS, TEST_SHORT } from '@/lib/journey/labels';
import { Icon } from './Icon';

export const HARD_RULES: RuleId[] = ['T1_mass', 'T2_dust', 'T3_incumbent', 'T4_variability', 'T5_failure_tolerance'];
export const ADVISORY_RULES: RuleId[] = ['X1_reach', 'X2_outdoor', 'X3_data', 'X4_runtime', 'X5_atex'];

function Tile({ id, status, reason }: { id: RuleId; status: RuleStatus; reason?: string }) {
  return <div role="listitem" className="test-tile" data-rule={id} data-status={status} title={`${RULE_LABELS[id]}: ${STATUS_LABELS[status]}${reason ? '. ' + reason : ''}`}>
    <span className="test-tile-icon"><Icon name={id} size={16} /></span>
    <span className="test-tile-status" aria-label={STATUS_LABELS[status]}><Icon name={status === 'flag' ? 'flag' : status} size={11} /></span>
    <span className="test-tile-label">{TEST_SHORT[id]}</span>
  </div>;
}

/** The five hard tests as tiles; the advisory ones smaller underneath only when asked for. Status by colour and mark, reason on hover. */
export function TestStrip({ statuses, reasons, advisory = false }: { statuses: Record<RuleId, RuleStatus>; reasons?: Partial<Record<RuleId, string>>; advisory?: boolean }) {
  return <div className="test-strip" aria-label="The five tests">
    <div className="test-tiles" role="list" aria-label="Five hard tests">{HARD_RULES.map((id) => <Tile key={id} id={id} status={statuses[id]} reason={reasons?.[id]} />)}</div>
    {advisory ? <div className="test-tiles is-advisory" role="list" aria-label="Five advisory tests">{ADVISORY_RULES.map((id) => <Tile key={id} id={id} status={statuses[id]} reason={reasons?.[id]} />)}</div> : null}
  </div>;
}

/** Five dots for a card: the hard tests at a glance. */
export function TestDots({ statuses }: { statuses: Record<RuleId, RuleStatus> }) {
  return <span className="test-dots" aria-label={HARD_RULES.map((id) => `${TEST_SHORT[id]}: ${STATUS_LABELS[statuses[id]]}`).join(', ')}>
    {HARD_RULES.map((id) => <span key={id} data-status={statuses[id]} />)}
  </span>;
}

/** What is not a plain pass, with the reason: the part a visitor has to read. */
export function HoldsBack({ items }: { items: { id: RuleId; status: RuleStatus; text: string }[] }) {
  if (!items.length) return <p className="holds-back-clear"><Icon name="pass" size={14} /> Every test passes.</p>;
  return <ul className="holds-back">
    {items.map((item) => <li key={item.id} data-status={item.status}><Icon name={item.status === 'flag' ? 'flag' : item.status} size={14} /><span><strong>{RULE_LABELS[item.id]}:</strong> {item.text}</span></li>)}
  </ul>;
}
