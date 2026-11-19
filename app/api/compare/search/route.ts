import { NextResponse } from 'next/server';
import { searchRobots } from '@/lib/compare/search';
import { isLang } from '@/lib/i18n/config';

export const runtime = 'nodejs';
export const maxDuration = 15;
export const dynamic = 'force-dynamic';

// The robots a name matches, for the search box on /compare. The robot list stays on the server.
// ?lang=de names the robot types in German; the language is in the URL, so the CDN caches each apart.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get('q') ?? '').slice(0, 80);
  const lang = params.get('lang');
  try {
    return NextResponse.json({ hits: await searchRobots(query, isLang(lang) ? lang : 'en') }, { headers: { 'cache-control': 'public, max-age=60', 'vercel-cdn-cache-control': 'public, max-age=604800' } });
  } catch (error) {
    console.error('compare search failed', error);
    return NextResponse.json({ error: 'Search is not available.' }, { status: 503 });
  }
}
