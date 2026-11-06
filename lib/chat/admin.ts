import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'sitebots_chat_admin';

/** Derived from the password, so changing the password logs every browser out, and the cookie never
 *  holds the password itself. */
export function adminToken(): string | null {
  const password = process.env.CHAT_ADMIN_PASSWORD;
  return password ? createHmac('sha256', password).update('sitebots-chat-admin').digest('hex') : null;
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
