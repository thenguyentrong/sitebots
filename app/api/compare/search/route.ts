import { NextResponse } from 'next/server';
import { searchRobots } from '@/lib/compare/search';

export const runtime = 'nodejs';
export const maxDuration = 15;
export const dynamic = 'force-dynamic';

// The robots a name matches, for the search box on /compare. The robot list stays on the server.
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 80);
  try {
    return NextResponse.json({ hits: await searchRobots(query) }, { headers: { 'cache-control': 'public, max-age=60', 'vercel-cdn-cache-control': 'public, max-age=604800' } });
  } catch (error) {
    console.error('compare search failed', error);
    return NextResponse.json({ error: 'Search is not available.' }, { status: 503 });
  }
}
