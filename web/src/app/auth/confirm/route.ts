import { createServerClient } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const requestedNext = url.searchParams.get('next');
  const target = requestedNext ? new URL(requestedNext, url.origin) : new URL('/', url.origin);
  const safeTarget = target.origin === url.origin ? target : new URL('/', url.origin);
  const response = NextResponse.redirect(safeTarget);

  if (!tokenHash || !type) return NextResponse.redirect(new URL('/login?error=confirm', url.origin));

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  return error ? NextResponse.redirect(new URL('/login?error=confirm', url.origin)) : response;
}
