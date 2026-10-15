import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/proxy';

export async function proxy(request: NextRequest) {
  // Overwrite the header so locale cannot be spoofed by the caller.
  request.headers.set(
    'x-shutaf-locale',
    /^\/en(?:\/|$)/.test(request.nextUrl.pathname) ? 'en' : 'he'
  );
  request.headers.set(
    'x-shutaf-path',
    request.nextUrl.pathname + request.nextUrl.search
  );
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
