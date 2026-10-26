import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type CleanupResult = { removed: number; pending: boolean };
type CleanupItem = { objectId: string; objectPath: string };
type RpcResult = { data: unknown; error: unknown };
type CleanupRpc = {
  (name: 'reserve_listing_photo_cleanup', args: { p_limit: number }): PromiseLike<RpcResult>;
  (name: 'finish_listing_photo_cleanup', args: { p_object_id: string; p_error_code: 'STORAGE_RETRY' | null }): PromiseLike<RpcResult>;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function decodeReservation(value: unknown): { items: CleanupItem[]; hasMore: boolean } | null {
  if (!record(value) || value.projectionVersion !== 1 || typeof value.hasMore !== 'boolean'
    || !Array.isArray(value.items) || value.items.length > 8) return null;
  const ids = new Set<string>(), paths = new Set<string>(), items: CleanupItem[] = [];
  for (const item of value.items) {
    if (!record(item) || typeof item.objectId !== 'string' || !uuid.test(item.objectId)
      || typeof item.objectPath !== 'string') return null;
    // Match existing published references, including nested legacy objects.
    // The reservation and Storage policy establish ownership, not the prefix.
    if (item.objectPath.length > 384 || !/^(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_.-]+$/.test(item.objectPath)
      || /[\u0000-\u001f\u007f]/.test(item.objectPath)
      || item.objectPath.split('/').some(part => part === '.' || part === '..')
      || ids.has(item.objectId.toLowerCase()) || paths.has(item.objectPath)) return null;
    ids.add(item.objectId.toLowerCase()); paths.add(item.objectPath);
    items.push({ objectId: item.objectId, objectPath: item.objectPath });
  }
  return { items, hasMore: value.hasMore };
}

/** A bounded best-effort drain. The database owns reservations and proves absence;
 * callers must never turn cleanup failure into a failed, already-saved edit. */
export async function cleanupListingPhotos(
  client: SupabaseClient<Database>, expectedAccountId: string,
): Promise<CleanupResult> {
  let removed = 0, pending = false;
  // Bridge only these new RPC signatures until generated Database types include
  // them. Every response still passes the runtime projection checks below.
  const rpc = client.rpc.bind(client) as unknown as CleanupRpc;
  const sameActor = async () => {
    try {
      const result = await client.auth.getUser();
      return !result.error && result.data.user?.id === expectedAccountId;
    } catch { return false; }
  };
  // Recheck even a thrown/lost response before making any subsequent request.
  const checked = async <T>(operation: () => PromiseLike<T>) => {
    if (!await sameActor()) return { actorMatches: false };
    let result: T | undefined;
    try { result = await operation(); } catch { /* Durable reservation remains. */ }
    return { actorMatches: await sameActor(), result };
  };
  try {
    if (!uuid.test(expectedAccountId)) return { removed, pending: true };
    const reserved = await checked(() => rpc('reserve_listing_photo_cleanup', { p_limit: 8 }));
    if (!reserved.actorMatches || !reserved.result || reserved.result.error !== null) return { removed, pending: true };
    const reservation = decodeReservation(reserved.result.data);
    if (!reservation) return { removed, pending: true };
    pending = reservation.hasMore;
    for (const item of reservation.items) {
      const deletion = await checked(() => client.storage.from('apartment-photos').remove([item.objectPath]));
      if (!deletion.actorMatches) return { removed, pending: true };
      const storageSucceeded = deletion.result?.error === null && Array.isArray(deletion.result.data);
      const finished = await checked(() => rpc('finish_listing_photo_cleanup', {
        p_object_id: item.objectId, p_error_code: storageSucceeded ? null : 'STORAGE_RETRY',
      }));
      if (!finished.actorMatches) return { removed, pending: true };
      if (finished.result?.error === null && record(finished.result.data) && finished.result.data.completed === true) removed++;
      else pending = true;
    }
    return { removed, pending };
  } catch { return { removed, pending: true }; }
}
