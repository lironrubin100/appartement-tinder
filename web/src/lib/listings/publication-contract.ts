import 'server-only';
import type { ListingDraft } from './validation';
import { verifyAddress } from './geocoding';
import { isIsraeliLocation } from './address-types';

// The legacy publisher and cloud snapshot binder must serialize one contract.
export function readListingPublicationForm(formData: FormData): ListingDraft {
  return {
    title: String(formData.get('title') ?? ''), address: String(formData.get('address') ?? ''),
    latitude: Number(formData.get('latitude')), longitude: Number(formData.get('longitude')),
    bedrooms: Number(formData.get('bedrooms')), billsIncluded: formData.get('billsIncluded') === 'on',
    availableRooms: formData.getAll('roomPrice').map(price => ({ monthlyPrice: Number(price) })),
    availableFrom: String(formData.get('availableFrom') ?? ''), description: String(formData.get('description') ?? ''),
    photos: formData.getAll('photos').filter((value): value is File => value instanceof File && value.size > 0),
  };
}
export function listingPublicationPayload(draft: ListingDraft, photos: string[], photoDigests: string[]) {
  return { title: draft.title.trim(), address: draft.address.trim(), latitude: draft.latitude, longitude: draft.longitude,
    bedrooms: draft.bedrooms, billsIncluded: draft.billsIncluded, availableFrom: draft.availableFrom,
    description: draft.description.trim(), photos, photoDigests, roomPrices: draft.availableRooms.map(room => room.monthlyPrice) };
}

export function listingPublicationLocationValid(formData: FormData, actor: string, key: string): boolean {
  const draft = readListingPublicationForm(formData), mode = formData.get('locationMode');
  const providerValid = mode === 'provider' && verifyAddress(String(formData.get('locationToken') ?? ''), actor, draft.address, draft.latitude, draft.longitude, key);
  const manualValid = mode === 'manual' && String(formData.get('locationCity') ?? '').trim().length > 1
    && String(formData.get('locationCity')).length <= 100 && isIsraeliLocation(draft.latitude, draft.longitude);
  return formData.get('locationConfirmed') === 'on' && (providerValid || manualValid);
}
