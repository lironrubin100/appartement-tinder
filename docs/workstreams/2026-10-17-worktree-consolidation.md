# Worktree consolidation and prevention

Owner request 17 October: retire unnecessary worktrees and ensure future agents own their cleanup. Source before followup8304667; active branch codex/mvp-autonomous-execution, worktree bd33.

Outcome:13->2 registered worktrees. Primary and current chat retained;11 inactive checkouts archived/retired (see ARCHIVED_WORK and WORKTREE_CLEANUP). No active code feature integrations or production migrations in this maintenance work.

Recovery: complete history.bundle verified; meaningful changed/untracked/ignored files checksum-checked before removal;6 nonempty patches apply against original bases with private alternate indexes. Recovery/private config lives outside Git; generated caches omitted. Three merged branches deleted; unmerged historical refs preserved. Stale map lock PID absent. d31d only empty Windows-held shell remains unregistered.

Files: AGENTS, START_NEXT_WORK, EXECUTION_PROTOCOL, ARCHIVED_WORK, WORKTREE_CLEANUP, packet draft references, .gitignore and removal of accidental nested gitlink; shared status/inventory/handoff.

Verification: final git worktree list exactly primary+bd33; inventory2worktrees/6branches; selector six tests and planning checker; staged diff whitespace. No PR or deployment requested; user explicitly authorized commit/push. Relevant workflow constraints are AGENTS and canonical decisions unchanged.

Next: use primary checkout and say work on the next feature. Selector initially choosesSL00.1; inspect archived draft evidence narrowly before rebuilding anything. Current-chat worktree can be retired by a later maintenance owner after this chat is inactive and its HEAD is contained; do not recreate any retired checkout merely to read old code.


## Publication and primary-checkout verification

17 October2026: workflow package8304667 and cleanup/lifecycle commit0fd75bffeafc677aefc119702d894976e2ee7c42 were pushed to origin/master; git ls-remote confirmed the cleanup SHA. Primary project was fast-forwarded to that exact version with original shared-record backups preserved. Planning checker passes26 slices/114 legacy IDs/142 decisions/21 packets on the primary Windows checkout; selector regression6/6 passes there, and next-work --json returns start SL00.1. Current bd33 is clean at source before this evidence-only followup; retained deliberately while its owner chat is active. No app feature implementation, hosted database change or manual deployment in this maintenance task.

A new project chat can say work on the next feature. Reuse primary; AGENTS/START_NEXT_WORK select and maintain packet progress. Archived unfinished source is mapped for selective reuse, not counted as integrated.
