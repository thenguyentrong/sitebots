import { STAGE_COLOR, stageCount } from '@/components/use-cases/parts';
import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { CHART_TEXT } from '@/lib/i18n/home';
import type { StageCounts } from '@/lib/market/use-case-views';

// The start page charts: server-drawn SVG, animated by home.css once <InView> marks them as seen.
// One axis each, recessive grid, numbers in text colour, and a <title> on every mark for hover.
// Each takes the page's language for its numbers and words.

/** Documented robot jobs per year, stacked by how far they went (daily use at the base). */
export function GrowthChart({ years, lang }: { years: ({ year: number } & StageCounts)[]; lang: Lang }) {
  const t = CHART_TEXT[lang];
  const W = 720, H = 300, L = 34, R = 8, T = 26, B = 26;
  const totals = years.map((y) => y.deployment + y.pilot + y.demo);
  const max = Math.ceil(Math.max(...totals) / 20) * 20;
  const step = (W - L - R) / years.length;
  const bw = Math.min(40, step * 0.62);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  return <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t.growthAria + years.map((r, i) => `${r.year} ${formatNumber(totals[i], lang)}`).join(', ')}>
    {ticks.map((tick) => <g key={tick}>
      <line x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} stroke="var(--edge)" strokeWidth={1} strokeDasharray={tick ? '2 4' : undefined} />
      <text x={L - 8} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="var(--faint)">{formatNumber(tick, lang)}</text>
    </g>)}
    {years.map((r, i) => {
      const x = L + i * step + (step - bw) / 2;
      let base = y(0);
      const parts = (['deployment', 'pilot', 'demo'] as const).filter((s) => r[s]).map((s) => {
        const h = (H - T - B) * (r[s] / max);
        const top = base - h;
        const rect = { s, x, y: top + (base === y(0) ? 0 : 2), h: Math.max(0, h - (base === y(0) ? 0 : 2)) };
        base = top;
        return rect;
      });
      return <g key={r.year} className="chart-col">
        <g className="gbar" style={{ ['--d' as string]: `${i * 70}ms` }}>
          {parts.map((p, j) => <rect key={p.s} x={p.x} y={p.y} width={bw} height={p.h} rx={j === parts.length - 1 ? 4 : 0} fill={STAGE_COLOR[p.s]} />)}
        </g>
        <rect className="chart-hit" x={L + i * step} y={T} width={step} height={H - T - B}><title>{t.growthTitle(r.year, totals[i], (['deployment', 'pilot', 'demo'] as const).map((s) => stageCount(s, r[s], lang)).join(', '))}</title></rect>
        {totals[i] ? <text className="gdot" style={{ ['--d' as string]: `${600 + i * 70}ms` }} x={x + bw / 2} y={y(totals[i]) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--foreground)">{formatNumber(totals[i], lang)}</text> : null}
        <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">{r.year}</text>
      </g>;
    })}
  </svg>;
}

/** A yearly series as a line that draws itself, with the area under it, the high point and the last point named. */
export function LineChart({ points, min, max, format, label, lang }: { points: [number, number][]; min: number; max: number; format: (v: number) => string; label: string; lang: Lang }) {
  const W = 640, H = 240, L = 44, R = 18, T = 24, B = 26;
  const x0 = points[0][0], x1 = points[points.length - 1][0];
  const x = (year: number) => L + (W - L - R) * ((year - x0) / (x1 - x0));
  const y = (v: number) => T + (H - T - B) * (1 - (v - min) / (max - min));
  const line = points.map(([yr, v], i) => `${i ? 'L' : 'M'}${x(yr).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${line}L${x(x1)},${y(min)}L${x(x0)},${y(min)}Z`;
  const peak = points.reduce((a, b) => (b[1] > a[1] ? b : a));
  const last = points[points.length - 1];
  const ticks = Array.from({ length: 4 }, (_, i) => min + ((max - min) * i) / 3);
  return <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label + ': ' + points.map(([yr, v]) => `${yr} ${format(v)}`).join(', ')}>
    <defs><linearGradient id="la" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
    {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--edge)" strokeDasharray="2 4" /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--faint)">{format(t)}</text></g>)}
    <path className="garea" d={area} fill="url(#la)" />
    <path className="gline" d={line} pathLength={1} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    {points.map(([yr, v], i) => <g key={yr}>
      <circle className="gdot" style={{ ['--d' as string]: `${200 + (i * 1400) / points.length}ms` }} cx={x(yr)} cy={y(v)} r={yr === peak[0] || yr === last[0] ? 5 : 3.5} fill="var(--card)" stroke="var(--accent)" strokeWidth={2} />
      <circle cx={x(yr)} cy={y(v)} r={14} className="chart-hit"><title>{`${yr}: ${format(v)}`}</title></circle>
      <text x={x(yr)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">{yr}</text>
    </g>)}
    {[peak, last].filter((p, i, all) => all.findIndex((q) => q[0] === p[0]) === i).map(([yr, v]) => <text key={'l' + yr} className="gdot" style={{ ['--d' as string]: '1500ms' }} x={x(yr)} y={y(v) - 12} textAnchor={yr === last[0] ? 'end' : 'middle'} fontSize={12} fontWeight={600} fill="var(--foreground)">{yr === peak[0] && yr !== last[0] ? CHART_TEXT[lang].peak(format(v)) : format(v)}</text>)}
  </svg>;
}

/** A few yearly values as columns, each with its number. */
export function YearBars({ points, label, lang }: { points: [number, number][]; label: string; lang: Lang }) {
  // Up to two decimals, as the series are stored (39.6 euro an hour, 74 deaths).
  const num = (v: number) => formatNumber(v, lang, 2);
  const W = 320, H = 190, T = 22, B = 24;
  const max = Math.max(...points.map(([, v]) => v));
  const step = W / points.length, bw = step * 0.56;
  return <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label + ': ' + points.map(([yr, v]) => `${yr} ${num(v)}`).join(', ')}>
    <line x1={0} x2={W} y1={H - B} y2={H - B} stroke="var(--edge)" />
    {points.map(([yr, v], i) => {
      const h = (H - T - B) * (v / max);
      const x = i * step + (step - bw) / 2;
      return <g key={yr}>
        <rect className="gbar" style={{ ['--d' as string]: `${i * 90}ms` }} x={x} y={H - B - h} width={bw} height={h} rx={4} fill={i === points.length - 1 ? 'var(--accent)' : 'var(--edge-strong)'}><title>{`${yr}: ${num(v)}`}</title></rect>
        <text className="gdot" style={{ ['--d' as string]: `${500 + i * 90}ms` }} x={x + bw / 2} y={H - B - h - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--foreground)">{num(v)}</text>
        <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--muted)">{yr}</text>
      </g>;
    })}
  </svg>;
}
