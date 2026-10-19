'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui';
import { ResidentProfileForm } from '@/components/profile/ResidentProfileForm';
import { localePath, type Locale } from '@/utils/navigation';
import type { Database } from '@/types/database';
import type { Lifestyle, PrivateLifestyle } from '@/lib/resident-profile';
type Profile = Database['public']['Tables']['profiles']['Row'];
type Private = Database['public']['Tables']['profile_private']['Row'];
type Photo = Database['public']['Tables']['profile_photos']['Row'];
export function ResidentOnboarding({ profile, privateProfile, lifestyle, privateLifestyle, initialPhotos, returnTo, locale }: {
  profile: Profile | null; privateProfile: Private | null; lifestyle: Lifestyle; privateLifestyle: PrivateLifestyle;
  initialPhotos: Photo[]; returnTo: string; locale: Locale;
}) {
  const router = useRouter();
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const [branch, setBranch] = useState<'resident' | 'lister' | null>(profile?.mode === 'lister' ? 'lister' : profile?.mode ? 'resident' : null);
  const [name, setName] = useState(privateProfile?.full_name ?? profile?.name ?? '');
  const [phone, setPhone] = useState(privateProfile?.phone ?? '');
  const [agency, setAgency] = useState(privateProfile?.agency_name ?? '');
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  async function saveLister(complete: boolean) {
    if (busy) return;
    if (complete && (!name.trim() || !phone.trim() || !adultConfirmed)) { setError(t('נדרשים שם, טלפון ואישור גיל 18 ומעלה.', 'Enter your name, phone and confirm you are at least 18.')); return; }
    setBusy(true); setError(''); setSaved(false);
    const result = await createClient().rpc('save_onboarding', { p_name: name, p_resident: false, p_birth_date: null, p_phone: phone, p_agency: agency,
      p_bio: '', p_tags: { adult_confirmed: adultConfirmed }, p_complete: complete });
    setBusy(false);
    if (result.error) { setError(t('לא הצלחנו לשמור. אפשר לנסות שוב.', 'Could not save. Please try again.')); return; }
    setSaved(true);
    if (complete) { router.replace(returnTo === localePath('/', locale) ? localePath('/my-listings', locale) : returnTo); router.refresh(); }
  }
  const inputClass = 'w-full rounded-xl border border-card-border p-3';
  return <main className="min-h-screen bg-page-bg px-5 py-10"><section className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-sm space-y-6">
    <header><p className="font-semibold text-orange">Shutaf</p><h1 className="mt-2 text-3xl font-bold">{t('בואו נכיר', 'Let’s get to know you')}</h1>
      <p className="mt-2 text-muted-text">{t('פרטי קשר, שם מלא ותאריך הלידה נשארים פרטיים.', 'Your contact details, full name and birth date stay private.')}</p></header>
    {!branch ? <div className="space-y-3"><h2 className="font-semibold">{t('האם תגור/י בדירה?', 'Will you live in the apartment?')}</h2>
      <Button className="w-full" onClick={() => setBranch('resident')}>{t('כן, אני מחפש/ת שותפים', 'Yes, I’m looking for roommates')}</Button>
      <Button variant="secondary" className="w-full" onClick={() => setBranch('lister')}>{t('לא, אני מפרסם/ת עבור אחרים', 'No, I’m posting for others')}</Button></div>
      : <><button type="button" disabled={busy} className="text-teal underline" onClick={() => setBranch(null)}>{t('חזרה לבחירה', 'Change choice')}</button>
        {branch === 'resident' && profile ? <ResidentProfileForm profile={profile} privateProfile={privateProfile} lifestyle={lifestyle} privateLifestyle={privateLifestyle} initialPhotos={initialPhotos} returnTo={returnTo} locale={locale} />
        : <form className="space-y-5" onSubmit={e => { e.preventDefault(); void saveLister(true); }}>
          <label className="block space-y-1"><span>{t('שם מלא', 'Full name')}</span><input className={inputClass} value={name} maxLength={80} autoComplete="name" onChange={e => setName(e.target.value)} /></label>
          <label className="block space-y-1"><span>{t('טלפון ליצירת קשר', 'Contact phone')}</span><input className={inputClass} type="tel" value={phone} autoComplete="tel" onChange={e => setPhone(e.target.value)} /></label>
          <label className="block space-y-1"><span>{t('שם סוכנות (לא חובה)', 'Agency (optional)')}</span><input className={inputClass} value={agency} maxLength={120} onChange={e => setAgency(e.target.value)} /></label>
          <label className="flex gap-2"><input type="checkbox" checked={adultConfirmed} onChange={e => setAdultConfirmed(e.target.checked)} />{t('אני מאשר/ת שמלאו לי 18', 'I confirm I am at least 18 years old')}</label>
          {error && <p role="alert" className="text-error">{error}</p>}{saved && <p role="status" className="text-success">{t('הפרטים נשמרו', 'Details saved')}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? t('שומרים…', 'Saving…') : t('המשך', 'Continue')}</Button>
          <Button type="button" variant="secondary" disabled={busy} className="w-full" onClick={() => void saveLister(false)}>{t('שמירה והמשך מאוחר יותר', 'Save and finish later')}</Button>
        </form>}</>}
  </section></main>;
}
