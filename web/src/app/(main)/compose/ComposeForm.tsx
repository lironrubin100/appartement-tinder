'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { LISTING_PHOTO_MAX, LISTING_PHOTO_MIN, validateListingDraft } from '@/lib/listings/validation';
import { discardListingAttempt, publishListing } from '@/lib/listings/actions';
import { resizeImage } from '@/utils/photos';
import { listingError, localePrefix, type Locale } from '@/lib/listings/text';
import AddressField from '@/components/map/AddressField';
import { loadListingDraft, removeListingDraft, saveListingDraft, type SavedAddress, type SavedListingDraft } from '@/lib/listings/draft-store';

import type { DraftDocument, DraftResult } from '@/lib/listings/draft-service-contract';
import type { ListingDraftFields } from '@/lib/listings/draft-types';
import { saveListingCloudDraft, loadListingCloudDraft } from '@/lib/listings/draft-actions';
import { createDraftSaveQueue, type DraftSaveState } from '@/lib/listings/draft-save-queue';
import { createClient } from '@/utils/supabase/client';
import { CloudDraftPhotos, type CloudPhotoSelection } from '@/components/listings/CloudDraftPhotos';
import { saveDraftMedia } from '@/lib/listings/draft-media';
import { SavedDraftPhotos } from '@/components/listings/SavedDraftPhotos';

function draftInput(draft: DraftDocument): SavedListingDraft {
  const fields = draft.fields, address = fields.address;
  return { version: 1, title: fields.title ?? '', bedrooms: fields.bedrooms ?? '', availableFrom: fields.availableFrom ?? '',
    billsIncluded: fields.billsIncluded ?? false, description: fields.description ?? '', roomPrices: [...(fields.roomPrices ?? [])], photos: [], requestKey: null,
    address: address ? { address: address.address ?? '', latitude: address.latitude ?? '', longitude: address.longitude ?? '', city: address.city ?? '', manual: address.manual ?? false, confirmed: address.confirmed ?? false, selected: null } : null };
}
function addressKey(address: SavedAddress | null): string {
  return JSON.stringify([address?.address ?? '', address?.latitude ?? '', address?.longitude ?? '', address?.city ?? '', address?.manual ?? false, address?.confirmed ?? false]);
}
function draftFields(input: SavedListingDraft): ListingDraftFields {
  const { title, bedrooms, availableFrom, billsIncluded, description, roomPrices, address } = input;
  return { title, bedrooms, availableFrom, billsIncluded, description, roomPrices,
    ...(address ? { address: { address: address.address, latitude: address.latitude, longitude: address.longitude, city: address.city, manual: address.manual, confirmed: address.confirmed } } : {}) };
}

function formatFields(fields: ListingDraftFields, locale: Locale): string {
  const en = locale === 'en';
  return [
    [en ? 'Title' : 'כותרת', fields.title], [en ? 'Bedrooms' : 'חדרים בדירה', fields.bedrooms],
    [en ? 'Available from' : 'תאריך כניסה', fields.availableFrom], [en ? 'Bills included' : 'חשבונות כלולים', fields.billsIncluded === undefined ? '' : fields.billsIncluded ? (en ? 'Yes' : 'כן') : (en ? 'No' : 'לא')],
    [en ? 'Room prices' : 'מחירי חדרים', fields.roomPrices?.join(', ')], [en ? 'Description' : 'תיאור', fields.description],
    [en ? 'Address' : 'כתובת', fields.address?.address], [en ? 'City' : 'עיר', fields.address?.city],
    [en ? 'Latitude' : 'קו רוחב', fields.address?.latitude], [en ? 'Longitude' : 'קו אורך', fields.address?.longitude],
    [en ? 'Location confirmed' : 'המיקום אושר', fields.address?.confirmed ? (en ? 'Yes' : 'כן') : (en ? 'No' : 'לא')],
  ].map(([label, value]) => label + ': ' + (value ?? '')).join('\n');
}
export type ComposeFormHandle = { saveAndClose: () => Promise<void> };

export default function ComposeForm({ ref, cloudDraft: receivedCloudDraft, accountId, hasPrivatePhone, requiresPrivatePhone, locale = 'he', onClose, onPublished, onReloadSaved }: { ref?: Ref<ComposeFormHandle>; cloudDraft?: DraftDocument; accountId: string; hasPrivatePhone: boolean; requiresPrivatePhone: boolean; locale?: Locale; onClose?: () => void; onPublished?: () => void; onReloadSaved?: () => Promise<boolean> }) {
  // Keep the selected editing session anchored through server-action/RSC refreshes.
  // Loading another draft uses the caller's id key; reload is an explicit choice.
  const [cloudDraft] = useState(receivedCloudDraft);
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [roomPrices, setRoomPrices] = useState<string[]>(cloudDraft?.fields.roomPrices?.length ? [...cloudDraft.fields.roomPrices] : ['']);
  const [bedrooms, setBedrooms] = useState(cloudDraft?.fields.bedrooms ?? '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [reloading, setReloading] = useState(false), [reloadFailed, setReloadFailed] = useState(false);
  const busy = useRef(false);
  const requestKey = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = useRef(false);
  const [draftLoaded, setDraftLoaded] = useState(Boolean(cloudDraft));
  const [initialDraft, setInitialDraft] = useState<SavedListingDraft | null>(cloudDraft ? draftInput(cloudDraft) : null);
  const [addressDraft, setAddressDraft] = useState<SavedAddress | null>(cloudDraft ? draftInput(cloudDraft).address : null);
  const [revision, setRevision] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [acknowledgedDraft, setAcknowledgedDraft] = useState(cloudDraft);
  const [photoState, setPhotoState] = useState({ preparing: 0, errors: 0 });
  const mediaState = useRef<CloudPhotoSelection>({ items: cloudDraft?.photos ?? [], preparing: 0, errors: 0 });
  const [cloudState, setCloudState] = useState<DraftSaveState>({ phase: 'saved' });
  const [localComparison, setLocalComparison] = useState<ListingDraftFields | null>(null);
  const [comparison, setComparison] = useState<DraftDocument | null>(null);
  const cloudQueue = useRef<ReturnType<typeof createDraftSaveQueue> | null>(null);
  const pendingInput = useRef(false);
  const onCloudPhotosChange = useCallback((selection: CloudPhotoSelection) => {
    mediaState.current = selection; pendingInput.current = true;
    setPhotoState({ preparing: selection.preparing, errors: selection.errors });
    setRevision(value => value + 1);
    setCloudState(current => current.phase === 'error' || current.phase === 'conflict' ? current : { phase: 'dirty' });
  }, []);
  const lastAddress = useRef(addressKey(cloudDraft ? draftInput(cloudDraft).address : null));
  const onAddressChange = useCallback((address: SavedAddress) => {
    const encoded = addressKey(address);
    if (encoded !== lastAddress.current) { lastAddress.current = encoded; pendingInput.current = true; setRevision(value => value + 1); }
    setAddressDraft(address);
  }, []);
  useEffect(() => {
    if (!cloudDraft) return;
    let active = true, comparisonRequested = false;
    const queue = createDraftSaveQueue(cloudDraft, async (id, expectedRevision, fields): Promise<DraftResult<DraftDocument>> => {
      const client = createClient();
      if ((await client.auth.getUser()).data.user?.id !== accountId) return { ok: false, error: { code: 'AUTH_REQUIRED', retryable: false } };
      const result = await saveListingCloudDraft(id, expectedRevision, fields);
      return (await client.auth.getUser()).data.user?.id === accountId ? result : { ok: false, error: { code: 'AUTH_REQUIRED', retryable: false } };
    }, state => {
      if (!active) return;
      setCloudState(state.phase === 'saved' && (pendingInput.current || mediaState.current.preparing > 0 || mediaState.current.errors > 0) ? { phase: 'dirty' } : state);
      if (state.phase === 'conflict' && !comparisonRequested) {
        comparisonRequested = true;
        void loadListingCloudDraft(cloudDraft.id).then(result => { if (active && result.ok) setComparison(result.data); }).catch(() => {});
      }
    }, { writeMedia: saveDraftMedia, acknowledged: document => { if (active) setAcknowledgedDraft(document); } });
    cloudQueue.current = queue;
    return () => { active = false; queue.stop(); if (cloudQueue.current === queue) cloudQueue.current = null; };
  }, [cloudDraft, accountId]);
  useEffect(() => {
    if (!cloudDraft || cloudState.phase === 'saved') return;
    const warn = (event: BeforeUnloadEvent) => { if (finished.current) return; event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [cloudDraft, cloudState.phase]);
  const photoUrls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos]);

  useEffect(() => () => photoUrls.forEach(URL.revokeObjectURL), [photoUrls]);

  useEffect(() => {
    if (cloudDraft) return;
    let current = true;
    loadListingDraft(accountId).then((draft) => {
      if (!current) return;
      if (draft?.version === 1) {
        setInitialDraft(draft); setAddressDraft(draft.address); setPhotos(draft.photos);
        setRoomPrices(draft.roomPrices.length ? draft.roomPrices : ['']); setBedrooms(draft.bedrooms);
        requestKey.current = draft.requestKey;
      }
      setDraftLoaded(true);
    }).catch(() => { if (current) { setStorageError(true); setDraftLoaded(true); } });
    return () => { current = false; };
  }, [accountId, cloudDraft]);

  function snapshot(form: HTMLFormElement): SavedListingDraft {
    const data = new FormData(form);
    return { version: 1, title: String(data.get('title') ?? ''), bedrooms,
      availableFrom: String(data.get('availableFrom') ?? ''), billsIncluded: data.get('billsIncluded') === 'on',
      description: String(data.get('description') ?? ''), roomPrices, photos, address: addressDraft, requestKey: requestKey.current };
  }

  useEffect(() => {
    if (!draftLoaded || !formRef.current || busy.current || finished.current) return;
    const draft = snapshot(formRef.current);
    if (cloudDraft) {
      if (revision === 0 || mediaState.current.preparing || mediaState.current.errors) return;
      pendingInput.current = false;
      setLocalComparison(draftFields(draft));
      cloudQueue.current?.offer(draftFields(draft), mediaState.current.items);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { void cloudQueue.current?.flush(); }, 400);
      return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveListingDraft(accountId, draft).then(() => setStorageError(false)).catch(() => setStorageError(true));
    }, 250);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // The snapshot is taken after the corresponding form and state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, cloudDraft, draftLoaded, revision, bedrooms, roomPrices, photos, addressDraft, submitting]);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setPhotos((current) => [...current, ...selected].slice(0, LISTING_PHOTO_MAX));
    event.target.value = '';
    setMessage('');
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  }

  function updateRoomPrice(index: number, value: string) {
    setRoomPrices((current) => current.map((price, roomIndex) => roomIndex === index ? value : price));
    setMessage('');
  }

  function addRoom() {
    setRoomPrices((current) => [...current, '']);
    setMessage('');
  }

  function removeRoom(index: number) {
    setRoomPrices((current) => current.filter((_, roomIndex) => roomIndex !== index));
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || cloudDraft) return;
    if (requiresPrivatePhone && !hasPrivatePhone) {
      setMessage(t("לפני הפרסום יש להוסיף מספר טלפון פרטי בהגדרות הפרופיל.", "Add a private phone number to your profile before publishing."));
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (formData.get('locationConfirmed') !== 'on' || !String(formData.get('latitude') ?? '').trim()
      || !String(formData.get('longitude') ?? '').trim()) {
      setMessage(t('בחרו כתובת או סמנו מיקום ידנית ואשרו שהמיקום נכון.', 'Choose an address or place the pin manually and confirm the location.'));
      return;
    }
    const validationError = validateListingDraft({
      title: String(formData.get('title') ?? ''),
      address: String(formData.get('address') ?? ''),
      latitude: Number(formData.get('latitude')),
      longitude: Number(formData.get('longitude')),
      bedrooms: Number(formData.get('bedrooms')),
      billsIncluded: formData.get('billsIncluded') === 'on',
      availableRooms: roomPrices.map((monthlyPrice) => ({ monthlyPrice: Number(monthlyPrice) })),
      availableFrom: String(formData.get('availableFrom') ?? ''),
      description: String(formData.get('description') ?? ''),
      photos,
    });
    if (validationError) {
      setMessage(listingError(validationError, locale));
      return;
    }

    busy.current = true;
    setSubmitting(true);
    setMessage('');
    let published = false;
    try {
    requestKey.current ??= crypto.randomUUID();
    formData.set('requestKey', requestKey.current);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try { await saveListingDraft(accountId, snapshot(form)); setStorageError(false); }
    catch { setStorageError(true); return; }
    formData.delete('photos');
    const compressedPhotos = await Promise.all(
      photos.map(async (photo) => new File([await resizeImage(photo)], `${photo.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' }))
    );
    compressedPhotos.forEach((photo) => formData.append('photos', photo));
    const result = await publishListing(formData);
    if (result.error) {
      setMessage(listingError(result.error, locale));
      return;
    }
    if ('listingId' in result) {
      published = true;
      finished.current = true;
      await removeListingDraft(accountId).catch(() => setStorageError(true));
      onPublished?.();
      router.push(`${localePrefix(locale)}/compose/published/${result.listingId}`);
    }
    } catch {
      setMessage(t("לא הצלחנו להכין את התמונות או לפרסם. נסו שוב.", "Could not prepare photos or publish. Please retry."));
    } finally {
      if (!published) {
        busy.current = false;
        setSubmitting(false);
      }
    }
  }

  async function discardDraft() {
    if (busy.current || !window.confirm(t('למחוק את הטיוטה השמורה במכשיר הזה?', 'Discard the draft saved on this device?'))) return;
    busy.current = true;
    setSubmitting(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      if (requestKey.current) {
        const result = await discardListingAttempt(requestKey.current);
        if ('error' in result) {
          setMessage(t('לא הצלחנו למחוק את הטיוטה בבטחה. נסו שוב.', 'Could not safely discard the draft. Please retry.'));
          return;
        }
        if (result.status === 'published') {
          finished.current = true;
          await removeListingDraft(accountId).catch(() => setStorageError(true));
          onPublished?.();
          router.push(`${localePrefix(locale)}/compose/published/${requestKey.current}`);
          return;
        }
      }
      finished.current = true;
      await removeListingDraft(accountId);
      window.location.reload();
    } catch { finished.current = false; setStorageError(true); }
    finally { busy.current = false; setSubmitting(false); }
  }

  async function saveDraftAndClose() {
    if (busy.current || !draftLoaded || !formRef.current) return;
    if (cloudDraft && (mediaState.current.preparing || mediaState.current.errors)) {
      setMessage(t('המתינו להכנת התמונות או הסירו תמונה שנכשלה לפני הסגירה.', 'Wait for photos to finish preparing or remove a failed photo before closing.')); return;
    }
    const draft = snapshot(formRef.current);
    busy.current = true;
    setSavingDraft(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      if (cloudDraft) {
        pendingInput.current = false;
        setLocalComparison(draftFields(draft));
        cloudQueue.current?.offer(draftFields(draft), mediaState.current.items);
        const saved = await cloudQueue.current?.flush();
        if (!saved) return;
        finished.current = true;
        if (onClose) { onClose(); router.refresh(); }
        else window.location.assign(localePrefix(locale) + '/my-listings');
        return;
      }
      await saveListingDraft(accountId, draft);
      setStorageError(false);
      finished.current = true;
      if (onClose) onClose(); else router.push(`${localePrefix(locale)}/my-listings`);
    } catch {
      setStorageError(true);
    } finally {
      busy.current = false;
      setSavingDraft(false);
    }
  }

  async function reloadSavedVersion() {
    if (reloading || !window.confirm(t('לטעון את הגרסה השמורה ולהחליף את השינויים המקומיים?', 'Load the saved version and replace your local edits?'))) return;
    if (!onReloadSaved) { finished.current = true; window.location.reload(); return; }
    setReloading(true); setReloadFailed(false);
    try { if (await onReloadSaved()) finished.current = true; else setReloadFailed(true); }
    catch { setReloadFailed(true); }
    finally { setReloading(false); }
  }
  useImperativeHandle(ref, () => ({ saveAndClose: saveDraftAndClose }));

  if (!draftLoaded) return <p role="status" className="p-6">{t('טוענים טיוטה…', 'Loading draft…')}</p>;

  return (
    <div className="min-h-[calc(100vh-80px)] w-full bg-page-bg p-4 md:p-8">
      <div className="mx-auto max-w-2xl rounded-shutaf-lg border border-card-border bg-white p-6 shadow-sm md:p-8">
        <h1 className="mb-2 text-3xl font-bold text-ink">{cloudDraft ? t("עריכת טיוטה", "Edit draft") : t("פרסום דירה חדשה", "Publish an apartment")}</h1>
        <p className="mb-8 text-sm text-muted-text">{t("מודעה אחת לדירה. הוסיפו את החדרים הפנויים ואת המחיר החודשי של כל אחד.", "Add the available rooms and the monthly price for each room.")}</p>

        <form ref={formRef} className="space-y-6" onSubmit={handleSubmit} onChange={() => { pendingInput.current = true; setRevision(value => value + 1); if (cloudDraft) setCloudState(current => current.phase === 'error' || current.phase === 'conflict' ? current : { phase: 'dirty' }); }} noValidate>
          <fieldset disabled={submitting || savingDraft || reloading} className="space-y-6">
          <Input name="title" label={t("כותרת המודעה", "Listing title")} placeholder={t("דירת 3 חדרים ליד האוניברסיטה", "3-bedroom apartment near the university")} defaultValue={initialDraft?.title ?? ''} required maxLength={100} />
          <div className="grid gap-6 sm:grid-cols-2">
            <Input name="bedrooms" label={t("מספר חדרים בדירה", "Bedrooms in the apartment")} placeholder="3" type={cloudDraft ? "text" : "number"} inputMode="numeric" maxLength={32} min="1" max="20" step="1" required value={bedrooms} onChange={(event) => { setBedrooms(event.target.value); setMessage(''); }} />
            <Input name="availableFrom" label={t("תאריך כניסה", "Available from")} type={cloudDraft ? "text" : "date"} placeholder={cloudDraft ? "YYYY-MM-DD" : undefined} maxLength={32} defaultValue={initialDraft?.availableFrom ?? ''} required />
          </div>
          <fieldset disabled={cloudDraft?.kind === 'edit'} inert={cloudDraft?.kind === 'edit'}><AddressField locale={locale} initialDraft={initialDraft?.address} onDraftChange={onAddressChange} /></fieldset>

          <fieldset className="space-y-3 rounded-shutaf-md border border-card-border p-4">
            <legend className="text-sm font-medium text-ink">{t("חדרים פנויים ומחיר", "Available rooms and prices")}</legend>
            <p className="-mt-2 text-sm text-muted-text">{t("כל חדר מוצג כחלק מהדירה, ולא כמודעה נפרדת.", "Each room belongs to this apartment listing.")}</p>
            <div className="space-y-3">
              {roomPrices.map((roomPrice, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input
                      name="roomPrice"
                      label={`${t("מחיר חודשי לחדר פנוי", "Monthly price for available room")} ${index + 1} (₪)`}
                      placeholder="1800"
                      type={cloudDraft ? "text" : "number"} inputMode="numeric" maxLength={32}
                      min="1"
                      step="1"
                      required
                      value={roomPrice}
                      onChange={(event) => updateRoomPrice(index, event.target.value)}
                    />
                  </div>
                  {roomPrices.length > 1 && (
                    <Button type="button" variant="ghost" className="mb-0.5 shrink-0" onClick={() => removeRoom(index)} aria-label={`${t("הסרת חדר פנוי", "Remove available room")} ${index + 1}`}>{t("הסרה", "Remove")}</Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" onClick={addRoom} disabled={Boolean(bedrooms) && roomPrices.length >= Number(bedrooms)}>{t("+ הוספת חדר פנוי", "+ Add an available room")}</Button>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 rounded-shutaf-md border border-card-border p-4 text-sm text-ink">
            <input name="billsIncluded" type="checkbox" defaultChecked={initialDraft?.billsIncluded ?? false} className="mt-0.5 size-4 accent-orange" />
            <span><strong className="font-semibold">{t("החשבונות כלולים במחיר", "Bills included")}</strong><span className="mt-1 block text-muted-text">{t("סמנו רק אם המחיר של כל חדר כולל חשבונות שוטפים.", "Select only if every room price includes bills.")}</span></span>
          </label>
          {!cloudDraft && <p className="rounded-shutaf-md bg-neutral-bg-soft p-3 text-sm text-muted-text">
            {!requiresPrivatePhone || hasPrivatePhone
              ? t("מספר הטלפון בחשבון נשאר פרטי. כל הפניות מתבצעות בשותף.", "Your account phone stays private. All inquiries happen in Shutaf.")
              : <>{t("לפני הפרסום יש להוסיף מספר טלפון פרטי.", "Add a private phone number before publishing.")} <Link href={`${localePrefix(locale)}/profile/edit`} className="text-teal underline">{t("עריכת פרופיל", "Edit profile")}</Link></>}
          </p>}

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-ink">{t("תיאור הדירה", "Apartment description")}</label>
            <textarea id="description" name="description" defaultValue={initialDraft?.description ?? ''} maxLength={2000} rows={4} placeholder={t("ספרו על הדירה, האזור ומה חשוב לדעת...", "Tell renters about the apartment and the area...")} className="w-full rounded-shutaf-md border border-card-border bg-white px-4 py-2.5 text-ink placeholder:text-muted-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange" />
          </div>

          {cloudDraft ? <CloudDraftPhotos draft={acknowledgedDraft ?? cloudDraft} locale={locale} onChange={onCloudPhotosChange} /> : <fieldset>
            <legend className="mb-1 text-sm font-medium text-ink">{t("תמונות הדירה", "Apartment photos")}</legend>
            <p className="mb-3 text-sm text-muted-text">{t("צריך", "Add")} {LISTING_PHOTO_MIN}–{LISTING_PHOTO_MAX} {t("תמונות. אפשר להסיר תמונה לפני הפרסום.", "photos. You can remove photos before publishing.")}</p>
            <label htmlFor="photos" className="flex cursor-pointer flex-col items-center rounded-shutaf-md border-2 border-dashed border-card-border p-6 text-center hover:bg-neutral-bg-soft">
              <span className="mb-2 text-3xl" aria-hidden="true">📸</span>
              <span className="font-medium text-ink">{t("בחירת תמונות", "Choose photos")}</span>
              <span className="mt-1 text-sm text-muted-text">{t("JPG, PNG או WebP · עד 12MB לתמונה", "JPG, PNG or WebP · up to 12MB per photo")}</span>
            </label>
            <input id="photos" name="photos" type="file" accept="image/*" multiple onChange={handlePhotoChange} className="sr-only" aria-label={t("בחירת תמונות לדירה", "Choose apartment photos")} />
            {photos.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((photo, index) => <figure key={`${photo.name}-${photo.lastModified}-${index}`} className="relative aspect-[3/2] overflow-hidden rounded-shutaf-md border border-card-border">
                <Image src={photoUrls[index]} alt={`${t("תמונה", "Photo")} ${index + 1}: ${photo.name}`} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                <button type="button" onClick={() => removePhoto(index)} className="absolute end-2 top-2 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-ink shadow" aria-label={`${t("הסרת תמונה", "Remove photo")} ${index + 1}`}>{t("הסרה", "Remove")}</button>
              </figure>)}
            </div>}
            <p className="mt-2 text-sm text-muted-text" aria-live="polite">{photos.length} / {LISTING_PHOTO_MAX} {t("תמונות נבחרו", "photos selected")}</p>
          </fieldset>}

          {message && <p role="alert" className="rounded-shutaf-md border border-error/30 bg-error/5 p-3 text-sm text-error">{message}</p>}
          {storageError && <p role="alert" className="text-sm text-error">{t('לא הצלחנו לשמור טיוטה במכשיר. בדקו את הגדרות הדפדפן ונסו שוב.', 'Could not save the draft on this device. Check browser storage settings and retry.')}</p>}
          {!cloudDraft && <p className="text-sm text-muted-text">{t('טיוטות נשמרות במכשיר הזה בלבד. לפני היציאה בחרו בשמירת טיוטה וסגירה.', 'Drafts are stored on this device only. Use Save draft and close before leaving.')}</p>}
          {cloudDraft && <div className="space-y-3">
            <p role="status" aria-live="polite" className="text-sm text-muted-text">{photoState.preparing ? t('מכינים תמונות…', 'Preparing photos…') : photoState.errors ? t('יש תמונה שלא הוכנה. אפשר לנסות שוב או להסיר אותה.', 'A photo could not be prepared. Retry it or remove it.') : cloudState.phase === 'saved' ? t('נשמר בחשבון', 'Saved to your account')
              : cloudState.phase === 'saving' ? t('שומרים…', 'Saving…') : cloudState.phase === 'dirty' ? t('יש שינויים שלא נשמרו', 'Unsaved changes')
              : cloudState.phase === 'conflict' ? t('הטיוטה השתנתה במקום אחר. השינויים שלך נשארו כאן.', 'This draft changed elsewhere. Your edits are still here.')
              : t('לא הצלחנו לשמור. השינויים שלך נשארו כאן.', 'Could not save. Your edits are still here.')}</p>
            {cloudState.phase === 'error' && !['NOT_FOUND', 'STATE_UNAVAILABLE', 'PHOTO_CONFLICT'].includes(cloudState.error ?? '') && <Button type="button" variant="ghost" onClick={() => { void cloudQueue.current?.retry(); }}>{t('ניסיון שמירה נוסף', 'Retry save')}</Button>}
            {cloudState.phase === 'error' && ['NOT_FOUND', 'STATE_UNAVAILABLE', 'PHOTO_CONFLICT'].includes(cloudState.error ?? '') && <p role="alert" className="text-sm text-error">{t('הטיוטה אינה זמינה לשמירה. השינויים שלך נשארו במסך הזה.', 'This draft is unavailable for saving. Your edits remain on this screen.')}</p>}
            {cloudState.phase === 'conflict' && <div role="alert" className="rounded-xl border border-card-border p-4">
              <p className="font-semibold">{t('השוואת שינויים', 'Compare changes')}</p>
              <label className="mt-3 block text-sm">{t('השינויים שלך', 'Your edits')}<textarea readOnly rows={6} className="mt-1 w-full rounded border border-card-border p-2" value={localComparison ? formatFields(localComparison, locale) : ''} /></label>
              {!comparison && <Button type="button" variant="ghost" onClick={() => { void loadListingCloudDraft(cloudDraft.id).then(result => { if (result.ok) setComparison(result.data); }).catch(() => {}); }}>{t('טעינת גרסה להשוואה', 'Load version to compare')}</Button>}
              {comparison && <label className="mt-3 block text-sm">{t('הגרסה השמורה בחשבון', 'Saved version')}<textarea readOnly rows={6} className="mt-1 w-full rounded border border-card-border p-2" value={formatFields(comparison.fields, locale)} /></label>}
              {comparison && <div className="mt-4"><p className="mb-2 text-sm font-semibold">{t('התמונות השמורות להשוואה; הבחירה שלך נשארה למעלה.', 'Saved photos for comparison; your selection remains above.')}</p><SavedDraftPhotos draft={comparison} locale={locale} /></div>}
              <Button type="button" variant="ghost" disabled={reloading} onClick={() => { void reloadSavedVersion(); }}>{t('טעינת הגרסה השמורה', 'Load saved version')}</Button>
              {reloadFailed && <p role="alert" className="text-sm text-error">{t('לא הצלחנו לטעון את הגרסה השמורה. השינויים שלך נשארו כאן.', 'Could not load the saved version. Your edits are still here.')}</p>}
            </div>}
            <p className="text-sm text-muted-text">{t('השינויים בטיוטה פרטיים. פרסום מטיוטות שמורות עדיין אינו זמין.', 'Draft changes stay private. Publishing saved drafts is not available yet.')}</p>
          </div>}
          <div className="flex flex-col gap-3 sm:flex-row">
            {!cloudDraft && <Button type="submit" className="flex-1" disabled={submitting || (requiresPrivatePhone && !hasPrivatePhone)}>{submitting ? t("מפרסמים את המודעה…", "Publishing…") : t("פרסום המודעה", "Publish listing")}</Button>}
            <Button type="button" variant="ghost" className="flex-1" onClick={saveDraftAndClose}>{savingDraft ? t('שומרים טיוטה…', 'Saving draft…') : t('שמירת טיוטה וסגירה', 'Save draft and close')}</Button>
          </div>
          {!cloudDraft && <details className="text-sm text-muted-text">
            <summary className="cursor-pointer">{t('אפשרויות נוספות לטיוטה', 'More draft options')}</summary>
            <Button type="button" variant="ghost" className="mt-2" onClick={discardDraft}>{t('מחיקת טיוטה', 'Discard draft')}</Button>
          </details>}
          </fieldset>
          {savingDraft && <p role="status" className="text-sm text-body-text">{t('שומרים טיוטה…', 'Saving draft…')}</p>}
          {submitting && <p role="status" className="text-sm text-body-text">{t("מכינים את התמונות ומפרסמים את המודעה…", "Preparing photos and publishing…")}</p>}
        </form>
      </div>
    </div>
  );
}
