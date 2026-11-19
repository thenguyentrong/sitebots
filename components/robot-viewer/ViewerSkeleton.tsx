'use client';

import { useLang } from '@/lib/i18n/client';

// A client component: it is the loading state of the lazy viewer, which only exists in the browser.
export function ViewerSkeleton() {
  const lang = useLang();
  return (
    <div className="card flex aspect-[4/3] items-center justify-center" data-robot-viewer data-ready="false">
      <p className="rounded-full border border-edge bg-card px-3 py-1 text-sm text-faint shadow-sm">{lang === 'de' ? '3D-Modell wird geladen' : 'Loading 3D model'}</p>
    </div>
  );
}
