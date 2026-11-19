'use client';

import { usePathname } from 'next/navigation';
import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_LANG, splitLang, type Lang } from './config';

// The page's language for client components, set once by the [lang] root layout. The URL decides it
// (/de/... is German), so it never changes while a page is open: switching language loads the other page.

const LangContext = createContext<Lang>(DEFAULT_LANG);

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = (): Lang => useContext(LangContext);

/** The current path without its language prefix, so '/de/advisor' and '/advisor' both read '/advisor'. */
export function usePagePath(): string {
  return splitLang(usePathname() ?? '/').path;
}
