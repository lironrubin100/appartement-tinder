"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ListingPreviewCard } from "@/components/listings/ListingPreviewCard";
import { ShareListing } from "@/components/listings/ShareListing";
import { listingPreview, type ListingPreview } from "@/lib/listings/preview";
import { useFavorites } from "@/hooks/useFavorites";
type Favorites = ReturnType<typeof useFavorites>;
export function ChatListingCard({
  id,
  locale,
  favorites,
}: {
  id: string;
  locale: "he" | "en";
  favorites: Favorites;
}) {
  const [listing, setListing] = useState<ListingPreview | null>(null),
    [state, setState] = useState("loading"),
    [attempt, setAttempt] = useState(0),
    [error, setError] = useState("");
  const en = locale === "en";
  useEffect(() => {
    let active = true,
      version = 0;
    const load = async () => {
      const request = ++version;
      try {
        const { data, error } = await createClient().rpc("get_public_listing", {
          p_listing_id: id,
        });
        if (!active || request !== version) return;
        if (error) {
          setState("error");
          return;
        }
        setListing(data?.[0] ? listingPreview(data[0]) : null);
        setState(data?.[0] ? "ready" : "unavailable");
      } catch {
        if (active && request === version) setState("error");
      }
    };
    void load();
    const refresh = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [id, attempt]);
  if (state === "loading")
    return (
      <p
        role="status"
        className="rounded-xl border border-card-border bg-white p-4"
      >
        {en ? "Loading apartment…" : "טוענים את הדירה…"}
      </p>
    );
  if (state === "unavailable")
    return (
      <p
        data-testid="listing-unavailable"
        className="rounded-xl border border-card-border bg-white p-4"
      >
        {en
          ? "This apartment is no longer available."
          : "הדירה הזו כבר אינה זמינה."}
      </p>
    );
  if (state === "error")
    return (
      <div className="rounded-xl border border-card-border bg-white p-4">
        <p>
          {en
            ? "Could not refresh apartment details."
            : "לא הצלחנו לעדכן את פרטי הדירה."}
        </p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="p-2 text-teal underline"
        >
          {en ? "Retry" : "ניסיון נוסף"}
        </button>
      </div>
    );
  if (!listing) return null;
  return (
    <div>
      <ListingPreviewCard
        listing={listing}
        locale={locale}
        actions={
          <>
            <button
              type="button"
              disabled={!favorites.ready || favorites.isPending(id)}
              aria-pressed={favorites.isSaved(id)}
              onClick={async () => {
                setError("");
                const result = await favorites.toggle(id);
                if (!result.ok)
                  setError(
                    en
                      ? "Could not update your saved apartments. Retry."
                      : "לא הצלחנו לעדכן את השמורים שלך. נסו שוב.",
                  );
              }}
              className="rounded-xl border border-card-border px-3 py-2 text-sm text-teal"
            >
              {favorites.isSaved(id)
                ? en
                  ? "Unsave"
                  : "ביטול שמירה"
                : en
                  ? "Save for me"
                  : "שמירה אישית"}
            </button>
            <ShareListing id={id} locale={locale} />
          </>
        }
      />
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
