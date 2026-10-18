# Standing agent authorization

- Date: 18 October 2026, Asia/Jerusalem.
- State: implementation in progress; documentation-only workflow change.
- Owner direction: agents should act autonomously when a bounded task has passed proportionate tests and the action is reversible. In particular, they must not pause merely to request a Git push.
- Scope: `AGENTS.md`, `docs/EXECUTION_PROTOCOL.md`, `docs/START_NEXT_WORK.md`, and the project-owned `project-orchestrator` skill.
- Outcome: standing authorization permits a focused commit and normal non-force push to an owned branch after verification and handoff update. It does not permit protected-branch merges, deployments, force-push/history rewrite, hosted database/RLS/grant/global-config mutation, secrets/billing/domains/access changes, real-user/bulk messages, or deletion beyond scoped fixtures.
- Decisions: no product decision changes; `DECISIONS.md` remains authoritative.
- Worktree/branch: `C:/Users/User/.codex/worktrees/7da4/appartement tinder`; branch and exact source SHA recorded at verification/commit time.
- Verification: pending `git diff --check` and targeted wording search. No application, browser, database, or hosted environment is affected by this documentation-only change.
- Publication: under the new standing authorization, commit and normal non-force push follow successful checks. No merge or deployment is authorized by this handoff.
- Next step: verify the diff, commit the policy as one focused snapshot, push it normally, confirm the remote SHA, then update this handoff and the shared status.
