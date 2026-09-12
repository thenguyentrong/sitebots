'use client';

import { useState } from 'react';
import type { ManufacturerLogo } from '@/lib/manufacturers';
import { cn } from '@/lib/utils';

export function MakerAvatar({ name, logo, className }: { name: string; logo?: ManufacturerLogo | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showLogo = logo && failedSrc !== logo.src;
  const initials = name.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  return (
    <span className={cn('grid h-11 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-edge/70 p-2 text-xs font-semibold text-muted', showLogo ? logo.background === 'dark' ? 'bg-[#202b39]' : 'bg-white' : 'bg-subtle', className)} aria-hidden>
      {showLogo ? (
        // Local, visually reviewed brand assets retain their source in the logo manifest.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo.src} alt="" loading="lazy" className="max-h-full max-w-full object-contain" onError={() => setFailedSrc(logo.src)} data-maker-logo />
      ) : initials || '?'}
    </span>
  );
}
