import type { ListingDraftFields, DraftPhotoReference } from "./draft-types";
import { validateListingFacts, validateListingPhotos } from "./validation";

/** Full room-preserving4.2 input. Identity/location/inventory never come from a
 * separate public form. The database independently derives it from its draft. */
export function listingEditModel(
  fields: ListingDraftFields,
  photos: readonly DraftPhotoReference[],
  requestKey: string,
) {
  const facts = {
    title: fields.title ?? "",
    bedrooms: Number(fields.bedrooms),
    billsIncluded: fields.billsIncluded!,
    availableFrom: fields.availableFrom ?? "",
    description: fields.description ?? "",
  };
  if (
    fields.address ||
    fields.roomPrices ||
    typeof fields.billsIncluded !== "boolean" ||
    typeof fields.isSublet !== "boolean" ||
    !fields.rooms ||
    validateListingFacts(facts)
  )
    return null;
  const rooms = fields.rooms.map((room) => ({
    ...room,
    monthlyPrice: Number(room.monthlyPrice),
  }));
  if (
    rooms.length > facts.bedrooms ||
    new Set(rooms.map((room) => room.id)).size !== rooms.length ||
    rooms.some(
      (room) =>
        !Number.isInteger(room.monthlyPrice) ||
        room.monthlyPrice < 1 ||
        room.monthlyPrice > 2147483647 ||
        (room.label?.length ?? 0) > 80 ||
        validateListingFacts({ ...facts, availableFrom: room.availableFrom }),
    )
  )
    return null;
  return {
    ...facts,
    isSublet: fields.isSublet,
    rooms,
    photos: photos.map((photo, index) => ({
      kind: "published" as const,
      objectPath:
        photo.kind === "published"
          ? photo.objectPath
          : `${requestKey}/${index + 1}.jpg`,
    })),
  };
}
export { validateListingPhotos };
