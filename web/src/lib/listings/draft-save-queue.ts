import type { DraftDocument, DraftErrorCode, DraftResult } from './draft-service-contract';
import type { ListingDraftFields } from './draft-types';

export type DraftSaveState = { phase: 'saved' | 'dirty' | 'saving' | 'error' | 'conflict'; error?: DraftErrorCode };
type Write = (id: string, revision: number, fields: ListingDraftFields) => Promise<DraftResult<DraftDocument>>;

// One in-flight write. Coalesce pending snapshots, never merge stale revisions.
export function createDraftSaveQueue(initial: DraftDocument, write: Write, notify: (state: DraftSaveState) => void) {
  let revision = initial.revision, active = true, pending: ListingDraftFields | null = null;
  let failure: DraftErrorCode | undefined, running: Promise<boolean> | null = null;
  let lastOffered: string | undefined;
  function offer(fields: ListingDraftFields) {
    if (!active) return;
    const encoded = JSON.stringify(fields);
    if (encoded === lastOffered) return;
    lastOffered = encoded; pending = JSON.parse(encoded) as ListingDraftFields;
    notify(failure ? { phase: failure === 'VERSION_CONFLICT' ? 'conflict' : 'error', error: failure } : { phase: 'dirty' });
  }
  async function drain(): Promise<boolean> {
    while (active && pending && !failure) {
      const fields = pending; pending = null;
      notify({ phase: 'saving' });
      let result: DraftResult<DraftDocument>;
      try { result = await write(initial.id, revision, fields); }
      catch { result = { ok: false, error: { code: 'INTERNAL', retryable: true } }; }
      if (!active) return false;
      if (!result.ok) {
        pending ??= fields; failure = result.error.code;
        notify({ phase: failure === 'VERSION_CONFLICT' ? 'conflict' : 'error', error: failure });
        return false;
      }
      if (result.data.id !== initial.id || result.data.ownerId !== initial.ownerId || result.data.revision <= revision) {
        pending ??= fields; failure = 'STATE_UNAVAILABLE'; notify({ phase: 'error', error: failure }); return false;
      }
      revision = result.data.revision;
    }
    if (active && !failure) notify({ phase: 'saved' });
    return active && !failure;
  }
  function flush(): Promise<boolean> {
    if (!active || failure) return Promise.resolve(false);
    if (running) return running;
    running = drain().finally(() => { running = null; });
    return running;
  }
  return {
    offer, flush,
    retry: () => { if (failure === 'VERSION_CONFLICT' || failure === 'NOT_FOUND' || failure === 'STATE_UNAVAILABLE') return Promise.resolve(false); failure = undefined; return flush(); },
    stop: () => { active = false; pending = null; },
  };
}
