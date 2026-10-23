/** Private persisted drafts contain storage identities, never File objects or URLs.
 * Paths must be validated as object paths at the server/media boundary before
 * being represented by this type; a TypeScript brand is not runtime validation.
 */
declare const storageObjectPathBrand: unique symbol;
export type StorageObjectPath = string & { readonly [storageObjectPathBrand]: true };

export type DraftPhotoReference =
  | Readonly<{ kind: 'draft'; objectPath: StorageObjectPath }>
  | Readonly<{ kind: 'published'; objectPath: StorageObjectPath }>;

/** Partial form input, not the validated ListingDraft used for publication. */
export type ListingDraftFields = Readonly<{
  title?: string;
  bedrooms?: string;
  availableFrom?: string;
  billsIncluded?: boolean;
  isSublet?: boolean;
  // Edit drafts retain room identity and occupancy; incomplete prices/dates are private input.
  rooms?: readonly Readonly<{ id: string; label: string | null; monthlyPrice: string; availableFrom: string; isAvailable: boolean }>[];
  description?: string;
  roomPrices?: readonly string[];
  address?: Readonly<{
    address?: string;
    latitude?: string;
    longitude?: string;
    city?: string;
    manual?: boolean;
    confirmed?: boolean;
  }>;
}>;

type DraftBase = Readonly<{
  id: string;
  ownerId: string; // Derived from the authenticated session, never client authority.
  schemaVersion: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
  state: 'open' | 'deleting' | 'completed';
  fields: ListingDraftFields;
  photos: readonly DraftPhotoReference[]; // Array order is the display order.
  publicationRequestId: string | null;
  importReceiptId: string | null;
}>;

/** New and edit drafts have different source invariants. */
export type ListingCloudDraft = DraftBase & (
  | Readonly<{ kind: 'new'; sourceListingId?: never; sourceRevision?: never }>
  | Readonly<{ kind: 'edit'; sourceListingId: string; sourceRevision: number }>
);
