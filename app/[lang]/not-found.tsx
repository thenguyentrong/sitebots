'use client';

import Link from '@/components/LocaleLink';
import { COMMON } from '@/lib/i18n/common';
import { useLang } from '@/lib/i18n/client';

// A client component, so it reads the language the layout above it set: not-found pages get no params.
export default function NotFound() {
  const t = COMMON[useLang()];
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-20 text-center sm:px-6">
      <p className="label">404</p>
      <h1 className="mt-2 text-2xl font-semibold">{t.notFoundTitle}</h1>
      <p className="mt-3 text-muted">
        <Link href="/" className="underline underline-offset-4">
          {t.notFoundBack}
        </Link>
      </p>
    </main>
  );
}
