import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/database';
import { authPath, localePath, safeReturnTo } from '@/utils/navigation';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = searchParams.get('locale') === 'en' ? 'en' : 'he';
  const returnTo = safeReturnTo(
    searchParams.get('returnTo'),
    localePath('/', locale)
  );
  const loginUrl = `${origin}${authPath('login', returnTo, locale)}`;

  if (code) {
    // The OAuth code exchange writes the session cookie. It must write onto
    // the exact redirect response returned to the browser; returning a fresh
    // NextResponse would discard Set-Cookie and make the user sign in again.
    const response = NextResponse.redirect(
      `${origin}${authPath('onboarding', returnTo, locale)}`
    );
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        response.headers.set('Location', loginUrl);
        return response;
      }

      const { data: profile, error: profileLookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileLookupError) {
        response.headers.set('Location', loginUrl);
        return response;
      }
      // The auth.users trigger creates both the public and private profile rows.
      // No client-side profile insert policy is needed or granted.
      if (!profile) {
        response.headers.set('Location', loginUrl);
        return response;
      }

      return response;
    }
  }

  return NextResponse.redirect(loginUrl);
}
