'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { LINEUP } from '@/lib/models/lineup';
import type { LiveItem } from '@/components/robot-viewer/LineupLive';

const LineupLive = dynamic(() => import('@/components/robot-viewer/LineupLive').then((m) => m.LineupLive), { ssr: false });
const short = (name: string) => name.replace(/^(Unitree|Boston Dynamics)\s+/, '');

/** The readout's five lines under its top margin, and a gap: the scale line stays below it where it shows. */
const READOUT_CLEARANCE = 136;

/** WebGL is checked before nine megabytes of models are requested. */
function webgl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * The landing's hero: the job site full bleed behind the headline. A still of it until, on a desktop
 * with a mouse, every model stands and the live scene takes over. Phones and touch screens keep the
 * still, a strip that scrolls sideways on phones: the models are large, and a scene that turns under
 * a finger would take the page's scrolling away.
 */
export function HomeHero({ poster, note, children }: { poster: ReactNode; note: ReactNode; children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<LiveItem[] | null>(null);
  const [live, setLive] = useState(false);
  const [floor, setFloor] = useState(0);
  const [ceiling, setCeiling] = useState(0);
  const [actions, setActions] = useState<Record<string, string>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const onReady = useCallback(() => setLive(true), []);

  useEffect(() => {
    const element = stage.current;
    if (!element || !matchMedia('(min-width: 768px) and (pointer: fine)').matches || !webgl()) return;
    let cancelled = false;
    const load = async () => {
      const loaded = await Promise.all(LINEUP.map(async (row) => {
        const response = await fetch('/api/models?key=' + encodeURIComponent(row.key) + '&form=' + row.form);
        if (!response.ok) return null;
        const { entry, presets } = await response.json();
        return { key: row.key, name: row.name, href: row.href, turn: row.turn, entry, presets, heightM: entry.joints?.modelHeightM || entry.heightM } as LiveItem;
      }));
      // All five or none: a row with a gap would misstate the scale.
      if (!cancelled && loaded.every(Boolean)) setItems(loaded as LiveItem[]);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      // After the page has painted, so the still and the text come first.
      const idle = (window as unknown as { requestIdleCallback?: (fn: () => void) => void }).requestIdleCallback;
      if (idle) idle(() => { load().catch(() => {}); });
      else setTimeout(() => { load().catch(() => {}); }, 400);
    });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); };
  }, []);

  // The row stands on the headline: its feet a label's height above the copy.
  useEffect(() => {
    const text = copy.current;
    if (!text) return;
    const measure = () => {
      setFloor(Math.max(0, text.offsetTop - 56));
      setCeiling(matchMedia('(min-width: 1024px)').matches ? READOUT_CLEARANCE : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    if (text.parentElement) observer.observe(text.parentElement);
    return () => observer.disconnect();
  }, []);

  return <section className="home-hero" aria-labelledby="home-title" data-live={live ? 'ready' : items ? 'loading' : 'still'}>
    <div ref={stage} className="home-stage">
      {poster}
      {items && floor ? <div className="home-stage-live"><LineupLive items={items} floor={floor} ceiling={ceiling} onReady={onReady} onActions={setActions} onHovered={setHovered} /></div> : null}
    </div>
    <p className="home-swipe" aria-hidden="true">Swipe sideways to see all {LINEUP.length} robots →</p>
    {/* What each robot is doing right now, like a site readout. */}
    {live ? <ul className="home-hud" aria-hidden="true">{LINEUP.map((row) => actions[row.key] ? <li key={row.key} data-active={hovered === row.key ? '' : undefined}><b>{short(row.name)}</b> {actions[row.key]}</li> : null)}</ul> : null}
    <div ref={copy} className="home-hero-copy">
      {children}
      <p className="home-note">{note}{live ? <span className="home-note-hint"> Drag to turn the row, point at a robot to stop it, click to open its page.</span> : null}</p>
    </div>
  </section>;
}
