'use server';

import { createServerClient } from '@/utils/supabase/server';
import { isId, isRevision, type DraftResult, type DraftErrorCode } from './draft-service-contract';
import { DRAFT_MEDIA_BUCKET } from './draft-media-contract';

export type DraftDeletionTicket = { draftId: string; revision: number; completed: boolean };
const fail = <T>(code: DraftErrorCode, retryable = false): DraftResult<T> => ({ ok: false, error: { code, retryable } });
function rpcError<T>(error: { message: string }): DraftResult<T> {
  if (error.message === 'AUTH_REQUIRED') return fail('AUTH_REQUIRED');
  if (error.message === 'DRAFT_NOT_FOUND') return fail('NOT_FOUND');
  if (error.message === 'DRAFT_CONFLICT') return fail('VERSION_CONFLICT');
  if (error.message === 'DRAFT_CLEANUP_REQUIRED') return fail('CLEANUP_PENDING', true);
  if (['DRAFT_CLOSED', 'DRAFT_UNAVAILABLE', 'PUBLICATION_COMMITTED', 'LISTING_UNAVAILABLE', 'PHOTO_IN_USE'].includes(error.message)) return fail('STATE_UNAVAILABLE');
  return fail('INTERNAL', true);
}
async function session(accountId: string) {
  const client = await createServerClient({ noStore: true });
  const { data: { user }, error } = await client.auth.getUser();
  return !error && user?.id === accountId ? client : null;
}

export async function beginListingCloudDraftDeletion(id: string, revision: number, accountId: string): Promise<DraftResult<DraftDeletionTicket>> {
  try {
    if (!isId(id) || !isId(accountId) || !isRevision(revision)) return fail('VALIDATION_FAILED');
    const client = await session(accountId); if (!client) return fail('AUTH_REQUIRED');
    const { data, error } = await client.rpc('begin_listing_draft_deletion', { p_draft_id: id, p_expected_revision: revision });
    if (error) return rpcError(error);
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.owner_id !== accountId || data.draft_id !== id
      || !isRevision(data.revision) || !isRevision(data.original_revision) || ![data.original_revision, data.revision].includes(revision)
      || typeof data.completed !== 'boolean') return fail('INTERNAL', true);
    return { ok: true, data: { draftId: id, revision: data.revision, completed: data.completed } };
  } catch { return fail('INTERNAL', true); }
}

// Each action removes at most20 immutable manifest objects. Paths remain on the
// server; cursor/UUID never grants authority. An uncertain removal is retryable.
export async function cleanupListingCloudDraftDeletionPage(id: string, accountId: string, after: string | null): Promise<DraftResult<{ nextCursor: string | null }>> {
  try {
    if (!isId(id) || !isId(accountId) || after !== null && !isId(after)) return fail('VALIDATION_FAILED');
    const client = await session(accountId); if (!client) return fail('AUTH_REQUIRED');
    const { data, error } = await client.rpc('list_listing_draft_deletion_objects', { p_draft_id: id, p_after: after, p_limit: 20 });
    if (error) return rpcError(error);
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.projection_version !== 1 || !Array.isArray(data.items)
      || data.items.length > 20 || typeof data.has_more !== 'boolean' || (data.has_more ? !isId(data.next_cursor) : data.next_cursor !== null)) return fail('INTERNAL', true);
    const paths: string[] = [];
    let last = after;
    for (const item of data.items) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !isId(item.object_id) || typeof item.object_path !== 'string'
        || !item.object_path.startsWith(`${accountId}/${id}/`) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(item.object_path.slice(`${accountId}/${id}/`.length))
        || last !== null && item.object_id <= last) return fail('INTERNAL', true);
      paths.push(item.object_path); last = item.object_id;
    }
    if (data.has_more && (data.next_cursor !== last || data.items.length !== 20)) return fail('INTERNAL', true);
    if (paths.length) {
      const removed = await client.storage.from(DRAFT_MEDIA_BUCKET).remove(paths);
      if (removed.error) return fail('CLEANUP_PENDING', true);
    }
    return { ok: true, data: { nextCursor: data.next_cursor as string | null } };
  } catch { return fail('CLEANUP_PENDING', true); }
}

export async function finishListingCloudDraftDeletion(id: string, revision: number, accountId: string): Promise<DraftResult<null>> {
  try {
    if (!isId(id) || !isId(accountId) || !isRevision(revision)) return fail('VALIDATION_FAILED');
    const client = await session(accountId); if (!client) return fail('AUTH_REQUIRED');
    const { error } = await client.rpc('finish_listing_draft_deletion', { p_draft_id: id, p_expected_revision: revision });
    return error ? rpcError(error) : { ok: true, data: null };
  } catch { return fail('CLEANUP_PENDING', true); }
}
