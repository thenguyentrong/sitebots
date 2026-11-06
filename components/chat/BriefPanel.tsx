import { TEXT, type Lang } from '@/lib/chat/i18n';
import type { BriefFact } from '@/lib/chat/tools';

function Facts({ facts, lang }: { facts: BriefFact[]; lang: Lang }) {
  const t = TEXT[lang];
  const known = facts.filter((fact) => fact.state !== 'open');
  const open = facts.filter((fact) => fact.state === 'open');
  return <>
    {known.length ? <dl className="space-y-2.5">
      {known.map((fact) => <div key={fact.key + fact.value} className="adv-fact -mx-2 rounded-lg px-2 py-0.5">
        <dt className="text-xs text-muted">{fact.key === 'shortlist' ? t.shortlist : fact.label}</dt>
        <dd className="text-sm">{fact.state === 'not_needed' ? t.notImportant : fact.value}{fact.state === 'assumed' && fact.key !== 'shortlist' ? <span className="text-muted"> ({t.myGuess})</span> : null}</dd>
      </div>)}
    </dl> : null}
    {open.length ? <div className={known.length ? 'mt-4' : ''}>
      <h3 className="text-xs text-muted">{t.stillOpen}</h3>
      <p className="mt-1 text-sm">{open.map((fact) => fact.label).join(', ')}</p>
    </div> : null}
  </>;
}

/** What the adviser has understood so far, so the person can see and correct it at any moment. */
export function BriefPanel({ facts, reportHref, lang }: { facts: BriefFact[]; reportHref: string | null; lang: Lang }) {
  if (!facts.length) return null;
  const t = TEXT[lang];
  const known = facts.filter((fact) => fact.state !== 'open').length;
  return <>
    <details className="rounded-2xl border border-edge bg-card px-4 py-3 lg:hidden">
      <summary className="cursor-pointer text-sm font-medium">{t.facts(known)}</summary>
      <div className="mt-3"><Facts facts={facts} lang={lang} /></div>
    </details>
    <aside aria-label="Your brief" className="hidden lg:block">
      <div className="sticky top-6 rounded-2xl border border-edge bg-card p-4">
        <h2 className="text-sm font-semibold">{t.brief}</h2>
        <p className="mt-0.5 mb-4 text-xs text-muted">{t.briefHint}</p>
        <Facts facts={facts} lang={lang} />
        {reportHref ? <a href={reportHref} className="mt-4 block text-sm underline underline-offset-4">{t.pdf}</a> : null}
      </div>
    </aside>
  </>;
}
