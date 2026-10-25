# Resident discovery and three MVP journeys

Updated 15 October 2026 (Asia/Jerusalem). Status: user explicitly approved the shared-database changes; all three migrations applied. Fresh multi-account acceptance passed; all QA data cleaned. Implementation c80e9b2 is merged and pushed to GitHub master.

Owner: current chat; existing d5e9 checkout; branch `codex/resident-journeys`, base `2c6de4a`. One implementation writer; two bounded read-only audits. No additional worktree. Read-only follow-up review found legacy introduction indexes and a concurrent acceptance race; both were addressed. Follow-up agents then hit their usage limit; no claim of a completed independent final review.

## Approved outcomes and rules

- No resident Solo/Group/Room-Filler search mode. Individuals and Groups are freely switchable views inside Discover. Personal profile and conversations remain available after joining a group. Resident/non-resident property-poster intake stays separate (D1/B10).
- New resident → useful public profile → Discover; draft saving, private DOB/phone, optional photo/bio/16 structured resident traits, remembered session, locale and startup preference.
- Public apartment → authentication and return to the same listing → inquiry → owner acceptance → private exact address and conversation.
- Trait introduction → acceptance → persistent conversation, with group discovery and group conversations added to the same system.
- User confirmed: four-member starting cap; creator/admin manages members; invite accepted connections with explicit recipient consent; admission setting admin/any member/strict majority; newcomers see new messages only; no minimum introduction text; twenty introductions per UTC day including accepted ones; Pass expires after thirty days; symmetric blocking; only active apartments may newly accept inquiries.
- Apartment sharing into either conversation and contacting landlords as a group remain future work. Admin departure/ownership succession is deferred; non-admin self-leave and admin removal are implemented. Search ranking and advanced filters remain undecided; remove previously inert filter controls rather than pretend they work. Feed pagination uses a stable UUID cursor, without a compatibility-ranking claim.

Updated product rules: I9/I19, E1/E2/E3/E5/E9, C6/C7/C8/C12, H1. PRD, architecture and AGENTS now describe discovery without resident search modes. E4 and other OPEN rows remain open.

## Implemented source

- Auth/navigation: allowlisted internal return paths through email password login/signup, OAuth callback, OTP confirmation and onboarding; rotated cookies/cache headers preserved. New `/en` entry routes and localized navigation. Existing Map, Settings and profile-editor bodies still contain earlier Hebrew-only copy; wrappers keep destinations reachable but do not constitute a full translation of those older screens.
- Onboarding: single atomic RPC saves profile/private fields and draft/completion; private incomplete profiles excluded from public projection; primary photo synchronized from photo rows. New form offers typed DD/MM/YYYY and grouped optional traits. New photo uploads use existing compression helper.
- Listing contact: direct guest sign-in/onboarding CTA, persistent pending state, accepted-conversation link and owner management link. Owner acceptance rechecks active status/blocking and fixes existing `select i into row` bug to `select i.* into row`.
- Discover: Individuals/Groups toggles, member profile details, actual trait references, optional message, RPC quota/deduplication, persistent passes, pagination and retry/skeleton states. Group feed excludes own/blocked/passed/pending/accepted groups and groups without a free place.
- Chats/groups: pending personal/group introductions, majority vote count, explicit invitations, create group from accepted personal connections, settings/invites/removal, personal and group inbox entries. Group formation creates a separate conversation and keeps original personal chats.
- Chat history: server-issued ordered message positions; admission locks the conversation and records the visibility boundary; RLS, inbox previews and unread counts respect it. Column grants prevent modifying membership boundaries or reading old denormalized previews. Realtime catch-up, sequence ordering, send-response deduplication and older-message pagination.
- Blocking: each blocked party loses access to their shared thread; other members without a blocked relationship retain access. Group discovery/admission and address reads cannot bypass blocking.

## Shared-database changes — approved and applied

Project: `npbduvjnqnbydolmdpsc` (existing J12 shared MVP).

1. `20261015084833_resident_journeys.sql`: normalize legacy resident values to `resident` in the existing `mode` column (column now represents resident/lister intake only), atomic onboarding/photo sync, safer profile column grants, durable introduction status, quota, passes and individual discovery.
2. `20261015084841_group_conversations.sql`: configurable admission, consent invites/votes, RPC-only membership, four-member cap, member-only raw rosters, ordered message history boundary, safe inbox and group projections.
3. `20261015084850_inquiry_acceptance_guards.sql`: fix acceptance row read, owner/availability/block checks, prohibit direct inquiry mutation and block-aware exact address projection.

The user explicitly approved applying these changes after the earlier automatic approval rejections. All three were applied successfully on 15 October; repository filenames now match live versions 20261015084833, 20261015084841 and 20261015084850. Two existing resident values were normalized from solo to resident. Types were regenerated from the live schema, with documented refinements for nullable RPC inputs, trigger-generated message sequence and non-null public apartment fields. Older checkouts using direct likes writes/modes require the new code.

## Verification evidence

- Final production `npm run build`: passed, including TypeScript and route generation (29 routes). Final `npx tsc --noEmit`: passed. No remote deployment at this checkpoint.
- Targeted ESLint: passed for new auth/onboarding/discovery/chats/groups, new shared UI and types. `git diff --check`: passed.
- Disposable in-memory Postgres via PGlite: `scripts/test-resident-sql.mjs` passed. Applies all three migrations and verifies private drafts/atomic failure, trait validation, zero-character introduction, repeated acceptance, explicit invitation consent, admin/any-member/majority rules, capacity/removal, hidden history and previews, outsider denial, pass expiry, blocking, quota, inquiry owner/availability/address checks and denied direct mutation. This is real local SQL/RLS execution, not Supabase/Realtime/browser integration evidence. It bootstraps repository schema/RLS and removes one known stale revoke for the moved student-verification column; it is not a clone of the live database. Concurrent transactions and Realtime delivery still need integration testing.
- Final real Chrome against an owned local production server: `listing-slices.spec.ts`, `resident-auth-guest.spec.ts`, `resident-live.spec.ts` with one worker — **8 passed in 1.9 minutes**. Fresh users exercised resident draft/resume/photo/private projection/startup, introduction and recipient acceptance, two-way live chat and reload, group invitation consent, majority/any-member admission, capacity/new-history/outsider/block checks, lister intake/publication, guest password-login return, persistent inquiry, owner acceptance, private address and two-way inquiry chat. Includes all three earlier listing regressions and four guest/auth/locale tests. No mocks or outbound mail.
- Realtime bugs found and fixed: explicitly authenticate with the current user token before subscribing; unique channel per effect prevents cached-channel teardown collisions; wait for subscription plus replication readiness and catch up; ignore stale callbacks and deduplicate ordered messages. UI exposes connecting/live/offline/reconnect states.
- Nine isolated QA accounts and their related rows/uploads were removed; database audit confirmed users=0, profiles=0, listings=0, groups=0 and Storage objects=0. Temporary credential file deleted and owned server stopped.
- Added `docs/TESTING.md`, orchestrator reference and reusable QA helper commands at the user's request. Locked PGlite 0.5.10; `npm run test:db` passed without a temporary host-specific runtime. Helper forward test provisioned nine new confirmed identities through the connector, signed in all nine with ordinary clients, uploaded two disposable objects, removed them through owner Storage permissions, applied scoped cleanup and confirmed all five counts zero. Overwrite/premature-forget guards rejected as expected. Final helper/test ESLint and TypeScript passed; both skill copies passed the skill validator. This second helper-only run did not rerun or replace the fresh eight-test acceptance result.

Reproduce using `docs/TESTING.md`: from web, `npm ci`, `npm run test:db`, prepare isolated fixtures through the connector, then `npm run test:acceptance` and the documented cleanup. Integration preflight rejects absent fixtures instead of silently succeeding with skipped tests. User-level and repository orchestrator skills both route to this workflow.

## Exact next step

Completed: committed c80e9b2, fast-forwarded local master, pushed to GitHub and confirmed the remote SHA. The nested map experiment was preserved. Next development uses docs/NEXT_CONVERSATION_PROMPT.md after resolving the next slices' OPEN choices. Apple signup is explicitly deferred under updated B1; do not block on it. No complete Google OAuth round trip, load/concurrency proof, full older-screen translation or public-launch approval is claimed.

`docs/NEXT_MVP_FEATURES.md` selects block/report, apartment-card sharing and atomic listing editing. `Git 6955c7f:docs/NEXT_CONVERSATION_PROMPT.md` is the next-chat prompt. Keep them synchronized with final Git/verification state before handoff.

At this checkpoint: six local branches and seven worktrees; no new worktree was added. Main holds the earlier verified apartment integration; resident integration/push is next. See the final integration record below when present.

## Final integration record

15 October 2026: implementation c80e9b2e8c372ca5a926602ed16ea3342bbc85fc committed, merged with --ff-only and pushed to origin/master; remote SHA confirmed. Vercel automatic production deployment dpl_8CY6gLxmF4uiuRsXSMbwuoWdHLUL reached READY from that exact commit and received appartement-tinder.vercel.app. Deployed read-only smoke checks: /en/login HTTP 200, absent apartment HTTP 404. Full multi-account acceptance was performed against the local production server, not repeated against the deployed origin. No PR or manual promotion. Six local branches/seven worktrees remain. Source, eight-test acceptance, both QA cleanup audits, schema state, skill validation and next-work handoff are now recorded.
