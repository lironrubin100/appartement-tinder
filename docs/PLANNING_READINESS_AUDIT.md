# Shutaf planning readiness audit

Status: IN PROGRESS — decision interview required; not an approved replacement plan.
Date: 2026-10-15 (Asia/Jerusalem).
Scope: finish product/architecture planning and produce executable vertical slices for a less capable coding agent. Preserve existing owner decisions; do not re-ask settled questions. The 114 imported tasks are evidence to assess, not a fixed target.

Planning checkpoint: BUILD_BLUEPRINT.md now indexes concrete scope/domain/execution proposals and 26 slices; all 114 old IDs mapped once and structural dependency/link/decision checks pass. Canonical direct-owner choices updated in A5/A10/D18/D19/G6/H3; CLAUDE startup/mode contradictions and false PostGIS-mandate wording corrected. These updates do not approve pending C13/E6/D0 changes. Review choices are consolidated in REVIEW_CHOICES.md. Remaining work below is historical discovery scope; current next actions live in the owning handoff.

## Evidence boundary

- Current checkout: `C:/Users/User/.codex/worktrees/bd33/appartement tinder`, detached HEAD `337d6b4c4e85161bafb063203b2911a146247fe6`; initially clean.
- Primary checkout found through Git: `C:/Users/User/Desktop/appartement tinder`; cached local master HEAD `debce0f83c4044be6c8a179587862e3f6b89dcfa` at discovery.
- Six new planning inputs are in primary checkout `new plan/`, not this checkout. BUILD_PLAN contains 114 headings and references an older `c80e9b2` snapshot.
- Read DECISIONS.md, PRD.md, ARCHITECTURE.md, AGENTS.md, CLAUDE.md, shared PROJECT_STATUS.md, work-register handoff, DEVELOPMENT_PLAYBOOK.md and TESTING.md. Two bounded read-only audits cover decision gaps and execution readiness.
- No application tests rerun, no live database inspected, no schema changes, no release verification claimed. Code findings below are local source observations only.
- Existing status/handoff claims remain dated evidence, not proof of today's production state.

## Rules for the decision interview

1. Start from DECIDED rows. Distinguish missing implementation detail from a new product choice.
2. Check new-plan owner-answer notes before asking; those notes are imported reports, not independent confirmation of approval or register updates.
3. Owner preference updated 2026-10-15: batch the currently known questions together, numbered and grouped, with recommendations and examples. Owner may answer all in one message, delegate technical choices or say undecided. Ask later follow-ups only for genuine newly discovered gaps; do not promise this list exhausts future findings.
4. Record actual owner answers with date and source. Do not convert an assistant recommendation into DECIDED.
5. Resolve cross-feature dependencies before writing individual implementation prompts.
6. Do not treat finishing this audit as permission to implement features, mutate the shared backend, commit, push, merge or deploy.

## Confirmed foundation — preserve

- A4/I4/I19/I22: resident Discover startup, configurable Map preference, separate non-resident listings destination, no resident account search modes.
- D1/D5/D9: apartment with available rooms and per-room prices; no independent public room listings.
- D4/B9: exact location and personal contact/budget data private; accepted inquiry gates exact-address access.
- C1/C2/C13: all 31 structured categories in v1; hard gates plus flexible compatibility; do not silently trim scope.
- C6/C7/C8/C9/C12: optional introduction text, 20 introductions/day, 30-day passes, acceptance opens chat.
- E1/E2/E3/E5/E9: consent-based groups, four-member initial cap, configurable admission, newcomer sees new messages only, group-to-group deferred.
- B3/B4: student-email verification; do not substitute ID/selfie checks.
- I16/I18/K1: Hebrew/English, RTL/LTR, Next.js/Vercel web first, native later.

## Priority findings and closure work

| ID | Finding and evidence | Required closure |
| --- | --- | --- |
| PLAN-01 | Completion scope lacks one acceptance boundary. Existing register distinguishes v1 and future; imported plan adds A/B/C tiers and postpones some decided v1 work. | Confirm what "finished project" means; map all existing commitments to pilot, broad web launch or explicitly deferred release. Do not ask to reconfirm each settled feature. |
| PLAN-02 | CLAUDE.md says Map-first and persona modes; AGENTS.md and A4/I19 say Discover and unified resident account. | Align downstream instructions to register; mark historical design instructions superseded. |
| PLAN-03 | ARCHITECTURE.md section 3 calls keyset RPC/PostGIS/counters resolved and mandated while J2/J4/J6/J7 are OPEN. PRD also asserts PostGIS. | Choose/reconcile technical architecture using present implementation and scale target. Remove false resolution labels only after review. |
| PLAN-04 | C13 specifies a compatibility concept, not an executable algorithm. No complete category classification, distance matrix, weights, missing-answer rules or rounding. | Specify hard gates, budget overlap semantics, directionality, score denominators, unknowns, explanations and worked examples. Preserve the 31-category commitment. |
| PLAN-05 | B9 keeps budgets private; E6 describes shared budget on discoverable group cards. | Decide permissible group aggregation/disclosure, consent and small-group inference safeguards. Group computation is not automatic permission to publish private inputs. |
| PLAN-06 | E6 lacks aggregation of conflicting preferences/missing answers and individual-to-group scoring. | Define aggregation and score contracts independently from rendering the group card. |
| PLAN-07 | H1 requires symmetric blocking across groups; E3 admits group members. Existing shared-group behavior is not explicitly chosen. | Define effects on existing group chat, admission, history and unblock; inspect code after policy chosen. |
| PLAN-08 | D2 creation requires available rooms; D9 permits zero room records. D6/D7 and pending-inquiry effects remain open. | Document apartment, room and inquiry state machines, transitions, visibility, renew/reopen and last-room-unavailable behavior. |
| PLAN-09 | D4 defines the grant event but not address-access lifetime or behavior after edits/block/leave/rented/deletion. | Specify revocation and versioning, distinguish future reads from information a person already saw. |
| PLAN-10 | B7/F6 deletion intersects E3's deferred admin departure and reports/Storage/auth sessions. | Define grace/cancel, message anonymization vs deletion, admin succession, shared data and evidence retention. Obtain legal review for legally dependent choices. |
| PLAN-11 | E3 majority admission lacks authoritative concurrency/electorate/version/expiry contract. Local migration has membership_version; recorded acceptance excludes concurrency proof. | Promote validated existing mechanics into specs; define atomic final-seat acceptance, retries, duplicate requests and policy changes. |
| PLAN-12 | C7 daily reset timezone and retry semantics are absent from register; resident handoff reports UTC. | Verify current code, specify timezone, rejection/withdrawal/pending-expiry and trait snapshots without silently changing quota behavior. |
| PLAN-13 | D15 furniture is DECIDED but actors, ownership, required-vs-optional purchase and sold/listing-rented behavior are absent. | Define item/seller model and contact/lifecycle permission contract. Do not silently defer a decided feature. |
| PLAN-14 | Register's old contradiction section still calls group ownership unresolved although E3 now decides admin control and defers departure. | Correct stale commentary; do not reopen settled ownership. |
| PLAN-15 | B2 optional phone conflicts with D2 required-field wording; imported owner-answer notes distinguish required lister/optional resident. | Reconcile wording against owner evidence before formalizing intake validation. |
| PLAN-16 | New status seed marks C02/C04 built without evidence paths; treats unverified as not built; snapshot omits newer work. | Separate implementation, verification, integration and deployment; inspect existing evidence before assigning current state. |
| PLAN-17 | 114 tasks mix horizontal infrastructure and user journeys; generic acceptance repeated across tasks; incomplete conditional dependencies. | Rebuild dependency-aware vertical slices; infrastructure enablers remain explicit subordinate tasks with their own acceptance. Preserve old IDs in a mapping. |
| PLAN-18 | New STATUS/SLICES files overlap PROJECT_STATUS/handoffs/BUILD_PLAN; append-only owner log would leave OPEN rows conflicting with narrative. | Assign one authoritative home per fact; update actual decision rows after owner confirmation, retain dated rationale/history separately. |
| PLAN-19 | T19 asks Preview to change global app_config to test quotas, while J12 says one shared DB and T16 separation is deferred. | Identify actual backend target per deployment. Never equate Vercel Preview with database isolation; design isolated config tests before running them. |
| PLAN-20 | T19 "everything configurable" conflates product settings, structural invariants and secrets; numeric scanner alone cannot prove absence of hardcoding. | Define typed keys, bounds, write/read permissions, cache/version/failure defaults, audit and rollout rules; keep secrets in env and schema invariants in validated code. |
| PLAN-21 | Notification prompt mixes no behavior change with enabling sends, unclear owner-level vs user-level choices, and incomplete delivery wiring. | Define event catalog, global policy vs personal preferences, outbox/retry/idempotency/dedupe, quiet/read suppression, opt-out, sender ownership and real channel tests. No sender assumed to exist. |
| PLAN-22 | Shared config/privacy changes can invalidate old client behavior, cached grants or old listing pins. | Specify migration compatibility and rollback/forward recovery per shared contract; never rewrite historical migrations for convenience. |

## Map/provider research — 15 October 2026

Sources are official documentation; no live address calls or provider-key inspection performed.

1. Public Nominatim explicitly prohibits autocomplete and caps the whole application's traffic at one request/second. A server proxy/throttle does not establish that typeahead fallback is permitted. The imported map prompt must not be executed unchanged. A deliberate user-submitted search could be evaluated separately against the policy; a self-hosted/commercial service has its own terms.
   Source: https://operations.osmfoundation.org/policies/nominatim/
2. LocationIQ provides a dedicated autocomplete API. Its documented output-language list omits Hebrew. This is a validation gap, not proof Hebrew queries fail. Need representative Hebrew/English address and house-number tests before freezing provider choice.
   Source: https://docs.locationiq.com/docs/autocomplete
3. Published LocationIQ free tier shows 5,000 requests/day, 2/second and 60/minute, with prominent attribution required for commercial use. Per-user debounce alone cannot enforce the shared quota across server instances. Need global budget/cache/backoff and explicit behavior on exhaustion. Terms must be refreshed before implementation.
   Source: https://locationiq.com/pricing
4. Missing specification: street-level result vs house-number result, manual correction, bbox vs real municipal boundary, stale selection after text edit, typed coordinate tampering, provider timeout, unknown address and editing an address after accepted inquiries.
5. Source risk requiring a focused privacy review: `supabase/migrations/20261007000100_listing_location_privacy.sql:15-21` derives offset direction from listing ID with a public algorithm and fixed radius. Synthetic algebraic test recovered 3 synthetic points with zero measured floating-point error given the direction/radius. Evidence: planning/synthetic-location-review.json. Hash derivation execution and live exposure were not tested; no real residents probed. D4's privacy outcome stays binding; implementation mechanism needs review.

## Competitor patterns worth evaluating, not automatically adding

| Evidence | Implication for Shutaf | Existing anchor |
| --- | --- | --- |
| Airbnb distinguishes public approximate location from address available after confirmation, and documents address-edit restrictions after a booking. https://www.airbnb.com/help/article/2141 ; https://www.airbnb.com/resources/hosting-homes/a/setting-expectations-with-an-accurate-location-491 | Specify the lifetime/version of an accepted address and explain approximate location clearly. Do not copy booking semantics into a rental inquiry. | D4, PLAN-09 |
| SpareRoom documents report entry points, off-platform scam patterns and email alerts linking to its inbox. https://www.spareroom.com/content/information-for-roommates/avoiding-scams ; https://www.spareroom.com/content/info-faq/faq | Plan reporting through review/outcome, safety wording at the relevant moment and private notification payloads. | H1-H7, L5 |
| Roomies distinguishes phone, ID and background verification. https://www.roomies.com/safety ; https://www.roomies.com/verifications | Explain exactly what a Shutaf student badge verifies; it must not imply identity/property-ownership/background checks. Existing email-only decision remains. | B3/B4/B9 |

These are source-backed observations plus planning inferences, not a complete market survey or a legal assessment.

## Target executor package — proposed structure

- DECISIONS.md: binding choices and explicit unresolved rows, with dated owner rationale; no competing append-only policy.
- ARCHITECTURE.md: approved entity/query/auth/provider contracts and links to domain specs.
- Domain specs: state machines, authorization matrix, API/RPC shapes, edge cases and representative examples.
- Slice catalog: outcome, prerequisites, owned changes, exact tasks, acceptance, verification and handoff; one authoritative entry per slice.
- Slice status: implementation + evidence/verified SHA/date; integration/deployment tracked separately. PROJECT_STATUS remains the short operational entry point; handoffs hold run-specific evidence.
- AGENTS.md: start/resume/execute/verify/recover/finish protocol, including when to stop for genuinely unresolved product decisions.
- Automated documentation checks: valid references/IDs/dependencies and evidence requirements; avoid hardcoding the legacy count of 114 as permanent scope.

## Interview queue

Completion boundary answered by owner on 2026-10-15: a usable working prototype for a closed pilot and presentation to a university investment fund, before public launch. Owner also wants an evolving record of business-model/Pro decisions and help defining credible prototype acceptance. No commitment to a specific fund's eligibility or investment outcome inferred. User requests questions in a single batch, not one per turn. Findings resolvable from existing documents/current code do not become owner questions.

## Confirmed owner intent — 15 October interview

- Target is a genuinely usable prototype, not public-launch readiness and not a promise of all future features implemented.
- Present a working product and vision to university investors to seek money/resources. Identify the fund/program before researching its actual requirements; do not substitute generic fundraising advice for its criteria.
- Keep business hypotheses and confirmed business decisions durable as the project evolves. Pro/payment/native commitments are not changed by this statement.
- Close planning enough for a less capable executor; explain omissions and edge cases in detail.
- Current interview batch covers pilot proof, users/supply, demonstrable journeys, matching/group privacy, lifecycle/blocking/deletion, geography/fallback, notification channels and business model. Technical implementation choices remain the architect's responsibility within approved constraints.

## Remaining work

Latest owner interview is recorded in docs/BUSINESS_MODEL.md. Confirmed direction: temporary day-one seeding only, no ongoing scraping business model; Beer Sheva focus without geographic publication ban; no Pro in initial prototype. D0/C13/E6 conflicts still require canonical reconciliation, not execution of imported prompts. Prepare scope/matching/lifecycle recommendations without re-asking answered questions.

- Finish full slice-by-slice coverage and dependency assessment, including complete prompts not just headings.
- Compare primary/master and relevant workstream source snapshots without merging unrelated work.
- Collect owner answers; update authoritative decisions only after confirmation.
- Produce and validate final domain specs, revised slice catalog and executor protocol.
- Reconcile superseded instructions and status after the new package is approved.
- Obtain legal/provider/live capacity evidence where relevant; no legal or launch readiness claimed.
