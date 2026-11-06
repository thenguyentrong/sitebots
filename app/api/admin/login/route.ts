import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminToken, checkPassword } from '@/lib/chat/admin';
import { counted, setCount, visitorId } from '@/lib/chat/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

// Scrypt is meant to be slow, so a script trying passwords would also burn function time.
const TRIES_PER_HOUR = 10;

const back = (request: Request, query = '') => NextResponse.redirect(new URL('/admin' + query, request.url), 303);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const password = String(form?.get('password') ?? '').slice(0, 200);
  const hash = process.env.CHAT_ADMIN_HASH;
  const token = adminToken();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const key = 'admin-login-' + visitorId(ip, '');
  const failures = await counted(key);
  if (!hash || !token || failures >= TRIES_PER_HOUR || !checkPassword(password, hash)) {
    await setCount(key, failures + 1, 3600);
    return back(request, '?failed=1');
  }
  const response = back(request);
  response.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
}
