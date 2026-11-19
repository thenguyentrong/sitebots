import type { Dossier } from '@/lib/market/schema';
import { missingFields } from '@/lib/market/research';
import { marketSourceLabel, researchFieldLabel } from '@/lib/market/display';
import { Badge } from '@/components/ui/badge';
import { recordLang, type Lang } from '@/lib/i18n/config';
import { EVIDENCE_TEXT, recordDay } from '@/lib/i18n/robot';

/** Configuration evidence stays separate from the catalogue model's scored axes. Task, place, notes and
 * open questions are the record's words. */
export function ConfigurationEvidence({ robots, lang = 'en' }: { robots: Dossier[]; lang?: Lang }) {
  if (!robots.length) return null;
  const t = EVIDENCE_TEXT[lang];
  const rl = recordLang(lang);
  return <div className="space-y-3" data-configuration-evidence>
    <div>
      <h3 className="text-sm font-semibold">{t.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t.intro}</p>
    </div>
    {robots.map(robot => {
      const gaps = missingFields(robot);
      const counts = ['claim', 'demo', 'pilot', 'deployment'].map(stage => ({ stage, count: robot.evidence.filter(e => e.stage === stage).length })).filter(x => x.count);
      return <details key={robot.id} className="rounded-xl border border-edge">
        <summary className="cursor-pointer px-4 py-3 text-sm">
          <span className="font-medium">{robot.name}</span>
          <span className="mt-1 block text-xs text-muted">{counts.length ? counts.map(x => t.count(x.stage, x.count)).join(' · ') : t.noEvidence} · {t.missingFields(gaps.length)}</span>
        </summary>
        <div className="space-y-4 border-t border-edge px-4 py-4">
          {robot.variant ? <p className="text-xs text-muted">{t.configuration}<span lang={rl}>{robot.variant}</span></p> : null}
          {robot.evidence.length ? <ol className="space-y-4">{robot.evidence.map((e, i) => {
            const source = robot.sources.find(s => s.id === e.sourceId);
            return <li key={i} className="space-y-1.5 text-sm">
              <Badge variant={e.stage === 'deployment' ? 'info' : 'neutral'}>{t.stage[e.stage] ?? e.stage}</Badge>
              <p className="font-medium" lang={rl}>{e.task}</p>
              <p className="text-xs text-muted">{e.where ? <span lang={rl}>{e.where}</span> : t.noPlace} · {e.date || t.noDate}</p>
              {e.note ? <p className="text-xs leading-relaxed text-muted" lang={rl}>{e.note}</p> : null}
              {source ? <p className="text-xs text-muted"><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{source.publisher} ↗</a> · {marketSourceLabel(source, lang)} · {t.checked} <time dateTime={source.checkedAt}>{recordDay(source.checkedAt, lang)}</time></p> : null}
            </li>;
          })}</ol> : <p className="text-sm text-muted">{t.none}</p>}
          <div className="rounded-lg bg-subtle p-3 text-xs leading-relaxed">
            <p className="font-medium">{t.stillMissing}</p>
            <p className="mt-1 text-muted">{gaps.length ? gaps.map(field => researchFieldLabel(field, lang)).join(' · ') : t.complete}</p>
            {robot.openQuestions.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-muted" lang={rl}>{robot.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul> : null}
          </div>
          <a href={'#configuration-' + robot.id} className="text-xs font-medium underline underline-offset-2">{t.view}</a>
        </div>
      </details>;
    })}
  </div>;
}
