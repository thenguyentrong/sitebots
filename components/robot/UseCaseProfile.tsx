import Link from 'next/link';
import { EvidenceBadge } from '@/components/robot/EvidenceBadge';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/lib/profile/profile';
import { cn } from '@/lib/utils';
import { ProfileToggle } from './ProfileToggle';
import { RadarChart } from './RadarChart';

const TASK_VARIANT = { yes: 'success', partial: 'warn', no: 'outline', unknown: 'neutral' } as const;

function pct(v: number | null) {
  return v === null ? null : Math.round(v * 100);
}

/** The RPG sheet: a spider chart of site conditions or tasks, the numbers beside it, the tasks below.
 * `collapsed` folds it behind its header line, which says how many axes rest on published values. */
export function UseCaseProfile({ profile, name, collapsed = false }: { profile: Profile; name: string; collapsed?: boolean }) {
  const site = (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <RadarChart
        axes={profile.axes.map((a) => ({ id: a.id, label: a.label }))}
        series={[{ name, values: profile.radar.site, tone: 0 }]}
        title={`${name}: site-condition profile`}
        desc={profile.axes.map((a) => `${a.label} ${a.coverage ? `${a.coverage.supported} of ${a.coverage.total} tasks supported, ${a.coverage.reported} reported, ${a.coverage.unknown} unconfirmed` : a.score === null ? 'unconfirmed' : `${pct(a.score)} of 100`}`).join(', ')}
        className="mx-auto max-w-full"
      />
      <ol className="divide-y divide-edge/60 text-sm">
        {profile.axes.map((a) => (
          <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 py-2 sm:flex sm:items-start" title={a.hint}>
            <span className="font-medium sm:w-28 sm:shrink-0">{a.label}</span>
            {a.coverage ? (
              <Badge variant={a.coverage.unknown || a.coverage.reported ? 'warn' : 'ink'} className="num shrink-0">{a.coverage.supported}/{a.coverage.total} supported</Badge>
            ) : a.score === null ? (
              <Badge variant="neutral" className="shrink-0">unconfirmed</Badge>
            ) : (
              <Badge variant={a.status === 'partial' ? 'warn' : 'ink'} className="num shrink-0">{pct(a.score)}</Badge>
            )}
            <span className="col-span-2 min-w-0 text-xs text-muted">{a.basis}{a.status === 'partial' ? ' · some parts not published' : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
  const tasks = (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <RadarChart
        axes={profile.tasks.map((t) => ({ id: t.id, label: t.label.replace('Navigate ', '').replace(' alone', '') }))}
        series={[{ name, values: profile.radar.tasks, tone: 1 }]}
        title={`${name}: site tasks`}
        desc={profile.tasks.map((t) => `${t.label}: ${t.status}`).join(', ')}
        className="mx-auto max-w-full"
      />
      <div className="space-y-3">
        {profile.buckets.map((b) => (
          <div key={b.id}>
            <p className="label mb-1.5">{b.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {b.tasks.map((t) => (
                <Badge key={t.id} variant={TASK_VARIANT[t.status]} dot={t.status !== 'unknown'} title={t.wording} className={cn(t.status === 'unknown' && 'opacity-70')}>
                  {t.label}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const confirmed = profile.axes.filter((a) => (a.coverage ? a.coverage.supported > 0 : a.score !== null)).length;
  const title = <h2 className="text-sm font-semibold">Robot evidence profile</h2>;
  const meta = (
    <span className="flex items-center gap-2 text-xs text-faint">
      {confirmed} of {profile.axes.length} axes confirmed · tasks <EvidenceBadge trust={profile.taskTrust} />
    </span>
  );
  const body = (
    <>
      <div className="px-5 py-4">
        <ProfileToggle site={site} tasks={tasks} />
      </div>
      <p className="border-t border-edge/70 bg-subtle/40 px-5 py-2.5 text-xs text-faint">
        Unweighted threshold ladders over published values, using the matcher&apos;s own rules; a gap means unconfirmed, never zero. Handling shows evidence coverage, not a performance score.{' '}
        <Link href="/methodology#profile" className="underline-offset-2 hover:text-foreground hover:underline">How the axes are built</Link>
      </p>
    </>
  );
  if (collapsed) {
    return (
      <details className="card group overflow-hidden" data-profile>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
          {title}
          <span className="flex items-center gap-3">
            {meta}
            <span className="text-xs font-medium underline underline-offset-2 group-open:hidden">Show</span>
            <span className="hidden text-xs font-medium underline underline-offset-2 group-open:inline">Hide</span>
          </span>
        </summary>
        <div className="border-t border-edge/70">{body}</div>
      </details>
    );
  }
  return (
    <section className="card overflow-hidden" data-profile>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        {title}
        {meta}
      </header>
      {body}
    </section>
  );
}
