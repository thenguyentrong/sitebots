'use client';

import Link from 'next/link';
import { useState } from 'react';
import { STATUS_LABELS } from '@/lib/market/cards';
import type { MapPin, MapProject, MapView, ProjectMapData } from '@/lib/market/places';
import { STAGE_LABELS } from '@/lib/market/vocab';

// Where robots have done construction-site work, on two maps: Europe, and Germany closer, where most
// pins sit. A pin is one town; picking it lists its projects. Projects without a town follow by country.

const ORDERABLE = new Set(['buy_now', 'quote']);
const year = (date: string | null) => date?.slice(0, 4) ?? '';

function Project({ item }: { item: MapProject }) {
  const sold = ORDERABLE.has(item.status);
  return <li className="map-project">
    <span className={'map-dot is-' + item.stage + (sold ? '' : ' is-abroad')} aria-hidden="true" />
    <div>
      <p><Link href={item.jobHref}>{item.job}</Link></p>
      <p className="map-project-by"><strong>{STAGE_LABELS[item.stage]}</strong> · <Link href={item.robotHref}>{item.robot}</Link> · {item.where}{item.date ? ', ' + year(item.date) : ''}{item.url ? <> · <a href={item.url} target="_blank" rel="noopener noreferrer">source ↗</a></> : null}</p>
    </div>
    <span className="mk-status" data-s={item.status}>{STATUS_LABELS[item.status]}</span>
  </li>;
}

const RANK = { claim: 1, demo: 2, pilot: 3, deployment: 4 } as const;
/** A merged pin's id joins its towns' ids, so picking it on one map lights its towns on the other. */
const picked = (active: string, id: string) => Boolean(active) && (active === id || active.split('+').includes(id) || id.split('+').includes(active));
/** Towns closer than `distance` map units become one pin ("Stuttgart, Leonberg"), so neither hides the other. */
function mergeClose(pins: MapPin[], distance: number): MapPin[] {
  const out: MapPin[] = [];
  for (const pin of [...pins].sort((a, b) => b.projects.length - a.projects.length || a.id.localeCompare(b.id))) {
    const near = out.find((other) => Math.hypot(other.x - pin.x, other.y - pin.y) < distance);
    if (!near) { out.push({ ...pin, projects: [...pin.projects] }); continue; }
    near.id += '+' + pin.id;
    near.town += ', ' + pin.town;
    near.projects.push(...pin.projects);
    if (RANK[pin.stage] > RANK[near.stage]) near.stage = pin.stage;
    near.sold = near.projects.some((item) => item.stage === near.stage && ORDERABLE.has(item.status));
  }
  return out;
}

/** Greedy label placement: right of the pin, else left, above or below, never over another pin or
 *  label, so close towns stay readable. */
function placeLabels(pins: MapPin[], size: number, char: number, radius: number): Map<string, { x: number; y: number; anchor: 'start' | 'end' | 'middle' }> {
  const boxes: [number, number, number, number][] = pins.map((pin) => [pin.x - radius, pin.y - radius, pin.x + radius, pin.y + radius]);
  const out = new Map<string, { x: number; y: number; anchor: 'start' | 'end' | 'middle' }>();
  const hits = (box: [number, number, number, number]) => boxes.some((other) => box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1]);
  for (const pin of pins) {
    const width = pin.town.length * char, gap = size * 0.6;
    const tries: [{ x: number; y: number; anchor: 'start' | 'end' | 'middle' }, [number, number, number, number]][] = [
      [{ x: pin.x + gap, y: pin.y + size * 0.35, anchor: 'start' }, [pin.x + gap, pin.y - size * 0.5, pin.x + gap + width, pin.y + size * 0.5]],
      [{ x: pin.x - gap, y: pin.y + size * 0.35, anchor: 'end' }, [pin.x - gap - width, pin.y - size * 0.5, pin.x - gap, pin.y + size * 0.5]],
      [{ x: pin.x, y: pin.y - gap, anchor: 'middle' }, [pin.x - width / 2, pin.y - gap - size, pin.x + width / 2, pin.y - gap]],
      [{ x: pin.x, y: pin.y + gap + size * 0.8, anchor: 'middle' }, [pin.x - width / 2, pin.y + gap, pin.x + width / 2, pin.y + gap + size]],
    ];
    const free = tries.find(([, box]) => !hits(box)) ?? tries[0];
    boxes.push(free[1]);
    out.set(pin.id, free[0]);
  }
  return out;
}

function MapSvg({ view, pins, active, onPick, label, radius, font, title, frame }: {
  view: MapView; pins: MapPin[]; active: string; onPick: (id: string) => void; label: boolean; radius: number; font: number; title: string; frame?: number[];
}) {
  const [x, y, w, h] = view.viewBox;
  const labels = label ? placeLabels([...pins].sort((a, b) => a.x - b.x), font, font * 0.56, radius * 1.2) : null;
  return <svg viewBox={`${x} ${y} ${w} ${h}`} className="map-svg" role="group" aria-label={title}>
    <g className="map-land" aria-hidden="true">{view.countries.map((country) => <path key={country.iso + country.name} d={country.d} data-de={country.iso === 'DE' ? '' : undefined} />)}</g>
    {frame ? <rect className="map-frame" x={frame[0]} y={frame[1]} width={frame[2]} height={frame[3]} aria-hidden="true" /> : null}
    {pins.map((pin) => <g key={pin.id} className={'map-pin is-' + pin.stage + (pin.sold ? '' : ' is-abroad') + (picked(active, pin.id) ? ' is-active' : '')} transform={`translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)})`}
      role="button" tabIndex={0} aria-pressed={picked(active, pin.id)} aria-label={`${pin.town}: ${pin.projects.length} project${pin.projects.length > 1 ? 's' : ''}, ${STAGE_LABELS[pin.stage].toLowerCase()}`}
      onClick={() => onPick(pin.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPick(pin.id); } }}>
      <circle className="map-hit" r={radius * 2.2} />
      <circle className="map-mark" r={radius} style={{ strokeWidth: radius * 0.4 }} />
      {pin.projects.length > 1 ? <text className="map-count" y={radius * 0.38} style={{ fontSize: radius * 1.1 }}>{pin.projects.length}</text> : null}
      <title>{pin.town}</title>
    </g>)}
    {labels ? <g className="map-labels" aria-hidden="true">{pins.map((pin) => { const at = labels.get(pin.id)!; return <text key={pin.id} x={at.x} y={at.y} textAnchor={at.anchor} style={{ fontSize: font }}>{pin.town}</text>; })}</g> : null}
  </svg>;
}

export function ProjectMap({ data }: { data: ProjectMapData }) {
  const [active, setActive] = useState('');
  const pick = (id: string) => setActive((current) => current === id ? '' : id);
  const [gx, gy, gw, gh] = data.germany.viewBox;
  // The close-up merges towns whose pins would overlap; the Europe map keeps each town.
  const near = mergeClose(data.pins.filter((item) => item.x >= gx && item.x <= gx + gw && item.y >= gy && item.y <= gy + gh), 3.8);
  const pin = [...near, ...data.pins].find((item) => item.id === active);
  const germany = data.pins.filter((item) => item.country === 'DE');
  const inGermany = [...germany.flatMap((item) => item.projects), ...(data.unpinned.find((row) => row.country === 'DE')?.projects ?? [])];
  const elsewhere = data.unpinned.filter((row) => row.country !== 'DE');
  return <section id="where" className="home-where" aria-labelledby="where-title">
    <p className="jp-kicker">Where</p>
    <h2 id="where-title">Where robots work on sites today</h2>
    <p className="home-section-lede">{data.total} pilots and uses in daily work on construction-site jobs, each from a named project in a source. A pin marks the town, not the site. Pick one to see its projects.</p>
    <div className="map-pair">
      <figure className="map-box">
        <MapSvg view={data.europe} pins={data.pins} active={active} onPick={pick} label={false} radius={4.2} font={11} title="Europe" frame={[gx, gy, gw, gh]} />
        <figcaption>Europe · the box is the map of Germany</figcaption>
      </figure>
      <figure className="map-box">
        <MapSvg view={data.germany} pins={near} active={active} onPick={pick} label radius={1.7} font={3.6} title="Germany and its neighbours" />
        <figcaption>Germany and its neighbours</figcaption>
      </figure>
    </div>
    <ul className="map-key" aria-label="Pin key">
      <li><span className="map-dot is-deployment" aria-hidden="true" />{STAGE_LABELS.deployment}</li>
      <li><span className="map-dot is-pilot" aria-hidden="true" />{STAGE_LABELS.pilot}</li>
      <li><span className="map-dot is-deployment is-abroad" aria-hidden="true" />Robot not sold in Germany</li>
      <li><span className="map-key-count" aria-hidden="true">2</span>Number of projects in the town</li>
    </ul>
    <div className="map-detail" aria-live="polite">
      {pin ? <>
        <h3>{pin.town} <span>{pin.projects.length} project{pin.projects.length > 1 ? 's' : ''}</span><button type="button" className="map-clear" onClick={() => setActive('')}>Show Germany</button></h3>
        <ul>{pin.projects.map((item, index) => <Project key={index} item={item} />)}</ul>
      </> : <>
        <h3>In Germany <span>{inGermany.length} projects</span></h3>
        <ul>{inGermany.map((item, index) => <Project key={index} item={item} />)}</ul>
      </>}
    </div>
    {elsewhere.length || data.unnamed.length ? <div className="map-elsewhere">
      <h3>Without a town on the map</h3>
      <div className="map-countries">
        {elsewhere.map((row) => <details key={row.country}><summary>{row.name} <span>{row.projects.length}</span></summary><ul>{row.projects.map((item, index) => <Project key={index} item={item} />)}</ul></details>)}
        {data.unnamed.length ? <details><summary>Place not named <span>{data.unnamed.length}</span></summary><ul>{data.unnamed.map((item, index) => <Project key={index} item={item} />)}</ul></details> : null}
      </div>
    </div> : null}
  </section>;
}
