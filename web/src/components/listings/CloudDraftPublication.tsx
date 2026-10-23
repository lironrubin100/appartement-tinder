'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { createClient } from '@/utils/supabase/client';
import { loadListingCloudDraft } from '@/lib/listings/draft-actions';
import { publishListingCloudDraft, reconcileListingCloudDraftPublication, cancelListingCloudDraftPublication, type DraftPublishResult } from '@/lib/listings/draft-publish';
import { draftPublicationError } from '@/lib/listings/draft-publish-text';
import type { DraftDocument } from '@/lib/listings/draft-service-contract';
import { localePrefix, type Locale } from '@/lib/listings/text';
import { SavedDraftPhotos } from './SavedDraftPhotos';
import type { ComposeFormHandle } from '@/app/(main)/compose/ComposeForm';

type Published = Extract<DraftPublishResult, {ok:true}>['data'];
export function CloudDraftPublication({ ref, snapshot, accountId, locale, providerToken, onPublished, onEdit, onClose }: {
  ref?: Ref<ComposeFormHandle>; snapshot: DraftDocument; accountId: string; locale: Locale; providerToken?: string;
  onPublished: (data: Published) => Promise<void>; onEdit: () => Promise<boolean>; onClose?: () => void;
}) {
  const en = locale === 'en', active = useRef(false), generation = useRef(0), busy = useRef(false);
  const callbacks = useRef({onPublished,onEdit,onClose});
  useEffect(() => { callbacks.current = {onPublished,onEdit,onClose}; }, [onPublished,onEdit,onClose]);
  const [pending,setPending] = useState(true), [message,setMessage] = useState(''), [editable,setEditable] = useState(false);
  const [reloadFailed,setReloadFailed] = useState(false);
  const actor = useCallback(async () => { try { const result=await createClient().auth.getUser();return !result.error&&result.data.user?.id===accountId; } catch { return false; } },[accountId]);
  const current = useCallback((operation:number) => active.current&&generation.current===operation, []);
  const stop = useCallback(() => { active.current=false; generation.current++; busy.current=false; }, []);
  const run = useCallback(async (mode:'check'|'retry'|'cancel') => {
    if (!active.current||busy.current) return;
    const operation=++generation.current;busy.current=true;setPending(true);setMessage('');setReloadFailed(false);
    try {
      if (!await actor()||!current(operation)) return;
      const input={id:snapshot.id,expectedRevision:snapshot.revision,expectedAccountId:accountId};
      const result=mode==='cancel' ? await cancelListingCloudDraftPublication(input)
        : await (mode==='check'?reconcileListingCloudDraftPublication:publishListingCloudDraft)({...input,...(providerToken?{providerToken}:{})});
      if (!await actor()||!current(operation)) return;
      if (result.ok) {
        if ('kind' in result.data) {
          if (result.data.kind==='editable') { setEditable(true);setMessage(en?'This attempt was cancelled. Load the saved draft to edit.':'הניסיון בוטל. טענו את הטיוטה השמורה כדי לערוך.');return; }
          await callbacks.current.onPublished(result.data.publication);return;
        }
        await callbacks.current.onPublished(result.data);return;
      }
      setMessage(draftPublicationError(result.error,locale));
      if (['PUBLICATION_NOT_STARTED','VERSION_CONFLICT'].includes(result.error.code)) {
        const latest=await loadListingCloudDraft(snapshot.id);
        if (!await actor()||!current(operation)) return;
        if (latest.ok&&latest.data.ownerId===accountId&&latest.data.kind==='new'&&latest.data.state==='open'&&!latest.data.publicationStartedAt) setEditable(true);
      }
    } catch { if(current(operation))setMessage(draftPublicationError({code:'PUBLICATION_UNCERTAIN'},locale)); }
    finally { if(current(operation)){busy.current=false;setPending(false);} }
  },[accountId,actor,current,en,locale,providerToken,snapshot.id,snapshot.revision]);
  useEffect(()=>{active.current=true;queueMicrotask(()=>{if(active.current)void run('check');});return stop;},[run,stop]);
  const close=()=>{if(busy.current||pending)return;if(callbacks.current.onClose)callbacks.current.onClose();else window.location.assign(localePrefix(locale)+'/my-listings');};
  useImperativeHandle(ref,()=>({saveAndClose:async()=>{close();}}));
  async function edit(){
    if(busy.current||!window.confirm(en?'Load the saved draft and return to editing?':'לטעון את הטיוטה השמורה ולחזור לעריכה?'))return;
    const operation=++generation.current;busy.current=true;setPending(true);setReloadFailed(false);
    try{if(!await actor()||!current(operation))return;if(!await callbacks.current.onEdit()&&current(operation))setReloadFailed(true);}
    catch{if(current(operation))setReloadFailed(true);}finally{if(current(operation)){busy.current=false;setPending(false);}}
  }
  return <section className="mx-auto max-w-2xl space-y-5 bg-white p-5 sm:p-8" dir={en?'ltr':'rtl'} aria-busy={pending}>
    <h1 className="text-2xl font-semibold text-ink">{en?'Publication status':'מצב הפרסום'}</h1>
    <p className="text-sm text-muted-text">{en?'This draft is kept while publication is checked. Its fields and photos cannot be edited here.':'הטיוטה נשמרת בזמן בדיקת הפרסום. אי אפשר לערוך כאן את השדות והתמונות.'}</p>
    <h2 className="break-words text-xl font-semibold">{snapshot.fields.title|| (en?'Untitled draft':'טיוטה ללא כותרת')}</h2>
    <dl className="space-y-2 break-words text-sm text-ink">
      <div><dt className="font-semibold">{en?'Bedrooms in the apartment':'מספר חדרים בדירה'}</dt><dd>{snapshot.fields.bedrooms}</dd></div>
      <div><dt className="font-semibold">{en?'Bills included':'חשבונות כלולים'}</dt><dd>{snapshot.fields.billsIncluded?(en?'Yes':'כן'):(en?'No':'לא')}</dd></div>
      <div><dt className="font-semibold">{en?'Available rooms and prices':'חדרים פנויים ומחירים'}</dt><dd>{snapshot.fields.roomPrices?.join(' / ')}</dd></div>
      <div><dt className="font-semibold">{en?'Available from':'תאריך כניסה'}</dt><dd>{snapshot.fields.availableFrom}</dd></div>
      <div><dt className="font-semibold">{en?'Description':'תיאור'}</dt><dd className="whitespace-pre-wrap">{snapshot.fields.description}</dd></div>
      <div><dt className="font-semibold">{en?'Private saved address':'כתובת פרטית שמורה'}</dt><dd>{snapshot.fields.address?.address}</dd></div>
    </dl>
    <SavedDraftPhotos draft={snapshot} locale={locale}/>
    {pending&&<p role="status">{en?'Checking publication…':'בודקים את הפרסום…'}</p>}
    {message&&<p role="alert" className="rounded-xl border border-card-border p-3 text-sm">{message}</p>}
    {reloadFailed&&<p role="alert">{en?'Could not load the saved draft. Please retry.':'לא הצלחנו לטעון את הטיוטה השמורה. נסו שוב.'}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={pending} onClick={()=>void run('check')} className="min-h-11 rounded-xl border border-card-border px-4 py-3 text-teal disabled:opacity-50">{en?'Check publication':'בדיקת הפרסום'}</button>
      {editable?<button type="button" disabled={pending} onClick={()=>void edit()} className="min-h-11 rounded-xl bg-teal px-4 py-3 font-semibold text-white disabled:opacity-50">{en?'Load saved draft to edit':'טעינת הטיוטה לעריכה'}</button>:<>
        <button type="button" disabled={pending} onClick={()=>void run('retry')} className="min-h-11 rounded-xl bg-orange px-4 py-3 font-semibold text-white disabled:opacity-50">{en?'Retry publication':'ניסיון פרסום נוסף'}</button>
        <button type="button" disabled={pending} onClick={()=>{if(window.confirm(en?'Stop this unpublished attempt and return to editing? A listing that already published will be preserved.':'לעצור את ניסיון הפרסום שטרם הושלם ולחזור לעריכה? מודעה שכבר פורסמה תישמר.'))void run('cancel');}} className="min-h-11 rounded-xl border border-card-border px-4 py-3 text-teal disabled:opacity-50">{en?'Return to editing':'חזרה לעריכה'}</button>
      </>}
      <button type="button" disabled={pending} onClick={close} className="min-h-11 rounded-xl border border-card-border px-4 py-3 disabled:opacity-50">{en?'Close':'סגירה'}</button>
    </div>
  </section>;
}
