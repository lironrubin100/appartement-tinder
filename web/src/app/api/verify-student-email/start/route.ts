import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { isStudentEmail } from '@/utils/studentEmail';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const { email } = await request.json();
  if (typeof email !== 'string' || !isStudentEmail(email)) {
    return NextResponse.json(
      { error: 'כתובת האימייל חייבת להיות דוא״ל אוניברסיטאי (bgu.ac.il / sce.ac.il)' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.signInWithOtp({ email });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
