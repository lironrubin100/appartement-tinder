import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { RentedButton } from './RentedButton';
import { localePrefix, type Locale } from '@/lib/listings/text';
import { InquiryActionButtons } from '@/components/listings/InquiryActionButtons';

const STATUS_LABEL: Record<string, string> = {
  active: 'פעילה',
  paused: 'מושהית',
  flagged: 'בבדיקה',
  taken: 'הושכרה',
};

export async function renderMyListings(locale: Locale) {
  const t = (he: string, en: string) => (locale === 'en' ? en : he);
  const supabase = await createServerClient();
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
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {t('המודעות שלי', 'My listings')}
          </h1>
          <p className="mt-1 text-sm text-muted-text">
            {t('ניהול הדירות שפרסמת', 'Manage your published apartments')}
          </p>
        </div>
        <Link
          href={`${localePrefix(locale)}/compose`}
          className="rounded-xl bg-orange px-4 py-3 font-semibold text-white"
        >
          {t('+ הוספת מודעה', '+ Add listing')}
        </Link>
      </header>

      {!listings?.length ? (
        <section className="rounded-2xl border border-card-border bg-white p-8 text-center">
          <h2 className="font-semibold text-ink">
            {t('עדיין אין לך מודעות', 'No listings yet')}
          </h2>
          <p className="mt-2 text-sm text-muted-text">
            {t(
              'כשתהיה מוכנה לפרסום, המודעות יופיעו כאן.',
              'Your apartments will appear here after publishing.'
            )}
          </p>
        </section>
      ) : (
        <ul className="space-y-3">
          {listings.map((listing) => {
            const rooms = listing.apartment_rooms.filter(
              (room) => room.is_available
            );
            const prices = rooms.map((room) => room.monthly_price);
            const low = Math.min(...prices),
              high = Math.max(...prices);
            return (
              <li
                key={listing.id}
                data-testid="owner-listing"
                data-listing-id={listing.id}
                className="flex flex-wrap items-start gap-4 rounded-2xl border border-card-border bg-white p-4"
              >
                {listing.photos[0] ? (
                  <Image
                    src={listing.photos[0]}
                    alt=""
                    width={96}
                    height={80}
                    unoptimized
                    className="h-20 w-24 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-20 w-24 rounded-xl bg-neutral-bg-soft" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="break-words font-semibold text-ink">
                    {listing.title}
                  </h2>
                  <p className="text-sm text-muted-text">
                    {listing.public_location_label}
                  </p>
                  <p className="mt-1 font-semibold text-orange">
                    {prices.length ? (
                      <>
                        <bdi>
                          ₪{low.toLocaleString('en-US')}
                          {low !== high
                            ? `–${high.toLocaleString('en-US')}`
                            : ''}
                        </bdi>{' '}
                        {t('לחדר / חודש', 'per room / month')} · {rooms.length}{' '}
                        {listing.status === 'taken'
                          ? t('חדרים', 'rooms')
                          : t('חדרים פנויים', 'available rooms')}
                      </>
                    ) : (
                      t('אין חדרים פנויים', 'No available rooms')
                    )}
                  </p>
                  {listing.status === 'active' && (
                    <>
                      <Link
                        href={`${localePrefix(locale)}/listings/${listing.id}`}
                        className="mt-3 inline-block text-teal underline"
                      >
                        {t('צפייה במודעה', 'View listing')}
                      </Link>
                      <RentedButton id={listing.id} locale={locale} />
                    </>
                  )}
                  {(inquiriesByApartment[listing.id] ?? []).length > 0 && (
                    <div className="mt-3 rounded-shutaf-md bg-orange-soft p-3">
                      <p className="text-sm font-semibold text-ink">
                        {inquiriesByApartment[listing.id].length}{' '}
                        {t('פניות ממתינות', 'pending inquiries')}
                      </p>
                      {inquiriesByApartment[listing.id].map((inquiryId) => (
                        <InquiryActionButtons
                          key={inquiryId}
                          inquiryId={inquiryId}
                          locale={locale}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <span
                  data-testid="listing-status"
                  className="shrink-0 rounded-full bg-neutral-bg-soft px-3 py-1 text-sm"
                >
                  {locale === 'en'
                    ? ({
                        active: 'Active',
                        paused: 'Paused',
                        flagged: 'Under review',
                        taken: 'Rented',
                      }[listing.status] ?? listing.status)
                    : (STATUS_LABEL[listing.status] ?? listing.status)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
