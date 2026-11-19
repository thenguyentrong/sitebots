import { NextResponse, type NextRequest } from 'next/server';
import { LANG_COOKIE, chooseLang, localePath } from '@/lib/i18n/config';

// Every page lives under app/[lang]. The public addresses stay as they were for English (/robots) and get
// a /de prefix for German, so each language has its own URL and its own CDN cache entry:
// - /de/...       is German, always, whatever the cookie or the browser says.
// - /en/...       is the internal address of the English page; it goes back to the bare path, so English
//                 has one URL and search engines never see two.
// - anything else is English, rewritten to /en/... inside, unless the visitor chose German with the
//                 switch (cookie) or, without a choice, the browser prefers German: then one redirect to
//                 /de/... that no cache keeps, because it depends on who asks.
// Vercel runs this before its CDN cache, so a cached English page is only ever served to a request that
// came through here as English.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/de' || pathname.startsWith('/de/')) return NextResponse.next();
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 308);
  }
  const lang = chooseLang({ cookie: request.cookies.get(LANG_COOKIE)?.value, acceptLanguage: request.headers.get('accept-language') });
  if (lang === 'de') {
    const url = request.nextUrl.clone();
    url.pathname = localePath(pathname, 'de');
    const response = NextResponse.redirect(url, 307);
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('Vary', 'Accept-Language, Cookie');
    return response;
  }
  const url = request.nextUrl.clone();
  url.pathname = '/en' + (pathname === '/' ? '' : pathname);
  return NextResponse.rewrite(url);
}

export const config = {
  // Route handlers, the admin pages (English only), Next's own files and anything with a file extension
  // (robots.txt, sitemap.xml, icons, pictures, films, 3D models) never carry a language.
  matcher: ['/((?!api(?:/|$)|admin(?:/|$)|_next/|_vercel/|.*\\.\\w+$).*)'],
};
