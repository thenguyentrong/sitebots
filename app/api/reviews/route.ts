import { NextResponse } from 'next/server';
import { sessionFrom } from '@/lib/auth/session';
import { publicManufacturerSlugs } from '@/lib/manufacturers';
import { marketCompany } from '@/lib/market/companies';
import { loadMarket } from '@/lib/market/load';
import { ReviewInput, TARGET, deleteReview, listReviews, saveReview } from '@/lib/reviews/visitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'cache-control': 'no-store' };
/** Only robots and companies the site shows can be reviewed. */
function known(target: string): boolean {
  if (!TARGET.test(target)) return false;
  const [kind, id] = target.split(':');
  if (kind === 'robot') return loadMarket().some((robot) => robot.id === id);
  return Boolean(marketCompany(id)) || publicManufacturerSlugs().includes(id);
}
const sameSite = (request: Request) => { const site = request.headers.get('sec-fetch-site'); return !site || site === 'same-origin'; };

/** Anyone may read. The reader's own review is marked so they can change it. */
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get('target') ?? '';
  if (!known(target)) return NextResponse.json({ error: 'unknown' }, { status: 404, headers: noStore });
  const session = sessionFrom(request);
  const reviews = await listReviews(target, session?.uid ?? null).catch(() => []);
  return NextResponse.json({ reviews, signedIn: Boolean(session) }, { headers: noStore });
}

/** Writing needs a signed-in account: one review per account and robot or company, which it can change. */
export async function POST(request: Request) {
  if (!sameSite(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const session = sessionFrom(request);
  if (!session) return NextResponse.json({ error: 'sign_in' }, { status: 401 });
  const parsed = ReviewInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid', message: parsed.error.issues[0]?.message ?? 'Please check the form.' }, { status: 400 });
  if (!known(parsed.data.target)) return NextResponse.json({ error: 'unknown' }, { status: 404 });
  await saveReview(parsed.data, session.uid, session.provider);
  return NextResponse.json({ ok: true }, { headers: noStore });
}

export async function DELETE(request: Request) {
  if (!sameSite(request)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const session = sessionFrom(request);
  if (!session) return NextResponse.json({ error: 'sign_in' }, { status: 401 });
  const target = new URL(request.url).searchParams.get('target') ?? '';
  if (!TARGET.test(target)) return NextResponse.json({ error: 'unknown' }, { status: 404 });
  await deleteReview(target, session.uid);
  return NextResponse.json({ ok: true }, { headers: noStore });
}
