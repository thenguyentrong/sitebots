import Link from 'next/link';
import { STATUS_LABELS } from '@/lib/market/cards';
import type { JobProof } from '@/lib/market/jobs';
import { ORDERABLE, STAGE_RANK } from '@/lib/market/match';
import { STAGE_LABELS } from '@/lib/market/vocab';

// Where robots have done one job, strongest proof first, for the map's job panel and the task page.
// Proof from robots not sold in Germany stays in: it answers whether robots can do the job at all.

const SHOWN = 3;

export function JobProofs({ proofs, compact = false }: { proofs: JobProof[]; compact?: boolean }) {
  if (!proofs.length) return <p className="mk-proofs-none" data-testid="job-proofs">No source shows a robot doing this job yet. Robots that fit it on paper are listed below: ask the seller for a trial on your site.</p>;
  const shown = proofs.slice(0, compact ? 1 : SHOWN);
  const rest = proofs.length - shown.length;
  const weaker = proofs.slice(shown.length).every((proof) => STAGE_RANK[proof.stage] < STAGE_RANK.pilot);
  return <div className="mk-proofs" data-testid="job-proofs">
    {compact ? null : <h3>Where robots have done it</h3>}
    <ul>{shown.map((proof) => {
      const here = ORDERABLE.includes(proof.status);
      return <li key={proof.robotId}>
        <span className={'mk-key-dot is-' + proof.stage + (here ? '' : ' is-abroad')} aria-hidden="true" />
        <div>
          <p><strong>{STAGE_LABELS[proof.stage]}</strong> · <Link href={proof.href}>{proof.name}</Link>{proof.where ? ' · ' + proof.where : ''}{proof.date ? ', ' + proof.date.slice(0, 4) : ''}</p>
          <p className="mk-fine">{proof.task}{proof.url ? <> · <a href={proof.url} target="_blank" rel="noopener noreferrer">source ↗</a></> : null}</p>
        </div>
        <span className="mk-status" data-s={proof.status}>{STATUS_LABELS[proof.status]}</span>
      </li>;
    })}</ul>
    {rest > 0 && !compact ? <p className="mk-fine">{rest} more robot{rest > 1 ? 's' : ''} with {weaker ? 'a demo or the maker’s word' : 'proof'} for this job, on their own pages.</p> : null}
  </div>;
}

