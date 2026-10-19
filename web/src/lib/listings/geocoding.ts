import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIsraeliLocation, type AddressSuggestion } from './address-types';

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
      && isIsraeliLocation(latitude, longitude);
  } catch { return false; }
}

export function normalizeAddresses(value: unknown): Selection[] {
  if (!value || typeof value !== 'object' || !('results' in value) || !Array.isArray(value.results)) return [];
  const seen = new Set<string>();
  return value.results.flatMap((item: unknown): Selection[] => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    if (row.country_code !== 'il' || typeof row.formatted !== 'string' || !row.formatted.trim()
      || row.formatted.length > 200 || typeof row.lat !== 'number' || typeof row.lon !== 'number'
      || !isIsraeliLocation(row.lat, row.lon)) return [];
    // A city centroid is not an apartment address. Street-level suggestions
    // remain available; the owner confirms/corrects the private pin explicitly.
    if (!['building', 'street', 'amenity'].includes(String(row.result_type))) return [];
    const id = `${row.formatted}:${row.lat}:${row.lon}`;
    if (seen.has(id)) return [];
    seen.add(id);
    return [{ label: row.formatted.trim(), latitude: row.lat, longitude: row.lon,
      city: typeof row.city === 'string' ? row.city : '', accuracy: String(row.result_type) }];
  }).slice(0, 5);
}

export async function lookupAddresses(query: string, language: 'he' | 'en', key: string, actor: string) {
  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
  url.search = new URLSearchParams({ text: query, lang: language, format: 'json',
    filter: 'countrycode:il', bias: 'proximity:34.7915,31.253', limit: '5', apiKey: key }).toString();
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) return { suggestions: [], status: response.status === 429 ? 429 : 502 };
  const selections = normalizeAddresses(await response.json());
  return { suggestions: selections.map((selection) => ({ ...selection, token: signAddress(selection, actor, key) })), status: 200 };
}
