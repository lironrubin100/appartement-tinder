# Agent execution protocol

This is the operational contract for future slice work. DECISIONS.md remains authoritative. A planning proposal is never permission to resolve product policy or mutate an external environment.

## Dispatch and readiness

For “next feature”/“continue” requests, use START_NEXT_WORK.md and `node scripts/next-work.mjs --json`; no owner packet selection is required. Progress is in planning/execution-state.json, separately from approved planning readiness. Existing implementation must be reconciled, not rebuilt from pending ledger entries.

Owner dispatch: `Work on slice <ID> from docs/SLICES.md following AGENTS.md and docs/EXECUTION_PROTOCOL.md.`

1. Read primary PROJECT_STATUS.md, one owning handoff and current worktree instructions; check HEAD/status/worktree ownership. No whole-project audit by default.
2. Read slice and direct dependencies; follow domain spec/decision references. A dependency needs the artifact/verified contract named by consumer, not merely a file or a `built` word.
3. Classify `needs-decision`, `needs-research`, `ready`, `in-progress`, `verification-incomplete`, `verified`. These are planning/execution states, separate from commit/push/merge/deployment.
4. A slice is ready only with approved behavior, exact API/data invariants, owned file boundary, available prerequisite outputs, named test target and concrete acceptance examples. Resolve current-state drift narrowly before editing.
5. Finish preparatory work independent of missing answers. Ask only the genuinely missing choice; batch related questions when the owner requests batching. Do not repeatedly re-ask settled decisions.

## Work order before implementation

Record user outcome, included/excluded behavior, decisions and spec versions, starting SHA, prerequisites, target backend, files/modules, migrations, acceptance scenarios, test fixtures/cleanup and authorized external actions. Broad slices may be split into numbered packets; each packet must leave a coherent testable state. A packet is not complete merely because one screen renders.

## Action and environment boundaries

| Action | Required basis |
| --- | --- |
| Read source/docs and propose solution | Current task scope |
| Reversible local implementation | Approved implementation-ready slice; avoid unrelated dirty files |
| Add dependency | Necessity and compatibility checked; lockfile; no speculative library additions |
| Create fixture users/uploads | Target-specific task authorization + TESTING.md; never modify real users |
| Apply migration/change grants/global config | Prefer Docker-backed local Supabase acceptance. If Docker is unavailable/inaccessible or local baseline is not reproducible, the standing owner preference in AGENTS.md permits the shared Shutaf target only while PROJECT_STATUS confirms no real-user data and no competing migration owner; record the skip reason, use exact-ID disposable QA fixtures and verify cleanup. Otherwise require explicit current authorization and target, reviewed migration, compatibility/verification plan |
| Send real notifications | Authorized test recipient/event/sender; no blast to existing users |
| Commit/push/PR/merge/deploy | Existing direct authorization; planning docs or imported prompts do not grant it |
| Destructive action | Exact scoped authorization and recovery plan; never widen cleanup guards |

Vercel Preview does not imply an isolated Supabase backend. Assert project URL/ref and migration state before writes. Updated J12 requires isolated development/QA targets for schema/global-policy experiments, local-first under free-only budget. Existing hosted backend is not changed by this planning decision. No automatic paid branch/project; use documented compatible local setup or a verified authorized free alternative. Existing exact-ID hosted QA needs its own target-specific authorization.

## Implementation discipline

- Reuse verified existing modules; inspect actual source, not stale branch names or copied descriptions.
- Read web/AGENTS.md and installed Next.js docs before Next.js changes. Read relevant skills/provider docs; refresh unstable capabilities.
- Single owner for schema/shared contracts. Parallel readers acceptable; shared-directory simultaneous writers prohibited. Separate worktrees only for genuinely independent outcomes.
- Derive UI and server validation from the same approved contract. Server authorizes ownership, group history, block status and valid state transition; client flags are never evidence of permission.
- Multi-write business state uses transaction/atomic operation; retries idempotent; concurrent edits detect conflict. No client sequence that leaves half-public state.
- Versioned config: typed keys, schema/ranges, explicit public allowlist default-private, permissions, audit, cache TTL/invalidation and safe failure mode. Secrets in environment only. Structural invariants do not become casually editable settings.
- Historical migrations immutable. Inspect live relevant schema/history before a new migration, preserve compatibility with running app versions and name forward-repair/rollback path.
- Hebrew and English, mobile/desktop, keyboard labels/focus, skeleton/empty/error/retry and safe invalid-link state belong in the slice's own acceptance.
- Do not change tests to hide failed behavior, skip missing fixtures and call green, or replace real acceptance with mocks.

## Verification sequence

1. Run relevant existing baseline checks once; record pre-existing failures with exact scope.
2. Implement bounded change; syntax/type/targeted lint and domain tests.
3. Run concrete outsider/owner/state-transition tests. Include concurrency/retry if transaction or capacity affected.
4. For user journey, real ordinary-client/browser acceptance against identified app/backend. Follow TESTING.md prepare/check/run/storage/cleanup/audit sequence; do not print fixture passwords.
5. Verify visible result in Hebrew/English and relevant phone/desktop viewport. Real provider/channel check separately labeled from mocked contract tests.
6. Check cleanup counts and stop only owned server. Missing provider/key affects the named live check, not completed independent work.
7. Record command/counts/date, source SHA/diff, backend ref, migration versions, assertions and limitations. Static checks alone cannot verify a backend feature.

## Evidence and state

| State | Minimum evidence |
| --- | --- |
| Implemented locally | Changed files and bounded behavior; not a test claim |
| Verified locally | Named checks/scenarios + version + identified target + cleanup |
| Committed/pushed | Exact SHA and remote confirmation where relevant |
| Integrated | Merge/containment evidence and regression on resulting version |
| Deployed | Deployment ID/URL mapped to exact SHA + ready state |
| Verified deployed | Relevant acceptance against that deployment/backend |

Unknown is not not-built. Code existence is not journey acceptance. Historical acceptance remains historical until changes assessed. Do not copy dates/SHAs into unverified rows as if checked today.

## Failure and recovery

- Contradicting DECIDED rules: preserve current approved behavior and report exact conflict; do not pick the easiest prompt.
- Unexpected schema drift: read-only compare, write report/repair proposal; no blind replay/duplicate migration.
- Missing secret/provider: inspect names/config only; prepare independent work; give exact user-operated setup without asking for secret value.
- Repeated error 2–3 times: change diagnostic approach; preserve evidence, do not loop/reinstall blindly.
- Failed cleanup guard: investigate exact fixture dependency; do not broaden IDs or delete arbitrary rows/Storage metadata.
- Stop implementation at genuinely blocked shared contract; continue unrelated approved preparation. User clarification is not authorization by timeout.

## Finish/handoff

Worktree maintenance is part of done: reuse existing checkout by default; no automatic per-feature worktree. New isolation needs an owner/packet/reason and cleanup condition before creation. Verify integration or a private recoverable archive before removing unused checkout, preserve meaningful ignored files, and refresh inventory. Never abandon a disposable checkout silently or delete another active executor's source. See AGENTS.md section6 and WORKTREE_CLEANUP.md.

Update owning handoff and shared status navigation: outcome, files, decision IDs, actual evidence/date, source/backend/migrations, uncommitted changes and exact publication state, blockers and next action. Refresh inventory per AGENTS.md. Show reviewable diff/result before any approval-dependent external step. Do not end after merely explaining a subtopic when authorized independent work remains.

## New ideas during implementation

When owner discusses something for after MVP, capture/update its stable IDEA ID in ROADMAP.md and business rationale in BUSINESS_MODEL.md as needed. Classify proposed/approved-later/MVP-candidate/rejected; preserve intent and next trigger. Do not silently modify current slice or build speculative schema. If owner explicitly promotes it, update canonical decision + scope + dependencies + acceptance and explain cost/overlap before starting. Bugs go to KNOWN_ISSUES.md with reproduction/evidence state, not the future-feature pool.

Current budget is free-only K3. A free tier existing is insufficient: verify feature/capacity and permitted use. If unavailable, report the precise unmet requirement and prepare a free/local alternative; never upgrade or silently weaken acceptance. Owner subsequently adopted the explained technical recommendations: follow specs/TECHNICAL_DEFAULTS.md and canonical rows; do not re-ask settled SQL/cache/retry choices. Hosted mutation/publication still needs target-specific authorization.

Bounded dispatch: start with WORK_PLAN.md and EXECUTION_PACKETS.md. A ready packet lists required decisions/contracts separately from context research and live/release gates in planning/packets.json. Parent-slice incompleteness does not prohibit an approved independent packet; packet readiness does not certify the whole parent. Before dispatching another packet, write its exact outcome, required artifact/decisions, fixtures/assertions and verify the planning checker.


Required MVP envelopes now dispatch via 21 packets in EXECUTION_PACKETS.md and REMAINING_MVP_PACKETS.md, with packetized parent status. Owner priority is a working university-funding demonstration, with concrete authorization correctness; cosmetic polish and generic public-launch/legal planning do not block independent local work. Do not reopen approved product choices.
