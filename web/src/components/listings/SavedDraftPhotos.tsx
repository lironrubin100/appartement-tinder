'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { DraftDocument } from '@/lib/listings/draft-service-contract';
import type { DraftPhotoReference } from '@/lib/listings/draft-types';
import { previewDraftPhoto } from '@/lib/listings/draft-media';
import type { Locale } from '@/lib/listings/text';

export function SavedPhoto({ draft, photo, index, locale }: { draft: DraftDocument; photo: DraftPhotoReference; index: number; locale: Locale }) {
  const [preview, setPreview] = useState<{url: string; expiresAt: number} | null>(null);
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const result = await previewDraftPhoto(draft, photo);
      if (!active) return;
      if (!result.ok) { setPreview(null); setFailed(true); return; }
      setFailed(false); setPreview(result.data);
      timer = setTimeout(() => { if (active) { setPreview(null); void load(); } }, Math.max(1000, result.data.expiresAt - Date.now() - 5000));
    };
    void load();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [draft, photo, retry]);
  return <figure className="relative aspect-[3/2] overflow-hidden rounded-shutaf-md border border-card-border bg-neutral-bg-soft">
    {preview && <Image src={preview.url} alt={(locale === 'en' ? 'Saved photo ' : 'תמונה שמורה ') + (index + 1)} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" onError={() => { setPreview(null); setFailed(true); }} />}
    {!preview && <div className="p-3 text-sm text-muted-text" role="status">{failed ? (locale === 'en' ? 'Preview unavailable.' : 'התצוגה אינה זמינה.') : (locale === 'en' ? 'Loading photo…' : 'טוענים תמונה…')}</div>}
    {failed && <button type="button" onClick={() => setRetry(value => value + 1)} className="absolute bottom-1 end-1 rounded-lg bg-white px-3 py-2 text-sm text-teal">{locale === 'en' ? 'Retry' : 'ניסיון נוסף'}</button>}
  </figure>;
}
export function SavedDraftPhotos({ draft, locale }: { draft: DraftDocument; locale: Locale }) {
  return <fieldset><legend className="mb-2 font-medium text-ink">{locale === 'en' ? 'Saved apartment photos' : 'תמונות הדירה השמורות'}</legend>
    {draft.photos.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {draft.photos.map((photo, index) => <SavedPhoto key={photo.objectPath} draft={draft} photo={photo} index={index} locale={locale} />)}
    </div> : <p className="text-sm text-muted-text">{locale === 'en' ? 'No saved photos.' : 'אין תמונות שמורות.'}</p>}
    <p className="mt-2 text-sm text-muted-text">{locale === 'en' ? 'Saved photos are shown for viewing.' : 'התמונות השמורות מוצגות לצפייה.'}</p>
  </fieldset>;
}
