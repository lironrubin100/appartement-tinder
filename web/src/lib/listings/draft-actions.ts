'use server';

import { randomUUID } from 'node:crypto';
import { createServerClient } from '@/utils/supabase/server';
import type { Json } from '@/types/database';
import { decodeDraft, draftColumns, draftQueryHash, isId, isRevision, parseDraftFields, readDraftCursor, signDraftCursor,
  type CreateDraftInput, type DraftDocument, type DraftErrorCode, type DraftListInput, type DraftPage, type DraftResult } from './draft-service-contract';

function failure<T>(code: DraftErrorCode, retryable = false): DraftResult<T> {
  return { ok: false, error: { code, retryable, ...(code === 'INTERNAL' ? { correlationId: randomUUID() } : {}) } };
}
function rpcFailure<T>(error: { message: string; code?: string }): DraftResult<T> {
  if (error.message === 'AUTH_REQUIRED') return failure('AUTH_REQUIRED');
  if (['DRAFT_NOT_FOUND', 'SOURCE_UNAVAILABLE'].includes(error.message)) return failure('NOT_FOUND');
  if (['DRAFT_CONFLICT', 'IMPORT_CONFLICT'].includes(error.message)) return failure('VERSION_CONFLICT');
  if (['DRAFT_CLOSED', 'PUBLICATION_IN_PROGRESS', 'DRAFT_UNAVAILABLE'].includes(error.message) || error.code === '23505') return failure('STATE_UNAVAILABLE');
  if (['INVALID_FIELDS', 'INVALID_SOURCE', 'INVALID_INPUT'].includes(error.message)) return failure('VALIDATION_FAILED');
  return failure('INTERNAL', true);
}

export async function createListingCloudDraft(input: CreateDraftInput): Promise<DraftResult<DraftDocument>> {
  try {
    const client = await createServerClient({ noStore: true });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return failure('AUTH_REQUIRED');
    if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['requestKey', 'fields', 'source', 'expectedAccountId'].includes(key)) || !isId(input.requestKey)) return failure('VALIDATION_FAILED');
    if (input.expectedAccountId !== undefined && (!isId(input.expectedAccountId) || input.expectedAccountId !== user.id)) return failure('AUTH_REQUIRED');
    const fields = parseDraftFields(input.fields === undefined ? {} : input.fields);
    if (!fields || input.source !== undefined && (!input.source || typeof input.source !== 'object'
      || Object.keys(input.source).some(key => !['listingId', 'revision'].includes(key))
      || !isId(input.source.listingId) || !isRevision(input.source.revision))) return failure('VALIDATION_FAILED');
    // Existing create/import receipt is the durable idempotency key. Caller
    // generates it once per new draft and reuses it on an uncertain response.
    const { data, error } = await client.rpc('create_listing_draft', { p_import_receipt_id: input.requestKey,
      p_source_listing_id: input.source?.listingId ?? null, p_source_revision: input.source?.revision ?? null, p_fields: fields as Json });
    if (error) return rpcFailure(error);
    return { ok: true, data: decodeDraft(data, user.id) };
  } catch { return failure('INTERNAL', true); }
}

export async function loadListingCloudDraft(id: string): Promise<DraftResult<DraftDocument>> {
  try {
    const client = await createServerClient({ noStore: true });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return failure('AUTH_REQUIRED');
    if (!isId(id)) return failure('VALIDATION_FAILED');
    const { data, error } = await client.from('listing_drafts').select(draftColumns).eq('id', id).eq('owner_id', user.id).maybeSingle();
    if (error) return failure('INTERNAL', true);
    return data ? { ok: true, data: decodeDraft(data, user.id) } : failure('NOT_FOUND');
  } catch { return failure('INTERNAL', true); }
}

export async function saveListingCloudDraft(id: string, expectedRevision: number, value: unknown): Promise<DraftResult<DraftDocument>> {
  try {
    const client = await createServerClient({ noStore: true });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return failure('AUTH_REQUIRED');
    const fields = parseDraftFields(value);
    if (!isId(id) || !isRevision(expectedRevision) || !fields) return failure('VALIDATION_FAILED');
    const { data, error } = await client.rpc('save_listing_draft', { p_draft_id: id, p_expected_revision: expectedRevision, p_fields: fields as Json });
    if (error) return rpcFailure(error);
    return { ok: true, data: decodeDraft(data, user.id) };
  } catch { return failure('INTERNAL', true); }
}

export async function listListingCloudDrafts(input: DraftListInput = {}): Promise<DraftResult<DraftPage>> {
  try {
    const client = await createServerClient({ noStore: true });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return failure('AUTH_REQUIRED');
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['limit', 'cursor', 'state', 'kind'].includes(key))) return failure('VALIDATION_FAILED');
    const { limit = 20, cursor, state = 'open', kind = 'all' } = input;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !['open', 'completed', 'all'].includes(state)
      || !['new', 'edit', 'all'].includes(kind) || cursor !== undefined && typeof cursor !== 'string') return failure('VALIDATION_FAILED');
    // Dedicated, server-only, environment-specific signing material. Missing
    // configuration fails closed; never use a public/provider key or unsigned cursor.
    const key = process.env.LISTING_DRAFT_CURSOR_SECRET?.trim() ?? '';
    if (key.length < 32) return failure('STATE_UNAVAILABLE');
    const queryHash = draftQueryHash(state, kind, limit);
    const after = cursor ? readDraftCursor(cursor, user.id, queryHash, key) : null;
    if (cursor !== undefined && !after) return failure('CURSOR_STALE');
    let query = client.from('listing_drafts').select(draftColumns).eq('owner_id', user.id)
      .order('updated_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1);
    if (state !== 'all') query = query.eq('state', state);
    if (kind === 'new') query = query.is('source_listing_id', null);
    if (kind === 'edit') query = query.not('source_listing_id', 'is', null);
    if (after) query = query.or(`updated_at.lt.${after.updatedAt},and(updated_at.eq.${after.updatedAt},id.lt.${after.id})`);
    const { data, error } = await query;
    if (error) return failure('INTERNAL', true);
    const rows = data ?? [], hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(row => decodeDraft(row, user.id));
    const last = items.at(-1);
    const nextCursor = hasMore && last ? signDraftCursor({ updatedAt: last.updatedAt, id: last.id }, user.id, queryHash, key) : null;
    return { ok: true, data: { items, next_cursor: nextCursor, has_more: hasMore, projection_version: 1 } };
  } catch { return failure('INTERNAL', true); }
}
