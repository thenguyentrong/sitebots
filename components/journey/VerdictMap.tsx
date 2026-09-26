import type { Variability, Verdict } from '@/lib/content/vocab';

export type MapPoint = { id: string; label: string; mass: number | null; variability: Variability | null; verdict: Verdict; active?: boolean };

const W = 640;
const H = 280;
const L = 96;
const R = 16;
const T = 24;
const B = 48;
const xFor = (kg: number) => L + ((Math.log10(Math.max(kg, 0.01)) + 2) / 6) * (W - L - R);
const Y: Record<Variability, number> = { high: T + 32, medium: (T + H - B) / 2, low: H - B - 32 };

/**
 * The whole screen on two axes: handled mass (log) against task variability.
 * Right of the 15 kg line is too heavy; the 20–25 kg band is the ceiling of the
 * current humanoid generation. Variability is an analyst judgement, not a
 * measurement, and the axis says so.
 */
export function VerdictMap({ points, caption }: { points: MapPoint[]; caption?: string }) {
  const placed = points.filter((p) => p.mass !== null && p.variability !== null) as (MapPoint & { mass: number; variability: Variability })[];
  const unplaced = points.filter((p) => p.mass === null || p.variability === null);
  const seen = new Map<string, number>();
  const dots = placed.map((p) => {
    const x = xFor(p.mass);
    const key = `${Math.round(x / 14)}:${p.variability}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const offset = n === 0 ? 0 : (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 14;
    return { ...p, x, y: Y[p.variability] + offset };
  });
  return <figure className="verdict-map">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption ?? 'Tasks by handled mass and variability'}>
      <rect x={xFor(20)} y={T} width={xFor(25) - xFor(20)} height={H - T - B} className="map-ceiling" />
      <line x1={xFor(15)} x2={xFor(15)} y1={T} y2={H - B} className="map-design" />
      <text x={xFor(15)} y={T - 8} textAnchor="middle" className="map-text">15 kg design limit · 20–25 kg ceiling</text>
      {(['low', 'medium', 'high'] as const).map((level) => <g key={level}><line x1={L} x2={W - R} y1={Y[level]} y2={Y[level]} className="map-line" /><text x={L - 12} y={Y[level] + 4} textAnchor="end" className="map-text">{level}</text></g>)}
      {[0.1, 1, 10, 100, 1000, 10000].map((v) => <text key={v} x={xFor(v)} y={H - B + 20} textAnchor="middle" className="map-text">{v >= 1000 ? `${v / 1000} t` : `${v} kg`}</text>)}
      <text x={(L + W - R) / 2} y={H - 8} textAnchor="middle" className="map-text">Heaviest object handled, log scale</text>
      <text transform={`translate(16 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" className="map-text">Variability (judgement)</text>
      {dots.map((d) => <circle key={d.id} cx={d.x} cy={d.y} r={d.active ? 8 : 6} className={`map-dot map-dot-${d.verdict}${d.active ? ' is-active' : ''}`}><title>{`${d.label}: ${d.mass} kg, ${d.variability} variability`}</title></circle>)}
    </svg>
    <div className="map-legend"><span className="l-candidate">Candidate</span><span className="l-marginal">Marginal</span><span className="l-ruled_out">Ruled out</span><span className="l-unscreened">Unscreened</span>{unplaced.length ? <span className="l-none">Not placed yet: {unplaced.map((p) => p.label).join(', ')}</span> : null}</div>
    {caption ? <figcaption>{caption}</figcaption> : null}
  </figure>;
}
