import { NextResponse } from 'next/server';
import { enabledProviders, signInRequired } from '@/lib/auth/oauth';
import { SESSION_COOKIE, sessionFrom } from '@/lib/auth/session';
import { FREE_CHATS_PER_MONTH, freeLeft, readAccount, removeAccount } from '@/lib/chat/accounts';
import { freeReady } from '@/lib/chat/config';
import { deleteChats } from '@/lib/chat/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const devLogin = process.env.NODE_ENV !== 'production';

/** What the page needs to show the right door: signed in or not, what is left, and which sign-ins exist. */
export async function GET(request: Request) {
  const session = sessionFrom(request);
  const account = session ? await readAccount(session.uid).catch(() => null) : null;
  return NextResponse.json({
    signedIn: Boolean(session), label: session?.label ?? null, provider: session?.provider ?? null,
    free: { perMonth: FREE_CHATS_PER_MONTH, left: session ? freeLeft(account) : FREE_CHATS_PER_MONTH, open: freeReady() },
    providers: enabledProviders(), devLogin, signInNeeded: signInRequired(),
  }, { headers: { 'cache-control': 'no-store' } });
}

/** Deletes the account file and every chat it started, then signs out. */
export async function DELETE(request: Request) {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const session = sessionFrom(request);
  if (!session) return NextResponse.json({ error: 'sign_in' }, { status: 401 });
  const account = await readAccount(session.uid);
  if (account?.chats.length) await deleteChats(account.chats);
  await removeAccount(session.uid).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete({ name: SESSION_COOKIE, path: '/' });
  return response;
}
