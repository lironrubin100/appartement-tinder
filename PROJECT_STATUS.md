# Shutaf project status

Updated: 15 October 2026 (Asia/Jerusalem). This is the shared operational register for all local chats and linked worktrees. Product rules remain in DECISIONS.md. Read this file and one relevant handoff before exploring code.

## What is verified working

| Capability | Verification | Where the code is | Integration / deployment |
| --- | --- | --- | --- |
| Public apartment page in Hebrew and English, photos, per-room prices, private location, share metadata | Real guest browser + SQL privacy checks; invalid/missing/rented IDs return HTTP 404 | Implementation snapshot 5f3bc7f | Merged and pushed to GitHub master in c80e9b2; Vercel production READY |
| Publish apartment and rooms, then confirmation with View listing | Real compressed photo uploads; corrupt-image recovery; atomic-write failure rollback; Hebrew/English | Implementation snapshot 5f3bc7f | Merged and pushed to GitHub master in c80e9b2; Vercel production READY |
| Owner dashboard, price ranges and mark-rented action | Real two-account authorization; persistence and cancel/confirm; disappears from public reads | Implementation snapshot 5f3bc7f | Merged and pushed to GitHub master in c80e9b2; Vercel production READY |
| Resident draft/profile/photo/traits, persistent login and return to intended destination | Fresh real Chrome onboarding, reload, public/private projection and locale tests | Implementation snapshot c80e9b2 | Merged and pushed to GitHub master in c80e9b2 |
| Individuals/Groups discovery, introductions, personal and configurable group chats | Fresh separate browser accounts; recipient acceptance, live delivery/reload, consent, admission votes, capacity and private history | Implementation snapshot c80e9b2 | Three live migrations applied; merged/pushed in c80e9b2 |
| Public listing → sign-in return → persistent inquiry → owner acceptance → private address/chat | Fresh guest/renter/owner/outsider browser and ordinary-client checks | Implementation snapshot c80e9b2 | Three live migrations applied; merged/pushed in c80e9b2 |

These are local acceptance results from 15 October, not a claim about the deployed app. [Full verification](docs/LISTING_SLICES_VERIFICATION.md).

## Registered workstreams

| Work ID | Outcome / state | Location | Next step |
| --- | --- | --- | --- |
| [2026-10-15-map-m02](docs/workstreams/2026-10-15-map-m02.md) | CARTO Positron tiles and OSM/CARTO attribution deployed to Vercel Production from `a150a7c`; static checks, Preview and production auth-route smoke checks passed. Authenticated phone-width map imagery remains unverified because this checkout has no disposable QA fixture. | `C:/Users/User/.codex/worktrees/60b8/appartement tinder`, `codex/map-m02-carto` | For fuller release evidence, run the focused attribution test and inspect `/map` and `/en/map` with a disposable authenticated fixture. |
| [2026-10-15-resident-journeys](docs/workstreams/2026-10-15-resident-journeys.md) | Three migrations applied; eight real browser acceptance tests passed; QA cleanup audited zero; reusable testing workflow verified | Existing d5e9, codex/resident-journeys | Completed and pushed; use the next-feature handoff |
| [2026-10-15-listing-slices](docs/workstreams/2026-10-15-listing-slices.md) | Three reverified apartment journeys; implementation 5f3bc7f integrated into local master | C:/Users/User/.codex/worktrees/d5e9/appartement tinder; listing snapshot integrated on main; d5e9 now hosts resident-journeys | Choose the next MVP journey and resolve its open decisions |
| [2026-10-15-work-register](docs/workstreams/2026-10-15-work-register.md) | Shared index, handoff workflow and Git inventory | Main checkout documents + d5e9 source + user-level orchestrator skill | Update this index and the owning handoff during future work |

## Current integration and next MVP work

[Verification/integration handoff](docs/workstreams/2026-10-15-integration-cleanup.md) · [Cleanup decisions](docs/WORKTREE_CLEANUP.md). Resident-tab redesign and the three original journeys passed acceptance. [Next three MVP features](docs/NEXT_MVP_FEATURES.md): usable block/report, apartment sharing into chats, and atomic listing editing. [Next conversation prompt](docs/NEXT_CONVERSATION_PROMPT.md). Resolve their recorded OPEN decisions before dependent code; no next-feature implementation has begun.

## All branches and worktrees

[Open the generated Git inventory](docs/WORKTREE_INVENTORY.md): 6 local branches and 7 worktrees: 5 after cleanup plus the active resident-journeys branch (previously 10 and 14). Five old merged branches and the temporary integration branch were removed. It includes detached checkouts, dirty state, upstreams and commit containment against the cached origin/master reference. It does not infer runtime correctness from branch names or commit messages.

Existing local work in c8ce, 4344, onboarding-flow and map-completeness has no current acceptance handoff in this register yet. Read the affected checkout's existing notes and add a handoff when resuming that particular work. Do not perform a new whole-project audit just to populate every historical row. Clean historical branches may already have their commits in the cached integration ref; uncommitted edits remain separate.

## Shared database and publication state

- The MVP uses Supabase project npbduvjnqnbydolmdpsc under J12. Migrations 20261014210721_listing_journeys and 20261014211718_listing_photo_ownership were applied by the listing-slices workstream. The detailed handoff explains their effects and compatibility. Do not apply duplicate migrations because a stale branch lacks their files.
- Resident/group/inquiry migrations 20261015084833, 20261015084841 and 20261015084850 were approved and applied. The dependent UI passed fresh acceptance against these versions.
- Verified application snapshot: c80e9b2 includes the earlier apartment snapshot 5f3bc7f and resident/group implementation. Fast-forwarded local master and pushed to GitHub on 15 October; remote SHA confirmed c80e9b2e8c372ca5a926602ed16ea3342bbc85fc. No PR was created. Vercel automatic production deployment dpl_8CY6gLxmF4uiuRsXSMbwuoWdHLUL reached READY from that exact commit; appartement-tinder.vercel.app was assigned to it. Read-only deployed smoke checks returned login HTTP 200 and missing listing HTTP 404. This is deployment evidence, separate from the local eight-test multi-account acceptance. The preserved nested map experiment still has local changes.
- Four temporary QA accounts and their profiles/listings/photos were removed and zero remaining QA rows/objects were confirmed. Fixture passwords were removed from disk.
- Read cached Git facts as a snapshot. Neither a commit present in origin/master nor a successful local test proves that Vercel is running that version.

## How future chats keep this current

1. Find the primary checkout using the first entry from git worktree list --porcelain. Read its PROJECT_STATUS.md and the one relevant docs/workstreams/<work-id>.md. Confirm the current checkout HEAD and local changes.
2. Before new implementation, add a row and a short handoff identifying outcome, owner chat, worktree/branch (or detached HEAD), decisions and acceptance criteria.
3. Update at meaningful checkpoints and before ending or interrupting work: files changed, what was verified and when, remaining work, live migrations, commit/push/PR/merge/deployment state and the exact next step. Each chat maintains its own handoff file; reread the shared index before editing it.
4. Refresh Git facts with node scripts/project-status.mjs --write --shared from a linked checkout. This reads Git and writes Markdown only. Add new outcomes to the table above only with actual verification evidence.
5. If a record is stale, investigate its affected area. A whole-project audit is reserved for an explicit audit request or a scope that needs one. Never treat an old note as confirmed-current without the relevant narrow checks.

The user-level project-orchestrator skill and primary AGENTS.md describe this lifecycle. The register is available across local worktrees on this computer. The register is committed on local master. The current register and handoffs were pushed with the verified implementation; future changes still need their own authorized publication.

## Resident acceptance and reusable testing

The user explicitly approved the shared MVP migration and requested a master push after verification. Fresh real Chrome against an owned production server: eight passed (1.9 minutes), including three listing regressions, four guest/auth checks and the full resident/group/viewing journey. Final build, TypeScript, targeted ESLint and disposable SQL/RLS checks passed. Nine QA identities and their related data/uploads were removed; all five cleanup counts were zero; server stopped and credentials deleted.

[Testing workflow](docs/TESTING.md) is maintained in the project and linked from both repository and user-level project-orchestrator skills. Helpers prepare nine isolated confirmed users via connector SQL, validate ordinary sign-in, prevent silent acceptance skips, remove owner Storage uploads and scope cleanup to exact fixture IDs. A separate helper forward test signed in all nine new users, removed two real fixture uploads and audited all cleanup counts zero. Both skill copies validated. Future agents should execute this workflow rather than hand the user a manual checklist.

Apple signup is deferred. No full Google OAuth round trip, concurrency/load proof, full older-screen translation or public-launch approval is claimed. Integration and deployment are recorded separately below when completed.

## Final integration checkpoint

Implementation c80e9b2 was committed on codex/resident-journeys, fast-forwarded into local master and pushed successfully; GitHub remote SHA was independently confirmed. Six local branches and seven worktrees remain, with no additional checkout created. The nested map experiment was preserved. No blanket merge or deletion of old unverified work occurred. Both user-level and repository project-orchestrator skills contain the autonomous testing workflow. Next development starts with docs/NEXT_CONVERSATION_PROMPT.md and the three recommendations in docs/NEXT_MVP_FEATURES.md.

Deployment checkpoint: c80e9b2 is verified READY in production; follow-up handoff-only commit 1ef4aba was also pushed. Subsequent documentation commits do not change the verified application source. The current Git inventory remains a dated snapshot, not a live dashboard.
