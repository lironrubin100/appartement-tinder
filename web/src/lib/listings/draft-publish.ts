'use server';

import { createHash } from 'node:crypto';
import { createServerClient } from '@/utils/supabase/server';
import { publishListing } from './actions';
import { decodeDraft, draftColumns, isId, isRevision, type DraftDocument, type DraftErrorCode } from './draft-service-contract';
import { DRAFT_MEDIA_BUCKET, DRAFT_MEDIA_MAX_BYTES } from './draft-media-contract';
import { validateListingDraft } from './validation';
import { readListingPublicationForm, listingPublicationPayload, listingPublicationLocationValid } from './publication-contract';

export type DraftPublishInput = { id: string; expectedRevision: number; expectedAccountId: string; providerToken?: string };
export type DraftPublishErrorCode = DraftErrorCode | 'LOCATION_REQUIRED' | 'PHOTO_UNAVAILABLE' | 'PUBLICATION_UNCERTAIN' | 'PUBLISH_FAILED' | 'PUBLICATION_PENDING' | 'PUBLICATION_NOT_STARTED';
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
async function runPublication(input: DraftPublishInput, reconcileOnly: boolean): Promise<DraftPublishResult> {
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
    if (reconcileOnly && !draft.publicationStartedAt) return failure('PUBLICATION_NOT_STARTED', true);
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
      if (reconcileOnly) return failure('PUBLICATION_PENDING', true);
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

export async function publishListingCloudDraft(input: DraftPublishInput): Promise<DraftPublishResult> {
  return runPublication(input, false);
}
export async function reconcileListingCloudDraftPublication(input: DraftPublishInput): Promise<DraftPublishResult> {
  return runPublication(input, true);
}
export type DraftPublicationCancellation = { ok: true; data: { kind: 'editable'; draft: DraftDocument } | { kind: 'published'; publication: Extract<DraftPublishResult, { ok: true }>['data'] } } | Extract<DraftPublishResult, { ok: false }>;
export async function cancelListingCloudDraftPublication(input: Omit<DraftPublishInput, 'providerToken'>): Promise<DraftPublicationCancellation> {
  try {
    if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['id', 'expectedRevision', 'expectedAccountId'].includes(key))
      || !isId(input.id) || !isRevision(input.expectedRevision) || !isId(input.expectedAccountId)) return failure('VALIDATION_FAILED') as Extract<DraftPublishResult, { ok: false }>;
    const client = await createServerClient({ noStore: true });
    const auth = await client.auth.getUser();
    if (auth.error || auth.data.user?.id !== input.expectedAccountId) return { ok: false, error: { code: 'AUTH_REQUIRED', retryable: false } };
    const loaded = await client.from('listing_drafts').select(draftColumns).eq('id', input.id).eq('owner_id', input.expectedAccountId).maybeSingle();
    if (loaded.error) return { ok: false, error: { code: 'PUBLICATION_UNCERTAIN', retryable: true } };
    if (!loaded.data) return { ok: false, error: { code: 'NOT_FOUND', retryable: false } };
    const before = decodeDraft(loaded.data, input.expectedAccountId);
    if (before.kind !== 'new' || before.state === 'deleting') return { ok: false, error: { code: 'STATE_UNAVAILABLE', retryable: false } };
    const result = await client.rpc('cancel_listing_draft_publication', { p_draft_id: input.id, p_expected_revision: input.expectedRevision });
    if (result.error) {
      // The publication can commit while the user confirms cancellation. Only
      // a verified matching receipt can then route to the published listing.
      if (['PUBLICATION_ALREADY_COMMITTED', 'DRAFT_CLOSED'].includes(result.error.message)) {
        const publication = await runPublication(input, true);
        if (publication.ok) return { ok: true, data: { kind: 'published', publication: publication.data } };
        return publication;
      }
      return rpcFailure(result.error) as Extract<DraftPublishResult, { ok: false }>;
    }
    const draft = decodeDraft(result.data, input.expectedAccountId);
    if (draft.id !== input.id || draft.kind !== 'new' || draft.state !== 'open' || draft.publicationStartedAt !== null
      || draft.revision !== input.expectedRevision + 1 || draft.publicationRequestId === before.publicationRequestId) return { ok: false, error: { code: 'PUBLICATION_UNCERTAIN', retryable: true } };
    return { ok: true, data: { kind: 'editable', draft } };
  } catch { return { ok: false, error: { code: 'PUBLICATION_UNCERTAIN', retryable: true } }; }
}
