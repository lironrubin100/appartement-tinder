import 'server-only';
import { cache } from 'react';
import { createServerClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export type ListingLocale = 'he' | 'en';
export const listingPath = (id: string, locale: ListingLocale = 'he') => `${locale === 'en' ? '/en' : ''}/listings/${id}`;
export const validListingId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

type PublicRoom = { monthly_price: number; available_from: string };

function publicRooms(value: unknown): PublicRoom[] {
  if (!Array.isArray(value)) throw new Error('Could not load listing');
  return value.map(room => {
    if (!room || typeof room !== 'object' ||
      !Number.isSafeInteger(room.monthly_price) || room.monthly_price < 1 ||
      typeof room.available_from !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(room.available_from) ||
      !Number.isFinite(Date.parse(`${room.available_from}T12:00:00Z`)) ||
      new Date(`${room.available_from}T12:00:00Z`).toISOString().slice(0, 10) !== room.available_from) {
      throw new Error('Could not load listing');
    }
    // Keep the public room boundary even if the server adds another field later.
    return { monthly_price: room.monthly_price, available_from: room.available_from };
  });
}

// React cache deduplicates page and metadata reads within this request only.
export const getPublicListing = cache(async (id: string) => {
  if (!validListingId(id)) notFound();
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('get_public_listing', { p_listing_id: id });
  if (error) throw new Error('Could not load listing');
  if (!data?.length) notFound();
  const listing = data[0];
  const rooms = publicRooms(listing.rooms);
  if (rooms.length !== listing.available_room_count) throw new Error('Could not load listing');
  return { ...listing, rooms };
});

export async function listingMetadata(id: string, locale: ListingLocale): Promise<Metadata> {
  const listing = await getPublicListing(id);
  const description = locale === 'he'
    ? `${listing.available_room_count} חדרים פנויים · ₪${listing.min_room_price}–${listing.max_room_price} לחדר · אזור משוער`
    : `${listing.available_room_count} available rooms · ₪${listing.min_room_price}–${listing.max_room_price} per room · Approximate area`;
  return {
    title: `${listing.title} | Shutaf`, description,
    alternates: { canonical: listingPath(id, locale), languages: { he: listingPath(id), en: listingPath(id, 'en') } },
    openGraph: { title: listing.title, description, type: 'website', locale: locale === 'he' ? 'he_IL' : 'en_US', images: listing.photos.slice(0, 1) },
  };
}
