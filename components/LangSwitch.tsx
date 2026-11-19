'use client';

import type { MouseEvent } from 'react';
import { COMMON } from '@/lib/i18n/common';
import { LANGS, LANG_COOKIE, LANG_COOKIE_MAX_AGE, localePath, type Lang } from '@/lib/i18n/config';
import { useLang, usePagePath } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

/** Remembers the choice, so an English link opened later does not send a German browser back to German. */
export function rememberLang(lang: Lang) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

/**
 * EN | DE in the top bar. Each side is a real link to the same page in that language, so crawlers and
 * people without JavaScript reach it too; a click also stores the choice and carries the query and the
 * #section over. It loads the other page in full, because the language belongs to the root layout.
 */
export function LangSwitch({ overlay = false }: { overlay?: boolean }) {
  const lang = useLang();
  const path = usePagePath();
  const t = COMMON[lang];
  const go = (event: MouseEvent<HTMLAnchorElement>, next: Lang) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    rememberLang(next);
    if (next === lang) return;
    window.location.assign(localePath(path + location.search + location.hash, next));
  };
  return <div role="group" aria-label={t.switchLabel} className={cn('top-lang', overlay && 'top-lang-overlay')}>
    {LANGS.map((code) => <a key={code} href={localePath(path, code)} hrefLang={code} lang={code} onClick={(event) => go(event, code)}
      aria-current={code === lang ? 'true' : undefined} title={code === lang ? undefined : t.switchHint}>
      {code.toUpperCase()}
    </a>)}
  </div>;
}
