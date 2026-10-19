export type AddressSuggestion = {
  label: string;
  latitude: number;
  longitude: number;
  city: string;
  accuracy: string;
  token: string;
};

export function isIsraeliLocation(latitude: number, longitude: number) {
  // Plausibility boundary, not a city/publication restriction (A5/D19).
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= 29.4 && latitude <= 33.4 && longitude >= 34.2 && longitude <= 35.95;
}
