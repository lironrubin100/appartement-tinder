# Git branch and worktree inventory

Generated: 20 Oct 2026, 00:31 (Asia/Jerusalem); 2026-10-19T21:31:58.913Z.

Primary checkout: /workspace/appartement-tinder. Comparison: local integration branch `work`. Cached GitHub reference: unavailable; this script does not fetch or infer deployment state.

This snapshot reports Git facts, not whether a feature works. Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and its handoffs for acceptance evidence. A contained HEAD can still have unmerged local changes. Detached means the checkout has no branch name. A lock is a Git worktree lock, not proof a chat is currently running.

## Worktrees

| Checkout | Branch | HEAD | Local changes | HEAD in work? | Git lock |
| --- | --- | --- | --- | --- | --- |
| /workspace/appartement-tinder | work | c2df1494 | 14 tracked; 12 untracked entries | Yes | No |

## Local branches

| Branch | HEAD | Upstream | HEAD in work? |
| --- | --- | --- | --- |
| work | c2df149 | None | Yes |

## Last commit descriptions (context only)

| Checkout | Last commit description |
| --- | --- |
| /workspace/appartement-tinder | docs: record live grouped address search acceptance |

Refresh with `node scripts/project-status.mjs --write` in the primary checkout, or `node scripts/project-status.mjs --write --shared` from a linked worktree. This only reads Git and writes this Markdown snapshot; it never stages, commits, checks out, fetches, merges, pushes, deploys or removes a worktree.
