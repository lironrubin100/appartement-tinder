import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/utils/supabase/server';
import { Avatar, Button, Badge } from '@/components/ui';
import { signOut } from './actions';
import { factLabel, residentLabel, initialFacts, ageAt } from '@/lib/resident-profile';
import { residentFields, type ResidentField } from '@/lib/contracts/taxonomy';
import { headers } from 'next/headers';
import { localePath } from '@/utils/navigation';

export default async function ProfilePage() {
  const locale =
    (await headers()).get('x-shutaf-locale') === 'en' ? 'en' : 'he';
  const en = locale === 'en';
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(localePath('/login', locale));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect(localePath('/login', locale));
  }

  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('birth_date, student_email, student_email_verified_at')
    .eq('profile_id', user.id)
    .maybeSingle();

  const { data: lifestyle } = await supabase.from('profile_lifestyle').select('facts,disclosed_fields').eq('profile_id', user.id).maybeSingle();
  const facts = initialFacts(lifestyle?.facts);
  const age = privateProfile?.birth_date ? ageAt(privateProfile.birth_date) : null;
  const setTags = (Object.keys(facts) as ResidentField[]).filter(key => key in residentFields && facts[key] != null);

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        {/* Header */}
        <div className="border-b border-card-border px-6 py-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-ink">
            {en ? 'My profile' : 'הפרופיל שלי'}
          </h1>
          <Link
            href={localePath('/profile/edit', locale)}
            className="text-sm text-orange hover:underline"
          >
            {en ? 'Edit profile' : '✎ עריכת פרופיל'}
          </Link>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Profile Picture & Name */}
          <div className="flex items-center gap-6">
            <Avatar
              initials={profile.name.slice(0, 2)}
              size="xl"
              verified={
                profile.is_verified &&
                profile.public_badges.includes('student_verified')
              }
              src={profile.photo_url ?? undefined}
            />
            <div>
              <h2 className="text-2xl font-bold text-ink">{profile.name}</h2>
              <p className="text-body-text">
                {age !== null
                  ? en
                    ? `${age} years old`
                    : `בן/בת ${age}`
                  : en
                    ? 'Age not set'
                    : 'גיל לא הוגדר'}
              </p>
              {privateProfile?.student_email_verified_at &&
                profile.public_badges.includes('student_verified') && (
                  <Badge variant="success" className="mt-2">
                    {en ? 'Verified student' : 'מאומת כסטודנט'}
                  </Badge>
                )}
              {privateProfile?.student_email_verified_at &&
                !profile.public_badges.includes('student_verified') && (
                  <p className="text-sm text-muted-text mt-2">
                    {en ? 'Your verification is private' : 'האימות שלך פרטי'}
                  </p>
                )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <h3 className="font-semibold text-ink mb-2">
              {en ? 'About me' : 'ביו'}
            </h3>
            <p className="text-body-text">
              {profile.bio ||
                (en ? 'No bio added yet.' : 'עדיין לא הוספת ביו.')}
            </p>
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-semibold text-ink mb-3">
              {en ? 'My lifestyle' : 'התגים שלי'}
            </h3>
            {setTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {setTags.map((key) => (
                  <Badge key={key}>
                    {residentLabel(key, locale)}: {factLabel(key, facts[key], locale)}{' '}{lifestyle?.disclosed_fields.includes(key) ? (en ? '(public)' : '(ציבורי)') : (en ? '(private)' : '(פרטי)')}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-text text-sm">
                {en ? 'No traits added yet.' : 'עדיין לא הוספת תגיות.'}
              </p>
            )}
          </div>

          {/* Settings */}
          <Link
            href={localePath('/settings', locale)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors border-b border-card-border"
          >
            <span className="font-semibold text-ink">
              {en ? 'Settings' : '⚙️ הגדרות'}
            </span>
            <span className="text-muted-text">›</span>
          </Link>

          {/* Danger Zone */}
          <div className="space-y-3">
            <Button variant="danger" className="w-full">
              {en ? 'Delete account' : '🗑️ מחק חשבון'}
            </Button>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full text-error text-sm hover:underline"
              >
                {en ? 'Sign out' : 'התנתק'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
