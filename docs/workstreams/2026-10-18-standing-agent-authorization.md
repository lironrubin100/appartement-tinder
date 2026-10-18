# Standing agent authorization

- Date: 18 October 2026, Asia/Jerusalem.
- State: verified and pushed to a dedicated branch; not merged or deployed.
- Owner direction: agents should act autonomously when a bounded task has passed proportionate tests and the action is reversible. In particular, they must not pause merely to request a Git push.
- Scope: `AGENTS.md`, `docs/EXECUTION_PROTOCOL.md`, `docs/START_NEXT_WORK.md`, and the project-owned `project-orchestrator` skill.
- Outcome: standing authorization permits a focused commit and normal non-force push to an owned branch after verification and handoff update. It does not permit protected-branch merges, deployments, force-push/history rewrite, hosted database/RLS/grant/global-config mutation, secrets/billing/domains/access changes, real-user/bulk messages, or deletion beyond scoped fixtures.
- Decisions: no product decision changes; `DECISIONS.md` remains authoritative.
- Worktree/branch: `C:/Users/User/.codex/worktrees/7da4/appartement tinder`; `codex/standing-agent-authorization`; source commit `ef06b67867a730b1e2d34172ac3a303ecec24b8f`.
- Verification: `git diff --check` passed; `node scripts/check-planning.mjs` passed (26 slices, 114 legacy IDs, 142 decisions, 21 packets). No application, browser, database, or hosted environment is affected by this documentation-only change.
- Publication: focused commit `ef06b67` was pushed normally (non-force) to `origin/codex/standing-agent-authorization`; `git ls-remote --heads` returned the same full SHA. No merge or deployment occurred.
- Primary-checkout note: the required shared inventory refresh produced an uncommitted generated-only update in the primary checkout. It also has pre-existing untracked `BUILD_PLAN.md` and `new plan/`; neither was changed, staged, committed, or pushed by this work. Preserve and resolve that inventory update only through an authorized protected-branch integration.
- Next step: obtain explicit authorization only if the policy should be merged into protected `master` or deployed. Otherwise, use this branch's standing authorization for bounded verified work.
