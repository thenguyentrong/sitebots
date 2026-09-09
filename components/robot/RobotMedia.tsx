'use client';

import { useState } from 'react';
import { RobotViewerLazy } from '@/components/robot-viewer/RobotViewerLazy';
import type { ModelEntry } from '@/lib/models/schemas';
import type { Pose } from '@/lib/models/poses';
import type { RobotImage } from '@/lib/queries/robots';
import type { FormFactor } from '@/lib/spec/enums';
import { cn } from '@/lib/utils';
import { RobotPhoto } from './RobotPhoto';

type Slide = { id: string; label: string; image?: RobotImage };

const KIND_LABEL: Record<RobotImage['kind'], string> = { render: 'Render', photo: 'Photograph', preview: 'Manufacturer' };

/**
 * The picture column of a robot page. One slide per thing we may show: the
 * interactive 3D model first when the maker publishes redistributable
 * geometry, then every real picture — photographs under a free licence, the
 * maker's own product image, and the still render. Nothing stands in for a
 * missing picture: a robot with no model and no image has no picture column.
 *
 * The viewer stays mounted while a photo is shown so switching back does not
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
  const pictures = images.filter((i) => !(model && i.kind === 'render'));
  const slides: Slide[] = [
    ...(model ? [{ id: '3d', label: '3D model' }] : []),
    ...pictures.map((image, i) => ({ id: `img-${i}`, label: KIND_LABEL[image.kind], image })),
  ];
  const [active, setActive] = useState(slides[0]?.id ?? '');
  if (!slides.length) return null;
  const current = slides.find((s) => s.id === active) ?? slides[0];

  return (
    <div className="space-y-2" data-robot-media data-slides={slides.length}>
      {model ? (
        <div hidden={current.id !== '3d'} data-media-slide="3d">
          <RobotViewerLazy entry={model} presets={presets} name={name} compact={compact} />
        </div>
      ) : null}
      {current.image ? (
        <figure className="card overflow-hidden" data-robot-photo data-media-slide={current.id}>
          <RobotPhoto
            url={current.image.url}
            alt={current.image.alt ?? name}
            formFactor={formFactor}
            fit="contain"
            className="aspect-[4/3] w-full rounded-t-2xl"
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-edge/70 px-4 py-2.5 text-xs text-faint">
            <span>
              {current.label} ·{' '}
              <a href={current.image.source_url ?? '#'} rel="nofollow noopener" target="_blank" className="underline-offset-2 hover:text-foreground hover:underline">
                {current.image.attribution ?? current.image.licence ?? 'source'}
              </a>
            </span>
            {!current.image.own ? <span>Picture of the base model</span> : !model ? <span>No redistributable 3D model</span> : null}
          </figcaption>
        </figure>
      ) : null}
      {slides.length > 1 && !compact ? (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Pictures">
          {slides.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === current.id}
              data-media-tab={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                'chip flex items-center gap-2 transition',
                s.id === current.id ? 'bg-foreground text-background' : 'hover:bg-subtle',
              )}
            >
              {s.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- thumbnails of remote pictures
                <img src={s.image.url} alt="" className="h-6 w-6 rounded object-contain" loading="lazy" referrerPolicy="no-referrer" />
              ) : (
                <span aria-hidden className="grid h-6 w-6 place-items-center rounded bg-subtle text-[10px] font-semibold text-foreground">
                  3D
                </span>
              )}
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
