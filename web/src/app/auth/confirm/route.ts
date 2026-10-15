import { createServerClient } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/database';
import { authPath, localePath, safeReturnTo } from '@/utils/navigation';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'he';
  const returnTo = safeReturnTo(
    url.searchParams.get('returnTo') ?? url.searchParams.get('next'),
    localePath('/', locale)
  );
  const login = new URL(authPath('login', returnTo, locale), url.origin);
  const response = NextResponse.redirect(
    new URL(authPath('onboarding', returnTo, locale), url.origin)
  );

  if (!tokenHash || !type) return NextResponse.redirect(login);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  if (error) response.headers.set('Location', login.toString());
  return response;
}
