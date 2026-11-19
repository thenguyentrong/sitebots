import { cache } from 'react';
import { notFound } from 'next/navigation';
import { DEFAULT_LANG, isLang, type Lang } from './config';

// The language of the page being rendered, for server components deep in the tree that have no route
// params. React's cache() is one object per request, so two visitors rendered at the same time never see
// each other's language. Each page and the [lang] layout set it before rendering anything below them.
// Client components read the language from <LangProvider> instead (lib/i18n/client.tsx): cache() does not
// remember anything in the browser.

const store = cache(() => ({ lang: DEFAULT_LANG as Lang }));

export function setRequestLang(lang: Lang): void {
  store().lang = lang;
}

/** The language of this request's page. English outside a page render (route handlers, scripts). */
export function requestLang(): Lang {
  return store().lang;
}

/** Reads the [lang] segment, stops with a 404 for anything else, and remembers it for the render. */
export async function pageLang(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  setRequestLang(lang);
  return lang;
}
