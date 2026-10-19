'use client';

import { useEffect, useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/Input';
import type { AddressSuggestion } from '@/lib/listings/address-types';
import { isIsraeliLocation } from '@/lib/listings/address-types';
import type { Locale } from '@/lib/listings/text';

const PrivateLocationPicker = dynamic(() => import('./PrivateLocationPicker'), { ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-shutaf-md bg-neutral-bg-soft" /> });

export default function AddressField({ locale }: { locale: Locale }) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const id = useId();
  const [address, setAddress] = useState('');
  const [selected, setSelected] = useState<AddressSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error' | 'limited'>('idle');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const [manual, setManual] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [city, setCity] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const point = latitude && longitude && isIsraeliLocation(Number(latitude), Number(longitude))
    ? { latitude: Number(latitude), longitude: Number(longitude) } : null;

  useEffect(() => {
    if (manual || selected || address.trim().length < 3) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const response = await fetch('/api/geocode', { method: 'POST', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: address.trim(), language: locale }), signal: controller.signal });
        if (!response.ok) {
          if (current) { setStatus(response.status === 429 ? 'limited' : 'error'); setSuggestions([]); }
          return;
        }
        const body = await response.json();
        if (!current) return;
        setSuggestions(body.suggestions);
        setActive(-1);
        setStatus(body.suggestions.length ? 'idle' : 'empty');
      } catch {
        if (current) { setSuggestions([]); setStatus('error'); }
      }
    }, 300);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [address, locale, manual, selected, retry]);

  function select(suggestion: AddressSuggestion) {
    setSelected(suggestion); setAddress(suggestion.label); setCity(suggestion.city);
    setLatitude(String(suggestion.latitude)); setLongitude(String(suggestion.longitude));
    setConfirmed(false); setSuggestions([]); setStatus('idle'); setOpen(false); setActive(-1);
  }
  function edit(value: string) {
    setAddress(value); setSelected(null); setConfirmed(false); setSuggestions([]); setStatus('idle'); setActive(-1); setOpen(true);
    if (!manual) { setLatitude(''); setLongitude(''); setCity(''); }
  }

  return (
    <div className="space-y-3" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <Input id={id} name="address" label={t('כתובת מדויקת', 'Exact address')} value={address}
        onChange={(event) => edit(event.target.value)} placeholder={t('התחילו להקליד רחוב, מספר ועיר', 'Start typing a street, number and city')}
        required maxLength={200} autoComplete="off" role="combobox" aria-autocomplete="list" aria-controls={`${id}-options`}
        aria-expanded={!manual && open && suggestions.length > 0}
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        onFocus={() => setOpen(true)} onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpen(false); setActive(-1); }
          if (!manual && suggestions.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault(); setOpen(true);
            setActive((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length);
          }
          if (event.key === 'Enter' && open && suggestions.length) {
            event.preventDefault(); if (active >= 0) select(suggestions[active]);
          }
        }} helperText={t('הכתובת והמיקום המדויקים נשארים פרטיים. החיפוש משתמש ב־Geoapify.', 'The exact address and location stay private. Address search uses Geoapify.')} />
      {!manual && open && suggestions.length > 0 && (
        <ul id={`${id}-options`} role="listbox" aria-label={t('הצעות לכתובת', 'Address suggestions')} className="overflow-hidden rounded-shutaf-md border border-card-border bg-white shadow-sm">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.token} role="option" id={`${id}-option-${index}`} aria-selected={index === active}
              className={index === active ? 'bg-neutral-bg-soft' : ''}>
              <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(suggestion)} className="min-h-11 w-full px-3 py-3 text-start text-sm hover:bg-neutral-bg-soft">{suggestion.label}</button>
            </li>
          ))}
        </ul>
      )}
      <div role="status" aria-live="polite" className="text-sm text-muted-text">
        {status === 'loading' && <span className="block h-5 animate-pulse rounded bg-neutral-bg-soft">{t('מחפשים כתובות…', 'Searching addresses…')}</span>}
        {status === 'empty' && t('לא נמצאה כתובת מתאימה. נסו להוסיף עיר או סמנו מיקום ידנית.', 'No matching address. Add a city or choose the location manually.')}
        {status === 'error' && t('חיפוש הכתובות אינו זמין כרגע. אפשר לנסות שוב או להזין ידנית.', 'Address search is unavailable. Retry or enter the location manually.')}
        {status === 'limited' && t('בוצעו בקשות רבות. המתינו דקה ונסו שוב, או הזינו ידנית.', 'Too many requests. Wait a minute and retry, or enter the location manually.')}
      </div>
      {(status === 'error' || status === 'limited') && <button type="button" onClick={() => setRetry((value) => value + 1)} className="min-h-11 text-sm text-teal underline">{t('ניסיון חוזר', 'Retry')}</button>}
      <p className="text-xs text-muted-text">Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline">Geoapify</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a></p>
      <button type="button" className="min-h-11 text-sm text-teal underline" onClick={() => {
        setManual(!manual); setSelected(null); setSuggestions([]); setStatus('idle'); setConfirmed(false);
        if (manual) { setLatitude(''); setLongitude(''); }
      }}>{manual ? t('חזרה לחיפוש כתובת', 'Back to address search') : t('הכתובת לא נמצאה? הזנה ותיקון מיקום ידניים', 'Address not found? Enter and adjust location manually')}</button>
      <input type="hidden" name="locationMode" value={manual ? 'manual' : 'provider'} />
      <input type="hidden" name="locationToken" value={selected?.token ?? ''} />
      {!manual && <><input type="hidden" name="latitude" value={latitude} /><input type="hidden" name="longitude" value={longitude} /></>}
      {(manual || selected) && (
        <div className="space-y-3 rounded-shutaf-md border border-card-border p-3">
          <p className="text-sm text-ink">{manual
            ? t('מיקום ידני: הזינו עיר, סמנו את הבניין במפה ואשרו את המיקום.', 'Manual location: enter the city, select the building on the map and confirm.')
            : t('הכתובת נבחרה. ודאו שהמספר והמיקום נכונים; אפשר לעבור לתיקון ידני.', 'Address selected. Check the house number and location; use manual adjustment if needed.')}</p>
          {manual && <Input name="locationCity" label={t('עיר', 'City')} value={city} maxLength={100} required onChange={(event) => { setCity(event.target.value); setConfirmed(false); }} />}
          <PrivateLocationPicker point={point} onChange={(next) => {
            setManual(true); setSelected(null); setConfirmed(false);
            setLatitude(next.latitude.toFixed(6)); setLongitude(next.longitude.toFixed(6));
          }} />
          {manual && <div className="grid gap-3 sm:grid-cols-2">
            <Input name="latitude" label={t('קו רוחב', 'Latitude')} type="number" step="any" required value={latitude} onChange={(event) => { setLatitude(event.target.value); setConfirmed(false); }} />
            <Input name="longitude" label={t('קו אורך', 'Longitude')} type="number" step="any" required value={longitude} onChange={(event) => { setLongitude(event.target.value); setConfirmed(false); }} />
          </div>}
          <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="locationConfirmed" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="size-4 accent-orange" />
            {t('בדקתי שהכתובת והמיקום במפה נכונים', 'I checked that the address and map location are correct')}
          </label>
        </div>
      )}
    </div>
  );
}
