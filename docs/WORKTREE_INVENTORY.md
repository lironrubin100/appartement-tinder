# Git branch and worktree inventory

Generated: 15 Oct 2026, 12:58 (Asia/Jerusalem); 2026-10-15T09:58:19.980Z.

Primary checkout: C:/Users/User/Desktop/appartement tinder. Comparison: local integration branch `master`. Cached GitHub reference: origin/master at c80e9b2; this script does not fetch or infer deployment state.

This snapshot reports Git facts, not whether a feature works. Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and its handoffs for acceptance evidence. A contained HEAD can still have unmerged local changes. Detached means the checkout has no branch name. A lock is a Git worktree lock, not proof a chat is currently running.

## Worktrees

| Checkout | Branch | HEAD | Local changes | HEAD in master? | Git lock |
| --- | --- | --- | --- | --- | --- |
| C:/Users/User/Desktop/appartement tinder | master | c80e9b2e | 1 tracked; 0 untracked entries | Yes | No |
| C:/Users/User/.codex/worktrees/4344/appartement tinder | (detached) | c6ca6940 | 0 tracked; 1 untracked entries | Yes | No |
| C:/Users/User/.codex/worktrees/7c31/appartement tinder | codex/find-the-next-implementation-step | 986554d8 | Clean | No | No |
| C:/Users/User/.codex/worktrees/c8ce/appartement tinder | (detached) | c6ca6940 | 6 tracked; 5 untracked entries | Yes | No |
| C:/Users/User/.codex/worktrees/d5e9/appartement tinder | codex/resident-journeys | c80e9b2e | Clean | Yes | No |
| C:/Users/User/Desktop/appartement tinder/.claude/worktrees/map-completeness | worktree-map-completeness | fe35d6ff | 2 tracked; 1 untracked entries | No | claude session map-completeness (pid 23068) |
| C:/Users/User/Desktop/appartement tinder/.worktrees/onboarding-flow | onboarding-flow-impl | 71cec18d | 2 tracked; 1 untracked entries | No | No |

## Local branches

| Branch | HEAD | Upstream | HEAD in master? |
| --- | --- | --- | --- |
| codex/consolidate-project | c67b9ca | origin/codex/consolidate-project | No |
| codex/find-the-next-implementation-step | 986554d | origin/codex/find-the-next-implementation-step | No |
| codex/resident-journeys | c80e9b2 | None | Yes |
| master | c80e9b2 | origin/master | Yes |
| onboarding-flow-impl | 71cec18 | None | No |
| worktree-map-completeness | fe35d6f | None | No |

## Last commit descriptions (context only)

| Checkout | Last commit description |
| --- | --- |
| C:/Users/User/Desktop/appartement tinder | Complete resident and group journeys with autonomous QA |
| C:/Users/User/.codex/worktrees/4344/appartement tinder | Add shared project orchestrator skill |
| C:/Users/User/.codex/worktrees/7c31/appartement tinder | Add private listing inquiries and accepted chats |
| C:/Users/User/.codex/worktrees/c8ce/appartement tinder | Add shared project orchestrator skill |
| C:/Users/User/.codex/worktrees/d5e9/appartement tinder | Complete resident and group journeys with autonomous QA |
| C:/Users/User/Desktop/appartement tinder/.claude/worktrees/map-completeness | Add design spec and implementation plan for map completeness round |
| C:/Users/User/Desktop/appartement tinder/.worktrees/onboarding-flow | Root page: redirect by session and mode instead of hardcoding /map |

Refresh with `node scripts/project-status.mjs --write` in the primary checkout, or `node scripts/project-status.mjs --write --shared` from a linked worktree. This only reads Git and writes this Markdown snapshot; it never stages, commits, checks out, fetches, merges, pushes, deploys or removes a worktree.
