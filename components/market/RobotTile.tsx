'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CompareToggle } from '@/components/compare/CompareBar';
import { RobotViewerLazy } from '@/components/robot-viewer/RobotViewerLazy';
import { RobotPhoto } from '@/components/robot/RobotPhoto';
import type { TileData } from '@/lib/market/tiles';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';

// One live 3D view on the page at a time: opening a model closes the one open on another card.
const OPEN_3D = 'sitebots:tile-3d';

function Chevron({ back }: { back?: boolean }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={back ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>;
}

/** A robot card on the robots page, the same in both views: the pictures to page through, the 3D
 * model where one exists, price, German status and the compare button. The whole card links to
 * the robot page; the controls sit above that link. */
export function RobotTile({ tile }: { tile: TileData }) {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'photo' | '3d'>('photo');
  const [model, setModel] = useState<{ entry: ModelEntry; presets: Record<string, Pose> } | null>(null);
  const [failed, setFailed] = useState(false);
  const count = tile.pictures.length;
  const picture = count ? tile.pictures[Math.min(index, count - 1)] : null;

  useEffect(() => {
    const close = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== tile.id) setMode('photo');
    };
    window.addEventListener(OPEN_3D, close);
    return () => window.removeEventListener(OPEN_3D, close);
  }, [tile.id]);

  const open3d = async () => {
    if (!tile.model) return;
    window.dispatchEvent(new CustomEvent(OPEN_3D, { detail: tile.id }));
    setMode('3d');
    if (model) return;
    setFailed(false);
    try {
      const response = await fetch('/api/models?key=' + encodeURIComponent(tile.model.key) + '&form=' + encodeURIComponent(tile.model.form));
      if (!response.ok) throw new Error('HTTP ' + response.status);
      setModel(await response.json());
    } catch {
      setFailed(true);
    }
  };
  const step = (delta: number) => setIndex((current) => (current + delta + count) % count);

  return <article className="mk-robot mk-tile" data-robot={tile.id} data-pictures={count} data-model={tile.model ? 'yes' : 'no'}>
    <div className="mk-tile-media" data-mode={mode}>
      {mode === '3d' && tile.model ? <div className="mk-tile-3d">
        {model ? <RobotViewerLazy entry={model.entry} presets={model.presets} name={tile.name} compact fill /> : <p className="mk-tile-note">{failed ? 'The 3D model did not load.' : 'Loading the 3D model…'}</p>}
      </div> : picture ? <RobotPhoto key={picture.src} url={picture.src} alt={picture.alt || tile.name} formFactor="humanoid" fit="contain" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px" className="mk-tile-photo" />
        : <span className="mk-tile-empty">No picture published</span>}

      {mode === 'photo' && count > 1 ? <>
        <button type="button" className="mk-tile-arrow" data-dir="prev" aria-label={'Previous picture of ' + tile.name} onClick={() => step(-1)}><Chevron back /></button>
        <button type="button" className="mk-tile-arrow" data-dir="next" aria-label={'Next picture of ' + tile.name} onClick={() => step(1)}><Chevron /></button>
        <span className="mk-tile-count" data-tile-count>{index + 1} / {count}</span>
      </> : null}

      {tile.model ? <div className="mk-tile-modes" role="group" aria-label={'Pictures or 3D model of ' + tile.name}>
        <button type="button" aria-pressed={mode === 'photo'} onClick={() => setMode('photo')} disabled={!count}>Photos</button>
        <button type="button" aria-pressed={mode === '3d'} onClick={open3d}>3D</button>
      </div> : null}

      {mode === '3d' && tile.model ? <a className="mk-tile-credit" href={tile.model.creditUrl} target="_blank" rel="noopener noreferrer">Model: {tile.model.credit}</a>
        : picture?.credit ? (picture.href ? <a className="mk-tile-credit" href={picture.href} target="_blank" rel="noopener noreferrer">{picture.credit}</a> : <span className="mk-tile-credit">{picture.credit}</span>) : null}
    </div>

    <div className="mk-robot-body">
      <p className="mk-maker">{tile.kicker}</p>
      <h4><Link href={tile.href} className="mk-tile-link">{tile.name}</Link></h4>
      {tile.summary ? <p className="mk-card-summary">{tile.summary}</p> : null}
      <div className="mk-price">
        {tile.price ? <strong>{tile.price}</strong> : <span className="mk-fine">No price published</span>}
        <span className="mk-status" data-s={tile.status.tone}>{tile.status.label}</span>
      </div>
      <div className="mk-tile-foot">
        {tile.fine ? <p className="mk-fine">{tile.fine}</p> : <span />}
        {tile.compare ? <div className="mk-tile-action"><CompareToggle id={tile.compare.id} name={tile.compare.name} /></div> : null}
      </div>
    </div>
  </article>;
}
