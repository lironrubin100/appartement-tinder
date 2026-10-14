# Shutaf project status

Updated: 15 October 2026 (Asia/Jerusalem). This is the shared operational register for all local chats and linked worktrees. Product rules remain in DECISIONS.md. Read this file and one relevant handoff before exploring code.

## What is verified working

| Capability | Verification | Where the code is | Integration / deployment |
| --- | --- | --- | --- |
| Public apartment page in Hebrew and English, photos, per-room prices, private location, share metadata | Real guest browser + SQL privacy checks; invalid/missing/rented IDs return HTTP 404 | Implementation snapshot 5f3bc7f | Local-master integration pending; no deployment |
| Publish apartment and rooms, then confirmation with View listing | Real compressed photo uploads; corrupt-image recovery; atomic-write failure rollback; Hebrew/English | Implementation snapshot 5f3bc7f | Local-master integration pending; no deployment |
| Owner dashboard, price ranges and mark-rented action | Real two-account authorization; persistence and cancel/confirm; disappears from public reads | Implementation snapshot 5f3bc7f | Local-master integration pending; no deployment |

These are local acceptance results from 15 October, not a claim about the deployed app. [Full verification](docs/LISTING_SLICES_VERIFICATION.md).

## Registered workstreams

| Work ID | Outcome / state | Location | Next step |
| --- | --- | --- | --- |
| [2026-10-15-listing-slices](docs/workstreams/2026-10-15-listing-slices.md) | Three reverified apartment journeys; committed as 5f3bc7f; integration pending | C:/Users/User/.codex/worktrees/d5e9/appartement tinder; codex/verified-listing-slices at 5f3bc7f | User approved integration; complete local master update |
| [2026-10-15-work-register](docs/workstreams/2026-10-15-work-register.md) | Shared index, handoff workflow and Git inventory | Main checkout documents + d5e9 source + user-level orchestrator skill | Update this index and the owning handoff during future work |

## Current integration and next MVP work

[Verification/integration handoff](docs/workstreams/2026-10-15-integration-cleanup.md) · [Cleanup decisions](docs/WORKTREE_CLEANUP.md) · [Three proposed MVP slices](docs/MVP_NEXT_SLICES.md). The next slices are proposals; the user requested information before development.

## All branches and worktrees

[Open the generated Git inventory](docs/WORKTREE_INVENTORY.md): 14 worktrees and 10 named local branches at the initial snapshot; seven redundant checkouts have since been removed. It includes detached checkouts, dirty state, upstreams and commit containment against the cached origin/master reference. It does not infer runtime correctness from branch names or commit messages.

Existing local work in c8ce, 4344, onboarding-flow and map-completeness has no current acceptance handoff in this register yet. Read the affected checkout's existing notes and add a handoff when resuming that particular work. Do not perform a new whole-project audit just to populate every historical row. Clean historical branches may already have their commits in the cached integration ref; uncommitted edits remain separate.

## Shared database and publication state

- The MVP uses Supabase project npbduvjnqnbydolmdpsc under J12. Migrations 20261014210721_listing_journeys and 20261014211718_listing_photo_ownership were applied by the listing-slices workstream. The detailed handoff explains their effects and compatibility. Do not apply duplicate migrations because a stale branch lacks their files.
- Verified application snapshot: 5f3bc7f. The user authorized local-main integration on 15 October; it is in progress. No push, PR or Vercel deployment has been performed.
- Four temporary QA accounts and their profiles/listings/photos were removed and zero remaining QA rows/objects were confirmed. Fixture passwords were removed from disk.
- Read cached Git facts as a snapshot. Neither a commit present in origin/master nor a successful local test proves that Vercel is running that version.

## How future chats keep this current

1. Find the primary checkout using the first entry from git worktree list --porcelain. Read its PROJECT_STATUS.md and the one relevant docs/workstreams/<work-id>.md. Confirm the current checkout HEAD and local changes.
2. Before new implementation, add a row and a short handoff identifying outcome, owner chat, worktree/branch (or detached HEAD), decisions and acceptance criteria.
3. Update at meaningful checkpoints and before ending or interrupting work: files changed, what was verified and when, remaining work, live migrations, commit/push/PR/merge/deployment state and the exact next step. Each chat maintains its own handoff file; reread the shared index before editing it.
4. Refresh Git facts with node scripts/project-status.mjs --write --shared from a linked checkout. This reads Git and writes Markdown only. Add new outcomes to the table above only with actual verification evidence.
5. If a record is stale, investigate its affected area. A whole-project audit is reserved for an explicit audit request or a scope that needs one. Never treat an old note as confirmed-current without the relevant narrow checks.

The user-level project-orchestrator skill and primary AGENTS.md describe this lifecycle. The register is available across local worktrees on this computer. Local commits are being integrated; GitHub/cloud chats will need an authorized push or an attached copy.
