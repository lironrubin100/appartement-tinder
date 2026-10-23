import Image from 'next/image';
import Link from 'next/link';
import {
  getPublicListing,
  listingPath,
  type ListingLocale,
} from '@/lib/listings/public';
import { ShareListing } from './ShareListing';
import { ListingContact } from './ListingContact';

export async function PublicListing({
  id,
  locale = 'he',
}: {
  id: string;
  locale?: ListingLocale;
}) {
  const listing = await getPublicListing(id);
  const en = locale === 'en';
  const price =
    listing.min_room_price === listing.max_room_price
      ? `₪${listing.min_room_price.toLocaleString('en-US')}`
      : `₪${listing.min_room_price.toLocaleString('en-US')}–${listing.max_room_price.toLocaleString('en-US')}`;
  return (
    <main
      lang={locale}
      dir={en ? 'ltr' : 'rtl'}
      className="mx-auto w-full max-w-4xl px-5 py-8 text-ink"
    >
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link href={en ? '/en/listings' : '/listings'} className="text-xl font-bold text-orange-dark">
          Shutaf
        </Link>
        <a
          href={listingPath(id, en ? 'he' : 'en')}
          hrefLang={en ? 'he' : 'en'}
          className="rounded-xl border border-card-border px-4 py-3 text-teal"
        >
          {en ? 'עברית' : 'English'}
        </a>
      </header>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">{listing.title}</h1><ShareListing id={id} locale={locale}/></div>
      <p className="mb-5 text-muted-text">
        {en ? 'Approximate area' : 'אזור משוער'} ·{' '}
        {listing.bedrooms} {en ? 'bedrooms' : 'חדרים בדירה'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {listing.photos.map((photo, index) => (
          <div
            key={`${photo}-${index}`}
            className={`relative aspect-[3/2] overflow-hidden rounded-2xl bg-neutral-bg-soft ${index === 0 ? 'sm:col-span-2' : ''}`}
          >
            <Image
              src={photo}
              alt={`${listing.title} · ${en ? 'Photo' : 'תמונה'} ${index + 1}`}
              fill
              unoptimized
              priority={index === 0}
              sizes="(max-width: 640px) 100vw, 800px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <section className="my-6 rounded-2xl border border-card-border bg-white p-5">
        <h2 className="text-xl font-bold">
          <bdi>{price}</bdi> {en ? 'per room / month' : 'לחדר / חודש'}
        </h2>
        <p className="mt-2">
          {listing.available_room_count}{' '}
          {en ? 'available rooms' : 'חדרים פנויים'} ·{' '}
          {listing.bills_included
            ? en
              ? 'Bills included'
              : 'חשבונות כלולים'
            : en
              ? 'Bills not included'
              : 'חשבונות לא כלולים'}
        </p>
        {listing.available_from && (
          <p className="mt-2">
            {en ? 'Available from' : 'כניסה מתאריך'}:{' '}
            <bdi>
              {new Date(
                `${listing.available_from}T12:00:00`
              ).toLocaleDateString(en ? 'en-GB' : 'he-IL')}
            </bdi>
          </p>
        )}
        {listing.is_sublet && <p className="mt-2">{en ? 'Sublet' : 'סאבלט'}</p>}
      </section>
      {listing.description && (
        <section className="mb-6">
          <h2 className="mb-2 text-xl font-bold">
            {en ? 'About the apartment' : 'על הדירה'}
          </h2>
          <p className="whitespace-pre-wrap break-words text-body-text">
            {listing.description}
          </p>
        </section>
      )}
      <p className="rounded-xl bg-teal-soft p-4 text-body-text">
        {en
          ? 'The exact address is private. It is shared in the app only after the owner accepts your inquiry.'
          : 'הכתובת המדויקת פרטית. היא תיחשף באפליקציה רק לאחר שבעל המודעה יאשר את הפנייה שלך.'}
      </p>
      <ListingContact id={id} locale={locale} />
      <Link
        href={locale === 'en' ? '/en/listings' : '/listings'}
        className="mt-6 inline-flex rounded-xl bg-orange px-5 py-3 font-semibold text-white"
      >
        {en ? 'Browse apartments in Shutaf' : 'לצפייה בדירות ב־Shutaf'}
      </Link>
    </main>
  );
}
