import type { DraftPhotoReference, StorageObjectPath } from './draft-types';
import type { DraftDocument, DraftErrorCode } from './draft-service-contract';

export const DRAFT_MEDIA_BUCKET = 'listing-draft-media';
export const DRAFT_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const DRAFT_MEDIA_PREVIEW_SECONDS = 60;
export const isMediaId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export function parsePhotoReferences(value: unknown): DraftPhotoReference[] | null {
  if (!Array.isArray(value) || value.length > 8) return null;
  const result: DraftPhotoReference[] = [];
  for (const photo of value) {
    if (!photo || typeof photo !== 'object' || Object.getPrototypeOf(photo) !== Object.prototype
      || Object.keys(photo).length !== 2 || !Object.hasOwn(photo, 'kind') || !Object.hasOwn(photo, 'objectPath')
      || !['draft', 'published'].includes(photo.kind) || typeof photo.objectPath !== 'string' || photo.objectPath.length > 384
      || !/^(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_.-]+$/.test(photo.objectPath)
      || photo.objectPath.split('/').some((part: string) => part === '.' || part === '..')
      || result.some(item => item.objectPath === photo.objectPath)) return null;
    result.push({ kind: photo.kind, objectPath: photo.objectPath as StorageObjectPath });
  }
  return result;
}
export type PreparedDraftPhoto = Readonly<{ kind: 'upload'; objectId: string; blob: Blob; digest: string }>;
export type DraftMediaItem = DraftPhotoReference | PreparedDraftPhoto;
export type DraftPhotoPreview = Readonly<{ url: string; expiresAt: number }>;
export type DraftMediaErrorCode = DraftErrorCode | 'PREPARATION_FAILED' | 'UPLOAD_FAILED' | 'PHOTO_CONFLICT' | 'AUTH_CHANGED';
export type DraftMediaFailure = { ok: false; error: { code: DraftMediaErrorCode; retryable: boolean }; recovery: readonly DraftPhotoReference[] };
export type PreparedPhotoResult = { ok: true; data: PreparedDraftPhoto } | DraftMediaFailure;
export type DraftMediaSaveResult = { ok: true; data: DraftDocument; uploaded: readonly DraftPhotoReference[] } | DraftMediaFailure;
export type DraftMediaPreviewResult = { ok: true; data: DraftPhotoPreview } | DraftMediaFailure;
