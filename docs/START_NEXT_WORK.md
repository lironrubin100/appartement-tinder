# One entrypoint, two working modes

[AGENTS](../AGENTS.md) owns authorization; [DECISIONS](../DECISIONS.md) owns product rules. [EXECUTION_PROTOCOL](EXECUTION_PROTOCOL.md) defines Plan versus Build. Current mode is recorded in planning/execution-state.json; an explicit owner request changes it. “Continue” keeps the current mode.

## Plan

For ideas, feature changes, audit and work ordering: inspect the relevant existing decision/task and reconcile the proposed delta in place. Read only unhandled Instinct notes when present. Update canonical decisions only from explicit owner answers; ideas/research stay notes. Preserve stable task IDs/evidence. Run node scripts/check-planning.mjs and node scripts/next-work.mjs --check. Do not implement product code, reset accounts or enable a product runner as a side effect of planning.

## Build

1. Run node scripts/next-work.mjs --preflight. Paused/wait/busy/blocked means no new writer. Unchanged blocks are not an invitation to repeat an audit.
2. If eligible, read fresh get_usage_limits. With exhausted ordinary allowance, save --defer-until=<reset Unix seconds> and wait for a later scheduled run. Unknown allowance is not zero usage; never buy credits or consume a reset automatically.
3. Use only the returned brief. Claim its exact task/fingerprint with --claim=<ID> --fingerprint=<hash>. Keep its token privately, read its owning checkpoint and named contracts; do not read the whole checklist/business/history library. Stage C never runs automatically.
4. Complete one bounded outcome, run its acceptance, update existing records and release your token with --release=<token>. A manual continuing executor may select the next approved outcome; a scheduled run ends after one task so its next context stays focused.

node scripts/next-work.mjs --brief previews the selected card; --task=<ID> inspects one card; --check validates every card/dependency. These are read-only, not product execution.

Stage A may reuse a bounded predecessor artifact recorded under checklist_continuation.prerequisite_artifacts.A, without certifying its full MVP packet. The receipt must name all completed Stage A tasks for that predecessor, the exact source/handoff of an already verified evidence packet, date, required artifact and passed checks. Missing/stale evidence, unfinished predecessor tasks or a blocked predecessor still stop dispatch. Stage B and full-packet verification keep the original packet dependency gates. Reconcile actual source evidence before recording a receipt; checkbox totals alone never authorize it.

For a usage-interrupted run, preserve partial work and checkpoint before releasing where possible. A remaining lease names its owner thread. Check that owner with wait_threads before recovering it; only a fresh non-running result permits --resume=<lease-token> --owner-stopped=<exact-thread-ID>. Never expire a lease by time or overwrite unrelated dirty work. If the tool cannot establish ownership, stop with that concrete dependency.

The single checklist is implementation_plan.md; packet/runtime state stays in planning/execution-state.json. A-stage journey acceptance is required before B; B acceptance never authorizes C. Scheduler prompt contains no feature instructions: all scope and checks come from this selection. A schedule retries periodically; no documented exact “quota reset” event or zero-token wakeup is promised. Local runs require the computer/app/project available. The existing schedule remains paused until the owner explicitly enters Build and enables it.
