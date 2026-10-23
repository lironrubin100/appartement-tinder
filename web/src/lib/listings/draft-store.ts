import type { AddressSuggestion } from './address-types';
import type { PreparedDraftPhoto } from './draft-media-contract';
import { LISTING_PHOTO_MAX_BYTES } from './validation';

export type SavedAddress = {
  address: string;
  selected: AddressSuggestion | null;
  manual: boolean;
  latitude: string;
  longitude: string;
  city: string;
  confirmed: boolean;
};

export type SavedListingDraft = {
  version: 1;
  localRevision?: string;
  title: string;
  bedrooms: string;
  availableFrom: string;
  billsIncluded: boolean;
  description: string;
  roomPrices: string[];
  photos: File[];
  address: SavedAddress | null;
  requestKey: string | null;
};

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('shutaf-listing-drafts', 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('drafts')) request.result.createObjectStore('drafts');
      if (!request.result.objectStoreNames.contains('imports')) request.result.createObjectStore('imports');
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); if (blocked) request.result.close(); else resolve(request.result); };
    request.onblocked = () => { blocked = true; reject(new Error('Draft database blocked')); };
  });
}

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', mode);
    const request = run(tx.objectStore('drafts'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

// Keep writes and deletion ordered even when opening IndexedDB is delayed.
const pending = new Map<string, Promise<unknown>>();
function serial<T>(accountId: string, operation: () => Promise<T>): Promise<T> {
  const result = (pending.get(accountId) ?? Promise.resolve()).catch(() => undefined).then(operation);
  pending.set(accountId, result);
  void result.finally(() => { if (pending.get(accountId) === result) pending.delete(accountId); }).catch(() => undefined);
  return result;
}
export const loadListingDraft = (accountId: string) => serial(accountId, () => transact<SavedListingDraft | undefined>('readonly', store => store.get(accountId)));
export const saveListingDraft = (accountId: string, draft: SavedListingDraft) => serial(accountId, () => transact<IDBValidKey>('readwrite', store => store.put({ ...draft, localRevision: crypto.randomUUID() }, accountId)));
export const removeListingDraft = (accountId: string) => serial(accountId, () => transact<undefined>('readwrite', store => store.delete(accountId)));


export type LegacyImportReceipt = {
  version: 1; accountId: string; fingerprint: string; requestKey: string;
  objectIds: string[]; digests: string[]; snapshot: SavedListingDraft | null;
  prepared: PreparedDraftPhoto[] | null; cloudDraftId: string | null; verified: boolean;
};
export type LegacyImportTicket = { receipt: LegacyImportReceipt; source: SavedListingDraft | null; sourceRevision: string | null };
const importKey = (accountId: string, fingerprint: string) => `${accountId}:${fingerprint}`;

// Only synchronous IndexedDB callbacks run inside this transaction. Hashing,
// compression, auth and network operations happen outside its lifetime.
async function atomic<T>(stores: string[], run: (tx: IDBTransaction, done: (result: T) => void, guard: (work: () => void) => void) => void): Promise<T> {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite');
    let value: T; let cause: unknown;
    const guard = (work: () => void) => { try { work(); } catch (error) { cause = error; tx.abort(); } };
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = tx.onabort = () => { db.close(); reject(cause ?? tx.error ?? new Error('Local import transaction failed')); };
    guard(() => run(tx, result => { value = result; }, guard));
  });
}
async function sourceFingerprint(source: SavedListingDraft): Promise<string> {
  if (source.version !== 1 || !Array.isArray(source.photos) || source.photos.length > 8 || source.photos.some(photo => !(photo instanceof File) || !photo.type.startsWith('image/') || photo.size <= 0 || photo.size > LISTING_PHOTO_MAX_BYTES)) throw new Error('INVALID_LOCAL_DRAFT');
  const hashes = await Promise.all(source.photos.map(async photo => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await photo.arrayBuffer())), byte => byte.toString(16).padStart(2, '0')).join('')));
  const content = JSON.stringify({ title: source.title, bedrooms: source.bedrooms, availableFrom: source.availableFrom,
    billsIncluded: source.billsIncluded, description: source.description, roomPrices: source.roomPrices, address: source.address,
    requestKey: source.requestKey, photos: source.photos.map((photo, index) => ({ name: photo.name, type: photo.type, size: photo.size, lastModified: photo.lastModified, hash: hashes[index] })) });
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export const claimLegacyDraftImport = (accountId: string) => serial(accountId, async (): Promise<LegacyImportTicket | null> => {
  const source = await atomic<SavedListingDraft | undefined>(['drafts'], (tx, done, guard) => {
    const store = tx.objectStore('drafts'), read = store.get(accountId);
    read.onsuccess = () => guard(() => {
      const draft = read.result as SavedListingDraft | undefined;
      if (draft && !draft.localRevision) { draft.localRevision = crypto.randomUUID(); store.put(draft, accountId); }
      done(draft);
    });
  });
  if (!source) return atomic<LegacyImportTicket | null>(['imports'], (tx, done, guard) => {
    const store = tx.objectStore('imports'), last = store.get(`last:${accountId}`);
    last.onsuccess = () => guard(() => {
      if (typeof last.result !== 'string') { done(null); return; }
      const read = store.get(last.result);
      read.onsuccess = () => guard(() => { const receipt = read.result as LegacyImportReceipt | undefined; done(receipt?.accountId === accountId && receipt.verified ? { receipt, source: null, sourceRevision: null } : null); });
    });
  });
  const fingerprint = await sourceFingerprint(source), key = importKey(accountId, fingerprint);
  return atomic<LegacyImportTicket>(['drafts', 'imports'], (tx, done, guard) => {
    const current = tx.objectStore('drafts').get(accountId);
    current.onsuccess = () => guard(() => {
      if (current.result?.localRevision !== source.localRevision) throw new Error('LOCAL_SOURCE_CHANGED');
      const store = tx.objectStore('imports'), read = store.get(key);
      read.onsuccess = () => guard(() => {
        const receipt: LegacyImportReceipt = read.result ?? { version: 1, accountId, fingerprint, requestKey: crypto.randomUUID(), objectIds: source.photos.map(() => crypto.randomUUID()), digests: [], snapshot: source, prepared: null, cloudDraftId: null, verified: false };
        if (receipt.accountId !== accountId || receipt.fingerprint !== fingerprint || receipt.version !== 1) throw new Error('INVALID_LOCAL_DRAFT');
        if (!read.result) store.put(receipt, key);
        store.put(key, `last:${accountId}`);
        done({ receipt, source, sourceRevision: source.localRevision! });
      });
    });
  });
});

function updateImport(accountId: string, fingerprint: string, requestKey: string, update: (receipt: LegacyImportReceipt) => LegacyImportReceipt): Promise<LegacyImportReceipt> {
  return serial(accountId, () => atomic<LegacyImportReceipt>(['imports'], (tx, done, guard) => {
    const store = tx.objectStore('imports'), key = importKey(accountId, fingerprint), read = store.get(key);
    read.onsuccess = () => guard(() => {
      const receipt = read.result as LegacyImportReceipt | undefined;
      if (!receipt || receipt.accountId !== accountId || receipt.requestKey !== requestKey) throw new Error('LOCAL_SOURCE_CHANGED');
      const next = update(receipt); store.put(next, key); done(next);
    });
  }));
}
export const retainImportPreparedPhotos = (receipt: LegacyImportReceipt, prepared: PreparedDraftPhoto[]) => updateImport(receipt.accountId, receipt.fingerprint, receipt.requestKey, current => {
  if (current.prepared || current.verified) return current;
  if (prepared.length !== current.objectIds.length || prepared.some((photo, index) => photo.objectId !== current.objectIds[index])) throw new Error('INVALID_LOCAL_DRAFT');
  return { ...current, prepared, digests: prepared.map(photo => photo.digest) };
});
export const retainImportCloudId = (receipt: LegacyImportReceipt, cloudDraftId: string) => updateImport(receipt.accountId, receipt.fingerprint, receipt.requestKey, current => {
  if (current.cloudDraftId && current.cloudDraftId !== cloudDraftId) throw new Error('LOCAL_SOURCE_CHANGED');
  return { ...current, cloudDraftId };
});
export const finishLegacyDraftImport = (ticket: LegacyImportTicket, cloudDraftId: string) => serial(ticket.receipt.accountId, () => atomic<boolean>(['drafts', 'imports'], (tx, done, guard) => {
  const accountId = ticket.receipt.accountId, store = tx.objectStore('imports'), key = importKey(accountId, ticket.receipt.fingerprint), read = store.get(key);
  read.onsuccess = () => guard(() => {
    const receipt = read.result as LegacyImportReceipt | undefined;
    if (!receipt || receipt.requestKey !== ticket.receipt.requestKey || receipt.accountId !== accountId || receipt.cloudDraftId !== cloudDraftId) throw new Error('LOCAL_SOURCE_CHANGED');
    const drafts = tx.objectStore('drafts'), current = drafts.get(accountId);
    current.onsuccess = () => guard(() => {
      const canRemove = !current.result || ticket.sourceRevision !== null && current.result.localRevision === ticket.sourceRevision;
      // Receipt completion and source removal commit atomically. Preserve edits
      // from another tab even when the older snapshot was imported successfully.
      store.put({ ...receipt, verified: true, snapshot: null, prepared: null }, key);
      if (current.result && canRemove) drafts.delete(accountId);
      done(canRemove);
    });
  });
}));
