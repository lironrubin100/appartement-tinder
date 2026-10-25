# Git branch and worktree inventory

Generated: 25 Oct 2026, 10:21 (Asia/Jerusalem); 2026-10-25T08:21:17.894Z.

Primary checkout: C:/Users/User/Desktop/appartement tinder. Comparison: local integration branch `master`. Cached GitHub reference: origin/master at a993bb8; this script does not fetch or infer deployment state.

This snapshot reports Git facts, not whether a feature works. Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and its handoffs for acceptance evidence. A contained HEAD can still have unmerged local changes. Detached means the checkout has no branch name. A lock is a Git worktree lock, not proof a chat is currently running.

## Worktrees

| Checkout | Branch | HEAD | Local changes | HEAD in master? | Git lock |
| --- | --- | --- | --- | --- | --- |
| C:/Users/User/Desktop/appartement tinder | master | a993bb8b | Clean | Yes | No |
| C:/Users/User/.codex/worktrees/1e59/appartement tinder | (detached) | c2df1494 | Clean | Yes | No |
| C:/Users/User/.codex/worktrees/6b9e/appartement tinder | codex/implementation-plan | a66f12a3 | 1 tracked; 0 untracked entries | Yes | No |
| C:/Users/User/.codex/worktrees/7da4/appartement tinder | codex/standing-agent-authorization | f571b785 | Clean | No | No |
| C:/Users/User/.codex/worktrees/92e7/appartement tinder | codex/fix-map-provider-integration | 87e7f11f | Clean | Yes | No |
| C:/Users/User/.codex/worktrees/a6de/appartement tinder | (detached) | c2df1494 | Clean | Yes | No |
| C:/Users/User/.codex/worktrees/bd33/appartement tinder | codex/mvp-autonomous-execution | 6926eb40 | Clean | Yes | No |
| C:/Users/User/.codex/worktrees/e175/appartement tinder | codex/next-step-reporting | cf39486d | Clean | Yes | No |
| C:/Users/User/.codex/worktrees/e21c/appartement tinder | codex/revive-app-config | f62b3aa9 | Clean | No | No |
| C:/Users/User/.codex/worktrees/f185/appartement tinder | codex/owner-management-plan | e52fbf9b | Clean | Yes | No |
| C:/Users/User/.codex/worktrees/ffcb/appartement tinder | (detached) | 6926eb40 | Clean | Yes | No |
| C:/Users/User/.codex/worktrees/room44/appartement tinder | codex/room-availability-backend | 86f95f5f | Clean | Yes | No |

## Local branches

| Branch | HEAD | Upstream | HEAD in master? |
| --- | --- | --- | --- |
| codex/app-config-centralization | ef8617c | None | No |
| codex/archive-master-pre-sync-20261025 | e1b0784 | None | No |
| codex/archive-mvp-focus-audit-wip | 36ee95d | None | No |
| codex/archive-wip-map-runtime-recovery-20261025 | 6bd9630 | None | No |
| codex/archive-wip-room44-qa-handoff-20261025 | a030793 | None | No |
| codex/archive-wip-sl02-qa-artifacts-20261025 | 0c9338b | None | No |
| codex/archive-wip-unread-counts-20261025 | 9d6ca07 | None | No |
| codex/consolidate-project | c67b9ca | origin/codex/consolidate-project | No |
| codex/find-the-next-implementation-step | 986554d | origin/codex/find-the-next-implementation-step | No |
| codex/fix-map-provider-integration | 87e7f11 | origin/codex/fix-map-provider-integration | Yes |
| codex/implementation-plan | a66f12a | origin/codex/implementation-plan | Yes |
| codex/mvp-autonomous-execution | 6926eb4 | None | Yes |
| codex/next-step-reporting | cf39486 | None | Yes |
| codex/owner-management-plan | e52fbf9 | None | Yes |
| codex/revive-app-config | f62b3aa | origin/codex/revive-app-config | No |
| codex/room-availability-backend | 86f95f5 | origin/codex/room-availability-backend | Yes |
| codex/sl01-lister-safe-browsing | f4d1d4a | None | Yes |
| codex/standing-agent-authorization | f571b78 | origin/codex/standing-agent-authorization | No |
| codex/streamline-execution | 4eca5c7 | origin/codex/streamline-execution | Yes |
| master | a993bb8 | origin/master | Yes |
| onboarding-flow-impl | 71cec18 | None | No |
| worktree-map-completeness | fe35d6f | None | No |

## Last commit descriptions (context only)

| Checkout | Last commit description |
| --- | --- |
| C:/Users/User/Desktop/appartement tinder | feat(qa): add guarded retained-demo access recovery and repeatability handoff |
| C:/Users/User/.codex/worktrees/1e59/appartement tinder | docs: record live grouped address search acceptance |
| C:/Users/User/.codex/worktrees/6b9e/appartement tinder | docs: add continuation prompt for room availability |
| C:/Users/User/.codex/worktrees/7da4/appartement tinder | Record agent authorization publication |
| C:/Users/User/.codex/worktrees/92e7/appartement tinder | docs: record map production deployment |
| C:/Users/User/.codex/worktrees/a6de/appartement tinder | docs: record live grouped address search acceptance |
| C:/Users/User/.codex/worktrees/bd33/appartement tinder | Record published workflow and primary-checkout verification |
| C:/Users/User/.codex/worktrees/e175/appartement tinder | docs(SL02): record deployed confirmation fix acceptance |
| C:/Users/User/.codex/worktrees/e21c/appartement tinder | feat: revive public map app config |
| C:/Users/User/.codex/worktrees/f185/appartement tinder | docs: reconcile invitation limit and record plan publication |
| C:/Users/User/.codex/worktrees/ffcb/appartement tinder | Record published workflow and primary-checkout verification |
| C:/Users/User/.codex/worktrees/room44/appartement tinder | docs: record room availability production release |

Refresh with `node scripts/project-status.mjs --write` in the primary checkout, or `node scripts/project-status.mjs --write --shared` from a linked worktree. This only reads Git and writes this Markdown snapshot; it never stages, commits, checks out, fetches, merges, pushes, deploys or removes a worktree.
