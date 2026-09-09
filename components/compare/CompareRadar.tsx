import { RadarChart } from '@/components/robot/RadarChart';
import { profileFor } from '@/lib/profile/profile';
import type { CompareRow } from '@/lib/queries/compare';

/** Up to four site-condition profiles on one chart. A CompareRow has the shape the scorer needs. */
export function CompareRadar({ rows }: { rows: CompareRow[] }) {
  const profiles = rows.map((r) => ({ name: r.card.name, profile: profileFor(r) }));
  const axes = profiles[0].profile.axes.map((a) => ({ id: a.id, label: a.label }));
  return (
    <section className="card mb-6 overflow-hidden" data-compare-radar>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/70 px-5 py-3.5">
        <h2 className="text-sm font-semibold">Site-condition profiles</h2>
        <ul className="flex flex-wrap gap-3 text-xs">
          {profiles.map((p, i) => (
            <li key={p.name} className={`radar-s${i} flex items-center gap-1.5`}>
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'var(--radar)' }} aria-hidden />
              {p.name}
            </li>
          ))}
        </ul>
      </header>
      <div className="grid gap-6 px-5 py-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <RadarChart axes={axes} series={profiles.map((p, i) => ({ name: p.name, values: p.profile.radar.site, tone: i as 0 | 1 | 2 | 3 }))} size={360} title="Site-condition profiles compared" className="mx-auto max-w-full" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-muted">
                <th className="py-1.5 pr-3 font-medium">Axis</th>
                {profiles.map((p) => (
                  <th key={p.name} className="py-1.5 pr-3 font-medium">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {axes.map((a, i) => (
                <tr key={a.id} className="border-t border-edge/60">
                  <td className="py-1.5 pr-3 text-muted">{a.label}</td>
                  {profiles.map((p) => {
                    const v = p.profile.axes[i].score;
                    return (
                      <td key={p.name} className="num py-1.5 pr-3 font-medium">{v === null ? <span className="font-normal text-faint">not published</span> : Math.round(v * 100)}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-faint">Unweighted ladders over published values; a gap on the chart means not published.</p>
        </div>
      </div>
    </section>
  );
}
