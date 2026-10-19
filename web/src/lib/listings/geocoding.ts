import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIsraeliLocation, type AddressSuggestion, type LocationCategory, type LocationKind } from './address-types';

type Selection = Omit<AddressSuggestion, 'token'>;
const TTL = 15 * 60 * 1000;
const signature = (payload: string, key: string) => createHmac('sha256', key)
  .update(`shutaf:address-selection:v1:${payload}`).digest('base64url');

export function signAddress(selection: Selection, actor: string, key: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ ...selection, actor, provider: 'geoapify', expires: now + TTL })).toString('base64url');
  return `${payload}.${signature(payload, key)}`;
}

export function verifyAddress(token: string, actor: string, address: string, latitude: number, longitude: number, key: string, now = Date.now()) {
  try {
    if (!key || token.length > 4000) return false;
    const [payload, supplied, extra] = token.split('.');
    if (!payload || !supplied || extra) return false;
    const expected = Buffer.from(signature(payload, key));
    const actual = Buffer.from(supplied);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
    const receipt = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return receipt.actor === actor && receipt.provider === 'geoapify'
      && receipt.expires > now && receipt.expires <= now + TTL
      && receipt.label === address.trim() && receipt.latitude === latitude && receipt.longitude === longitude
      && ['building', 'street', 'amenity'].includes(receipt.accuracy)
      && isIsraeliLocation(latitude, longitude);
  } catch { return false; }
}

export function normalizeAddresses(value: unknown): Selection[] {
  if (!value || typeof value !== 'object' || !('results' in value) || !Array.isArray(value.results)) return [];
  const clean = (value: unknown) => typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
  const identity = (value: string) => value.toLocaleLowerCase().replace(/[-־]/g, ' ').replace(/\s+/g, ' ').trim();
  const addresses = new Map<string, { selection: Selection; score: number }>();
  for (const item of value.results) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (row.country_code !== 'il' || typeof row.formatted !== 'string' || !row.formatted.trim()
      || row.formatted.length > 200 || typeof row.lat !== 'number' || typeof row.lon !== 'number'
      || !isIsraeliLocation(row.lat, row.lon)) continue;
    // A city centroid is not an apartment address. Street-level suggestions
    // remain available; the owner confirms/corrects the private pin explicitly.
    if (!['building', 'street', 'amenity'].includes(String(row.result_type))) continue;
    const street = clean(row.street);
    const number = clean(typeof row.housenumber === 'number' ? String(row.housenumber) : row.housenumber);
    const city = clean(row.city).replace(/[-־]/g, ' ').replace(/\s+/g, ' ');
    // Do not parse postal codes/numbers out of a provider-formatted string.
    // Structured components produce a stable, localized street/number/city label.
    const label = street && city ? `${street}${number ? ` ${number}` : ''}, ${city}` : clean(row.formatted);
    const id = street && city ? `${identity(street)}|${identity(number)}|${identity(city)}` : identity(label);
    const rank = row.rank && typeof row.rank === 'object' ? row.rank as Record<string, unknown> : {};
    const confidence = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    const accuracy = number ? String(row.result_type) : 'street';
    const score = (accuracy === 'building' ? 2 : 0) + confidence(rank.confidence)
      + confidence(rank.confidence_building_level) + (rank.match_type === 'full_match' ? 0.25 : 0);
    if (label.length > 200) continue;
    const existing = addresses.get(id);
    // Same street/house/city with different postcodes or city punctuation is
    // one suggestion. Keep the provider's strongest match, not several pins.
    if (!existing || score > existing.score) addresses.set(id, { selection: {
      label, latitude: row.lat, longitude: row.lon, city, accuracy,
    }, score });
  }
  return [...addresses.values()].sort((a, b) => b.score - a.score).slice(0, 5).map(({ selection }) => selection);
}

// Provider components are the parser: never guess a city/street by splitting
// free text or treating an administrative centroid as a publishable address.
export function normalizeLocations(value: unknown, category: LocationCategory = 'all'): Selection[] {
  if (!value || typeof value !== 'object' || !('results' in value) || !Array.isArray(value.results)) return [];
  const clean = (value: unknown) => typeof value === 'string' ? value.normalize('NFKC').trim().replace(/[-־]/g, ' ').replace(/\s+/g, ' ') : '';
  const rankedAddresses = new Map(normalizeAddresses(value).map((selection) => [clean(selection.label).toLocaleLowerCase(), selection]));
  const result = new Map<string, Selection>();
  for (const item of value.results) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (row.country_code !== 'il' || typeof row.lat !== 'number' || typeof row.lon !== 'number'
      || !isIsraeliLocation(row.lat, row.lon)) continue;
    const type = String(row.result_type);
    let selection: Selection | undefined;
    if (['building', 'amenity', 'street'].includes(type)) {
      const address = normalizeAddresses({ results: [row] })[0];
      if (address) selection = { ...address, kind: address.accuracy === 'street' ? 'street' : 'address',
        street: typeof row.street === 'string' ? row.street.trim() : '',
        houseNumber: typeof row.housenumber === 'string' || typeof row.housenumber === 'number' ? String(row.housenumber).trim() : '' };
    } else {
      const kind: LocationKind | undefined = type === 'city' ? 'city' : type === 'suburb' ? 'neighborhood'
        : ['state', 'county', 'district'].includes(type) ? 'region' : undefined;
      if (!kind) continue;
      const city = clean(row.city);
      const name = clean(row[type]) || clean(row.name) || (kind === 'city' ? city : '');
      if (!name) continue;
      const label = kind === 'neighborhood' && city && name !== city ? `${name}, ${city}` : name;
      if (label.length > 200) continue;
      selection = { label, city, latitude: row.lat, longitude: row.lon, accuracy: type, kind };
    }
    if (!selection || (category !== 'all' && selection.kind !== category && !(category === 'street' && selection.kind === 'address'))) continue;
    const identity = `${selection.kind}|${clean(selection.label).toLocaleLowerCase()}`;
    // Reuse ranked address normalization to select the best pin among duplicates.
    if (selection.kind === 'address' || selection.kind === 'street') {
      const best = rankedAddresses.get(clean(selection.label).toLocaleLowerCase());
      if (best) selection = { ...selection, latitude: best.latitude, longitude: best.longitude, accuracy: best.accuracy };
    }
    if (!result.has(identity)) result.set(identity, selection);
  }
  return [...result.values()].slice(0, 5);
}

export async function lookupAddresses(query: string, language: 'he' | 'en', key: string, actor: string,
  category: LocationCategory = 'all', scope = '') {
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
  url.search = new URLSearchParams({ text: scope ? `${query}, ${scope}` : query, lang: language, format: 'json',
    filter: 'countrycode:il', bias: 'proximity:34.7915,31.253', limit: '5', apiKey: key }).toString();
  if (category !== 'all') url.searchParams.set('type', category === 'region' || category === 'neighborhood' ? 'locality' : category);
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) return { suggestions: [], status: response.status === 429 ? 429 : 502 };
  const selections = normalizeLocations(await response.json(), category);
  return { suggestions: selections.map((selection) => ({ ...selection,
    token: ['address', 'street'].includes(selection.kind ?? '') ? signAddress(selection, actor, key) : '' })), status: 200 };
}
