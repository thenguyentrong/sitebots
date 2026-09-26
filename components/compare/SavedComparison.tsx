'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { comparisonHref, useCompare } from '@/lib/compare/store';

/** Explicit URL ids win; only a bare /compare resumes the browser's selection. */
export function SavedComparison({ children }: { children: React.ReactNode }) {
  const { items, ready } = useCompare();
  const router = useRouter();
  useEffect(() => {
    if (ready && items.length) router.replace(comparisonHref(items));
  }, [items, ready, router]);
  if (!ready || items.length) return <p role="status" className="py-16 text-center text-muted">Opening your comparison…</p>;
  return children;
}
