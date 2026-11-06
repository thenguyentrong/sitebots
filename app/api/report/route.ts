import { z } from 'zod';
import { reportPdf } from '@/lib/chat/report';
import { reportData } from '@/lib/chat/store';
import { SITE } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** The chat's report as a PDF. The conversation id is a random UUID known only to that browser, so it
 *  works as the key to this one chat. Nothing here calls the model, so it costs nothing to repeat. */
export async function GET(request: Request) {
  const id = z.uuid().safeParse(new URL(request.url).searchParams.get('id'));
  if (!id.success) return new Response('Not found', { status: 404 });
  const data = await reportData(id.data);
  if (!data) return new Response('Not found', { status: 404 });
  const pdf = await reportPdf(data, SITE.url, new URL(request.url).origin);
  return new Response(new Uint8Array(pdf), {
    headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="sitebots-consultation-' + data.startedAt.slice(0, 10) + '.pdf"', 'cache-control': 'no-store' },
  });
}
