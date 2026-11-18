import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_COOKIE, accountId, openSession, sealSession, sessionFrom, type Session } from './session';

const later = () => Math.floor(Date.now() / 1000) + 3600;
const session = (over: Partial<Session> = {}): Session => ({ uid: 'u1', provider: 'google', label: 'a@b.c', exp: later(), ...over });

describe('sign-in cookie', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('reads back what it sealed', () => {
    vi.stubEnv('AUTH_SECRET', 'secret-one');
    expect(openSession(sealSession(session()) ?? undefined)?.uid).toBe('u1');
  });

  it('refuses a changed cookie, an expired one and one sealed with another secret', () => {
    vi.stubEnv('AUTH_SECRET', 'secret-one');
    const sealed = sealSession(session()) ?? '';
    const [body, signature] = sealed.split('.');
    const forged = Buffer.from(JSON.stringify({ ...session(), uid: 'someone-else' })).toString('base64url');
    expect(openSession(forged + '.' + signature)).toBeNull();
    expect(openSession(body + '.x' + signature.slice(1))).toBeNull();
    expect(openSession(sealSession(session({ exp: Math.floor(Date.now() / 1000) - 1 })) ?? undefined)).toBeNull();
    vi.stubEnv('AUTH_SECRET', 'secret-two');
    expect(openSession(sealed)).toBeNull();
  });

  it('seals nothing in production without a secret', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_SECRET', '');
    expect(sealSession(session())).toBeNull();
    expect(openSession('anything.here')).toBeNull();
  });

  it('finds the cookie among others in a request', () => {
    vi.stubEnv('AUTH_SECRET', 'secret-one');
    const sealed = sealSession(session()) ?? '';
    const request = new Request('http://localhost/api/chat', { headers: { cookie: 'a=1; ' + SESSION_COOKIE + '=' + encodeURIComponent(sealed) + '; b=2' } });
    expect(sessionFrom(request)?.label).toBe('a@b.c');
    expect(sessionFrom(new Request('http://localhost/'))).toBeNull();
  });

  it('gives one account the same code every time, different per provider, and never the raw id', () => {
    vi.stubEnv('CHAT_SALT', 'salt');
    expect(accountId('google', '123')).toBe(accountId('google', '123'));
    expect(accountId('google', '123')).not.toBe(accountId('microsoft', '123'));
    expect(accountId('google', '123')).not.toContain('123');
  });
});
