# Edit Profile, Tag Pickers, Student Verification & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the read-only Profile page (shipped in `docs/superpowers/plans/2026-08-20-auth-and-data-foundation.md`) into a fully editable profile: photo gallery, the 16-category lifestyle tag picker, student-email OTP verification, a real notifications toggle on its own Settings screen, and a functional mode switcher — closing out every item in the approved spec.

**Architecture:** A new `/profile/edit` route (Server Component shell + Client Component form) writes directly to `profiles`/`profile_photos` via the browser Supabase client (RLS already scopes writes to `auth.uid() = id`). Student-email verification goes through two Route Handlers using the service-role admin client, reusing Supabase Auth's own OTP send/verify so no email infrastructure is built. A new `/settings` route absorbs the settings block per I20. The mode switcher becomes a Modal-driven picker writing `profiles.mode`.

**Tech Stack:** Same as Plan A — Next.js 16 App Router, `@supabase/ssr`, existing `web/src/components/ui` kit (`Modal`, `Input`, `Button`, `Badge`, `Avatar`).

**Spec:** `docs/superpowers/specs/2026-08-20-profile-edit-design.md`

## Global Constraints

- `student_email_verified_at` is revoked from client `UPDATE` (Plan A migration) — only the admin-client confirm route may set it.
- No new npm dependencies: photo reorder uses up/down buttons, not a drag-and-drop library; image resize uses `<canvas>`, not a library.
- No test framework introduced. The one piece of pure branching logic (student-email domain allowlist) gets a plain `node`-runnable self-check; everything else is verified via `tsc --noEmit` and manual browser testing (this session's Browser pane cannot hold the real user's Google session, so full authenticated-save testing is called out explicitly as a step for the user to do themselves).
- Stay off `web/src/app/(main)/map/**`, `web/src/components/map/**`, `web/src/hooks/useFavorites.ts`, `web/src/hooks/useApartmentFilters.ts`, `web/e2e/**` — another session owns that work concurrently.

---

### Task 1: Shared tag category definitions

**Files:**
- Create: `web/src/utils/profileTags.ts`

**Interfaces:**
- Produces: `TAG_CATEGORIES: TagCategory[]` where `TagCategory = { key: TagKey; label: string; options: { value: string; label: string }[] }`, and `TagKey` — a union of the 16 `profiles` column names. Consumed by Task 5 (edit form) and Task 6 (profile page redisplay).

- [ ] **Step 1: Write the category/label map**

```typescript
// web/src/utils/profileTags.ts
export type TagKey =
  | 'gender_dynamic' | 'cleanliness' | 'sleep_schedule' | 'social_guests'
  | 'noise_tolerance' | 'music_vibe' | 'climate' | 'smoking'
  | 'kitchen_dietary' | 'cooking_dynamics' | 'pets' | 'weekend_routine'
  | 'relationship_status' | 'study_habits' | 'financial_splitting'
  | 'miluim_reserve_duty';

export interface TagCategory {
  key: TagKey;
  label: string;
  options: { value: string; label: string }[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  { key: 'gender_dynamic', label: 'דינמיקת מגדר', options: [
    { value: '1_guy_guys', label: 'בחור אחד + בנים' },
    { value: '2_girls_1_girl', label: '2 בנות + בחורה' },
    { value: 'coed_anyone', label: 'מעורב, לא משנה' },
  ]},
  { key: 'cleanliness', label: 'רמת ניקיון', options: [
    { value: 'very_clean', label: 'מאוד נקי/ה' },
    { value: 'clean', label: 'נקי/ה' },
    { value: 'average', label: 'ממוצע' },
    { value: 'relaxed', label: 'רגוע/ה' },
  ]},
  { key: 'sleep_schedule', label: 'שעות שינה', options: [
    { value: 'early_bed_early_wake', label: 'משכים/ה קום' },
    { value: 'night_owl', label: 'ינשוף לילה' },
    { value: 'flexible', label: 'גמיש/ה' },
  ]},
  { key: 'social_guests', label: 'אירוח חברים', options: [
    { value: 'frequent_visitors', label: 'מארח/ת הרבה' },
    { value: 'occasional', label: 'לפעמים' },
    { value: 'rarely', label: 'כמעט אף פעם' },
  ]},
  { key: 'noise_tolerance', label: 'רגישות לרעש', options: [
    { value: 'quiet', label: 'זקוק/ה לשקט' },
    { value: 'moderate', label: 'בינוני' },
    { value: 'high', label: 'לא רגיש/ה' },
  ]},
  { key: 'music_vibe', label: 'מוזיקה באווירה', options: [
    { value: 'silent', label: 'שקט מוחלט' },
    { value: 'ambient', label: 'רקע נעים' },
    { value: 'upbeat', label: 'אנרגטי' },
    { value: 'loud', label: 'רועש' },
  ]},
  { key: 'climate', label: 'העדפת טמפרטורה', options: [
    { value: 'cold', label: 'קריר' },
    { value: 'moderate', label: 'בינוני' },
    { value: 'hot', label: 'חם' },
  ]},
  { key: 'smoking', label: 'עישון', options: [
    { value: 'yes', label: 'כן' },
    { value: 'no', label: 'לא' },
    { value: 'outdoor_only', label: 'רק בחוץ' },
  ]},
  { key: 'kitchen_dietary', label: 'כשרות / תזונה', options: [
    { value: 'strict', label: 'קפדני/ת' },
    { value: 'vegetarian', label: 'צמחוני/ת' },
    { value: 'mixed', label: 'מעורב' },
  ]},
  { key: 'cooking_dynamics', label: 'בישול', options: [
    { value: 'shared_cooking', label: 'בישול משותף' },
    { value: 'individual', label: 'כל אחד לעצמו' },
    { value: 'meal_prep', label: 'הכנה מראש' },
  ]},
  { key: 'pets', label: 'חיות מחמד', options: [
    { value: 'yes', label: 'כן' },
    { value: 'no', label: 'לא' },
    { value: 'small_only', label: 'רק קטנות' },
  ]},
  { key: 'weekend_routine', label: 'סופ״ש', options: [
    { value: 'home_body', label: 'בבית' },
    { value: 'mixed', label: 'משולב' },
    { value: 'always_out', label: 'תמיד בחוץ' },
  ]},
  { key: 'relationship_status', label: 'מצב זוגי', options: [
    { value: 'single', label: 'רווק/ה' },
    { value: 'in_relationship', label: 'בזוגיות' },
    { value: 'flexible', label: 'גמיש' },
  ]},
  { key: 'study_habits', label: 'הרגלי לימוד', options: [
    { value: 'heavy_studying', label: 'לומד/ת המון' },
    { value: 'moderate', label: 'בינוני' },
    { value: 'minimal', label: 'מעט' },
  ]},
  { key: 'financial_splitting', label: 'חלוקת הוצאות', options: [
    { value: 'strict', label: 'קפדני' },
    { value: 'flexible', label: 'גמיש' },
    { value: 'shared_expenses', label: 'הוצאות משותפות' },
  ]},
  { key: 'miluim_reserve_duty', label: 'מילואים', options: [
    { value: 'active', label: 'פעיל' },
    { value: 'occasional', label: 'מדי פעם' },
    { value: 'none', label: 'לא' },
  ]},
];

export function tagOptionLabel(key: TagKey, value: string | null): string | null {
  if (!value) return null;
  const category = TAG_CATEGORIES.find((c) => c.key === key);
  return category?.options.find((o) => o.value === value)?.label ?? value;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd "web" && npx tsc --noEmit` — expect no new errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/utils/profileTags.ts
git commit -m "Add shared lifestyle-tag category/label definitions"
```

---

### Task 2: Student-email domain allowlist (pure logic + self-check)

**Files:**
- Create: `web/src/utils/studentEmail.ts`

**Interfaces:**
- Produces: `isStudentEmail(email: string): boolean`. Consumed by Task 3's `start` route.

- [ ] **Step 1: Write the function with an inline self-check**

```typescript
// web/src/utils/studentEmail.ts
const ALLOWED_STUDENT_EMAIL_DOMAINS = ['post.bgu.ac.il', 'bgu.ac.il', 'sce.ac.il'];

export function isStudentEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return ALLOWED_STUDENT_EMAIL_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

// Plain-node self-check: `node --experimental-strip-types src/utils/studentEmail.ts`
// (or `node src/utils/studentEmail.ts` on Node 23.6+, which strips types by
// default). Runs only when this file is executed directly, not on import.
if (import.meta.url === `file://${process.argv[1]}`) {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    console.log(`ok: ${msg}`);
  };

  assert(isStudentEmail('student@post.bgu.ac.il') === true, 'post.bgu.ac.il accepted');
  assert(isStudentEmail('prof@bgu.ac.il') === true, 'bgu.ac.il accepted');
  assert(isStudentEmail('a@sce.ac.il') === true, 'sce.ac.il accepted');
  assert(isStudentEmail('a@gmail.com') === false, 'gmail.com rejected');
  assert(isStudentEmail('a@evilbgu.ac.il') === false, 'lookalike domain rejected');
  assert(isStudentEmail('not-an-email') === false, 'malformed input rejected');
  console.log('all studentEmail checks passed');
}
```

- [ ] **Step 2: Run the self-check**

Run: `cd "web" && node src/utils/studentEmail.ts`
Expected: six `ok:` lines and `all studentEmail checks passed`, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/utils/studentEmail.ts
git commit -m "Add student-email domain allowlist with a runnable self-check"
```

---

### Task 3: Student-email OTP verification routes

Reuses Supabase Auth's own OTP send/verify — no new email infrastructure. Runs entirely server-side with the admin client so the OTP round trip can never swap the caller's real (Google) session.

**Files:**
- Create: `web/src/app/api/verify-student-email/start/route.ts`
- Create: `web/src/app/api/verify-student-email/confirm/route.ts`

**Interfaces:**
- Consumes: `isStudentEmail` (Task 2), `createAdminClient` (`@/utils/supabase/admin`, exists), `createServerClient` (`@/utils/supabase/server`, Plan A).
- Produces: `POST /api/verify-student-email/start` `{ email }` → `{ ok: true }` | `{ error }`; `POST /api/verify-student-email/confirm` `{ email, code }` → `{ ok: true }` | `{ error }`. Consumed by Task 5's form.

- [ ] **Step 1: Write the start route**

```typescript
// web/src/app/api/verify-student-email/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { isStudentEmail } from '@/utils/studentEmail';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const { email } = await request.json();
  if (typeof email !== 'string' || !isStudentEmail(email)) {
    return NextResponse.json(
      { error: 'כתובת האימייל חייבת להיות דוא״ל אוניברסיטאי (bgu.ac.il / sce.ac.il)' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.signInWithOtp({ email });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write the confirm route**

```typescript
// web/src/app/api/verify-student-email/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const { email, code } = await request.json();
  if (typeof email !== 'string' || typeof code !== 'string') {
    return NextResponse.json({ error: 'missing email or code' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: verifyError } = await admin.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });
  if (verifyError) {
    return NextResponse.json({ error: 'קוד שגוי או שפג תוקפו' }, { status: 400 });
  }

  // Verification only proves the caller owns `email`'s inbox. Write the
  // result onto the caller's own profile with the admin client, since
  // student_email_verified_at is revoked from client UPDATE.
  const { error: updateError } = await admin
    .from('profiles')
    .update({
      student_email: email,
      student_email_verified_at: new Date().toISOString(),
      is_verified: true,
    })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd "web" && npx tsc --noEmit` — expect no new errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/api/verify-student-email
git commit -m "Add student-email OTP verification routes"
```

---

### Task 4: Photo upload utility

**Files:**
- Create: `web/src/utils/photos.ts`

**Interfaces:**
- Produces: `resizeImage(file: File, maxDim?: number): Promise<Blob>`, `uploadProfilePhoto(supabase: SupabaseClient<Database>, userId: string, file: File): Promise<string>` (returns the public URL). Consumed by Task 5.

- [ ] **Step 1: Write the resize + upload helpers**

```typescript
// web/src/utils/photos.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function resizeImage(file: File, maxDim = 1080): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('canvas toBlob failed'))),
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('failed to load image'));
    };
    img.src = url;
  });
}

export async function uploadProfilePhoto(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File
): Promise<string> {
  const resized = await resizeImage(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(path, resized, { contentType: 'image/jpeg' });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd "web" && npx tsc --noEmit` — expect no new errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/utils/photos.ts
git commit -m "Add client-side photo resize + Supabase Storage upload helper"
```

---

### Task 5: Edit Profile screen

**Files:**
- Create: `web/src/app/(main)/profile/edit/page.tsx`
- Create: `web/src/app/(main)/profile/edit/EditProfileForm.tsx`

**Interfaces:**
- Consumes: `createServerClient` (Plan A), `TAG_CATEGORIES`/`TagKey` (Task 1), `uploadProfilePhoto` (Task 4), `Database['public']['Tables']['profiles']['Row']`, `Database['public']['Tables']['profile_photos']['Row']`.
- Produces: route `/profile/edit`, linked from Task 6's Profile page.

- [ ] **Step 1: Server Component shell — fetch profile + photos, redirect if unauthenticated**

```typescript
// web/src/app/(main)/profile/edit/page.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { EditProfileForm } from './EditProfileForm';

export default async function EditProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/login');

  const { data: photos } = await supabase
    .from('profile_photos')
    .select('*')
    .eq('profile_id', user.id)
    .order('display_order', { ascending: true });

  return <EditProfileForm profile={profile} initialPhotos={photos ?? []} />;
}
```

- [ ] **Step 2: Client form component**

```typescript
// web/src/app/(main)/profile/edit/EditProfileForm.tsx
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
    Object.fromEntries(TAG_CATEGORIES.map((c) => [c.key, profile[c.key] as string | null])) as Record<TagKey, string | null>
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
                <div key={photo.id} className="relative aspect-[4/5] rounded-shutaf-md overflow-hidden bg-neutral-bg-soft">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-black/40">
                    <button type="button" onClick={() => movePhoto(i, -1)} className="text-white text-xs px-2">◀</button>
                    <button type="button" onClick={() => handlePhotoRemove(photo)} className="text-white text-xs px-2">✕</button>
                    <button type="button" onClick={() => movePhoto(i, 1)} className="text-white text-xs px-2">▶</button>
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
```

- [ ] **Step 3: Verify compilation**

Run: `cd "web" && npx tsc --noEmit` — expect no new errors. `profile[category.key]` indexing needs `Profile` to have all 16 `TagKey`s as its own keys, which it does (Plan A migration) — if TS complains about the index signature, change the `Record` construction line to build the initial state with an explicit `as Record<TagKey, string | null>` cast (already present above).

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(main)/profile/edit"
git commit -m "Add Edit Profile screen: photos, bio, 16-category tag picker, student verification"
```

---

### Task 6: Wire Profile page to the edit screen and real tag labels

**Files:**
- Modify: `web/src/app/(main)/profile/page.tsx`

**Interfaces:**
- Consumes: `tagOptionLabel` (Task 1).

- [ ] **Step 1: Replace the raw tag value display with labels, and the static verified badge with the student-specific one; add an edit link**

In the existing file (from Plan A), make these targeted edits:

```typescript
// add to imports:
import Link from 'next/link';
import { tagOptionLabel } from '@/utils/profileTags';
```

```typescript
// replace the Badge rendering inside the tags section:
{setTags.map((key) => (
  <Badge key={key}>{tagOptionLabel(key, profile[key])}</Badge>
))}
```

```typescript
// replace the plain "אימות דוא״ל" badge condition/text:
{profile.student_email_verified_at && (
  <Badge variant="success" className="mt-2">
    מאומת כסטודנט
  </Badge>
)}
```

```typescript
// add an edit entry point near the header, e.g. directly under the <h1>:
<Link href="/profile/edit" className="text-sm text-orange hover:underline">
  ✎ עריכת פרופיל
</Link>
```

- [ ] **Step 2: Verify compilation and manually check the redirect-when-unauthenticated path still works**

Run: `cd "web" && npx tsc --noEmit`. Then with the dev server running, visit `/profile` signed out — confirm it still redirects to `/login` (this session's Browser pane has no session cookie for the real user, so that's the only end-to-end check available here; the authenticated render needs to be checked by the person who's actually signed in).

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/(main)/profile/page.tsx"
git commit -m "Profile page: real tag labels, student-verified badge, edit link"
```

---

### Task 7: Settings screen (split out per I20)

**Files:**
- Create: `web/src/app/(main)/settings/page.tsx`
- Create: `web/src/app/(main)/settings/NotificationsToggle.tsx`
- Modify: `web/src/app/(main)/profile/page.tsx`

**Interfaces:**
- Consumes: `createServerClient` (Plan A), `createClient` (browser, Plan A).

- [ ] **Step 1: Real notifications toggle (client component)**

```typescript
// web/src/app/(main)/settings/NotificationsToggle.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export function NotificationsToggle({
  userId,
  initialEnabled,
}: {
  userId: string;
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function toggle() {
    setBusy(true);
    const next = !enabled;
    const { error } = await supabase
      .from('profiles')
      .update({ notifications_enabled: next })
      .eq('id', userId);
    setBusy(false);
    if (!error) setEnabled(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      role="switch"
      aria-checked={enabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-orange' : 'bg-neutral-bg'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-0.5' : 'translate-x-5'}`}
      />
    </button>
  );
}
```

- [ ] **Step 2: Settings page**

```typescript
// web/src/app/(main)/settings/page.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { NotificationsToggle } from './NotificationsToggle';
import { Button } from '@/components/ui';

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('notifications_enabled')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/login');

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        <div className="border-b border-card-border px-6 py-8">
          <h1 className="text-3xl font-bold text-ink">הגדרות</h1>
        </div>

        <div className="p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-body-text">🌐 שפה</span>
            <span className="text-muted-text">עברית (תמיד)</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-body-text">🔔 הודעות</span>
            <NotificationsToggle userId={user.id} initialEnabled={profile.notifications_enabled} />
          </div>
          <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
            <span className="text-body-text">🔒 פרטיות</span>
            <span className="float-end text-muted-text">הצג עוד</span>
          </button>
          <div className="pt-4">
            <Button variant="danger" className="w-full">
              🗑️ מחק חשבון
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace the inline settings block on the Profile page with a link**

In `web/src/app/(main)/profile/page.tsx`, remove the `<div className="border-b ... הגדרות ...">` block (the שפה/הודעות/פרטיות buttons) and replace it with:

```typescript
<Link href="/settings" className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors border-b border-card-border">
  <span className="font-semibold text-ink">⚙️ הגדרות</span>
  <span className="text-muted-text">›</span>
</Link>
```

Also remove the now-unused `notifications_enabled` display logic from the profile page if nothing else reads it there.

- [ ] **Step 4: Verify compilation**

Run: `cd "web" && npx tsc --noEmit` — expect no new errors.

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(main)/settings" "web/src/app/(main)/profile/page.tsx"
git commit -m "Split Settings into its own screen per I20, with a real notifications toggle"
```

---

### Task 8: Mode switcher (per I19)

**Files:**
- Create: `web/src/app/(main)/profile/ModeSwitcher.tsx`
- Modify: `web/src/app/(main)/profile/page.tsx`

**Interfaces:**
- Consumes: `Modal` (existing `@/components/ui`), `createClient` (browser).

- [ ] **Step 1: Write the mode switcher client component**

```typescript
// web/src/app/(main)/profile/ModeSwitcher.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Modal, Button } from '@/components/ui';

const MODES = [
  { value: 'solo', label: '🏠 מחפש דירה' },
  { value: 'group', label: '👥 בקבוצה' },
  { value: 'room_filler', label: '➕ מחפש שותפים' },
] as const;

export function ModeSwitcher({ userId, currentMode }: { userId: string; currentMode: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const currentLabel = MODES.find((m) => m.value === currentMode)?.label ?? currentMode;

  async function selectMode(mode: string) {
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ mode }).eq('id', userId);
    setBusy(false);
    if (!error) {
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3 border border-card-border rounded-shutaf-md hover:bg-neutral-bg-soft transition-colors"
      >
        <span className="text-body-text">כרגע: {currentLabel}</span>
        <span className="text-muted-text">›</span>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="בחר/י מצב">
        <div className="flex flex-col gap-2">
          {MODES.map((mode) => (
            <Button
              key={mode.value}
              variant={mode.value === currentMode ? 'primary' : 'ghost'}
              disabled={busy}
              onClick={() => selectMode(mode.value)}
              className="w-full justify-start"
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Replace the static three-button row on the Profile page**

In `web/src/app/(main)/profile/page.tsx`, replace the whole "Mode Selector" `<div>` block (the one mapping over `['solo', 'group', 'room_filler']` with `<Button>`s) with:

```typescript
import { ModeSwitcher } from './ModeSwitcher';
// ...
<div className="border-b border-card-border pb-6">
  <h3 className="font-semibold text-ink mb-3">מצב נוכחי</h3>
  <ModeSwitcher userId={profile.id} currentMode={profile.mode} />
</div>
```

(The now-unused `MODE_LABELS` constant at the top of the file can be removed since `ModeSwitcher` owns its own labels.)

- [ ] **Step 3: Verify compilation**

Run: `cd "web" && npx tsc --noEmit` — expect no new errors.

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(main)/profile/ModeSwitcher.tsx" "web/src/app/(main)/profile/page.tsx"
git commit -m "Replace static mode buttons with a functional mode switcher (I19)"
```

---

### Task 9: Final smoke test (manual, by the account holder)

Not automatable from this session (no access to the real user's Google session). With the dev server running and signed in as `lironrubin100@gmail.com`:

- [ ] Visit `/profile` → click "✎ עריכת פרופיל" → lands on `/profile/edit` with current name/bio prefilled.
- [ ] Upload a photo → appears in the grid; remove it → disappears; upload 2, use ◀/▶ to reorder.
- [ ] Pick a few tags, click Save → redirected to `/profile`, tags now show with their Hebrew labels.
- [ ] Enter a non-`.ac.il` email in the student verification field → sending a code is rejected with the Hebrew error message.
- [ ] Enter a real `.ac.il`/`bgu.ac.il` address you can receive mail at → code arrives → entering it flips the badge to "מאומת כסטודנט".
- [ ] Visit `/settings` from the Profile page's settings row → toggle notifications → reload → state persisted.
- [ ] On Profile, click the mode row → switch mode in the sheet → Profile now shows the new mode.
