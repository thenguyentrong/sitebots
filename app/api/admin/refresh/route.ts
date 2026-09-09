import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { runPipelineFor } from '@/lib/ingest/pipeline';
import { selectAdapters } from '@/scripts/scrape/adapters';

/**
 * Run adapters against the database the app is serving.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        -H "content-type: application/json" -d '{"adapters":["unitree-shop"]}' \
 *        http://localhost:3000/api/admin/refresh
 *
 * Locally this is how new data gets into PGlite without stopping `next dev`
 * (PGlite is single-process). On Vercel it is the manual refresh; there is no
 * schedule — price movement is not something we track yet.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  let body: { adapters?: string[]; limit?: number; only?: string; fresh?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // empty body → all adapters
  }
  const adapters = selectAdapters(body.adapters?.length ? body.adapters.join(',') : 'all');
  const sql = await getSql();
  const logs: string[] = [];
  const summaries = [];
  for (const adapter of adapters) {
    summaries.push(
      await runPipelineFor(sql, adapter, {
        limit: body.limit,
        only: body.only,
        fresh: body.fresh,
        log: (m) => logs.push(`${adapter.id}: ${m}`),
      }),
    );
  }
  return NextResponse.json({ summaries, logs: logs.slice(-200) });
}
