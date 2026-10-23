'use client';

import { createClient } from '@/utils/supabase/client';
import { resizeImage } from '@/utils/photos';
import { LISTING_PHOTO_MAX_BYTES } from './validation';
import { loadListingCloudDraft } from './draft-actions';
import { createListingDraftPhotoPreview, setListingCloudDraftPhotos } from './draft-media-actions';
import type { DraftDocument } from './draft-service-contract';
import type { DraftPhotoReference, StorageObjectPath } from './draft-types';
import { DRAFT_MEDIA_BUCKET, DRAFT_MEDIA_MAX_BYTES, isMediaId, parsePhotoReferences,
  type DraftMediaErrorCode, type DraftMediaFailure, type DraftMediaItem, type DraftMediaSaveResult, type DraftMediaPreviewResult, type PreparedPhotoResult } from './draft-media-contract';

const failure = (code: DraftMediaErrorCode, retryable = false, recovery: readonly DraftPhotoReference[] = []): DraftMediaFailure => ({ ok: false, error: { code, retryable }, recovery: [...recovery] });
const digest = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');

// Transient preparation only. Persist objectId/references separately, never this Blob.
export async function prepareDraftPhoto(file: File, objectId: string = crypto.randomUUID()): Promise<PreparedPhotoResult> {
  if (!(file instanceof File) || !file.type.startsWith('image/') || file.size <= 0 || file.size > LISTING_PHOTO_MAX_BYTES || !isMediaId(objectId)) return failure('VALIDATION_FAILED');
  try {
    const blob = await resizeImage(file);
    if (blob.type !== 'image/jpeg' || blob.size <= 0 || blob.size > DRAFT_MEDIA_MAX_BYTES) return failure('VALIDATION_FAILED');
    return { ok: true, data: { kind: 'upload', objectId, blob, digest: await digest(blob) } };
  } catch { return failure('PREPARATION_FAILED', true); }
}

// All reads/writes use the ordinary session + server/RLS boundaries. The caller
// retains its readonly selection on every failure; uploaded bytes are not deleted.
export async function saveDraftMedia(draft: DraftDocument, selection: readonly DraftMediaItem[]): Promise<DraftMediaSaveResult> {
  const staged: DraftPhotoReference[] = [];
  let client: ReturnType<typeof createClient> | undefined;
  const stillActor = async () => {
    try { if (!client) return false; const result = await client.auth.getUser(); return !result.error && result.data.user?.id === draft.ownerId; }
    catch { return false; }
  };
  try {
    if (!draft || !isMediaId(draft.id) || !isMediaId(draft.ownerId) || !Number.isInteger(draft.revision) || draft.revision < 0 || !Array.isArray(selection) || selection.length > 8) return failure('VALIDATION_FAILED');
    draft = { ...draft };
    selection = selection.map(item => ({ ...item }));
    client = createClient();
    if (!await stillActor()) return failure('AUTH_CHANGED');
    const loaded = await loadListingCloudDraft(draft.id);
    if (!await stillActor()) return failure('AUTH_CHANGED');
    if (!loaded.ok) return { ...loaded, recovery: [] };
    const current = loaded.data;
    if (current.ownerId !== draft.ownerId) return failure('AUTH_CHANGED');
    if (current.revision !== draft.revision) return failure('VERSION_CONFLICT');
    if (current.state !== 'open' || current.publicationStartedAt !== null) return failure('STATE_UNAVAILABLE');
    const refs: DraftPhotoReference[] = [];
    // Validate the full selection before the first network upload.
    for (const item of selection) {
      if (item?.kind === 'upload') {
        if (!isMediaId(item.objectId) || !(item.blob instanceof Blob) || item.blob.type !== 'image/jpeg' || item.blob.size <= 0 || item.blob.size > DRAFT_MEDIA_MAX_BYTES || !/^[0-9a-f]{64}$/.test(item.digest)) return failure('VALIDATION_FAILED');
        refs.push({ kind: 'draft', objectPath: `${draft.ownerId}/${draft.id}/${item.objectId.toLowerCase()}.jpg` as StorageObjectPath });
      } else {
        const parsed = parsePhotoReferences([item]);
        if (!parsed || !current.photos.some(photo => photo.kind === parsed[0].kind && photo.objectPath === parsed[0].objectPath)) return failure('VALIDATION_FAILED');
        refs.push(parsed[0]);
      }
    }
    if (!parsePhotoReferences(refs)) return failure('VALIDATION_FAILED');
    for (const [index, item] of selection.entries()) {
      if (item.kind !== 'upload') continue;
      if (await digest(item.blob) !== item.digest) return failure('VALIDATION_FAILED', false, staged);
      if (!await stillActor()) return failure('AUTH_CHANGED');
      const ref = refs[index]; staged.push(ref); // This exact attempt may persist even if its response is lost.
      const upload = await client.storage.from(DRAFT_MEDIA_BUCKET).upload(ref.objectPath, item.blob, { contentType: 'image/jpeg', cacheControl: '0', upsert: false });
      if (!await stillActor()) return failure('AUTH_CHANGED');
      if (upload.error) {
        // Lost responses and retry conflicts are safe only when existing bytes match.
        const existing = await client.storage.from(DRAFT_MEDIA_BUCKET).download(ref.objectPath);
        if (!await stillActor()) return failure('AUTH_CHANGED');
        if (existing.error || !existing.data) return failure('UPLOAD_FAILED', true, staged);
        if (await digest(existing.data) !== item.digest) return failure('PHOTO_CONFLICT', false, staged);
      }
    }
    if (!await stillActor()) return failure('AUTH_CHANGED');
    const saved = await setListingCloudDraftPhotos(draft.id, draft.revision, refs);
    if (!await stillActor()) return failure('AUTH_CHANGED');
    if (!saved.ok) return { ...saved, recovery: staged };
    if (saved.data.ownerId !== draft.ownerId || saved.data.id !== draft.id) return failure('AUTH_CHANGED');
    return { ok: true, data: saved.data, uploaded: staged };
  } catch {
    return await stillActor() ? failure('UPLOAD_FAILED', true, staged) : failure('AUTH_CHANGED');
  }
}

// The caller must discard this transient result on logout/account switch too.
// No signed URL belongs in the persisted draft or a shared cache.
export async function previewDraftPhoto(draft: DraftDocument, ref: DraftPhotoReference): Promise<DraftMediaPreviewResult> {
  try {
    if (!draft || !isMediaId(draft.id) || !isMediaId(draft.ownerId) || !parsePhotoReferences([ref])) return failure('VALIDATION_FAILED');
    const { id, ownerId } = draft;
    const selected = parsePhotoReferences([ref])![0];
    const client = createClient();
    const before = await client.auth.getUser();
    if (before.error || before.data.user?.id !== ownerId) return failure('AUTH_CHANGED');
    const result = await createListingDraftPhotoPreview(id, selected);
    const after = await client.auth.getUser();
    if (after.error || after.data.user?.id !== ownerId) return failure('AUTH_CHANGED');
    return result.ok ? result : { ...result, recovery: [] };
  } catch { return failure('INTERNAL', true); }
}
