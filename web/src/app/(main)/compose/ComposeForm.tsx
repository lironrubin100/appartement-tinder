'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { LISTING_PHOTO_MAX, LISTING_PHOTO_MIN, validateListingDraft } from '@/lib/listings/validation';
import { publishListing } from '@/lib/listings/actions';
import { resizeImage } from '@/utils/photos';
import { listingError, localePrefix, type Locale } from '@/lib/listings/text';
import AddressField from '@/components/map/AddressField';

export default function ComposeForm({ hasPrivatePhone, locale = 'he' }: { hasPrivatePhone: boolean; locale?: Locale }) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [roomPrices, setRoomPrices] = useState<string[]>(['']);
  const [bedrooms, setBedrooms] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  const photoUrls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos]);

  useEffect(() => () => photoUrls.forEach(URL.revokeObjectURL), [photoUrls]);

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
    if (busy.current) return;
    if (!hasPrivatePhone) {
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

  return (
    <div className="min-h-[calc(100vh-80px)] w-full bg-page-bg p-4 md:p-8">
      <div className="mx-auto max-w-2xl rounded-shutaf-lg border border-card-border bg-white p-6 shadow-sm md:p-8">
        <h1 className="mb-2 text-3xl font-bold text-ink">{t("פרסום דירה חדשה", "Publish an apartment")}</h1>
        <p className="mb-8 text-sm text-muted-text">{t("מודעה אחת לדירה. הוסיפו את החדרים הפנויים ואת המחיר החודשי של כל אחד.", "Add the available rooms and the monthly price for each room.")}</p>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <fieldset disabled={submitting} className="space-y-6">
          <Input name="title" label={t("כותרת המודעה", "Listing title")} placeholder={t("דירת 3 חדרים ליד האוניברסיטה", "3-bedroom apartment near the university")} required maxLength={100} />
          <div className="grid gap-6 sm:grid-cols-2">
            <Input name="bedrooms" label={t("מספר חדרים בדירה", "Bedrooms in the apartment")} placeholder="3" type="number" min="1" max="20" step="1" required value={bedrooms} onChange={(event) => { setBedrooms(event.target.value); setMessage(''); }} />
            <Input name="availableFrom" label={t("תאריך כניסה", "Available from")} type="date" required />
          </div>
          <AddressField locale={locale} />

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
                      type="number"
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
            <input name="billsIncluded" type="checkbox" className="mt-0.5 size-4 accent-orange" />
            <span><strong className="font-semibold">{t("החשבונות כלולים במחיר", "Bills included")}</strong><span className="mt-1 block text-muted-text">{t("סמנו רק אם המחיר של כל חדר כולל חשבונות שוטפים.", "Select only if every room price includes bills.")}</span></span>
          </label>
          <p className="rounded-shutaf-md bg-neutral-bg-soft p-3 text-sm text-muted-text">
            {hasPrivatePhone
              ? t("הטלפון הפרטי המקושר לחשבון ישמש ליצירת קשר. הוא אינו מוצג במודעה.", "Your account phone stays private. All inquiries happen in Shutaf.")
              : <>{t("לפני הפרסום יש להוסיף מספר טלפון פרטי.", "Add a private phone number before publishing.")} <Link href="/profile/edit" className="text-teal underline">{t("עריכת פרופיל", "Edit profile")}</Link></>}
          </p>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-ink">{t("תיאור הדירה", "Apartment description")}</label>
            <textarea id="description" name="description" maxLength={2000} rows={4} placeholder={t("ספרו על הדירה, האזור ומה חשוב לדעת...", "Tell renters about the apartment and the area...")} className="w-full rounded-shutaf-md border border-card-border bg-white px-4 py-2.5 text-ink placeholder:text-muted-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange" />
          </div>

          <fieldset>
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
          </fieldset>

          {message && <p role="alert" className="rounded-shutaf-md border border-error/30 bg-error/5 p-3 text-sm text-error">{message}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="flex-1" disabled={submitting || !hasPrivatePhone}>{submitting ? t("מפרסמים את המודעה…", "Publishing…") : t("פרסום המודעה", "Publish listing")}</Button>
            <Button type="button" variant="ghost" className="flex-1" onClick={() => history.back()}>{t("ביטול", "Cancel")}</Button>
          </div>
          </fieldset>
          {submitting && <p role="status" className="text-sm text-body-text">{t("מכינים את התמונות ומפרסמים את המודעה…", "Preparing photos and publishing…")}</p>}
        </form>
      </div>
    </div>
  );
}
