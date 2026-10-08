'use server';

import { createServerClient } from '@/utils/supabase/server';
import { validateListingDraft } from './validation';
import { revalidatePath } from 'next/cache';
import { publicAreaLabel } from './locationPrivacy';

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

  // A listing id is created before upload only for a collision-free storage
  // prefix. The storage policy permits only the current user's top-level
  // folder; no phone number is written to the listing.
  const listingId = crypto.randomUUID();
  const uploadedPaths: string[] = [];
  const photoUrls: string[] = [];
  let apartmentCreated = false;

  try {
    for (const [index, photo] of photos.entries()) {
      const path = `${user.id}/${listingId}/${index + 1}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('apartment-photos')
        .upload(path, photo, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      photoUrls.push(supabase.storage.from('apartment-photos').getPublicUrl(path).data.publicUrl);
    }

    // The listing stays paused until both its room rows and photo gallery are
    // present. This prevents a partially-created apartment from appearing in
    // apartments_public if a later write fails.
    const { error: apartmentError } = await supabase.from('apartments').insert({
      id: listingId,
      lister_id: user.id,
      source: 'user',
      title: draft.title.trim(),
      address: draft.address.trim(),
      lat: draft.latitude,
      lng: draft.longitude,
      price: Math.min(...draft.availableRooms.map((room) => room.monthlyPrice)),
      bedrooms: draft.bedrooms,
      bills_included: draft.billsIncluded,
      available_from: draft.availableFrom,
      description: draft.description.trim() || null,
      photos: photoUrls,
      public_location_label: publicAreaLabel(),
      status: 'paused',
    });
    if (apartmentError) throw apartmentError;
    apartmentCreated = true;

    const { error: roomsError } = await supabase.from('apartment_rooms').insert(
      draft.availableRooms.map((room, index) => ({
        apartment_id: listingId,
        label: `חדר פנוי ${index + 1}`,
        monthly_price: room.monthlyPrice,
        available_from: draft.availableFrom,
        is_available: true,
      }))
    );
    if (roomsError) throw roomsError;

    const { error: activateError } = await supabase
      .from('apartments')
      .update({ status: 'active' })
      .eq('id', listingId)
      .eq('lister_id', user.id);
    if (activateError) throw activateError;
  } catch (error) {
    // An upload may complete before a later database write fails. It is safe
    // to remove only paths under this user's new listing prefix.
    if (uploadedPaths.length) await supabase.storage.from('apartment-photos').remove(uploadedPaths);
    // A paused parent is still a real database record. Delete it if one of
    // the dependent writes failed; cascading removes any rooms already made.
    if (apartmentCreated) {
      await supabase.from('apartments').delete().eq('id', listingId).eq('lister_id', user.id);
    }
    console.error('Could not publish listing', error);
    return { error: 'לא הצלחנו לפרסם את המודעה. נסו שוב בעוד רגע.' };
  }

  revalidatePath('/my-listings');
  revalidatePath('/map');
  revalidatePath('/discover');
  return { error: null, listingId };
}
