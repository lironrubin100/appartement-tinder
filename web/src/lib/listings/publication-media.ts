import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function photoDigest(photo: Blob): Promise<string> {
  return createHash("sha256")
    .update(Buffer.from(await photo.arrayBuffer()))
    .digest("hex");
}

/** Both new publication and owned edits use immutable request/index objects.
 * A lost upload acknowledgement may only reuse independently verified bytes. */
export async function stageListingPhoto(
  client: SupabaseClient<Database>,
  requestKey: string,
  index: number,
  photo: Blob,
) {
  const path = `${requestKey}/${index + 1}.jpg`,
    digest = await photoDigest(photo);
  const uploaded = await client.storage
    .from("apartment-photos")
    .upload(path, photo, { contentType: "image/jpeg", upsert: false });
  const existing = await client.storage
    .from("apartment-photos")
    .download(path, { cacheNonce: randomUUID() }, { cache: "no-store" });
  if (existing.error || !existing.data)
    throw uploaded.error ?? existing.error ?? Error("PHOTO_UNAVAILABLE");
  if ((await photoDigest(existing.data)) !== digest)
    throw Error("PHOTO_SNAPSHOT_CONFLICT");
  return {
    path,
    digest,
    url: client.storage.from("apartment-photos").getPublicUrl(path).data
      .publicUrl,
  };
}
