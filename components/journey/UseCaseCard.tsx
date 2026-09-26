import Link from 'next/link';
import { VARIABILITY_LABELS } from '@/lib/journey/labels';
import type { LabelMap, TaskCard } from '@/lib/tasks/types';
import { Icon } from './Icon';
import { VerdictBadge } from './VerdictBadge';

const num = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 2 });

/** The requirement line on a card: heaviest object with its size, the tolerance, the variability. */
export function requirementLine(card: TaskCard): string[] {
  const mass = card.facts.object_mass_kg;
  const size = card.requirements?.object_size_m?.value ?? null;
  const tol = card.requirements?.tolerance_mm?.value ?? null;
  const weight = mass ? (mass.max === 0 ? 'no payload' : `up to ${num(mass.max)} kg`) : 'mass open';
  return [
    size ? `${weight}, ${num(size.max)} m` : weight,
    tol !== null ? `±${num(tol)} mm` : '',
    card.facts.variability ? `${VARIABILITY_LABELS[card.facts.variability].split(':')[0].toLowerCase()} variability` : '',
  ].filter(Boolean);
}

/** One library task on the /use-cases grid. Server-rendered; the check happens on the task page. */
export function UseCaseCard({ card, settings, lbOf = {}, families, solutionClasses, showSetting = true }: { card: TaskCard; settings: LabelMap; lbOf?: Record<string, string>; families: LabelMap; solutionClasses: LabelMap; showSetting?: boolean }) {
  const href = `/use-cases/${card.setting}/${card.slug}`;
  const where = [lbOf[card.setting] ?? '', showSetting ? settings[card.setting]?.en ?? card.setting : ''].filter(Boolean).join(' ');
  return <article className="jp-card use-case-card" data-task={card.id} data-verdict={card.reference_verdict}>
    <div className="use-case-top"><Icon name={card.family} size={16} /><span className="jp-small">{families[card.family]?.en ?? card.family}</span><VerdictBadge verdict={card.reference_verdict} /></div>
    <h3><Link href={href}>{card.title.en}</Link></h3>
    <p className="use-case-summary">{card.summary.en}</p>
    <p className="use-case-meta">{[where, ...requirementLine(card)].filter(Boolean).join(', ')}</p>
    {card.reference_verdict === 'ruled_out' && card.better_answer.class ? <p className="use-case-better"><Icon name="better" size={16} /><span><span className="font-medium">Better answer: </span>{solutionClasses[card.better_answer.class]?.en ?? card.better_answer.class}</span></p> : null}
    <div className="use-case-actions"><span className="use-case-rule" aria-hidden="true" /><Link className="use-case-check" href={href + '#check'}>Check for my site <Icon name="arrow" size={16} /></Link></div>
  </article>;
}
