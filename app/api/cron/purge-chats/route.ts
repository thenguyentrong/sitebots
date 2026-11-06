import { NextResponse } from 'next/server';
import { sameSecret } from '@/lib/chat/admin';
import { purgeOldChats } from '@/lib/chat/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Runs once a week. Vercel sends CRON_SECRET, so nobody else can spend the store's operations here. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameSecret(request.headers.get('authorization') ?? '', 'Bearer ' + secret)) return NextResponse.json({ error: 'forbidden' }, { status: 401 });
  return NextResponse.json({ deleted: await purgeOldChats() });
}
