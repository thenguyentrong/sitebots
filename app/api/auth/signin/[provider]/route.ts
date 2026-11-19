import { NextResponse } from 'next/server';
import { PENDING_COOKIE, sealPending, startSignIn } from '@/lib/auth/oauth';
import { PROVIDERS, type Provider } from '@/lib/auth/session';
import { localePath, splitLang } from '@/lib/i18n/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sends the visitor to Google or Microsoft, remembering where to bring them back to. */
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(request.url);
  const back = url.searchParams.get('back') ?? '/';
  // A sign-in that cannot start lands on the adviser in the language the visitor came from.
  const advisor = localePath('/advisor', splitLang(back.split(/[?#]/)[0]).lang);
  if (!PROVIDERS.includes(provider as Provider)) return NextResponse.redirect(new URL(advisor + '?signin=failed', url), 303);
  const started = startSignIn(provider as Provider, url.origin + '/api/auth/callback/' + provider, back);
  if (!started) return NextResponse.redirect(new URL(advisor + '?signin=unavailable', url), 303);
  const response = NextResponse.redirect(started.url, 303);
  response.cookies.set(PENDING_COOKIE, sealPending(started.pending), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/api/auth', maxAge: 600 });
  return response;
}
