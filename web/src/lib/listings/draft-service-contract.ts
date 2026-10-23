import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Database, Json } from '@/types/database';
import type { DraftPhotoReference, ListingCloudDraft, ListingDraftFields, StorageObjectPath } from './draft-types';

export type DraftErrorCode = 'AUTH_REQUIRED' | 'NOT_FOUND' | 'VALIDATION_FAILED' | 'VERSION_CONFLICT' | 'STATE_UNAVAILABLE' | 'CURSOR_STALE' | 'INTERNAL';
export type DraftResult<T> = { ok: true; data: T } | { ok: false; error: { code: DraftErrorCode; retryable: boolean; correlationId?: string } };
export type DraftDocument = ListingCloudDraft & { publicationStartedAt: string | null };
export type CreateDraftInput = { requestKey: string; expectedAccountId?: string; fields?: ListingDraftFields; source?: { listingId: string; revision: number } };
export type DraftListInput = { limit?: number; cursor?: string; state?: 'open' | 'completed' | 'all'; kind?: 'new' | 'edit' | 'all' };
export type DraftPage = { items: DraftDocument[]; next_cursor: string | null; has_more: boolean; projection_version: 1 };
export type DraftRow = Database['public']['Tables']['listing_drafts']['Row'];
export const draftColumns = 'id,owner_id,schema_version,revision,created_at,updated_at,state,source_listing_id,source_revision,fields,photos,publication_request_id,import_receipt_id,publication_started_at' as const;
export const isId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export const isRevision = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 2147483647;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const timestamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));

// This validates the partial draft envelope, not readiness to publish. Empty and
// incomplete strings remain valid. Never accept media/owner/lifecycle fields here.
export function parseDraftFields(value: unknown): ListingDraftFields | null {
  if (!object(value)) return null;
  const lengths: Record<string, number> = { title: 100, bedrooms: 32, availableFrom: 32, description: 2000 };
  const result: Record<string, Json> = {};
  for (const [key, item] of Object.entries(value)) {
    if (Object.hasOwn(lengths, key)) {
      if (typeof item !== 'string' || item.length > lengths[key]) return null;
      result[key] = item;
    } else if (key === 'billsIncluded') {
      if (typeof item !== 'boolean') return null;
      result[key] = item;
    } else if (key === 'roomPrices') {
      if (!Array.isArray(item) || item.length > 20 || item.some(price => typeof price !== 'string' || price.length > 32)) return null;
      result[key] = [...item];
    } else if (key === 'address') {
      if (!object(item)) return null;
      const address: Record<string, Json> = {};
      const addressLengths: Record<string, number> = { address: 200, latitude: 64, longitude: 64, city: 100 };
      for (const [field, content] of Object.entries(item)) {
        if (Object.hasOwn(addressLengths, field)) {
          if (typeof content !== 'string' || content.length > addressLengths[field]) return null;
          address[field] = content;
        } else if (field === 'manual' || field === 'confirmed') {
          if (typeof content !== 'boolean') return null;
          address[field] = content;
        } else return null;
      }
      result[key] = address;
    } else return null;
  }
  return result as ListingDraftFields;
}

export function decodeDraft(row: Omit<DraftRow, 'publication_payload_hash'>, actor: string): DraftDocument {
  const fields = parseDraftFields(row.fields);
  if (!isId(row.id) || row.owner_id !== actor || row.schema_version !== 1 || !isRevision(row.revision)
    || !timestamp(row.created_at) || !timestamp(row.updated_at) || !fields || !Array.isArray(row.photos)
    || !['open', 'completed'].includes(row.state) || !isId(row.publication_request_id)
    || row.import_receipt_id !== null && !isId(row.import_receipt_id)
    || row.publication_started_at !== null && !timestamp(row.publication_started_at)) throw new Error('INVALID_DRAFT');
  const photos: DraftPhotoReference[] = row.photos.map(photo => {
    if (!object(photo) || Object.keys(photo).some(key => !['kind', 'objectPath'].includes(key))
      || !['draft', 'published'].includes(String(photo.kind)) || typeof photo.objectPath !== 'string'
      || !/^(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_.-]+$/.test(photo.objectPath)
      || photo.objectPath.split('/').some(part => part === '.' || part === '..')
      || photo.kind === 'draft' && !photo.objectPath.startsWith(`${actor}/${row.id}/`)) throw new Error('INVALID_PHOTO_REFERENCE');
    // Structural read decoding only. Media writes/association ownership belong
    // to the dedicated authenticated media service, not this fields adapter.
    return { kind: photo.kind as 'draft' | 'published', objectPath: photo.objectPath as StorageObjectPath };
  });
  const base = { id: row.id, ownerId: actor, schemaVersion: row.schema_version, revision: row.revision,
    createdAt: row.created_at, updatedAt: row.updated_at, state: row.state as 'open' | 'completed', fields, photos,
    publicationRequestId: row.publication_request_id, importReceiptId: row.import_receipt_id, publicationStartedAt: row.publication_started_at };
  if (row.source_listing_id === null && row.source_revision === null) return { ...base, kind: 'new' };
  if (!isId(row.source_listing_id) || !isRevision(row.source_revision)) throw new Error('INVALID_SOURCE');
  return { ...base, kind: 'edit', sourceListingId: row.source_listing_id, sourceRevision: row.source_revision };
}

type Cursor = { v: 1; actor: string; query: string; source: 1; expires: number; updatedAt: string; id: string };
const ttl = 30 * 60 * 1000;
const signature = (payload: string, key: string) => createHmac('sha256', key).update(`shutaf:listing-draft-page:v1:${payload}`).digest();
export const draftQueryHash = (state: string, kind: string, limit: number) => createHash('sha256').update(JSON.stringify({ state, kind, limit, order: 'updated_at.desc,id.desc', source: 1 })).digest('hex');
export function signDraftCursor(last: { updatedAt: string; id: string }, actor: string, query: string, key: string, now = Date.now()): string {
  if (!key) throw new Error('CURSOR_KEY_UNAVAILABLE');
  const cursor: Cursor = { v: 1, actor, query, source: 1, expires: now + ttl, ...last };
  const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url');
  return `${payload}.${signature(payload, key).toString('base64url')}`;
}
export function readDraftCursor(token: string, actor: string, query: string, key: string, now = Date.now()): Cursor | null {
  try {
    if (!key || token.length > 2048) return null;
    const [payload, supplied, extra] = token.split('.');
    if (!payload || !supplied || extra) return null;
    const actual = Buffer.from(supplied, 'base64url'), expected = signature(payload, key);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const cursor = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Cursor;
    return cursor.v === 1 && cursor.source === 1 && cursor.actor === actor && cursor.query === query
      && Number.isSafeInteger(cursor.expires) && cursor.expires > now && cursor.expires <= now + ttl
      && timestamp(cursor.updatedAt) && isId(cursor.id) ? cursor : null;
  } catch { return null; }
}
