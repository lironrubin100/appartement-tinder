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

The five former branch names above and the temporary verified-listing branch can be deleted locally once local master contains their commits. Remote branches are not part of this local cleanup.

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

The generated [inventory](WORKTREE_INVENTORY.md) is the current Git count. PROJECT_STATUS and the handoffs describe what actually works. Counts and local publication state are finalized after integration; old remote branch names do not prove remaining development work.
