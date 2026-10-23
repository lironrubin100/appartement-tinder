'use server';

import { randomUUID } from 'node:crypto';
import { createServerClient } from '@/utils/supabase/server';
import type { Json } from '@/types/database';
import { decodeDraft, draftColumns, isId, isRevision, type DraftDocument, type DraftErrorCode, type DraftResult } from './draft-service-contract';
import { DRAFT_MEDIA_BUCKET, DRAFT_MEDIA_PREVIEW_SECONDS, parsePhotoReferences, type DraftPhotoPreview } from './draft-media-contract';

function failure<T>(code: DraftErrorCode, retryable = false): DraftResult<T> {
  return { ok: false, error: { code, retryable, ...(code === 'INTERNAL' ? { correlationId: randomUUID() } : {}) } };
}
export async function setListingCloudDraftPhotos(id: string, expectedRevision: number, value: unknown): Promise<DraftResult<DraftDocument>> {
  try {
    const client = await createServerClient({ noStore: true });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return failure('AUTH_REQUIRED');
    const photos = parsePhotoReferences(value);
    if (!isId(id) || !isRevision(expectedRevision) || !photos) return failure('VALIDATION_FAILED');
    const { data, error } = await client.rpc('set_listing_draft_photos', { p_draft_id: id, p_expected_revision: expectedRevision, p_photos: photos as Json });
    if (error) {
      if (['DRAFT_NOT_FOUND', 'PHOTO_UNAVAILABLE'].includes(error.message)) return failure('NOT_FOUND');
      if (error.message === 'DRAFT_CONFLICT') return failure('VERSION_CONFLICT');
      if (['DRAFT_CLOSED', 'PUBLICATION_IN_PROGRESS'].includes(error.message)) return failure('STATE_UNAVAILABLE');
      if (error.message === 'INVALID_PHOTOS') return failure('VALIDATION_FAILED');
      return failure('INTERNAL', true);
    }
    return { ok: true, data: decodeDraft(data, user.id) };
  } catch { return failure('INTERNAL', true); }
}

export async function createListingDraftPhotoPreview(id: string, value: unknown): Promise<DraftResult<DraftPhotoPreview>> {
  try {
    const client = await createServerClient({ noStore: true });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return failure('AUTH_REQUIRED');
    const refs = parsePhotoReferences([value]);
    if (!isId(id) || !refs) return failure('VALIDATION_FAILED');
    const ref = refs[0];
    const { data: row, error } = await client.from('listing_drafts').select(draftColumns).eq('id', id).eq('owner_id', user.id).maybeSingle();
    if (error) return failure('INTERNAL', true);
    if (!row) return failure('NOT_FOUND');
    const draft = decodeDraft(row, user.id);
    if (!draft.photos.some(photo => photo.kind === ref.kind && photo.objectPath === ref.objectPath)) return failure('NOT_FOUND');
    if (ref.kind === 'published') {
      if (draft.kind !== 'edit') return failure('NOT_FOUND');
      const source = await client.from('apartments').select('id').eq('id', draft.sourceListingId).eq('lister_id', user.id).maybeSingle();
      if (source.error) return failure('INTERNAL', true);
      if (!source.data) return failure('NOT_FOUND');
    }
    const expiresAt = Date.now() + DRAFT_MEDIA_PREVIEW_SECONDS * 1000;
    const signed = await client.storage.from(ref.kind === 'draft' ? DRAFT_MEDIA_BUCKET : 'apartment-photos').createSignedUrl(ref.objectPath, DRAFT_MEDIA_PREVIEW_SECONDS);
    if (signed.error || !signed.data?.signedUrl) return failure('INTERNAL', true);
    return { ok: true, data: { url: signed.data.signedUrl, expiresAt } };
  } catch { return failure('INTERNAL', true); }
}
