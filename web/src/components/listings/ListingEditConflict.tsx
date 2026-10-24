"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { loadOwnedListingForEdit } from "@/app/(main)/my-listings/actions";
import type { OwnedListingEditModel } from "@/lib/listings/editor";
import { createClient } from "@/utils/supabase/client";
import type { Locale } from "@/lib/listings/text";

/** Current public version is comparison only. Refresh is an explicit confirmed
 * action; fetching this model never rebases or writes the private form. */
export function ListingEditConflict({
  listingId,
  accountId,
  locale,
  onRefresh,
}: {
  listingId: string;
  accountId: string;
  locale: Locale;
  onRefresh: () => Promise<boolean>;
}) {
  const en = locale === "en";
  const [source, setSource] = useState<OwnedListingEditModel | null>(null),
    [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false),
    [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await loadOwnedListingForEdit(listingId, accountId);
        const auth = await createClient().auth.getUser();
        if (!active || auth.error || auth.data.user?.id !== accountId) return;
        if (result.ok) {
          setSource(result.data);
          setFailed(false);
        } else setFailed(true);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [listingId, accountId, attempt]);
  return (
    <section
      data-testid="listing-source-conflict"
      className="space-y-3 rounded-xl border border-orange p-4"
    >
      <h2 className="font-semibold">
        {en ? "Compare with the current listing" : "השוואה למודעה הנוכחית"}
      </h2>
      <p className="text-sm">
        {en
          ? "The published listing changed after this draft started. Your edits remain in this form. Reloading replaces this draft with the current listing."
          : "המודעה השתנתה מאז פתיחת הטיוטה. השינויים שלך נשארו בטופס. רענון יחליף את הטיוטה בפרטי המודעה הנוכחית."}
      </p>
      {source && (
        <div className="space-y-2 rounded-xl bg-neutral-bg-soft p-3 text-sm">
          <h3 className="break-words font-semibold">{source.title}</h3>
          <p>
            {en ? "Bedrooms" : "חדרים בדירה"}: {source.bedrooms} ·{" "}
            {en ? "Available from" : "תאריך כניסה"}: {source.availableFrom}
          </p>
          {source.rooms.map((room) => (
            <p key={room.id}>
              {room.label || (en ? "Room" : "חדר")} · ₪
              {room.monthlyPrice.toLocaleString("en-US")} · {room.availableFrom}{" "}
              ·{" "}
              {room.isAvailable
                ? en
                  ? "Available"
                  : "פנוי"
                : en
                  ? "Unavailable"
                  : "לא פנוי"}
            </p>
          ))}
          <p>
            {source.billsIncluded
              ? en
                ? "Bills included"
                : "חשבונות כלולים"
              : en
                ? "Bills not included"
                : "חשבונות לא כלולים"}
            {source.isSublet ? ` · ${en ? "Sublet" : "סאבלט"}` : ""}
          </p>
          <p className="whitespace-pre-wrap break-words">
            {source.description}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {source.photos.map((photo, index) => (
              <div className="relative aspect-[3/2]" key={photo.objectPath}>
                <Image
                  src={
                    createClient()
                      .storage.from("apartment-photos")
                      .getPublicUrl(photo.objectPath).data.publicUrl
                  }
                  alt={`${en ? "Current listing photo" : "תמונה במודעה הנוכחית"} ${index + 1}`}
                  fill
                  unoptimized
                  sizes="160px"
                  className="rounded-lg object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {failed && (
        <p role="alert">
          {en
            ? "Could not load the current version. Your edits are kept."
            : "לא הצלחנו לטעון את הגרסה הנוכחית. השינויים שלך נשמרו כאן."}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          className="min-h-11 rounded-xl border border-card-border px-3 text-teal"
          onClick={() => setAttempt((n) => n + 1)}
        >
          {en ? "Check current listing" : "בדיקת המודעה הנוכחית"}
        </button>
        <button
          type="button"
          disabled={pending || !source}
          className="min-h-11 rounded-xl border border-card-border px-3 text-teal"
          onClick={async () => {
            if (
              !window.confirm(
                en
                  ? "Replace your private edits and photos with the current listing?"
                  : "להחליף את השינויים והתמונות בטיוטה בפרטי המודעה הנוכחית?",
              )
            )
              return;
            setPending(true);
            setFailed(false);
            try {
              if (!(await onRefresh())) setFailed(true);
            } catch {
              setFailed(true);
            } finally {
              setPending(false);
            }
          }}
        >
          {en ? "Reload current listing" : "טעינת המודעה הנוכחית"}
        </button>
      </div>
    </section>
  );
}
