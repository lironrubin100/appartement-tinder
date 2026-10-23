import type { Database } from "@/types/database";
export type ListingPreview = Omit<
  Pick<
    Database["public"]["Functions"]["get_public_listing"]["Returns"][number],
    | "id"
    | "title"
    | "photos"
    | "min_room_price"
    | "max_room_price"
    | "available_room_count"
    | "bedrooms"
    | "available_from"
    | "bills_included"
    | "is_sublet"
    | "public_location_label"
  >,
  "available_from"
> & { available_from: string | null };
export const publicListingPath = (id: string, locale: "he" | "en") =>
  `${locale === "en" ? "/en" : ""}/listings/${id}`;
// Explicit projection keeps private/unknown additions out of component props.
export function listingPreview(row: ListingPreview): ListingPreview {
  return {
    id: row.id,
    title: row.title,
    photos: row.photos.slice(0, 1),
    min_room_price: row.min_room_price,
    max_room_price: row.max_room_price,
    available_room_count: row.available_room_count,
    bedrooms: row.bedrooms,
    available_from: row.available_from,
    bills_included: row.bills_included,
    is_sublet: row.is_sublet,
    public_location_label: row.public_location_label,
  };
}
