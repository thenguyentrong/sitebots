import { createHash, createHmac } from 'node:crypto';
import { sameSecret } from '@/lib/chat/admin';

// A signed-in visitor is one cookie: who they are, signed with AUTH_SECRET. There is no session table,
// so signing in costs no storage and signing out is deleting the cookie.

export const SESSION_COOKIE = 'sitebots_session';
export const SESSION_DAYS = 30;

export const PROVIDERS = ['google', 'microsoft'] as const;
export type Provider = (typeof PROVIDERS)[number];

export type Session = {
  /** A code for the account, from the provider's own id and a secret salt. Never the email. */
  uid: string;
  provider: Provider;
  /** Shown back to the person so they know which account they used. Lives in their cookie only. */
  label: string;
  /** Seconds since 1970. */
  exp: number;
};

const secret = () => process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-dev-secret');

const encode = (value: string) => Buffer.from(value).toString('base64url');
const sign = (body: string, key: string) => createHmac('sha256', key).update(body).digest('base64url');

/** The account code stays the same for every sign-in with the same account, and tells nobody who it is. */
export function accountId(provider: Provider, subject: string): string {
  const salt = process.env.CHAT_SALT || secret() || 'local';
  return createHash('sha256').update([salt, 'account', provider, subject].join('|')).digest('hex').slice(0, 32);
}

export function sealSession(session: Session): string | null {
  const key = secret();
  if (!key) return null;
  const body = encode(JSON.stringify(session));
  return body + '.' + sign(body, key);
}

export function openSession(cookie: string | undefined, now = Date.now()): Session | null {
  const key = secret();
  if (!key || !cookie) return null;
  const [body, signature] = cookie.split('.');
  if (!body || !signature || !sameSecret(signature, sign(body, key))) return null;
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session;
    if (typeof session.uid !== 'string' || !PROVIDERS.includes(session.provider) || typeof session.exp !== 'number') return null;
    return session.exp * 1000 > now ? session : null;
  } catch {
    return null;
  }
}

/** Reads the session from a request's Cookie header, for route handlers. */
export function sessionFrom(request: Request): Session | null {
  const header = request.headers.get('cookie') ?? '';
  const match = header.split(/;\s*/).find((part) => part.startsWith(SESSION_COOKIE + '='));
  return openSession(match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : undefined);
}

export const sessionCookie = (value: string) => ({
  name: SESSION_COOKIE, value, httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * SESSION_DAYS,
});
