import Link from 'next/link';
import type { ListingLocale } from '@/lib/listings/public';

export function ListingUnavailable({ locale }: { locale: ListingLocale }) {
  const en = locale === 'en';
  return (
    <main lang={locale} dir={en ? 'ltr' : 'rtl'} className="mx-auto w-full max-w-xl p-8 text-center text-ink">
      <h1 className="text-xl font-bold">
        {en ? 'Listing unavailable' : 'המודעה אינה זמינה'}
      </h1>
      <p className="mt-3 text-muted-text">
        {en ? 'This apartment is not available to view.' : 'לא ניתן לצפות בדירה הזו כרגע.'}
      </p>
      <Link href={en ? '/en/listings' : '/listings'} className="mt-5 inline-flex rounded-xl bg-orange px-5 py-3 font-semibold text-white">
        {en ? 'Browse apartments in Shutaf' : 'לצפייה בדירות ב־Shutaf'}
      </Link>
    </main>
  );
}
