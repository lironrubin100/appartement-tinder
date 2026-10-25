# Initial bounded execution packets

Historical packet contracts; current execution/authorization and fixtures come from START_NEXT_WORK/EXECUTION_PROTOCOL/TESTING, not this document.

17 October 2026. [Work order](WORK_PLAN.md), [protocol](EXECUTION_PROTOCOL.md), [slice envelopes](SLICES.md). Machine-readable readiness in [packets.json](planning/packets.json). Ready means local task contract settled, never runtime acceptance. Whole-slice readiness is separate: no blanket readiness promotion from these three packets.

## SL00.1 — Establish the reproducible isolated baseline

- Parent: SL00. Local contract ready; no prerequisite packet. Required decisions J11/J12/K5; K3/J8 provider capacity are context/release evidence.
- Outcome: identify actual source, owned local backend and existing tests so subsequent work repairs missing behavior rather than rebuilding shipped features.
- Read: primary PROJECT_STATUS and relevant handoff, current HEAD/diff, web/package.json, docs/TESTING.md and LOCAL_TESTING_WORKFLOW.md. Compare cached integration source without resetting/copying dirty changes.
- Prior drafts: consult ARCHIVED_WORK.md for retired M01/M07/safety and migration evidence; recover only missing approved deltas, not whole stale branches. This cleanup did not imply those features were integrated.
- Scope: inspect existing test helpers and target guards; find local runtime availability; run available static/PGlite checks. Do not create hosted resources, mutate shared config or replay live migrations.
- Commands from web: `npm run test:db`; `npm exec --no -- tsc --noEmit`; `npm run build`; use `npm exec --no -- eslint <affected-files>` only for changed files or established baseline targets. Record absent dependencies/tooling as absent; no surprise paid install. Build environment failure is not successful build.
- Guard: browser/DB mutation only after fixture helper confirms isolated intended target. An environment variable name or Preview URL is not sufficient. Existing acceptance helper may target shared backend: inspect before invocation.
- Fixtures: for static/PGlite none hosted. Local runtime may seed named synthetic ownerA/ownerB/residentA/residentB/outsider; document exact IDs and restore exact run-owned scenario state under TESTING; retain reusable identities and owner demos.
- Deliver: docs/workstreams/<work-id>.md with source/backend/migration baseline, exact command exit/results, existing failure list and runtime gaps. Required artifact for next packets is baseline record, not every provider working.
- Stop: unexpected target/migration drift; preserve report and proceed only with independent read/static work. No application feature changes in this packet.

## SL01.1 — Separate poster intake and safe browsing capabilities

- Parent: SL01. Local contract ready after SL00.1 baseline. Decisions B10/D1/D16/I9/I19/I22; C2 exact taxonomy outside scope.
- Outcome: nonresident poster completes short account intake and navigates Map/Discover without lifestyle questionnaire; resident retains required social setup and may deliberately convert to poster capability through Settings. Report ONBOARD-INTAKE-001 verified or disproved for named source/origin.
- Anchors: web/src/app/onboarding/resident-onboarding.tsx plus its server save validator/RPC, route/session guards, My Listings/navigation and safe discovery projections. Read actual branch detection first: current source already contains resident/lister branching, so do not assume a missing form from the report alone.
- Steps: reproduce with new poster/resident accounts; test interrupted/resumed intake, intended deep links and resident-to-lister conversion; reconcile fields/guards with POSTER_OUTREACH capability matrix; change only observed missing gates. Browse rights do not create a public roommate profile. Initial poster invitation implementation is SL06, not this packet.
- Scenarios: guest -> login -> intended safe route; poster required name/age/phone but no lifestyle; poster opens people safe projection; eligible resident confirms conversion -> lister startup, hidden public profile and denied resident actions; group member conversion refuses atomically; outsider cannot fetch DOB/phone/budget/preferences.
- Verification: type/build/targeted lint, owner/outsider direct-client assertions, real browser HE/EN 390px and desktop. Reuse approved local fixtures/target guard from SL00.1, exact cleanup. Add regression only for meaningful broken branch/authorization behavior, not implementation-shaped snapshots.
- Deliver: reproduction evidence, narrow diff or no-change finding, exact guards/projections changed and handoff. Do not rewrite taxonomy/design/auth providers or claim Google acceptance from a login-page redirect.

## SL08.1 — Correct persistent unread counts

- Parent: SL08. Local contract ready after SL00.1; accepted ordinary conversation fixtures may be seeded without completing SL07 scoring. Decisions F1/F2/F5/F8/H1, TECHNICAL_DEFAULTS read-marker contract.
- Outcome: CHAT-UNREAD-001 reproduced and fixed if present; own messages never show as new for sender, recipient count/read state consistent across tabs/reconnect.
- Anchors: web/src/app/chats and ChatThread, inbox/message/read RPC callers, conversation membership/read fields and Realtime hooks. Search actual function names before drafting migration; preserve working history cutoff/authorization.
- Fixture: A/B accepted conversation plus outsider X; seed visible sequence 10, then B sends 11, A sends 12. A read marker10 -> unread1; own12 does not add to A count; rendering/focusing through12 -> unread0. B counts only A's12 above its own marker. Include a group with post-join cutoff and preserve membership model.
- Scenarios: other recipient live+reload persistence; own send; monotonic read updates from two tabs; stale read update cannot undo newer marker; reconnect retrieves missed message once; duplicate request key one message; typing/receipts never counted; outsider and pre-join denial; block denies reads/previews/Realtime data.
- Verification: targeted SQL/PGlite test if supported plus actual two-browser ordinary-account delivery/read/reconnect, HE/EN badge rendering and guarded run-state cleanup with retained reusable identities. A socket-connected event or hidden badge is not acceptance.
- Deliver: current bug state and source/target, narrow code/migration if needed, scenario results and handoff. Typing UI, broad inbox restyle and leave workflow changes are separate later packets unless required to preserve this contract.

## Preparing subsequent packets

Use this same structure: parent/outcome, required DECIDED rows, context/research refs, exact required artifact, module anchors, ordered bounded steps, fixture/expected assertions, commands/cleanup, local readiness and separate live/release gates. Add packet ID/dependency/contracts to packets.json and validate before dispatch. A generic whole-slice task list is not automatically an executable packet. Shared files/schema ownership must be assigned before parallel changes.
