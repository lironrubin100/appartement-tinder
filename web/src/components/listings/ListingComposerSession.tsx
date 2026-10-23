'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import ComposeForm, { type ComposeFormHandle } from '@/app/(main)/compose/ComposeForm';
import { ListingDraftChooser, type ListingDraftChoice, type ListingDraftChoiceItem } from './ListingDraftChooser';
import { createListingCloudDraft, listListingCloudDrafts, loadListingCloudDraft } from '@/lib/listings/draft-actions';
import { importLegacyListingDraft } from '@/lib/listings/draft-import';
import { loadListingDraft } from '@/lib/listings/draft-store';
import { createClient } from '@/utils/supabase/client';
import type { DraftDocument } from '@/lib/listings/draft-service-contract';
import type { Locale } from '@/lib/listings/text';

type Screen = 'loading' | 'choose' | 'editor' | 'failure';
export function ListingComposerSession({ ref, accountId, locale, hasPrivatePhone, onClose }: {
  ref?: Ref<ComposeFormHandle>; accountId: string; locale: Locale; hasPrivatePhone: boolean; onClose: () => void;
}) {
  const [screen, setScreen] = useState<Screen>('loading'), [pending, setPending] = useState(true);
  const [items, setItems] = useState<ListingDraftChoiceItem[]>([]), [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [legacyUnavailable, setLegacyUnavailable] = useState(false);
  const newReceipt = useRef<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null), [paged, setPaged] = useState(false);
  const [selected, setSelected] = useState<DraftDocument | null>(null), [message, setMessage] = useState('');
  const retryChoice = useRef<ListingDraftChoice | null>(null), editor = useRef<ComposeFormHandle>(null);
  const active = useRef(false), generation = useRef(0), busy = useRef(false);
  const en = locale === 'en';
  const actor = useCallback(async () => {
    const result = await createClient().auth.getUser();
    return !result.error && result.data.user?.id === accountId;
  }, [accountId]);
  const current = useCallback((operation: number) => active.current && generation.current === operation, []);
  const stop = useCallback(() => { active.current = false; generation.current++; }, []);

  const openChoice = useCallback(async (choice: ListingDraftChoice, operation: number) => {
    if (!await actor() || !current(operation)) throw Error('UNAVAILABLE');
    let draft: DraftDocument; let newReceiptKey: string | undefined;
    if (choice.kind === 'new') {
      const requestKey = newReceipt.current ??= crypto.randomUUID();
      const key = 'shutaf-plus-new:' + accountId + ':' + requestKey; newReceiptKey = key;
      // A retry belongs to this mounted intent. A later explicit New gets a new
      // receipt; earlier ambiguous receipts are retained under their own key.
      try { sessionStorage.setItem(key, requestKey); } catch { /* In-memory retry still works if device storage is unavailable. */ }
      const result = await createListingCloudDraft({ requestKey, expectedAccountId: accountId });
      if (!result.ok || result.data.kind !== 'new') throw Error('UNAVAILABLE');
      draft = result.data;
      if (!await actor() || !current(operation) || draft.ownerId !== accountId) throw Error('UNAVAILABLE');

    } else if (choice.kind === 'import') {
      const result = await importLegacyListingDraft(accountId);
      if (!result.ok) throw Error('IMPORT_FAILED');
      draft = result.data;
    } else {
      const result = await loadListingCloudDraft(choice.draftId);
      if (!result.ok) throw Error('UNAVAILABLE');
      draft = result.data;
      if (draft.revision !== choice.expectedRevision) throw Error('VERSION_CONFLICT');
    }
    if (!await actor() || !current(operation)) return;
    if (draft.ownerId !== accountId || draft.state === 'deleting' || (draft.kind !== 'new' && (draft.state !== 'open' || draft.publicationStartedAt !== null))) throw Error('UNAVAILABLE');
    if (newReceiptKey) { try { sessionStorage.removeItem(newReceiptKey); } catch { /* Exact receipt can remain for reconciliation. */ } }
    setSelected(draft); setScreen('editor'); setMessage('');
  }, [accountId, actor, current]);

  const loadPage = useCallback(async (cursor?: string) => {
    const operation = ++generation.current; busy.current = true;
    retryChoice.current = null; setPending(true); setScreen('loading'); setMessage('');
    try {
      if (!await actor() || !current(operation)) throw Error('UNAVAILABLE');
      const [result, legacy] = await Promise.all([listListingCloudDrafts(cursor ? { cursor } : {}),
        loadListingDraft(accountId).then(local => ({ local, unavailable: false })).catch(() => ({ local: undefined, unavailable: true }))]);
      if (!await actor() || !current(operation)) return;
      if (!result.ok || result.data.items.some(draft => draft.ownerId !== accountId)) throw Error('UNAVAILABLE');
      setItems(result.data.items.map(draft => ({ id: draft.id, revision: draft.revision, title: draft.fields.title, kind: draft.kind, updatedAt: draft.updatedAt, deleting: draft.state === 'deleting', publicationPending: Boolean(draft.publicationStartedAt), unavailable: draft.state === 'deleting' || (draft.kind !== 'new' && draft.state !== 'open') })));
      setHasLocalDraft(Boolean(legacy.local)); setLegacyUnavailable(legacy.unavailable); setNextCursor(result.data.next_cursor); setPaged(Boolean(cursor));
      if (!cursor && result.data.items.length === 0 && !legacy.local && !legacy.unavailable) {
        retryChoice.current = { kind: 'new' }; await openChoice({ kind: 'new' }, operation);
      } else setScreen('choose');
    } catch {
      if (current(operation)) { setScreen('failure'); setMessage(en ? 'Could not open the draft. Please retry.' : 'לא הצלחנו לפתוח את הטיוטה. נסו שוב.'); }
    } finally { if (current(operation)) { busy.current = false; setPending(false); } }
  }, [accountId, actor, current, en, openChoice]);

  useEffect(() => {
    active.current = true; let mounted = true;
    queueMicrotask(() => { if (mounted) void loadPage(); });
    return () => { mounted = false; stop(); };
  }, [loadPage, stop]);

  const choose = async (choice: ListingDraftChoice) => {
    if (busy.current || !active.current) return;
    const operation = ++generation.current; busy.current = true; retryChoice.current = choice;
    setPending(true); setScreen('loading'); setMessage('');
    try { await openChoice(choice, operation); }
    catch (error) {
      if (current(operation)) {
        if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
          retryChoice.current = null;
          setMessage(en ? 'This draft changed. Reload the draft list to continue.' : 'הטיוטה השתנתה. טענו מחדש את רשימת הטיוטות כדי להמשיך.');
        } else setMessage(en ? 'Could not open the draft. Please retry.' : 'לא הצלחנו לפתוח את הטיוטה. נסו שוב.');
        setScreen('failure');
      }
    } finally { if (current(operation)) { busy.current = false; setPending(false); } }
  };
  const reloadSelected = async (): Promise<boolean> => {
    if (!selected || busy.current || !active.current) return false;
    const operation = ++generation.current; busy.current = true;
    try {
      if (!await actor() || !current(operation)) return false;
      const result = await loadListingCloudDraft(selected.id);
      if (!await actor() || !current(operation) || !result.ok) return false;
      if (result.data.ownerId !== accountId || result.data.state === 'deleting' || (result.data.kind !== 'new' && result.data.state !== 'open')) return false;
      setSelected(result.data); return true;
    } catch { return false; }
    finally { if (current(operation)) busy.current = false; }
  };
  const close = () => { if (!busy.current) onClose(); };
  useImperativeHandle(ref, () => ({ saveAndClose: async () => {
    if (editor.current) await editor.current.saveAndClose(); else close();
  } }));

  if (screen === 'editor' && selected) return <ComposeForm key={selected.id + ':' + selected.revision} ref={editor} accountId={accountId} cloudDraft={selected}
    locale={locale} requiresPrivatePhone={false} hasPrivatePhone={hasPrivatePhone} onClose={onClose} onPublished={onClose} onReloadSaved={reloadSelected} />;
  if (screen === 'choose') return <>
    <ListingDraftChooser items={items} locale={locale} hasLocalDraft={hasLocalDraft} onChoose={choice => { void choose(choice); }} onClose={close} pending={pending} />
    {legacyUnavailable && <div role="alert" className="space-y-2 px-5 pb-5 text-sm text-muted-text">
      <p>{en ? 'Could not check drafts on this device. Your saved cloud drafts are available; no local draft was imported.' : 'לא הצלחנו לבדוק טיוטות במכשיר. טיוטות הענן זמינות; לא יובאה טיוטה מקומית.'}</p>
      <button type="button" onClick={() => { void loadPage(); }} className="min-h-11 rounded-xl border border-card-border px-4 py-3 text-teal">{en ? 'Check device drafts again' : 'בדיקת טיוטות המכשיר שוב'}</button>
    </div>}
    {(paged || nextCursor) && <nav aria-label={en ? 'Draft pages' : 'עמודי טיוטות'} className="flex flex-wrap gap-3 px-5 pb-5">
      {paged && <button type="button" disabled={pending} onClick={() => { void loadPage(); }} className="min-h-11 rounded-xl border border-card-border px-4 py-3 text-teal">{en ? 'Latest drafts' : 'הטיוטות העדכניות'}</button>}
      {nextCursor && <button type="button" disabled={pending} onClick={() => { void loadPage(nextCursor); }} className="min-h-11 rounded-xl border border-card-border px-4 py-3 text-teal">{en ? 'Older drafts' : 'טיוטות קודמות'}</button>}
    </nav>}
  </>;
  return <div className="space-y-4 bg-white p-6" dir={en ? 'ltr' : 'rtl'}>
    <p role={screen === 'failure' ? 'alert' : 'status'}>{screen === 'failure' ? message : (en ? 'Opening your drafts…' : 'פותחים את הטיוטות שלך…')}</p>
    {screen === 'failure' && <button type="button" onClick={() => { const choice = retryChoice.current; if (choice) void choose(choice); else void loadPage(); }} className="min-h-11 rounded-xl border border-card-border px-4 py-3 text-teal">{en ? 'Try again' : 'ניסיון נוסף'}</button>}
    <button type="button" disabled={pending} onClick={close} className="min-h-11 rounded-xl px-4 py-3 text-teal disabled:opacity-50">{en ? 'Close' : 'סגירה'}</button>
  </div>;
}
