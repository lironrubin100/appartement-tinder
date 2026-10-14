import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { validListingId } from '@/lib/listings/public';
import { localePrefix, type Locale } from '@/lib/listings/text';

export async function renderPublished(listingId: string, locale: Locale) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  if (!validListingId(listingId)) notFound();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data, error } = await supabase.from('apartments').select('id,title,status').eq('id', listingId).eq('lister_id', user.id).maybeSingle();
  if (error) throw new Error('Could not verify published listing');
  if (!data || data.status !== 'active') notFound();
  return <section className="mx-auto max-w-xl px-5 py-16 text-center">
    <span aria-hidden="true" className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/10 text-4xl text-success">✓</span>
    <h1 className="mt-6 text-3xl font-bold text-ink">{t('המודעה פורסמה!', 'Listing published!')}</h1>
    <p className="mt-3 text-body-text">{data.title}</p>
    <p className="mt-2 text-muted-text">{t('הדירה והחדרים הפנויים מופיעים עכשיו ב־Shutaf.', 'Your apartment and available rooms are now on Shutaf.')}</p>
    <Link href={`${localePrefix(locale)}/listings/${data.id}`} className="mt-7 inline-flex rounded-xl bg-orange px-6 py-3 font-semibold text-white">{t('צפייה במודעה', 'View listing')}</Link>
    <Link href={`${localePrefix(locale)}/my-listings`} className="mt-4 block text-teal">{t('למודעות שלי', 'My listings')}</Link>
  </section>;
}
