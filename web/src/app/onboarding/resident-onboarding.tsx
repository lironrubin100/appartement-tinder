'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui';
import { ResidentFields } from '@/components/profile/ResidentFields';
import { TAG_CATEGORIES, type TagKey } from '@/utils/profileTags';
import { localePath, type Locale } from '@/utils/navigation';
import { uploadProfilePhoto } from '@/utils/photos';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Private = Database['public']['Tables']['profile_private']['Row'];
export function ResidentOnboarding({
  profile,
  privateProfile,
  returnTo,
  locale,
}: {
  profile: Profile | null;
  privateProfile: Private | null;
  returnTo: string;
  locale: Locale;
}) {
  const router = useRouter();
  const en = locale === 'en';
  const t = (he: string, enText: string) => (en ? enText : he);
  const [branch, setBranch] = useState<'resident' | 'lister' | null>(
    profile?.mode === 'lister' ? 'lister' : profile?.mode ? 'resident' : null
  );
  const [name, setName] = useState(profile?.name ?? '');
  const [birthDate, setBirthDate] = useState(
    privateProfile?.birth_date?.split('-').reverse().join('/') ?? ''
  );
  const [phone, setPhone] = useState(privateProfile?.phone ?? '');
  const [agency, setAgency] = useState(privateProfile?.agency_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [tags, setTags] = useState<Partial<Record<TagKey, string | null>>>(
    Object.fromEntries(
      TAG_CATEGORIES.map((c) => [c.key, profile?.[c.key] ?? null])
    )
  );
  const [photo, setPhoto] = useState(profile?.photo_url ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  function birthIso() {
    const parts = birthDate.split('/');
    if (
      parts.length !== 3 ||
      parts[0].length !== 2 ||
      parts[1].length !== 2 ||
      parts[2].length !== 4
    )
      return null;
    const iso = parts.reverse().join('-');
    const d = new Date(iso + 'T12:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso
      ? iso
      : null;
  }
  async function save(complete: boolean) {
    if (!branch || busy) return;
    const date = birthIso();
    if (
      complete &&
      (!name.trim() ||
        (branch === 'resident' && !date) ||
        (branch === 'lister' && !phone.trim()))
    ) {
      setError(
        t(
          'יש למלא שם ופרטים נדרשים. תאריך: יום/חודש/שנה.',
          'Enter your name and required details. Date: DD/MM/YYYY.'
        )
      );
      return;
    }
    setBusy(true);
    setError('');
    setSaved(false);
    const { error: saveError } = await createClient().rpc('save_onboarding', {
      p_name: name,
      p_resident: branch === 'resident',
      p_birth_date: date,
      p_phone: phone,
      p_agency: agency,
      p_bio: branch === 'resident' ? bio : '',
      p_tags: branch === 'resident' ? tags : {},
      p_complete: complete,
    });
    setBusy(false);
    if (saveError) {
      setError(
        t(
          'לא הצלחנו לשמור. אפשר לנסות שוב.',
          'Could not save. Please try again.'
        )
      );
      return;
    }
    setSaved(true);
    if (complete) {
      router.replace(
        returnTo === localePath('/', locale) && branch === 'lister'
          ? localePath('/my-listings', locale)
          : returnTo
      );
      router.refresh();
    }
  }
  async function upload(file: File | undefined) {
    if (!file || !profile || busy) return;
    setBusy(true);
    setError('');
    try {
      const client = createClient();
      const url = await uploadProfilePhoto(client, profile.id, file);
      const { error: e } = await client
        .from('profile_photos')
        .insert({ profile_id: profile.id, url, display_order: 0 });
      if (e) throw e;
      setPhoto(url);
    } catch {
      setError(
        t(
          'לא הצלחנו להעלות תמונה. נסו תמונה אחרת.',
          'Could not upload. Please try another image.'
        )
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-page-bg px-5 py-10">
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-sm space-y-6">
        <header>
          <p className="font-semibold text-orange">Shutaf</p>
          <h1 className="mt-2 text-3xl font-bold">
            {t('בואו נכיר', 'Let’s get to know you')}
          </h1>
          <p className="mt-2 text-muted-text">
            {t(
              'פרטי קשר ותאריך הלידה נשארים פרטיים.',
              'Your contact details and birth date stay private.'
            )}
          </p>
        </header>
        {!branch ? (
          <div className="space-y-3">
            <h2 className="font-semibold">
              {t('האם תגור/י בדירה?', 'Will you live in the apartment?')}
            </h2>
            <Button className="w-full" onClick={() => setBranch('resident')}>
              {t('כן, אני מחפש/ת שותפים', 'Yes, I’m looking for roommates')}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setBranch('lister')}
            >
              {t('לא, אני מפרסם/ת עבור אחרים', 'No, I’m posting for others')}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void save(true);
            }}
          >
            <button
              type="button"
              disabled={busy}
              className="text-teal underline"
              onClick={() => setBranch(null)}
            >
              {t('חזרה לבחירה', 'Change choice')}
            </button>
            <label className="block space-y-1">
              <span>
                {branch === 'resident'
                  ? t('איך להציג את שמך?', 'Your display name')
                  : t('שם מלא', 'Full name')}
              </span>
              <input
                value={name}
                required
                maxLength={80}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-card-border p-3"
              />
            </label>
            {branch === 'resident' && (
              <>
                <label className="block space-y-1">
                  <span>{t('תאריך לידה', 'Birth date')}</span>
                  <input
                    value={birthDate}
                    onChange={(e) => {
                      const d = e.target.value
                        .replace(/[^0-9]/g, '')
                        .slice(0, 8);
                      setBirthDate(
                        [d.slice(0, 2), d.slice(2, 4), d.slice(4)]
                          .filter(Boolean)
                          .join('/')
                      );
                    }}
                    placeholder="DD/MM/YYYY"
                    inputMode="numeric"
                    autoComplete="bday"
                    required
                    className="w-full rounded-xl border border-card-border p-3"
                    dir="ltr"
                  />
                  <span className="text-xs text-muted-text">
                    {t(
                      'רק הגיל יוצג בפרופיל.',
                      'Only your age appears on your profile.'
                    )}
                  </span>
                </label>
                <label className="block space-y-2">
                  <span>
                    {t('תמונת פרופיל (לא חובה)', 'Profile photo (optional)')}
                  </span>
                  {photo && (
                    <p className="text-sm text-success">
                      {t('התמונה נשמרה', 'Photo saved')}
                    </p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={busy || Boolean(photo)}
                    onChange={(e) => void upload(e.target.files?.[0])}
                  />
                </label>
                <ResidentFields
                  bio={bio}
                  tags={tags}
                  onBio={setBio}
                  onTags={setTags}
                  locale={locale}
                />
              </>
            )}
            <label className="block space-y-1">
              <span>
                {branch === 'resident'
                  ? t('טלפון (לא חובה)', 'Phone (optional)')
                  : t('טלפון ליצירת קשר', 'Contact phone')}
              </span>
              <input
                type="tel"
                value={phone}
                required={branch === 'lister'}
                autoComplete="tel"
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-card-border p-3"
              />
            </label>
            {branch === 'lister' && (
              <label className="block space-y-1">
                <span>{t('שם סוכנות (לא חובה)', 'Agency (optional)')}</span>
                <input
                  value={agency}
                  maxLength={120}
                  onChange={(e) => setAgency(e.target.value)}
                  className="w-full rounded-xl border border-card-border p-3"
                />
              </label>
            )}
            {error && (
              <p role="alert" className="text-error">
                {error}
              </p>
            )}
            {saved && (
              <p role="status" className="text-success">
                {t('הפרטים נשמרו', 'Details saved')}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? t('שומרים…', 'Saving…') : t('המשך', 'Continue')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              className="w-full"
              onClick={() => void save(false)}
            >
              {t('שמירה והמשך מאוחר יותר', 'Save and finish later')}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
