# Git branch and worktree inventory

Generated: 19 Oct 2026, 13:18 (Asia/Jerusalem); 2026-10-19T10:18:34.075Z.

Primary checkout: C:/Users/User/Desktop/appartement tinder. Comparison: local integration branch `master`. Cached GitHub reference: origin/master at 9d75218; this script does not fetch or infer deployment state.

This snapshot reports Git facts, not whether a feature works. Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and its handoffs for acceptance evidence. A contained HEAD can still have unmerged local changes. Detached means the checkout has no branch name. A lock is a Git worktree lock, not proof a chat is currently running.

## Worktrees

| Checkout | Branch | HEAD | Local changes | HEAD in master? | Git lock |
| --- | --- | --- | --- | --- | --- |
| C:/Users/User/Desktop/appartement tinder | master | 6926eb40 | 5 tracked; 4 untracked entries | Yes | No |
| C:/Users/User/.codex/worktrees/7da4/appartement tinder | codex/standing-agent-authorization | f571b785 | Clean | No | No |
| C:/Users/User/.codex/worktrees/92e7/appartement tinder | codex/fix-map-provider-integration | 87e7f11f | 2 tracked; 0 untracked entries | No | No |
| C:/Users/User/.codex/worktrees/a6de/appartement tinder | (detached) | 9d752188 | 3 tracked; 0 untracked entries | No | No |
| C:/Users/User/.codex/worktrees/bd33/appartement tinder | codex/mvp-autonomous-execution | 6926eb40 | Clean | Yes | No |
| C:/Users/User/.codex/worktrees/e21c/appartement tinder | codex/app-config-centralization | ef8617c6 | Clean | No | No |
| C:/Users/User/.codex/worktrees/ffcb/appartement tinder | (detached) | 6926eb40 | Clean | Yes | No |

## Local branches

| Branch | HEAD | Upstream | HEAD in master? |
| --- | --- | --- | --- |
| codex/app-config-centralization | ef8617c | None | No |
| codex/consolidate-project | c67b9ca | origin/codex/consolidate-project | No |
| codex/find-the-next-implementation-step | 986554d | origin/codex/find-the-next-implementation-step | No |
| codex/fix-map-provider-integration | 87e7f11 | origin/codex/fix-map-provider-integration | No |
| codex/mvp-autonomous-execution | 6926eb4 | None | Yes |
| codex/sl01-lister-safe-browsing | f4d1d4a | None | No |
| codex/standing-agent-authorization | f571b78 | origin/codex/standing-agent-authorization | No |
| master | 6926eb4 | origin/master | Yes |
| onboarding-flow-impl | 71cec18 | None | No |
| worktree-map-completeness | fe35d6f | None | No |

## Last commit descriptions (context only)

| Checkout | Last commit description |
| --- | --- |
| C:/Users/User/Desktop/appartement tinder | Record published workflow and primary-checkout verification |
| C:/Users/User/.codex/worktrees/7da4/appartement tinder | Record agent authorization publication |
| C:/Users/User/.codex/worktrees/92e7/appartement tinder | docs: record map production deployment |
| C:/Users/User/.codex/worktrees/a6de/appartement tinder | feat: group free-form location search with parsed address components |
| C:/Users/User/.codex/worktrees/bd33/appartement tinder | Record published workflow and primary-checkout verification |
| C:/Users/User/.codex/worktrees/e21c/appartement tinder | Centralize app configuration |
| C:/Users/User/.codex/worktrees/ffcb/appartement tinder | Record published workflow and primary-checkout verification |

Refresh with `node scripts/project-status.mjs --write` in the primary checkout, or `node scripts/project-status.mjs --write --shared` from a linked worktree. This only reads Git and writes this Markdown snapshot; it never stages, commits, checks out, fetches, merges, pushes, deploys or removes a worktree.
