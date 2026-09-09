'use client';

import { useCallback, useEffect, useState } from 'react';
import { RobotViewerLazy } from '@/components/robot-viewer/RobotViewerLazy';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';
import type { RobotImage } from '@/lib/queries/robots';
import type { FormFactor } from '@/lib/spec/enums';
import { cn } from '@/lib/utils';
import { RobotPhoto } from './RobotPhoto';

/** Where a picture came from, for the caption: the maker's site, or a free-licence photograph with its licence. */
function credit(i: RobotImage): { text: string; href: string | null } {
  const host = (() => {
    try {
      return new URL(i.source_url ?? i.url).host.replace(/^www\./, '');
    } catch {
      return null;
    }
  })();
  if (i.kind === 'preview') return { text: host ? `From ${host}` : 'From the maker', href: i.source_url };
  if (i.kind === 'photo') return { text: [i.attribution ?? 'Wikimedia Commons', i.licence].filter(Boolean).join(' · '), href: i.source_url };
  return { text: i.attribution ?? 'Render', href: i.source_url };
}

/**
 * The picture column of a robot page: one tab for the interactive 3D model
 * when the maker publishes redistributable geometry, one for the photos —
 * every real picture we may show, paged through like a gallery, with the
 * source under each. Nothing stands in for a missing picture; a robot with
 * no model and no photo has no picture column.
 *
 * The viewer stays mounted while the photos show so switching back does not
 * reload the GLB; only its box is hidden.
 */
export function RobotMedia({
  model,
  presets,
  images,
  name,
  formFactor,
  compact = false,
}: {
  model: ModelEntry | null;
  presets: Record<string, Pose>;
  images: RobotImage[];
  name: string;
  formFactor: FormFactor;
  compact?: boolean;
}) {
  // With a live model the still render is the same thing, smaller; skip it.
  const photos = images.filter((i) => !(model && i.kind === 'render'));
  const [tab, setTab] = useState<'3d' | 'photos'>(model ? '3d' : 'photos');
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const step = useCallback((d: number) => setIndex((i) => (count ? (i + d + count) % count : 0)), [count]);

  useEffect(() => {
    if (tab !== 'photos' || count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, count, step]);

  if (!model && !count) return null;
  const current = photos[Math.min(index, Math.max(0, count - 1))];
  const showPhotos = tab === 'photos' && current;

  return (
    <div className="space-y-2" data-robot-media data-photos={count}>
      {model && count > 0 && !compact ? (
        <div className="segment inline-flex rounded-full bg-subtle p-1" role="tablist" aria-label="Pictures">
          <button type="button" role="tab" aria-selected={tab === '3d'} data-media-tab="3d" onClick={() => setTab('3d')} className={cn('rounded-full px-3 py-1 text-sm transition', tab === '3d' ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted hover:text-foreground')}>
            3D model
          </button>
          <button type="button" role="tab" aria-selected={tab === 'photos'} data-media-tab="photos" onClick={() => setTab('photos')} className={cn('rounded-full px-3 py-1 text-sm transition', tab === 'photos' ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted hover:text-foreground')}>
            Photos <span className="num text-faint">{count}</span>
          </button>
        </div>
      ) : null}

      {model ? (
        <div hidden={tab !== '3d'} data-media-slide="3d">
          <RobotViewerLazy entry={model} presets={presets} name={name} compact={compact} />
        </div>
      ) : null}

      {showPhotos ? (
        <figure className="card overflow-hidden" data-robot-photo data-photo-index={index}>
          <div className="relative">
            <RobotPhoto url={current.url} alt={current.alt ?? name} formFactor={formFactor} fit="contain" className="aspect-[4/3] w-full rounded-t-2xl" />
            {count > 1 ? (
              <>
                <button type="button" aria-label="Previous photo" data-photo-prev onClick={() => step(-1)} className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground shadow-sm transition hover:bg-card">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button type="button" aria-label="Next photo" data-photo-next onClick={() => step(1)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground shadow-sm transition hover:bg-card">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
                </button>
                <span className="num absolute bottom-2 right-3 rounded-full bg-card/90 px-2 py-0.5 text-xs text-muted shadow-sm" data-photo-count>
                  {index + 1} / {count}
                </span>
              </>
            ) : null}
          </div>
          <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-edge/70 px-4 py-2.5 text-xs text-faint">
            <span>
              Photo ·{' '}
              {credit(current).href ? (
                <a href={credit(current).href ?? '#'} rel="nofollow noopener" target="_blank" className="underline-offset-2 hover:text-foreground hover:underline">
                  {credit(current).text}
                </a>
              ) : (
                credit(current).text
              )}
            </span>
            {!current.own ? <span>Base model</span> : !model ? <span>No redistributable 3D model</span> : null}
          </figcaption>
          {count > 1 && !compact ? (
            <div className="flex gap-1.5 overflow-x-auto border-t border-edge/70 px-3 py-2" data-photo-strip>
              {photos.map((p, i) => (
                <button key={p.url + i} type="button" aria-label={`Photo ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} className={cn('shrink-0 overflow-hidden rounded-lg border-2 transition', i === index ? 'border-foreground' : 'border-transparent opacity-70 hover:opacity-100')}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails of remote pictures */}
                  <img src={p.url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-12 w-16 bg-subtle object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </figure>
      ) : null}
    </div>
  );
}
