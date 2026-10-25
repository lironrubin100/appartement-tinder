# Select or resume approved work

Use this entrypoint for next-feature/continue requests. Product rules are in [DECISIONS](../DECISIONS.md); execution rules are in [EXECUTION_PROTOCOL](EXECUTION_PROTOCOL.md). Historical prompts/playbooks are not startup instructions.

1. Read primary [PROJECT_STATUS](../PROJECT_STATUS.md), one owning checkpoint, HEAD and local changes. Confirm ownership; reuse the existing suitable checkout.
2. Run node scripts/check-planning.mjs, then node scripts/next-work.mjs --json. The selector reads existing plan/ledger; it does not claim work, waive prerequisites or mark anything complete.
3. Read only its task/work card, named decisions/contracts and affected source. Reconcile existing behavior/evidence before implementing missing work.
4. Execute and verify the bounded outcome under EXECUTION_PROTOCOL. Update existing records; rerun the selector for the next authorized item. Owner 25 October continuation needs no per-task permission.

The [implementation checklist](../implementation_plan.md) keeps stable task IDs and physical Stage A order. The current bounded owner-management dispatch still requires its packet evidence before the next milestone. After it, Stage A selection remains in checklist order; missing prerequisite evidence is reported against that selected task instead of silently returning to another queue. Demo acceptance is not full-MVP packet verification.

An explicit ready owner-priority override may select a bounded checklist subset ahead of the normal queue, with scope and handoff; it never verifies its parent packet. Owner 25 October promoted representative demo content after workflow/QA preparation. Do not steal another executor's current task or skip a failed assertion.

Planning readiness lives in planning/packets.json; packet progress/evidence and dispatch metadata live in planning/execution-state.json; detailed evidence stays in the owning workstream. Choose only approved ready work. Continue independent approved work around a concrete blocker only when its actual prerequisites and ownership allow it.
