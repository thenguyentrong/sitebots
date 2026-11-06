import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/chat/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/admin', request.url), 303);
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
