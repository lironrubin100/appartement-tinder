import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { NotificationsToggle } from './NotificationsToggle';
import { DefaultHomeSelect } from './DefaultHomeSelect';
import { Button } from '@/components/ui';

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('notifications_enabled, default_home, mode')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/login');

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        <div className="border-b border-card-border px-6 py-8">
          <h1 className="text-3xl font-bold text-ink">הגדרות</h1>
        </div>

        <div className="p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-body-text">🌐 שפה</span>
            <span className="text-muted-text">עברית (תמיד)</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-body-text">🔔 הודעות</span>
            <NotificationsToggle userId={user.id} initialEnabled={profile.notifications_enabled} />
          </div>
          {profile.mode !== 'lister' && (
            <DefaultHomeSelect
              userId={user.id}
              initialHome={profile.default_home === 'map' ? 'map' : 'discover'}
            />
          )}
          <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
            <span className="text-body-text">🔒 פרטיות</span>
            <span className="float-end text-muted-text">הצג עוד</span>
          </button>
          <div className="pt-4">
            <Button variant="danger" className="w-full">
              🗑️ מחק חשבון
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
