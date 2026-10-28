import { Suspense } from 'react';
import { ListingDraftSection, loadDashboardDrafts, type DraftSearchParams } from '@/components/listings/ListingDraftSection';
import { PrivateDraftContent } from '@/components/listings/PrivateDraftContent';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { RentedButton } from './RentedButton';
import { localePrefix, type Locale } from '@/lib/listings/text';
import { OwnerInquiryInbox } from '@/components/listings/OwnerInquiryInbox';
import { OwnerListingCard } from '@/components/listings/OwnerListingCard';
import { RoomAvailabilityControls } from '@/components/listings/RoomAvailabilityControls';
import { ListingIntakeControl } from '@/components/listings/ListingIntakeControl';

// Scoped deployed read contract until database types include the availability migrations.
type OwnedListing = {
  id: string; title: string; public_location_label: string | null; photos: string[] | null;
  status: string; created_at: string; inquiries_open: boolean;
  apartment_rooms: { id: string; label: string | null; monthly_price: number; is_available: boolean }[];
};
type DashboardSearchParams = DraftSearchParams & { view?: string | string[]; listing?: string | string[] };
type PendingInquiry = { apartment_id: string };

export async function renderMyListings(locale: Locale, searchParams: Promise<DashboardSearchParams> = Promise.resolve({})) {
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
  const view = typeof params.view === 'string' && ['listings', 'drafts', 'inquiries'].includes(params.view)
    ? params.view : params.draftCursor !== undefined ? 'drafts' : 'listings';
  const draftResult = view === 'drafts' ? loadDashboardDrafts(params) : null;

  const { data: listings, error } = await supabase
    .from('apartments')
    .select(
      'id, title, public_location_label, photos, status, created_at, inquiries_open, apartment_rooms(id,label,monthly_price,is_available)'
    )
    .eq('lister_id', user.id)
    .eq('source', 'user')
    .order('created_at', { referencedTable: 'apartment_rooms', ascending: true })
    .order('id', { referencedTable: 'apartment_rooms', ascending: true })
    .order('created_at', { ascending: false })
    .overrideTypes<OwnedListing[], { merge: false }>();
  if (error || listings?.some(listing => typeof listing.inquiries_open !== 'boolean')) throw new Error('Could not load your listings');
  const listingIds = (listings ?? []).map((listing) => listing.id);
  const { data: pendingInquiries, error: inquiryError } = view === 'listings' && listingIds.length
    ? await supabase
        .from('listing_inquiries')
        .select('apartment_id')
        .in('apartment_id', listingIds)
        .eq('status', 'pending')
        .overrideTypes<PendingInquiry[], { merge: false }>()
    : { data: [], error: null };
  if (inquiryError) throw new Error('Could not load listing inquiries');
  const pendingCounts = (pendingInquiries ?? []).reduce<Record<string, number>>((counts, inquiry) => {
    counts[inquiry.apartment_id] = (counts[inquiry.apartment_id] ?? 0) + 1;
    return counts;
  }, {});
  const listingFilter = typeof params.listing === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(params.listing)
    ? params.listing : undefined;
  const invalidListingFilter = params.listing !== undefined && (!listingFilter || !listingIds.includes(listingFilter));
  const dashboardPath = `${localePrefix(locale)}/my-listings`;

  return (
    <div className="mx-auto min-h-[calc(100vh-80px)] max-w-5xl bg-page-bg p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {t('המודעות שלי', 'My listings')}
          </h1>
          <p className="mt-1 text-sm text-muted-text">
            {t('ניהול המודעות, הטיוטות והפניות שלך', 'Manage your listings, drafts and inquiries')}
          </p>
        </div>
        <Link
          href={`${localePrefix(locale)}/compose`}
          className="rounded-xl bg-orange px-4 py-3 font-semibold text-white"
        >
          {t('+ הוספת מודעה', '+ Add listing')}
        </Link>
      </header>

      <nav aria-label={t('תצוגות ניהול', 'Management views')} className="mb-6 flex flex-wrap gap-3">
        {([['listings', t('מודעות', 'Listings')], ['drafts', t('טיוטות', 'Drafts')], ['inquiries', t('פניות', 'Inquiries')]] as const).map(([key, label]) => (
          <Link key={key} href={`${dashboardPath}?view=${key}${key === 'drafts' ? '#saved-drafts' : ''}`}
            aria-current={view === key ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-xl border px-4 py-2 font-semibold text-ink ${view === key ? 'border-orange bg-orange-soft' : 'border-card-border bg-white'}`}>
            {label}
          </Link>
        ))}
      </nav>
      {view === 'listings' && <section aria-labelledby="published-listings-heading">
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
                {(listing.status === 'active' || listing.status === 'taken') && (
                  <RentedButton id={listing.id} locale={locale} status={listing.status}
                    hasAvailableRooms={listing.apartment_rooms.some(room => room.is_available)} intakeOpen={listing.inquiries_open} />
                )}
                <RoomAvailabilityControls listingId={listing.id} rooms={listing.apartment_rooms ?? []} locale={locale} />
                <ListingIntakeControl listingId={listing.id} open={listing.inquiries_open}
                  listingAvailable={listing.status === 'active' && listing.apartment_rooms.some(room => room.is_available)} locale={locale} />
                <Link href={`${dashboardPath}?view=inquiries&listing=${encodeURIComponent(listing.id)}`}
                  className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-card-border px-3 py-2 text-sm font-semibold text-teal-hover">
                  {t('צפייה בפניות', 'View inquiries')}{pendingCounts[listing.id] ? ` (${pendingCounts[listing.id]} ${t('ממתינות', 'pending')})` : ''}
                </Link>
              </OwnerListingCard>
            </li>
          ))}
        </ul>
      )}
      </section>}
      {view === 'drafts' && draftResult && <section id="saved-drafts" aria-labelledby="saved-drafts-heading" className="mt-8">
        <h2 id="saved-drafts-heading" className="text-lg font-semibold text-ink">{t('טיוטות שמורות', 'Saved drafts')}</h2>
        <p className="mb-3 mt-1 text-sm text-muted-text">{t('הטיוטות פרטיות וגלויות רק לך.', 'Drafts are private and visible only to you.')}</p>
        <PrivateDraftContent accountId={user.id} locale={locale}>
          <Suspense key={JSON.stringify(params.draftCursor)} fallback={<p role="status" className="text-sm text-muted-text">
            {t('טוענים טיוטות…', 'Loading drafts…')}
          </p>}>
            <ListingDraftSection result={draftResult} locale={locale} paged={params.draftCursor !== undefined} />
          </Suspense>
        </PrivateDraftContent>
      </section>}
      {view === 'inquiries' && <section aria-labelledby="inquiries-heading">
        <h2 id="inquiries-heading" className="mb-3 text-lg font-semibold text-ink">{t('פניות לדירות שלי', 'Inquiries for my apartments')}</h2>
        {invalidListingFilter ? <div className="space-y-3 rounded-xl border border-card-border bg-white p-4">
          <p role="alert" className="text-ink">{t('הדירה אינה זמינה לניהול בחשבון הזה.', 'This apartment is unavailable for this account.')}</p>
          <Link href={`${dashboardPath}?view=inquiries`} className="inline-flex min-h-11 items-center text-teal-hover underline">{t('פניות לכל הדירות', 'Inquiries for all apartments')}</Link>
        </div> : <OwnerInquiryInbox key={`${user.id}:${listingFilter ?? ''}`} locale={locale}
          listings={(listings ?? []).map(({ id, title }) => ({ id, title }))} initialListingId={listingFilter} />}
      </section>}
    </div>
  );
}
