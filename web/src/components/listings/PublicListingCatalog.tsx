import Link from "next/link";
import { createServerClient } from "@/utils/supabase/server";
import { ListingPreviewCard } from "./ListingPreviewCard";
import { ShareListing } from "./ShareListing";
import { listingPreview } from "@/lib/listings/preview";
export async function PublicListingCatalog({
  locale,
  page,
}: {
  locale: "he" | "en";
  page: string | undefined;
}) {
  const en = locale === "en",
    prefix = en ? "/en" : "",
    index = /^[1-9][0-9]{0,3}$/.test(page ?? "")
      ? Math.min(Number(page), 1000)
      : 1;
  const api = await createServerClient({ noStore: true });
  const { data, error } = await api.rpc("list_public_listings", {
    p_page: index,
  });
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-ink">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href={prefix || "/"} className="text-xl font-bold text-orange">
          Shutaf
        </Link>
        <div className="flex gap-4">
          <Link
            href={`${en ? "" : "/en"}/listings`}
            className="text-teal underline"
          >
            {en ? "עברית" : "English"}
          </Link>
          <Link
            href={`${prefix}/login?returnTo=${encodeURIComponent(`${prefix}/listings`)}`}
            className="text-teal underline"
          >
            {en ? "Sign in" : "התחברות"}
          </Link>
        </div>
      </header>
      <h1 className="mb-2 text-3xl font-bold">{en ? "Apartments" : "דירות"}</h1>
      <p className="mb-6 text-muted-text">
        {en
          ? "Browse without an account. Sign in to save, chat or contact an owner."
          : "אפשר לצפות בלי חשבון. התחברו כדי לשמור, לשוחח או לפנות לבעל הדירה."}
      </p>
      {error ? (
        <p role="alert">
          {en
            ? "Could not load apartments. Please refresh to retry."
            : "לא הצלחנו לטעון דירות. רעננו לניסיון נוסף."}
        </p>
      ) : (
        <>
          {!data?.length && (
            <p>
              {en
                ? "No apartments available on this page."
                : "אין דירות זמינות בעמוד הזה."}
            </p>
          )}
          <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data?.slice(0, 12).map((row) => (
              <ListingPreviewCard
                key={row.id}
                listing={listingPreview(row)}
                locale={locale}
                actions={<ShareListing id={row.id} locale={locale} />}
              />
            ))}
          </div>
          <nav
            aria-label={en ? "Apartment pages" : "עמודי דירות"}
            className="mt-6 flex gap-6"
          >
            {index > 1 && (
              <Link
                href={`${prefix}/listings?page=${index - 1}`}
                className="text-teal underline"
              >
                {en ? "Previous" : "הקודם"}
              </Link>
            )}
            {(data?.length ?? 0) > 12 && (
              <Link
                href={`${prefix}/listings?page=${index + 1}`}
                className="text-teal underline"
              >
                {en ? "Next" : "הבא"}
              </Link>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
