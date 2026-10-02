import { NextResponse } from 'next/server';
import { loadJobDetail } from '@/lib/market/jobs';

export const dynamic = 'force-dynamic';

/** The robots for one job on the map, with the card data the choices need. */
export function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  const detail = loadJobDetail(id);
  if (!detail) return NextResponse.json({ error: 'Unknown job' }, { status: 404 });
  return NextResponse.json(detail, { headers: { 'cache-control': 'public, max-age=300, stale-while-revalidate=3600' } });
}
