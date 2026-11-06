'use client';

import { ArrowSquareOut, ArrowsOutSimple, Circle, Diamond, Hexagon, MagnifyingGlass, Plus, Square, Star, Triangle, X, type Icon } from '@phosphor-icons/react';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationNodeDatum } from 'd3-force';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { STATUS_TEXT, TYPE_TEXT } from '@/lib/chat/i18n';
import { EDGE_KINDS, NODE_KINDS, type EdgeKind, type NodeKind } from '@/lib/graph/types';
import type { GraphView, ViewEdge, ViewNode } from '@/lib/graph/view';

// Checked with the dataviz validator against this page's background. The fixed order means a kind keeps
// its colour whatever is switched off. Seven colours cannot all stay apart for colour-blind readers,
// so each kind also has its own shape, and the same shape is drawn in the legend.
const KIND_COLOR: Record<NodeKind, string> = { robot: '#3987e5', maker: '#d95926', seller: '#199e70', job: '#c98500', setting: '#d55181', project: '#8fb339', rule: '#a56be0' };
const KIND_ICON: Record<NodeKind, Icon> = { robot: Circle, maker: Square, seller: Diamond, job: Triangle, setting: Hexagon, project: Star, rule: Plus };

/** Traces a kind's shape, the same size as a circle of this radius would look. */
function shape(context: CanvasRenderingContext2D, kind: NodeKind, x: number, y: number, radius: number) {
  const polygon = (corners: number, turn: number, size: number) => {
    for (let corner = 0; corner < corners; corner++) {
      const angle = turn + (corner * Math.PI * 2) / corners;
      context.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    }
    context.closePath();
  };
  context.beginPath();
  if (kind === 'robot') context.arc(x, y, radius, 0, Math.PI * 2);
  else if (kind === 'maker') polygon(4, Math.PI / 4, radius * 1.25);
  else if (kind === 'seller') polygon(4, 0, radius * 1.3);
  else if (kind === 'job') polygon(3, -Math.PI / 2, radius * 1.45);
  else if (kind === 'setting') polygon(6, 0, radius * 1.15);
  else if (kind === 'project') {
    for (let corner = 0; corner < 10; corner++) {
      const angle = -Math.PI / 2 + (corner * Math.PI) / 5;
      const size = radius * (corner % 2 ? 0.7 : 1.5);
      context.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    }
    context.closePath();
  } else {
    const [long, short] = [radius * 1.35, radius * 0.48];
    for (const [px, py] of [[-short, -long], [short, -long], [short, -short], [long, -short], [long, short], [short, short], [short, long], [-short, long], [-short, short], [-long, short], [-long, -short], [-short, -short]]) context.lineTo(x + px, y + py);
    context.closePath();
  }
}
const KIND_NAME: Record<NodeKind, string> = { robot: 'Robots', maker: 'Makers', seller: 'Sellers', job: 'Jobs', setting: 'Settings', project: 'Projects', rule: 'Rules' };
const KIND_ONE: Record<NodeKind, string> = { robot: 'Robot', maker: 'Maker', seller: 'Seller', job: 'Job', setting: 'Setting', project: 'Project', rule: 'Rule' };
const EDGE_NAME: Record<EdgeKind, string> = { made_by: 'Made by', sold_by: 'Sold by', fits_job: 'Fits a job', proven_on: 'Used for a job', worked_at: 'Worked at a project', job_in_setting: 'Job in a setting', rule_applies: 'Rule applies' };
/** Read from either end of a link. */
const EDGE_WORDS: Record<EdgeKind, [from: string, to: string]> = {
  made_by: ['Made by', 'Makes'], sold_by: ['Sold by', 'Sells'], fits_job: ['Fits these jobs', 'Robots that fit'], proven_on: ['Used for', 'Robots used for it'],
  worked_at: ['Worked at', 'Robots that worked here'], job_in_setting: ['Happens in', 'Jobs here'], rule_applies: ['Applies to', 'Rules that apply'],
};
const STAGE_WORD: Record<string, string> = { demo: 'Demo', pilot: 'Pilot', deployment: 'Daily use' };
/** What holds the map together. Fits are left out: at 2,780 links they would pull it into one ball. */
const LAYOUT: Partial<Record<EdgeKind, { distance: number; strength: number }>> = {
  made_by: { distance: 26, strength: 0.7 }, job_in_setting: { distance: 34, strength: 0.5 }, proven_on: { distance: 60, strength: 0.08 },
  worked_at: { distance: 60, strength: 0.08 }, sold_by: { distance: 100, strength: 0.015 }, rule_applies: { distance: 130, strength: 0.015 },
};
const BACKGROUND = '#09090b';
const number = (value: number) => value.toLocaleString('en-US');

type Dot = ViewNode & SimulationNodeDatum & { x: number; y: number; degree: number; radius: number };
type Touch = { edge: ViewEdge; other: number };
type Tip = { x: number; y: number; dot: Dot };

const Mark = ({ kind, size = 12 }: { kind: NodeKind; size?: number }) => {
  const Shape = KIND_ICON[kind];
  return <Shape size={size} weight="fill" color={KIND_COLOR[kind]} className="shrink-0" aria-hidden />;
};

function Toggle({ on, onClick, kind, label, count }: { on: boolean; onClick: () => void; kind?: NodeKind; label: string; count: number }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ' + (on ? 'border-edge-strong text-foreground' : 'border-edge text-muted opacity-60')}>
    {kind ? <Mark kind={kind} /> : null}
    {label} <span className="text-muted">{number(count)}</span>
  </button>;
}

/** All of what the adviser knows as one map: robots, makers, sellers, jobs, settings, projects and rules.
 *  Pan and zoom it, or pick anything to see what it connects to. */
export function GraphExplorer({ view }: { view: GraphView }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [kinds, setKinds] = useState(() => new Set<NodeKind>(NODE_KINDS));
  const [links, setLinks] = useState(() => new Set<EdgeKind>(EDGE_KINDS.filter((kind) => kind !== 'fits_job')));
  const [selected, setSelected] = useState<number | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [query, setQuery] = useState('');

  const { dots, touching } = useMemo(() => {
    const touching: Touch[][] = view.nodes.map(() => []);
    for (const edge of view.edges) {
      touching[edge.s].push({ edge, other: edge.t });
      touching[edge.t].push({ edge, other: edge.s });
    }
    const dots: Dot[] = view.nodes.map((node, index) => {
      // Fits are not counted: nearly every research job fits a hundred robots, and that says little.
      const degree = touching[index].filter((touch) => touch.edge.k !== 'fits_job').length;
      const angle = index * 2.399963;
      const distance = 9 * Math.sqrt(index);
      return { ...node, x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, degree, radius: Math.min(11, 2.2 + Math.sqrt(degree) * 0.75) };
    });
    return { dots, touching };
  }, [view]);

  const counts = useMemo(() => ({
    kinds: Object.fromEntries(NODE_KINDS.map((kind) => [kind, view.nodes.filter((node) => node.kind === kind).length])) as Record<NodeKind, number>,
    links: Object.fromEntries(EDGE_KINDS.map((kind) => [kind, view.edges.filter((edge) => edge.k === kind).length])) as Record<EdgeKind, number>,
  }), [view]);
  const hubs = useMemo(() => dots.map((dot, index) => ({ dot, index })).sort((a, b) => b.dot.degree - a.dot.degree).slice(0, 12), [dots]);
  const found = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return dots.map((dot, index) => ({ dot, index })).filter(({ dot }) => words.every((word) => dot.search.includes(word))).sort((a, b) => b.dot.degree - a.dot.degree).slice(0, 8);
  }, [dots, query]);

  // Everything the drawing reads lives in a ref: it runs outside React, many times a second.
  const live = useRef({ kinds, links, selected, hover: null as number | null, near: new Set<number>(), x: 0, y: 0, k: 0.6, width: 0, height: 0, queued: false });
  const draw = useRef<() => void>(() => undefined);
  const repaint = useCallback(() => {
    if (live.current.queued) return;
    live.current.queued = true;
    requestAnimationFrame(() => { live.current.queued = false; draw.current(); });
  }, []);

  useEffect(() => {
    live.current.kinds = kinds;
    live.current.links = links;
    live.current.selected = selected;
    live.current.near = new Set(selected === null ? [] : touching[selected].map((touch) => touch.other));
    repaint();
  }, [kinds, links, selected, touching, repaint]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;

    draw.current = () => {
      const { x, y, k, width, height, kinds, links, selected, hover, near } = live.current;
      const ratio = window.devicePixelRatio || 1;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = BACKGROUND;
      context.fillRect(0, 0, width, height);
      context.translate(x, y);
      context.scale(k, k);
      const shown = (index: number) => kinds.has(dots[index].kind);
      const focus = selected ?? hover;
      const quiet = selected !== null;

      for (const edge of view.edges) {
        const touchesFocus = focus !== null && (edge.s === focus || edge.t === focus);
        if ((!links.has(edge.k) && !(touchesFocus && selected !== null)) || !shown(edge.s) || !shown(edge.t)) continue;
        const real = edge.stage === 'pilot' || edge.stage === 'deployment';
        context.strokeStyle = touchesFocus ? 'rgba(250,250,250,0.75)' : quiet ? 'rgba(161,161,170,0.04)' : real ? 'rgba(251,146,60,0.42)' : 'rgba(161,161,170,0.13)';
        context.lineWidth = (touchesFocus ? 1.4 : real ? 1.1 : 0.7) / k;
        context.beginPath();
        context.moveTo(dots[edge.s].x, dots[edge.s].y);
        context.lineTo(dots[edge.t].x, dots[edge.t].y);
        context.stroke();
      }
      dots.forEach((dot, index) => {
        if (!kinds.has(dot.kind)) return;
        const lit = selected === null || index === selected || near.has(index);
        context.globalAlpha = lit ? 1 : 0.14;
        shape(context, dot.kind, dot.x, dot.y, dot.radius + (index === selected ? 2 : 0));
        context.fillStyle = KIND_COLOR[dot.kind];
        context.fill();
        context.lineWidth = 1 / k;
        context.strokeStyle = index === selected ? '#fafafa' : BACKGROUND;
        context.stroke();
      });
      context.globalAlpha = 1;

      // Labels keep their size at any zoom. The busiest nodes speak first, and a label that would land
      // on another one stays out.
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.font = '11px Geist, system-ui, sans-serif';
      context.textBaseline = 'middle';
      const taken = new Set<string>();
      const least = k < 0.55 ? 45 : k < 1 ? 22 : k < 1.8 ? 9 : k < 3 ? 4 : 0;
      const wanted = dots.map((dot, index) => ({ dot, index })).filter(({ dot, index }) => {
        if (!kinds.has(dot.kind)) return false;
        return index === selected || index === hover || (selected !== null ? near.has(index) : dot.degree >= least);
      }).sort((a, b) => Number(b.index === selected) - Number(a.index === selected) || Number(b.index === hover) - Number(a.index === hover) || b.dot.degree - a.dot.degree);
      for (const { dot, index } of wanted) {
        const left = dot.x * k + x + dot.radius * k + 4;
        const top = dot.y * k + y;
        if (left > width || left < -160 || top < 0 || top > height) continue;
        const label = dot.label.length > 34 ? dot.label.slice(0, 33) + '...' : dot.label;
        const cells: string[] = [];
        const span = Math.ceil(context.measureText(label).width / 40);
        for (let cell = 0; cell <= span; cell++) cells.push(Math.floor((left + cell * 40) / 40) + ':' + Math.floor(top / 14));
        if (index !== selected && index !== hover && cells.some((cell) => taken.has(cell))) continue;
        cells.forEach((cell) => taken.add(cell));
        context.lineWidth = 3;
        context.strokeStyle = BACKGROUND;
        context.strokeText(label, left, top);
        context.fillStyle = index === selected || index === hover ? '#fafafa' : '#d4d4d8';
        context.fillText(label, left, top);
      }
    };

    const resize = () => {
      const area = box.current?.getBoundingClientRect();
      if (!area) return;
      const ratio = window.devicePixelRatio || 1;
      const first = live.current.width === 0;
      live.current.width = area.width;
      live.current.height = area.height;
      element.width = Math.round(area.width * ratio);
      element.height = Math.round(area.height * ratio);
      if (first) {
        live.current.x = area.width / 2;
        live.current.y = area.height / 2;
      }
      repaint();
    };
    resize();
    const watcher = new ResizeObserver(resize);
    if (box.current) watcher.observe(box.current);

    const edges = view.edges.flatMap((edge) => {
      const rule = LAYOUT[edge.k];
      return rule ? [{ source: edge.s, target: edge.t, ...rule }] : [];
    });
    const simulation: Simulation<Dot, undefined> = forceSimulation(dots)
      .force('link', forceLink(edges).distance((link) => (link as (typeof edges)[number]).distance).strength((link) => (link as (typeof edges)[number]).strength))
      .force('charge', forceManyBody().strength(-30).distanceMax(340))
      .force('collide', forceCollide<Dot>((dot) => dot.radius + 1.5))
      .force('x', forceX(0).strength(0.04))
      .force('y', forceY(0).strength(0.04))
      .alphaDecay(0.028)
      .on('tick', repaint);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      simulation.stop();
      simulation.tick(260);
      repaint();
    }
    return () => {
      simulation.stop();
      watcher.disconnect();
    };
  }, [dots, repaint, view.edges]);

  /** Zooms about the pointer. The wheel listener is added by hand because React's cannot stop the page scrolling. */
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const state = live.current;
      const area = element.getBoundingClientRect();
      const px = event.clientX - area.left;
      const py = event.clientY - area.top;
      const k = Math.min(9, Math.max(0.15, state.k * Math.exp(-event.deltaY * 0.0016)));
      state.x = px - ((px - state.x) / state.k) * k;
      state.y = py - ((py - state.y) / state.k) * k;
      state.k = k;
      repaint();
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [repaint]);

  const fit = useCallback((only?: number[]) => {
    const state = live.current;
    const list = (only ?? dots.map((_, index) => index)).filter((index) => state.kinds.has(dots[index].kind));
    if (!list.length) return;
    const xs = list.map((index) => dots[index].x);
    const ys = list.map((index) => dots[index].y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = Math.min(3.2, Math.max(0.15, 0.86 * Math.min(state.width / Math.max(maxX - minX, 60), state.height / Math.max(maxY - minY, 60))));
    state.k = k;
    state.x = state.width / 2 - ((minX + maxX) / 2) * k;
    state.y = state.height / 2 - ((minY + maxY) / 2) * k;
    repaint();
  }, [dots, repaint]);

  // Once the map has mostly settled, it opens on all of it.
  useEffect(() => {
    const timer = setTimeout(() => fit(), 2600);
    return () => clearTimeout(timer);
  }, [fit]);

  const pick = useCallback((index: number | null) => {
    setSelected(index);
    setQuery('');
    setTip(null);
    if (index !== null) fit([index, ...touching[index].map((touch) => touch.other)]);
  }, [fit, touching]);

  const dotAt = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const state = live.current;
    const area = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - area.left - state.x) / state.k;
    const py = (event.clientY - area.top - state.y) / state.k;
    let best: number | null = null;
    let closest = Infinity;
    dots.forEach((dot, index) => {
      if (!state.kinds.has(dot.kind)) return;
      const distance = Math.hypot(dot.x - px, dot.y - py);
      if (distance < Math.max(dot.radius + 3, 8 / state.k) && distance < closest) { closest = distance; best = index; }
    });
    return best as number | null;
  };

  const press = useRef<{ x: number; y: number; originX: number; originY: number; moved: boolean } | null>(null);
  const down = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    press.current = { x: event.clientX, y: event.clientY, originX: live.current.x, originY: live.current.y, moved: false };
  };
  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const held = press.current;
    if (held) {
      if (Math.hypot(event.clientX - held.x, event.clientY - held.y) > 4) held.moved = true;
      if (held.moved) {
        live.current.x = held.originX + event.clientX - held.x;
        live.current.y = held.originY + event.clientY - held.y;
        setTip(null);
        repaint();
      }
      return;
    }
    const index = dotAt(event);
    if (index !== live.current.hover) {
      live.current.hover = index;
      repaint();
    }
    const area = event.currentTarget.getBoundingClientRect();
    setTip(index === null ? null : { x: event.clientX - area.left, y: event.clientY - area.top, dot: dots[index] });
  };
  const up = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const held = press.current;
    press.current = null;
    if (held && !held.moved) pick(dotAt(event));
  };

  const flip = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (!next.delete(value)) next.add(value);
    return next;
  };

  const groups = useMemo(() => {
    if (selected === null) return [];
    const map = new Map<string, Touch[]>();
    for (const touch of touching[selected]) {
      const name = EDGE_WORDS[touch.edge.k][touch.edge.s === selected ? 0 : 1];
      map.set(name, [...(map.get(name) ?? []), touch]);
    }
    return [...map].sort((a, b) => b[1].length - a[1].length);
  }, [selected, touching]);
  const current = selected === null ? null : dots[selected];

  return <main className="flex h-[calc(100dvh-3.5rem)] min-h-[560px] flex-col">
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-4 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Knowledge graph</h1>
        <p className="text-sm text-muted">{number(view.nodes.length)} things and {number(view.edges.length)} links. This is what the adviser can look up. Only you can see this page.</p>
      </div>
      <Link href="/admin/chats" className="text-sm underline underline-offset-4">Chats</Link>
    </div>
    <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 sm:px-6">
      {NODE_KINDS.map((kind) => <Toggle key={kind} on={kinds.has(kind)} onClick={() => setKinds((set) => flip(set, kind))} kind={kind} label={KIND_NAME[kind]} count={counts.kinds[kind]} />)}
    </div>
    <div className="flex flex-wrap items-center gap-1.5 px-4 pt-1.5 sm:px-6">
      {EDGE_KINDS.map((kind) => <Toggle key={kind} on={links.has(kind)} onClick={() => setLinks((set) => flip(set, kind))} label={EDGE_NAME[kind]} count={counts.links[kind]} />)}
    </div>

    <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,40%)] border-t border-edge lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-1">
      <div ref={box} className="relative min-h-0 overflow-hidden">
        <canvas ref={canvas} role="img" aria-label="Map of robots, makers, sellers, jobs, settings, projects and rules" className="absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={() => { live.current.hover = null; setTip(null); repaint(); }} />
        {tip ? <div className="pointer-events-none absolute z-10 max-w-64 rounded-lg border border-edge-strong bg-card px-2.5 py-1.5 text-xs" style={{ left: Math.min(tip.x + 14, (live.current.width || 0) - 200), top: tip.y + 14 }}>
          <span className="font-medium">{tip.dot.label}</span><span className="block text-muted">{KIND_ONE[tip.dot.kind]}</span>
        </div> : null}
        <button type="button" onClick={() => { pick(null); fit(); }} className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full border border-edge-strong bg-card px-3 py-1.5 text-xs"><ArrowsOutSimple size={13} /> Show all</button>
      </div>

      <aside className="min-h-0 overflow-y-auto border-t border-edge p-4 lg:border-t-0 lg:border-l" aria-label="Details">
        <div className="relative">
          <MagnifyingGlass size={15} className="absolute top-2.5 left-3 text-muted" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a robot, maker, job..." aria-label="Find in the graph" className="w-full rounded-xl border border-edge bg-card py-2 pr-3 pl-9 text-sm outline-none focus:border-edge-strong" />
        </div>
        {found.length ? <ul className="mt-2 space-y-0.5">
          {found.map(({ dot, index }) => <li key={dot.id}><button type="button" onClick={() => pick(index)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-subtle">
            <Mark kind={dot.kind} /><span className="truncate">{dot.label}</span><span className="ml-auto text-xs text-muted">{KIND_ONE[dot.kind]}</span>
          </button></li>)}
        </ul> : null}
        {query && !found.length ? <p className="mt-3 text-sm text-muted">Nothing found.</p> : null}

        {current && !query ? <div className="mt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs text-muted"><Mark kind={current.kind} />{KIND_ONE[current.kind]}</p>
              <h2 className="mt-1 text-lg font-semibold leading-tight">{current.label}</h2>
              {current.status || current.type ? <p className="mt-1 text-sm text-muted">{[current.type && TYPE_TEXT.en[current.type as keyof typeof TYPE_TEXT.en], current.status && STATUS_TEXT.en[current.status as keyof typeof STATUS_TEXT.en]].filter(Boolean).join(', ')}</p> : null}
            </div>
            <button type="button" aria-label="Close" onClick={() => setSelected(null)} className="rounded-full p-1 text-muted hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {current.url ? <Link href={current.url} className="underline underline-offset-4">Open page</Link> : null}
            {current.sourceUrl ? <a href={current.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline underline-offset-4">Source <ArrowSquareOut size={12} /></a> : null}
          </div>
          {groups.map(([name, list]) => <section key={name} className="mt-4">
            <h3 className="text-xs font-medium text-muted">{name} ({list.length})</h3>
            <ul className="mt-1">
              {list.slice(0, 40).map(({ edge, other }, row) => <li key={row}><button type="button" onClick={() => pick(other)} className="w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-subtle">
                <span className="flex items-center gap-2"><Mark kind={dots[other].kind} size={10} /><span className="truncate">{dots[other].label}</span>{edge.stage && STAGE_WORD[edge.stage] ? <span className="ml-auto shrink-0 text-xs text-muted">{STAGE_WORD[edge.stage]}</span> : null}</span>
                {edge.task ? <span className="mt-0.5 block pl-4 text-xs text-muted">{edge.task}{edge.where ? ', ' + edge.where : ''}</span> : null}
              </button></li>)}
            </ul>
            {list.length > 40 ? <p className="px-2 text-xs text-muted">and {list.length - 40} more</p> : null}
          </section>)}
        </div> : null}

        {!current && !query ? <div className="mt-4">
          <p className="text-sm text-muted">Scroll to zoom, drag to move, click anything to see what it connects to. Orange lines are real work: pilots and daily use.</p>
          <h2 className="mt-4 text-xs font-medium text-muted">Most connected</h2>
          <ul className="mt-1">
            {hubs.map(({ dot, index }) => <li key={dot.id}><button type="button" onClick={() => pick(index)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-subtle">
              <Mark kind={dot.kind} size={10} /><span className="truncate">{dot.label}</span><span className="ml-auto text-xs text-muted">{dot.degree}</span>
            </button></li>)}
          </ul>
        </div> : null}
      </aside>
    </div>
  </main>;
}
