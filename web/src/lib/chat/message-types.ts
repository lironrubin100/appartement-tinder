export type ChatContent =
  | { kind: "user" | "system"; body: string; listing_id: null }
  | { kind: "listing"; body: string; listing_id: string };
export const messageFields =
  "id,sender_id,kind,body,created_at,message_seq,listing_id" as const;
export function sharedListingId(message: {
  kind: string;
  listing_id: string | null;
}): string | null {
  return message.kind === "listing" &&
    message.listing_id &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      message.listing_id,
    )
    ? message.listing_id
    : null;
}
