# Execution protocol

This is the maintained procedure for approved Shutaf work. [AGENTS](../AGENTS.md) owns standing authorization and guardrails; [DECISIONS](../DECISIONS.md) owns product behavior.25 October 2026 owner update supersedes historical per-micro-task permission gates: continue the approved queue, stop for a blocker/new decision/critical action. An explicit current single-task request remains bounded.

## Plan and Build

Plan is the current audit/feature-discussion mode. Inspect affected existing rules/tasks and source narrowly; update in place, preserve closed decisions and completion evidence, add a bounded task only for approved missing behavior. Do not create a document for each thought. Product code/data and the scheduled product runner stay untouched. An explicit new owner answer may revise canonical policy; an idea or research note cannot. Instinct's raw notes are input, not implementation proof.

Build executes one selected atomic card. It may update its own acceptance/state/blocker and owning checkpoint, but cannot expand product scope, rewrite priority/policy or create a new planning structure. A necessary change outside the card returns to Plan with the precise missing choice. The owner does not need to choose routine IDs or repeat settled answers. Record the current mode in execution-state.json; a neutral continuation does not switch modes.

Scheduled Build runs take one card per fresh context. Entry, usage cooldown, claim/recovery and release commands are maintained only in START_NEXT_WORK. If all cards in a milestone are checked, reconcile its actual combined evidence before advancing. The configured light model performs execution; Plan prepares the work and resolves real ambiguities. No model is treated as incapable of error: acceptance and scope checks remain mandatory.

### Changing decisions, tasks or code

Plan updates an approved decision and only its affected cards/dependencies together. Unstarted cards retain their ID when the outcome is unchanged; delivered requirements keep their original evidence and receive a follow-up for changed behavior. Correct falsely claimed completion explicitly. Recheck only affected prerequisite artifacts/acceptance, not the entire project. Record a short delta in the existing owning checkpoint; no replacement plan or new report.

Coordinate at a safe checkpoint before editing an active writer's overlapping scope. Preserve partial source/diff and ownership. The selector's brief fingerprint is the card revision: changed instructions require reconciliation before a lease resumes. A clear bounded owner-requested code correction can update the active card or add one follow-up under existing authorization; only a new consequential choice needs another planning interview. Keep independent ready work available and state the next eligible task.

## Start and work card

Use [START_NEXT_WORK](START_NEXT_WORK.md) and the selector. Check primary status, owning checkpoint, HEAD/diff, target and current owner. Read the selected task/packet and only required decision/contract sections. Existing code or a pending ledger alone does not prove a gap; reconcile narrowly.

A ready work card names: visible outcome; existing behavior to reuse; stable task IDs/files; relevant decisions/contracts; missing work and scope boundary; target/fixtures and acceptance checks; stopping condition. Keep it in the existing task/handoff. Related technical steps may form one outcome; retain individual completion evidence and actual prerequisite gates. OPEN/RESEARCH are not approved policy. Settle routine technical details within approved contracts; ask the owner only about a real product/cost/scope consequence.

## Implement and verify

- One writer per shared outcome/schema. Reuse a suitable checkout; no worktree per feature. Delegate only with a concrete ownership boundary and when authorized/needed; the smallest useful agent count is preferred.
- Read web/AGENTS.md and relevant installed Next.js docs for frontend changes; relevant skills/provider docs only when needed. Keep historical migrations immutable; generate new names with installed CLI help. Use compatible expansion before connecting a new RPC.
- Server authorization, public/private projections, transactional updates and idempotency must follow the domain contract. Multi-write operations must not leave half-public state. Changes in group consent/membership must not expose private history/address. No new product policy inferred from old examples.
- New config keys require typed validation, public allowlist/default-private handling and CONFIG_KEY_INVENTORY update. Credentials stay in environment secrets; stop/report SQL-web disagreement. No paid resources without approval.
- Follow [TESTING](TESTING.md) for maintained commands and fixture modes. Run the affected baseline once, type/focused lint/domain checks, then ordinary-client/browser acceptance for the changed journey. From web, TS/TSX changes require npx tsc --noEmit and focused eslint. Before app-code push run npm run build; reuse a passing build only when relevant source/dependencies are unchanged. Documentation-only work needs whitespace/link/planning checks as applicable.
- Include owner/outsider/guest authorization and persistence; retry/concurrency when affected. Changed UI includes HE/EN, phone/desktop, keyboard, empty/error/retry states and actual visual inspection. Verify real provider/delivery separately from mocks. A skipped test, PGlite, socket handshake or READY build is not whole-journey acceptance.
- Repair a failed check or diagnose the exact dependency. After repeated same failure change approach. Rerun affected/dependent checks for new changes or unresolved concerns, not an unrelated suite on every helper edit. Never weaken a test to obtain green.

## Target, accounts and external actions

AGENTS standing publication authorization covers routine verified commit/non-force push/integration/deployment. Preserve unrelated dirty files; stage explicit paths. Verify remote/source SHA and actual deployment separately. Coordinate concurrent integration; never force/rewrite to overcome divergence.

Prefer isolated local Supabase. If Docker/baseline is unavailable, shared-target action requires the recorded target/data/ownership gates or fresh explicit scoped authorization under AGENTS. Recheck actual live history immediately before a migration; do not replay missing local historical files. Preview does not isolate data. Provision only exact-ID synthetic actors on the authorized target. No secret values in chat/logs/traces/Git.

Use a dedicated reusable QA pool for repeatable cases, retained demos for owner inspection, and minimal fresh actors for pristine/destructive cases. Validate manifest/target/IDs/roles and scenario state; serialize shared actors. Never silently reset a retained demo, real user, shared database or unrelated storage. Reset/cleanup only exact run-owned state with guards; preserve ignored recovery manifests until verified. No real-user/bulk notifications without explicit authorization.

## Evidence and continuation

Overall project status is on owner request, not a full report after each executor task. Build updates its owned existing task/checkpoint with evidence and keeps completion messages brief/unchanged waits quiet. Plan/reporting aggregates the goal, delivered/verified capabilities, implementation awaiting acceptance, remaining user outcomes, next priorities, blockers and unresolved decisions from existing records. State evidence dates/gaps; checkbox totals are not product completion percentages. A status question does not restart an audit or pause independent approved work. Do not create a second queue/dashboard document.

Keep existing stable checklist IDs/flags. A task is checked only after its own acceptance passes. Planning/execution-state.json records packets as pending, in-progress, verification-incomplete, blocked or verified; it is distinct from the checklist's bounded demo coverage. Active/incomplete rows name handoff/worktree. Blocked rows need reason/revisit_when. Verified packets require exact40-character source SHA, absolute worktree, clean or SHA256 diff evidence, dated outcome/checks and verified manifest prerequisites. Assess changed artifacts before reusing earlier evidence.

Record a short checkpoint in the existing owning workstream: outcome/files, decisions, actual commands/assertions/date/target, pass/fail/skip, private fixture/recovery location, source/migration/release state, remaining blocker and next step. Shared PROJECT_STATUS is a compact index; inventory is a Git snapshot, not acceptance. Create a document only for a necessary distinct role. Keep prior evidence dated, move obsolete startup instructions out of the default reading path, and preserve unique history/recoverability.

Once an outcome passes, publish under standing authorization, report briefly and continue the approved queue. Owner feedback may arrive at any checkpoint. New defect → [KNOWN_ISSUES](KNOWN_ISSUES.md) with evidence state; future idea → [ROADMAP](../ROADMAP.md) by stable ID/business rationale. Neither expands the active work silently. Stop for a concrete unavailable dependency, ownership collision, new product choice or critical action; continue genuinely independent authorized preparation. All Stage A boxes require combined demo evidence review, not automatic full-MVP completion. Refresh inventory at handoff/Git lifecycle change and state the next concrete step and why.
