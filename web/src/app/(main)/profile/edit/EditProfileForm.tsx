'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button, Input, Badge } from '@/components/ui';
import { TAG_CATEGORIES, type TagKey } from '@/utils/profileTags';
import { uploadProfilePhoto } from '@/utils/photos';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfilePhoto = Database['public']['Tables']['profile_photos']['Row'];

const MAX_PHOTOS = 6;

export function EditProfileForm({
  profile,
  initialPhotos,
}: {
  profile: Profile;
  initialPhotos: ProfilePhoto[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [tags, setTags] = useState<Record<TagKey, string | null>>(
    Object.fromEntries(
      TAG_CATEGORIES.map((c) => [c.key, profile[c.key] as string | null])
    ) as Record<TagKey, string | null>
  );
  const [photos, setPhotos] = useState(initialPhotos);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studentEmail, setStudentEmail] = useState(profile.student_email ?? '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verified, setVerified] = useState(Boolean(profile.student_email_verified_at));
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || photos.length >= MAX_PHOTOS) return;

    const url = await uploadProfilePhoto(supabase, profile.id, file);
    const { data, error: insertError } = await supabase
      .from('profile_photos')
      .insert({ profile_id: profile.id, url, display_order: photos.length })
      .select()
      .single();
    if (insertError || !data) {
      setError(insertError?.message ?? 'העלאת התמונה נכשלה');
      return;
    }
    setPhotos([...photos, data]);
  }

  async function handlePhotoRemove(photo: ProfilePhoto) {
    await supabase.from('profile_photos').delete().eq('id', photo.id);
    setPhotos(photos.filter((p) => p.id !== photo.id));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
    next.forEach((p, i) => {
      if (p.display_order !== i) {
        supabase.from('profile_photos').update({ display_order: i }).eq('id', p.id).then();
      }
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ name, bio, ...tags })
      .eq('id', profile.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push('/profile');
    router.refresh();
  }

  async function handleSendCode() {
    setVerifyBusy(true);
    setVerifyError(null);
    const res = await fetch('/api/verify-student-email/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail }),
    });
    const body = await res.json();
    setVerifyBusy(false);
    if (!res.ok) {
      setVerifyError(body.error ?? 'שליחת הקוד נכשלה');
      return;
    }
    setOtpSent(true);
  }

  async function handleConfirmCode() {
    setVerifyBusy(true);
    setVerifyError(null);
    const res = await fetch('/api/verify-student-email/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, code: otpCode }),
    });
    const body = await res.json();
    setVerifyBusy(false);
    if (!res.ok) {
      setVerifyError(body.error ?? 'האימות נכשל');
      return;
    }
    setVerified(true);
    setOtpSent(false);
  }

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        <div className="border-b border-card-border px-6 py-8">
          <h1 className="text-3xl font-bold text-ink">עריכת פרופיל</h1>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {/* Photos */}
          <div>
            <h3 className="font-semibold text-ink mb-3">תמונות</h3>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="relative aspect-[4/5] rounded-shutaf-md overflow-hidden bg-neutral-bg-soft"
                >
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-black/40">
                    <button type="button" onClick={() => movePhoto(i, -1)} className="text-white text-xs px-2">
                      ◀
                    </button>
                    <button type="button" onClick={() => handlePhotoRemove(photo)} className="text-white text-xs px-2">
                      ✕
                    </button>
                    <button type="button" onClick={() => movePhoto(i, 1)} className="text-white text-xs px-2">
                      ▶
                    </button>
                  </div>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="aspect-[4/5] rounded-shutaf-md border-2 border-dashed border-card-border flex items-center justify-center cursor-pointer text-muted-text">
                  +
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>

          {/* Name / Bio */}
          <div className="space-y-4">
            <Input label="שם" value={name} onChange={(e) => setName(e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-ink mb-2">ביו</label>
              <textarea
                value={bio}
                maxLength={300}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2.5 rounded-shutaf-md border border-card-border focus:outline-none focus:ring-2 focus:ring-orange"
                rows={4}
              />
            </div>
          </div>

          {/* Student email verification */}
          <div className="border-t border-card-border pt-6">
            <h3 className="font-semibold text-ink mb-3">אימות דוא״ל סטודנטיאלי</h3>
            {verified ? (
              <Badge variant="success">מאומת כסטודנט ({profile.student_email})</Badge>
            ) : (
              <div className="space-y-3">
                <Input
                  label="דוא״ל אוניברסיטאי"
                  placeholder="name@post.bgu.ac.il"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  disabled={otpSent}
                />
                {!otpSent ? (
                  <Button variant="secondary" onClick={handleSendCode} disabled={verifyBusy || !studentEmail}>
                    שלח קוד אימות
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="קוד בן 6 ספרות"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                    <Button variant="primary" onClick={handleConfirmCode} disabled={verifyBusy || otpCode.length === 0}>
                      אמת
                    </Button>
                  </div>
                )}
                {verifyError && <p className="text-sm text-error">{verifyError}</p>}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="border-t border-card-border pt-6">
            <h3 className="font-semibold text-ink mb-4">התגים שלי</h3>
            <div className="space-y-5">
              {TAG_CATEGORIES.map((category) => (
                <div key={category.key}>
                  <p className="text-sm font-medium text-ink mb-2">{category.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {category.options.map((option) => {
                      const active = tags[category.key] === option.value;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() =>
                            setTags((prev) => ({
                              ...prev,
                              [category.key]: active ? null : option.value,
                            }))
                          }
                        >
                          <Badge variant={active ? 'success' : 'default'}>{option.label}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex gap-3">
            <Button variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'שומר...' : 'שמור'}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/profile')}>
              ביטול
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
