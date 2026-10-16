# Git branch and worktree inventory

Generated: 17 Oct 2026, 00:27 (Asia/Jerusalem); 2026-10-16T21:27:12.044Z.

Primary checkout: C:/Users/User/Desktop/appartement tinder. Comparison: local integration branch `master`. Cached GitHub reference: origin/master at 8304667; this script does not fetch or infer deployment state.

This snapshot reports Git facts, not whether a feature works. Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and its handoffs for acceptance evidence. A contained HEAD can still have unmerged local changes. Detached means the checkout has no branch name. A lock is a Git worktree lock, not proof a chat is currently running.

## Worktrees

| Checkout | Branch | HEAD | Local changes | HEAD in master? | Git lock |
| --- | --- | --- | --- | --- | --- |
| C:/Users/User/Desktop/appartement tinder | master | 83046670 | 3 tracked; 2 untracked entries | Yes | No |
| C:/Users/User/.codex/worktrees/bd33/appartement tinder | codex/mvp-autonomous-execution | 83046670 | 8 tracked; 1 untracked entries | Yes | No |

## Local branches

| Branch | HEAD | Upstream | HEAD in master? |
| --- | --- | --- | --- |
| codex/consolidate-project | c67b9ca | origin/codex/consolidate-project | No |
| codex/find-the-next-implementation-step | 986554d | origin/codex/find-the-next-implementation-step | No |
| codex/mvp-autonomous-execution | 8304667 | None | Yes |
| master | 8304667 | origin/master | Yes |
| onboarding-flow-impl | 71cec18 | None | No |
| worktree-map-completeness | fe35d6f | None | No |

## Last commit descriptions (context only)

| Checkout | Last commit description |
| --- | --- |
| C:/Users/User/Desktop/appartement tinder | Plan MVP delivery and autonomous next-feature execution |
| C:/Users/User/.codex/worktrees/bd33/appartement tinder | Plan MVP delivery and autonomous next-feature execution |

Refresh with `node scripts/project-status.mjs --write` in the primary checkout, or `node scripts/project-status.mjs --write --shared` from a linked worktree. This only reads Git and writes this Markdown snapshot; it never stages, commits, checks out, fetches, merges, pushes, deploys or removes a worktree.
