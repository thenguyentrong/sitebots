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
}: {
  url: string | null;
  alt: string | null;
  attribution?: string | null;
  sourceUrl?: string | null;
  formFactor: FormFactor;
  className?: string;
  fit?: 'cover' | 'contain';
}) {
  // No picture, no stand-in: a glyph where a photograph should be reads as a
  // broken page, and the catalogue hides such robots by default anyway.
  if (!url) return null;
  return (
    <figure className={`relative overflow-hidden bg-subtle ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- remote Commons files, no loader configured */}
      <img src={url} alt={alt ?? ''} loading="lazy" referrerPolicy="no-referrer" className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`} />
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
