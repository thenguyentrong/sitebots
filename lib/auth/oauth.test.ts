import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkClaims, enabledProviders, finishSignIn, openPending, safeBack, sealPending, startSignIn, type Claims } from './oauth';

const TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';
const soon = () => Math.floor(Date.now() / 1000) + 600;
const idToken = (claims: Claims) => 'h.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.s';

describe('sign-in with Google and Microsoft', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_SECRET', 'secret');
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-app');
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret');
    vi.stubEnv('MICROSOFT_CLIENT_ID', 'ms-app');
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', 'ms-secret');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('offers only the providers that are set up', () => {
    expect(enabledProviders()).toEqual(['google', 'microsoft']);
    vi.stubEnv('MICROSOFT_CLIENT_SECRET', '');
    expect(enabledProviders()).toEqual(['google']);
  });

  it('sends the visitor out with PKCE, state and nonce, and never back to another site', () => {
    const started = startSignIn('google', 'https://sitebots.vercel.app/api/auth/callback/google', '//evil.example/x');
    expect(started).not.toBeNull();
    const url = new URL(started!.url);
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe(started!.pending.state);
    expect(url.searchParams.get('nonce')).toBe(started!.pending.nonce);
    expect(url.searchParams.get('code_challenge')).not.toBe(started!.pending.verifier);
    expect(started!.pending.back).toBe('/');
    expect(safeBack('/compare?ids=a,b')).toBe('/compare?ids=a,b');
    expect(safeBack('https://evil.example')).toBe('/');
  });

  it('keeps the trip in a signed cookie that cannot be changed', () => {
    const { pending } = startSignIn('microsoft', 'https://x/cb', '/')!;
    const sealed = sealPending(pending);
    expect(openPending(sealed)?.state).toBe(pending.state);
    const [, signature] = sealed.split('.');
    const forged = Buffer.from(JSON.stringify({ ...pending, back: '/admin' })).toString('base64url');
    expect(openPending(forged + '.' + signature)).toBeNull();
  });

  it('accepts only ID tokens for this app, from the right issuer, unexpired, with our nonce', () => {
    const google: Claims = { iss: 'https://accounts.google.com', aud: 'google-app', sub: '1', exp: soon(), nonce: 'n' };
    expect(checkClaims('google', google, 'n')).toBe(true);
    expect(checkClaims('google', { ...google, aud: 'other-app' }, 'n')).toBe(false);
    expect(checkClaims('google', { ...google, iss: 'https://evil.example' }, 'n')).toBe(false);
    expect(checkClaims('google', { ...google, exp: 1 }, 'n')).toBe(false);
    expect(checkClaims('google', google, 'other-nonce')).toBe(false);
    const microsoft: Claims = { iss: 'https://login.microsoftonline.com/' + TENANT + '/v2.0', tid: TENANT, aud: 'ms-app', sub: 'abc', exp: soon(), nonce: 'n' };
    expect(checkClaims('microsoft', microsoft, 'n')).toBe(true);
    expect(checkClaims('microsoft', { ...microsoft, tid: '00000000-0000-0000-0000-000000000000' }, 'n')).toBe(false);
  });

  it('trades the code for the person, and refuses a token that is not ours', async () => {
    const { pending } = startSignIn('microsoft', 'https://x/cb', '/')!;
    const answer = (claims: Claims) => (async () => Response.json({ id_token: idToken(claims) })) as unknown as typeof fetch;
    const claims: Claims = { iss: 'https://login.microsoftonline.com/' + TENANT + '/v2.0', tid: TENANT, aud: 'ms-app', sub: 'abc', exp: soon(), nonce: pending.nonce, preferred_username: 'max@firma.de' };
    expect(await finishSignIn(pending, 'code', 'https://x/cb', answer(claims))).toEqual({ subject: TENANT + ':abc', label: 'max@firma.de' });
    expect(await finishSignIn(pending, 'code', 'https://x/cb', answer({ ...claims, nonce: 'replayed' }))).toBeNull();
    const refused = (async () => new Response('no', { status: 400 })) as unknown as typeof fetch;
    expect(await finishSignIn(pending, 'code', 'https://x/cb', refused)).toBeNull();
  });
});
