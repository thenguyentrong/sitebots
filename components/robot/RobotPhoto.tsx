'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { FormFactor } from '@/lib/spec/enums';

/**
 * A photograph, when one exists under a licence that lets us show it. The
 * credit line is part of the deal: CC BY and CC BY-SA both require the
 * photographer to be named next to the image, not on some other page.
 */
export function RobotPhoto({
  url,
  alt,
  attribution,
  sourceUrl,
  formFactor,
  className,
  fit = 'contain',
  sizes = '(max-width: 1024px) 100vw, 480px',
  eager = false,
}: {
  url: string | null;
  alt: string | null;
  attribution?: string | null;
  sourceUrl?: string | null;
  formFactor: FormFactor;
  className?: string;
  fit?: 'cover' | 'contain';
  sizes?: string;
  eager?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // No picture, no stand-in: a glyph where a photograph should be reads as a
  // broken page, and the catalogue hides such robots by default anyway.
  if (!url) return null;
  const optimized = failedUrl !== url && ((url.startsWith('/') && !url.startsWith('//')) || /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(url));
  const imageClass = fit === 'contain' ? 'object-contain' : 'object-cover';
  return (
    <figure className={`relative overflow-hidden bg-subtle ${className ?? ''}`}>
      {optimized ? (
        <Image onError={() => setFailedUrl(url)} src={url} alt={alt ?? ''} fill sizes={sizes} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} className={imageClass} />
      ) : (
        // Official remote hosts keep their original URL and attribution.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt ?? ''} loading="lazy" referrerPolicy="no-referrer" className={`h-full w-full ${imageClass}`} />
      )}
      {attribution ? (
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-[10px] leading-tight text-white/90">
          {sourceUrl ? (
            <a href={sourceUrl} rel="nofollow noopener" target="_blank" className="hover:underline">
              {attribution}
            </a>
          ) : (
            attribution
          )}
        </figcaption>
      ) : null}
    </figure>
  );
}
