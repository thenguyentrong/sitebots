import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { CriterionResult, Excluded, MatchOutput, Ranked } from '@/lib/match/types';
import type { Requirements } from '@/lib/match/requirements';
import { FORM_FACTOR_LABEL } from '@/lib/spec/display';
import { cn } from '@/lib/utils';

const DOT: Record<CriterionResult['status'], string> = {
  pass: 'bg-trust-verified',
  partial: 'bg-trust-reported',
  fail: 'bg-destructive',
  unknown: 'bg-trust-unknown',
};

const STATUS_WORD: Record<CriterionResult['status'], string> = {
  pass: 'meets',
  partial: 'partly',
  fail: 'fails',
  unknown: 'unverified',
};

function robotHref(r: Ranked['robot']): string {
  return `/robots/${r.manufacturer_slug}/${r.model_slug}${r.variant === 'base' ? '' : `?variant=${r.variant}`}`;
}

export function CriterionRow({ c }: { c: CriterionResult }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className={cn('mt-[7px] inline-block h-2 w-2 shrink-0 rounded-full', DOT[c.status])} aria-hidden />
      <span className="w-24 shrink-0 text-muted">{c.label}</span>
      <span className="sr-only">{STATUS_WORD[c.status]}: </span>
      <span className={cn('min-w-0 flex-1', c.status === 'unknown' && 'text-faint')}>{c.text}</span>
      {c.kind === 'soft' && c.status !== 'unknown' ? <span className="num shrink-0 text-xs text-faint">{Math.round(c.score * 100)}</span> : null}
    </li>
  );
}

/** Score as a ring; the number inside is what is read, the arc is the glance. */
function ScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-14 w-14 place-items-center" title={`${pct} of 100`}>
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-14 w-14 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" className="ring-track" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" className="ring-value" strokeDasharray={`${(pct / 100) * c} ${c}`} />
      </svg>
      <span className="num text-base font-semibold leading-none">{pct}</span>
    </span>
  );
}

function PriceLine({ r }: { r: Ranked }) {
  if (!r.price) return <span className="text-xs text-faint">Quote only</span>;
  const basis = r.price.basis === 'listed' ? `listed in ${r.price.original.region}` : r.price.basis === 'converted' ? 'US list price converted' : 'reported estimate';
  return (
    <span className="text-right">
      <span className="num block text-base font-semibold">€{r.price.amount_eur.toLocaleString('en-GB')}</span>
      <span className="block text-xs text-faint">{basis}</span>
    </span>
  );
}

export function ResultCard({ r, rank }: { r: Ranked; rank: number }) {
  const known = r.results.filter((x) => x.status !== 'unknown').length;
  return (
    <article className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 px-5 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-subtle text-xs font-semibold text-muted">{rank}</span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight tracking-tight">
              <Link href={robotHref(r.robot)} className="underline-offset-4 hover:underline">
                {r.robot.name}
              </Link>
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span>{r.robot.manufacturer_name}</span>
              <span aria-hidden>·</span>
              <span>{FORM_FACTOR_LABEL[r.robot.form_factor]}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <PriceLine r={r} />
          <div className="flex items-center gap-3">
            <ScoreRing score={r.score} />
            <span className="text-xs text-faint">
              {known} of {r.results.length}
              <br />
              criteria known
            </span>
          </div>
        </div>
      </header>
      <ul className="grid gap-x-6 gap-y-2 border-t border-edge/70 bg-subtle/30 px-5 py-4 sm:grid-cols-2">
        {r.results.map((c) => (
          <CriterionRow key={c.id} c={c} />
        ))}
      </ul>
    </article>
  );
}

export function ExcludedList({ excluded }: { excluded: Excluded[] }) {
  if (!excluded.length) return null;
  return (
    <details className="card group overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5 text-sm font-medium">
        <span>
          {excluded.length} robot{excluded.length === 1 ? '' : 's'} excluded — a hard requirement failed
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-faint transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <ul className="divide-y divide-edge/60 border-t border-edge/70">
        {excluded.slice(0, 150).map((e) => (
          <li key={e.robot.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-5 py-2.5 text-sm">
            <Link href={robotHref(e.robot)} className="font-medium underline-offset-4 hover:underline">
              {e.robot.name}
            </Link>
            <span className="text-xs text-faint">{e.robot.manufacturer_name}</span>
            <span className="text-muted">{e.reasons.join(' · ')}</span>
          </li>
        ))}
        {excluded.length > 150 ? <li className="px-5 py-2 text-xs text-faint">and {excluded.length - 150} more</li> : null}
      </ul>
    </details>
  );
}

export function ResultList({ output, req }: { output: MatchOutput; req: Requirements }) {
  const n = output.ranked.length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">
          {n} robot{n === 1 ? '' : 's'} can do this
        </span>
        <Badge variant="neutral">{output.excluded.length} excluded</Badge>
        <Badge variant="outline">{output.considered} considered</Badge>
        {req.strict_unknowns ? <Badge variant="accent">strict</Badge> : null}
      </div>
      {n === 0 ? (
        <div className="card p-6 text-muted">
          Nothing passes every hard requirement. Loosen one, or switch off strict mode to see robots whose makers have not published the value.
        </div>
      ) : (
        output.ranked.map((r, i) => <ResultCard key={r.robot.id} r={r} rank={i + 1} />)
      )}
      <ExcludedList excluded={output.excluded} />
    </div>
  );
}
