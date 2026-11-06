import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminToken, checkPassword, hashPassword, isAdmin } from './admin';

describe('admin password', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('accepts the right password and refuses a wrong one', () => {
    const stored = hashPassword('right-password');
    expect(checkPassword('right-password', stored)).toBe(true);
    expect(checkPassword('wrong-password', stored)).toBe(false);
    expect(checkPassword('', stored)).toBe(false);
  });

  it('never stores the password, and salts every hash', () => {
    const stored = hashPassword('right-password');
    expect(stored).not.toContain('right-password');
    expect(hashPassword('right-password')).not.toBe(stored);
  });

  it('refuses everything when the stored value is broken', () => {
    expect(checkPassword('anything', '')).toBe(false);
    expect(checkPassword('anything', 'no-hash-here')).toBe(false);
  });

  it('logs everyone out when the password changes', () => {
    vi.stubEnv('CHAT_ADMIN_HASH', hashPassword('first'));
    const cookie = adminToken() ?? '';
    expect(isAdmin(cookie)).toBe(true);
    vi.stubEnv('CHAT_ADMIN_HASH', hashPassword('second'));
    expect(isAdmin(cookie)).toBe(false);
  });

  it('lets nobody in while no password is set', () => {
    vi.stubEnv('CHAT_ADMIN_HASH', '');
    expect(adminToken()).toBeNull();
    expect(isAdmin('anything')).toBe(false);
  });
});
