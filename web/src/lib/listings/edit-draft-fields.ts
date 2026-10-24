import type { ListingDraftFields } from "./draft-types";
import type { SavedListingDraft } from "./draft-store";
export type EditDraftRoom = NonNullable<ListingDraftFields["rooms"]>[number];
export type ListingEditContext = Readonly<{
  listingId: string;
  originalRevision: number;
  currentRevision: number;
  address: string | null;
  status?: 'active' | 'taken' | 'flagged' | 'paused';
}>;
/** Preserve identity/inventory from the original draft, never from form controls.
 * Room membership/availability is handled by its own owner controls. */
export function editDraftFields(
  input: SavedListingDraft,
  original: ListingDraftFields,
  changes: readonly EditDraftRoom[],
  isSublet: boolean,
): ListingDraftFields {
  return {
    title: input.title,
    bedrooms: input.bedrooms,
    availableFrom: input.availableFrom,
    billsIncluded: input.billsIncluded,
    description: input.description,
    isSublet,
    rooms: (original.rooms ?? []).map((room) => {
      const edit = changes.find((value) => value.id === room.id);
      return {
        ...room,
        ...(edit
          ? {
              label: edit.label,
              monthlyPrice: edit.monthlyPrice,
              availableFrom: edit.availableFrom,
            }
          : {}),
      };
    }),
  };
}
