import type { Dossier } from '@/lib/market/schema';
import { FIELDS, missingFields } from '@/lib/market/research';
import { marketSourceLabel } from '@/lib/market/display';
import { Badge } from '@/components/ui/badge';

const STAGES: Record<string, string> = { claim: 'Published claim', demo: 'Demonstration', pilot: 'Pilot', deployment: 'Deployment' };

/** Configuration evidence stays separate from the catalogue model's scored axes. */
export function ConfigurationEvidence({ robots }: { robots: Dossier[] }) {
  if (!robots.length) return null;
  return <div className="space-y-3" data-configuration-evidence>
    <div>
      <h3 className="text-sm font-semibold">Evidence for each configuration</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">Claims, demonstrations, pilots and deployments describe different levels of evidence. A demonstration does not establish working-site readiness.</p>
    </div>
    {robots.map(robot => {
      const gaps = missingFields(robot);
      const counts = ['claim', 'demo', 'pilot', 'deployment'].map(stage => ({ stage, count: robot.evidence.filter(e => e.stage === stage).length })).filter(x => x.count);
      return <details key={robot.id} className="rounded-xl border border-edge">
        <summary className="cursor-pointer px-4 py-3 text-sm">
          <span className="font-medium">{robot.name}</span>
          <span className="mt-1 block text-xs text-muted">{counts.length ? counts.map(x => `${x.count} ${STAGES[x.stage].toLowerCase()}${x.count === 1 ? '' : 's'}`).join(' · ') : 'No task evidence recorded'} · {gaps.length} missing capability fields</span>
        </summary>
        <div className="space-y-4 border-t border-edge px-4 py-4">
          {robot.variant ? <p className="text-xs text-muted">Configuration: {robot.variant}</p> : null}
          {robot.evidence.length ? <ol className="space-y-4">{robot.evidence.map((e, i) => {
            const source = robot.sources.find(s => s.id === e.sourceId);
            return <li key={i} className="space-y-1.5 text-sm">
              <Badge variant={e.stage === 'deployment' ? 'info' : 'neutral'}>{STAGES[e.stage] ?? e.stage}</Badge>
              <p className="font-medium">{e.task}</p>
              <p className="text-xs text-muted">{e.where || 'Location not recorded'} · {e.date || 'Event date not recorded'}</p>
              {e.note ? <p className="text-xs leading-relaxed text-muted">{e.note}</p> : null}
              {source ? <p className="text-xs text-muted"><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{source.publisher} ↗</a> · {marketSourceLabel(source)} · checked <time dateTime={source.checkedAt}>{source.checkedAt}</time></p> : null}
            </li>;
          })}</ol> : <p className="text-sm text-muted">No task claim, demonstration, pilot or deployment has been recorded for this configuration.</p>}
          <div className="rounded-lg bg-subtle p-3 text-xs leading-relaxed">
            <p className="font-medium">What is still missing</p>
            <p className="mt-1 text-muted">{gaps.length ? gaps.map(field => FIELDS[field].label).join(' · ') : 'All tracked capability fields have values. Conditions and task suitability still need checking.'}</p>
            {robot.openQuestions.length ? <ul className="mt-2 list-disc space-y-1 pl-4 text-muted">{robot.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul> : null}
          </div>
          <a href={'#configuration-' + robot.id} className="text-xs font-medium underline underline-offset-2">View configuration specifications and source text</a>
        </div>
      </details>;
    })}
  </div>;
}
