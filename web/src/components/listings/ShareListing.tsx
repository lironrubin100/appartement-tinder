"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { publicListingPath } from "@/lib/listings/preview";
import type { Database } from "@/types/database";
type Destination =
  Database["public"]["Functions"]["list_chat_inbox"]["Returns"][number];
export function ShareListing({
  id,
  locale = "he",
}: {
  id: string;
  locale?: "he" | "en";
}) {
  const en = locale === "en",
    dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false),
    [targets, setTargets] = useState<Destination[]>([]),
    [loading, setLoading] = useState(false);
  const [guest, setGuest] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [retryTarget, setRetryTarget] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null),
    [url, setUrl] = useState("");
  const actor = useRef<string | null>(null),
    pending = useRef<{ target: string; key: string; actorId: string } | null>(
      null,
    ),
    generation = useRef(0),
    busyRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    node?.showModal();
    const supabase = createClient();
    let active = true;
    const run = ++generation.current;
    void (async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (!active || run !== generation.current) return;
      actor.current = user?.id ?? null;
      if (pending.current && pending.current.actorId !== user?.id) {
        pending.current = null;
        setRetryTarget(null);
      }
      if (!user) {
        setGuest(!authError || authError.name === "AuthSessionMissingError");
        setLoading(false);
        if (authError && authError.name !== "AuthSessionMissingError")
          setError(
            en
              ? "Could not verify your account. Reopen to retry."
              : "לא הצלחנו לאמת את החשבון. פתחו שוב לניסיון נוסף.",
          );
        return;
      }
      const { data, error: loadError } = await supabase.rpc("list_chat_inbox");
      if (!active || run !== generation.current) return;
      setLoading(false);
      if (loadError)
        setError(
          en
            ? "Could not load chats. Reopen to retry."
            : "לא הצלחנו לטעון שיחות. פתחו שוב לניסיון נוסף.",
        );
      else setTargets(data ?? []);
    })().catch(() => {
      if (active) {
        setLoading(false);
        setError(en ? "Could not load chats." : "לא הצלחנו לטעון שיחות.");
      }
    });
    const clearAccount = () => {
      ++generation.current;
      actor.current = null;
      pending.current = null;
      setRetryTarget(null);
      setTargets([]);
      setSent(null);
      setNotice("");
      setGuest(false);
      setLoading(false);
      setError(
        en
          ? "Account changed. Close and reopen sharing."
          : "החשבון השתנה. סגרו ופתחו שוב את השיתוף.",
      );
    };
    const { data: auth } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active && actor.current && session?.user.id !== actor.current)
          clearAccount();
      },
    );
    const verifyOnFocus = () => {
      if (!actor.current || document.visibilityState !== "visible") return;
      const expected = actor.current;
      void supabase.auth
        .getUser()
        .then(({ data: { user }, error }) => {
          if (
            active &&
            actor.current === expected &&
            (error || user?.id !== expected)
          )
            clearAccount();
        })
        .catch(() => {
          if (active && actor.current === expected) clearAccount();
        });
    };
    window.addEventListener("focus", verifyOnFocus);
    document.addEventListener("visibilitychange", verifyOnFocus);
    return () => {
      active = false;
      auth.subscription.unsubscribe();
      window.removeEventListener("focus", verifyOnFocus);
      document.removeEventListener("visibilitychange", verifyOnFocus);
      node?.close();
    };
  }, [open, id, locale, en]);
  async function send(target: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const run = generation.current;
    try {
      const api = createClient();
      const {
        data: { user },
      } = await api.auth.getUser();
      if (run !== generation.current || !user || user.id !== actor.current) {
        setError(
          en
            ? "Account changed. Reopen sharing."
            : "החשבון השתנה. פתחו שוב את השיתוף.",
        );
        return;
      }
      if (pending.current?.target !== target)
        pending.current = {
          target,
          key: crypto.randomUUID(),
          actorId: user.id,
        };
      setRetryTarget(target);
      const { error: sendError } = await api.rpc("send_listing_card", {
        p_conversation_id: target,
        p_listing_id: id,
        p_request_key: pending.current.key,
      });
      if (run !== generation.current) return;
      if (sendError) {
        setError(
          en
            ? "Could not confirm delivery. Retry the same chat; the apartment may no longer be available."
            : "לא ניתן לאשר שהשיתוף נשלח. נסו שוב לאותה שיחה; ייתכן שהדירה כבר אינה זמינה.",
        );
        return;
      }
      pending.current = null;
      setRetryTarget(null);
      setSent(target);
      setNotice(en ? "Apartment sent." : "הדירה נשלחה.");
    } catch {
      if (run === generation.current)
        setError(
          en
            ? "Connection lost. Retry the same chat."
            : "החיבור נותק. נסו שוב לאותה שיחה.",
        );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="inline-block" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => {
          actor.current = null;
          setLoading(true);
          setError("");
          setNotice("");
          setSent(null);
          setTargets([]);
          setGuest(false);
          setRetryTarget(pending.current?.target ?? null);
          setUrl(
            new URL(publicListingPath(id, locale), window.location.origin).href,
          );
          setOpen(true);
        }}
        aria-label={en ? "Share apartment" : "שיתוף דירה"}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-card-border bg-white px-3 py-2 text-sm text-teal hover:bg-teal-soft"
      >
        <Share2 size={16} />
        {en ? "Share" : "שיתוף"}
      </button>
      {open && (
        <dialog
          ref={dialog}
          aria-label={en ? "Share apartment" : "שיתוף דירה"}
          onCancel={(event) => {
            event.preventDefault();
            if (!busyRef.current) setOpen(false);
          }}
          className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-card-border bg-white p-5 text-ink shadow-xl backdrop:bg-black/40"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">
              {en ? "Share apartment" : "שיתוף דירה"}
            </h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-xl border px-3 py-2"
            >
              {en ? "Close" : "סגירה"}
            </button>
          </div>
          <p className="mb-2 text-sm text-muted-text">
            {en
              ? "Anyone with this link can view the public apartment details. The exact address stays private."
              : "כל מי שיקבל את הקישור יוכל לצפות בפרטי הדירה הציבוריים. הכתובת המדויקת נשארת פרטית."}
          </p>
          <label className="block text-sm">
            {en ? "Apartment link" : "קישור לדירה"}
            <input
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
              className="mt-1 w-full rounded-xl border border-card-border p-3 text-sm"
              dir="ltr"
            />
          </label>
          <button
            type="button"
            className="my-3 rounded-xl bg-teal px-4 py-2 text-white"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setNotice(en ? "Link copied." : "הקישור הועתק.");
              } catch {
                setError(
                  en
                    ? "Select and copy the link above."
                    : "סמנו והעתיקו את הקישור שלמעלה.",
                );
              }
            }}
          >
            {en ? "Copy link" : "העתקת קישור"}
          </button>
          <h3 className="mb-2 font-semibold">
            {en ? "Send in Shutaf" : "שליחה בתוך Shutaf"}
          </h3>
          {loading && (
            <p role="status">{en ? "Loading chats…" : "טוענים שיחות…"}</p>
          )}
          {guest && (
            <Link
              className="text-teal underline"
              href={`${locale === "en" ? "/en" : ""}/login?returnTo=${encodeURIComponent(publicListingPath(id, locale))}`}
            >
              {en ? "Sign in to share in a chat" : "התחברו לשיתוף בתוך צ׳אט"}
            </Link>
          )}
          {!loading && !guest && !error && targets.length === 0 && (
            <p className="text-sm text-muted-text">
              {en
                ? "No accepted chats yet. A personal or group chat must be accepted before sharing."
                : "אין עדיין שיחות מאושרות. אפשר לשתף בשיחה אישית או קבוצתית לאחר אישור ההצטרפות."}
            </p>
          )}
          <ul className="space-y-2">
            {targets.map((target) => (
              <li key={target.conversation_id}>
                <button
                  type="button"
                  disabled={
                    busy ||
                    sent === target.conversation_id ||
                    (retryTarget !== null &&
                      retryTarget !== target.conversation_id)
                  }
                  onClick={() => void send(target.conversation_id)}
                  data-conversation-id={target.conversation_id}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-card-border p-3 text-start disabled:opacity-50"
                >
                  <span className="min-w-0 break-words">
                    {target.display_name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-text">
                    {target.group_id
                      ? en
                        ? "Group"
                        : "קבוצה"
                      : en
                        ? "Personal"
                        : "אישי"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {notice && (
            <p role="status" className="mt-3 text-teal">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-error">
              {error}
            </p>
          )}
          {sent && (
            <Link
              className="mt-3 inline-block text-teal underline"
              href={`${locale === "en" ? "/en" : ""}/chats/${sent}`}
            >
              {en ? "Open chat" : "פתיחת הצ׳אט"}
            </Link>
          )}
        </dialog>
      )}
    </div>
  );
}
