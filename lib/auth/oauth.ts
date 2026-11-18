import { createHash, createHmac, randomBytes } from 'node:crypto';
import { sameSecret } from '@/lib/chat/admin';
import type { Provider } from './session';

// Sign-in with Google or Microsoft, by the OpenID Connect code flow with PKCE. Nobody types a password
// here and no email is sent, so the site needs no mail domain. The ID token comes straight from the
// provider's token endpoint over TLS in exchange for our client secret, which OpenID Connect Core
// 3.1.3.7 accepts in place of checking its signature; issuer, audience, expiry and nonce are checked.

type Config = { authorize: string; token: string; clientId: string; clientSecret: string; scope: string; issuer: (claims: Claims) => boolean };
export type Claims = { iss?: string; aud?: string | string[]; sub?: string; exp?: number; nonce?: string; email?: string; preferred_username?: string; name?: string; tid?: string };

const MICROSOFT_ISSUER = /^https:\/\/login\.microsoftonline\.com\/([0-9a-f-]{36})\/v2\.0$/;

function config(provider: Provider): Config | null {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    return clientId && clientSecret ? {
      authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', clientId, clientSecret, scope: 'openid email',
      issuer: (claims) => claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com',
    } : null;
  }
  const clientId = process.env.MICROSOFT_CLIENT_ID, clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  // "common" takes work accounts (Microsoft 365) and personal ones (Outlook, Hotmail).
  return clientId && clientSecret ? {
    authorize: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token', clientId, clientSecret, scope: 'openid email profile',
    issuer: (claims) => { const tenant = MICROSOFT_ISSUER.exec(claims.iss ?? '')?.[1]; return Boolean(tenant && tenant === claims.tid); },
  } : null;
}

/** Which buttons the sign-in dialog may show. */
export const enabledProviders = (): Provider[] => (['google', 'microsoft'] as const).filter((provider) => config(provider) !== null);

/** The free adviser needs a sign-in only once a sign-in exists. Until the first provider's keys are set,
 * the live site stays open as before (daily limits still apply); on a dev machine the test login keeps
 * the gate on, so the sign-in flow can be tried there. */
export const signInRequired = () => enabledProviders().length > 0 || process.env.NODE_ENV !== 'production';

/** What has to survive the trip to the provider and back, in a short-lived signed cookie. */
export type Pending = { provider: Provider; state: string; verifier: string; nonce: string; back: string; exp: number };
export const PENDING_COOKIE = 'sitebots_oauth';

const key = () => process.env.AUTH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-dev-secret');
const random = () => randomBytes(32).toString('base64url');
const mac = (body: string) => createHmac('sha256', key()).update('pending|' + body).digest('base64url');

export function sealPending(pending: Pending): string {
  const body = Buffer.from(JSON.stringify(pending)).toString('base64url');
  return body + '.' + mac(body);
}

export function openPending(value: string | undefined, now = Date.now()): Pending | null {
  if (!value || !key()) return null;
  const [body, signature] = value.split('.');
  if (!body || !signature || !sameSecret(signature, mac(body))) return null;
  try {
    const pending = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Pending;
    return pending.exp * 1000 > now ? pending : null;
  } catch {
    return null;
  }
}

/** Only paths on this site: a sign-in link must never send anyone elsewhere. */
export const safeBack = (back: string | null | undefined) => back && /^\/(?![/\\])[\w\-./?=&%#,+]*$/.test(back) ? back : '/';

export function startSignIn(provider: Provider, redirectUri: string, back: string, now = Date.now()): { url: string; pending: Pending } | null {
  const settings = config(provider);
  if (!settings || !key()) return null;
  const pending: Pending = { provider, state: random(), verifier: random(), nonce: random(), back: safeBack(back), exp: Math.floor(now / 1000) + 600 };
  const url = new URL(settings.authorize);
  url.search = new URLSearchParams({
    client_id: settings.clientId, redirect_uri: redirectUri, response_type: 'code', scope: settings.scope, state: pending.state, nonce: pending.nonce,
    code_challenge: createHash('sha256').update(pending.verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account',
  }).toString();
  return { url: url.toString(), pending };
}

export function readIdToken(token: string): Claims | null {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as Claims;
  } catch {
    return null;
  }
}

/** The checks that make an ID token ours, for this sign-in, and still valid. */
export function checkClaims(provider: Provider, claims: Claims | null, nonce: string, now = Date.now()): claims is Claims & { sub: string } {
  const settings = config(provider);
  if (!settings || !claims?.sub) return false;
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  return settings.issuer(claims) && audience.includes(settings.clientId) && typeof claims.exp === 'number' && claims.exp * 1000 > now && claims.nonce === nonce;
}

/** Trades the code for the ID token and returns who signed in, or null for anything off. */
export async function finishSignIn(pending: Pending, code: string, redirectUri: string, fetcher: typeof fetch = fetch): Promise<{ subject: string; label: string } | null> {
  const settings = config(pending.provider);
  if (!settings) return null;
  const response = await fetcher(settings.token, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: settings.clientId, client_secret: settings.clientSecret, code_verifier: pending.verifier }),
  }).catch(() => null);
  if (!response?.ok) return null;
  const body = await response.json().catch(() => null) as { id_token?: string } | null;
  const claims = body?.id_token ? readIdToken(body.id_token) : null;
  if (!checkClaims(pending.provider, claims, pending.nonce)) return null;
  // Microsoft's subject is the same for one person across tenants only together with the tenant.
  const subject = pending.provider === 'microsoft' ? claims.tid + ':' + claims.sub : claims.sub;
  return { subject, label: (claims.email || claims.preferred_username || claims.name || '').slice(0, 120) };
}
