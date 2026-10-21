import Image from 'next/image';
import Link from 'next/link';
import { localePrefix, type Locale } from '@/lib/listings/text';

type Room = Readonly<{ monthly_price: number; is_available: boolean }>;
type Listing = Readonly<{
  id: string;
  title: string;
  public_location_label: string | null;
  photos: readonly string[] | null;
  status: string;
  apartment_rooms: readonly Room[] | null;
}>;

type Props = Readonly<{
  listing: Listing;
  locale: Locale;
  viewHref?: string;
  manageHref?: string;
}>;

const statuses: Record<string, { he: string; en: string }> = {
  active: { he: 'פעילה', en: 'Active' },
  paused: { he: 'מושהית', en: 'Paused' },
  flagged: { he: 'בבדיקה', en: 'Under review' },
  taken: { he: 'הושכרה', en: 'Rented' },
};

/** Presentation only: availability changes remain in the owning page/actions. */
export function OwnerListingCard({ listing, locale, viewHref, manageHref }: Props) {
  const t = (he: string, en: string) => (locale === 'en' ? en : he);
  const rooms = (listing.apartment_rooms ?? []).filter((room) => room.is_available);
  const prices = rooms.map((room) => room.monthly_price);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  const photo = listing.photos?.[0];

  return (
    <article data-testid="owner-listing" data-listing-id={listing.id} className="flex flex-wrap items-start gap-4 rounded-2xl border border-card-border bg-white p-4">
      {photo ? (
        <Image src={photo} alt="" width={96} height={80} unoptimized className="h-20 w-24 rounded-xl object-cover" />
      ) : (
        <div aria-hidden="true" className="h-20 w-24 rounded-xl bg-neutral-bg-soft" />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="break-words font-semibold text-ink">{listing.title}</h2>
        {listing.public_location_label && <p className="text-sm text-muted-text">{listing.public_location_label}</p>}
        <p className="mt-1 font-semibold text-orange">
          {low !== null && high !== null ? (
            <>
              <bdi>₪{low.toLocaleString('en-US')}{low !== high ? `–${high.toLocaleString('en-US')}` : ''}</bdi>{' '}
              {t('לחדר / חודש', 'per room / month')} · {rooms.length}{' '}
              {listing.status === 'taken' ? t('חדרים', 'rooms') : t('חדרים פנויים', 'available rooms')}
            </>
          ) : t('אין חדרים פנויים', 'No available rooms')}
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          {viewHref && <Link href={viewHref} className="text-teal underline">{t('צפייה במודעה', 'View listing')}</Link>}
          <Link href={manageHref ?? `${localePrefix(locale)}/my-listings`} className="text-teal underline">{t('ניהול המודעה', 'Manage listing')}</Link>
        </div>
      </div>
      <span data-testid="listing-status" className="shrink-0 rounded-full bg-neutral-bg-soft px-3 py-1 text-sm">
        {statuses[listing.status]?.[locale] ?? listing.status}
      </span>
    </article>
  );
}
