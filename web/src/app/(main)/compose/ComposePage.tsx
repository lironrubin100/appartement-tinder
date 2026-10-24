import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/utils/supabase/server';
import ComposeForm from './ComposeForm';
import { EditListingForm } from '@/components/listings/EditListingForm';
import { localePrefix, type Locale } from '@/lib/listings/text';
import { loadListingCloudDraft } from '@/lib/listings/draft-actions';
import { PrivateDraftContent } from '@/components/listings/PrivateDraftContent';
import { NewListingCloudDraft } from '@/components/listings/NewListingCloudDraft';
import { authPath } from '@/utils/navigation';

export type ComposeSearchParams = { draft?: string | string[]; listing?: string | string[] };
export async function renderCompose(locale: Locale, searchParams: Promise<ComposeSearchParams> = Promise.resolve({})) {
  const supabase = await createServerClient({ noStore: true });
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;
  const path = localePrefix(locale) + '/compose';
  if (!user) redirect(authPath('login', path + (typeof params.draft === 'string' ? '?draft=' + encodeURIComponent(params.draft) : typeof params.listing === 'string' ? '?listing=' + encodeURIComponent(params.listing) : ''), locale));
  const [{ data: profile }, { data: privateProfile }] = await Promise.all([
    supabase.from('profiles').select('mode').eq('id', user.id).maybeSingle(),
    supabase.from('profile_private').select('phone').eq('profile_id', user.id).maybeSingle(),
  ]);
  if (!profile) redirect(authPath('onboarding', path, locale));
  if (params.listing !== undefined) return <EditListingForm key={user.id + ':' + String(params.listing)} accountId={user.id} locale={locale} listingId={typeof params.listing === 'string' ? params.listing : ''} />;
  if (params.draft === undefined) return <PrivateDraftContent accountId={user.id} locale={locale} preserveInput>
    <NewListingCloudDraft accountId={user.id} locale={locale} />
  </PrivateDraftContent>;
  const result = typeof params.draft === 'string' ? await loadListingCloudDraft(params.draft) : null;
  if (!result?.ok || result.data.state === 'deleting') {
    const unavailable = !result || !result.ok && ['NOT_FOUND', 'VALIDATION_FAILED'].includes(result.error.code) || result.ok;
    return <section className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-ink">{locale === 'en' ? 'Saved draft' : 'טיוטה שמורה'}</h1>
      <p role="alert" className="mt-3">{unavailable
        ? (locale === 'en' ? 'This draft is unavailable.' : 'הטיוטה אינה זמינה.')
        : (locale === 'en' ? 'Could not load the draft. Please retry.' : 'לא הצלחנו לטעון את הטיוטה. נסו שוב.')}</p>
      {!unavailable && <a href={path + '?draft=' + encodeURIComponent(String(params.draft))} className="mt-4 inline-block p-3 text-teal underline">{locale === 'en' ? 'Try again' : 'ניסיון נוסף'}</a>}
      <Link href={localePrefix(locale) + '/my-listings'} className="mt-4 inline-block p-3 text-teal underline">{locale === 'en' ? 'My listings' : 'המודעות שלי'}</Link>
    </section>;
  }
  if (result.data.kind === 'edit') return <EditListingForm key={user.id + ':' + result.data.id} accountId={user.id} locale={locale} draft={result.data} />;
  return <PrivateDraftContent key={user.id + ':' + result.data.id} accountId={user.id} locale={locale} preserveInput>
    <ComposeForm key={result.data.id} cloudDraft={result.data} accountId={user.id} locale={locale}
      requiresPrivatePhone={profile.mode === 'lister'} hasPrivatePhone={Boolean(privateProfile?.phone?.trim())} />
  </PrivateDraftContent>;
}
