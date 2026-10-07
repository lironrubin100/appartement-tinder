import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return NextResponse.redirect(`${origin}/login`);

      const { data: profile, error: profileLookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileLookupError) return NextResponse.redirect(`${origin}/login`);
      // The auth.users trigger creates both the public and private profile rows.
      // No client-side profile insert policy is needed or granted.
      if (!profile) return NextResponse.redirect(`${origin}/login`);

      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
