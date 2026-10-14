import 'server-only';
import { cache } from 'react';
import { createServerClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export type ListingLocale = 'he' | 'en';
export const listingPath = (id: string, locale: ListingLocale = 'he') => `${locale === 'en' ? '/en' : ''}/listings/${id}`;
export const validListingId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// React cache deduplicates page and metadata reads within this request only.
export const getPublicListing = cache(async (id: string) => {
  if (!validListingId(id)) notFound();
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('get_public_listing', { p_listing_id: id });
  if (error) throw new Error('Could not load listing');
  if (!data?.length) notFound();
  return data[0];
});

export async function listingMetadata(id: string, locale: ListingLocale): Promise<Metadata> {
  const listing = await getPublicListing(id);
  const description = locale === 'he'
    ? `${listing.available_room_count} חדרים פנויים · ₪${listing.min_room_price}–${listing.max_room_price} לחדר · אזור משוער בבאר שבע`
    : `${listing.available_room_count} available rooms · ₪${listing.min_room_price}–${listing.max_room_price} per room · Approximate area in Beer Sheva`;
  return {
    title: `${listing.title} | Shutaf`, description,
    alternates: { canonical: listingPath(id, locale), languages: { he: listingPath(id), en: listingPath(id, 'en') } },
    openGraph: { title: listing.title, description, type: 'website', locale: locale === 'he' ? 'he_IL' : 'en_US', images: listing.photos.slice(0, 1) },
  };
}
