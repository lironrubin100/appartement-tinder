export type LocationKind = 'region' | 'city' | 'neighborhood' | 'street' | 'address';
export type LocationCategory = 'all' | Exclude<LocationKind, 'address'>;
export const locationCategories: LocationCategory[] = ['all', 'city', 'region', 'neighborhood', 'street'];

export type AddressSuggestion = {
  label: string;
  latitude: number;
  longitude: number;
  city: string;
  accuracy: string;
  token: string;
  kind?: LocationKind;
  street?: string;
  houseNumber?: string;
};

export function isIsraeliLocation(latitude: number, longitude: number) {
  // Plausibility boundary, not a city/publication restriction (A5/D19).
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= 29.4 && latitude <= 33.4 && longitude >= 34.2 && longitude <= 35.95;
}
