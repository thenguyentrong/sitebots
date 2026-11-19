'use client';

import { useCallback, useState } from 'react';
import { RobotViewerLazy } from '@/components/robot-viewer/RobotViewerLazy';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';
import type { RobotImage } from '@/lib/queries/robots';
import type { FormFactor } from '@/lib/spec/enums';
import { useLang } from '@/lib/i18n/client';
import { bilingual } from '@/lib/i18n/text';
import { cn } from '@/lib/utils';
import { RobotPhoto } from './RobotPhoto';

const TEXT = bilingual({
  en: {
    from: (host: string) => 'From ' + host, fromMaker: 'From the maker', render: 'Render', pictures: 'Pictures', model: '3D model', photos: 'Photos',
    explore: 'Explore in 3D', exploreHint: 'Rotate, zoom and try the model’s controls.', gallery: (name: string) => name + ' photo gallery',
    previous: 'Previous photo', next: 'Next photo', photo: 'Photo', photoN: (n: number) => 'Photo ' + n, base: 'Base model', noModel: 'No redistributable 3D model',
  },
  de: {
    from: (host: string) => 'Von ' + host, fromMaker: 'Vom Hersteller', render: 'Rendering', pictures: 'Bilder', model: '3D-Modell', photos: 'Fotos',
    explore: 'In 3D ansehen', exploreHint: 'Drehen, zoomen und die Steuerung des Modells ausprobieren.', gallery: (name: string) => 'Fotogalerie: ' + name,
    previous: 'Vorheriges Foto', next: 'Nächstes Foto', photo: 'Foto', photoN: (n: number) => 'Foto ' + n, base: 'Basismodell', noModel: 'Kein freigegebenes 3D-Modell',
  },
});

/** Where a picture came from, for the caption: the maker's site, or a free-licence photograph with its licence. */
function credit(i: RobotImage, t: (typeof TEXT)['en']): { text: string; href: string | null } {
  const host = (() => {
    try {
      return new URL(i.source_url ?? i.url).host.replace(/^www\./, '');
    } catch {
      return null;
    }
  })();
  if (i.kind === 'preview') return { text: host ? t.from(host) : t.fromMaker, href: i.source_url };
  if (i.kind === 'photo') return { text: [i.attribution ?? 'Wikimedia Commons', i.licence].filter(Boolean).join(' · '), href: i.source_url };
  return { text: i.attribution ?? t.render, href: i.source_url };
}

/**
 * The picture column of a robot page: one tab for the interactive 3D model
 * when the maker publishes redistributable geometry, one for the photos —
 * every real picture we may show, paged through like a gallery, with the
 * source under each. Nothing stands in for a missing picture; a robot with
 * no model and no photo has no picture column.
 *
 * A still preview loads first. After activation the viewer stays mounted so switching back does not
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
  const t = TEXT[useLang()];
  // With a live model the still render is the same thing, smaller; skip it.
  const photos = images.filter((i) => !(model && i.kind === 'render'));
  const [tab, setTab] = useState<'3d' | 'photos'>(model ? '3d' : 'photos');
  const [viewerLoaded, setViewerLoaded] = useState(compact);
  const openViewer = () => { setViewerLoaded(true); setTab('3d'); };
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const step = useCallback((d: number) => setIndex((i) => (count ? (i + d + count) % count : 0)), [count]);

  if (!model && !count) return null;
  const current = photos[Math.min(index, Math.max(0, count - 1))];
  const showPhotos = tab === 'photos' && current;
  const poster = images.find(image => image.kind === 'render') ?? photos[0];
  const thumbnailStart = Math.max(0, Math.min(index - 2, count - 5));

  return (
    <div className="space-y-2" data-robot-media data-photos={count}>
      {model && count > 0 && !compact ? (
        <div className="segment inline-flex rounded-full bg-subtle p-1" role="tablist" aria-label={t.pictures}>
          <button type="button" role="tab" aria-selected={tab === '3d'} data-media-tab="3d" onClick={openViewer} className={cn('rounded-full px-3 py-1 text-sm transition', tab === '3d' ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted hover:text-foreground')}>
            {t.model}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'photos'} data-media-tab="photos" onClick={() => setTab('photos')} className={cn('rounded-full px-3 py-1 text-sm transition', tab === 'photos' ? 'bg-card font-medium text-foreground shadow-sm' : 'text-muted hover:text-foreground')}>
            {t.photos} <span className="num text-faint">{count}</span>
          </button>
        </div>
      ) : null}

      {model ? (
        <div hidden={tab !== '3d'} data-media-slide="3d">
          {viewerLoaded ? (
            <RobotViewerLazy entry={model} presets={presets} name={name} compact={compact} />
          ) : (
            <div className="card overflow-hidden" data-robot-poster>
              {poster ? <RobotPhoto url={poster.url} alt={name} formFactor={formFactor} className="aspect-[4/3] w-full" eager /> : null}
              <div className="flex flex-col items-center gap-2 p-6 text-center">
                <button type="button" onClick={openViewer} className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background">{t.explore}</button>
                <p className="text-xs text-muted">{t.exploreHint}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {showPhotos ? (
        <figure className="card overflow-hidden" data-robot-photo data-photo-index={index} tabIndex={0} aria-label={t.gallery(name)} onKeyDown={event => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); }
        }}>
          <div className="relative">
            <RobotPhoto url={current.url} alt={current.alt ?? name} formFactor={formFactor} fit="contain" eager className="aspect-[4/3] w-full rounded-t-2xl" />
            {count > 1 ? (
              <>
                <button type="button" aria-label={t.previous} data-photo-prev onClick={() => step(-1)} className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground shadow-sm transition hover:bg-card">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button type="button" aria-label={t.next} data-photo-next onClick={() => step(1)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-foreground shadow-sm transition hover:bg-card">
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
              {t.photo} ·{' '}
              {credit(current, t).href ? (
                <a href={credit(current, t).href ?? '#'} rel="nofollow noopener" target="_blank" className="underline-offset-2 hover:text-foreground hover:underline">
                  {credit(current, t).text}
                </a>
              ) : (
                credit(current, t).text
              )}
            </span>
            {!current.own ? <span>{t.base}</span> : !model ? <span>{t.noModel}</span> : null}
          </figcaption>
          {count > 1 && !compact ? (
            <div className="flex gap-1.5 overflow-x-auto border-t border-edge/70 px-3 py-2" data-photo-strip>
              {photos.slice(thumbnailStart, thumbnailStart + 5).map((p, offset) => { const i = thumbnailStart + offset; return (
                <button key={p.url + i} type="button" aria-label={t.photoN(i + 1)} aria-current={i === index} onClick={() => setIndex(i)} className={cn('shrink-0 overflow-hidden rounded-lg border-2 transition', i === index ? 'border-foreground' : 'border-transparent opacity-70 hover:opacity-100')}>
                  <RobotPhoto url={p.url} alt="" formFactor={formFactor} fit="cover" sizes="64px" className="h-12 w-16" />
                </button>
              ); })}
            </div>
          ) : null}
        </figure>
      ) : null}
    </div>
  );
}
