# Apartment slices: verification and handoff

Latest recheck: production build and expanded real-browser suite passed (3 tests, 30.6s) on fetched origin/master 8daa268 plus implementation snapshot 5f3bc7f. Includes resident/lister posting, absolute metadata URLs, preserved inquiry controls and actual Map exclusion. [Current integration state](workstreams/2026-10-15-integration-cleanup.md). The original record below describes the first verification before integration.

Verified 15 October 2026 (Asia/Jerusalem). Implementation is in detached worktree `C:/Users/User/.codex/worktrees/d5e9/appartement tinder`, based on `b1f12e66225c97602c36abef8ab53e1eec35e600`. No commit, push, merge or deployment was performed.

## Working journeys

| Journey | Result | Evidence |
| --- | --- | --- |
| Apartment to public listing | Hebrew `/listings/:id` and English `/en/listings/:id`, photo gallery, room-price range, bills, availability, language switching and OpenGraph preview metadata | Real guest browser reads, both locale directions, mobile overflow check, HTTP 404 for invalid/missing/rented IDs |
| Publish to confirmation to listing | Browser compression, corrupt-image recovery, photo minimum, guarded submission, atomic apartment/room save, owner-only confirmation and View listing | Three real uploaded JPEGs fetched successfully, two stored rooms at 1700/2200, confirmation uses saved UUID, Hebrew/English browser journey |
| Own dashboard to rented | Own listings only, available-room prices, explicit cancel/confirm, pending and error handling, saved rented status | Second-account dashboard empty and update denied, foreign confirmation 404, reload persisted listing, rented listing absent from public view and guest endpoint |

Original acceptance suite: **3 passed (1.9m)** using installed Chrome, with real Supabase calls and no mocked browser routes. `web/e2e/listing-slices.spec.ts` covers both complete journeys and unavailable IDs. Production `npm run build` passed, including TypeScript and all route generation. Targeted ESLint and `git diff --check` passed. Windows runtime/build commands required execution outside the sandbox because SWC could not canonicalize the worktree path inside it.

SQL checks passed in a single rollback-protected transaction: valid room summaries; invalid-input rejection; a forced room-insert failure rolls back the already-inserted apartment; non-owner update denied; no private columns in anonymous responses; anonymous publish execution denied; rented listing exclusion. Storage ownership SQL checks confirm opaque photo paths and denied non-owner writes.

## Shared database changes

Project: `npbduvjnqnbydolmdpsc` (`roomie-beersheva`), the single MVP environment under J12.

- `20261014210721_listing_journeys.sql`: `get_public_listing(uuid)` returns only one active apartment's allowlisted fields; `publish_apartment(uuid,jsonb)` atomically creates the apartment and rooms using invoker permissions and existing owner RLS.
- `20261014211718_listing_photo_ownership.sql`: new photo paths use the listing UUID rather than the account UUID; Storage's JWT-assigned `owner_id` controls upload/update/delete. Existing owner-prefixed uploads remain compatible. No non-QA native listings existed when this was changed.

The advisor's anonymous SECURITY DEFINER warning for `get_public_listing` is intentional: it exposes one explicit public projection, has an empty search path, grants execution only to the intended roles and never returns address, exact coordinates, account ID or contact fields. Existing view warnings and password-protection settings are separate launch concerns; this work does not approve a public launch.

Cleanup was verified: **0 QA users, 0 QA profiles, 0 QA listings and 0 QA Storage objects** remain. Temporary fixture credentials were removed from disk.

## Files and review boundaries

- Public reads: `web/src/lib/listings/public.ts`, `web/src/components/listings/PublicListing.tsx`, `web/src/app/listings/` and `web/src/app/en/listings/`. Listing layouts validate availability before the page loading boundary, preserving HTTP 404.
- Publication: `web/src/lib/listings/actions.ts`, `validation.ts`, `text.ts`, `web/src/app/(main)/compose/` and English wrappers. `web/next.config.ts` allows the compressed photo payload through Server Actions.
- Owner management: `web/src/app/(main)/my-listings/` and English wrappers; the Map modal links to the complete public page.
- Locale/labels: root layout and proxy carry the route locale; main shell/navigation labels follow it on the new routes; shared Input labels now connect to their fields.
- Database/tests: the two migrations and `supabase/tests/`; real browser acceptance in `web/e2e/listing-slices.spec.ts`.

Scope limits: this verifies the three apartment journeys locally. It does not verify every existing app route, OAuth provider, inquiry/chat flow or production deployment. The rest of the app's English coverage is unchanged. Apartment status controls public visibility; marking rented does not introduce a renewal/relisting policy from open D6.

## Screenshots and preview

Screenshots are saved at `C:/Users/User/.codex/visualizations/2026/10/14/01a13c2d-9321-7ed0-b409-efc64b402f54/listing-slices/`: Hebrew and English publication confirmation, guest desktop/mobile listing, and rented dashboard.

Local preview, using an existing sample listing: `http://localhost:3000/listings/495569cd-12b7-4b48-90e8-708c55eb150d`. It requires the d5e9 server. The fictional QA listings were removed after verification.

For another acceptance run, provision four temporary confirmed QA accounts, each with an onboarded lister profile and private phone. Supply their `{id,email,password}` records in ignored `web/.env.qa.local`; the suite uses ordinary authenticated clients, not a service key. Run with `PLAYWRIGHT_CHANNEL=chrome` on this Windows host. The suite removes photo uploads; the coordinating task must remove the four accounts/listing rows after completion and verify cleanup. Do not use existing personal accounts.

Proposed implementation snapshot: `Complete public apartment, publish confirmation, and owner rented journeys`. Keep the shared database migrations with the corresponding code. Review explicit paths before any authorized staging; no `git add .` in the mixed tree.
