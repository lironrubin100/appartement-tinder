'use server';

import { createServerClient } from '@/utils/supabase/server';
import { validateListingDraft } from './validation';

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
    price: Number(formData.get('price')),
    location: String(formData.get('location') ?? ''),
    bedrooms: Number(formData.get('bedrooms')),
    availableFrom: String(formData.get('availableFrom') ?? ''),
    description: String(formData.get('description') ?? ''),
    photos,
  };
  const validationError = validateListingDraft(draft);
  if (validationError) return { error: validationError };

  // Do not publish until the user can select coordinates and listing images
  // can be stored. In particular, never put the private profile phone in the
  // publicly-readable contact_url field.
  return {
    error: 'הטופס מוכן, אבל פרסום עדיין דורש עדכון מסד נתונים: שדה טלפון פרטי, אחסון תמונות למודעות, וקביעת מיקום במפה. הפרטים לא נשמרו.',
  };
}
