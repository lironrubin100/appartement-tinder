'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { LISTING_PHOTO_MAX, LISTING_PHOTO_MIN, validateListingDraft } from '@/lib/listings/validation';

export default function ComposeForm({ hasPrivatePhone }: { hasPrivatePhone: boolean }) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [message, setMessage] = useState('');
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasPrivatePhone) {
      setMessage('לפני הפרסום יש להוסיף מספר טלפון פרטי בהגדרות הפרופיל.');
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const validationError = validateListingDraft({
      title: String(formData.get('title') ?? ''),
      price: Number(formData.get('price')),
      location: String(formData.get('location') ?? ''),
      bedrooms: Number(formData.get('bedrooms')),
      availableFrom: String(formData.get('availableFrom') ?? ''),
      description: String(formData.get('description') ?? ''),
      photos,
    });
    if (validationError) setMessage(validationError);
    else setMessage('הפרטים תקינים. הפרסום יופעל לאחר קבלת החלטה על פרטיות מיקום המודעות.');
  }

  return (
    <div className="min-h-[calc(100vh-80px)] w-full bg-page-bg p-4 md:p-8">
      <div className="mx-auto max-w-2xl rounded-shutaf-lg border border-card-border bg-white p-6 shadow-sm md:p-8">
        <h1 className="mb-2 text-3xl font-bold text-ink">פרסום דירה חדשה</h1>
        <p className="mb-8 text-sm text-muted-text">מודעה אחת לדירה שלמה. מחיר אחד לכל הדירה.</p>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <Input name="title" label="כותרת המודעה" placeholder="דירת 3 חדרים ליד האוניברסיטה" required maxLength={100} />
          <div className="grid gap-6 sm:grid-cols-2">
            <Input name="price" label="מחיר חודשי לכל הדירה (₪)" placeholder="3500" type="number" min="1" step="1" required />
            <Input name="bedrooms" label="מספר חדרים בדירה" placeholder="3" type="number" min="1" max="20" step="1" required />
          </div>
          <Input name="location" label="אזור או כתובת" placeholder="שכונה / רחוב" required maxLength={200} helperText="הצגת מיקום במודעה ממתינה להחלטת פרטיות." />
          <Input name="availableFrom" label="תאריך כניסה" type="date" required />
          <p className="rounded-shutaf-md bg-neutral-bg-soft p-3 text-sm text-muted-text">
            {hasPrivatePhone
              ? 'הטלפון הפרטי המקושר לחשבון ישמש ליצירת קשר. הוא אינו מוצג במודעה.'
              : 'לפני הפרסום יש להוסיף מספר טלפון פרטי בהגדרות הפרופיל.'}
          </p>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-ink">תיאור הדירה</label>
            <textarea id="description" name="description" maxLength={2000} rows={4} placeholder="ספרו על הדירה, האזור ומה חשוב לדעת..." className="w-full rounded-shutaf-md border border-card-border bg-white px-4 py-2.5 text-ink placeholder:text-muted-text focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange" />
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium text-ink">תמונות הדירה</legend>
            <p className="mb-3 text-sm text-muted-text">צריך {LISTING_PHOTO_MIN}–{LISTING_PHOTO_MAX} תמונות. אפשר להסיר תמונה לפני הפרסום.</p>
            <label htmlFor="photos" className="flex cursor-pointer flex-col items-center rounded-shutaf-md border-2 border-dashed border-card-border p-6 text-center hover:bg-neutral-bg-soft">
              <span className="mb-2 text-3xl" aria-hidden="true">📸</span>
              <span className="font-medium text-ink">בחירת תמונות</span>
              <span className="mt-1 text-sm text-muted-text">JPG, PNG או WebP · עד 12MB לתמונה</span>
            </label>
            <input id="photos" type="file" accept="image/*" multiple onChange={handlePhotoChange} className="sr-only" aria-label="בחירת תמונות לדירה" />
            {photos.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((photo, index) => <figure key={`${photo.name}-${photo.lastModified}-${index}`} className="relative overflow-hidden rounded-shutaf-md border border-card-border">
                <img src={photoUrls[index]} alt={`תמונה ${index + 1}: ${photo.name}`} className="aspect-[3/2] w-full object-cover" />
                <button type="button" onClick={() => removePhoto(index)} className="absolute end-2 top-2 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-ink shadow" aria-label={`הסרת תמונה ${index + 1}`}>הסרה</button>
              </figure>)}
            </div>}
            <p className="mt-2 text-sm text-muted-text" aria-live="polite">נבחרו {photos.length} מתוך {LISTING_PHOTO_MAX} תמונות</p>
          </fieldset>

          {message && <p role="alert" className="rounded-shutaf-md border border-error/30 bg-error/5 p-3 text-sm text-error">{message}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="flex-1" disabled>פרסום מושהה עד להחלטה על פרטיות המיקום</Button>
            <Button type="button" variant="ghost" className="flex-1" onClick={() => history.back()}>ביטול</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
