# SL01.1 — poster intake and safe browsing

- Date: 17 October 2026 (Asia/Jerusalem).
- State: in progress.
- Owner/worktree: current Codex chat; `C:/Users/User/.codex/worktrees/b6f7/appartement tinder` (detached HEAD).
- Starting source: `6926eb4090b9fea42f48dd97d42346f7eea0b0cf`; preceding baseline record: `docs/workstreams/2026-10-17-sl00-baseline.md`.
- Outcome: preserve the short nonresident poster intake, make approved safe browsing reachable without a lifestyle profile, and prevent poster access from becoming resident-style participation.
- Decisions/contracts: B10, D1, D16, I9, I19 and I22; `docs/specs/POSTER_OUTREACH.md`.
- Initial finding: the source already forks resident/lister intake, but redirects listers away from both Discover and Map despite D16/I19. The existing Discover client also exposes resident-introduction controls; its server authorization must be inspected before any UI navigation is opened.
- Scope: local source/test changes plus the explicitly owner-authorized shared Supabase migration. No fixture/account mutation; SL06 poster invitations remain excluded.
- Acceptance plan: targeted static/PGlite checks now; HE/EN desktop/390px and ordinary-user/outsider acceptance only against a separately identified isolated target. The baseline has no local Supabase runtime, so that live acceptance is currently unavailable and will be recorded honestly.

## Next step

Apply the new reviewed conversion migration only to an authorized target, then run real HE/EN browser journeys against it with a disposable lister fixture. Regenerate types and separately authorize code publication. The safe-browsing database migration is live; the UI source and conversion RPC have not been committed, pushed or deployed.

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
- Not run: ordinary-user direct-client and HE/EN desktop/390px browser acceptance. Docker local startup remains unavailable to this Windows session because Docker CLI access requires an administrator-approved `docker-users` membership refresh.

## Remaining external gate

Obtain target-specific authorization to apply `20261017101500_convert_resident_to_lister.sql`, create and remove a narrowly scoped disposable resident/lister/group fixture, then run the specified poster/resident/outsider HE/EN browser journey and exact cleanup. Regenerate TypeScript types, review the local diff, and obtain separate authorization before commit, push or deploy.
