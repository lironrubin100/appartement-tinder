# Project integration report

## Baseline

- Local and remote `master` at integration start: `f858fc679e8ab0332e514c8798c60edc0fcbc72a`.
- Integration branch: `codex/consolidate-project`.
- Production was verified on Vercel at `f858fc6` before this integration.

## Integrated on the branch

1. `b1f12e6 Restore profile passes migration source`
   - Restores source for live migrations `20261013213103_profile_passes_and_like_validation` and `20261013213822_profile_passes_to_user_index`.
   - Adds the matching `profile_passes` TypeScript type.
   - This is provenance/type reconciliation only; the SQL was already applied live.

2. `e1a4bc8 Add accepted listing inquiry chat flow`
   - Records F4 as DECIDED: authenticated renters may send an in-app listing inquiry without a roommate match; an owner must accept before chat/address release.
   - Adds the additive, unapplied migration `20261014000300_listing_inquiry_conversations.sql`.
   - Adapts Contact owner, owner acceptance, the existing chat inbox/thread, and accepted-requester-only address display without replacing the newer chat foundation.

## Release boundary

`e1a4bc8` must remain branch-only until `20261014000300_listing_inquiry_conversations.sql` has been reviewed and applied to the intended Supabase environment. Merging its UI before that migration would make the new RPCs and columns unavailable in production.

The profile-pass reconciliation commit is independently safe to fast-forward into `master`; it has no live behavior change and its migration versions already exist in Supabase history.

## Verification

- `git diff --check`: passed.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- Targeted ESLint for all changed inquiry/chat files: passed.
- `npm run build`: passed.
- No live database writes or migrations were run.
- Two-account browser/RLS testing is still required in a local/staging database after the inquiry migration is applied. Verify duplicate-safe requests, owner-only acceptance, conversation membership, and that pending/unrelated users cannot read the exact address.

## Excluded work

- `c8ce` Discover/pass UI: not ported because C6, C8, and F8 remain OPEN. Its attributable profile-pass migration source was recovered.
- `c8ce` alternative chat composer/actions: not ported because current `master` already has a newer realtime `ChatThread` and inbox foundation.
- `onboarding-flow-impl`: not ported; stale and conflicts with privacy/routing decisions.
- `worktree-map-completeness`: not ported; planning document depends on still-OPEN decisions and obsolete anonymous-auth assumptions.
- `AUTH_DEPLOYMENT_RUNBOOK.md`: not ported; it documents email/password flows that conflict with decided B1 (Google + Apple).
- Historical publishing, saves/interests, and fixtures branches: already merged into `master`; no duplicate integration was performed.

## Recommended next task

Apply and test the inquiry migration in a staging Supabase branch with two fictional QA accounts, then merge `e1a4bc8` into `master` and run the two-user browser acceptance/privacy flow before production release.
