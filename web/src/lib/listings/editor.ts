import 'server-only';

import { randomUUID } from 'node:crypto';
import { createServerClient } from '@/utils/supabase/server';
import { decodeDraft, isId, isRevision, type DraftDocument, type DraftErrorCode, type DraftResult } from './draft-service-contract';
import { parsePhotoReferences } from './draft-media-contract';
import type { DraftPhotoReference } from './draft-types';

export type OwnedListingRoom = Readonly<{
  id: string; label: string | null; monthlyPrice: number; availableFrom: string; isAvailable: boolean;
}>;
export type OwnedListingEditModel = Readonly<{
  id: string; ownerId: string; revision: number; status: 'active' | 'taken' | 'flagged' | 'paused';
  title: string; bedrooms: number; billsIncluded: boolean; isSublet: boolean;
  availableFrom: string | null; description: string | null;
  // Readonly property identity. Ordinary editing never replaces this location.
  location: Readonly<{ address: string | null; latitude: number; longitude: number }>;
  rooms: readonly OwnedListingRoom[];
  photos: readonly Extract<DraftPhotoReference, { kind: 'published' }>[];
}>;
export type ListingEditorResult = DraftResult<OwnedListingEditModel>;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const nullableText = (value: unknown): value is string | null => value === null || typeof value === 'string';
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d\d-\d\d$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 2147483647;

export function decodeOwnedListingEditor(value: unknown, actor: string, listingId: string): OwnedListingEditModel | null {
  if (!object(value) || value.id !== listingId || value.ownerId !== actor || !isRevision(value.revision)
    || !['active','taken','flagged','paused'].includes(String(value.status)) || typeof value.title !== 'string' || !integer(value.bedrooms)
    || typeof value.billsIncluded !== 'boolean' || typeof value.isSublet !== 'boolean' || !nullableText(value.description)
    || value.availableFrom !== null && !date(value.availableFrom) || !object(value.location)
    || !nullableText(value.location.address) || typeof value.location.latitude !== 'number' || !Number.isFinite(value.location.latitude)
    || value.location.latitude < -90 || value.location.latitude > 90 || typeof value.location.longitude !== 'number'
    || !Number.isFinite(value.location.longitude) || value.location.longitude < -180 || value.location.longitude > 180
    || !Array.isArray(value.rooms)) return null;
  const photos = parsePhotoReferences(value.photos);
  if (!photos || photos.some(photo => photo.kind !== 'published')) return null;
  const rooms: OwnedListingRoom[] = [];
  for (const room of value.rooms) {
    if (!object(room) || !isId(room.id) || !nullableText(room.label) || !integer(room.monthlyPrice) || room.monthlyPrice < 1
      || !date(room.availableFrom) || typeof room.isAvailable !== 'boolean' || rooms.some(existing => existing.id === room.id)) return null;
    rooms.push({ id: room.id, label: room.label, monthlyPrice: room.monthlyPrice, availableFrom: room.availableFrom, isAvailable: room.isAvailable });
  }
  // Construct an allowlisted model; never forward raw RPC/debug/Storage fields.
  return {
    id: listingId, ownerId: actor, revision: value.revision, status: value.status as 'active' | 'taken' | 'flagged' | 'paused',
    title: value.title, bedrooms: value.bedrooms, billsIncluded: value.billsIncluded, isSublet: value.isSublet,
    availableFrom: value.availableFrom as string | null, description: value.description,
    location: { address: value.location.address, latitude: value.location.latitude, longitude: value.location.longitude },
    rooms, photos: photos as Extract<DraftPhotoReference, { kind: 'published' }>[],
  };
}

export async function getOwnedListingEditModel(id: string, expectedAccountId?: string): Promise<ListingEditorResult> {
  const failure = (code: 'AUTH_REQUIRED' | 'VALIDATION_FAILED' | 'NOT_FOUND' | 'STATE_UNAVAILABLE' | 'INTERNAL', retryable = false): ListingEditorResult =>
    ({ ok: false, error: { code, retryable, ...(code === 'INTERNAL' ? { correlationId: randomUUID() } : {}) } });
  try {
    const client = await createServerClient({ noStore: true });
    const auth = await client.auth.getUser(), actor = auth.data.user?.id;
    if (auth.error || !actor) return failure('AUTH_REQUIRED');
    if (!isId(id) || expectedAccountId !== undefined && !isId(expectedAccountId)) return failure('VALIDATION_FAILED');
    if (expectedAccountId !== undefined && expectedAccountId !== actor) return failure('AUTH_REQUIRED');
    const result = await client.rpc('get_owned_listing_editor', { p_listing_id: id });
    const current = await client.auth.getUser();
    if (current.error || current.data.user?.id !== actor) return failure('AUTH_REQUIRED');
    if (result.error) return failure('INTERNAL', true);
    if (result.data === null) return failure('NOT_FOUND');
    const model = decodeOwnedListingEditor(result.data, actor, id);
    return model ? { ok: true, data: model } : failure('STATE_UNAVAILABLE');
  } catch { return failure('INTERNAL', true); }
}


export type OpenListingEditDraftInput = Readonly<{ listingId: string; requestKey: string; expectedAccountId?: string }>;

/** The database uses the owner reader and existing create/media services in one
 * transaction. Do not split initialization into client read/create/photo calls. */
export async function openOwnedListingEditDraft(input: OpenListingEditDraftInput): Promise<DraftResult<DraftDocument>> {
  const failure = (code: DraftErrorCode, retryable = false): DraftResult<DraftDocument> =>
    ({ ok: false, error: { code, retryable, ...(code === 'INTERNAL' ? { correlationId: randomUUID() } : {}) } });
  try {
    const client = await createServerClient({ noStore: true });
    const auth = await client.auth.getUser(), actor = auth.data.user?.id;
    if (auth.error || !actor) return failure('AUTH_REQUIRED');
    if (!object(input) || Object.keys(input).some(key => !['listingId', 'requestKey', 'expectedAccountId'].includes(key))
      || !isId(input.listingId) || !isId(input.requestKey)) return failure('VALIDATION_FAILED');
    if (input.expectedAccountId !== undefined && (!isId(input.expectedAccountId) || input.expectedAccountId !== actor)) return failure('AUTH_REQUIRED');
    const listingId = input.listingId.toLowerCase();
    const result = await client.rpc('open_listing_edit_draft', { p_listing_id: listingId, p_request_key: input.requestKey.toLowerCase() });
    const current = await client.auth.getUser();
    if (current.error || current.data.user?.id !== actor) return failure('AUTH_REQUIRED');
    if (result.error) {
      if (result.error.message === 'AUTH_REQUIRED') return failure('AUTH_REQUIRED');
      if (result.error.message === 'SOURCE_UNAVAILABLE') return failure('NOT_FOUND');
      if (result.error.message === 'IMPORT_CONFLICT') return failure('VERSION_CONFLICT');
      if (result.error.message === 'INVALID_INPUT') return failure('VALIDATION_FAILED');
      if (['DRAFT_UNAVAILABLE', 'DRAFT_CLOSED', 'PHOTO_UNAVAILABLE', 'INVALID_PHOTOS'].includes(result.error.message)) return failure('STATE_UNAVAILABLE');
      return failure('INTERNAL', true);
    }
    if (!result.data) return failure('STATE_UNAVAILABLE');
    const draft = decodeDraft(result.data, actor);
    return draft.kind === 'edit' && draft.sourceListingId === listingId && draft.state === 'open'
      ? { ok: true, data: draft } : failure('STATE_UNAVAILABLE');
  } catch { return failure('INTERNAL', true); }
}
