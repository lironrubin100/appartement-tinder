'use client';

import { createClient } from '@/utils/supabase/client';
import { beginListingCloudDraftDeletion, cleanupListingCloudDraftDeletionPage, finishListingCloudDraftDeletion } from './draft-delete-actions';
import type { DraftResult } from './draft-service-contract';

// Keep the confirmed id/revision and captured actor across every page and await.
export async function deleteListingCloudDraft(id: string, revision: number, accountId: string): Promise<DraftResult<null>> {
  const client = createClient();
  const sameActor = async () => { try { const auth = await client.auth.getUser(); return !auth.error && auth.data.user?.id === accountId; } catch { return false; } };
  const authChanged = (): DraftResult<null> => ({ ok: false, error: { code: 'AUTH_REQUIRED', retryable: false } });
  try {
    if (!await sameActor()) return authChanged();
    const begun = await beginListingCloudDraftDeletion(id, revision, accountId);
    if (!await sameActor()) return authChanged();
    if (!begun.ok) return begun;
    if (begun.data.completed) return { ok: true, data: null };
    let cursor: string | null = null;
    do {
      if (!await sameActor()) return authChanged();
      const page = await cleanupListingCloudDraftDeletionPage(id, accountId, cursor);
      if (!await sameActor()) return authChanged();
      if (!page.ok) return page;
      cursor = page.data.nextCursor;
    } while (cursor !== null);
    if (!await sameActor()) return authChanged();
    const finished = await finishListingCloudDraftDeletion(id, begun.data.revision, accountId);
    return await sameActor() ? finished : authChanged();
  } catch { return { ok: false, error: { code: 'CLEANUP_PENDING', retryable: true } }; }
}
