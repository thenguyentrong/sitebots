import type { Verdict } from '@/lib/content/vocab';
import { VERDICT_LABELS } from '@/lib/journey/labels';

export function VerdictBadge({ verdict, reference = false }: { verdict: Verdict; reference?: boolean }) {
  return <span className={'verdict verdict-' + verdict} data-verdict={verdict} title={reference ? 'Verdict for a typical site in this trade' : undefined}>{VERDICT_LABELS[verdict]}</span>;
}
