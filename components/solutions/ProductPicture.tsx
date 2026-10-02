'use client';
import { useEffect, useRef, useState } from 'react';
import { REVIEW_IMAGES } from '@/lib/discovery/media';
import { RobotGlyph } from '@/components/robot/RobotGlyph';
import type { FormFactor } from '@/lib/spec/enums';

export function ProductPicture({ reviewId, formFactor }: { reviewId: string; formFactor: FormFactor }) {
  const photo = REVIEW_IMAGES[reviewId];
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(Boolean(image.current?.complete && image.current.naturalWidth === 0)); }, [photo?.url]);
  return <figure className="rounded-xl border border-edge bg-white p-4">
    {photo && !failed ? <img ref={image} src={photo.url} alt={photo.alt} width={640} height={320} loading="lazy" decoding="async" onError={() => setFailed(true)} className="mx-auto h-48 w-full object-contain" />
      : <RobotGlyph formFactor={formFactor} className="mx-auto h-48 w-full" />}
    <figcaption className="mt-3 text-xs text-muted">{photo && !failed ? <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">Product image source</a> : 'Class illustration · product photograph not available'}{photo && !failed ? ' · Shown equipment may differ from the supplied configuration.' : null}</figcaption>
  </figure>;
}
