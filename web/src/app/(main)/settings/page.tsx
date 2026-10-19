import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { NotificationsToggle } from './NotificationsToggle';
import { DefaultHomeSelect } from './DefaultHomeSelect';
import { LanguageStatus } from './LanguageStatus';
import { PrivacySummary } from './PrivacySummary';
import { DeleteAccountNotice } from './DeleteAccountNotice';
import { ConvertToLister } from './ConvertToLister';
import { signOut } from '../profile/actions';
import { Bell, LogOut, Settings2 } from 'lucide-react';
import { headers } from 'next/headers';
import { localePath } from '@/utils/navigation';

export default async function SettingsPage({
  localeOverride,
}: {
  localeOverride?: 'he' | 'en';
} = {}) {
  const locale = localeOverride ?? ((await headers()).get('x-shutaf-locale') === 'en' ? 'en' : 'he');
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(localePath('/login', locale));

  const { data: profile } = await supabase
    .from('profiles')
    .select('notifications_enabled, default_home, mode')
    .eq('id', user.id)
    .single();
  if (!profile) redirect(localePath('/login', locale));

  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('phone, agency_name')
    .eq('profile_id', user.id)
    .maybeSingle();

  return (
    <main className="min-h-[calc(100vh-80px)] bg-page-bg px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-shutaf-md bg-orange-soft text-orange-dark">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold text-ink">{locale === 'en' ? 'Settings' : 'הגדרות'}</h1>
          <p className="mt-1 text-sm text-muted-text">{locale === 'en' ? 'Manage your account, privacy and app preferences' : 'ניהול החשבון, הפרטיות והעדפות האפליקציה'}</p>
        </header>

        <div className="space-y-5">
          <LanguageStatus />

          <section aria-labelledby="preferences-heading" className="overflow-hidden rounded-shutaf-lg border border-card-border bg-white">
            <div className="flex items-center gap-3 px-4 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-soft text-teal">
                <Bell className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="preferences-heading" className="font-semibold text-ink">{t('העדפות', 'Preferences')}</h2>
                <p className="text-sm text-muted-text">{t('כך Shutaf עובדת בשבילך', 'Make Shutaf work for you')}</p>
              </div>
            </div>
            <div className="divide-y divide-card-border border-t border-card-border">
              <div className="flex items-center justify-between gap-4 px-4 py-4">
                <div>
                  <p className="font-medium text-ink">{t('התראות באימייל', 'Email notifications')}</p>
                  <p className="mt-1 text-sm text-muted-text">{t('עדכונים על התאמות והודעות חדשות', 'Updates about introductions and new messages')}</p>
                </div>
                <NotificationsToggle locale={locale} userId={user.id} initialEnabled={profile.notifications_enabled} />
              </div>
              {profile.mode !== 'lister' && (
                <DefaultHomeSelect locale={locale} userId={user.id} initialHome={profile.default_home === 'map' ? 'map' : 'discover'} />
              )}
            </div>
          </section>

          <section aria-labelledby="privacy-heading" className="overflow-hidden rounded-shutaf-lg border border-card-border bg-white">
            <h2 id="privacy-heading" className="sr-only">{t('פרטיות', 'Privacy')}</h2>
            <PrivacySummary />
          </section>

          {profile.mode === 'resident' && (
            <ConvertToLister
              locale={locale}
              initialPhone={privateProfile?.phone ?? ''}
              initialAgency={privateProfile?.agency_name ?? ''}
            />
          )}

          <section aria-labelledby="account-heading" className="overflow-hidden rounded-shutaf-lg border border-card-border bg-white">
            <div className="px-4 py-4">
              <h2 id="account-heading" className="font-semibold text-ink">{t('חשבון', 'Account')}</h2>
              <p className="mt-1 text-sm text-muted-text">{t('פעולות חשבון ואבטחה', 'Account and security')}</p>
            </div>
            <div className="divide-y divide-card-border border-t border-card-border">
              <form action={signOut}>
                <button type="submit" className="flex w-full items-center justify-between gap-4 px-4 py-4 text-start transition-colors hover:bg-neutral-bg-soft focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange">
                  <span className="flex items-center gap-3">
                    <LogOut className="h-5 w-5 text-muted-text" aria-hidden="true" />
                    <span>
                      <span className="block font-medium text-ink">{t('התנתקות', 'Sign out')}</span>
                      <span className="mt-1 block text-sm text-muted-text">{t('התנתקות מהמכשיר הזה', 'Sign out from this device')}</span>
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
