# Worktree consolidation and prevention

Owner request 17 October: retire unnecessary worktrees and ensure future agents own their cleanup. Source before followup8304667; active branch codex/mvp-autonomous-execution, worktree bd33.

Outcome:13->2 registered worktrees. Primary and current chat retained;11 inactive checkouts archived/retired (see ARCHIVED_WORK and WORKTREE_CLEANUP). No active code feature integrations or production migrations in this maintenance work.

Recovery: complete history.bundle verified; meaningful changed/untracked/ignored files checksum-checked before removal;6 nonempty patches apply against original bases with private alternate indexes. Recovery/private config lives outside Git; generated caches omitted. Three merged branches deleted; unmerged historical refs preserved. Stale map lock PID absent. d31d only empty Windows-held shell remains unregistered.

Files: AGENTS, START_NEXT_WORK, EXECUTION_PROTOCOL, ARCHIVED_WORK, WORKTREE_CLEANUP, packet draft references, .gitignore and removal of accidental nested gitlink; shared status/inventory/handoff.

Verification: final git worktree list exactly primary+bd33; inventory2worktrees/6branches; selector six tests and planning checker; staged diff whitespace. No PR or deployment requested; user explicitly authorized commit/push. Relevant workflow constraints are AGENTS and canonical decisions unchanged.

Next: use primary checkout and say work on the next feature. Selector initially choosesSL00.1; inspect archived draft evidence narrowly before rebuilding anything. Current-chat worktree can be retired by a later maintenance owner after this chat is inactive and its HEAD is contained; do not recreate any retired checkout merely to read old code.
