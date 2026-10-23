import type { DraftDocument, DraftResult } from './draft-service-contract';
import type { ListingDraftFields } from './draft-types';
import type { DraftMediaErrorCode, DraftMediaItem, DraftMediaSaveResult } from './draft-media-contract';

export type DraftSaveState = { phase: 'saved' | 'dirty' | 'saving' | 'error' | 'conflict'; error?: DraftMediaErrorCode };
type Write = (id: string, revision: number, fields: ListingDraftFields) => Promise<DraftResult<DraftDocument>>;
type Snapshot = { fields: ListingDraftFields; media?: readonly DraftMediaItem[] };
type Options = {
  writeMedia?: (draft: DraftDocument, media: readonly DraftMediaItem[]) => Promise<DraftMediaSaveResult>;
  acknowledged?: (draft: DraftDocument) => void;
};

// Fields and media share one revision and one in-flight mutation chain.
export function createDraftSaveQueue(initial: DraftDocument, write: Write, notify: (state: DraftSaveState) => void, options: Options = {}) {
  let current = initial, active = true, pending: Snapshot | null = null;
  let failure: DraftMediaErrorCode | undefined, running: Promise<boolean> | null = null;
  let lastOffered: string | undefined;
  const fieldsKey = (fields: unknown) => JSON.stringify(fields, (_key, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value);
  const knownUploads = new Map<string, string>();
  const objectPath = (objectId: string) => `${initial.ownerId}/${initial.id}/${objectId.toLowerCase()}.jpg`;
  function normalized(media: readonly DraftMediaItem[]): DraftMediaItem[] {
    return media.map(item => {
      if (item.kind !== 'upload') return item;
      const path = objectPath(item.objectId);
      return knownUploads.get(path) === item.digest
        ? current.photos.find(photo => photo.kind === 'draft' && photo.objectPath === path) ?? item : item;
    });
  }
  function offer(fields: ListingDraftFields, media?: readonly DraftMediaItem[]) {
    if (!active) return;
    const fieldsJSON = JSON.stringify(fields);
    const encoded = fieldsKey(fields) + JSON.stringify(media?.map(item => item.kind === 'upload'
      ? { kind: item.kind, objectId: item.objectId, digest: item.digest } : item));
    if (encoded === lastOffered) return;
    lastOffered = encoded;
    pending = { fields: JSON.parse(fieldsJSON) as ListingDraftFields, ...(media ? { media: media.map(item => ({ ...item })) } : {}) };
    notify(failure ? { phase: failure === 'VERSION_CONFLICT' ? 'conflict' : 'error', error: failure } : { phase: 'dirty' });
  }
  function acknowledge(document: DraftDocument): boolean {
    if (document.id !== initial.id || document.ownerId !== initial.ownerId || document.revision <= current.revision) return false;
    current = document; options.acknowledged?.(current); return true;
  }
  function reject(code: DraftMediaErrorCode, work: Snapshot) {
    pending ??= work; failure = code;
    notify({ phase: code === 'VERSION_CONFLICT' ? 'conflict' : 'error', error: code });
  }
  async function drain(): Promise<boolean> {
    while (active && pending && !failure) {
      const work = pending; pending = null; notify({ phase: 'saving' });
      try {
        if (fieldsKey(work.fields) !== fieldsKey(current.fields)) {
          const result = await write(initial.id, current.revision, work.fields);
          if (!active) return false;
          if (!result.ok) { reject(result.error.code, work); return false; }
          if (!acknowledge(result.data)) { reject('STATE_UNAVAILABLE', work); return false; }
        }
        if (work.media) {
          const selection = normalized(work.media);
          if (JSON.stringify(selection.map(item => item.kind === 'upload' ? null : item)) !== JSON.stringify(current.photos)) {
            if (!options.writeMedia) { reject('STATE_UNAVAILABLE', work); return false; }
            const result = await options.writeMedia(current, selection);
            if (!active) return false;
            if (!result.ok) { reject(result.error.code, work); return false; }
            if (!acknowledge(result.data)) { reject('STATE_UNAVAILABLE', work); return false; }
            for (const item of work.media) if (item.kind === 'upload') knownUploads.set(objectPath(item.objectId), item.digest);
          }
        }
      } catch { if (active) reject('INTERNAL', work); return false; }
    }
    if (active && !failure) notify({ phase: 'saved' });
    return active && !failure;
  }
  function flush(): Promise<boolean> {
    if (!active || failure) return Promise.resolve(false);
    if (running) return running;
    running = drain().finally(() => { running = null; }); return running;
  }
  return {
    offer, flush,
    retry: () => { if (failure === 'VERSION_CONFLICT' || failure === 'NOT_FOUND' || failure === 'STATE_UNAVAILABLE' || failure === 'PHOTO_CONFLICT') return Promise.resolve(false); failure = undefined; return flush(); },
    stop: () => { active = false; pending = null; knownUploads.clear(); },
  };
}
