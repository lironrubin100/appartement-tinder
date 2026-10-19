# Start or continue the next MVP packet

Owner authorization: select and execute the next approved local MVP work autonomously. Preserve decisions and scope. The objective is a working product for a university-funding demonstration. Do not restart a product interview or wait for the owner to choose an ID.

## One reusable instruction

> Continue the Shutaf MVP autonomously following AGENTS.md and docs/START_NEXT_WORK.md. Select the next eligible packet, implement the missing approved work, verify it and update the execution ledger and shared handoff. Continue to the next eligible packet while you can make meaningful progress. Preserve settled decisions and unrelated work. Under the standing owner authorization of 19 October 2026, commit, non-force push, integrate and publish routine verified changes without another confirmation; ask only for critical actions. Hosted migrations retain AGENTS.md target/data/ownership gates.

## Bootstrap and location

Use the project's current checkout containing this tracked planning package. It was authored in `C:/Users/User/.codex/worktrees/bd33/appartement tinder`; that historical path is not a required startup location. If a stale checkout lacks START_NEXT_WORK.md/next-work.mjs, inspect the primary shared planning row and current master before proceeding; preserve dirty work when updating. Do not reset, discard, copy all dirty files or blindly merge older branches. Find the primary register using the first entry from `git worktree list --porcelain`.

1. Read primary PROJECT_STATUS.md and the owning planning/current execution handoff, current AGENTS.md, HEAD/status. Preserve existing planning changes; a dirty planning checkout is expected and not itself a reason to stop.
2. Run `node scripts/check-planning.mjs`, then `node scripts/next-work.mjs --json`. The second command only selects; it never marks work complete. Initially it selects **SL00.1** because all21 packets are pending.
3. Read only the selected section in EXECUTION_PACKETS.md or REMAINING_MVP_PACKETS.md, required DECIDED rows and linked contracts. Review WORK_PLAN priorities once. No whole-project audit or new taxonomy/design/legal discussion by default.
4. For each predecessor marked verified, read its handoff and confirm the required artifacts actually exist in the chosen source/backend. Source SHA/worktree/diff evidence is not proof code has been integrated elsewhere. If artifact absent or stale, record `verification-incomplete` and reconcile narrowly; do not silently continue or redo working features.
5. Confirm no other active chat owns this packet/files in shared status. Resume your incomplete work; do not steal another active executor's packet. Selection is not a concurrent lock. Default is one executor and one coherent packet at a time.

Reuse the current/primary checkout; do not create a worktree for each packet. Read [ARCHIVED_WORK](ARCHIVED_WORK.md) and WORKTREE_CLEANUP.md before looking for older draft code: retired drafts are recoverable, not missing and not automatically integrated. If isolation genuinely requires another checkout, register its owner and cleanup condition first and retire it after integration/archive as AGENTS requires.

## Execute, verify, continue

Create/update `docs/workstreams/<work-id>.md` before editing. Write the bounded outcome, source/backend/allowed actions and packet test cases. Mark the packet `in-progress` in planning/execution-state.json with handoff path and absolute worktree; shared status points to it. Reuse existing verified implementation, repair only observed gaps. Follow EXECUTION_PROTOCOL and TESTING including ordinary-user authorization, persistence, real browser journeys, language/phone checks where relevant and exact fixture cleanup. Choose routine implementation details within approved contracts without asking the owner.

If a check fails, fix or diagnose it. Record `verification-incomplete` when required acceptance is missing; never mark verified from build alone, code existence or mocked delivery. A provider key unavailable blocks only the affected real-provider check. Continue independent local tasks when their actual prerequisites are satisfied. Do not call a socket handshake, redirect or deployment URL full acceptance.

Once every required assertion for this packet passes, record `verified` and evidence below, update the shared handoff/status and refresh inventory. Run the selector again; continue if another packet is eligible. At a turn/context boundary leave the exact next step and partial state, so a weaker successor does not start over. `verified` is scoped local evidence, not merge/deployment. Final integration packet SL16 still checks combined behavior.

## Execution state contract

`planning/packets.json` owns approved planning prerequisites/contracts; `planning/execution-state.json` owns only execution progress. DECISIONS remains product authority; shared PROJECT_STATUS is cross-chat navigation and workstreams contain detailed evidence. Do not duplicate product rules or alter prerequisites just to unblock dispatch.

Allowed status: pending, in-progress, verification-incomplete, blocked, verified. Every ID occurs once in priority and execution records. In-progress/incomplete needs worktree/handoff. Blocked needs concrete `reason` and `revisit_when`; include workstream whenever work began. Verified record requires:

```json
{
  "status": "verified",
  "handoff": "docs/workstreams/your-work-id.md",
  "worktree": "absolute path to actual checkout",
  "source_sha": "actual full 40-character Git SHA",
  "diff_sha256": "clean or actual SHA256 of saved relevant diff evidence",
  "verified_at": "actual ISO UTC timestamp",
  "outcome": "specific behavior and scope verified",
  "checks": [{"command_or_scenario": "actual command or scenario; target and result in handoff", "result": "passed"}]
}
```

For uncommitted implementation, save its relevant tracked diff and untracked-file inventory/content hashes in the handoff/evidence, record their SHA256 and exact worktree. Do not substitute HEAD for uncommitted changes. Tests/helpers may validate fields and files; they cannot certify truth of reported evidence. If source/artifacts change, assess affected checks and reverify before relying on old evidence.

## Genuine stopping conditions

Ask only for a concrete new contradiction/missing product choice that changes approved behavior, unavailable credential/target access needed for remaining work, an approval-dependent external action, or competing active ownership. Batch known questions and continue independent authorized work. Do not treat cosmetic polish, future business hypotheses or generic public-launch preparations as a reason to interrupt local MVP work.

Apply the direct standing owner publication authorization in AGENTS.md; do not re-ask for routine verified commits, non-force pushes, integration or deployment. Hosted migrations and real-user bulk notifications retain their specific gates; critical actions require approval. If all local packets are verified, reconcile SL16 evidence and report the working demonstration plus actual remaining external gates; do not invent another roadmap or claim a public release/funding outcome.
