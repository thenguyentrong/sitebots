import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { z } from 'zod';

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

const RequestSchema = z.object({
  adapters: z.array(z.string().trim().min(1)).min(1).max(20).optional(),
  limit: z.number().int().positive().max(5000).optional(),
  only: z.string().trim().min(1).max(200).optional(),
  fresh: z.boolean().optional(),
}).strict();

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  }
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'This deployment serves a read-only snapshot. Refresh locally and rebuild the snapshot, or configure DATABASE_URL.' }, { status: 503 });
  }
  let raw: unknown;
  try {
    const text = await request.text();
    raw = text.trim() ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid refresh options.' }, { status: 400 });
  const body = parsed.data;
  const { selectAdapters } = await import('@/scripts/scrape/adapters');
  const { runPipelineFor } = await import('@/lib/ingest/pipeline');
  let adapters;
  try { adapters = selectAdapters(body.adapters?.join(',') ?? 'all'); }
  catch { return NextResponse.json({ error: 'Unknown adapter. Choose a registered scraper.' }, { status: 400 }); }
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
