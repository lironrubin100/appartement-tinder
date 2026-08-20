# Profile Edit, Student Verification & DB Persistence — Design

Status: approved by user 2026-08-20. Source of truth for conflicts remains `DECISIONS.md`.

## Problem

`web/src/app/(main)/profile/page.tsx` is 100% hardcoded mock data ("Ari Rubin").
There is no login flow, no Supabase client actually wired (`@supabase/*` isn't
even in `package.json`), the "tags" shown are arbitrary strings instead of the
31-category taxonomy `DECISIONS.md` C1/C2/C13 already decided, the mode
selector is three dead buttons with no state, and nothing persists to the
database. The live Supabase project (`roomie-beersheva`,
`npbduvjnqnbydolmdpsc`) still runs the old free-text `vibe_tags` schema, which
is a documented, unfixed contradiction against C1.

Reference: Bumble's edit-profile screens (photo grid, sectioned editable
rows, toggle-backed settings, prompts-style bio) supplied by the user as UX
inspiration — adapted to Shutaf's actual data model per the user's explicit
choice, not copied field-for-field (dating-specific concepts like causes,
star sign, politics, and Spotify connect are out of scope; they don't map to
a roommate/apartment marketplace).

## Goals

1. A real, minimal Google-OAuth login so "the profile" means an actual signed-in user.
2. An Edit Profile screen where photos, bio, name/age, and lifestyle tags are
   editable and persist to the database.
3. Tags drawn from Shutaf's own 31-category taxonomy (renter side, 16
   categories), not generic placeholder badges.
4. A student-email verification flow that is explicitly a *student*
   verification (not a generic "confirm your email"), reusing Supabase
   Auth's OTP mechanism.
5. Settings that are real, DB-backed toggles (notifications) living on their
   own screen per I20, not static button labels on the Profile page.
6. `schema.sql`, the live DB, and `types/database.ts` reconciled — currently
   three different shapes of the same table.

## Non-goals

- Full onboarding wizard (I9), gender filtering (C5), matching score UI (C13
  scoring mechanics), apartment-side 15 categories, i18n routing (I16/I18),
  Pro/paywall, Sentry/PostHog.
- Literal Bumble fields with no Shutaf equivalent: causes & communities,
  qualities I value, star sign, politics, Spotify connect, "Best Photo" AI
  toggle.
- Password-based auth — Google only, per B1 (DECIDED).

## Architecture

### Auth

- Add `@supabase/supabase-js` and `@supabase/ssr` to `web/package.json`
  (already imported by `utils/supabase/client.ts`/`server.ts`, currently
  broken because the packages aren't installed).
- `middleware.ts` at the Next.js root: refreshes the Supabase session cookie
  on every request (standard `@supabase/ssr` pattern).
- `/login` route: single "Continue with Google" button →
  `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- `/auth/callback` route handler: exchanges the OAuth code for a session,
  redirects to `/profile`.
- On first successful login, if no `profiles` row exists for `auth.uid()`,
  insert one (`name` from the Google identity's `full_name`, `mode='solo'`,
  everything else default/null). No onboarding questions asked.
- `profile/page.tsx` becomes a Server Component: reads the session via
  `utils/supabase/server.ts`, redirects to `/login` if there isn't one, reads
  the real `profiles` row (+ `profile_photos`) and renders it.

### Data model (migration on project `npbduvjnqnbydolmdpsc`)

```
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

create table profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles on delete cascade,
  url text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on profile_photos (profile_id, display_order);
-- backfill: existing profiles.photo_url (if any) becomes row 0, then the
-- photo_url/photo_blur_url columns are dropped once backfilled.
```

RLS on `profile_photos`: owner (`profile_id = auth.uid()`) full access;
public `select` (photos are public per B9). Storage bucket `profile-photos`:
public read, owner-only write scoped to a `{auth.uid()}/...` path prefix.

`schema.sql` is regenerated to match the live post-migration schema (it's
currently stale against both the DB and `types/database.ts`); `database.ts`
gets the new columns/table added by hand (or regenerated via
`generate_typescript_types` if convenient) and the old single-photo fields
removed.

### Student email verification

No new email infrastructure — reuses Supabase Auth's built-in OTP send +
verify, run entirely server-side so the six-digit round trip can never swap
the browser's real (Google) session:

1. `POST /api/verify-student-email/start { email }` — validates the domain
   against an allow-list (`post.bgu.ac.il`, `bgu.ac.il`, `sce.ac.il`;
   adjustable in one constant), 400s with a clear message otherwise. Calls
   `admin.auth.signInWithOtp({ email })` to trigger Supabase's OTP email.
2. `POST /api/verify-student-email/confirm { email, code }` — calls
   `admin.auth.verifyOtp({ email, token: code, type: 'email' })`. On success,
   updates the caller's own `profiles` row (`student_email`,
   `student_email_verified_at = now()`, `is_verified = true`) using the
   route's authenticated session, not the OTP's shadow user. The shadow
   `auth.users` row Supabase creates for the OTP email is otherwise unused.
3. UI: a labeled "אימות דוא״ל סטודנטיאלי" (student email verification) field
   in Edit Profile, badge on the main Profile page changes to "מאומת כסטודנט"
   once `student_email_verified_at` is set.

### Edit Profile screen (`/profile/edit`)

- Photo grid, 1–6 slots, upload/remove/drag-reorder against
  `profile_photos`; client-side canvas resize (max ~1080px) before upload —
  no new dependency, mirrors J9's compress-before-upload rule for listings.
- Name, age (derived from `birth_date`), bio (existing 300-char constraint).
- 16 lifestyle-tag categories as single-select chip groups, replacing the
  hardcoded `<Badge>` list on the current Profile page.
- Student email verification field (above).
- Save: client Supabase call, RLS already restricts `profiles` writes to
  `auth.uid() = id` — no new policy needed for the table itself.

### Settings screen (`/settings`, split out per I20)

Language row (display-only — real i18n routing is untouched, separate
item), a real `Switch` bound to `notifications_enabled`, a privacy row
(link only — no privacy screen exists to build yet), delete-account row
(danger, existing button moves here unchanged in behavior). Main Profile
page keeps only a "הגדרות" link row into this screen.

### Mode switcher (Profile page, per I19)

Replaces the three static buttons with a single "כרגע: [mode]" row that
opens a bottom sheet/modal listing Solo / Group / Room-Filler, writes
`profiles.mode` on selection. Lister mode is excluded from the switcher (per
B10/D1, Listers don't have a resident profile in the first place).

## Testing

No test runner exists in `web/` yet. Per project convention (ponytail: every
non-trivial branch needs one runnable check), each new server-side branch
gets a minimal smoke check:
- Domain-allowlist check (`isStudentDomain`) as a plain function with a
  `test`/assert-based self-check callable via `node` — no framework.
- Manual verification via the dev server + browser tools (login → edit
  profile → save → reload → confirm persistence; verification happy path
  and rejected-domain path) since UI flows aren't unit-testable here without
  introducing a new test framework, which is out of scope.

## Open questions carried into implementation

- Exact BGU/SCE student email domain suffixes — using best-guess defaults
  above, single constant, trivial to correct.
- Whether `roomie-beersheva` already has Google OAuth configured as an
  Auth provider in the Supabase dashboard — if not, this needs enabling
  before login works end-to-end (dashboard step, not code).
