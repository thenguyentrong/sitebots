'use client';

import Link from 'next/link';
import { ui } from '@/lib/ui';

export default function ErrorPage({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
    <div className="card mx-auto max-w-xl p-8 text-center">
      <p className="eyebrow">Page unavailable</p>
      <h1 className="mt-3 text-2xl font-semibold">We couldn’t load this page.</h1>
      <p className="mt-3 text-muted">Try again in a moment. Your saved comparison and assessments stay in this browser.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={unstable_retry} className={ui.btn}>Try again</button>
        <Link href="/" className={ui.btnSecondary}>Find a robot</Link>
      </div>
    </div>
  </main>;
}
