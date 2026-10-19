'use client';
import { useRef, useState } from 'react';
import { ResidentProfileForm } from '@/components/profile/ResidentProfileForm';
import { Button, Input } from '@/components/ui';
import { localePath, type Locale } from '@/utils/navigation';
import type { Database } from '@/types/database';
import type { Lifestyle, PrivateLifestyle } from '@/lib/resident-profile';
import { createClient } from '@/utils/supabase/client';
import { isRecord } from '@/lib/contracts/taxonomy';
type Profile = Database['public']['Tables']['profiles']['Row'];
type PrivateProfile = Database['public']['Tables']['profile_private']['Row'];
type ProfilePhoto = Database['public']['Tables']['profile_photos']['Row'];
export function EditProfileForm({ profile, privateProfile, initialPhotos, lifestyle, privateLifestyle, locale }: {
  profile: Profile; privateProfile: PrivateProfile | null; initialPhotos: ProfilePhoto[];
  lifestyle: Lifestyle; privateLifestyle: PrivateLifestyle; locale: Locale;
}) {
  const t = (he: string, en: string) => locale === 'en' ? en : he;
  const [studentEmail, setStudentEmail] = useState(privateProfile?.student_email ?? '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verified, setVerified] = useState(Boolean(privateProfile?.student_email_verified_at));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState(privateProfile?.phone ?? '');
  const [agency, setAgency] = useState(privateProfile?.agency_name ?? '');
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(privateProfile?.full_name ?? profile.name);
  const [revision, setRevision] = useState(lifestyle?.revision ?? 0);
  const [conflict, setConflict] = useState(false);
  const request = useRef<{ payload: string; key: string } | null>(null);
  async function savePosterContact() {
    if (busy || conflict) return;
    setError(''); setSaved(false);
    if (!name.trim() || !phone.trim()) { setError(t('נדרשים שם מלא וטלפון פרטי לחשבון מפרסם.', 'A property-poster account requires a full name and private phone.')); return; }
    const args = { p_name: name, p_phone: phone, p_agency: agency, p_expected_revision: revision };
    const payload = JSON.stringify(args);
    if (request.current?.payload !== payload) request.current = { payload, key: crypto.randomUUID() };
    setBusy(true);
    const result = await createClient().rpc('save_lister_profile', { ...args, p_request_key: request.current!.key });
    if (result.error) {
      if (/revision|conflict|stale/i.test(result.error.message)) { setConflict(true); setError(t('החשבון השתנה בחלון אחר. טענו מחדש לפני שמירה.', 'Your account changed in another window. Reload before saving.')); }
      else setError(t('לא הצלחנו לשמור. אפשר לנסות שוב.', 'Could not save. Please retry.'));
    } else if (isRecord(result.data) && typeof result.data.revision === 'number') {
      setRevision(result.data.revision); request.current = null; setSaved(true);
    } else setError(t('לא הצלחנו לאשר את השמירה. אפשר לנסות שוב.', 'Could not confirm the save. Please retry.'));
    setBusy(false);
  }
  async function verify(confirm: boolean) {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/verify-student-email/${confirm ? 'confirm' : 'start'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: studentEmail, ...(confirm ? { code: otpCode } : {}) }) });
      if (!response.ok) throw new Error('verification failed');
      if (confirm) { setVerified(true); setOtpSent(false); } else setOtpSent(true);
    } catch { setError(t('האימות לא הושלם. אפשר לנסות שוב.', 'Verification could not finish. Please retry.')); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-page-bg p-5"><section className="mx-auto max-w-2xl rounded-3xl bg-white p-6 space-y-8">
    <h1 className="text-3xl font-bold">{t('עריכת פרופיל', 'Edit profile')}</h1>
    {profile.mode === 'lister' ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); void savePosterContact(); }}>
      <p>{t('זהו חשבון מפרסם, ללא שאלון אורח חיים. פרטי הקשר נשארים פרטיים.', 'This is a property-poster account without a lifestyle questionnaire. Contact details stay private.')}</p>
      <Input label={t('שם מלא (פרטי)', 'Full name (private)')} value={name} maxLength={80} onChange={e => setName(e.target.value)} helperText={t('יוצגו השם הפרטי והאות הראשונה של שם המשפחה.', 'Only your first name and last initial are displayed.')} />
      <Input label={t('טלפון פרטי לחשבון', 'Private account phone')} type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
      <Input label={t('שם סוכנות (לא חובה)', 'Agency (optional)')} value={agency} maxLength={120} onChange={e => setAgency(e.target.value)} />
      {error && <p role="alert" className="text-error">{error}</p>}{saved && <p role="status" className="text-success">{t('הפרטים נשמרו', 'Details saved')}</p>}
      {conflict && <Button type="button" variant="secondary" onClick={() => window.location.reload()}>{t('טעינה מחדש', 'Reload profile')}</Button>}
      <Button type="submit" disabled={busy || conflict}>{t('שמירת הפרופיל', 'Save profile')}</Button>
    </form>
      : <ResidentProfileForm profile={profile} privateProfile={privateProfile} lifestyle={lifestyle} privateLifestyle={privateLifestyle} initialPhotos={initialPhotos} locale={locale} returnTo={localePath('/profile', locale)} editing />}
    {profile.mode !== 'lister' && <section className="border-t border-card-border pt-6 space-y-3"><h2 className="font-semibold">{t('אימות דוא״ל סטודנטיאלי (לא חובה)', 'Student email verification (optional)')}</h2>
      {verified ? <p className="text-success">{t('האימות נשמר. הצגת התג נשארת לבחירתך.', 'Verification saved. Badge visibility remains your choice.')}</p>
        : <><Input label={t('דוא״ל אוניברסיטאי', 'University email')} value={studentEmail} onChange={e => setStudentEmail(e.target.value)} disabled={otpSent || busy} />
          {otpSent && <Input label={t('קוד אימות', 'Verification code')} value={otpCode} onChange={e => setOtpCode(e.target.value)} />}
          <Button type="button" variant="secondary" disabled={busy || !studentEmail || (otpSent && !otpCode)} onClick={() => void verify(otpSent)}>{otpSent ? t('אמת', 'Verify') : t('שלח קוד אימות', 'Send verification code')}</Button></>}
      {error && <p role="alert" className="text-error">{error}</p>}
    </section>}
  </section></main>;
}
