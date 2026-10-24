import { Suspense } from 'react';
import { ListingDraftSection, loadDashboardDrafts, type DraftSearchParams } from '@/components/listings/ListingDraftSection';
import { PrivateDraftContent } from '@/components/listings/PrivateDraftContent';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { RentedButton } from './RentedButton';
import { localePrefix, type Locale } from '@/lib/listings/text';
import { InquiryActionButtons } from '@/components/listings/InquiryActionButtons';
import { OwnerListingCard } from '@/components/listings/OwnerListingCard';

export async function renderMyListings(locale: Locale, searchParams: Promise<DraftSearchParams> = Promise.resolve({})) {
  const t = (he: string, en: string) => (locale === 'en' ? en : he);
  const supabase = await createServerClient({ noStore: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('mode')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding');

  const params = await searchParams;
  const draftResult = loadDashboardDrafts(params);

  const { data: listings, error } = await supabase
    .from('apartments')
    .select(
      'id, title, public_location_label, photos, status, created_at, apartment_rooms(monthly_price,is_available)'
    )
    .eq('lister_id', user.id)
    .eq('source', 'user')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Could not load your listings');
  const listingIds = (listings ?? []).map((listing) => listing.id);
  const { data: pendingInquiries, error: inquiryError } = listingIds.length
    ? await supabase
        .from('listing_inquiries')
        .select('id, apartment_id')
        .in('apartment_id', listingIds)
        .eq('status', 'pending')
    : { data: [], error: null };
  if (inquiryError) throw new Error('Could not load listing inquiries');
  const inquiriesByApartment = (pendingInquiries ?? []).reduce<
    Record<string, string[]>
  >((result, inquiry) => {
    (result[inquiry.apartment_id] ??= []).push(inquiry.id);
    return result;
  }, {});

  return (
    <div className="mx-auto min-h-[calc(100vh-80px)] max-w-5xl bg-page-bg p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {t('המודעות שלי', 'My listings')}
          </h1>
          <p className="mt-1 text-sm text-muted-text">
            {t('ניהול המודעות והטיוטות שלך', 'Manage your listings and saved drafts')}
          </p>
        </div>
        <Link
          href={`${localePrefix(locale)}/compose`}
          className="rounded-xl bg-orange px-4 py-3 font-semibold text-white"
        >
          {t('+ הוספת מודעה', '+ Add listing')}
        </Link>
      </header>

      <section aria-labelledby="published-listings-heading">
        <h2 id="published-listings-heading" className="mb-3 text-lg font-semibold text-ink">
          {t('מודעות שפורסמו', 'Published listings')}
        </h2>
      {!listings?.length ? (
        <section className="rounded-2xl border border-card-border bg-white p-8 text-center">
          <h3 className="font-semibold text-ink">
            {t('עדיין אין מודעות שפורסמו', 'No published listings yet')}
          </h3>
          <p className="mt-2 text-sm text-muted-text">
            {t(
              'כשתהיה מוכנה לפרסום, המודעות יופיעו כאן.',
              'Your apartments will appear here after publishing.'
            )}
          </p>
        </section>
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <OwnerListingCard
                listing={listing}
                locale={locale}
                manageHref={`${localePrefix(locale)}/compose?listing=${listing.id}`}
                viewHref={listing.status === 'active' ? `${localePrefix(locale)}/listings/${listing.id}` : undefined}
              >
                {listing.status === 'active' && (
                  <RentedButton id={listing.id} locale={locale} />
                )}
                {(inquiriesByApartment[listing.id] ?? []).length > 0 && (
                  <div className="mt-3 rounded-shutaf-md bg-orange-soft p-3">
                    <p className="text-sm font-semibold text-ink">
                      {inquiriesByApartment[listing.id].length}{' '}
                      {t('פניות ממתינות', 'pending inquiries')}
                    </p>
                    {inquiriesByApartment[listing.id].map((inquiryId) => (
                      <InquiryActionButtons key={inquiryId} inquiryId={inquiryId} locale={locale} />
                    ))}
                  </div>
                )}
              </OwnerListingCard>
            </li>
          ))}
        </ul>
      )}
      </section>
      <section id="saved-drafts" aria-labelledby="saved-drafts-heading" className="mt-8">
        <h2 id="saved-drafts-heading" className="text-lg font-semibold text-ink">{t('טיוטות שמורות', 'Saved drafts')}</h2>
        <p className="mb-3 mt-1 text-sm text-muted-text">{t('הטיוטות פרטיות וגלויות רק לך.', 'Drafts are private and visible only to you.')}</p>
        <PrivateDraftContent accountId={user.id} locale={locale}>
          <Suspense key={JSON.stringify(params.draftCursor)} fallback={<p role="status" className="text-sm text-muted-text">
            {t('טוענים טיוטות…', 'Loading drafts…')}
          </p>}>
            <ListingDraftSection result={draftResult} locale={locale} paged={params.draftCursor !== undefined} />
          </Suspense>
        </PrivateDraftContent>
      </section>
    </div>
  );
}
