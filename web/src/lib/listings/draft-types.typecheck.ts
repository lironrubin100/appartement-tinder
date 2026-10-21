import type { ListingCloudDraft, StorageObjectPath } from './draft-types';
import type { ListingDraft } from './validation';
import { validateListingDraft } from './validation';

declare const safePath: StorageObjectPath;
const common = {
  ownerId: 'owner', schemaVersion: 1, revision: 0,
  createdAt: '2026-10-22T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z',
  state: 'open', publicationRequestId: null, importReceiptId: null,
} as const;
const drafts: readonly ListingCloudDraft[] = [
  { ...common, id: 'one', kind: 'new', fields: {}, photos: [] },
  { ...common, id: 'two', kind: 'edit', sourceListingId: 'listing', sourceRevision: 1,
    fields: { title: 'Incomplete', roomPrices: [''] }, photos: [{ kind: 'published', objectPath: safePath }] },
];
// A persisted partial draft is not a complete validated publication input.
// @ts-expect-error Draft fields and storage references are not publication input.
validateListingDraft(drafts[0]);
// @ts-expect-error Edit drafts require both source identity and revision.
const missingRevision: ListingCloudDraft = { ...common, id: 'three', kind: 'edit', sourceListingId: 'listing', fields: {}, photos: [] };
// @ts-expect-error A plain URL (including a signed URL) is not a storage object path.
const unsafePhoto: ListingCloudDraft = { ...common, id: 'four', kind: 'new', fields: {}, photos: [{ kind: 'draft', objectPath: 'https://example.test/signed?token=secret' }] };
// @ts-expect-error Browser files are not serializable draft photo references.
const filePhoto: ListingCloudDraft = { ...common, id: 'five', kind: 'new', fields: {}, photos: [new File([], 'photo.jpg')] };
// @ts-expect-error The persistent fields are deliberately incomplete.
const publicationInput: ListingDraft = drafts[1].fields;
void [missingRevision, unsafePhoto, filePhoto, publicationInput];
