"use server";

import { isDeepStrictEqual } from "node:util";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/utils/supabase/server";
import {
  decodeDraft,
  draftColumns,
  isId,
  isRevision,
  type DraftDocument,
} from "./draft-service-contract";
import {
  DRAFT_MEDIA_BUCKET,
  DRAFT_MEDIA_MAX_BYTES,
} from "./draft-media-contract";
import {
  listingEditModel,
  validateListingPhotos,
} from "./edit-publication-model";
import { photoDigest, stageListingPhoto } from "./publication-media";
import { cleanupListingPhotos } from "./photo-cleanup";
import type {
  DraftPublishInput,
  DraftPublishResult,
  DraftPublicationCancellation,
} from "./draft-publish";

type Input = Omit<DraftPublishInput, "providerToken">;
const fail = (
  code: Extract<DraftPublishResult, { ok: false }>["error"]["code"],
  retryable = false,
): Extract<DraftPublishResult, { ok: false }> => ({
  ok: false,
  error: { code, retryable },
});
const valid = (v: Input) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((key) =>
    ["id", "expectedRevision", "expectedAccountId"].includes(key),
  ) &&
  isId(v.id) &&
  isRevision(v.expectedRevision) &&
  isId(v.expectedAccountId);
function rpcError(message: string): Extract<DraftPublishResult, { ok: false }> {
  if (message === "AUTH_REQUIRED") return fail("AUTH_REQUIRED");
  if (["DRAFT_NOT_FOUND", "SOURCE_UNAVAILABLE"].includes(message))
    return fail("NOT_FOUND");
  if (message === "DRAFT_CONFLICT") return fail("VERSION_CONFLICT");
  if (["VERSION_CONFLICT", "ROOM_INVENTORY_CHANGED"].includes(message))
    return fail("SOURCE_CONFLICT");
  if (message === "VALIDATION_FAILED") return fail("VALIDATION_FAILED");
  if (message === "INVALID_PHOTOS") return fail("PHOTO_UNAVAILABLE", true);
  if (message === "EDIT_PENDING") return fail("PUBLICATION_PENDING", true);
  if (message === "PUBLICATION_NOT_STARTED")
    return fail("PUBLICATION_NOT_STARTED");
  if (
    [
      "DRAFT_UNAVAILABLE",
      "DRAFT_CLOSED",
      "PUBLICATION_SNAPSHOT_CONFLICT",
      "PUBLICATION_SNAPSHOT_UNKNOWN",
    ].includes(message)
  )
    return fail("STATE_UNAVAILABLE");
  return fail("PUBLICATION_UNCERTAIN", true);
}
function completion(value: unknown, draft: DraftDocument): DraftPublishResult {
  if (
    !value ||
    typeof value !== "object" ||
    !("draft" in value) ||
    !("receipt" in value)
  )
    return fail("PUBLICATION_UNCERTAIN", true);
  const completed = decodeDraft(
    value.draft as Parameters<typeof decodeDraft>[0],
    draft.ownerId,
  );
  const receipt = value.receipt as Record<string, unknown>;
  if (
    draft.kind !== "edit" ||
    completed.kind !== "edit" ||
    completed.id !== draft.id ||
    completed.revision !== draft.revision ||
    completed.state !== "completed" ||
    completed.sourceListingId !== draft.sourceListingId ||
    completed.sourceRevision !== draft.sourceRevision ||
    completed.publicationRequestId !== draft.publicationRequestId ||
    !completed.publicationStartedAt ||
    !isDeepStrictEqual(completed.fields, draft.fields) ||
    !isDeepStrictEqual(completed.photos, draft.photos) ||
    receipt.listingId !== draft.sourceListingId ||
    receipt.requestKey !== draft.publicationRequestId ||
    receipt.revision !== draft.sourceRevision + 1
  )
    return fail("PUBLICATION_UNCERTAIN", true);
  return {
    ok: true,
    data: {
      draftId: draft.id,
      listingId: draft.sourceListingId,
      requestKey: draft.publicationRequestId!,
      revision: draft.revision,
      completed: true,
    },
  };
}
async function run(
  input: Input,
  reconcileOnly: boolean,
): Promise<DraftPublishResult> {
  try {
    if (!valid(input)) return fail("VALIDATION_FAILED");
    const client = await createServerClient({ noStore: true });
    const actor = async () => {
      const r = await client.auth.getUser();
      return !r.error && r.data.user?.id === input.expectedAccountId;
    };
    if (!(await actor())) return fail("AUTH_REQUIRED");
    const loaded = await client
      .from("listing_drafts")
      .select(draftColumns)
      .eq("id", input.id)
      .eq("owner_id", input.expectedAccountId)
      .maybeSingle();
    if (!(await actor())) return fail("AUTH_REQUIRED");
    if (loaded.error) return fail("INTERNAL", true);
    if (!loaded.data) return fail("NOT_FOUND");
    const draft = decodeDraft(loaded.data, input.expectedAccountId);
    if (draft.revision !== input.expectedRevision)
      return fail("VERSION_CONFLICT");
    if (
      draft.kind !== "edit" ||
      draft.state === "deleting" ||
      !draft.publicationRequestId
    )
      return fail("STATE_UNAVAILABLE");
    const args = { p_draft_id: draft.id, p_expected_revision: draft.revision };
    const finish = async (value: unknown): Promise<DraftPublishResult> => {
      const result = completion(value, draft);
      if (result.ok) {
        // The commit and its durable cleanup candidates already succeeded.
        // Storage failure must not turn a saved edit into an uncertain publish.
        try { await cleanupListingPhotos(client, input.expectedAccountId); } catch { /* Retry record remains server-owned. */ }
        for (const path of [
          "/my-listings", "/en/my-listings", "/map", "/en/map",
          `/listings/${draft.sourceListingId}`, `/en/listings/${draft.sourceListingId}`,
        ]) revalidatePath(path);
      }
      return result;
    };
    const reconcile = async (): Promise<DraftPublishResult> => {
      const r = await client.rpc("commit_listing_draft_edit", {
        ...args,
        p_reconcile_only: true,
      });
      if (!(await actor())) return fail("AUTH_REQUIRED");
      return r.error ? rpcError(r.error.message) : finish(r.data);
    };
    if (draft.publicationStartedAt || draft.state === "completed") {
      const previous = await reconcile();
      if (
        previous.ok ||
        previous.error.code !== "PUBLICATION_PENDING" ||
        reconcileOnly
      )
        return previous;
    } else if (reconcileOnly) return fail("PUBLICATION_NOT_STARTED");
    const model = listingEditModel(
      draft.fields,
      draft.photos,
      draft.publicationRequestId,
    );
    if (!model) return fail("VALIDATION_FAILED");
    if (
      draft.photos.some(
        (photo) =>
          photo.kind === "draft" &&
          (!photo.objectPath.startsWith(`${draft.ownerId}/${draft.id}/`) ||
            !photo.objectPath.endsWith(".jpg")),
      )
    )
      return fail("PHOTO_UNAVAILABLE");
    if (!(await actor())) return fail("AUTH_REQUIRED");
    // Independent immutable reads are bounded by the existing eight-photo
    // contract. Recheck identity after the whole batch, before freeze or writes.
    const reads = await Promise.all(
      draft.photos.map(async (photo, index) => {
        const privatePhoto = photo.kind === "draft";
        const r = await client.storage
          .from(privatePhoto ? DRAFT_MEDIA_BUCKET : "apartment-photos")
          .download(
            photo.objectPath,
            { cacheNonce: randomUUID() },
            { cache: "no-store" },
          );
        if (
          r.error ||
          !r.data ||
          !r.data.type.startsWith("image/") ||
          r.data.size <= 0 ||
          (privatePhoto &&
            (r.data.type !== "image/jpeg" ||
              r.data.size > DRAFT_MEDIA_MAX_BYTES))
        )
          return null;
        const file = new File(
          [await r.data.arrayBuffer()],
          `${index + 1}.jpg`,
          {
            type: r.data.type,
          },
        );
        return { file, digest: await photoDigest(file) };
      }),
    );
    if (!(await actor())) return fail("AUTH_REQUIRED");
    if (reads.some((result) => !result)) return fail("PHOTO_UNAVAILABLE", true);
    const verified = reads as { file: File; digest: string }[];
    const files = verified.map((result) => result.file),
      digests = verified.map((result) => result.digest);
    if (validateListingPhotos(files)) return fail("VALIDATION_FAILED");
    if (!(await actor())) return fail("AUTH_REQUIRED");
    const frozen = await client.rpc("begin_listing_draft_edit", {
      ...args,
      p_photo_digests: digests,
    });
    if (!(await actor())) return fail("AUTH_REQUIRED");
    if (frozen.error) {
      if (frozen.error.message === "DRAFT_CLOSED") {
        const recovered = await reconcile();
        if (recovered.ok) return recovered;
      }
      return rpcError(frozen.error.message);
    }
    const bound = frozen.data as { draft?: unknown; model?: unknown } | null;
    if (!bound?.draft || !isDeepStrictEqual(bound.model, model))
      return fail("PUBLICATION_UNCERTAIN", true);
    const snapshot = decodeDraft(
      bound.draft as Parameters<typeof decodeDraft>[0],
      draft.ownerId,
    );
    if (
      snapshot.id !== draft.id ||
      snapshot.revision !== draft.revision ||
      snapshot.publicationRequestId !== draft.publicationRequestId ||
      !snapshot.publicationStartedAt ||
      !isDeepStrictEqual(snapshot.fields, draft.fields) ||
      !isDeepStrictEqual(snapshot.photos, draft.photos)
    )
      return fail("PUBLICATION_UNCERTAIN", true);
    for (const [index, photo] of draft.photos.entries()) {
      if (photo.kind !== "draft") continue;
      if (!(await actor())) return fail("AUTH_REQUIRED");
      const staged = await stageListingPhoto(
        client,
        draft.publicationRequestId,
        index,
        files[index],
      );
      if (!(await actor())) return fail("AUTH_REQUIRED");
      if (staged.digest !== digests[index]) return fail("STATE_UNAVAILABLE");
    }
    if (!(await actor())) return fail("AUTH_REQUIRED");
    const committed = await client.rpc("commit_listing_draft_edit", {
      ...args,
      p_reconcile_only: false,
    });
    if (!(await actor())) return fail("AUTH_REQUIRED");
    if (committed.error) {
      const recovered = await reconcile();
      return recovered.ok ? recovered : rpcError(committed.error.message);
    }
    return finish(committed.data);
  } catch {
    return fail("PUBLICATION_UNCERTAIN", true);
  }
}
export async function saveListingCloudDraftChanges(
  input: Input,
): Promise<DraftPublishResult> {
  return run(input, false);
}
export async function reconcileListingCloudDraftEdit(
  input: Input,
): Promise<DraftPublishResult> {
  return run(input, true);
}
export async function cancelListingCloudDraftEdit(
  input: Input,
): Promise<DraftPublicationCancellation> {
  try {
    if (!valid(input)) return fail("VALIDATION_FAILED");
    const client = await createServerClient({ noStore: true });
    const actor = async () => {
      const r = await client.auth.getUser();
      return !r.error && r.data.user?.id === input.expectedAccountId;
    };
    if (!(await actor())) return fail("AUTH_REQUIRED");
    const result = await client.rpc("cancel_listing_draft_edit", {
      p_draft_id: input.id,
      p_expected_revision: input.expectedRevision,
    });
    if (!(await actor())) return fail("AUTH_REQUIRED");
    if (result.error) {
      if (result.error.message === "PUBLICATION_ALREADY_COMMITTED") {
        const reconciled = await run(input, true);
        return reconciled.ok
          ? {
              ok: true,
              data: { kind: "published", publication: reconciled.data },
            }
          : reconciled;
      }
      return rpcError(result.error.message);
    }
    const draft = decodeDraft(result.data, input.expectedAccountId);
    if (
      draft.kind !== "edit" ||
      draft.id !== input.id ||
      draft.revision !== input.expectedRevision + 1 ||
      draft.publicationStartedAt ||
      draft.state !== "open"
    )
      return fail("PUBLICATION_UNCERTAIN", true);
    return { ok: true, data: { kind: "editable", draft } };
  } catch {
    return fail("PUBLICATION_UNCERTAIN", true);
  }
}
export async function refreshListingCloudDraftSource(input: Input) {
  try {
    if (!valid(input)) return { ok: false as const };
    const client = await createServerClient({ noStore: true });
    if ((await client.auth.getUser()).data.user?.id !== input.expectedAccountId)
      return { ok: false as const };
    const r = await client.rpc("refresh_listing_edit_draft", {
      p_draft_id: input.id,
      p_expected_revision: input.expectedRevision,
    });
    if (
      (await client.auth.getUser()).data.user?.id !== input.expectedAccountId ||
      r.error
    )
      return { ok: false as const };
    const draft = decodeDraft(r.data, input.expectedAccountId);
    return draft.kind === "edit" &&
      draft.id === input.id &&
      draft.state === "open" &&
      !draft.publicationStartedAt &&
      draft.revision === input.expectedRevision + 2
      ? { ok: true as const, data: draft }
      : { ok: false as const };
  } catch {
    return { ok: false as const };
  }
}
