import Link from 'next/link';
import { createServerClient } from '@/utils/supabase/server';
import { authPath, localePath, type Locale } from '@/utils/navigation';
import { listingPath } from '@/lib/listings/public';
import { RequestViewing } from './RequestViewing';

export async function ListingContact({
  id,
  locale,
}: {
  id: string;
  locale: Locale;
}) {
  const en = locale === 'en';
  const client = await createServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const path = listingPath(id, locale);
  const style =
    'mt-5 inline-flex rounded-xl bg-orange px-5 py-3 font-semibold text-white';
  if (!user)
    return (
      <Link className={style} href={authPath('login', path, locale)}>
        {en ? 'Sign in to request a viewing' : 'התחברות ושליחת פנייה'}
      </Link>
    );
  const { data: own, error: ownershipError } = await client
    .from('apartments')
    .select('id')
    .eq('id', id)
    .eq('lister_id', user.id)
    .maybeSingle();
  if (ownershipError) throw new Error('Could not verify listing ownership');
  if (own)
    return (
      <Link className={style} href={localePath('/my-listings', locale)}>
        {en ? 'Manage your listing' : 'ניהול המודעה שלי'}
      </Link>
    );
  const { data: profile } = await client
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.onboarded)
    return (
      <Link className={style} href={authPath('onboarding', path, locale)}>
        {en
          ? 'Complete your profile to contact the owner'
          : 'השלמת פרופיל ויצירת קשר'}
      </Link>
    );
  const { data: inquiry, error } = await client
    .from('listing_inquiries')
    .select('status,conversation_id')
    .eq('apartment_id', id)
    .eq('requester_id', user.id)
    .maybeSingle();
  if (error) throw new Error('Could not load inquiry');
  if (inquiry?.status === 'accepted' && inquiry.conversation_id)
    return (
      <Link
        className={style}
        href={localePath(`/chats/${inquiry.conversation_id}`, locale)}
      >
        {en ? 'Open conversation' : 'פתיחת השיחה'}
      </Link>
    );
  return (
    <RequestViewing
      apartmentId={id}
      pending={inquiry?.status === 'pending'}
      locale={locale}
    />
  );
}
