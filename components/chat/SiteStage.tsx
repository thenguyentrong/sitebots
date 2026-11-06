'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { LiveItem } from '@/components/robot-viewer/LineupLive';
import { LINEUP } from '@/lib/models/lineup';
import LITE from '@/lib/models/lineup-lite.json';

const LineupLive = dynamic(() => import('@/components/robot-viewer/LineupLive').then((m) => m.LineupLive), { ssr: false });

/** Checked before about two megabytes of models are requested. */
function webgl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * The job site behind the chat: a still at first, then on a desktop the robots at work in 3D. Phones
 * keep the still, because the models are large and a scene under a finger would take the scrolling
 * away. `over` is what stands in front of the scene: the row keeps its feet just above it.
 */
export function SiteStage({ over }: { over: RefObject<HTMLElement | null> }) {
  const stage = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<LiveItem[] | null>(null);
  const [live, setLive] = useState(false);
  const [floor, setFloor] = useState(0);
  const onReady = useCallback(() => setLive(true), []);

  useEffect(() => {
    const element = stage.current;
    if (!element || !matchMedia('(min-width: 768px) and (pointer: fine)').matches || !webgl()) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cancelled = false;
    const load = async () => {
      const loaded = await Promise.all(LINEUP.map(async (row) => {
        const response = await fetch('/api/models?key=' + encodeURIComponent(row.key) + '&form=' + row.form);
        if (!response.ok) return null;
        const { entry, presets } = await response.json();
        // The row is a few hundred pixels tall: the light copies look the same there at a fifth of the download.
        const lite = (LITE as Record<string, { glbUrl: string }>)[row.key];
        const model = lite ? { ...entry, glbUrl: lite.glbUrl } : entry;
        return { key: row.key, name: row.name, href: row.href, turn: row.turn, entry: model, presets, heightM: entry.joints?.modelHeightM || entry.heightM } as LiveItem;
      }));
      // All five or none: a row with a gap would misstate the scale.
      if (!cancelled && loaded.every(Boolean)) setItems(loaded as LiveItem[]);
    };
    // After the page has painted, so the still and the chat come first.
    const idle = (window as unknown as { requestIdleCallback?: (fn: () => void) => number }).requestIdleCallback;
    if (idle) idle(() => { load().catch(() => {}); });
    else setTimeout(() => { load().catch(() => {}); }, 400);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const element = over.current;
    if (!element) return;
    const measure = () => setFloor(Math.max(0, element.offsetTop - 40));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [over]);

  return <div ref={stage} className="adv-stage" data-live={live} aria-hidden>
    <Image src="/branding/lineup-hero.8305070783.webp" alt="" width={1920} height={1015} sizes="100vw" priority className="adv-stage-still" />
    {items && floor ? <div className="adv-stage-live"><LineupLive items={items} floor={floor} ceiling={0} onReady={onReady} /></div> : null}
  </div>;
}
