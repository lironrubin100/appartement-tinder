import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const { email, code } = await request.json();
  if (typeof email !== 'string' || typeof code !== 'string') {
    return NextResponse.json({ error: 'missing email or code' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: verifyError } = await admin.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });
  if (verifyError) {
    return NextResponse.json({ error: 'קוד שגוי או שפג תוקפו' }, { status: 400 });
  }

  // Verification only proves the caller owns `email`'s inbox. Write the
  // result onto the caller's own profile with the admin client, since
  // student_email_verified_at is revoked from client UPDATE.
  const { error: updateError } = await admin
    .from('profiles')
    .update({
      student_email: email,
      student_email_verified_at: new Date().toISOString(),
      is_verified: true,
    })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
