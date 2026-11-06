import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminToken, sameSecret } from '@/lib/chat/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const back = (request: Request, query = '') => NextResponse.redirect(new URL('/admin/chats' + query, request.url), 303);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const password = String(form?.get('password') ?? '');
  const expected = process.env.CHAT_ADMIN_PASSWORD;
  const token = adminToken();
  if (!expected || !token || !sameSecret(password, expected)) return back(request, '?failed=1');
  const response = back(request);
  response.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return response;
}
