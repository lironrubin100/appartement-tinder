# Onboarding Flow — Design

Status: mockup-approved by user 2026-08-29, iterated twice. Source of truth for conflicts remains `DECISIONS.md`.

## Problem

There is no onboarding flow in the codebase at all. `auth/callback/route.ts`
exchanges the OAuth code and redirects straight to `/profile`, which does
`if (!profile) redirect('/login')` — a brand-new Google sign-in has no
`profiles` row, so it bounces back to `/login` with no way to ever create
one. This blocks every other feature. `(main)/layout.tsx` also has zero auth
check today, so Map/Discover/Chats/Compose are reachable while signed out.

## Goals

1. A first-run flow, Duolingo-paced (one focus per screen, animated,
   skip-where-optional) that gets a new user from "just authenticated" to
   "usable account" in under a minute if they tap through the minimum.
2. Collect only what the app needs to function: identity (name, birth date)
   and the branch (resident vs. non-resident). Everything else — photo, bio,
   lifestyle traits — is optional here and re-offered later from Profile.
3. Close the routing gap: every `(main)` route requires a session and a
   completed profile.
4. Build it as a modular, config-driven step sequence — not one hardcoded
   component per screen — so screens can be reordered, added, or removed by
   editing data, not JSX.

## Non-goals

- The 16-category structured tag picker in full (already built at
  `web/src/utils/profileTags.ts` for Profile Edit) — onboarding's trait
  screen is a lighter first pass, not a replacement for it.
- Building the Discover mode-switcher UI (segmented control). Onboarding's
  data model must support it (see Data model), but the control itself is
  Discover's job when that page gets wired to Supabase.
- Photo upload during onboarding (photo capture already exists in Profile
  Edit; reuse it there, not duplicated here).
- Gender filtering, matching score, i18n routing, Pro/paywall — unchanged
  from the prior spec's non-goals.

## Architecture

### Routing & auth gating

`web/src/app/(main)/layout.tsx` becomes a server component:

```
no session                                → redirect /login
session, no profiles row, or !onboarded   → redirect /onboarding
otherwise                                 → render children as today
```

This also fixes the standing gap where Map/Discover/Chats/Compose have no
auth check at all.

`web/src/app/auth/callback/route.ts`: on a successful code exchange, upsert
a minimal `profiles` row if none exists — `{ id, name: <Google full_name>,
onboarded: false }` — then redirect to `/onboarding` (not `/profile`).
`/onboarding` itself is reachable without a session too (it renders the
intro slides pre-auth); the route only *requires* a session once the flow
reaches the fork.

### Data model

One migration, no new tables:

```sql
alter table profiles
  alter column mode drop default,
  alter column mode drop not null;
```

`mode` (`solo | group | room_filler | lister`, CHECK constraint already
in place) now does triple duty:

- `null` — residency fork not answered yet. This is how `/onboarding`
  resumes correctly after an interrupted session: no separate progress
  column needed.
- `'lister'` — user took the non-resident branch. No further onboarding
  screens apply; they land on the Lister dashboard once that exists
  (tracked separately — see the earlier audit's priority list).
- `'solo' | 'group' | 'room_filler'` — resident. Set to `'solo'` the instant
  the fork is answered "yes" (no dedicated mode-picker screen — see Screen
  sequence). Changed later from Discover's segmented control or the
  existing `ModeSwitcher` in Profile.

Invariant worth stating explicitly: by the time a user can reach any
`(main)` route, `onboarded = true`, which only happens after the fork is
answered, so `mode` is never null there. `ModeSwitcher.tsx`'s
`MODES.find(...) ?? currentMode` fallback is dead code for null in
practice, not a bug to fix here.

Resume semantics generally: every screen after the fork is skipped
automatically on reload if its backing field is already non-null. A
previously-skipped optional field will be asked again if the user never
finished onboarding — accepted as simple and good enough; it stops
mattering the moment `onboarded` flips to `true`.

### Screen sequence

Two intro slides, shared by everyone, unauthenticated:

1. **Shutafim first** — "Find your shutafim" / roommate-matching pitch.
2. **Apartments second** — "Then find the apartment" / map pitch.
3. **Auth** — "Continue with Google".

Then the fork (requires a session):

4. **Residency fork** — "Will you be living here?" → Yes / No.

**No branch** (Lister): a short intake, one field per screen, each its own
step — full name, phone, agency name (agency has a Skip, the other two
don't). Sets `mode = 'lister'` on the last step, `onboarded = true`, done.
Framed as account setup for posting, not roommate-matching copy (a Lister
isn't looking for shutafim themselves).

**Yes branch** (resident): sets `mode = 'solo'` immediately, then:

5. **Name** — prefilled silently from the Google profile's display name,
   editable, required, no Skip, no explanatory caption. The prefill just
   happens.
6. **Birth date** — free-text input, not a native date picker or scroll
   wheel. Auto-formats as you type: digits only, `/` inserted after
   position 2 and 4 (`15032005` → `15/03/2005` live). Client-side 18+ check
   against DECISIONS B5 before Continue enables; same check re-verified
   server-side on write (never trust the client for an age gate).
7. **Trait picker** — one screen. Chips grouped into labeled clusters
   (e.g. "Living space", "Schedule & social", "Habits") pulled from the
   same category set as `profileTags.ts`, not a separate ad hoc list.
   Within a group, selection is exclusive (the underlying column only
   holds one value); across groups, pick as many or as few as you want.
   Whole screen has a Skip.
8. **Done** — confirmation, then into the app.

**Flagged, not yet decided:** the done screen's destination. `DECISIONS.md`
A4 is DECIDED as "app opens on Map" — but the reframed intro now leads with
roommates, so landing on Discover would match the pitch better. Defaulting
to **Map** here (A4 is source of truth and this row wasn't reopened), but
flagging it since it's a real tension, not an oversight — say the word if
you want the onboarding completion CTA to go to Discover instead.

### Component architecture (modular, not hardcoded)

A single ordered array of step descriptors drives the whole flow — no
per-screen components hardwiring "what comes next":

```ts
type Step =
  | { kind: 'intro'; icon: string; title: string; body: string }
  | { kind: 'auth' }
  | { kind: 'fork' }
  | { kind: 'text-field'; field: ProfileField; label: string; skippable: boolean }
  | { kind: 'date-field'; field: 'birth_date'; label: string }
  | { kind: 'trait-picker'; groups: TagGroup[] }
  | { kind: 'lister-intake' }
  | { kind: 'done' };
```

One generic `<OnboardingStep step={...} />` renderer switches on `kind` and
delegates to a small component per kind (`IntroStep`, `TextFieldStep`,
`DateFieldStep`, `TraitPickerStep`, …) — each one only knows how to render
and validate its own `kind`, not the sequence around it. The flow container
holds `stepIndex` state, computes the *applicable* step list from the
current profile row (skipping already-filled fields per the resume rule
above), and hands the active step to the renderer. Adding, removing, or
reordering a screen is an edit to the array — reordering the two intro
slides, dropping the trait picker, adding a future step — never a rewrite
of navigation logic. Each field-writing step calls one shared
`saveField(field, value)` server action rather than each screen owning its
own Supabase call.

### Animation

`framer-motion` (new dependency — approved). `AnimatePresence` wraps the
active step for slide+fade transitions; the progress bar width is a
Framer `animate` tween, not a CSS transition, so it can be interrupted
cleanly on rapid back/next; trait chips get a small scale bounce on
select; the done screen's checkmark draws in.

## Testing

- `tsc --noEmit` for the step-descriptor types (the discriminated union is
  exactly the kind of thing that should fail to compile if a step config
  is missing a required field).
- A plain self-check for the date-mask function (pure, no DOM): a handful
  of `assert`s covering partial input, full input, non-digit characters,
  and the 8-digit cap.
- Manual browser testing for the full authenticated flow (this session's
  Browser pane can't hold the user's real Google session) — called out as
  a step for the user to run themselves, same pattern as the prior plan.
