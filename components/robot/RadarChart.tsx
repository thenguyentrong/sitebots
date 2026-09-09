/**
 * A spider chart with honest gaps. Server-rendered SVG, CSS-variable strokes
 * so it reads in both themes. An axis with no value is drawn as a dashed
 * spoke with a hollow marker at its end and is left out of the polygon; the
 * fill dips to the centre there and the outline is only drawn between
 * consecutive known axes, so a gap never looks like a zero.
 */
export type RadarSeries = { name: string; values: (number | null)[]; tone?: 0 | 1 | 2 | 3 };

const CX = 160;
const CY = 160;
const R = 118;

function pt(i: number, n: number, r: number): [number, number] {
  const th = -Math.PI / 2 + (2 * Math.PI * i) / n;
  return [CX + r * R * Math.cos(th), CY + r * R * Math.sin(th)];
}

function fillPath(values: (number | null)[]): string {
  const n = values.length;
  return values.map((v, i) => { const [x, y] = pt(i, n, v ?? 0); return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ') + ' Z';
}

/** Outline over runs of consecutive known axes only, wrapping around the end. */
function strokePaths(values: (number | null)[]): string[] {
  const n = values.length;
  const known = values.map((v) => v !== null);
  if (known.every(Boolean)) return [fillPath(values)];
  const out: string[] = [];
  let i = 0;
  let guard = 0;
  while (i < n && guard++ < 2 * n) {
    if (!known[i]) { i++; continue; }
    const seg: string[] = [];
    let j = i;
    while (known[j % n] && seg.length < n) {
      const [x, y] = pt(j % n, n, values[j % n] as number);
      seg.push(`${seg.length === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
      j++;
    }
    if (seg.length > 1) out.push(seg.join(' '));
    i = j;
  }
  return out;
}

export function RadarChart({ axes, series, size = 320, title, desc, className }: { axes: { id: string; label: string }[]; series: RadarSeries[]; size?: number; title?: string; desc?: string; className?: string }) {
  const n = axes.length;
  const unknownAxis = axes.map((_, i) => series.every((s) => s.values[i] === null));
  return (
    <svg viewBox="-70 -8 460 336" width={size} height={Math.round(size * (336 / 460))} role="img" aria-label={title} className={className} data-radar data-spokes={n}>
      {title ? <title>{title}</title> : null}
      {desc ? <desc>{desc}</desc> : null}
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={axes.map((_, i) => pt(i, n, r).map((v) => v.toFixed(1)).join(',')).join(' ')} className="radar-grid" fill="none" />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(i, n, 1);
        return <line key={a.id} x1={CX} y1={CY} x2={x} y2={y} className="radar-grid" strokeDasharray={unknownAxis[i] ? '3 3' : undefined} data-spoke />;
      })}
      {series.map((s, si) => (
        <g key={s.name} data-series className={`radar-s${s.tone ?? si}`}>
          <path d={fillPath(s.values)} className="radar-fill" data-polygon />
          {strokePaths(s.values).map((d, k) => <path key={k} d={d} className="radar-line" fill="none" />)}
          {s.values.map((v, i) => {
            const [x, y] = pt(i, n, v === null ? 1 : v);
            return v === null ? <circle key={i} cx={x} cy={y} r={3.5} className="radar-gap" fill="none" /> : <circle key={i} cx={x} cy={y} r={3} className="radar-dot" />;
          })}
        </g>
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(i, n, 1.16);
        const anchor = Math.abs(x - CX) < 8 ? 'middle' : x < CX ? 'end' : 'start';
        return (
          <text key={a.id} x={x} y={y + 4} textAnchor={anchor} className={`radar-label${unknownAxis[i] ? ' radar-label-unknown' : ''}`}>
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}
