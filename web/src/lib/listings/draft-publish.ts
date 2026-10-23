'use server';

import { createHash } from 'node:crypto';
import { createServerClient } from '@/utils/supabase/server';
import { publishListing } from './actions';
import { decodeDraft, draftColumns, isId, isRevision, type DraftDocument, type DraftErrorCode } from './draft-service-contract';
import { DRAFT_MEDIA_BUCKET, DRAFT_MEDIA_MAX_BYTES } from './draft-media-contract';
import { validateListingDraft } from './validation';
import { readListingPublicationForm, listingPublicationPayload, listingPublicationLocationValid } from './publication-contract';

export type DraftPublishInput = { id: string; expectedRevision: number; expectedAccountId: string; providerToken?: string };
export type DraftPublishErrorCode = DraftErrorCode | 'LOCATION_REQUIRED' | 'PHOTO_UNAVAILABLE' | 'PUBLICATION_UNCERTAIN' | 'PUBLISH_FAILED';
export type DraftPublishResult = { ok: true; data: { draftId: string; listingId: string; requestKey: string; revision: number; completed: true } }
  | { ok: false; error: { code: DraftPublishErrorCode; retryable: boolean; message?: string } };
const failure = (code: DraftPublishErrorCode, retryable = false, message?: string): DraftPublishResult => ({ ok: false, error: { code, retryable, ...(message ? { message } : {}) } });
const success = (draft: DraftDocument): DraftPublishResult => ({ ok: true, data: { draftId: draft.id, listingId: draft.publicationRequestId!, requestKey: draft.publicationRequestId!, revision: draft.revision, completed: true } });
function rpcFailure(error: { message: string }): DraftPublishResult {
  if (error.message === 'AUTH_REQUIRED') return failure('AUTH_REQUIRED');
  if (error.message === 'DRAFT_NOT_FOUND') return failure('NOT_FOUND');
  if (error.message === 'DRAFT_CONFLICT') return failure('VERSION_CONFLICT');
  if (['DRAFT_CLOSED', 'DRAFT_UNAVAILABLE', 'PUBLICATION_SNAPSHOT_CONFLICT', 'PUBLICATION_SNAPSHOT_UNKNOWN'].includes(error.message)) return failure('STATE_UNAVAILABLE');
  return failure('PUBLICATION_UNCERTAIN', true);
}

// IDs/preconditions only. Fields, paths, bytes and the request key come from the
// authenticated snapshot. No cleanup or cancellation follows an uncertain reply.
export async function publishListingCloudDraft(input: DraftPublishInput): Promise<DraftPublishResult> {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['id', 'expectedRevision', 'expectedAccountId', 'providerToken'].includes(key))
      || !isId(input.id) || !isId(input.expectedAccountId) || !isRevision(input.expectedRevision)
      || input.providerToken !== undefined && (typeof input.providerToken !== 'string' || input.providerToken.length > 4000)) return failure('VALIDATION_FAILED');
    const client = await createServerClient({ noStore: true });
    const actor = async () => { const auth = await client.auth.getUser(); return !auth.error && auth.data.user?.id === input.expectedAccountId; };
    if (!await actor()) return failure('AUTH_REQUIRED');
    const loaded = await client.from('listing_drafts').select(draftColumns).eq('id', input.id).eq('owner_id', input.expectedAccountId).maybeSingle();
    if (!await actor()) return failure('AUTH_REQUIRED');
    if (loaded.error) return failure('INTERNAL', true);
    if (!loaded.data) return failure('NOT_FOUND');
    const draft = decodeDraft(loaded.data, input.expectedAccountId);
    if (draft.revision !== input.expectedRevision) return failure('VERSION_CONFLICT');
    if (draft.kind !== 'new' || draft.state === 'deleting' || !isId(draft.publicationRequestId)) return failure('STATE_UNAVAILABLE');
    if (draft.state === 'completed' && !draft.publicationStartedAt) return failure('STATE_UNAVAILABLE');
    const fields = draft.fields, address = fields.address, form = new FormData();
    if (typeof fields.billsIncluded !== 'boolean') return failure('VALIDATION_FAILED');
    for (const name of ['title', 'bedrooms', 'availableFrom', 'description'] as const) form.set(name, fields[name] ?? '');
    form.set('address', address?.address ?? ''); form.set('latitude', address?.latitude ?? ''); form.set('longitude', address?.longitude ?? '');
    form.set('locationMode', address?.manual === true ? 'manual' : 'provider'); form.set('locationCity', address?.city ?? '');
    if (address?.confirmed === true) form.set('locationConfirmed', 'on');
    if (fields.billsIncluded) form.set('billsIncluded', 'on');
    if (input.providerToken) form.set('locationToken', input.providerToken);
    form.set('requestKey', draft.publicationRequestId); form.set('expectedAccountId', draft.ownerId);
    for (const price of fields.roomPrices ?? []) form.append('roomPrice', price);
    // All application media writes prepare immutable JPEGs with the shared
    // compressor before association. Do not recompress a frozen retry's bytes.
    const digests: string[] = [], urls: string[] = [];
    for (const [index, ref] of draft.photos.entries()) {
      if (ref.kind !== 'draft' || !ref.objectPath.startsWith(`${draft.ownerId}/${draft.id}/`) || !/^[0-9a-f-]{36}\.jpg$/.test(ref.objectPath.slice(`${draft.ownerId}/${draft.id}/`.length))) return failure('PHOTO_UNAVAILABLE');
      if (!await actor()) return failure('AUTH_REQUIRED');
      const photo = await client.storage.from(DRAFT_MEDIA_BUCKET).download(ref.objectPath, {}, { cache: 'no-store' });
      if (!await actor()) return failure('AUTH_REQUIRED');
      if (photo.error || !photo.data || photo.data.type !== 'image/jpeg' || photo.data.size <= 0 || photo.data.size > DRAFT_MEDIA_MAX_BYTES) return failure('PHOTO_UNAVAILABLE', true);
      const bytes = await photo.data.arrayBuffer();
      form.append('photos', new File([bytes], `${index + 1}.jpg`, { type: 'image/jpeg' }));
      digests.push(createHash('sha256').update(Buffer.from(bytes)).digest('hex'));
      urls.push(client.storage.from('apartment-photos').getPublicUrl(`${draft.publicationRequestId}/${index + 1}.jpg`).data.publicUrl);
    }
    const model = readListingPublicationForm(form), invalid = validateListingDraft(model);
    if (invalid) return failure('VALIDATION_FAILED', false, invalid);
    const payload = listingPublicationPayload(model, urls, digests);
    if (!await actor()) return failure('AUTH_REQUIRED');
    const reconcile = async (): Promise<DraftPublishResult | null> => {
      // This owner/revision/hash proof precedes completion, including already
      // completed rows. It uses Postgres's actual jsonb hash representation.
      const proof = await client.rpc('verify_listing_draft_publication_snapshot', { p_draft_id: draft.id, p_expected_revision: draft.revision, p_payload: payload });
      if (proof.error) return failure('PUBLICATION_UNCERTAIN', true);
      if (proof.data !== true) return failure('STATE_UNAVAILABLE');
      const receipt = await client.rpc('complete_listing_draft', { p_draft_id: draft.id, p_expected_revision: draft.revision });
      if (receipt.error) return receipt.error.message === 'PUBLICATION_RECEIPT_REQUIRED' ? null : rpcFailure(receipt.error);
      const completed = decodeDraft(receipt.data, draft.ownerId);
      if (completed.id !== draft.id || completed.revision !== draft.revision || completed.publicationRequestId !== draft.publicationRequestId || completed.state !== 'completed') return failure('PUBLICATION_UNCERTAIN', true);
      return success(completed);
    };
    if (draft.publicationStartedAt) {
      const previous = await reconcile();
      if (!await actor()) return failure('AUTH_REQUIRED');
      if (previous) return previous;
    }
    // Already verified receipts above need no new address token. A pending/new
    // attempt retains the legacy exact-token or explicit manual-location gate.
    if (!listingPublicationLocationValid(form, draft.ownerId, process.env.GEOAPIFY_API_KEY?.trim() ?? '')) return failure('LOCATION_REQUIRED');
    if (!await actor()) return failure('AUTH_REQUIRED');
    const frozen = await client.rpc('begin_listing_draft_publication', { p_draft_id: draft.id, p_expected_revision: draft.revision, p_payload: payload });
    if (frozen.error) {
      if (['DRAFT_CONFLICT', 'AUTH_REQUIRED', 'DRAFT_NOT_FOUND'].includes(frozen.error.message)) return rpcFailure(frozen.error);
      // Another exact retry may have completed between this load and begin, or
      // begin's acknowledgement may be lost. Verify before returning uncertainty.
      const recovered = await reconcile();
      if (!await actor()) return failure('AUTH_REQUIRED');
      return recovered?.ok ? recovered : rpcFailure(frozen.error);
    }
    const bound = decodeDraft(frozen.data, draft.ownerId);
    if (bound.id !== draft.id || bound.revision !== draft.revision || bound.publicationRequestId !== draft.publicationRequestId || !bound.publicationStartedAt) return failure('PUBLICATION_UNCERTAIN', true);
    if (!await actor()) return failure('AUTH_REQUIRED');
    const published = await publishListing(form);
    if (!await actor()) return failure('AUTH_REQUIRED');
    // Even a lost successful publication response may already have committed.
    const completed = await reconcile();
    if (!await actor()) return failure('AUTH_REQUIRED');
    if (completed) return completed;
    return published.error ? failure('PUBLISH_FAILED', true, published.error) : failure('PUBLICATION_UNCERTAIN', true);
  } catch { return failure('PUBLICATION_UNCERTAIN', true); }
}
