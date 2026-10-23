'use server';

import { createServerClient } from '@/utils/supabase/server';
import { validateListingDraft } from './validation';
import { revalidatePath } from 'next/cache';
import { createHash } from 'node:crypto';
import { readListingPublicationForm, listingPublicationPayload, listingPublicationLocationValid } from './publication-contract';

export type PublishListingResult = { error: string } | { error: null; listingId: string };

export async function discardListingAttempt(requestKey: string, expectedAccountId?: string): Promise<{ status: 'cancelled' | 'published' } | { error: true }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey)) return { error: true };
  const supabase = await createServerClient({ noStore: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || expectedAccountId !== undefined && expectedAccountId !== user.id) return { error: true };
  const { data, error } = await supabase.rpc('cancel_listing_publication', { p_request_key: requestKey });
  if (error || (data !== 'cancelled' && data !== 'published')) return { error: true };
  if (data === 'published') return { status: 'published' };
  // The cancellation receipt prevents either publication RPC from creating
  // this listing. Delete only this attempt's exact owner-authorized paths.
  const paths = Array.from({ length: 8 }, (_, index) => `${requestKey}/${index + 1}.jpg`);
  const { error: removeError } = await supabase.storage.from('apartment-photos').remove(paths);
  return removeError ? { error: true } : { status: 'cancelled' };
}

export async function publishListing(formData: FormData): Promise<PublishListingResult> {
  const supabase = await createServerClient({ noStore: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || formData.has('expectedAccountId') && formData.get('expectedAccountId') !== user.id) return { error: 'כדי לפרסם דירה צריך להתחבר לחשבון.' };
  const { data: profile } = await supabase.from('profiles').select('mode').eq('id', user.id).maybeSingle();
  const { data: privateProfile } = await supabase
    .from('profile_private')
    .select('phone')
    .eq('profile_id', user.id)
    .maybeSingle();
  if ((!profile || profile.mode === 'lister') && !privateProfile?.phone?.trim()) {
    return { error: 'לפני הפרסום יש להוסיף מספר טלפון פרטי בהגדרות הפרופיל.' };
  }

  const draft = readListingPublicationForm(formData);
  const { photos } = draft;
  const validationError = validateListingDraft(draft);
  if (validationError) return { error: validationError };
  if (!listingPublicationLocationValid(formData, user.id, process.env.GEOAPIFY_API_KEY?.trim() ?? '')) {
    return { error: 'בחרו כתובת מחדש או אשרו מיקום ידני תקין.' };
  }

  // Reuse the same anonymous ID and immutable photo paths across retries.
  const listingId = String(formData.get('requestKey') ?? '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listingId)) {
    return { error: 'לא הצלחנו לזהות את ניסיון הפרסום. נסו שוב.' };
  }
  const photoUrls: string[] = [];
  const photoDigests: string[] = [];
  const hash = async (blob: Blob) => createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex');

  try {
    for (const [index, photo] of photos.entries()) {
      const path = `${listingId}/${index + 1}.jpg`;
      const digest = await hash(photo);
      const { error: uploadError } = await supabase.storage
        .from('apartment-photos')
        .upload(path, photo, { contentType: 'image/jpeg', upsert: false });
      if (uploadError) {
        // A previous attempt may have uploaded successfully despite losing its response.
        const { data: existing, error: downloadError } = await supabase.storage.from('apartment-photos').download(path);
        if (downloadError || !existing) throw uploadError;
        if (await hash(existing) !== digest) return { error: 'ניסיון הפרסום השתנה. פתחו טיוטה חדשה לפני פרסום.' };
      }
      photoDigests.push(digest);
      photoUrls.push(supabase.storage.from('apartment-photos').getPublicUrl(path).data.publicUrl);
    }

    const { data: publishedId, error: apartmentError } = await supabase.rpc('publish_apartment_once', {
      p_request_key: listingId,
      p_draft: listingPublicationPayload(draft, photoUrls, photoDigests),
    });
    if (apartmentError?.message.includes('REQUEST_CONFLICT')) return { error: 'ניסיון הפרסום השתנה. פתחו טיוטה חדשה לפני פרסום.' };
    if (apartmentError) throw apartmentError;
    if (publishedId !== listingId) throw new Error('Publish did not return listing');
  } catch {
    // A lost database response may mean the listing is already live. Never
    // delete its photos based on an ambiguous error; retry with the same key.
    console.error('Could not publish listing');
    return { error: 'לא הצלחנו לפרסם את המודעה. נסו שוב בעוד רגע.' };
  }

  revalidatePath('/my-listings');
  revalidatePath('/en/my-listings');
  revalidatePath('/map');
  revalidatePath('/discover');
  return { error: null, listingId };
}
