# SL01.1 — poster intake and safe browsing

- Date: 17 October 2026 (Asia/Jerusalem).
- State: completed and published.
- Owner/worktree: current Codex chat; `C:/Users/User/.codex/worktrees/b6f7/appartement tinder` on `codex/sl01-lister-safe-browsing`. Cleanup may retire this redundant checkout after this record is published.
- Starting source: `6926eb4090b9fea42f48dd97d42346f7eea0b0cf`; preceding baseline record: `docs/workstreams/2026-10-17-sl00-baseline.md`.
- Outcome: preserve the short nonresident poster intake, make approved safe browsing reachable without a lifestyle profile, and prevent poster access from becoming resident-style participation.
- Decisions/contracts: B10, D1, D16, I9, I19 and I22; `docs/specs/POSTER_OUTREACH.md`.
- Initial finding: the source already forks resident/lister intake, but redirects listers away from both Discover and Map despite D16/I19. The existing Discover client also exposes resident-introduction controls; its server authorization must be inspected before any UI navigation is opened.
- Scope: source/test changes plus the explicitly owner-authorized shared Supabase migrations. The owner later authorized retained synthetic demo accounts; SL06 poster invitations remain excluded.
- Acceptance plan: targeted static/PGlite checks plus HE/EN browser conversion coverage and a focused live Chats regression on an owned test server. The managed-worktree filesystem prevented a clean local production-build exit, so Vercel's successful production build is the build-release evidence.

## Outcome

The owner authorized the shared target, retained synthetic fixtures and publication. Both reviewed migrations are live, the UI and regression tests are on `master`, and Vercel Production is READY. The next feature should be selected through `docs/START_NEXT_WORK.md`; this worktree can be retired after the handoff is published.

## Implementation

- Reproduction/disproof: ONBOARD-INTAKE-001 is disproved for this source at the static/PGlite level. `resident-onboarding.tsx` already selects a resident or nonresident branch and submits the corresponding server arguments; the actual gap was downstream lister access being redirected away from Discover and Map.
- Added migration `20261017082317_lister_safe_browsing.sql`, created through the official Supabase CLI. It allows any completed account to request the existing allowlisted people/group projections, keeps direct social actions resident-only, and filters block relationships in both directions through the existing block helper. The owner explicitly authorized its application to the shared project on 17 October.
- Discover no longer redirects a completed lister, renders its cards as browse-only, and explains that a resident profile is required for social participation. Map no longer redirects listers. The lister header now exposes My Listings, safe people browsing, Map and Chats.
- Settings now offers a deliberate resident-to-lister conversion: private phone is required, agency is optional, the resident confirms the loss of Discover participation, and success redirects to My Listings. Migration `20261017101500_convert_resident_to_lister.sql` implements the only privileged mode write. It retains private resident values and existing direct chats but blocks conversion for an active group member, avoiding silent group membership corruption.
- Owner decision recorded 17 October: this is an explicit, one-way-for-now B10 capability transition on one account, never a client-side mode write or a second persona. `DECISIONS.md`, lifecycle/data contracts and successor packets now require conversion-aware fixtures and server capability checks for SL01.2, SL02.1, SL06.2 and SL07.1; group lifecycle remains a hard refusal boundary.
- PGlite bootstrap loads the new migration. It proves a lister can read safe people/groups and is rejected for both `pass_discovery` and `send_introduction`; it also proves a blocked individual is absent. Existing public-projection assertions keep private birth date and phone inaccessible.

## Verification

- 17 October: `npm run test:db` passed after the change, including the new completed-lister read/deny/block assertions.
- 17 October: `npx tsc --noEmit` passed.
- 17 October: targeted ESLint passed for Discover, Map and main layout files; `git diff --check` passed.
- 17 October: `npm run test:db`, TypeScript, targeted Settings ESLint and `git diff --check` passed after adding resident-to-lister conversion coverage.
- 17 October: a fresh `npm run build` from `web` reached the Next.js build but this managed Windows worktree failed while creating `.next/types/app/auth` with `EPERM`. This is incomplete build evidence caused by the worktree filesystem boundary, not a claim of a successful production build.
- 17 October: `npm run build` compiled the changed UI, completed TypeScript and static-page generation, and reached trace collection. The runner did not return a final process exit code; treat this as incomplete build-exit evidence, not a release result.
- Shared migration: applied successfully to `npbduvjnqnbydolmdpsc` as `20261017095908_lister_safe_browsing`. Live catalog verification confirms that `discover_individuals`, `discover_groups`, and `pass_discovery` expose execute only to `authenticated`, never `anon`, and each contains its intended new guard. At verification time there were no lister profiles, so a real lister request could not be exercised on the shared project.
- 18 October: migration `20261017101500_convert_resident_to_lister.sql` was applied to `npbduvjnqnbydolmdpsc` as `20261018082834_convert_resident_to_lister`; a direct catalog/guard check confirmed only `authenticated` may execute it and that the function requires the caller's own authenticated identity.
- 18 October: migration `20261018100000_list_accessible_groups.sql` was applied as `20261018100000_list_accessible_groups`; it fixes the Chats server-render path by replacing an unauthorized direct `groups` table read with a guarded `list_accessible_groups()` RPC. Anonymous and `PUBLIC` execution are revoked; authenticated callers receive only groups authorized by `can_access_group`.
- 18 October: `npm run test:db`, `npx tsc --noEmit`, targeted ESLint and `git diff --check` passed. The full acceptance suite produced 9/10 passing before the Chats fix; the one failure was reproduced as an RLS error and fixed. The dedicated `e2e/chats-regression.spec.ts` then passed against a fresh owned server. Retained fixture state means the historical full resident lifecycle test was not rerun, because it assumes a pristine account and would mutate retained demo data.
- 18 October: resident-to-lister browser journeys passed in English at phone width and Hebrew at desktop width. The test exercises the explicit confirmation screen and verifies the resulting lister state.
- 19 October: `ed601e38350fdbb097ce8d006883f007c7493a73` was pushed directly to `origin/master` under owner authorization. Vercel production deployment `dpl_9WpQCm6zThU9HoK34AsQ8x3epcxq` is `READY` for that exact SHA.

## Known limitation

The managed Windows worktree still cannot provide a clean local `next build` exit because `.next/types` creation intermittently receives `EPERM`. This is recorded as a local filesystem limitation, not a product test pass; the Vercel `READY` build is the authoritative publication build evidence for this release.
