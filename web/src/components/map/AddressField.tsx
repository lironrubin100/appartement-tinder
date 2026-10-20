'use client';

import { useEffect, useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/Input';
import type { AddressSuggestion, LocationCategory, LocationKind } from '@/lib/listings/address-types';
import { isIsraeliLocation, locationCategories } from '@/lib/listings/address-types';
import type { Locale } from '@/lib/listings/text';
import type { SavedAddress } from '@/lib/listings/draft-store';

const PrivateLocationPicker = dynamic(() => import('./PrivateLocationPicker'), { ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-shutaf-md bg-neutral-bg-soft" /> });

export default function AddressField({ locale, initialDraft, onDraftChange }: { locale: Locale; initialDraft?: SavedAddress | null; onDraftChange?: (draft: SavedAddress) => void }) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const id = useId();
  const searchRoot = useRef<HTMLDivElement>(null);
  const [address, setAddress] = useState(initialDraft?.address ?? '');
  const [selected, setSelected] = useState<AddressSuggestion | null>(initialDraft?.selected ?? null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error' | 'limited'>('idle');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const [manual, setManual] = useState(initialDraft?.manual ?? false);
  const [latitude, setLatitude] = useState(initialDraft?.latitude ?? '');
  const [longitude, setLongitude] = useState(initialDraft?.longitude ?? '');
  const [city, setCity] = useState(initialDraft?.city ?? '');
  const [confirmed, setConfirmed] = useState(initialDraft?.confirmed ?? false);
  const [lookupCode, setLookupCode] = useState('idle');
  const [category, setCategory] = useState<LocationCategory>('all');
  const [scope, setScope] = useState('');
  const kindOf = (suggestion: AddressSuggestion): LocationKind => suggestion.kind ?? (suggestion.accuracy === 'street' ? 'street' : 'address');
  const groups: { kind: LocationKind; label: string }[] = [
    { kind: 'address', label: t('כתובות', 'Addresses') }, { kind: 'city', label: t('עיר / יישוב', 'City / town') },
    { kind: 'region', label: t('אזור', 'Region') }, { kind: 'neighborhood', label: t('שכונה', 'Neighborhood') },
    { kind: 'street', label: t('רחוב', 'Street') },
  ];
  const ordered = groups.flatMap(({ kind }) => suggestions.filter((suggestion) => kindOf(suggestion) === kind));
  const categoryLabel = (value: LocationCategory) => value === 'all' ? t('הכול', 'All') : groups.find(({ kind }) => kind === value)!.label;
  const point = latitude && longitude && isIsraeliLocation(Number(latitude), Number(longitude))
    ? { latitude: Number(latitude), longitude: Number(longitude) } : null;

  useEffect(() => {
    onDraftChange?.({ address, selected, manual, latitude, longitude, city, confirmed });
  }, [address, selected, manual, latitude, longitude, city, confirmed, onDraftChange]);

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, id, open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchRoot.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  useEffect(() => {
    if (manual || selected || address.trim().length < 3) return;
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const response = await fetch('/api/geocode', { method: 'POST', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: address.trim(), language: locale, category, scope }), signal: controller.signal });
        if (current) setLookupCode(`http_${response.status}`);
        if (!response.ok) {
          if (current) { setStatus(response.status === 429 ? 'limited' : 'error'); setSuggestions([]); setOpen(false); }
          return;
        }
        const body = await response.json();
        if (!current) return;
        setSuggestions(body.suggestions);
        setActive(-1);
        setStatus(body.suggestions.length ? 'idle' : 'empty');
      } catch {
        if (current) { setSuggestions([]); setStatus('error'); setOpen(false); setLookupCode('transport_or_response_error'); }
      }
    }, 300);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [address, locale, manual, selected, retry, category, scope]);

  function select(suggestion: AddressSuggestion) {
    if (['city', 'region', 'neighborhood'].includes(kindOf(suggestion))) {
      setScope(suggestion.label); setAddress(''); setCategory('all'); setSelected(null);
      setLatitude(''); setLongitude(''); setCity(''); setConfirmed(false);
      setSuggestions([]); setStatus('idle'); setOpen(true); setActive(-1);
      return;
    }
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
      {scope && !manual && <div className="flex items-center justify-between gap-2 rounded-shutaf-md bg-neutral-bg-soft px-3 text-sm">
        <span>{t('חיפוש בתוך: ', 'Searching within: ')}<bdi>{scope}</bdi></span>
        <button type="button" className="min-h-11 px-2 text-teal underline" onClick={() => { setScope(''); edit(address); }}>
          {t('כל הארץ', 'All Israel')}
        </button>
      </div>}
      <div className="relative" ref={searchRoot}>
      <Input id={id} name="address" label={t('כתובת מדויקת', 'Exact address')} value={address}
        onChange={(event) => edit(event.target.value)} placeholder={scope ? t('הקלידו רחוב ומספר בית', 'Type a street and house number') : t('עיר, יישוב, שכונה או כתובת מלאה', 'City, town, neighborhood or full address')}
        required maxLength={200} autoComplete="off" role="combobox" aria-autocomplete="list" aria-controls={`${id}-options`}
        aria-expanded={!manual && open}
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        onFocus={() => setOpen(true)} onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpen(false); setActive(-1); }
          if (!manual && suggestions.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault(); setOpen(true);
            setActive((index) => index < 0 ? (event.key === 'ArrowDown' ? 0 : ordered.length - 1)
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + ordered.length) % ordered.length);
          }
          if (event.key === 'Enter' && open && !manual) {
            event.preventDefault(); if (active >= 0) select(ordered[active]);
          }
        }} aria-describedby={`${id}-privacy`} />
      {!manual && open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-shutaf-md border border-card-border bg-white shadow-lg">
          <div role="group" aria-label={t('סוג מקום', 'Location type')} className="flex flex-wrap gap-1 border-b border-card-border p-2">
            {locationCategories.map((value) => <button key={value} type="button" aria-pressed={category === value}
              onMouseDown={(event) => event.preventDefault()} onClick={() => {
                setCategory(value); setSuggestions([]); setActive(-1); setStatus('idle'); setOpen(true);
              }} className={`min-h-11 rounded-shutaf-md px-3 text-sm focus-visible:outline-2 focus-visible:outline-orange ${category === value ? 'bg-ink text-white' : 'text-ink hover:bg-neutral-bg-soft'}`}>
              {categoryLabel(value)}
            </button>)}
          </div>
          <ul id={`${id}-options`} role="listbox" aria-label={t('הצעות לכתובת', 'Address suggestions')} className="max-h-72 overflow-y-auto overscroll-contain">
            {groups.map(({ kind, label }) => {
              const matches = ordered.filter((suggestion) => kindOf(suggestion) === kind);
              return matches.length > 0 && <li key={kind} role="group" aria-label={label}>
                <div aria-hidden="true" className="bg-neutral-bg-soft px-3 py-2 text-xs font-semibold text-muted-text">{label}</div>
                <ul role="presentation">{matches.map((suggestion) => {
                  const index = ordered.indexOf(suggestion);
                  return <li key={`${kind}:${suggestion.label}`} role="option" id={`${id}-option-${index}`} aria-selected={index === active}
                    className={index === active ? 'bg-neutral-bg-soft' : ''}>
                    <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()}
                      onClick={() => select(suggestion)} className="min-h-11 w-full px-3 py-3 text-start text-sm hover:bg-neutral-bg-soft">
                      <bdi className="block" dir={locale === 'he' ? 'rtl' : 'ltr'}>{suggestion.label}</bdi>
                      {suggestion.accuracy === 'street' && <span className="mt-1 block text-xs text-muted-text">{t('התאמה לרחוב — בדקו את מספר הבית במפה', 'Street-level match — check the house number on the map')}</span>}
                    </button>
                  </li>;
                })}</ul>
              </li>;
            })}
          </ul>
          {!ordered.length && <p className="px-3 py-4 text-sm text-muted-text">{address.trim().length < 3
            ? t('הקלידו לפחות 3 תווים. אפשר להקליד כתובת מלאה בכל סדר.', 'Type at least 3 characters. You can enter a full address in any order.')
            : status === 'loading' ? t('מחפשים התאמות…', 'Searching for matches…')
              : status === 'empty' ? t('לא נמצאו התאמות. נסו סוג מקום אחר או כתובת מלאה.', 'No matches. Try another location type or a full address.')
                : t('ההצעות יופיעו כאן לפי סוג המקום.', 'Suggestions will appear here grouped by location type.')}</p>}
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
            setManual(true); setSelected(null); setSuggestions([]); setStatus('idle'); setConfirmed(false); setOpen(false);
          }} className="min-h-11 w-full border-t border-card-border px-3 text-start text-sm text-teal underline">
            {t('הכתובת חסרה? הזנה ידנית', 'Address missing? Enter manually')}
          </button>
        </div>
      )}
      </div>
      <p id={`${id}-privacy`} className="text-sm text-muted-text">{t('הכתובת והמיקום המדויקים נשארים פרטיים. החיפוש משתמש ב־Geoapify.', 'The exact address and location stay private. Address search uses Geoapify.')}</p>
      <div role="status" aria-live="polite" data-lookup-code={lookupCode} className="text-sm text-muted-text">
        {status === 'loading' && <span className="block h-5 animate-pulse rounded bg-neutral-bg-soft">{t('מחפשים כתובות…', 'Searching addresses…')}</span>}
        {status === 'empty' && t('לא נמצאה כתובת מתאימה. נסו להוסיף עיר או סמנו מיקום ידנית.', 'No matching address. Add a city or choose the location manually.')}
        {status === 'error' && t('חיפוש הכתובות אינו זמין כרגע. אפשר לנסות שוב או להזין ידנית.', 'Address search is unavailable. Retry or enter the location manually.')}
        {status === 'limited' && t('בוצעו בקשות רבות. המתינו דקה ונסו שוב, או הזינו ידנית.', 'Too many requests. Wait a minute and retry, or enter the location manually.')}
      </div>
      {(status === 'error' || status === 'limited') && <button type="button" onClick={() => { setRetry((value) => value + 1); setOpen(true); }} className="min-h-11 text-sm text-teal underline">{t('ניסיון חוזר', 'Retry')}</button>}
      <p className="text-xs text-muted-text">Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer" className="underline">Geoapify</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a></p>
      <button type="button" className="min-h-11 text-sm text-teal underline" onClick={() => {
        setManual(!manual); setSelected(null); setSuggestions([]); setStatus('idle'); setConfirmed(false); setOpen(false);
        if (manual) { setLatitude(''); setLongitude(''); }
      }}>{manual ? t('חזרה לחיפוש כתובת', 'Back to address search') : t('הכתובת לא נמצאה? הזנה ותיקון מיקום ידניים', 'Address not found? Enter and adjust location manually')}</button>
      <input type="hidden" name="locationMode" value={manual ? 'manual' : 'provider'} />
      <input type="hidden" name="locationToken" value={selected?.token ?? ''} />
      {!manual && <><input type="hidden" name="latitude" value={latitude} /><input type="hidden" name="longitude" value={longitude} /></>}
      {(manual || selected) && (
        <div className="space-y-3 rounded-shutaf-md border border-card-border p-3">
          {!manual && selected && (selected.street || selected.city) && <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[[t('עיר / יישוב', 'City / town'), selected.city], [t('רחוב', 'Street'), selected.street],
              [t('מספר בית', 'House number'), selected.houseNumber]].map(([label, value]) => value && <div key={label}>
              <dt className="text-xs text-muted-text">{label}</dt><dd><bdi>{value}</bdi></dd>
            </div>)}
          </dl>}
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
