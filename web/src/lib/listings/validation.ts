export const LISTING_PHOTO_MIN = 3;
export const LISTING_PHOTO_MAX = 8;
export const LISTING_PHOTO_MAX_BYTES = 12 * 1024 * 1024;

export type AvailableRoomDraft = {
  monthlyPrice: number;
};

export type ListingDraft = {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  billsIncluded: boolean;
  availableRooms: AvailableRoomDraft[];
  availableFrom: string;
  description: string;
  photos: File[];
};

export function validateListingFacts(draft: Pick<ListingDraft, 'title' | 'bedrooms' | 'billsIncluded' | 'availableFrom' | 'description'>): string | null {
  if (!draft.title.trim()) return 'יש להזין כותרת למודעה.';
  if (draft.title.trim().length > 100 || draft.description.length > 2000) return 'יש לקצר את פרטי המודעה.';
  if (!Number.isInteger(draft.bedrooms) || draft.bedrooms < 1 || draft.bedrooms > 20) return 'יש להזין מספר חדרים תקין.';
  if (typeof draft.billsIncluded !== 'boolean') return 'יש לבחור אם החשבונות כלולים.';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(draft.availableFrom) && !draft.availableFrom.startsWith('0000-') ? new Date(draft.availableFrom + 'T00:00:00Z') : null;
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== draft.availableFrom) return 'יש לבחור תאריך כניסה.';
  return null;
}

export function validateListingPhotos(photos: readonly File[]): string | null {
  if (photos.length < LISTING_PHOTO_MIN) return `יש להוסיף לפחות ${LISTING_PHOTO_MIN} תמונות.`;
  if (photos.length > LISTING_PHOTO_MAX) return `אפשר להוסיף עד ${LISTING_PHOTO_MAX} תמונות.`;
  if (photos.some((photo) => !photo.type.startsWith('image/'))) return 'אפשר להעלות קובצי תמונה בלבד.';
  if (photos.some((photo) => photo.size > LISTING_PHOTO_MAX_BYTES)) return 'כל תמונה צריכה להיות קטנה מ־12MB.';
  return null;
}

export function validateListingDraft(draft: ListingDraft): string | null {
  const facts = validateListingFacts(draft);
  if (facts) return facts;
  if (draft.address.trim().length > 200) return 'יש לקצר את פרטי המודעה.';
  if (!draft.address.trim()) return 'יש להזין את הכתובת המדויקת של הדירה.';
  if (!Number.isFinite(draft.latitude) || draft.latitude < -90 || draft.latitude > 90) {
    return 'יש להזין קו רוחב תקין עבור מיקום הדירה.';
  }
  if (!Number.isFinite(draft.longitude) || draft.longitude < -180 || draft.longitude > 180) {
    return 'יש להזין קו אורך תקין עבור מיקום הדירה.';
  }
  if (!Number.isInteger(draft.bedrooms) || draft.bedrooms < 1 || draft.bedrooms > 20) {
    return 'יש להזין מספר חדרים תקין.';
  }
  if (typeof draft.billsIncluded !== 'boolean') return 'יש לבחור אם החשבונות כלולים.';
  if (draft.availableRooms.length < 1) return 'יש להוסיף לפחות חדר פנוי אחד.';
  if (draft.availableRooms.length > draft.bedrooms) return 'מספר החדרים הפנויים לא יכול להיות גדול ממספר החדרים בדירה.';
  if (draft.availableRooms.some((room) => !Number.isInteger(room.monthlyPrice) || room.monthlyPrice < 1 || room.monthlyPrice > 2147483647)) {
    return 'יש להזין מחיר חודשי תקין לכל חדר פנוי.';
  }
  return validateListingPhotos(draft.photos);
}
