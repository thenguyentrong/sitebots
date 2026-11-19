import geography from '@/data/manufacturers/countries.json';
import type { UsePoint } from '@/lib/market/use-case-views';
import { STAGE_COLOR, STAGE_SHORT, StageLegend } from './parts';

// Where the uses are: one dot per town (or per country when no town is named), sized by the number of uses and
// coloured by the furthest stage there. The world view and a Europe close-up share one set of country shapes.

const WORLD = { box: '0 38 900 300', k: 1 };
const EUROPE = { box: '420 56 124 86', k: 0.3 };

function Dots({ points, k, href }: { points: UsePoint[]; k: number; href: (code: string) => string }) {
  return <g>{points.map((p) => {
    const r = (2.4 + Math.sqrt(p.count) * 2.1) * k;
    const detail = (['deployment', 'pilot', 'demo'] as const).filter((s) => p.stages[s]).map((s) => `${p.stages[s]} ${STAGE_SHORT[s][p.stages[s] === 1 ? 0 : 1]}`).join(', ');
    return <a key={p.id} href={href(p.country)} aria-label={`${p.label}: ${p.count} use${p.count === 1 ? '' : 's'}`}>
      <title>{`${p.label}: ${p.count} use${p.count === 1 ? '' : 's'} (${detail})`}</title>
      {/* A hit area bigger than the dot, so small towns are easy to point at. */}
      <circle cx={p.x} cy={p.y} r={Math.max(r, 6 * k)} fill="transparent" />
      <circle cx={p.x} cy={p.y} r={r} fill={STAGE_COLOR[p.best]} fillOpacity={0.9} stroke="var(--card)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="transition-opacity hover:opacity-80" />
      {p.count >= 6 ? <text x={p.x} y={p.y + r * 0.36} textAnchor="middle" fontSize={r * 1.05} fontWeight={700} fill="var(--card)" pointerEvents="none">{p.count}</text> : null}
    </a>;
  })}</g>;
}

export function UseMap({ points, active, selected, href }: { points: UsePoint[]; active: Set<string>; selected?: string; href: (code: string) => string }) {
  const europe = points.filter((p) => { const lon = p.x / 2.5 - 180; const lat = 90 - p.y / 2.5; return lon > -12 && lon < 38 && lat > 34 && lat < 66; });
  return <div className="grid grid-cols-1 gap-px bg-edge/60 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
    <figure className="relative bg-card">
      <svg viewBox={WORLD.box} className="block h-auto w-full" role="group" aria-label="World map of documented robot uses">
        {/* Every country comes from one cached picture; only the countries with uses are drawn in the page. */}
        <image href="/maps/world.svg" x={0} y={0} width={900} height={450} />
        <defs>
          <g id="uc-countries">
            {geography.countries.filter((c) => active.has(c.code)).map((c, i) => <path key={c.code + i} d={c.path} fill={c.code === selected ? 'var(--accent-soft)' : 'var(--edge-strong)'} stroke="var(--card)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />)}
          </g>
        </defs>
        <use href="#uc-countries" />
        <Dots points={points} k={WORLD.k} href={href} />
      </svg>
      <figcaption className="absolute bottom-3 left-4 text-[11px] font-medium uppercase tracking-wider text-faint">World</figcaption>
    </figure>
    <figure className="relative bg-card">
      <svg viewBox={EUROPE.box} className="block h-auto w-full" role="group" aria-label="Close-up of Europe">
        <image href="/maps/world.svg" x={0} y={0} width={900} height={450} />
        <use href="#uc-countries" />
        <Dots points={europe} k={EUROPE.k} href={href} />
      </svg>
      <figcaption className="absolute bottom-3 left-4 text-[11px] font-medium uppercase tracking-wider text-faint">Europe close-up</figcaption>
    </figure>
    <div className="flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-3 lg:col-span-2">
      <StageLegend />
      <span className="text-xs text-faint">Dot size: number of uses. Towns where the source names one, else the country.</span>
    </div>
  </div>;
}
