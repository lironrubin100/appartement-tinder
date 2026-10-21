# Shutaf project status

Updated: 20 October 2026 (Asia/Jerusalem). Current evidence is dated inline; historical acceptance retains its original date. This is the shared operational register for all local chats and linked worktrees. Product rules remain in DECISIONS.md. Read this file and one relevant handoff before exploring code.

## SL02 continuation update — 21 October 2026

Task 2.2 validation is complete in checkout `6b9e`: focused tests and TypeScript passed; see `docs/workstreams/2026-10-20-sl02-listing-continuation.md`. The owner requested continuing the earlier sequence ahead of the new owner-management plan, without discarding that newer plan. The next unchecked entry in the earlier sequence is 2.3; the newer plan independently prioritizes 4.9.

SL02 publication implementation was integrated in `65f3780`, deployed as `dpl_G8uj9A8VkRD7GXZFv1QjQdQ469SS`, and exercised on production in Hebrew and English with synthetic accounts. The older statement below that SL02 is uncommitted and unreleased is superseded. The packet remains verification-incomplete; see `docs/workstreams/2026-10-20-sl02-listing-continuation.md` and the task-level checkboxes in `implementation_plan.md`. The location-confirmation fix is deployed in `3880bf93e5472a37439ed477b0503aa0d16c1b30` / `dpl_8G83vrVXFU2hNWokbgtCTFvF9zy9` READY, with the public domain mapped to that release. The HE/EN 390px delayed-stylesheet/reload/edit regression passed 2/2 on production on 21 October; screenshots show the actual street map and stable confirmation. See `docs/KNOWN_ISSUES.md`. The next independent packet selected by `node scripts/next-work.mjs --json` is SL01.2, whose actual Google sign-in roundtrip remains outstanding; reconcile its prerequisite and scope before dispatch.

## Prior profiles/chat release — 20 October 2026

- **Production:** [appartement-tinder.vercel.app](https://appartement-tinder.vercel.app), release `2877c38a21e2b183805451a265354a19aa64faf2`, deployment `dpl_CmU7JB992cBpTMvRf4DivtAcHZGA` **READY**. Domain-to-deployment mapping rechecked during this documentation audit. The later queued duplicate deployment was canceled and is not the active public alias.
- **Implementation:** canonical profiles `39fdcee`; chat/contracts `95f333b`. Release2877c38 changes documentation and the test harness only; app/schema diff from39fdcee is empty.
- **Complete change/evidence/file map:** [19–20 October release summary](docs/releases/2026-10-20-profiles-chat.md). It maps all55 files changed during this continuation, all4 local/live migration versions, test targets, retained fixtures and unfinished work.
- **Packet state:** SL08.1 and SL00.2 verified; canonical SL01.2 functionality published and verified, with the packet still `verification-incomplete` solely for the unexecuted actual Google-account roundtrip. SL02.1 has uncommitted local implementation and partial acceptance; it is not released.

## What is verified working now

| Capability | Actual evidence / date | Source and publication |
| --- | --- | --- |
| Canonical resident draft/completion/edit, required adult/name/owned photo/bio/core4, optional facts and private preferences |19October fresh HE1280px/EN390px onboarding+edit;9 ordinary-client groups;20October Production private editor/startup/signout regression |39fdcee, included in active2877c38 release |
| Private full names, explicit public fact disclosure, owner-only private tables, gallery and last-photo protection |19October actual Storage last-object refusal/exact-byte retrieval; safe person/group/intro projection;20October outsider/privacy/photo review4 groups | Four reviewed live migrations listed below;39fdcee |
| Nonresident short intake/adult declaration and revision-safe private account editing |19October fresh corrected intake1/1 on built local server+shared backend;20October Production lister edit/reload passed; actual API conversion-retention/group-refusal checks19October |39fdcee; full Google acceptance remains separate |
| Correct persistent unread/read, hidden-tab focus behavior, retry-safe send and reconnect |20October actual Production HE/EN two-browser2/2 as part of9/9 runner; ordinary-client outsider/block/concurrent retry4 groups passed |95f333b, retained through active2877c38 |
|31-category typed contracts, HE/EN options, conservative legacy adapter, explicit-none handling and safe config allowlist |20October12 contract+8 selector tests; canonical SQL53 option parity suite; full TypeScript/build passed |95f333b + public renderer/parity additions39fdcee; production scoring not replaced |
| Guest/auth return and both locales, safe callback errors |20October actual Production4/4 guest/browser checks; final2877c38 both login pages+external callback3 HTTP checks |Active2877c38 deployment |

## Historical listing/group baseline — 15 October 2026

The table below retains its original verification date and does not certify a new full listing/group lifecycle run after the canonical changes. Use the dated current rows above for this continuation.

| Capability | Verification | Where the code is | Integration / deployment |
| --- | --- | --- | --- |
| Public apartment page in Hebrew and English, photos, per-room prices, private location, share metadata | Real guest browser + SQL privacy checks; invalid/missing/rented IDs return HTTP 404 | Implementation snapshot 5f3bc7f | Merged and pushed to GitHub master in c80e9b2; Vercel production READY |
| Publish apartment and rooms, then confirmation with View listing | Real compressed photo uploads; corrupt-image recovery; atomic-write failure rollback; Hebrew/English | Implementation snapshot 5f3bc7f | Merged and pushed to GitHub master in c80e9b2; Vercel production READY |
| Owner dashboard, price ranges and mark-rented action | Real two-account authorization; persistence and cancel/confirm; disappears from public reads | Implementation snapshot 5f3bc7f | Merged and pushed to GitHub master in c80e9b2; Vercel production READY |
| Resident draft/profile/photo/traits, persistent login and return to intended destination | Fresh real Chrome onboarding, reload, public/private projection and locale tests | Implementation snapshot c80e9b2 | Merged and pushed to GitHub master in c80e9b2 |
| Individuals/Groups discovery, introductions, personal and configurable group chats | Fresh separate browser accounts; recipient acceptance, live delivery/reload, consent, admission votes, capacity and private history | Implementation snapshot c80e9b2 | Three live migrations applied; merged/pushed in c80e9b2 |
| Public listing → sign-in return → persistent inquiry → owner acceptance → private address/chat | Fresh guest/renter/owner/outsider browser and ordinary-client checks | Implementation snapshot c80e9b2 | Three live migrations applied; merged/pushed in c80e9b2 |


[Historical full verification](docs/LISTING_SLICES_VERIFICATION.md).

## Registered workstreams

Current cloud entries are identified explicitly. Older rows retain historical source/checkout references; they are not claims that those other-machine checkouts are active in this cloud environment.

| Work ID | Outcome / state | Location | Next step |
| --- | --- | --- | --- |
| [implementation-plan-SL01](docs/workstreams/implementation-plan-SL01.md) | Tasks 1.1–1.4 verified within recorded scope, including HE/EN public group member card and private-field exclusion. Live discovery excludes listers: DISCOVER-LISTER-LIVE-001. | 6b9e, branch codex/implementation-plan | Stop for owner direction; task 2.2 is the next unchecked task. Lister discovery defect and Google roundtrip remain separate. |
| [implementation-plan-SL00](docs/workstreams/implementation-plan-SL00.md) | Tasks 0.1–0.3: source reconciled; baseline tested and core contracts mapped against source and live function catalog on 21 October. | 6b9e, branch codex/implementation-plan | Continue task 1.1 existing-account login; preserve other worktrees. |
| [2026-10-20-demo-first-implementation-plan](docs/workstreams/2026-10-20-demo-first-implementation-plan.md) | Documentation only: 192 serial micro-tasks; working core before broader hardening. Owner-approved F4/E8 unanimous group inquiry recorded; new SL06.3 pending, 22 packets. Original SLICES unchanged; no app implementation. | Windows f185 checkout, detached fcef507; uncommitted documents, not integrated/deployed | Review implementation_plan.md; future execution starts 0.1 source/belongs-to-work reconciliation, then missing core sharing/group inquiry. Preserve active e175 SL02 work. |
| [2026-10-20-sl02-listing-continuation](docs/workstreams/2026-10-20-sl02-listing-continuation.md) | SL02.1 deployed with live privacy and publication migrations. Local HE/EN checks, live ordinary-client authorization/retry/legacy checks and production HE/EN 390px publication passed using synthetic accounts. Real production EN provider suggestions passed separately. | Application `65f3780`, production `dpl_G8uj9A8VkRD7GXZFv1QjQdQ469SS` READY; e175 checkout | Review remaining packet and hardening evidence, including the observed early confirmation reset, before marking packet verified. |
| [2026-10-20-documentation-reconciliation](docs/workstreams/2026-10-20-documentation-reconciliation.md) | Documentation audit/reconciliation: current release, all55 changed files, technical contracts, testing commands, defects and execution evidence aligned. No app/schema change. | Cloud `/workspace/appartement-tinder`, branch `work`, audit base2877c38 | Coverage55/55,130 local links, planning/selector8 and independent factual reviews passed; documentation-only commit/push under standing authorization. |
| [2026-10-19-sl01-canonical-profile](docs/workstreams/2026-10-19-sl01-canonical-profile.md) | Canonical app39fdcee published in final2877c38 / dpl_CmU7JB992cBpTMvRf4DivtAcHZGA READY.20October Production9/9, SQL53 options, contract/selector20, build/types and ordinary authorization/age/privacy passed. | Cloud `/workspace/appartement-tinder`, branch `work`; [consolidated release](docs/releases/2026-10-20-profiles-chat.md) | Google interactive roundtrip remains unexecuted; SL02.1 listing phone/retry/draft findings documented for separate work. |
| [2026-10-19-cloud-mvp-progress](docs/workstreams/2026-10-19-cloud-mvp-progress.md) | Historical19October checkpoint verified SL08.1 and SL00.2 with browser2/2 and19 contract/selector tests.20October successor evidence is now linked: contracts12+selector8, Production chat2/2; full canonical profile implemented with Google acceptance pending. | Historical implementation95f333b / first releasebf8fe9d; included in current2877c38. Live migrations20261019211840 +20261019212312. | Historical19October2/2 retained; fresh20October Production chat2/2 passed. Canonical followup now implemented; only Google acceptance remains for SL01.2. |
| [2026-10-19-address-autocomplete](docs/workstreams/2026-10-19-address-autocomplete.md) | Published grouped free-form autocomplete with automatic provider-component parsing, optional city/region/neighborhood/street filters, duplicate-free labels and private area refinement. Seven logic/SQL tests, HE/EN 390px UI contracts and production build passed; real HE/EN addresses and city refinement verified. | Application 9d75218; Production dpl_7eTiwhstodM2otJjdCyi1Ymm195e READY; existing migration unchanged | Bounded autocomplete work complete. Region/neighborhood coverage depends on provider; full SL02.1 listing lifecycle not recertified. Retire this checkout only after chat inactive. |
| [2026-10-19-carto-api-key](docs/workstreams/2026-10-19-carto-api-key.md) | Published and verified: CARTO key wiring plus phone map height fix; real streets/pins/attribution on HE/EN desktop and 390px. | Historical a6de checkout, detached `87e7f11` | Complete. Address autocomplete is separate missing work; see 2026-10-19-address-autocomplete. |
| [2026-10-17-sl01-intake-and-safe-browsing](docs/workstreams/2026-10-17-sl01-intake-and-safe-browsing.md) | SL01.1 completed and published: safe lister Discover/Map browsing, explicit one-way resident→lister conversion and the guarded Chats group-read regression fix. Live migrations `20261017095908_lister_safe_browsing`, `20261018082834_convert_resident_to_lister` and `20261018100000_list_accessible_groups` were verified; browser conversion and focused Chats acceptance passed. | Historical source `ed601e3`; b6f7 retirement state belongs to the dated owning handoff | Select the next eligible packet using `START_NEXT_WORK.md`; retain demo fixtures per owner direction and retire this redundant checkout. |
| [2026-10-17-sl00-baseline](docs/workstreams/2026-10-17-sl00-baseline.md) | SL00.1 baseline verified locally: PGlite and TypeScript passed; no local Supabase runtime/environment is available, and no hosted mutation occurred. Build compiled/generated artifacts but final exit capture is incomplete. | Historical b6f7 checkout, detached `6926eb4` | Reconcile SL01.1 intake/startup routing locally; browser acceptance needs an identified isolated backend or separate named-hosted-target authorization. |
| [2026-10-15-planning-readiness](docs/workstreams/2026-10-15-planning-readiness.md) | Approved MVP plan and autonomous next-feature workflow; package8304667 and cleanup0fd75bf pushed/primary integrated;21 packets and primary selector checks pass. | Main project; bd33 active maintenance branch | Say work on the next feature; START_NEXT_WORK and next-work.mjs select SL00.1 initially; reconcile existing implementation. |
| [2026-10-17-worktree-consolidation](docs/workstreams/2026-10-17-worktree-consolidation.md) |13->2 registered worktrees;11 archived/retired,3 merged branches removed; checksum/bundle/patch recovery verified. | Historical primary+bd33 inventory; private recovery catalog ARCHIVED_WORK | Reuse primary by default; no per-packet worktree. Retire current maintenance checkout only after this chat is inactive. |
| [2026-10-15-map-m02](docs/workstreams/2026-10-15-map-m02.md) | CARTO Positron tiles and OSM/CARTO attribution deployed to Vercel Production from `a150a7c`; static checks, Preview and production auth-route smoke checks passed. Authenticated phone-width map imagery remains unverified because this checkout has no disposable QA fixture. | `C:/Users/User/.codex/worktrees/60b8/appartement tinder`, `codex/map-m02-carto` | For fuller release evidence, run the focused attribution test and inspect `/map` and `/en/map` with a disposable authenticated fixture. |
| [2026-10-19-map-runtime-recovery](docs/workstreams/2026-10-19-map-runtime-recovery.md) | Published: CARTO is reachable, and the Map now surfaces recoverable listing-query and tile failures instead of rendering a blank map. Production deployment `dpl_9jeMmE3XJ2nePBhusDCJMVm2AqHd` is READY for `c1da7ee`. | Historical source `c1da7ee`; 92e7 checkout reference | Complete focused authenticated HE/EN phone-width browser acceptance with a disposable fixture; this is a remaining evidence gap, not a deployment block. |
| [2026-10-15-resident-journeys](docs/workstreams/2026-10-15-resident-journeys.md) | Three migrations applied; eight real browser acceptance tests passed; QA cleanup audited zero; reusable testing workflow verified | Integrated master; historical d5e9 checkout retired17October | Completed and pushed; use the next-feature handoff |
| [2026-10-15-listing-slices](docs/workstreams/2026-10-15-listing-slices.md) | Three reverified apartment journeys; implementation 5f3bc7f integrated into local master | Integrated master; historical d5e9 source retired after archival | Use START_NEXT_WORK; current MVP product decisions settled |
| [2026-10-15-work-register](docs/workstreams/2026-10-15-work-register.md) | Shared index, handoff workflow and Git inventory | Main checkout documents; historical d5e9 source integrated | Update this index and the owning handoff during future work |

## Current integration and next MVP work

Current workflow: [START_NEXT_WORK](docs/START_NEXT_WORK.md) selects the next eligible packet from approved [WORK_PLAN](docs/WORK_PLAN.md). Historical next-three-feature prompts are superseded as dispatch instructions. Do not rebuild existing journeys or reopen settled decisions. See [integration evidence](docs/workstreams/2026-10-15-integration-cleanup.md), [cleanup](docs/WORKTREE_CLEANUP.md) and [archived drafts](docs/ARCHIVED_WORK.md).

## All branches and worktrees

[Generated Git inventory](docs/WORKTREE_INVENTORY.md): the current cloud checkout has **1 registered worktree and1 local branch** (`work`). The earlier Windows-machine inventories and17October archive records are historical; this cloud inventory is not evidence about another machine. Git containment is separate from runtime verification.

Retired M01/M07/safety/auth/old-onboarding/map drafts are mapped to current packets in [ARCHIVED_WORK](docs/ARCHIVED_WORK.md). Consult the selected draft only when its packet needs it; no global re-audit or automatic merge of obsolete decisions.

## Shared database and publication state

Current continuation migration map (reviewed and applied19October; history rechecked20October):

| Local file suffix | Actual live version |
| --- | --- |
| `20261019210659_monotonic_chat_read_markers.sql` | `20261019211840` |
| `20261019212059_resident_adult_validation.sql` | `20261019212312` |
| `20261019214904_canonical_resident_profiles.sql` | `20261019215717` |
| `20261019215827_allow_incomplete_intake_correction.sql` | `20261019215905` |

The current owner-requested retention audit is **20 synthetic users/profiles,7 photos,0 temporary blocks,0 completed canonical residents missing an owned photo**. Exact IDs/purposes are in ignored per-run manifests; no passwords in Git. Historical zero-count cleanup records below refer to earlier disposable runs, not these retained demos.

- Standing owner confirmation, 19 October 2026 (current cloud goal): there are **no real users anywhere in the app until the owner explicitly says otherwise**. The current cloud agent is the **only active executor**, including database changes. Synthetic demo users are desired even outside QA so the owner can inspect the app; create/retain exact-ID synthetic fixtures without asking again within this scope. Do not modify existing retained demos to satisfy pristine-test assumptions. Recheck this record and live migration history before hosted schema changes; pause if real-user state or competing ownership changes. This confirms the existing AGENTS local-first fallback gate; local Docker Postgres image currently fails vfs extraction with no space left on device.

- The MVP uses Supabase project npbduvjnqnbydolmdpsc under J12. Migrations 20261014210721_listing_journeys and 20261014211718_listing_photo_ownership were applied by the listing-slices workstream. The detailed handoff explains their effects and compatibility. Do not apply duplicate migrations because a stale branch lacks their files.
- Resident/group/inquiry migrations 20261015084833, 20261015084841 and 20261015084850 were approved and applied. The dependent UI passed fresh acceptance against these versions.
- On 17–18 October, the owner explicitly authorized and the team applied `20261017095908_lister_safe_browsing`, `20261018082834_convert_resident_to_lister` and `20261018100000_list_accessible_groups` to the shared project. Their execution grants and authorization guards were verified. The last migration replaces an unauthorized server-side direct group-table read with an authorized RPC.
- On 19 October, `ed601e38350fdbb097ce8d006883f007c7493a73` was pushed to `origin/master`; Vercel production deployment `dpl_9WpQCm6zThU9HoK34AsQ8x3epcxq` reached `READY` for that exact SHA. Browser conversion and focused Chats regression coverage passed. The retained synthetic fixture state means the prior full lifecycle test was not rerun after the Chats fix; this is tracked in its handoff rather than represented as a full-suite pass.
- Verified application snapshot: c80e9b2 includes the earlier apartment snapshot 5f3bc7f and resident/group implementation. Fast-forwarded local master and pushed to GitHub on 15 October; remote SHA confirmed c80e9b2e8c372ca5a926602ed16ea3342bbc85fc. No PR was created. Vercel automatic production deployment dpl_8CY6gLxmF4uiuRsXSMbwuoWdHLUL reached READY from that exact commit; appartement-tinder.vercel.app was assigned to it. Read-only deployed smoke checks returned login HTTP 200 and missing listing HTTP 404. This is deployment evidence, separate from the local eight-test multi-account acceptance. The nested map experiment was subsequently archived17October with its unique history and local state preserved.
- Historical15October cleanup: four temporary QA accounts and their profiles/listings/photos were removed and zero remaining QA rows/objects were confirmed. This is not the current20-demo retention audit.
- Read cached Git facts as a snapshot. Neither a commit present in origin/master nor a successful local test proves that Vercel is running that version.

## How future chats keep this current

1. Find the primary checkout using the first entry from git worktree list --porcelain. Read its PROJECT_STATUS.md and the one relevant docs/workstreams/<work-id>.md. Confirm the current checkout HEAD and local changes.
2. Before new implementation, add a row and a short handoff identifying outcome, owner chat, worktree/branch (or detached HEAD), decisions and acceptance criteria.
3. Update at meaningful checkpoints and before ending or interrupting work: files changed, what was verified and when, remaining work, live migrations, commit/push/PR/merge/deployment state and the exact next step. Each chat maintains its own handoff file; reread the shared index before editing it.
4. Refresh Git facts with node scripts/project-status.mjs --write --shared from a linked checkout. This reads Git and writes Markdown only. Add new outcomes to the table above only with actual verification evidence.
5. If a record is stale, investigate its affected area. A whole-project audit is reserved for an explicit audit request or a scope that needs one. Never treat an old note as confirmed-current without the relevant narrow checks.

The user-level project-orchestrator skill and primary AGENTS.md describe this lifecycle. The register is shared across this checkout's local worktrees. In the current cloud it lives on branch `work`, whose verified application release was pushed to `origin/master`; older Windows/local-master references are historical. This documentation reconciliation is committed/pushed separately under standing owner authorization; neither Git containment nor a documentation commit certifies a new application acceptance run.

## Historical resident acceptance — 15 October; current reusable testing

The user explicitly approved the shared MVP migration and requested a master push after verification. Fresh real Chrome against an owned production server: eight passed (1.9 minutes), including three listing regressions, four guest/auth checks and the full resident/group/viewing journey. Final build, TypeScript, targeted ESLint and disposable SQL/RLS checks passed. Nine QA identities and their related data/uploads were removed; all five cleanup counts were zero; server stopped and credentials deleted.

[Testing workflow](docs/TESTING.md) is maintained in the project and linked from both repository and user-level project-orchestrator skills. Helpers prepare nine isolated confirmed users via connector SQL, validate ordinary sign-in, prevent silent acceptance skips, remove owner Storage uploads and scope cleanup to exact fixture IDs. A separate helper forward test signed in all nine new users, removed two real fixture uploads and audited all cleanup counts zero. Both skill copies validated. Future agents should execute this workflow rather than hand the user a manual checklist.

Apple signup is deferred. No full Google OAuth round trip, concurrency/load proof, full older-screen translation or public-launch approval is claimed. Integration and deployment are recorded separately below when completed.

## Historical integration checkpoint — 15 October

Implementation c80e9b2 was committed on codex/resident-journeys, fast-forwarded into local master and pushed successfully; GitHub remote SHA was independently confirmed. Six local branches and seven worktrees remain, with no additional checkout created. The nested map experiment was preserved. No blanket merge or deletion of old unverified work occurred. Both user-level and repository project-orchestrator skills contain the autonomous testing workflow. Next development starts with docs/NEXT_CONVERSATION_PROMPT.md and the three recommendations in docs/NEXT_MVP_FEATURES.md.

Deployment checkpoint: c80e9b2 is verified READY in production; follow-up handoff-only commit 1ef4aba was also pushed. Subsequent documentation commits do not change the verified application source. The current Git inventory remains a dated snapshot, not a live dashboard.

## Owner management priority — 21 October 2026

Direct owner-approved planning update: preserve the completed1.1–1.4 checkpoints at6d24755. SL04.2 is next, starting **4.9**, with51 serial tasks combining37 new tasks and14 moved existing tasks. Canonical D16/I4/F4 and LISTING_MANAGEMENT define all-poster Profile access, private cloud multi-drafts/photos, explicit public edits and per-listing/aggregate inquiries. No app/schema work or runtime verification was performed here. Google/full packet and DISCOVER-LISTER-LIVE-001 gaps remain.

Planning source f185 is publishing only docs/selector; execution remains with the existing6b9e checkout after synchronization. No competing migration claim. [Planning handoff](docs/workstreams/2026-10-21-owner-management-plan.md); [execution handoff](docs/workstreams/implementation-plan-SL04.md). Old next-task2.2 and old uncommitted-f185 rows are superseded for this priority, not erased as historical records.
