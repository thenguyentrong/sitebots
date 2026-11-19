'use client';

import { COMMON } from '@/lib/i18n/common';
import { useLang } from '@/lib/i18n/client';

// Shown the moment a link is clicked, while the next page is on its way: the page's frame in grey, so a click
// answers at once instead of waiting for the server.
export default function Loading() {
  const t = COMMON[useLang()];
  return <main className="mx-auto w-full max-w-6xl animate-pulse px-4 pb-24 pt-12 sm:px-6" aria-busy="true" aria-label={t.loading}>
    <div className="h-3 w-28 rounded-full bg-subtle" />
    <div className="mt-4 h-12 w-3/4 max-w-2xl rounded-2xl bg-subtle" />
    <div className="mt-3 h-4 w-1/2 max-w-xl rounded-full bg-subtle" />
    <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-36 rounded-2xl bg-subtle" />)}
    </div>
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-64 rounded-2xl bg-subtle" />)}
    </div>
  </main>;
}
