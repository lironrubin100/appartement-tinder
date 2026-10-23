'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import type { DraftDocument } from '@/lib/listings/draft-service-contract';
import type { DraftMediaItem } from '@/lib/listings/draft-media-contract';
import { prepareDraftPhoto } from '@/lib/listings/draft-media';
import { SavedPhoto } from './SavedDraftPhotos';
import type { Locale } from '@/lib/listings/text';

export type CloudPhotoSelection = { items: readonly DraftMediaItem[]; preparing: number; errors: number };
type Entry = { key: string; media?: DraftMediaItem; file?: File; preparing?: boolean; failed?: boolean };
function LocalPhoto({ media, index, locale }: { media: Extract<DraftMediaItem, { kind: 'upload' }>; index: number; locale: Locale }) {
  const [url, setURL] = useState<string | null>(null);
  useEffect(() => {
    let current = true; const value = URL.createObjectURL(media.blob);
    queueMicrotask(() => { if (current) setURL(value); });
    return () => { current = false; URL.revokeObjectURL(value); };
  }, [media.blob]);
  return <figure className="relative aspect-[3/2] overflow-hidden rounded-shutaf-md border border-card-border">
    {url && <Image src={url} alt={(locale === 'en' ? 'Selected photo ' : 'תמונה שנבחרה ') + (index + 1)} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />}
  </figure>;
}
export function CloudDraftPhotos({ draft, locale, onChange }: { draft: DraftDocument; locale: Locale; onChange: (selection: CloudPhotoSelection) => void }) {
  const [entries, setEntries] = useState<Entry[]>(() => draft.photos.map(media => ({ key: media.objectPath, media })));
  const latest = useRef(entries), active = useRef(true);
  const [notice, setNotice] = useState('');
  const en = locale === 'en';
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  function commit(next: Entry[]) {
    if (!active.current) return;
    latest.current = next; setEntries(next);
    onChange({ items: next.flatMap(entry => entry.media ? [entry.media] : []), preparing: next.filter(entry => entry.preparing).length, errors: next.filter(entry => entry.failed).length });
  }
  async function prepare(key: string, file: File) {
    const result = await prepareDraftPhoto(file, key);
    if (!active.current || !latest.current.some(entry => entry.key === key)) return;
    commit(latest.current.map(entry => entry.key !== key ? entry : result.ok
      ? { key, media: result.data } : { key, file, failed: true }));
  }
  function add(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = '';
    const slots = Math.max(0, 8 - latest.current.length), accepted = files.slice(0, slots);
    setNotice(files.length > slots ? (en ? 'A draft can contain up to 8 photos.' : 'אפשר לשמור עד 8 תמונות בטיוטה.') : '');
    const added = accepted.map(file => ({ key: crypto.randomUUID(), file, preparing: true }));
    commit([...latest.current, ...added]);
    for (const entry of added) void prepare(entry.key, entry.file);
  }
  function move(index: number, direction: number) {
    const next = [...latest.current], target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; commit(next);
  }
  return <fieldset aria-label={en ? 'Draft photos' : 'תמונות הטיוטה'} className="space-y-3">
    <legend className="font-medium text-ink">{en ? 'Apartment photos' : 'תמונות הדירה'}</legend>
    <p className="text-sm text-muted-text">{en ? 'Keep up to 8 photos in a draft. Publishing requires 3–8 photos.' : 'אפשר לשמור עד 8 תמונות בטיוטה. לפרסום נדרשות 3–8 תמונות.'}</p>
    <label className="block text-sm font-medium text-ink">{en ? 'Choose apartment photos' : 'בחירת תמונות לדירה'}
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={entries.length >= 8} onChange={add}
        className="mt-2 block w-full text-sm file:me-3 file:rounded-xl file:border file:border-card-border file:bg-white file:px-4 file:py-3 file:text-teal" />
    </label>
    {notice && <p role="alert" className="text-sm text-error">{notice}</p>}
    {!entries.length && <p className="text-sm text-muted-text">{en ? 'No saved photos.' : 'אין תמונות שמורות.'}</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {entries.map((entry, index) => <div key={entry.key} data-testid="draft-photo" className="min-w-0 rounded-xl border border-card-border p-2">
        {entry.media ? entry.media.kind === 'upload' ? <LocalPhoto media={entry.media} index={index} locale={locale} />
          : <SavedPhoto draft={draft} photo={entry.media} index={index} locale={locale} />
          : <div className="aspect-[3/2] p-2 text-xs text-muted-text" role={entry.failed ? 'alert' : 'status'}>{entry.preparing ? (en ? 'Preparing photo…' : 'מכינים תמונה…') : (en ? 'Could not prepare photo.' : 'לא הצלחנו להכין את התמונה.')}</div>}
        {entry.failed && <button type="button" className="min-h-11 text-sm text-teal" onClick={() => {
          const file = entry.file; if (!file) return;
          commit(latest.current.map(item => item.key === entry.key ? { key: item.key, file, preparing: true } : item)); void prepare(entry.key, file);
        }}>{en ? 'Retry photo' : 'ניסיון נוסף לתמונה'}</button>}
        <div className="mt-2 flex flex-wrap justify-between gap-1">
          <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={(en ? 'Move photo earlier ' : 'הקדמת תמונה ') + (index + 1)} className="min-h-11 min-w-11 rounded-lg border border-card-border text-teal disabled:opacity-40">↑</button>
          <button type="button" disabled={index === entries.length - 1} onClick={() => move(index, 1)} aria-label={(en ? 'Move photo later ' : 'דחיית תמונה ') + (index + 1)} className="min-h-11 min-w-11 rounded-lg border border-card-border text-teal disabled:opacity-40">↓</button>
          <button type="button" onClick={() => commit(latest.current.filter(item => item.key !== entry.key))} aria-label={(en ? 'Remove photo ' : 'הסרת תמונה ') + (index + 1)} className="min-h-11 rounded-lg px-2 text-xs text-error">{en ? 'Remove' : 'הסרה'}</button>
        </div>
      </div>)}
    </div>
    <p className="text-sm text-muted-text" aria-live="polite">{entries.length} / 8 {en ? 'photos selected' : 'תמונות נבחרו'}</p>
  </fieldset>;
}
