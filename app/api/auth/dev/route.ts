import { NextResponse } from 'next/server';
import { safeBack } from '@/lib/auth/oauth';
import { SESSION_DAYS, accountId, sealSession, sessionCookie } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A test account for this machine only, so the free path can be tried without Google or Microsoft.
 *  In production it does not exist. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (process.env.NODE_ENV === 'production') return new NextResponse(null, { status: 404 });
  const sealed = sealSession({ uid: accountId('google', 'local-test-' + (url.searchParams.get('who') ?? 'one')), provider: 'google', label: 'test@localhost', exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 });
  const back = safeBack(url.searchParams.get('back'));
  const response = NextResponse.redirect(new URL(back + (back.includes('?') ? '&' : '?') + 'signin=ok', url), 303);
  if (sealed) response.cookies.set(sessionCookie(sealed));
  return response;
}
