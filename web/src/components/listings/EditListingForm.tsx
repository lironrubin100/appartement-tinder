"use client";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ComposeForm, {
  type ComposeFormHandle,
} from "@/app/(main)/compose/ComposeForm";
import {
  openListingEditCloudDraft,
  loadListingCloudDraft,
} from "@/lib/listings/draft-actions";
import { loadOwnedListingForEdit } from "@/app/(main)/my-listings/actions";
import type { DraftDocument } from "@/lib/listings/draft-service-contract";
import type { ListingEditContext } from "@/lib/listings/edit-draft-fields";
import { createClient } from "@/utils/supabase/client";
import { localePrefix, type Locale } from "@/lib/listings/text";
import { PrivateDraftContent } from "./PrivateDraftContent";
import { refreshListingCloudDraftSource } from '@/lib/listings/draft-edit-publish';
type Props = {
  ref?: Ref<ComposeFormHandle>;
  accountId: string;
  locale: Locale;
  listingId?: string;
  draft?: DraftDocument;
  onClose?: () => void;
};
/** One authenticated entry for the dashboard, saved draft URL and Plus overlay. */
export function EditListingForm(props: Props) {
  return (
    <PrivateDraftContent
      accountId={props.accountId}
      locale={props.locale}
      preserveInput
    >
      <EditListingSession {...props} />
    </PrivateDraftContent>
  );
}
function EditListingSession({
  ref,
  accountId,
  locale,
  listingId,
  draft,
  onClose,
}: Props) {
  const router = useRouter(),
    editor = useRef<ComposeFormHandle>(null),
    receipt = useRef<string | null>(null);
  const [initialDraft] = useState(draft);
  const [selected, setSelected] = useState(draft),
    [context, setContext] = useState<ListingEditContext | null>(null);
  const [phase, setPhase] = useState<
      "loading" | "ready" | "retry" | "unavailable"
    >("loading"),
    [attempt, setAttempt] = useState(0);
  const active = useRef(false),
    busy = useRef(false);
  const en = locale === "en";
  const selectedId = initialDraft?.id,
    sourceId =
      initialDraft?.kind === "edit" ? initialDraft.sourceListingId : listingId;
  useEffect(() => {
    active.current = true;
    let current = true;
    void (async () => {
      busy.current = true;
      try {
        const client = createClient();
        const actor = async () => {
          const auth = await client.auth.getUser();
          return current && !auth.error && auth.data.user?.id === accountId;
        };
        if (!sourceId) {
          if (current) setPhase("unavailable");
          return;
        }
        if (!(await actor())) {
          if (current) setPhase("retry");
          return;
        }
        if (!selectedId) {
          receipt.current ??= crypto.randomUUID();
          const result = await openListingEditCloudDraft({
            listingId: sourceId,
            requestKey: receipt.current,
            expectedAccountId: accountId,
          });
          if (!(await actor())) {
            if (current) setPhase("retry");
            return;
          }
          if (!result.ok) {
            setPhase(
              ["NOT_FOUND", "STATE_UNAVAILABLE", "VALIDATION_FAILED"].includes(
                result.error.code,
              )
                ? "unavailable"
                : "retry",
            );
            return;
          }
          router.replace(
            localePrefix(locale) + "/compose?draft=" + result.data.id,
          );
          return;
        }
        const source = await loadOwnedListingForEdit(sourceId, accountId);
        if (!(await actor())) {
          if (current) setPhase("retry");
          return;
        }
        if (!source.ok) {
          setPhase(
            ["NOT_FOUND", "STATE_UNAVAILABLE", "VALIDATION_FAILED"].includes(
              source.error.code,
            )
              ? "unavailable"
              : "retry",
          );
          return;
        }
        // Never seed over an older or incompatible private edit on hydration.
        if (
          initialDraft?.kind !== "edit" ||
          initialDraft.ownerId !== accountId ||
          !['open','completed'].includes(initialDraft.state) ||
          !initialDraft.fields.rooms ||
          typeof initialDraft.fields.isSublet !== "boolean"
        ) {
          setPhase("unavailable");
          return;
        }
        setContext({
          listingId: sourceId,
          originalRevision: initialDraft.sourceRevision,
          currentRevision: source.data.revision,
          address: source.data.location.address,
          status: source.data.status,
        });
        setPhase("ready");
      } catch {
        if (current) setPhase("retry");
      } finally {
        if (current) busy.current = false;
      }
    })();
    return () => {
      current = false;
      active.current = false;
    };
  }, [accountId, sourceId, selectedId, initialDraft, locale, attempt, router]);
  const close = () => {
    if (onClose) onClose();
    else router.push(localePrefix(locale) + "/my-listings");
  };
  useImperativeHandle(ref, () => ({
    saveAndClose: async () => {
      if (editor.current) await editor.current.saveAndClose();
      else if (!busy.current) close();
    },
  }));
  const reload = async () => {
    if (!selected || busy.current || !active.current) return false;
    busy.current = true;
    try {
      const client = createClient();
      if (
        (await client.auth.getUser()).data.user?.id !== accountId ||
        !active.current
      )
        return false;
      if (!sourceId) return false;
      const [result, source] = await Promise.all([
        loadListingCloudDraft(selected.id),
        loadOwnedListingForEdit(sourceId, accountId),
      ]);
      if (
        (await client.auth.getUser()).data.user?.id !== accountId ||
        !active.current ||
        !result.ok ||
        !source.ok ||
        result.data.kind !== "edit" ||
        result.data.sourceListingId !== sourceId ||
        result.data.state !== "open" ||
        result.data.publicationStartedAt ||
        !result.data.fields.rooms ||
        typeof result.data.fields.isSublet !== "boolean"
      )
        return false;
      setContext({
        listingId: sourceId,
        originalRevision: result.data.sourceRevision,
        currentRevision: source.data.revision,
        address: source.data.location.address,
        status: source.data.status,
      });
      setSelected(result.data);
      return true;
    } catch {
      return false;
    } finally {
      busy.current = false;
    }
  };
  if (phase === "ready" && selected && context)
    return (
      <ComposeForm
        key={selected.id + ":" + selected.revision}
        ref={editor}
        accountId={accountId}
        cloudDraft={selected}
        editContext={context}
        locale={locale}
        requiresPrivatePhone={false}
        hasPrivatePhone={true}
        onClose={close}
        onReloadSaved={reload}
        onRefreshSource={async revision => {
          if (!active.current || busy.current || !selected) return false;
          busy.current = true;
          try {
            const client = createClient();
            if ((await client.auth.getUser()).data.user?.id !== accountId || !active.current) return false;
            const result = await refreshListingCloudDraftSource({id:selected.id,expectedRevision:revision,expectedAccountId:accountId});
            if (!result.ok || !active.current) return false;
            const source = await loadOwnedListingForEdit(result.data.sourceListingId!,accountId);
            if (!source.ok || (await client.auth.getUser()).data.user?.id !== accountId || !active.current || result.data.kind !== 'edit') return false;
            setContext({listingId:result.data.sourceListingId,originalRevision:result.data.sourceRevision,currentRevision:source.data.revision,address:source.data.location.address,status:source.data.status});
            setSelected(result.data);
            return true;
          } finally {busy.current = false;}
        }}
      />
    );
  return (
    <section className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-ink">
        {en ? "Edit listing" : "עריכת מודעה"}
      </h1>
      <p role={phase === "loading" ? "status" : "alert"}>
        {phase === "loading"
          ? en
            ? "Opening your private edit draft…"
            : "פותחים את טיוטת העריכה הפרטית…"
          : phase === "retry"
            ? en
              ? "Could not open your edit draft. Please retry."
              : "לא הצלחנו לפתוח את טיוטת העריכה. נסו שוב."
            : en
              ? "This edit is unavailable. Any saved draft is kept unchanged."
              : "העריכה אינה זמינה. טיוטה שנשמרה נשארת ללא שינוי."}
      </p>
      {phase === "retry" && (
        <button
          className="rounded-xl border border-card-border px-4 py-3 text-teal"
          onClick={() => {
            setPhase("loading");
            setAttempt((value) => value + 1);
          }}
        >
          {en ? "Try again" : "ניסיון נוסף"}
        </button>
      )}
      {onClose ? (
        <button
          className="rounded-xl px-4 py-3 text-teal"
          onClick={() => {
            if (!busy.current) onClose();
          }}
        >
          {en ? "Close" : "סגירה"}
        </button>
      ) : (
        <Link
          href={localePrefix(locale) + "/my-listings"}
          className="inline-block px-4 py-3 text-teal underline"
        >
          {en ? "My listings" : "המודעות שלי"}
        </Link>
      )}
    </section>
  );
}
