'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { comparisonHref, useCompare } from '@/lib/compare/store';
import { localePath } from '@/lib/i18n/config';
import { useLang } from '@/lib/i18n/client';

const OPENING = { en: 'Opening your comparison…', de: 'Ihr Vergleich wird geöffnet …' };

/** Explicit URL ids win; only a bare /compare resumes the browser's selection, in the page's language. */
export function SavedComparison({ children }: { children: React.ReactNode }) {
  const lang = useLang();
  const { items, ready } = useCompare();
  const router = useRouter();
  useEffect(() => {
    if (ready && items.length) router.replace(localePath(comparisonHref(items), lang));
  }, [items, ready, router, lang]);
  if (!ready || items.length) return <p role="status" className="py-16 text-center text-muted">{OPENING[lang]}</p>;
  return children;
}
