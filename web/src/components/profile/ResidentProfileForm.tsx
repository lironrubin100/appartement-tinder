'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { uploadProfilePhoto } from '@/utils/photos';
import { Button } from '@/components/ui';
import { ResidentFields } from './ResidentFields';
import { parseResidentFacts, parseResidentPreferences, ContractError, isRecord } from '@/lib/contracts/taxonomy';
import { initialFacts, initialPreferences, validBirthDate, ageAt, type Lifestyle, type PrivateLifestyle } from '@/lib/resident-profile';
import { localePath, type Locale } from '@/utils/navigation';
import type { Database, Json } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Private = Database['public']['Tables']['profile_private']['Row'];
type Photo = Database['public']['Tables']['profile_photos']['Row'];
export function ResidentProfileForm({ profile, privateProfile, lifestyle, privateLifestyle, initialPhotos, locale, returnTo, editing = false }: {
  profile: Profile; privateProfile: Private | null; lifestyle: Lifestyle; privateLifestyle: PrivateLifestyle;
  initialPhotos: Photo[]; locale: Locale; returnTo: string; editing?: boolean;
}) {
  const router = useRouter();
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const [name, setName] = useState(privateProfile?.full_name ?? profile.name);
  const [birthDate, setBirthDate] = useState(privateProfile?.birth_date?.split('-').reverse().join('/') ?? '');
  const [phone, setPhone] = useState(privateProfile?.phone ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [facts, setFacts] = useState(initialFacts(lifestyle?.facts));
  const [preferences, setPreferences] = useState(initialPreferences(privateLifestyle?.preferences));
  const [disclosed, setDisclosed] = useState(lifestyle?.disclosed_fields ?? []);
  const [revision, setRevision] = useState(lifestyle?.revision ?? 0);
  const [photos, setPhotos] = useState(initialPhotos);
  const [badges, setBadges] = useState(profile.public_badges);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const request = useRef<{ payload: string; key: string } | null>(null);
  const inputClass = 'w-full rounded-xl border border-card-border bg-white p-3';
  async function upload(file?: File) {
    if (!file || busy || photos.length >= 6) return;
    setBusy(true); setError('');
    const client = createClient(); let uploaded: string | null = null;
    try {
      uploaded = await uploadProfilePhoto(client, profile.id, file);
      const result = await client.from('profile_photos').insert({ profile_id: profile.id, url: uploaded, display_order: photos.length }).select().single();
      if (result.error || !result.data) throw new Error('photo insert failed');
      setPhotos(current => [...current, result.data]);
    } catch {
      if (uploaded) await client.storage.from('profile-photos').remove([new URL(uploaded).pathname.split('/profile-photos/')[1]]);
      setError(t('לא הצלחנו להעלות תמונה. נסו קובץ אחר.', 'Could not upload. Please try another image.'));
    } finally { setBusy(false); }
  }
  async function remove(photo: Photo) {
    if (busy || (profile.onboarded && photos.length <= 1)) return;
    setBusy(true); setError('');
    try {
      const client = createClient();
      const result = await client.from('profile_photos').delete().eq('id', photo.id).eq('profile_id', profile.id);
      if (result.error) throw result.error;
      setPhotos(current => current.filter(p => p.id !== photo.id));
      const path = new URL(photo.url).pathname.split('/profile-photos/')[1];
      if (path?.startsWith(`${profile.id}/`)) {
        const cleanup = await client.storage.from('profile-photos').remove([path]);
        if (cleanup.error) setError(t('התמונה הוסרה מהפרופיל, אך ניקוי הקובץ לא הושלם.', 'Photo removed from profile, but file cleanup is incomplete.'));
      }
    } catch { setError(t('לא הצלחנו להסיר את התמונה.', 'Could not remove the photo.')); }
    finally { setBusy(false); }
  }
  async function makePrimary(photo: Photo) {
    if (busy || photos[0]?.id === photo.id) return;
    setBusy(true); setError('');
    const client = createClient();
    const nextOrder = Math.min(0, ...photos.map(p => p.display_order)) - 1;
    const result = await client.from('profile_photos').update({ display_order: nextOrder }).eq('id', photo.id).eq('profile_id', profile.id);
    if (result.error) setError(t('לא הצלחנו לשנות תמונה ראשית.', 'Could not change the primary photo.'));
    else setPhotos(current => [{ ...photo, display_order: nextOrder }, ...current.filter(p => p.id !== photo.id)]);
    setBusy(false);
  }
  async function save(complete: boolean) {
    if (busy || conflict) return;
    setError(''); setSaved(false);
    const date = validBirthDate(birthDate);
    if (birthDate && !date) { setError(t('תאריך לא תקין. יש להזין יום/חודש/שנה.', 'Enter a valid date: DD/MM/YYYY.')); return; }
    if (complete && (!name.trim() || !date || ageAt(date) < 18 || !bio.trim() || !photos.length)) {
      setError(t('להשלמה נדרשים שם מלא, גיל 18 ומעלה, תמונה וביו קצר.', 'Complete your full name, age 18+, photo and short bio.')); return;
    }
    try { parseResidentFacts(facts, complete); parseResidentPreferences(preferences); }
    catch (e) {
      setError(e instanceof ContractError ? t('יש להשלים תשובות חובה ולבדוק את ההעדפות הפרטיות.', 'Complete the required answers and check your private preferences.') : t('פרטים לא תקינים.', 'Invalid profile details.'));
      return;
    }
    const args = { p_name: name, p_birth_date: date, p_phone: phone, p_bio: bio, p_facts: facts as Json,
      p_preferences: preferences as Json, p_disclosed_fields: disclosed, p_complete: complete, p_expected_revision: revision };
    const payload = JSON.stringify(args);
    if (request.current?.payload !== payload) request.current = { payload, key: crypto.randomUUID() };
    setBusy(true);
    try {
      const client = createClient();
      const result = await client.rpc('save_resident_profile', { ...args, p_request_key: request.current!.key });
      if (result.error) {
        if (/revision|conflict|stale/i.test(result.error.message)) { setConflict(true); throw new Error('conflict'); }
        throw result.error;
      }
      if (!isRecord(result.data) || typeof result.data.revision !== 'number') throw new Error('invalid result');
      setRevision(result.data.revision); request.current = null;
      if (editing) {
        const badgeResult = await client.from('profiles').update({ public_badges: badges }).eq('id', profile.id);
        if (badgeResult.error) { setError(t('הפרופיל נשמר, אך בחירת התג לא נשמרה. אפשר לנסות שוב.', 'Profile saved, but badge choice could not be saved. Please retry.')); return; }
      }
      setSaved(true);
      if (complete) { router.replace(returnTo); router.refresh(); }
    } catch (e) {
      setError(e instanceof Error && e.message === 'conflict'
        ? t('הפרופיל השתנה בחלון אחר. טענו מחדש לפני שמירה.', 'Your profile changed in another window. Reload before saving.')
        : t('לא הצלחנו לשמור. הפרטים נשארו כאן ואפשר לנסות שוב.', 'Could not save. Your entries remain here so you can retry.'));
    } finally { setBusy(false); }
  }
  return <form className="space-y-6" onSubmit={e => { e.preventDefault(); void save(true); }}>
    <label className="block space-y-1"><span>{t('שם מלא (פרטי)', 'Full name (private)')}</span><input className={inputClass} value={name} maxLength={80} autoComplete="name" onChange={e => setName(e.target.value)} />
      <span className="text-xs text-muted-text">{t('בפרופיל יוצגו השם הפרטי והאות הראשונה של שם המשפחה.', 'Your profile shows your first name and last initial.')}</span></label>
    <label className="block space-y-1"><span>{t('תאריך לידה', 'Birth date')}</span><input className={inputClass} value={birthDate} placeholder="DD/MM/YYYY" inputMode="numeric" autoComplete="bday" dir="ltr" onChange={e => { const digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 8); setBirthDate([digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/')); }} />
      <span className="text-xs text-muted-text">{t('מגיל 18 ומעלה. תאריך הלידה נשאר פרטי.', 'Age 18+ only. Your birth date stays private.')}</span></label>
    <fieldset className="space-y-3"><legend className="font-semibold">{t('תמונת פרופיל (חובה)', 'Profile photo (required)')}</legend>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{photos.map((photo, i) => <div key={photo.id} className="space-y-2"><div className="relative aspect-square rounded-xl overflow-hidden"><Image src={photo.url} alt={i === 0 ? t('תמונה ראשית', 'Primary photo') : t('תמונת פרופיל', 'Profile photo')} fill unoptimized sizes="160px" className="object-cover" /></div>
        <button type="button" disabled={busy || i === 0} onClick={() => void makePrimary(photo)} className="text-sm text-teal underline">{i === 0 ? t('תמונה ראשית', 'Primary photo') : t('בחירה כראשית', 'Make primary')}</button>
        <button type="button" disabled={busy || (profile.onboarded && photos.length <= 1)} onClick={() => void remove(photo)} className="ms-3 text-sm text-error underline">{t('הסרה', 'Remove')}</button></div>)}</div>
      <label className="block">{t('העלאת תמונה', 'Upload photo')}<input type="file" accept="image/*" disabled={busy || photos.length >= 6} className="block w-full text-sm mt-2" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void upload(file); }} /></label>
    </fieldset>
    <ResidentFields bio={bio} facts={facts} preferences={preferences} disclosed={disclosed} onBio={setBio} onFacts={setFacts} onPreferences={setPreferences} onDisclosed={setDisclosed} locale={locale} />
    <label className="block space-y-1"><span>{t('טלפון פרטי (לא חובה)', 'Private phone (optional)')}</span><input className={inputClass} type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" /></label>
    {editing && privateProfile?.student_email_verified_at && <label className="flex gap-2"><input type="checkbox" checked={badges.includes('student_verified')} onChange={e => setBadges(e.target.checked ? Array.from(new Set([...badges, 'student_verified'])) : badges.filter(b => b !== 'student_verified'))} />{t('הצג את תג אימות הסטודנט בפרופיל הציבורי', 'Show my student verification badge publicly')}</label>}
    {error && <p role="alert" className="text-error">{error}</p>}{saved && <p role="status" className="text-success">{t('הפרטים נשמרו', 'Details saved')}</p>}
    {conflict && <Button type="button" variant="secondary" onClick={() => window.location.reload()}>{t('טעינה מחדש', 'Reload profile')}</Button>}
    <Button type="submit" className="w-full" disabled={busy || conflict}>{busy ? t('שומרים…', 'Saving…') : editing ? t('שמירת הפרופיל', 'Save profile') : t('המשך', 'Continue')}</Button>
    {!editing && <Button type="button" variant="secondary" className="w-full" disabled={busy || conflict} onClick={() => void save(false)}>{t('שמירה והמשך מאוחר יותר', 'Save and finish later')}</Button>}
    {editing && <Button type="button" variant="ghost" onClick={() => router.push(localePath('/profile', locale))}>{t('ביטול', 'Cancel')}</Button>}
  </form>;
}
