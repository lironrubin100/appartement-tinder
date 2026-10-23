import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { publicListingPath, type ListingPreview } from "@/lib/listings/preview";
/** Shared presentation only. Data, sharing and personal save behavior are slots. */
export function ListingPreviewCard({
  listing,
  locale,
  actions,
}: {
  listing: ListingPreview;
  locale: "he" | "en";
  actions?: ReactNode;
}) {
  const en = locale === "en";
  const prices = `₪${listing.min_room_price.toLocaleString("en-US")}${listing.max_room_price !== listing.min_room_price ? `–${listing.max_room_price.toLocaleString("en-US")}` : ""}`;
  return (
    <article
      data-testid="listing-preview"
      data-listing-id={listing.id}
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-card-border bg-white text-ink shadow-sm"
    >
      <Link
        href={publicListingPath(listing.id, locale)}
        className="block focus-visible:outline-2 focus-visible:outline-orange"
      >
        {listing.photos[0] ? (
          <div className="relative aspect-[16/9] bg-neutral-bg-soft">
            <Image
              src={listing.photos[0]}
              alt={listing.title}
              fill
              unoptimized
              sizes="(max-width:640px) 100vw, 360px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="bg-neutral-bg-soft p-6 text-center text-muted-text">
            {en ? "Photo unavailable" : "תמונה לא זמינה"}
          </div>
        )}
        <div className="space-y-2 p-4">
          <h3 className="break-words text-base font-semibold">
            {listing.title}
          </h3>
          <p className="text-lg font-bold text-orange">
            <bdi>{prices}</bdi>{" "}
            <span className="text-sm font-normal">
              {en ? "per room / month" : "לחדר / חודש"}
            </span>
          </p>
          <p className="text-sm text-muted-text">
            {listing.public_location_label ||
              (en ? "Approximate area" : "אזור משוער")}
          </p>
          <p className="text-sm">
            {listing.available_room_count}{" "}
            {en ? "available rooms" : "חדרים פנויים"} · {listing.bedrooms}{" "}
            {en ? "bedrooms" : "חדרים בדירה"}
          </p>
          {listing.available_from && (
            <p className="text-sm">
              {en ? "Available from" : "כניסה מתאריך"}:{" "}
              <bdi>
                {new Date(
                  `${listing.available_from}T12:00:00`,
                ).toLocaleDateString(en ? "en-GB" : "he-IL")}
              </bdi>
            </p>
          )}
          <p className="text-sm">
            {listing.bills_included
              ? en
                ? "Bills included"
                : "חשבונות כלולים"
              : en
                ? "Bills not included"
                : "חשבונות לא כלולים"}
            {listing.is_sublet && ` · ${en ? "Sublet" : "סאבלט"}`}
          </p>
          <span className="inline-block text-sm font-medium text-teal underline">
            {en ? "View apartment" : "צפייה בדירה"}
          </span>
        </div>
      </Link>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 border-t border-card-border p-3">
          {actions}
        </div>
      )}
    </article>
  );
}
