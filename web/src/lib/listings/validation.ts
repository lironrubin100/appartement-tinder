export const LISTING_PHOTO_MIN = 3;
export const LISTING_PHOTO_MAX = 8;
export const LISTING_PHOTO_MAX_BYTES = 12 * 1024 * 1024;

export type AvailableRoomDraft = {
  monthlyPrice: number;
};

export type ListingDraft = {
  title: string;
  location: string;
  bedrooms: number;
  billsIncluded: boolean;
  availableRooms: AvailableRoomDraft[];
  availableFrom: string;
  description: string;
  photos: File[];
};

export function validateListingDraft(draft: ListingDraft): string | null {
  if (!draft.title.trim()) return 'יש להזין כותרת למודעה.';
  if (!draft.location.trim()) return 'יש להזין אזור או כתובת לדירה.';
  if (!Number.isInteger(draft.bedrooms) || draft.bedrooms < 1 || draft.bedrooms > 20) {
    return 'יש להזין מספר חדרים תקין.';
  }
  if (draft.availableRooms.length < 1) return 'יש להוסיף לפחות חדר פנוי אחד.';
  if (draft.availableRooms.length > draft.bedrooms) return 'מספר החדרים הפנויים לא יכול להיות גדול ממספר החדרים בדירה.';
  if (draft.availableRooms.some((room) => !Number.isInteger(room.monthlyPrice) || room.monthlyPrice < 1)) {
    return 'יש להזין מחיר חודשי תקין לכל חדר פנוי.';
  }
  if (!draft.availableFrom || Number.isNaN(Date.parse(draft.availableFrom))) {
    return 'יש לבחור תאריך כניסה.';
  }
  if (draft.photos.length < LISTING_PHOTO_MIN) return `יש להוסיף לפחות ${LISTING_PHOTO_MIN} תמונות.`;
  if (draft.photos.length > LISTING_PHOTO_MAX) return `אפשר להוסיף עד ${LISTING_PHOTO_MAX} תמונות.`;
  if (draft.photos.some((photo) => !photo.type.startsWith('image/'))) return 'אפשר להעלות קובצי תמונה בלבד.';
  if (draft.photos.some((photo) => photo.size > LISTING_PHOTO_MAX_BYTES)) return 'כל תמונה צריכה להיות קטנה מ־12MB.';
  return null;
}
