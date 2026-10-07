import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { NotificationsToggle } from './NotificationsToggle';
import { DefaultHomeSelect } from './DefaultHomeSelect';
import { LanguageStatus } from './LanguageStatus';
import { PrivacySummary } from './PrivacySummary';
import { DeleteAccountNotice } from './DeleteAccountNotice';
import { signOut } from '../profile/actions';
import { Bell, LogOut, Settings2 } from 'lucide-react';

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
    <main className="min-h-[calc(100vh-80px)] bg-page-bg px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-shutaf-md bg-orange-soft text-orange-dark">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-ink">הגדרות</h1>
          <p className="mt-1 text-sm text-muted-text">ניהול החשבון, הפרטיות והעדפות האפליקציה</p>
        </header>

        <div className="space-y-5">
          <LanguageStatus />

          <section aria-labelledby="preferences-heading" className="overflow-hidden rounded-shutaf-lg border border-card-border bg-white">
            <div className="flex items-center gap-3 px-4 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-soft text-teal">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="preferences-heading" className="font-semibold text-ink">העדפות</h2>
                <p className="text-sm text-muted-text">כך Shutaf עובדת בשבילך</p>
              </div>
            </div>
            <div className="divide-y divide-card-border border-t border-card-border">
              <div className="flex items-center justify-between gap-4 px-4 py-4">
                <div>
                  <p className="font-medium text-ink">התראות באימייל</p>
                  <p className="mt-1 text-sm text-muted-text">עדכונים על התאמות והודעות חדשות</p>
                </div>
                <NotificationsToggle userId={user.id} initialEnabled={profile.notifications_enabled} />
              </div>
              {profile.mode !== 'lister' && (
                <DefaultHomeSelect userId={user.id} initialHome={profile.default_home === 'map' ? 'map' : 'discover'} />
              )}
            </div>
          </section>

          <section aria-labelledby="privacy-heading" className="overflow-hidden rounded-shutaf-lg border border-card-border bg-white">
            <h2 id="privacy-heading" className="sr-only">פרטיות</h2>
            <PrivacySummary />
          </section>

          <section aria-labelledby="account-heading" className="overflow-hidden rounded-shutaf-lg border border-card-border bg-white">
            <div className="px-4 py-4">
              <h2 id="account-heading" className="font-semibold text-ink">חשבון</h2>
              <p className="mt-1 text-sm text-muted-text">פעולות חשבון ואבטחה</p>
            </div>
            <div className="divide-y divide-card-border border-t border-card-border">
              <form action={signOut}>
                <button type="submit" className="flex w-full items-center justify-between gap-4 px-4 py-4 text-start transition-colors hover:bg-neutral-bg-soft focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange">
                  <span className="flex items-center gap-3">
                    <LogOut className="h-5 w-5 text-muted-text" aria-hidden="true" />
                    <span>
                      <span className="block font-medium text-ink">התנתקות</span>
                      <span className="mt-1 block text-sm text-muted-text">התנתקות מהמכשיר הזה</span>
                    </span>
                  </span>
                  <span className="text-muted-text" aria-hidden="true">‹</span>
                </button>
              </form>
              <DeleteAccountNotice />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
