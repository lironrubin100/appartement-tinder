import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { Avatar, Button, Badge } from '@/components/ui';
import { signOut } from './actions';

const MODE_LABELS: Record<string, string> = {
  solo: '🏠 מחפש דירה',
  group: '👥 בקבוצה',
  room_filler: '➕ מחפש שותפים',
  lister: '🔑 משכיר',
};

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

  const age = profile.birth_date
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const setTags = TAG_COLUMNS.filter((key) => profile[key]);

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        {/* Header */}
        <div className="border-b border-card-border px-6 py-8">
          <h1 className="text-3xl font-bold text-ink">הפרופיל שלי</h1>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Profile Picture & Name */}
          <div className="flex items-center gap-6">
            <Avatar
              initials={profile.name.slice(0, 2)}
              size="xl"
              verified={profile.is_verified}
              src={profile.photo_url ?? undefined}
            />
            <div>
              <h2 className="text-2xl font-bold text-ink">{profile.name}</h2>
              <p className="text-body-text">
                {age !== null ? `בן/בת ${age}` : 'גיל לא הוגדר'}
              </p>
              {profile.is_verified && (
                <Badge variant="success" className="mt-2">
                  אימות דוא״ל
                </Badge>
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
            <div className="flex gap-3 flex-wrap">
              {(['solo', 'group', 'room_filler'] as const).map((mode) => (
                <Button key={mode} variant={profile.mode === mode ? 'primary' : 'ghost'}>
                  {MODE_LABELS[mode]}
                </Button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-semibold text-ink mb-3">התגים שלי</h3>
            {setTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {setTags.map((key) => (
                  <Badge key={key}>{String(profile[key])}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-text text-sm">עדיין לא הוספת תגיות.</p>
            )}
          </div>

          {/* Settings */}
          <div className="border-b border-card-border pb-6 space-y-4">
            <h3 className="font-semibold text-ink">הגדרות</h3>
            <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
              <span className="text-body-text">🌐 שפה</span>
              <span className="float-end text-muted-text">עברית (תמיד)</span>
            </button>
            <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
              <span className="text-body-text">🔔 הודעות</span>
              <span className="float-end text-muted-text">
                {profile.notifications_enabled ? 'פעיל' : 'כבוי'}
              </span>
            </button>
            <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
              <span className="text-body-text">🔒 פרטיות</span>
              <span className="float-end text-muted-text">הצג עוד</span>
            </button>
          </div>

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
