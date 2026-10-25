# MVP focus and execution-instruction audit — 25 October 2026

## Current implementation checkpoint

25 October: QA helper c24502e and workflow simplification 5ca24ef are integrated and pushed in master 4eca5c7; production deployment dpl_9DNNRVqjbrLhfHXJdQHn4TtAK3dD is READY. Selector: 19/19, QA contract checks: 5/5. All 229 task IDs/order/flags preserved. Task 16.1 is the next owner-priority outcome; visible photos are not yet delivered. The earlier review snapshots below are dated history, superseded by the implementation and publication checkpoints at the end.

## Earlier review: instruction audit and approved workflow preferences

This section supersedes the earlier interview's pending-continuation wording below. Owner requests a review/recommendation first, before feature execution. Direct answers in this follow-up: continue through an approved queue without per-task permission, stopping for a blocker/new decision; give short summaries and update existing records, creating a document only for a distinct necessary role; investigate reusing QA accounts instead of continually provisioning new ones. Existing critical-action, data/ownership and privacy gates remain. Automation is not being enabled in this review.

Primary Git repair in the separate chat completed: primary HEAD now matches integrated `86f95f5`. That chat preserved the earlier uncommitted audit in `stash@{0}` and `codex/archive-mvp-focus-audit-wip`. This review restored only this existing report from the stash's untracked-files tree; it did not pop the stash or restore obsolete shared status wholesale. No extra report or checkout was created. Earlier source-divergence findings below remain historical.

### Inventory: recommendations for the existing files

Tracked inventory at86f95f5:92 Markdown files,71 under docs, including24 workstream records. File count alone is not loaded-context size. Automatic AGENTS guidance, skill metadata, chat history and files actually read are distinct inputs. Official [AGENTS discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md) and [skill loading](https://learn.chatgpt.com/docs/build-skills) describe the automatic parts; skills load full instructions when selected. No measured subscription-usage saving is claimed.

| Existing source | Recommendation | What an executor needs |
| --- | --- | --- |
| AGENTS.md (about12.5k characters) | Shorten to a project entrypoint; keep authority/target, essential guardrails and links. Move repeated procedure to EXECUTION_PROTOCOL. Replace unconditional no-external-links wording with the actual D0/E8 distinction: native public apartment links are approved. | Automatically supplied project rules, with one route into the current task. |
| DECISIONS.md (142 rows) | Keep as product authority. Do not delete settled rules to reduce prompt size. Read the task's named rows, not the entire register every time. | Relevant decision IDs, with original source available. |
| PRD.md / ARCHITECTURE.md / docs/specs/* | Keep product overview, technical design and domain contracts as references; align real contradictions with DECISIONS. No mandatory full read for every task. | Only the changed domain and direct dependencies. |
| PROJECT_STATUS.md (about31k characters) | Make a compact current work index; move superseded status prose into existing owning workstreams. Current ownership/environment belongs here, not permanent claims about one specific cloud executor in AGENTS:50. Preserve actual owner authorization when relocating it. | Current work ID, owner/checkpoint, source, blocker and next action; one linked handoff. |
| implementation_plan.md (229 tasks/about126k characters) | Preserve stable IDs/completion flags and approved scope. Remove duplicate execution/release boilerplate; show only the dispatched task(s). Replace the per-task ask gate according to the direct owner answer above. | One bounded work card and its acceptance checks. |
| docs/START_NEXT_WORK.md | Reduce to selection/resume instructions and one mode reference. Remove obsolete initial-state assertions (line16 says all21 packets pending). | Run selector; resume/select; do not audit the project again. |
| docs/EXECUTION_PROTOCOL.md | Make this the one maintained procedure for readiness, autonomous continuation, review, record updates, external actions and stopping. Remove repeated historical dispatch blocks. | Short common procedure, with detailed testing linked. |
| docs/WORK_PLAN.md + planning/{packets,execution-state}.json + scripts/next-work.mjs | Keep human order, dependency/readiness data and packet evidence distinct; reconcile the selector with Stage A across the milestone boundary. Remove outdated next-task claims. Do not create another parallel queue or progress register. | One selected outcome and prerequisite evidence; preserve task-versus-packet status. |
| docs/EXECUTION_PACKETS.md / REMAINING_MVP_PACKETS.md / SLICES.md / BUILD_BLUEPRINT.md | Keep contracts/catalog/map, but stop making the executor read the entire planning library. One selected packet section suffices. Refresh inconsistent packet-count snapshots when touched. | Selected packet and required domain links only. |
| docs/TESTING.md + LOCAL_TESTING_WORKFLOW.md | Keep TESTING as the runnable command/fixture guide; link the local setup subsection rather than repeating it. Move dated release narratives to the existing handoff. Add the persistent-versus-pristine distinction below. | Applicable commands and fixture preflight. |
| docs/workstreams/* + releases/* + KNOWN_ISSUES.md | Keep evidence, release summaries and defects in their existing roles. Use one workstream per owned stream, append short checkpoints; do not create a handoff for every micro-task. | Latest checkpoint for this work and relevant unresolved defects. |
| docs/DEVELOPMENT_PLAYBOOK.md | Retire from active execution routing; it still defers groups and suggests older approval/worktree practices. Preserve as dated history or consolidate unique useful text before archival. | No routine executor read. |
| NEXT_CONVERSATION_PROMPT.md, NEXT_MVP_FEATURES.md, MVP_NEXT_SLICES.md, NEXT_AGENT_PROMPT_2026-10-24.md, handoffs/2026-10-22-next-prompt.md | Retire copied next-work prompts from the active path; one stable entrypoint should discover current state. Preserve dated evidence/patches before any physical archive move; do not blindly remove referenced files. | No routine executor read. |
| REVIEW_CHOICES.md, MVP_DECISION_{QUESTIONNAIRE,ANSWERS}.md, PLANNING_READINESS_AUDIT.md, LEGACY_SLICE_MAP.md, superpowers/* | Keep historical rationale/traceability; remove them from default startup reading. Old OPEN/IN PROGRESS language is not a fresh owner decision request. | Only when tracing an actual unresolved contradiction. |
| .codex/skills/project-orchestrator/SKILL.md + user-level copy | Copies are byte-identical (9004 characters). Repo rule at58 mandates a worktree per outcome, contrary to current owner default. Make repository behavior defer to AGENTS/protocol; do not load orchestration for every simple executor task. User-wide changes need separate scope. | Use orchestration for coordination work, task-specific skills only when needed. |
| CLAUDE.md / web/AGENTS.md | CLAUDE is already a thin entrypoint and should remain so. Keep generated Next.js instructions; read relevant installed-version docs for changed code. | Tool/framework-specific guidance; no duplicate project policy. |
| DESIGN_SYSTEM.md / design_handoff_* / ROADMAP.md / BUSINESS_MODEL.md | Keep approved styling references, future ideas and business hypotheses in their current roles; do not feed all of them to ordinary feature implementation. | Relevant design tokens when changing UI; future scope only when explicitly selected. |

Physical deletion is not needed for the first useful improvement. Start by removing obsolete reading requirements, conflicting imperatives and duplicate current-state prose. Before later moves, check incoming links and preserve unique history. Generated JSON/coverage is maintained with its scripts, not independently rewritten as another policy source.

### Concrete collisions to correct

1. AGENTS:46 supports automatic continuation; implementation_plan:7, START_NEXT_WORK:5/63 and EXECUTION_PROTOCOL:5/end explicitly ask before the next micro-task. Previously a legitimate scoped override; the owner's new answer now authorizes replacing that per-task gate in the approved queue. Keep task checkpoints and real stopping conditions.
2. Repo orchestrator:58 says one isolated worktree per outcome; AGENTS worktree lifecycle says reuse by default. Current owner policy wins. Its agent-count suggestion is optional, not a requirement to delegate normal tasks.
3. Permanent AGENTS:50 asserts a particular cloud continuation is the only executor. Treat ownership as current recorded state; do not turn a dated claim into a perpetual lock or blanket data authorization.
4. AGENTS:18 says no external links; DECISIONS E8 expressly permits copying native public listing URLs for guests. Clarify the rule without adding third-party listings or external communication workflows.
5. START_NEXT_WORK:65 promises physical Stage A continuation; selector's post-milestone fallback resumes packet priority/Google acceptance. The previous audit reproduced this in memory. Update code and meaningful transition regression when implementing the simplification.
6. DEVELOP​MENT_PLAYBOOK's older plan/approval wording and copied next-agent snapshots compete with current dispatch. Historical caveats help but do not remove the cost of repeatedly reading obsolete instructions.

### How decisions become execution

Recommended flow: owner and coordinator settle/change product behavior in DECISIONS → coordinator prepares one ready work card from existing plan/contract → economical executor completes it with targeted verification → executor records a short result and evidence → next approved ready item proceeds automatically. Owner feedback can arrive at any checkpoint. A newly observed defect is recorded with reproduction; new scope/product policy returns to the owner; no silent reinterpretation of settled rules.

Work card fields: visible outcome; existing behavior to reuse; exact stable task IDs/files and relevant decision/contract sections; missing work and scope boundary; acceptance commands/scenarios and QA target; stopping condition. Start from existing implementation, not a new discovery audit. One user-visible outcome may contain related technical steps; preserve their individual status and prerequisite gates. No fixed time/number-of-files rule is needed.

Draft executor message after policy/selector alignment:

> Execute the selected ready work item under AGENTS.md and EXECUTION_PROTOCOL.md. Read its work card, latest owning checkpoint, named decisions/contracts and affected source. Implement only the missing approved behavior, run its checks and update existing records. Report briefly what works, actual evidence, limits and next step. Continue the approved queue without per-task permission; stop for a concrete blocker, new product decision or critical action under the standing gates. Create a new document only for a distinct necessary role.

Keep the instruction-entrypoint change and the QA-runner change separately reviewable. Do not undertake another product-plan rewrite, enable the old automation unchanged or require all historical research to close before independent demo work.

### QA account reuse: feasible, with runner changes

The tests already exist; the repeated cost includes provisioning and state preparation. Source facts: qa-fixtures.mjs:12 defaults to9 accounts (custom count1–9 already exists); prepare:62–92 generates fresh IDs and refuses to overwrite an existing manifest; check:102–112 can validate/sign into existing exact-ID fixtures. resident-live.spec.ts:18 and chat-unread.spec.ts:26 depend on a nine-account indexed manifest. canonical-fixture.ts:7–12 already reuses a completed resident. TESTING:42/72/108 still directs fresh preparation, while retained demos must not be reset. Reuse is partly possible, but not a complete safe repeatable suite today.

Recommended three purposes:

- **Retained demos:** for owner inspection; preserve their identities, content and credentials privately. Do not reset them to make a test pass.
- **Dedicated reusable QA pool:** fixed, explicitly marked owner/requester/member/outsider accounts sized to actual scenarios; validate target/IDs/sign-in and required profile state once per run. Lease/serialize affected accounts so concurrent tests do not change each other's state. Keep credentials ignored. Use new run-scoped listing/inquiry/group/message IDs where the transition cannot be repeated on an old object. Restore reversible state with guards and audit only run-owned data; keep account identities. Failed preflight diagnoses drift rather than provisioning another nine accounts automatically.
- **Pristine/destructive cases:** create only the actors needed for first signup/onboarding, age boundaries, deletion/suspension or other cases requiring a fresh identity. Dispose of those exact fixtures when no longer needed. Do not fake first-run coverage with a completed persistent account.

This requires extending the existing helper with safe reuse/ensure and per-scenario reset/preflight, named actor mapping in affected tests instead of arbitrary fixture indices, and explicit repeatability assertions. Existing check is a starting point; it does not prove the scenario data is clean. A local isolated seed/reset can accelerate baseline creation ([Supabase seeding](https://supabase.com/docs/guides/local-development/seeding-your-database)); never run a whole-database reset on the shared target. Local startup/bootstrap/Docker gaps recorded in TESTING remain to resolve, not a requirement to stop all authorized work.

Keep existing meaningful SQL/RLS, ordinary-client/browser and HE/EN/mobile acceptance. Run affected checks first; repeat/broaden only for changed dependencies, failures or unresolved risk. A reusable account or cached build does not certify a fresh release. No measured account/time/token saving is claimed before benchmarking the revised runner on one representative route.

### Current decision completeness and next work

Owner intake,25October: recorded `DEMO-CONTENT-PHOTOS-001` in KNOWN_ISSUES.md. The owner wants a representative set of complete synthetic resident profiles and apartment listings with proper visible photos; the current experience feels incomplete or broken. Nonurgent, deferred until after instruction/QA workflow work and before visual/demo assessment. Diagnose content gaps separately from image-loading/rendering failures; no live reproduction or data/media mutation. Reuse the dedicated demo/QA preparation strategy and preserve retained demos, rather than provisioning another cohort on every run. This does not change current feature priority or create a new product-policy decision.

DECISIONS contains129 DECIDED rows, one DECIDED(approach), five OPEN and seven RESEARCH. Remaining owner-facing OPEN items are G4 future Pro value, K4 domain, L2/L6 support operation and L3 pilot recruitment/supply; L1's waitlist location is still a subchoice. RESEARCH covers G3, J8, K3, M1/M2/M5/M6. These concern future business, provider/runtime evidence and activation review; their existence is not evidence that core demo architecture must be redesigned. This is a register classification, not legal/provider clearance or assurance that no implementation question can emerge.

Review delivered in this existing report. Current code/policy/selector/QA scripts/fixtures and automation were not changed. Only this report, the shared navigation row and generated inventory are updated; no commit/push/deployment or new runtime acceptance. Next concrete implementation is a bounded instruction/dispatch alignment using the direct owner answers, followed by a separately verified reusable-QA-helper improvement. Feature execution remains deferred during this requested review stage. No memory file was changed.

## Outcome and scope

Owner target confirmed in this chat: a working demonstration of people discovery → roommate group → apartment → inquiry → persistent owner conversation. The owner also identified excessive/conflicting instructions and wasteful scheduled runs as a current problem. Existing ten-minute runner remains PAUSED; no replacement was enabled.

Owner clarification: subscription usage is the limiting resource. The desired approach is to let a cheaper/weaker executor implement settled features from focused context, reserving expensive reasoning for actual ambiguity or difficult defects. The owner currently wants a direction check before choosing a new dispatch granularity; no outcome-sized grouping or automatic continuation override has been approved. Cosmetic UI can wait, but perceived implemented-yet-off behavior needs targeted diagnosis. Do not infer that a fresh product interview or deleting requirements would solve this.

This is an audit and a reviewable proposal, not a change to product decisions, dispatch authorization or task completion. No application/SQL/fixture changes, new checkout, commit, push, merge or deployment were performed by this audit.

## Source and evidence boundary

- Calling checkout: `C:/Users/User/Desktop/appartement tinder`, `master`, starting HEAD `e1b0784adffbf88fe61618b0079f71ea0920e40f`; initially clean. A separate active chat is handling the primary checkout's rejected push. Do not merge/reset/rebase on its behalf.
- Actual GitHub `master` independently read using `git ls-remote origin refs/heads/master`: `86f95f5f9205c3ee1f8694c78f3f3059cad1ed4d`. Cached `origin/master` and room44 source match it. Audit uses `git show origin/master:<path>` rather than the stale primary application source.
- Current operational exception: primary PROJECT_STATUS and room44's uncommitted SL04 handoff contain newer fixture-provisioning evidence. Task4.4 remains open. Fresh fixtures were authorized, but a usable local service-role credential or an explicitly approved credential-safe connector submission path remains unavailable. No secret value was read by this audit.
- Read-only domain reviews examined checklist/selector and actual journey source. Counts and selector transition independently reproduced by the coordinating agent. Structural planning validation passed in the source checkout (26 slices/23 packets); this is not runtime acceptance.
- Historical browser/deployment statements below are attributed to their handoffs. No fresh browser, Supabase, Vercel deployment or visual acceptance was performed in this audit. GitHub SHA confirmation is current; deployment READY remains recorded evidence.

## What the checklist says

Source: integrated `implementation_plan.md`, stage boundaries at lines38,624,1207. These are task counts, not weighted effort or percentage of product functionality. An unchecked task may already have working code awaiting reconciliation/acceptance.

| Scope | Checked | Open | Total |
| --- | ---: | ---: | ---: |
| Stage A: demonstrable core | 47 | 55 | 102 |
| Stage B: full MVP and resilience | 2 | 98 | 100 |
| Stage C: deferred planning only | 0 | 27 | 27 |
| Total | 49 | 180 | 229 |

Stage C is not authorized feature implementation. Stage A/B together have153 open tasks; the current owner-management milestone has22 open of51. Stage A open tasks break down into owner management/inbox/acceptance22, map/detail5, saves2, chat3, discovery3, groups6, group inquiry9, lifecycle2 and combined acceptance/instructions3.

## Existing value and the missing connection

- Publication, cloud/private drafts, explicit public edits, basic discovery/groups, persistent chat, personal inquiry/acceptance/address and native apartment sharing have implementation and dated acceptance evidence. Reuse them. See current primary PROJECT_STATUS, SL04 handoff and the 20/23/24October release records.
- The owner inbox is incomplete: `web/src/app/(main)/my-listings/MyListingsPage.tsx:40` reads pending inquiry IDs/apartment IDs, then renders action buttons at110. Owners lack the planned safe requester card, optional introduction, time/status, property/state filters, decline/seen state and accepted-chat link. Tasks6.22–6.29/6.20 cover this; reuse existing personal inquiry RPCs.
- Unanimous group inquiry is absent. `web/src/components/chat/ChatListingCard.tsx:91` offers personal save/share; no consent-round/group-inquiry schema/callers were found. Existing sharing does not implement F4/E8 group consent. `docs/specs/GROUP_LISTING_INQUIRIES.md` and Stage A tasks6.6–6.14 define the approved behavior.
- Room availability backend exists, but task4.4 lacks fresh owner/foreign/guest ordinary-client acceptance. It is unfinished verification, not a request to rebuild SQL. UI4.5 and intake4.17/4.18 follow in the existing physical queue.
- Functional follow-ups belong to those existing tasks: pending inquiries marked for reconfirmation currently lack requester reconfirmation UI; Map contact still offers an inquiry on an owned listing while public detail correctly offers management. SQL denies self-inquiry, so the latter is a UX defect, not evidence of an authorization bypass. These source findings were not freshly reproduced in a browser.

## Concrete instruction and automation problems

| Finding | Evidence | Practical consequence / proposed correction |
| --- | --- | --- |
| Two execution modes require explicit routing | AGENTS/START_NEXT_WORK support continued authorized work; implementation_plan opening instructions and selector note explicitly require one physical task then owner confirmation | The scoped micro-task gate is deliberate, not permission to ignore it. Replace it only with an explicit owner-approved unattended mode; ordinary manual single-task mode can remain available. |
| Selector changes priority after the current milestone | `scripts/next-work.mjs:43–81`, START_NEXT_WORK:65, WORK_PLAN:46–50 | Pure in-memory simulation of all51 milestone boxes checked + SL04.2 verified returns `resume SL01.2` (Google acceptance), not next physical Stage A task3.1. Current output remains4.4. Fix Stage A dispatch before enabling unattended continuation; do not mark Google verified. |
| Status copies disagree | execution-state SL10.1 and sharing handoff still contain “publication pending”; newer SL04 release checkpoints and primary register record the sharing release and acceptance | Repeated archaeology or unnecessary rebuilding. Maintain one concise current state per work item; preserve old evidence as explicitly dated history. |
| Primary source differs from integrated source | Primary e1b0784 versus actual remote86f95f5 | Agents reading primary application/planning files can get an obsolete task/decision. The separate Git-repair chat owns reconciliation; do not bypass it with another checkout. |
| Procedures are repeated | AGENTS, START_NEXT_WORK, EXECUTION_PROTOCOL, implementation_plan opening and skill overlap on startup, verification, release and handoff | Give each rule one operational owner and link to it. Historical files/contract libraries need not be deleted; load only current task rows/sections. |
| Micro-task dispatch repeats setup | Existing paused runner opens one chat for every physical technical task | Small context helps focus, but repeated source reconciliation/build/release/handoff can dominate a tiny task. Prefer one bounded user-visible outcome per executor, with existing task IDs retained as checkpoints, if owner chooses that mode. |
| Ten-minute wake-up is not ten minutes of productive work | Existing runner is a heartbeat targeted to another chat, with a long dispatch prompt | A wake-up can spend usage even if it only discovers unchanged state; quiet output does not prove zero usage. Avoid another audit on each tick. An already-running executor should keep working to its stopping condition. |
| Installed Grill Me is incomplete | `C:/Users/User/.agents/skills/grill-me/SKILL.md` says only `Call the Skill tool with "grilling".`; no grilling skill/tool found in available catalogs/local skill roots | Do not claim the exact workflow ran. Use direct focused interview questions meanwhile; repair/install that dependency separately if needed. |

The amount of instruction text alone does not establish the size of usage waste. For scale, integrated AGENTS is about12.4k characters, PROJECT_STATUS31.0k and DECISIONS59.9k; these are character counts, not billed tokens. Loading relevant decision IDs is useful; repeatedly loading the whole history is avoidable. No measured token savings are claimed.

## Bounded simplification proposal — not yet applied

Complete one maintenance change, with no app redesign or new product policy:

1. Keep DECISIONS as product authority. Keep AGENTS as a short entrypoint containing invariants, current authorization and links. Put execution/testing procedure in EXECUTION_PROTOCOL/TESTING; the task supplies relevant decision IDs and contract sections.
2. Make PROJECT_STATUS a concise current index. Keep detailed dated evidence in existing owning handoffs; label superseded entries. Reconcile known release-pending copies without inventing new acceptance.
3. Preserve all229 stable IDs and completion flags. Make the approved Stage A queue and selector agree beyond SL04.2. Add a meaningful regression for the actual milestone transition.
4. After owner chooses execution granularity, make manual versus unattended continuation explicit in one place. Remove repeated instructions from runner prompts and task boilerplate without weakening privacy, real-user/target checks, secret protection, unrelated-work protection or actual acceptance.
5. Only then configure the existing paused automation. No duplicate runner, new worktree or broad documentation redesign is needed.

A possible short supervisor prompt after that reconciliation:

> Continue only the approved Stage A demonstration queue. Read the current work record. If its executor is active, leave it alone. If idle and unblocked, resume it; if its outcome is verified, dispatch the next bounded outcome using the repository's executor brief. Do not repeat an audit or rebuild a completed capability. Record progress or one concrete blocker. Notify only on completion, failure or required owner input. Stop dispatching when the combined demonstration passes.

This is a proposal, not an installed instruction. “Bounded outcome” must be defined by the revised dispatch; it is not permission to skip current unchecked prerequisites. A fixed ten-minute schedule remains optional after the owner reviews the workflow.

For a weaker executor, prepare one short work card from the existing source: visible outcome; what already works; exact stable task IDs/files/RPCs and relevant decision rows; actual missing behavior; ordinary-user acceptance; and a clear stopping condition. Let it perform routine implementation and targeted checks. Escalate an actual unknown/failure with its evidence instead of restarting discovery. Compare useful accepted outcomes and repeated repair/setup work when assessing efficiency; a shorter prompt alone is not proof of lower subscription usage. Do not create a third planning taxonomy or rewrite the229-task plan as part of this proposal.

## Product priority and design

Immediate next execution under the current queue: close4.4 ordinary-client acceptance in its owning workstream, then4.5/intake and a usable individual owner inbox. The next major missing end-to-end value is group inquiry: two roommates share an apartment, both consent, owner sees one request, accepts, and a separate owner conversation persists while the roommate chat stays private.

Reconcile existing map/save/chat/group behavior, then verify this combined route in HE/EN and phone/desktop with synthetic accounts. Do not call Stage A complete before group consent and the separate owner conversation pass. Notifications, deletion, student verification, final ranking and broader failure/load work remain Stage B; native apps, paid features and a broad redesign are outside the immediate demonstration target. This does not waive existing privacy/authorization rules or real-user release gates.

Invest in design that lets these actions be understood and completed: requester cards, consent progress, clear save/send/accept states, errors/retry and usable mobile layout. Defer palette/branding/animation redesign. The missing owner/group actions currently matter more than a visual reskin.

## Handoff

- Decisions referenced: A10, D4, D16, D18, E8, F4, H1, K1/K5/K6, G6. No decision changed.
- Audit artifacts: this file, one shared navigation row and generated WORKTREE_INVENTORY only. Execution state/checklist/automation unchanged. No new live migration or PR/preview/deployment.
- Interview outcome: demonstration target and usage-constrained execution strategy are clear. No new product architecture decision was identified in this scoped audit. Future executor granularity/activation remains a proposal, not an unanswered product-policy blocker. Do not reopen settled decisions.
- Next concrete step: apply one bounded execution simplification/selector reconciliation if requested, while the existing 4.4 executor resolves its narrow QA setup. Then proceed through the approved connected owner/group journey. No broad audit should be repeated on each scheduled run.
- Cleanup: no checkout created; primary remains active and must not be deleted. Preserve room44's private config/fixtures and unrelated active Git-repair work.

Official product references: [Scheduled tasks](https://learn.chatgpt.com/docs/automations?surface=app) documents local-machine/app availability and same-chat versus standalone execution; [AGENTS discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md) documents instruction loading. Local projects require the computer on and app running. These capabilities do not guarantee a specific token saving or a productive task on each tick.

## Implementation checkpoint — 25 October 2026

Owner approved implementation, then promoted DEMO-CONTENT-PHOTOS-001 to near-term cheaper execution. This supersedes the earlier review-only/deferred wording above. Primary branch codex/streamline-execution, base 86f95f5; no new worktree. App Config owner e21c reports f62b3aa pushed branch-only, explicitly holding master integration.

- Implemented compact AGENTS/START_NEXT_WORK/EXECUTION_PROTOCOL, a reference-only historical playbook, shortened current WORK_PLAN/PROJECT_STATUS and local-test route, focused repo orchestration skill, and one maintained testing procedure. Earlier tracked histories remain recoverable at86f95f5 and preserved archive branches; no source/QA/demo deletion. User-wide skill copy unchanged. DECISIONS/PRD/domain behavior unchanged.
- All 229 task IDs, physical order and completion flags compared to the private pre-edit baseline and unchanged. Task 16.1 file scope/acceptance expanded by the direct photo-demo request; no full SL16 verification inferred. Original authorizations, target/data/ownership gates, secrecy, unrelated-state and checkout recovery rules remain.
- Selector now keeps Stage A physical order after the current milestone. A simulation selects3.1 with the actual unmet SL02.1 prerequisite, instead of silently returning to Google; no dependency status is changed. Explicit owner-priority16.1 is a bounded subset ahead of normal queue, with no parent-packet waiver.19 selector cases passed; structural planning passed26 slices/23 packets; repo skill validator passed.
- QA helper now prepares a named 1–9 actor dedicated pool once, ensures exact existing IDs/target/completed ordinary profiles, and runs child commands under per-actor leases shared through primary checkout. Overlapping subsets are excluded, failure releases owned leases, and stale/foreign leases are not expired/deleted automatically. Demo/legacy manifests cannot become pools implicitly; normal operations never create replacement identities/reset profiles. Dedicated-pool retirement requires extra explicit discard intent. Legacy nine-index suites retain their actor requirements; no claim that every suite was migrated to3actors.
- 5 QA checks passed, including actual CLI prepare/ensure/reuse/child/failure/target rejection against a localhost fake Auth/Data service with three actors and no create/reset requests. Network sandbox blocked local child fetches; approved localhost-only escalation passed. A small-pool duplicate-count bug and controlled-error handling were fixed before the final pass. These are contract checks, not hosted Supabase/browser acceptance or benchmarked subscription savings. No real credentials or live fixtures were read/changed.
- npm ci --ignore-scripts installed the existing lockfile after sandbox DNS failure; package files unchanged. No app/SQL source change, migration or live configuration change. Build/deployment status is separate; no app user-journey acceptance newly claimed. Git publication/checkpoint follows below.

### Ready next work card — DEMO-CONTENT-PHOTOS-001 /16.1

Owner wants the cheaper executor to do this next, so the project can be inspected realistically soon. Start with 4 synthetic residents and 3 apartment listings (a bounded representative set, not a public supply metric); increase only if needed for the selected viewing journey. Existing canonical test imagery includes a 1x1 PNG, and no committed safe demo-photo library was found by the cheaper read-only preparation agent. This is evidence of unsuitable test assets, not a live rendering diagnosis.

Allowed source: web/scripts/ensure-demo-content.mjs, proper generated/licensed synthetic demo assets under web/public/demo-content, one focused web/e2e/demo-content.spec.ts, and existing issue/handoff. Reuse existing profile/listing service/RPC and publication path; no migration/global config/app redesign or standalone planning document. Do not alter QA pool infrastructure except a proven shared gap.

Reuse exact authorized retained synthetic accounts after target/identity/ownership preflight; keep credentials/object paths/asset hashes in an ignored purpose-specific manifest. Do not scrape people's profiles, silently reassign existing data, reset demos or create a cohort by default. Complete approved visible resident fields/photos with ordinary owner sessions and save_resident_profile; owned listings need proper cover/gallery 3–8 images and room data through supported publication. Separate missing content, missing object/URL and renderer failures.

Acceptance: actual distinct profiles/listings render with non-placeholder image dimensions and successful loads in Discover/map/cards/details as applicable; HE/EN phone/desktop visual inspection, refresh persistence and role access. Re-run without duplicate accounts/listings/media; preserve public/private boundaries. Missing target/credentials/assets blocks that specific live step with evidence, not a claim of completion. Keep 16.1 unchecked until acceptance; 16.2/group inquiry and full SL16 remain separate.


### Verified source checkpoint — 25 October 2026

QA helper committed as c24502e. Final selector checks: 19/19 passed; check-planning passed 26 slices/23 packets; next-work selects the explicit owner-priority task 16.1. No packet evidence or checklist flags were promoted. Focused QA ESLint and repo skill validation passed. All 229 task IDs/order/completion flags remain equal to the pre-edit private baseline.

Other chat was instructed to use exactly owner, accepted_requester and pending_requester (plus guest), prepare a dedicated retained QA pool once and reuse ensure/run. Existing demos must not be adopted/reset. Initial safe pool provisioning is a separate unresolved operational step; no accounts were created/deleted by this change. App Config owner holds master integration pending this workflow release.

The cheaper demo executor prepared two offline-only validator files; public/private field and contract corrections were reviewed, and 3/3 offline checks passed. A generic validator without a real content manifest is not a useful release yet: both drafts were preserved under ignored web/.qa/workflow/demo-content-preparation instead of adding unused tools to the normal reading path. This is preparation, not visible photo completion. No suitable assets, exact retained identity mapping, hosted publication or browser acceptance has been performed. Task 16.1 remains unchecked.

Automation remains paused while the one-time operational setup and demo executor path are reconciled. No duplicate scheduled job or new chat was created. This audit changes the execution flow, not the product policy or runtime release claims. Next: publish verified tooling/instructions, communicate the source SHA, then complete the scoped demo card with the cheaper executor; keep the unavailable live step explicit.


### Publication and concrete runtime gates — 25 October 2026

- Integrated by normal fast-forward and pushed master 4eca5c764f69279bb6d4cfad15bbd125758b128e; independently matched ls-remote. Production dpl_9DNNRVqjbrLhfHXJdQHn4TtAK3dD reached READY with that exact Git SHA and canonical aliases. No app/SQL source changed and no new browser acceptance is implied. Primary is master; the owned workflow branch, archive branches/stash and private configs remain. No checkout created/retired.
- Communicated integrated helper SHA and the exact three-role scenario to the other chat. It reports an already-blocked goal and unmarked shared accounts, so it will not resume even local work without direct owner resumption. Do not represent the coordination message as goal resumption. Its App Config integration remains its responsibility.
- This chat completed the local preparation instead: primary web/.qa/room44-pool/accounts.json and run.json, exactly owner/accepted_requester/pending_requester. The ignored provision.sql has three auth.users inserts plus three auth.identities inserts in one transaction, no UPDATE/DELETE/ALTER/DROP/TRUNCATE, target https://npbduvjnqnbydolmdpsc.supabase.co, SHA256 a9e6c919a43b7cd2fd13fcc4232ab194c5531921aa3e85bafa6549fdaca33b05. Values/secrets were not printed. No remote account creation/deletion or application has happened. Keep this single retained pool; do not prepare a replacement. Applying it still needs fresh scoped hosted authorization because data status is ambiguous, plus a credential-safe local-to-target path. No plaintext SQL relay or secret output is authorized by local preparation.
- Cheaper executor read-only inventory was restricted to the six explicitly marked synthetic Discover demos (de100001 cohort). All have public name/bio, none canonical lifestyle facts/profile-photo URL/gallery/owned listings; no profile-photo Storage objects found. This establishes missing content, not a rendering diagnosis. Existing e195 handoff/recovery filenames confirm their generated passwords were never retained; no credential manifest was recovered. Existing QA helpers cannot adopt them as a pool. No demo data changed. Owner direction is pending for one-time ordinary-login recovery of four marked demos; do not reset access automatically.
- Offline draft validator remains in ignored web/.qa/workflow/demo-content-preparation, not tracked or part of the release. Its 3/3 checks are preparation only. Images, authenticated content publication, refresh/idempotency and HE/EN phone/desktop acceptance remain open under 16.1. No measured usage saving or complete MVP claim.
- The old automation was viewed but not edited/enabled and no duplicate scheduler was created. Once actual runtime gates are resolved, continue the approved queue from the compact entrypoint rather than repeating this audit. Current owner questions concern only the one-time QA setup and retained-demo access recovery.


### Owner clarification — repeatable scenarios and demo access

Owner correctly identified that stable accounts do not make group/inquiry state repeatable. No permission to provision the three QA accounts was granted in that answer. Maintained TESTING now distinguishes persistent identity baseline, run-owned scenario journal/cleanup, baseline assertion and recovery; the helper currently supplies only identity validation/leases. Never claim a complete reset exists. The next bounded QA outcome is two group runs on the same identities with guarded exact-run teardown and outsider/failure rejection. Docker daemon check failed on the missing dockerDesktopLinuxEngine pipe, so an isolated restore is not currently demonstrated.

Owner explicitly approved one-time access recovery for four marked synthetic demo accounts. This does not authorize unrelated account reset/new accounts or changing their retained content. The cheaper executor is checking a supported, credential-safe existing admin/CLI path; no plaintext SQL relay or secret output. Photos remain an independent missing input. Do not ask for the same four-account authorization again; if execution is blocked, report the specific unavailable credential-safe path.


Group-exit source check: non-admin self Leave is present in GroupActions and calls remove_group_member; admin self removal is rejected by the migration and no admin Leave control is rendered. Recorded owner symptom and this precise source limitation as GROUP-LEAVE-ADMIN-001, browser reproduction pending. This is not a reason to mix test cleanup into product membership policy. No product rule was changed. Supabase skill/current Auth-admin documentation were consulted for a supported private local recovery helper; a server-only local key remains the configuration dependency, not missing four-account permission.


### Supported recovery helper checkpoint — 25 October 2026

The cheaper executor implemented recover-demo-access.mjs and focused tests; parent independently reviewed and added strict origin/userinfo checks, sanitized unexpected errors and primary-only exact-actor leasing. Supported Auth-admin getUserById/updateUserById path, no secret SQL relay or CLI dependency. All four preflight before updates; partial recovery retains prepared credentials/checkpoints and verifies ordinary login before retrying. Five focused tests, syntax and direct ESLint passed. These are local contract tests.

Ran prepare once in primary: ignored web/.qa/demo-recovery/credentials.json now exists for exactly four approved IDs. Dry-run shows 4 prepared / 0 verified. An apply attempt stopped on missing private server key before constructing an admin client or making any hosted mutation. Private admin.env template exists with explicit project ref and blank SUPABASE_SECRET_KEY; no value was printed. Owner must configure that local key (not send it in chat), then the existing four-account authorization permits apply/ordinary verification without another confirmation. No new demo or QA accounts, no profile/content reset, no image publication.

Selected workflow entrypoints/reference documents measured 120354 → 34315 characters after the simplification/current scenario guidance (71% shorter at that checkpoint); this is a character comparison, not measured usage/token savings. All 229 task IDs/order/flags stayed intact. The audit and workflow release are complete; scenario reset implementation, actual four-demo recovery, proper photo content, and group/owner journey acceptance are explicit remaining work rather than another audit.


### Phone planning boundary — 25 October 2026

Owner clarified that the phone agent has GitHub access and works on funding documentation/decisions, not code. Its single writing surface is now the existing BUSINESS_MODEL.md, with stable CHANGE intake IDs, explicit owner wording/status, source commit/date and user-visible acceptance. Bounded documentation PR only; canonical decisions/code/checklist/executor state remain Codex responsibilities. Root AGENTS points to this boundary without duplicating the protocol. Corrected stale business G2 entitlement summary to the current canonical privacy rule; no DECISIONS/product behavior changed. No proposal was fabricated, scheduler enabled or phone-agent message sent. This setup needs the owner to paste the short role definition into that agent's own instructions; repository prose is not a technical GitHub permission restriction.

The audit is complete. Next useful execution remains a bounded repeatability result (same identities, scenario teardown/recovery, two successful runs), plus independent approved demo enrichment after the private Auth-admin key is configured; then close 4.4 ordinary acceptance and build the owner inbox/group inquiry path. A broad design pass and another audit are not the next delivery outcome.


Owner supplied the phone agent's intended division of labor: business/funding/decisions there, implementation in Codex. Clarified that shared GitHub records are the bridge, not assumed direct chat access. Actual GitHub write capability is not yet verified; the same compact summary can be relayed by the owner if access is read-only. No API integration, external messaging, extra document or automatic decision-to-code dispatch was created. Documentation-only change based on master 73e43f0; structural planning and local links/whitespace checks passed; no runtime acceptance claimed.
