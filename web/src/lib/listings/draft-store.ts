import type { AddressSuggestion } from './address-types';

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
    const request = indexedDB.open('shutaf-listing-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onblocked = () => reject(new Error('Draft database blocked'));
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
export const saveListingDraft = (accountId: string, draft: SavedListingDraft) => serial(accountId, () => transact<IDBValidKey>('readwrite', store => store.put(draft, accountId)));
export const removeListingDraft = (accountId: string) => serial(accountId, () => transact<undefined>('readwrite', store => store.delete(accountId)));
