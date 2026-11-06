import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'sitebots_chat_admin';

/** salt:hash in hex. Scrypt is slow on purpose, so a leaked value cannot be guessed back to the password. */
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): string {
  return salt + ':' + scryptSync(password, salt, 32).toString('hex');
}

export function checkPassword(password: string, stored: string): boolean {
  const salt = stored.split(':')[0];
  return Boolean(salt) && sameSecret(hashPassword(password, salt), stored);
}

/** Derived from the stored hash, so changing the password logs every browser out, and the cookie never
 *  holds anything that could be turned back into the password. */
export function adminToken(): string | null {
  const hash = process.env.CHAT_ADMIN_HASH;
  return hash ? createHmac('sha256', hash).update('sitebots-chat-admin').digest('hex') : null;
}

export function sameSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isAdmin(cookie: string | undefined): boolean {
  const token = adminToken();
  return Boolean(token && cookie && sameSecret(cookie, token));
}
