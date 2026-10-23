'use client';

import { createClient } from '@/utils/supabase/client';
import { discardListingAttempt } from './actions';
import { createListingCloudDraft, loadListingCloudDraft } from './draft-actions';
import { prepareDraftPhoto, saveDraftMedia } from './draft-media';
import { DRAFT_MEDIA_BUCKET, isMediaId, type DraftMediaErrorCode, type PreparedDraftPhoto } from './draft-media-contract';
import { claimLegacyDraftImport, finishLegacyDraftImport, retainImportCloudId, retainImportPreparedPhotos, type SavedListingDraft } from './draft-store';
import type { DraftDocument } from './draft-service-contract';
import type { ListingDraftFields } from './draft-types';

export type DraftImportErrorCode = DraftMediaErrorCode | 'NO_LOCAL_DRAFT' | 'LOCAL_STORAGE_FAILED' | 'LOCAL_SOURCE_CHANGED' | 'VERIFICATION_FAILED' | 'LEGACY_PUBLICATION_EXISTS';
export type DraftImportResult = { ok: true; data: DraftDocument; sourceRemoved: boolean } | { ok: false; error: { code: DraftImportErrorCode; retryable: boolean } };
const failure = (code: DraftImportErrorCode, retryable = false): DraftImportResult => ({ ok: false, error: { code, retryable } });
function importedFields(source: SavedListingDraft): ListingDraftFields {
  return { title: source.title, bedrooms: source.bedrooms, availableFrom: source.availableFrom, billsIncluded: source.billsIncluded,
    description: source.description, roomPrices: source.roomPrices, ...(source.address ? { address: {
      address: source.address.address, latitude: source.address.latitude, longitude: source.address.longitude,
      city: source.address.city, manual: source.address.manual, confirmed: source.address.confirmed,
    } } : {}) };
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
const hash = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('');
const active = new Map<string, Promise<DraftImportResult>>();

async function runImport(expectedAccountId: string): Promise<DraftImportResult> {
  let client: ReturnType<typeof createClient> | undefined;
  const stillActor = async () => {
    try { if (!client) return false; const result = await client.auth.getUser(); return !result.error && result.data.user?.id === expectedAccountId; }
    catch { return false; }
  };
  try {
    if (!isMediaId(expectedAccountId)) return failure('VALIDATION_FAILED');
    client = createClient();
    if (!await stillActor()) return failure('AUTH_CHANGED');
    const ticket = await claimLegacyDraftImport(expectedAccountId);
    if (!await stillActor()) return failure('AUTH_CHANGED');
    if (!ticket) return failure('NO_LOCAL_DRAFT');
    let receipt = ticket.receipt;
    // A verified receipt survives source deletion and a lost final response.
    // Never recreate a missing/deleted cloud draft from this historical receipt.
    if (!ticket.source) {
      if (!receipt.verified || !receipt.cloudDraftId) return failure('NO_LOCAL_DRAFT');
      const resumed = await loadListingCloudDraft(receipt.cloudDraftId);
      if (!await stillActor()) return failure('AUTH_CHANGED');
      if (!resumed.ok) return resumed;
      if (resumed.data.ownerId !== expectedAccountId || resumed.data.importReceiptId !== receipt.requestKey) return failure('VERSION_CONFLICT');
      const sourceRemoved = await finishLegacyDraftImport(ticket, resumed.data.id);
      if (!await stillActor()) return failure('AUTH_CHANGED');
      return { ok: true, data: resumed.data, sourceRemoved };
    }
    const fields = importedFields(ticket.source);
    if (ticket.source.requestKey) {
      if (!await stillActor()) return failure('AUTH_CHANGED');
      const previous = await discardListingAttempt(ticket.source.requestKey, expectedAccountId);
      if (!await stillActor()) return failure('AUTH_CHANGED');
      if ('error' in previous) return failure('STATE_UNAVAILABLE', true);
      if (previous.status === 'published') return failure('LEGACY_PUBLICATION_EXISTS');
    }
    if (!receipt.prepared && !receipt.verified) {
      const photos: PreparedDraftPhoto[] = [];
      for (const [index, file] of ticket.source.photos.entries()) {
        const photo = await prepareDraftPhoto(file, receipt.objectIds[index]);
        if (!await stillActor()) return failure('AUTH_CHANGED');
        if (!photo.ok) return photo;
        photos.push(photo.data);
      }
      // First committed preparation wins across tabs, preserving retry bytes.
      receipt = await retainImportPreparedPhotos(receipt, photos);
    }
    if (!await stillActor()) return failure('AUTH_CHANGED');
    const created = await createListingCloudDraft({ requestKey: receipt.requestKey, expectedAccountId, fields });
    if (!await stillActor()) return failure('AUTH_CHANGED');
    if (!created.ok) return created;
    let cloud = created.data;
    if (cloud.ownerId !== expectedAccountId || cloud.importReceiptId !== receipt.requestKey || cloud.kind !== 'new') return failure('VERSION_CONFLICT');
    receipt = await retainImportCloudId(receipt, cloud.id);
    if (canonical(cloud.fields) !== canonical(fields)) return failure('VERSION_CONFLICT');
    const expected = receipt.objectIds.map(objectId => ({ kind: 'draft', objectPath: `${expectedAccountId}/${cloud.id}/${objectId}.jpg` }));
    if (canonical(cloud.photos) !== canonical(expected)) {
      if (cloud.photos.length || !receipt.prepared || cloud.state !== 'open') return failure('VERSION_CONFLICT');
      const saved = await saveDraftMedia(cloud, receipt.prepared);
      if (!await stillActor()) return failure('AUTH_CHANGED');
      if (!saved.ok) {
        // A second tab or lost association response may already have committed
        // the exact import. Reconcile reads; never overwrite divergent content.
        const reconciled = await loadListingCloudDraft(cloud.id);
        if (!await stillActor()) return failure('AUTH_CHANGED');
        if (!reconciled.ok || canonical(reconciled.data.photos) !== canonical(expected) || canonical(reconciled.data.fields) !== canonical(fields)) return saved;
        cloud = reconciled.data;
      } else cloud = saved.data;
    }
    if (!await stillActor()) return failure('AUTH_CHANGED');
    const verified = await loadListingCloudDraft(cloud.id);
    if (!await stillActor()) return failure('AUTH_CHANGED');
    if (!verified.ok) return verified;
    cloud = verified.data;
    if (cloud.ownerId !== expectedAccountId || cloud.importReceiptId !== receipt.requestKey || canonical(cloud.fields) !== canonical(fields) || canonical(cloud.photos) !== canonical(expected)) return failure('VERSION_CONFLICT');
    if (receipt.digests.length !== expected.length) return failure('VERIFICATION_FAILED', true);
    for (const [index, photo] of expected.entries()) {
      if (!await stillActor()) return failure('AUTH_CHANGED');
      const downloaded = await client.storage.from(DRAFT_MEDIA_BUCKET).download(photo.objectPath);
      if (!await stillActor()) return failure('AUTH_CHANGED');
      if (downloaded.error || !downloaded.data || await hash(downloaded.data) !== receipt.digests[index]) return failure('VERIFICATION_FAILED', true);
    }
    if (!await stillActor()) return failure('AUTH_CHANGED');
    const sourceRemoved = await finishLegacyDraftImport({ ...ticket, receipt }, cloud.id);
    if (!await stillActor()) return failure('AUTH_CHANGED');
    return { ok: true, data: cloud, sourceRemoved };
  } catch (error) {
    if (!await stillActor()) return failure('AUTH_CHANGED');
    if (error instanceof Error && error.message === 'INVALID_LOCAL_DRAFT') return failure('VALIDATION_FAILED');
    if (error instanceof Error && error.message === 'LOCAL_SOURCE_CHANGED') return failure('LOCAL_SOURCE_CHANGED', true);
    return failure('LOCAL_STORAGE_FAILED', true);
  }
}

// Explicit operation only; listing the drafts must never trigger this import.
export function importLegacyListingDraft(expectedAccountId: string): Promise<DraftImportResult> {
  const pending = active.get(expectedAccountId);
  if (pending) return pending;
  const operation = runImport(expectedAccountId);
  active.set(expectedAccountId, operation);
  void operation.finally(() => { if (active.get(expectedAccountId) === operation) active.delete(expectedAccountId); });
  return operation;
}
