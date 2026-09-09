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

/** The RPG sheet: a spider chart of site conditions or tasks, the numbers beside it, the tasks below. */
export function UseCaseProfile({ profile, name }: { profile: Profile; name: string }) {
  const site = (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <RadarChart
        axes={profile.axes.map((a) => ({ id: a.id, label: a.label }))}
        series={[{ name, values: profile.radar.site, tone: 0 }]}
        title={`${name}: site-condition profile`}
        desc={profile.axes.map((a) => `${a.label} ${a.score === null ? 'not published' : `${pct(a.score)} of 100`}`).join(', ')}
        className="mx-auto max-w-full"
      />
      <ol className="divide-y divide-edge/60 text-sm">
        {profile.axes.map((a) => (
          <li key={a.id} className="flex items-start gap-3 py-2" title={a.hint}>
            <span className="w-28 shrink-0 font-medium">{a.label}</span>
            {a.score === null ? (
              <Badge variant="neutral" className="shrink-0">not published</Badge>
            ) : (
              <Badge variant={a.status === 'partial' ? 'warn' : 'ink'} className="num shrink-0">{pct(a.score)}</Badge>
            )}
            <span className="min-w-0 text-xs text-muted">{a.basis}{a.status === 'partial' ? ' · some parts not published' : ''}</span>
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
  return (
    <section className="card overflow-hidden" data-profile>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold">Construction profile</h2>
        <span className="flex items-center gap-2 text-xs text-faint">
          tasks <EvidenceBadge trust={profile.taskTrust} />
        </span>
      </header>
      <div className="px-5 py-4">
        <ProfileToggle site={site} tasks={tasks} />
      </div>
      <p className="border-t border-edge/70 bg-subtle/40 px-5 py-2.5 text-xs text-faint">
        Unweighted threshold ladders over published values, using the matcher&apos;s own rules; a gap means not published, never zero.{' '}
        <Link href="/methodology#profile" className="underline-offset-2 hover:text-foreground hover:underline">How the axes are built</Link>
      </p>
    </section>
  );
}
