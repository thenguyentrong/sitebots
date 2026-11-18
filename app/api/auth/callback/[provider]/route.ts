import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { PENDING_COOKIE, finishSignIn, openPending } from '@/lib/auth/oauth';
import { SESSION_DAYS, accountId, sealSession, sessionCookie } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/** The provider sends the visitor back here with a code. Anything that does not match the sign-in we
 *  started ends on the home page with a short note, never with a half-made session. */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(request.url);
  const store = await cookies();
  const pending = openPending(store.get(PENDING_COOKIE)?.value);
  const failed = (back = '/') => {
    const response = NextResponse.redirect(new URL(back + (back.includes('?') ? '&' : '?') + 'signin=failed', url), 303);
    response.cookies.delete({ name: PENDING_COOKIE, path: '/api/auth' });
    return response;
  };
  const code = url.searchParams.get('code');
  if (!pending || pending.provider !== provider || !code || url.searchParams.get('state') !== pending.state) return failed(pending?.back);

  const person = await finishSignIn(pending, code, url.origin + '/api/auth/callback/' + provider);
  if (!person) return failed(pending.back);
  const sealed = sealSession({ uid: accountId(pending.provider, person.subject), provider: pending.provider, label: person.label, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 });
  if (!sealed) return failed(pending.back);

  const response = NextResponse.redirect(new URL(pending.back + (pending.back.includes('?') ? '&' : '?') + 'signin=ok', url), 303);
  response.cookies.set(sessionCookie(sealed));
  response.cookies.delete({ name: PENDING_COOKIE, path: '/api/auth' });
  return response;
}
