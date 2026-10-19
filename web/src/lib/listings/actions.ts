'use server';

import { createServerClient } from '@/utils/supabase/server';
import { validateListingDraft } from './validation';
import { revalidatePath } from 'next/cache';
import { verifyAddress } from './geocoding';
import { isIsraeliLocation } from './address-types';

export type PublishListingResult = { error: string } | { error: null; listingId: string };

export async function publishListing(formData: FormData): Promise<PublishListingResult> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'כדי לפרסם דירה צריך להתחבר לחשבון.' };
  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('phone')
    .eq('profile_id', user.id)
    .maybeSingle();
  if (!privateProfile?.phone?.trim()) {
    return { error: 'לפני הפרסום יש להוסיף מספר טלפון פרטי בהגדרות הפרופיל.' };
  }

  const photos = formData.getAll('photos').filter((value): value is File => value instanceof File && value.size > 0);
  const draft = {
    title: String(formData.get('title') ?? ''),
    address: String(formData.get('address') ?? ''),
    latitude: Number(formData.get('latitude')),
    longitude: Number(formData.get('longitude')),
    bedrooms: Number(formData.get('bedrooms')),
    billsIncluded: formData.get('billsIncluded') === 'on',
    availableRooms: formData.getAll('roomPrice').map((price) => ({ monthlyPrice: Number(price) })),
    availableFrom: String(formData.get('availableFrom') ?? ''),
    description: String(formData.get('description') ?? ''),
    photos,
  };
  const validationError = validateListingDraft(draft);
  if (validationError) return { error: validationError };
  const mode = formData.get('locationMode');
  {
    const confirmed = formData.get('locationConfirmed') === 'on';
    const providerValid = mode === 'provider' && verifyAddress(String(formData.get('locationToken') ?? ''),
      user.id, draft.address, draft.latitude, draft.longitude, process.env.GEOAPIFY_API_KEY?.trim() ?? '');
    const manualValid = mode === 'manual' && String(formData.get('locationCity') ?? '').trim().length > 1
      && String(formData.get('locationCity')).length <= 100 && isIsraeliLocation(draft.latitude, draft.longitude);
    if (!confirmed || (!providerValid && !manualValid)) {
      return { error: 'בחרו כתובת מחדש או אשרו מיקום ידני תקין.' };
    }
  }

  // Photo URLs use an anonymous listing UUID. Storage owner_id enforces access
  // without exposing the account ID in public photo paths.
  const listingId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const photoUrls: string[] = [];

  try {
    for (const [index, photo] of photos.entries()) {
      const path = `${listingId}/${index + 1}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('apartment-photos')
        .upload(path, photo, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      photoUrls.push(supabase.storage.from('apartment-photos').getPublicUrl(path).data.publicUrl);
    }

    const { data: publishedId, error: apartmentError } = await supabase.rpc('publish_apartment', {
      p_listing_id: listingId,
      p_draft: {
        title: draft.title.trim(), address: draft.address.trim(),
        latitude: draft.latitude, longitude: draft.longitude,
        bedrooms: draft.bedrooms, billsIncluded: draft.billsIncluded,
        availableFrom: draft.availableFrom, description: draft.description.trim(),
        photos: photoUrls, roomPrices: draft.availableRooms.map((room) => room.monthlyPrice),
      },
    });
    if (apartmentError) throw apartmentError;
    if (publishedId !== listingId) throw new Error('Publish did not return listing');
  } catch (error) {
    // An upload may complete before a later database write fails. It is safe
    // to remove only paths under this user's new listing prefix.
    if (uploadedPaths.length) await supabase.storage.from('apartment-photos').remove(uploadedPaths);
    console.error('Could not publish listing', error);
    return { error: 'לא הצלחנו לפרסם את המודעה. נסו שוב בעוד רגע.' };
  }

  revalidatePath('/my-listings');
  revalidatePath('/en/my-listings');
  revalidatePath('/map');
  revalidatePath('/discover');
  return { error: null, listingId };
}
