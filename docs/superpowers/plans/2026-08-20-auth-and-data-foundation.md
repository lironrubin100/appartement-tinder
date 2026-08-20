# Auth & Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded "Ari Rubin" profile page with a real Google-authenticated user, and migrate the live database so `profiles` can hold the structured 31-category-taxonomy tags (renter half), a photo gallery, notifications preference, and student-email-verification fields — the foundation the Edit Profile / verification / settings plan builds on next.

**Architecture:** `@supabase/ssr` cookie-based auth (browser client, server client, proxy-based session refresh) backed by Google OAuth. A DB migration on the live `roomie-beersheva` project (`npbduvjnqnbydolmdpsc`) extends `profiles` and adds `profile_photos` + a `profile-photos` storage bucket, on top of the existing schema (not a rename — `DECISIONS.md` J1's final entity model is still `OPEN`, so table/column naming stays as-is; only additive/removal changes decided elsewhere in the register are made). `web/src/types/database.ts` is regenerated from the live DB post-migration rather than hand-patched, since it was already drifted from both the live schema and `schema.sql`.

**Tech Stack:** Next.js 16 (App Router, `proxy.ts` — **not** `middleware.ts`, renamed in this version), `@supabase/ssr`, `@supabase/supabase-js`, existing Tailwind/shadcn-style UI kit in `web/src/components/ui`.

**Spec:** `docs/superpowers/specs/2026-08-20-profile-edit-design.md`

## Global Constraints

- Auth provider: Google only (DECISIONS.md B1 — no password auth).
- `profiles` RLS already has `write_own_profile` (update, owner-only) and a `handle_new_user()` trigger that auto-inserts a row on `auth.users` insert (`supabase/rls.sql:6-16`) — do **not** duplicate profile-provisioning logic in application code, the trigger already does it.
- `is_pro` and `is_verified` are already revoked from client `UPDATE` (`supabase/rls.sql:61`) — any new trust-bearing column added in this plan must get the same treatment.
- `apartment_hype_faces` (view, `supabase/rls.sql:171-180`) reads `profiles.photo_url` / `profiles.photo_blur_url` for the Pro-unblur gate — those columns must **not** be dropped or renamed by this plan.
- No test framework exists in `web/` and none is being introduced (spec Non-goals). Pure-logic branches still get a plain `node`-runnable assert self-check; everything else is verified by running the dev server.

---

### Task 1: Install Supabase packages and fix the broken server client

The existing `web/src/utils/supabase/server.ts` calls `createServerComponentClient` — that's an `@supabase/auth-helpers-nextjs` API, not `@supabase/ssr` (which only exports `createServerClient`/`createBrowserClient`). Nothing currently runs because the packages aren't even installed. `client.ts` already uses the correct `@supabase/ssr` API and needs no change.

**Files:**
- Modify: `web/package.json`
- Modify: `web/src/utils/supabase/server.ts`

**Interfaces:**
- Produces: `createServerClient(): Promise<SupabaseClient<Database>>` (same exported name/shape as before, callers in later tasks just `await createServerClient()`).

- [ ] **Step 1: Add dependencies**

```bash
cd "web" && npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Rewrite `server.ts` to the real `@supabase/ssr` API**

```typescript
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render; proxy.ts refreshes
            // the session on the request path instead, so this is safe
            // to ignore here.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create `web/.env.local`** (gitignored — confirmed via `web/.gitignore`'s `.env*` rule)

```
NEXT_PUBLIC_SUPABASE_URL=https://npbduvjnqnbydolmdpsc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wYmR1dmpucW5ieWRvbG1kcHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTA4NDgsImV4cCI6MjEwMjcyNjg0OH0.0jm3utus6r9KVwGKQdYcpiyaKSvVuFVppWEDpWMFXXg

# Only needed for Plan B's student-email OTP verification (server-side
# admin client). Get it from Supabase Dashboard > Project Settings > API
# > service_role secret. Never expose this to the browser.
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 4: Verify the package installs and the file compiles**

Run: `cd "web" && npx tsc --noEmit`
Expected: no errors referencing `server.ts` (pre-existing unrelated errors elsewhere, if any, are out of scope).

- [ ] **Step 5: Commit**

```bash
git add web/package.json web/package-lock.json web/src/utils/supabase/server.ts
git commit -m "Wire real @supabase/ssr client (server.ts was calling a nonexistent API)"
```

---

### Task 2: Session-refresh proxy (Next.js 16 renamed `middleware.ts` to `proxy.ts`)

Confirmed against `web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`: the `middleware.js` convention is deprecated in this Next.js version and replaced by `proxy.js`, exporting a function named `proxy` (not `middleware`). Using the old filename would silently no-op.

**Files:**
- Create: `web/src/utils/supabase/proxy.ts`
- Create: `web/src/proxy.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars (Task 1).
- Produces: nothing consumed by later tasks directly — this runs on every request and keeps the session cookie fresh for `server.ts`'s client.

- [ ] **Step 1: Write the session-refresh helper**

```typescript
// web/src/utils/supabase/proxy.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth token if it's expired — required reading for every
  // Server Component that calls createServerClient() during this request.
  await supabase.auth.getUser();

  return response;
}
```

- [ ] **Step 2: Wire it into `proxy.ts`**

```typescript
// web/src/proxy.ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 3: Verify it runs**

Run: `cd "web" && npm run dev`, then open the site root in a browser.
Expected: page loads with no console/server error about `proxy`; check `preview_logs` for the dev server shows no proxy-related exception.

- [ ] **Step 4: Commit**

```bash
git add web/src/proxy.ts web/src/utils/supabase/proxy.ts
git commit -m "Add session-refresh proxy (Next 16 renamed middleware.ts to proxy.ts)"
```

---

### Task 3: Login page (Google OAuth)

**Files:**
- Create: `web/src/app/login/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/utils/supabase/client` (existing, unmodified).
- Produces: route `/login`, linked to by Task 4's redirect-when-unauthenticated logic.

- [ ] **Step 1: Write the login page**

```typescript
'use client';

import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui';

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-page-bg px-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <h1 className="text-3xl font-bold text-ink">Shutaf</h1>
        <p className="text-body-text">התחברות עם חשבון גוגל כדי להמשיך</p>
        <Button variant="primary" size="lg" className="w-full" onClick={signInWithGoogle}>
          המשך עם Google
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Run the dev server, navigate to `/login`.
Expected: page renders the button; clicking it redirects to Google's consent screen (or a Supabase error banner reading "Unsupported provider" if Google isn't enabled yet in the dashboard — see Task 7).

- [ ] **Step 3: Commit**

```bash
git add web/src/app/login/page.tsx
git commit -m "Add Google OAuth login page"
```

---

### Task 4: Auth callback route + sign-out action

**Files:**
- Create: `web/src/app/auth/callback/route.ts`
- Create: `web/src/app/(main)/profile/actions.ts`

**Interfaces:**
- Consumes: `createServerClient()` from `@/utils/supabase/server` (Task 1).
- Produces: route `/auth/callback` (set as the OAuth `redirectTo` in Task 3); Server Action `signOut()` consumed by Task 6's profile page.

- [ ] **Step 1: Write the callback route handler**

```typescript
// web/src/app/auth/callback/route.ts
import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/profile`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
```

- [ ] **Step 2: Write the sign-out Server Action**

```typescript
// web/src/app/(main)/profile/actions.ts
'use server';

import { createServerClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

- [ ] **Step 3: Verify the full round trip**

With Google enabled in the Supabase dashboard (Task 7), click through `/login` → Google consent → should land on `/profile` with a session cookie set (check via `read_network_requests` or browser devtools Application > Cookies for `sb-...-auth-token`).

- [ ] **Step 4: Commit**

```bash
git add web/src/app/auth/callback/route.ts "web/src/app/(main)/profile/actions.ts"
git commit -m "Add OAuth callback route and sign-out action"
```

---

### Task 5: Database migration — structured tags, student verification, photo gallery

Applies to the live `roomie-beersheva` project (`npbduvjnqnbydolmdpsc`) via the Supabase migration tool, then syncs `supabase/schema.sql` and `supabase/rls.sql` (source-controlled copies) and regenerates `web/src/types/database.ts` from the live DB so all three stop drifting apart. `profiles` currently has 0 rows, so no backfill logic is needed.

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `supabase/rls.sql`
- Modify: `web/src/types/database.ts` (full regeneration, see Step 3)

**Interfaces:**
- Produces: `profiles` columns `student_email`, `student_email_verified_at`, `notifications_enabled`, and the 16 renter-lifestyle category columns listed in the spec; table `profile_photos(id, profile_id, url, display_order, created_at)`; storage bucket `profile-photos`. These are the exact names Plan B's Edit Profile screen and verification routes read/write.

- [ ] **Step 1: Apply the migration**

Run via the Supabase MCP `apply_migration` tool (`project_id: npbduvjnqnbydolmdpsc`, name: `profile_tags_and_gallery`) with this SQL:

```sql
-- Drop the free-text tag array (DECISIONS.md C1: structured columns, not
-- text[]) and add the 16 renter-lifestyle categories + student
-- verification + notifications toggle. photo_url/photo_blur_url on
-- profiles are left untouched — apartment_hype_faces still reads them for
-- the Pro-unblur gate.
alter table profiles
  drop column vibe_tags,
  add column student_email text,
  add column student_email_verified_at timestamptz,
  add column notifications_enabled boolean not null default true,
  add column gender_dynamic text check (gender_dynamic in ('1_guy_guys','2_girls_1_girl','coed_anyone')),
  add column cleanliness text check (cleanliness in ('very_clean','clean','average','relaxed')),
  add column sleep_schedule text check (sleep_schedule in ('early_bed_early_wake','night_owl','flexible')),
  add column social_guests text check (social_guests in ('frequent_visitors','occasional','rarely')),
  add column noise_tolerance text check (noise_tolerance in ('quiet','moderate','high')),
  add column music_vibe text check (music_vibe in ('silent','ambient','upbeat','loud')),
  add column climate text check (climate in ('cold','moderate','hot')),
  add column smoking text check (smoking in ('yes','no','outdoor_only')),
  add column kitchen_dietary text check (kitchen_dietary in ('strict','vegetarian','mixed')),
  add column cooking_dynamics text check (cooking_dynamics in ('shared_cooking','individual','meal_prep')),
  add column pets text check (pets in ('yes','no','small_only')),
  add column weekend_routine text check (weekend_routine in ('home_body','mixed','always_out')),
  add column relationship_status text check (relationship_status in ('single','in_relationship','flexible')),
  add column study_habits text check (study_habits in ('heavy_studying','moderate','minimal')),
  add column financial_splitting text check (financial_splitting in ('strict','flexible','shared_expenses')),
  add column miluim_reserve_duty text check (miluim_reserve_duty in ('active','occasional','none'));

-- Trust-bearing like is_pro/is_verified (already locked down in rls.sql) —
-- only the server-side OTP-verify route (Plan B, admin client) may set this.
revoke update (student_email_verified_at) on profiles from authenticated;

create table profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  url text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on profile_photos (profile_id, display_order);

alter table profile_photos enable row level security;
create policy read_profile_photos on profile_photos for select to authenticated using (true);
create policy own_profile_photos on profile_photos for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "users upload their own profile photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update their own profile photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own profile photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Verify via `list_tables`**

Run the Supabase MCP `list_tables` tool for `npbduvjnqnbydolmdpsc`, `public` schema, verbose.
Expected: `profiles` has the new columns and no `vibe_tags`; `profile_photos` exists with the columns above.

- [ ] **Step 3: Regenerate `database.ts` from the live schema**

Run the Supabase MCP `generate_typescript_types` tool for `npbduvjnqnbydolmdpsc` and overwrite `web/src/types/database.ts` with its output verbatim (prepend the existing header comment). This replaces the old hand-written file, which had already drifted into describing tables/RPCs (`swipes`, `matches`, `favorites`, `hand_me_downs`, `get_discover_feed`, …) that don't exist in the live database — keeping those was actively misleading, not merely stale.

- [ ] **Step 4: Update `supabase/schema.sql` and `supabase/rls.sql` to match**

Edit `supabase/schema.sql`'s `profiles` table definition (`schema.sql:8-28`) to match the migration above (remove `vibe_tags`, add the new columns) and add the `profile_photos` table definition after the `profiles` block. Add the `profile-photos` storage bucket + policies and the `revoke update (student_email_verified_at)` line to `supabase/rls.sql` next to the existing `revoke update (is_pro, is_verified)` line (`rls.sql:61`).

- [ ] **Step 5: Verify TypeScript still compiles against the regenerated types**

Run: `cd "web" && npx tsc --noEmit`
Expected: no new errors (existing `profile/page.tsx` still references the old shape until Task 6 — that's expected to error here and get fixed in the next task; confirm the *type file itself* is valid by checking there's no syntax error reported for `database.ts`).

- [ ] **Step 6: Commit**

```bash
git add supabase/schema.sql supabase/rls.sql web/src/types/database.ts
git commit -m "Migrate profiles to structured tags + student verification + photo gallery"
```

---

### Task 6: Profile page reads the real signed-in user

Replaces every hardcoded value in `web/src/app/(main)/profile/page.tsx` with data read from the session + `profiles` row. Keeps the existing visual sections (this task is data plumbing, not the redesign — Plan B rebuilds the tag pickers, mode switcher, and settings split). Unauthenticated visitors are redirected to `/login`.

**Files:**
- Modify: `web/src/app/(main)/profile/page.tsx`

**Interfaces:**
- Consumes: `createServerClient()` (Task 1), `signOut()` from `./actions` (Task 4), `Database['public']['Tables']['profiles']['Row']` (Task 5).

- [ ] **Step 1: Rewrite the page as an async Server Component**

```typescript
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { Avatar, Button, Badge } from '@/components/ui';
import { signOut } from './actions';

const MODE_LABELS: Record<string, string> = {
  solo: '🏠 מחפש דירה',
  group: '👥 בקבוצה',
  room_filler: '➕ מחפש שותפים',
  lister: '🔑 משכיר',
};

const TAG_COLUMNS = [
  'gender_dynamic', 'cleanliness', 'sleep_schedule', 'social_guests',
  'noise_tolerance', 'music_vibe', 'climate', 'smoking', 'kitchen_dietary',
  'cooking_dynamics', 'pets', 'weekend_routine', 'relationship_status',
  'study_habits', 'financial_splitting', 'miluim_reserve_duty',
] as const;

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  const age = profile.birth_date
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const setTagCount = TAG_COLUMNS.filter((key) => profile[key]).length;

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)]">
      <div className="max-w-2xl mx-auto bg-white">
        <div className="border-b border-card-border px-6 py-8">
          <h1 className="text-3xl font-bold text-ink">הפרופיל שלי</h1>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          <div className="flex items-center gap-6">
            <Avatar
              initials={profile.name.slice(0, 2)}
              size="xl"
              verified={profile.is_verified}
              src={profile.photo_url ?? undefined}
            />
            <div>
              <h2 className="text-2xl font-bold text-ink">{profile.name}</h2>
              <p className="text-body-text">
                {age ? `בן/בת ${age}` : 'גיל לא הוגדר'}
              </p>
              {profile.is_verified && (
                <Badge variant="success" className="mt-2">אימות דוא״ל</Badge>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-ink mb-2">ביו</h3>
            <p className="text-body-text">
              {profile.bio || 'עדיין לא הוספת ביו.'}
            </p>
          </div>

          <div className="border-b border-card-border pb-6">
            <h3 className="font-semibold text-ink mb-3">מצב נוכחי</h3>
            <div className="flex gap-3 flex-wrap">
              {(['solo', 'group', 'room_filler'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={profile.mode === mode ? 'primary' : 'ghost'}
                >
                  {MODE_LABELS[mode]}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-ink mb-3">התגים שלי</h3>
            {setTagCount > 0 ? (
              <div className="flex flex-wrap gap-2">
                {TAG_COLUMNS.filter((key) => profile[key]).map((key) => (
                  <Badge key={key}>{String(profile[key])}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-text text-sm">עדיין לא הוספת תגיות.</p>
            )}
          </div>

          <div className="border-b border-card-border pb-6 space-y-4">
            <h3 className="font-semibold text-ink">הגדרות</h3>
            <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
              <span className="text-body-text">🌐 שפה</span>
              <span className="float-end text-muted-text">עברית (תמיד)</span>
            </button>
            <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
              <span className="text-body-text">🔔 הודעות</span>
              <span className="float-end text-muted-text">
                {profile.notifications_enabled ? 'פעיל' : 'כבוי'}
              </span>
            </button>
            <button className="w-full text-start px-4 py-3 hover:bg-neutral-bg-soft rounded-shutaf-md transition-colors">
              <span className="text-body-text">🔒 פרטיות</span>
              <span className="float-end text-muted-text">הצג עוד</span>
            </button>
          </div>

          <div className="space-y-3">
            <Button variant="danger" className="w-full">
              🗑️ מחק חשבון
            </Button>
            <form action={signOut}>
              <button type="submit" className="w-full text-error text-sm hover:underline">
                התנתק
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify against `Avatar`'s prop types**

Read `web/src/components/ui/Avatar.tsx` to confirm `initials`, `size`, `verified`, `src` are its actual prop names before relying on them above (the original mock code already used this shape, so this should already match — just confirm no drift).

- [ ] **Step 3: Manual verification**

With Tasks 1-5 done and Google enabled (Task 7): sign in, land on `/profile`, confirm it shows your real Google name, "עדיין לא הוספת ביו" / "עדיין לא הוספת תגיות" empty states, `mode` defaulting to "🏠 מחפש דירה" highlighted, and that "התנתק" actually signs you out and redirects to `/login`.

- [ ] **Step 4: Commit**

```bash
git add "web/src/app/(main)/profile/page.tsx"
git commit -m "Profile page reads the real signed-in user instead of mock data"
```

---

### Task 7: Manual dashboard step (not automatable) + final smoke test

**Files:** none — dashboard configuration + end-to-end check.

- [ ] **Step 1: Enable Google as an Auth provider**

In the Supabase dashboard for `roomie-beersheva` (`npbduvjnqnbydolmdpsc`): Authentication → Providers → Google → enable, with a Google Cloud OAuth Client ID/Secret whose authorized redirect URI is `https://npbduvjnqnbydolmdpsc.supabase.co/auth/v1/callback`. This step has no MCP tool exposed for it — it must be done by hand in the dashboard. (Flagged as an open question in the spec.)

- [ ] **Step 2: Fill in `SUPABASE_SERVICE_ROLE_KEY`**

From Supabase Dashboard → Project Settings → API → service_role secret, into `web/.env.local` (created in Task 1). Not used until Plan B, but confirm it's present so Plan B doesn't stall on it.

- [ ] **Step 3: End-to-end smoke test**

Run the dev server, click through: `/login` → Google consent → `/profile` shows real data → "התנתק" signs out → redirected to `/login` → visiting `/profile` directly while signed out redirects to `/login`.
