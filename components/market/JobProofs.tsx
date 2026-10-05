import Link from 'next/link';
import { STATUS_LABELS } from '@/lib/market/cards';
import type { JobProof } from '@/lib/market/jobs';
import { ORDERABLE, STAGE_RANK } from '@/lib/market/match';
import { PROOF, PROOF_LABELS, STAGE_LABELS } from '@/lib/market/vocab';

// Where robots have done one job, strongest proof first, for the map's job panel and the task page.
// Proof from robots not sold in Germany stays in: it answers whether robots can do the job at all.

const SHOWN = 3;

/** The proof ladder: five steps from no proof to daily use, filled up to this job's best proof, with
 *  the number of robots whose best proof for the job is on each step. */
function ProofLadder({ proofs, fits }: { proofs: JobProof[]; fits: number }) {
  const best = proofs.reduce((rank, proof) => Math.max(rank, STAGE_RANK[proof.stage]), 0);
  return <ol className="mk-ladder" aria-label={'How far robots have got with this job: ' + PROOF_LABELS[PROOF[best]].toLowerCase()}>
    {PROOF.map((level, index) => {
      const robots = index ? proofs.filter((proof) => STAGE_RANK[proof.stage] === index).length : fits;
      return <li key={level} className={'is-' + level} data-reached={index <= best ? '' : undefined} aria-current={index === best ? 'step' : undefined}>
        <span className="mk-ladder-bar" aria-hidden="true" />
        <strong>{PROOF_LABELS[level]}</strong>
        <small>{index ? (robots ? robots + ' robot' + (robots > 1 ? 's' : '') : '–') : fits ? fits + ' fit on paper' : 'none fits yet'}</small>
      </li>;
    })}
  </ol>;
}

/** `fits`: robots you can buy here that fit the job on paper, shown on the ladder's first step. */
export function JobProofs({ proofs, fits }: { proofs: JobProof[]; fits: number }) {
  if (!proofs.length) return <div className="mk-proofs is-empty" data-testid="job-proofs">
    <ProofLadder proofs={proofs} fits={fits} />
    <p className="mk-proofs-none">No source shows a robot doing this job yet. {fits ? 'Robots that fit it on paper are listed below: ask the seller for a trial on your site.' : 'This job stays with people for now.'}</p>
  </div>;
  const shown = proofs.slice(0, SHOWN);
  const rest = proofs.length - shown.length;
  const weaker = proofs.slice(shown.length).every((proof) => STAGE_RANK[proof.stage] < STAGE_RANK.pilot);
  return <div className="mk-proofs" data-testid="job-proofs">
    <ProofLadder proofs={proofs} fits={fits} />
    <h3>Where robots have done it</h3>
    <ul>{shown.map((proof) => {
      const here = ORDERABLE.includes(proof.status);
      return <li key={proof.robotId}>
        <span className="mk-proof-thumb" data-in-use={proof.photo?.inUse ? '' : undefined}>
          {proof.photo ? <img src={proof.photo.src} alt="" width={proof.photo.width} height={proof.photo.height} loading="lazy" decoding="async" /> : null}
        </span>
        <div>
          <p><span className={'mk-key-dot is-' + proof.stage + (here ? '' : ' is-abroad')} aria-hidden="true" /><strong>{STAGE_LABELS[proof.stage]}</strong> · <Link href={proof.href}>{proof.name}</Link>{proof.where ? ' · ' + proof.where : ''}{proof.date ? ', ' + proof.date.slice(0, 4) : ''}</p>
          <p className="mk-fine">{proof.task}{proof.url ? <> · <a href={proof.url} target="_blank" rel="noopener noreferrer">source ↗</a></> : null}{proof.photo ? ' · photo: ' + proof.photo.credit : ''}</p>
        </div>
        <span className="mk-status" data-s={proof.status}>{STATUS_LABELS[proof.status]}</span>
      </li>;
    })}</ul>
    {rest > 0 ? <p className="mk-fine">{rest} more robot{rest > 1 ? 's' : ''} with {weaker ? 'a demo or the maker’s word' : 'proof'} for this job, on their own pages.</p> : null}
  </div>;
}
