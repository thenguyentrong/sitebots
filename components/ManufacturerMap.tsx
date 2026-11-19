'use client';

import { useRef, useState, type PointerEvent } from 'react';
import Link from '@/components/LocaleLink';
import geography from '@/data/manufacturers/countries.json';
import { localePath } from '@/lib/i18n/config';
import { useLang } from '@/lib/i18n/client';
import { formatNumber, formatPercent } from '@/lib/i18n/format';
import { bilingual } from '@/lib/i18n/text';
import { ui } from '@/lib/ui';

export type CountryGroup = { code: string; name: string; count: number; href: string };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const TEXT = bilingual({
  en: {
    title: 'Manufacturers around the world',
    lead: 'Select a country to explore its companies. Locations are shown at country level.',
    controls: 'Map controls', zoomOut: 'Zoom out map', zoomIn: 'Zoom in map', reset: 'Reset map',
    map: 'World map of robot manufacturers',
    country: (name: string, n: number, count: string) => `${name}: ${count} manufacturer${n === 1 ? '' : 's'}`,
    browse: 'Browse manufacturers by country',
    unknown: (n: number, count: string) => `${count} compan${n === 1 ? 'y has' : 'ies have'} no recorded country. `,
    help: 'Zoom in, then drag to move the map. Map data: ',
  },
  de: {
    title: 'Hersteller weltweit',
    lead: 'Wählen Sie ein Land, um seine Unternehmen zu sehen. Standorte werden auf Länderebene gezeigt.',
    controls: 'Kartensteuerung', zoomOut: 'Karte verkleinern', zoomIn: 'Karte vergrößern', reset: 'Karte zurücksetzen',
    map: 'Weltkarte der Roboterhersteller',
    country: (name: string, n: number, count: string) => `${name}: ${count} Hersteller`,
    browse: 'Hersteller nach Land',
    unknown: (_n: number, count: string) => `Für ${count} Unternehmen ist kein Land erfasst. `,
    help: 'Vergrößern Sie die Karte und ziehen Sie sie dann, um sie zu verschieben. Kartendaten: ',
  },
});

export function ManufacturerMap({ countries, selected, unknown, title, lead }: { countries: CountryGroup[]; selected: string; unknown: number; title?: string; lead?: string }) {
  const lang = useLang();
  const t = TEXT[lang];
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; originX: number; originY: number; scale: number } | null>(null);
  const byCode = new Map(countries.map(c => [c.code === 'UK' ? 'GB' : c.code, c]));
  function zoomBy(factor: number) {
    setView(v => { const zoom = clamp(v.zoom * factor, 1, 4); return { zoom, x: clamp(v.x, -450 * (zoom - 1), 450 * (zoom - 1)), y: clamp(v.y, -225 * (zoom - 1), 225 * (zoom - 1)) }; });
  }
  function startDrag(e: PointerEvent<SVGSVGElement>) {
    // Leave touch scrolling and country links to the browser; zoom buttons work on every device.
    if (e.pointerType === 'touch' || e.button !== 0 || (e.target as Element).closest('a') || view.zoom === 1) return;
    const box = e.currentTarget.getBoundingClientRect();
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, originX: view.x, originY: view.y, scale: 900 / box.width };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveDrag(e: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setView(v => ({ ...v, x: clamp(d.originX + (e.clientX - d.x) * d.scale, -450 * (v.zoom - 1), 450 * (v.zoom - 1)), y: clamp(d.originY + (e.clientY - d.y) * d.scale, -225 * (v.zoom - 1), 225 * (v.zoom - 1)) }));
  }
  return (
    <section aria-labelledby="manufacturer-map-title" className="card mb-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-5 py-4">
        <div><h2 id="manufacturer-map-title" className="font-semibold">{title ?? t.title}</h2><p className="mt-1 text-xs text-muted">{lead ?? t.lead}</p></div>
        <div className="flex items-center gap-1" aria-label={t.controls}>
          <button type="button" onClick={() => zoomBy(1 / 1.5)} disabled={view.zoom === 1} aria-label={t.zoomOut} className={ui.btnSecondary}>−</button>
          <span className="num min-w-12 text-center text-xs text-muted" aria-live="polite">{formatPercent(Math.round(view.zoom * 100), lang, 0)}</span>
          <button type="button" onClick={() => zoomBy(1.5)} disabled={view.zoom === 4} aria-label={t.zoomIn} className={ui.btnSecondary}>+</button>
          <button type="button" onClick={() => setView({ zoom: 1, x: 0, y: 0 })} className={ui.btnSecondary}>{t.reset}</button>
        </div>
      </div>
      <svg viewBox="0 0 900 450" role="group" aria-label={t.map} className="block max-h-[420px] w-full select-none bg-subtle/40" style={{ cursor: view.zoom > 1 ? 'grab' : 'default', touchAction: 'pan-y' }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
        <g transform={`translate(${450 + view.x} ${225 + view.y}) scale(${view.zoom}) translate(-450 -225)`}>
          {geography.countries.map((c, i) => <path key={`${c.code}-${i}`} d={c.path} fill={byCode.has(c.code) ? 'var(--accent-soft)' : 'var(--edge)'} stroke="var(--card)" strokeWidth={0.7} vectorEffect="non-scaling-stroke" />)}
          {geography.countries.filter(c => byCode.has(c.code)).map(c => {
            const group = byCode.get(c.code)!;
            const active = group.code === selected;
            const label = t.country(group.name, group.count, formatNumber(group.count, lang));
            // A raw SVG link, so it gets the language prefix here; the chips below use LocaleLink.
            return <a key={c.code} href={localePath(group.href, lang)} aria-label={label}><g transform={`translate(${(c.longitude + 180) * 2.5} ${(90 - c.latitude) * 2.5}) scale(${1 / view.zoom})`}>
              <title>{label}</title>
              <circle r={active ? 15 : 12} fill={active ? 'var(--foreground)' : 'var(--accent)'} stroke="var(--card)" strokeWidth="2" />
              <text y="4" textAnchor="middle" fontSize="10" fontWeight="700" fill={active ? 'var(--background)' : '#fff'}>{group.count}</text>
            </g></a>;
          })}
        </g>
      </svg>
      <div className="flex flex-wrap gap-2 border-t border-edge p-4" aria-label={t.browse}>
        {countries.map(c => <Link key={c.code} href={c.href} aria-current={c.code === selected ? 'page' : undefined} className={`rounded-full border px-3 py-1.5 text-xs transition hover:border-edge-strong ${c.code === selected ? 'border-foreground bg-foreground text-background' : 'border-edge text-muted'}`}>{c.name} <span className="num ml-1">{formatNumber(c.count, lang)}</span></Link>)}
      </div>
      <p className="px-5 pb-4 text-xs text-muted">{unknown ? t.unknown(unknown, formatNumber(unknown, lang)) : ''}{t.help}<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Natural Earth</a>.</p>
    </section>
  );
}
