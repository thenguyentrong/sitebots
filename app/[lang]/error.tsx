'use client';

import Link from '@/components/LocaleLink';
import { COMMON } from '@/lib/i18n/common';
import { useLang } from '@/lib/i18n/client';
import { ui } from '@/lib/ui';

export default function ErrorPage({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const t = COMMON[useLang()];
  return <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
    <div className="card mx-auto max-w-xl p-8 text-center">
      <p className="eyebrow">{t.errorKicker}</p>
      <h1 className="mt-3 text-2xl font-semibold">{t.errorTitle}</h1>
      <p className="mt-3 text-muted">{t.errorText}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={unstable_retry} className={ui.btn}>{t.errorRetry}</button>
        <Link href="/" className={ui.btnSecondary}>{t.errorHome}</Link>
      </div>
    </div>
  </main>;
}
