# Current worktree consolidation

17 October 2026. **13 registered worktrees reduced to2**: primary project checkout and the currently active planning chat (bd33). Eleven inactive checkouts were retired after verified recoverable archival; three already-merged local branch names were removed. Six local branches remain, including four historical unmerged refs retained for recovery; these are pointers, not extra checkouts. No remote branch was deleted.

The plan/automatic next-feature workflow was pushed to master at8304667 and the primary checkout fast-forwarded to it. Further lifecycle/cleanup records are in this followup and the owning handoff. No unfinished feature was blindly merged into the app.

See [ARCHIVED_WORK](ARCHIVED_WORK.md) for the exact recovery root, draft-to-packet map and reconstruction procedure. Complete history bundle verified; every copied file SHA256 compared; all six nonempty tracked patches checked against original bases using private alternate indexes. Meaningful ignored configuration preserved privately, generated caches omitted.

The retired d31d registration was removed although Windows retained an empty directory shell. It has no code or registered worktree; do not kill the desktop app merely to remove an empty shell. The old map lock owner PID23068 was absent, no other active project executor was found, and that stale lock was removed for retirement.

The primary accidentally tracked the nested map worktree as a gitlink. This followup removes that pointer and ignores .claude/worktrees, preventing accidental nested checkout tracking. Current bd33 belongs to this active chat and is retained rather than deleting its working directory while executing. Future feature work should reuse the primary checkout; no new worktree is required.

## Mandatory lifecycle from now on

AGENTS section6 and START_NEXT_WORK govern: reuse existing checkout; create isolation only for a named need, with owner/packet/cleanup condition recorded first; integrate verified work or preserve a verified recovery archive; remove redundant checkout and merged branch; update inventory/handoff. Never silently abandon a checkout or delete another active owner's work. Archived drafts are not runtime-verified features.

## Historical15October record — superseded counts and retained-location recommendations

# Branch and worktree cleanup

15 October 2026. Original inventory: 10 local branches and 14 linked/main worktrees. The temporary integration branch is also counted while verification is in progress.

## Completed worktrees removed safely

All seven checkouts were clean, inactive in the app, had no process using their path, and their commits were ancestors of freshly fetched `origin/master`. Their ignored files were empty or only reproducible build/dependency caches. No private environment files or unique ignored notes were found.

| Removed checkout | Commit retained in integrated history | Former branch |
| --- | --- | --- |
| 7a00 | f858fc67 | Detached |
| 7f16 | 8daa2688 | codex/production-inquiry |
| 8f45 | 8daa2688 | Detached |
| apartment-publish | 8f11693d | codex/apartment-publish |
| cd04 | c6ca6940 | codex/add-shared-project-skill |
| heart-interest | 4365f6c7 | codex/audit-current-project-progress |
| listing-fixtures | 6a7a4077 | codex/listing-fixtures |

Used `git worktree remove` without force. Windows retained empty directory shells for 7a00, 7f16 and 8f45 after Git removed their checkout contents and registrations; these are not registered worktrees and contain no remaining files. No dirty worktree was removed.

The five former branch names above and temporary codex/verified-listing-slices were deleted safely after checking ancestry in local master. Final count: **5 local branches and 7 worktrees**. All unmerged branches were retained. Remote branches were not deleted.

## Work to retain and its next step

| Checkout / branch | Why retain it | What to do next |
| --- | --- | --- |
| Main checkout / master | Integrated product plus shared records | Start from PROJECT_STATUS; protect the nested dirty map worktree |
| d5e9 / current verification chat | Current chat and installed runtime | Reuse for inspection; new implementation gets a fresh bounded branch from master |
| 4344 / detached | Uncommitted auth deployment runbook | Reconcile the runbook into docs before archiving |
| c8ce / detached | Uncommitted Discover/Like/Chat changes | Inspect selected improvements for the proposed roommate slice; do not merge the stale tree wholesale |
| 7c31 / codex/find-the-next-implementation-step | Unique earlier inquiry commit | Compare against the already integrated inquiry flow, preserve any useful delta, then retire |
| onboarding-flow / onboarding-flow-impl | Unique old commits and local edits | Reuse only suitable pieces for the proposed resident-onboarding slice |
| map-completeness / worktree-map-completeness | Dirty, locked nested Git worktree | Preserve; coordinate with its owner before changing or removing it |
| codex/consolidate-project (no checkout) | A unique integration-status documentation commit; its migration patch is already represented | Import useful notes, then archive/delete the branch; no reason to deploy it |

## Normal lifecycle

Keep a short-lived feature branch/worktree while its outcome is active. Once reviewed, verified and merged, remove the redundant checkout and delete the merged local branch. Deleting a branch name does not remove its already-merged commits from master. Keep unfinished work explicitly marked pending; archive a recoverable snapshot before removing unique or uncommitted work. A worktree is a folder, a branch is a history pointer, and a chat is a separate record.

The generated [inventory](WORKTREE_INVENTORY.md) is the current Git count. PROJECT_STATUS and the handoffs describe what actually works. Counts and local publication state were finalized after integration; old remote branch names do not prove remaining development work.
