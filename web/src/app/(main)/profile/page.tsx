import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/utils/supabase/server';
import { Avatar, Button, Badge } from '@/components/ui';
import { signOut } from './actions';
import { tagOptionLabel } from '@/utils/profileTags';
import { ModeSwitcher } from './ModeSwitcher';

const TAG_COLUMNS = [
  'gender_dynamic', 'cleanliness', 'sleep_schedule', 'social_guests',
  'noise_tolerance', 'music_vibe', 'climate', 'smoking', 'kitchen_dietary',
  'cooking_dynamics', 'pets', 'weekend_routine', 'relationship_status',
  'study_habits', 'financial_splitting', 'miluim_reserve_duty',
] as const;

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('birth_date, student_email, student_email_verified_at')
    .eq('profile_id', user.id)
    .maybeSingle();

  const today = new Date();
  const age = privateProfile?.birth_date
    ? Math.max(0, today.getUTCFullYear() - new Date(privateProfile.birth_date).getUTCFullYear() - (
      today < new Date(`${today.getUTCFullYear()}-${new Date(privateProfile.birth_date).getUTCMonth() + 1}-${new Date(privateProfile.birth_date).getUTCDate()}`)
        ? 1
        : 0
    ))
    : null;

  const setTags = TAG_COLUMNS.filter((key) => profile[key]);

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        {/* Header */}
        <div className="border-b border-card-border px-6 py-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-ink">הפרופיל שלי</h1>
          <Link href="/profile/edit" className="text-sm text-orange hover:underline">
            ✎ עריכת פרופיל
          </Link>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Profile Picture & Name */}
          <div className="flex items-center gap-6">
            <Avatar
              initials={profile.name.slice(0, 2)}
              size="xl"
              verified={profile.is_verified && profile.public_badges.includes('student_verified')}
              src={profile.photo_url ?? undefined}
            />
            <div>
              <h2 className="text-2xl font-bold text-ink">{profile.name}</h2>
              <p className="text-body-text">
                {age !== null ? `בן/בת ${age}` : 'גיל לא הוגדר'}
              </p>
              {privateProfile?.student_email_verified_at && profile.public_badges.includes('student_verified') && (
                <Badge variant="success" className="mt-2">
                  מאומת כסטודנט
                </Badge>
              )}
              {privateProfile?.student_email_verified_at && !profile.public_badges.includes('student_verified') && (
                <p className="text-sm text-muted-text mt-2">האימות שלך פרטי</p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <h3 className="font-semibold text-ink mb-2">ביו</h3>
            <p className="text-body-text">
              {profile.bio || 'עדיין לא הוספת ביו.'}
            </p>
          </div>

          {/* Mode Selector */}
          <div className="border-b border-card-border pb-6">
            <h3 className="font-semibold text-ink mb-3">מצב נוכחי</h3>
            <ModeSwitcher userId={profile.id} currentMode={profile.mode} />
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-semibold text-ink mb-3">התגים שלי</h3>
            {setTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {setTags.map((key) => (
                  <Badge key={key}>{tagOptionLabel(key, profile[key])}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-text text-sm">עדיין לא הוספת תגיות.</p>
            )}
          </div>

          {/* Settings */}
          <Link
            href="/settings"
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors border-b border-card-border"
          >
            <span className="font-semibold text-ink">⚙️ הגדרות</span>
            <span className="text-muted-text">›</span>
          </Link>

          {/* Danger Zone */}
          <div className="space-y-3">
            <Button variant="danger" className="w-full">
              🗑️ מחק חשבון
            </Button>
            <form action={signOut}>
              <button type="submit" className="w-full text-error text-sm hover:underline">
                התנתק
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
