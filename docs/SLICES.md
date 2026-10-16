# Shutaf slice catalog

Updated: 15 October 2026. This is the proposed replacement work structure, not a completion report. Legacy coverage lives in LEGACY_SLICE_MAP.md. New IDs are slice IDs, not DECISIONS.md row IDs.

17 October: technical/moderation defaults and apartment-bound poster invitations adopted. WORK_PLAN.md defines order; EXECUTION_PACKETS.md and REMAINING_MVP_PACKETS.md define21 local packets covering SL00–SL16. Packetized envelopes dispatch through actual predecessor artifacts; context research is not a local packet blocker. Matching refinement remains late MVP.

**Every entry inherits EXECUTION_PROTOCOL.md and TESTING.md.** Read the named decisions/domain specs and actual modules before editing; paths below are ownership anchors, not permission to rewrite everything. Each slice requires its concrete scenarios plus relevant privacy, Hebrew/English, error/retry and phone/desktop checks. Do not rebuild existing code merely because verification is unrefreshed.

Readiness labels: `packetized` (dispatch through bounded packet manifest), `needs-decision`, `needs-research`, `ready`. None of the proposed product slices is claimed runtime-verified by this documentation work. Existing historical implementation/evidence remains in PROJECT_STATUS/workstreams. Commit/push/merge/deploy are separate.

## SL00 — Reproduce the baseline and lock shared contracts

- Depends on: none
- Readiness: packetized
- Release: pilot enabler
- Outcome: the next agent can identify the actual source/backend and start one bounded journey safely.
- Decisions: J1/J2/J9/J11/J12/J13/K1/K5. Local disposable checks can proceed while external rollout choices are unresolved.
- Ownership: docs, scripts, web/package.json only when necessary; shared config/schema has one designated owner.
- Tasks: identify primary/target worktree and dirty work; compare relevant source with shared handoffs; record versions and current environment variable names without values; reconcile relevant live migration history read-only when authorized; run existing test:db/build/type/targeted lint baseline; specify typed business settings and feature flags with bounds/publicity/cache/audit/recovery; classify which settings need runtime editing versus stable technical constants. Complete approved taxonomy/API contracts consumed by later slices; do not invent policy in implementation.
- Acceptance: baseline run reproducible from named checkout; existing failures separated from new; backend identity and whether preview shares it explicit; no config mutation or duplicate migration; sample config consumer handles invalid/missing values under approved rule; docs dispatch reaches correct slice/spec.
- Evidence: command results and SHA/dirty state; target/migration snapshot if actually queried; no general production readiness claim.
- Excluded: feature implementation, mass historical-branch merge, full global-config rewrite before key inventory approved. T19's preview quota experiment remains blocked without isolation.

## SL01 — Join and publish a safe resident/lister profile

- Depends on: SL00
- Readiness: packetized
- Release: pilot core
- Outcome: a new or returning person signs in, resumes required intake and appears with the correct safe public profile.
- Decisions: B1/B2/B5/B6/B9/B10/D1/I9/I16/I18/I19/I22; identity/minimum profile approved provisionally; normalized taxonomy C2 baseline adopted; wording refinements allowed; listers browse authenticated safe people projections without lifestyle setup; guests sign in for people. Verify reported ONBOARD-INTAKE-001 in correct browser/origin.
- Ownership: web/src/app/login, auth/callback, onboarding, profile, settings; profile private/public projections and relevant migrations.
- Tasks: preserve Google/email paths and protected return URLs; recover canceled/expired auth; persist resident draft/photos; nonresident account-only intake; complete approved structured facts/preferences with source IDs, labels and validation; expose selected badges only; safe public page; startup setting; signout/session recovery. No Solo/Group account mode.
- Acceptance: reload half-completed intake resumes; guest deep link returns to intended safe destination; incomplete resident cannot match/post; lister not forced into social profile; outsider cannot fetch private fields; selected badges only; invalid DOB/photo/query errors recover; editor changes own data only. Verify actual Google round trip when configured, not callback reachability alone.
- Evidence: ordinary-account browser flow, outsider column/projection tests, auth-error recovery and cleaned owned photos; provider limitations named.
- Excluded: Apple, ID/selfie, Pro, undocumented private field publication.

## SL02 — Publish an apartment with available rooms

- Depends on: SL01
- Readiness: packetized
- Release: pilot core
- Outcome: an eligible resident/lister publishes a real located apartment with room prices/photos and reaches confirmation/view listing.
- Decisions: D1-D5/D9/D19/A5/J9/I4/I21; MAP_SEARCH and LIFECYCLE_AND_PRIVACY. Provider quality, field contract and overlay behavior must be approved.
- Ownership: compose/ComposeForm/ComposePage/published, lib/listings validation/actions, address API/client and owned-photo pipeline; atomic publish RPC.
- Tasks: preserve composer origin/draft; integrate authenticated address autocomplete with verified provider quality; invalidate stale selection; provide explicit manual-map/address confirmation; validate coordinates independently from city focus; add approved apartment facts/rooms; compress/validate 3–8 owned photos; idempotent atomic publish; confirmation links actual new listing in correct locale.
- Acceptance: two-room prices and available count agree; valid Tel Aviv listing not rejected; nonexistent house number can use honest manual confirmation; out-of-order provider response cannot replace chosen address; failed upload/write leaves no partial public listing; repeated publish creates one; unsafe owner/coordinates/photo references rejected server-side; closing composer returns to origin.
- Evidence: real provider suite separately from mocks; database rollback/idempotency checks and full publish browser acceptance/cleanup.
- Excluded: public exact address, silent guessed location, public-Nominatim autocomplete, furniture marketplace.

## SL03 — Browse map/list and inspect safe apartment details

- Depends on: SL02
- Readiness: packetized
- Release: pilot core
- Outcome: a renter finds available rooms using area/filters and opens the correct shareable apartment page.
- Decisions: D4/D5/D9/D13/D14/D17/A5/J2/J6/J15; MAP_SEARCH. Privacy transform/pan/query/cluster fixed in TECHNICAL_DEFAULTS; synthetic/privacy/runtime evidence required.
- Ownership: map MapClient/LeafletMap/FilterBar/filters, lib/listings/public/locationPrivacy, listings/[listingId] + English wrappers and public pin query.
- Tasks: reconcile existing CARTO restyle; bounded pin projection; private favorite overlay; filter if an available room actually matches; stable selected pin/list synchronization; explicit search-area behavior; clusters with accessible overlap path; detail-on-demand; guest SSR metadata/invalid-link states; synthetic privacy inversion review before mechanism approval.
- Acceptance: price filter excludes apartment with no matching available room even if min/max envelope overlaps; map/list detail selection agree; zoomed cluster can reach every item; no-result/provider failure retry; guest/outsider JSON/metadata/payload reveal no exact address or private owner data; inactive/removed IDs return intended unavailable/404 behavior; city switch can find out-of-city listing.
- Evidence: browser viewport/cluster/filter cases, public projection tests and synthetic privacy report; public URL/metadata at named SHA.
- Excluded: mandatory PostGIS without J6 decision, rebuilding working map styling, uncontrolled fetch-all payload.

## SL04 — Keep rooms and listing details accurate

- Depends on: SL02, SL03
- Readiness: packetized
- Release: pilot core
- Outcome: owner edits an apartment, manages rooms/intake and sees consistent current information everywhere.
- Decisions: D2-D6/D9/D16/D18; lifecycle transitions/pending reconfirmation/address immutability follow TECHNICAL_DEFAULTS.
- Ownership: my-listings page/actions/RentedButton, reuse composer editor/lib listings; room/update transaction and photo-reference cleanup.
- Tasks: owner dashboard edit entry; versioned full-model validation; atomic description/room/price/date/photo changes; independent available-room and intake controls; visible edit conflict; mark one/all unavailable; reopen only explicit owner action; group state never closes listing; preserve accepted chats and unavailable shared cards under approved rule.
- Acceptance: unrelated owner's update denied; fail mid-update preserves old rows/photos; stale tab cannot overwrite later edit silently; removing one room updates range/count only; uncertain negotiation can keep inquiry intake open; all-unavailable stops new matching/inquiries; no inherited address access to a different property; old unreferenced photos cleaned via owned API.
- Evidence: two owners + requester/outsider, forced rollback, two-tab version conflict and partial-room browser flow.
- Excluded: arbitrary changes to approved 45-day expiry/three-distinct-report hiding; implement their recoverable transitions with D6/D7 tests. No redundant rented state contradicting room availability.

## SL05 — Save privately and express interest deliberately

- Depends on: SL03
- Readiness: packetized
- Release: pilot core
- Outcome: renter revisits saved apartments without unintentionally sending inquiry or exposing identity.
- Decisions: G1/G2; private save counts as unique current interest, approved Q20. Inspect/migrate existing coupled toggle without adding inquiry or identity disclosure.
- Ownership: existing favorites/interest hook/RPC and listing card/detail; save/interest tables/public counter projection.
- Tasks: define explicit difference between favorite, interest and inquiry; preserve existing data/migration compatibility; persistent saved view/map state; atomic idempotent toggle and correct public counter; unavailable saved card; account-only own saves.
- Acceptance: save survives sessions without inquiry; one unique current saver contributes one, unsave removes it, retries do not inflate; group wishlist cannot manufacture member saves; outsider cannot enumerate identities; ordinary user cannot set Pro/unblur; removed listing safe unavailable state.
- Evidence: two-account persistence, counter race/duplicate and public identity-withholding tests.
- Excluded: monetizing attention, arbitrary owner outreach, full group wishlist.

## SL06 — Request a viewing and open an authorized owner conversation

- Depends on: SL03, SL04, SL08
- Readiness: packetized
- Release: pilot core
- Outcome: renter submits persistent inquiry; owner accepts/declines; acceptance opens exactly one chat and correct address access.
- Decisions: F4/D4/H1/D18/B10/C7; lifecycle/address grants and specs/POSTER_OUTREACH.md.
- Ownership: lib/listings/inquiries, RequestViewing/InquiryActionButtons/ListingContact, chats inbox integration and inquiry RPC/grants.
- Tasks: add separately tested apartment-bound poster invitation under F4 with recipient acceptance, B10 identity, shared C7 quota and no saver identity access; guest sign-in return; requester/owner inbox states; input validation/duplicate policy; accept lock/recheck availability/block; atomically conversation+members+address grant; decline/retry/revocation effects; preserve personal-vs-listing conversation distinction.
- Acceptance: reload retains inquiry; owner-only accept; requester cannot self-accept; withdrawn/unavailable/blocked request not accepted; simultaneous/repeated accept one chat/grant; outsider direct API cannot read address; public listing still approximate after acceptance; group creation doesn't mark occupancy.
- Evidence: guest/requester/owner/outsider browser and direct-client checks plus concurrent/idempotent acceptance; exact cleanup.
- Excluded: off-platform handoff from imported cards under unchanged D0; group acting as landlord requester until specified.

## SL07 — Discover explainable compatible roommates

- Depends on: SL01, SL08
- Readiness: packetized
- Release: pilot core
- Outcome: resident sees plausible people, understands fit, sends trait introduction and receives accepted connection.
- Decisions: C1-C13/B9/H1/J1-J3; C3/C13 provisional baseline approved, C2 baseline now adopted; generate typed manifest; C5 gender filtering excluded and C10 no inactive-profile hiding. Complete scoring toward end of MVP.
- Ownership: discovery/DiscoverClient/PendingLikes, structured-profile validators, feed/scoring/introduction/pass RPCs.
- Tasks: consume approved normalized taxonomy; implement one deterministic scoring owner/version, coverage and explanation; eligibility excludes blocked/pass/prior states; stable pagination/ties; trait-target intro with optional message; quota 20/day and 30-day pass as already decided; acceptance atomic chat creation; distinguish public lifestyle score from private apartment suitability.
- Acceptance: worked examples/missing values exact; no score from one answer; cat allergy not treated as matching pet ownership; no private-budget leakage; pass persists/expires; concurrent quota final slot enforced; new/accepted intro count correct; retry doesn't duplicate chat; no silent paid strict filter.
- Evidence: scoring fixtures, SQL eligibility/quota cases and two-account introduction-to-chat journey.
- Excluded: ML, unapproved gender filter, Pro/boost, hidden assumptions from enum order.

## SL08 — Hold a reliable private text conversation

- Depends on: SL01
- Readiness: packetized
- Release: pilot core
- Outcome: accepted members see correct inbox and real persistent two-way messages through reconnect.
- Decisions: F1/F2/F5/F6/F8/H1; existing member/history semantics. Realtime/read/typing/reconnect defaults fixed in TECHNICAL_DEFAULTS; SL08.1 fixes reported unread independently.
- Ownership: chats page/ChatThread, inbox preview/message RPCs, Realtime hooks, conversation membership/history.
- Tasks: bounded history/cursor/unread; fix reported CHAT-UNREAD-001 with own-sender/read-marker cases; authenticated subscription/catch-up/dedupe; send idempotency/order; ephemeral authorized typing, real read receipts; approved leave hides/stops notification until explicit reopen; ordinary accepted fixture connections can seed testing without SL07 scoring rebuild.
- Acceptance: recipient sees delivery without reload, then reload persistence; reconnect fills gap once; double send/retry behavior deterministic; outsider and pre-join history denied; unread/read state survives two tabs; failed send recoverable; leaving stops future notifications under approved policy.
- Evidence: real two-browser delivery plus REST/Realtime authorization; SQL history boundary; no socket-joined-only success claim.
- Excluded: image messages, arbitrary unsolicited chat. Typing/read receipts are explicitly included F2; typing must not become a persistent message or unread event.

## SL09 — Form and manage a roommate group

- Depends on: SL01, SL08
- Readiness: packetized
- Release: pilot core
- Outcome: connected people consent to a group, set admission and meet new applicants without losing individual profiles/chats.
- Decisions: E1-E6/E9/H1; multi-group membership, no public derived budget, shared-block and consensual admin transfer/deletion fallback approved. Exact electorate/permission/UI details to verify.
- Ownership: groups GroupActions/GroupInvites, group Discover card, group invite/admission/membership/version RPCs.
- Tasks: consume existing send_introduction/accept_like baseline contract recorded in SL00, not completed future SL07 score; reuse accepted contacts; explicit invite acceptance/cap 4; approved admission/transfer/block rules; electorate version and join cutoff; public allowlist; private budget only; independent group visibility/chat; preserve multiple memberships.
- Acceptance: invited user not member before consent; simultaneous last-seat admissions cannot overfill; changed electorate invalidates stale votes as specified; newcomer cannot read earlier text/cards; blocked pair cannot enter/shared outputs follow approved rule; private individual chats remain; hidden group absent from Discover yet authorized chat works.
- Evidence: ordinary multi-account browser + SQL concurrency/electorate/outsider cases, cohort cleanup.
- Excluded: group-to-group, public budget inference, automatic lease signing or current-location claims.

## SL10 — Share apartments while hunting together

- Depends on: SL03, SL08, SL09
- Readiness: packetized
- Release: pilot core
- Outcome: renter shares an apartment card into an accepted personal/group chat and recipients discuss/open it.
- Decisions: E7/E8/F3/I19; approved chat listing cards with independent personal save, no shared wishlist; unavailable renderer honors public projection.
- Ownership: public listing share action, chat chooser/thread renderer, typed message reference payload/RPC.
- Tasks: choose current accepted chats; validate membership at send; persist listing ID, server resolves safe public card; each viewer's Save/Unsave affects only their personal saved state and G1 interest; no shared saves or bulk member saves; locale deep link and unavailable card; history unchanged.
- Acceptance: live card personal/group; no forged chat/private fields; retries one send; refresh preserved; newcomer cannot read old cards; A saves card→A saved/B unsaved/counter +1, B saves→+1, repeat card/save→no duplicate, unsave correct; unavailable/block policy holds.
- Evidence: two browsers and outsider payload tests; changed public listing refresh behavior.
- Excluded: external property cards under unchanged D0, collaborative wishlist and group landlord negotiation.

## SL11 — Fill a room without prematurely closing a group search

- Depends on: SL04, SL09, SL10
- Readiness: packetized
- Release: pilot core with optional outcome prompt
- Outcome: resident/group can keep looking for people or rooms while negotiations remain uncertain and explicitly report a found-home outcome.
- Decisions: D12/D18/E4/E10/A9; group visibility/self-report and room independence approved. No shared property ownership/link implied; resident owner can share own listing into group.
- Ownership: resident My Listings/group settings, approved link between apartment and group if introduced, outcome event.
- Tasks: preserve resident Room-Filler flow and share listing references; no new group-owned-apartment entity. Independent discoverability/room/intake, optional self-report; no automatic archive/occupancy from group or inquiry. Any actual group-property ownership change is later explicit scope.
- Acceptance: group formation leaves listing available; pause people discovery leaves chat usable; one member uncertainty allows owner to keep room inquiries; archive/reopen permission explicit; no shared listing ownership or exact-address grants inferred merely from membership.
- Evidence: lifecycle matrix examples across group/listing/chat plus explicit self-report analytics evidence.
- Excluded: automatic contract verification, ownership transfer, general shared wishlist unless separately approved.

## SL12 — Block, report and receive a real moderation response

- Depends on: SL01, SL08, SL09
- Readiness: packetized
- Release: pilot core
- Outcome: person escapes unwanted contact; report reaches owner-operated protected queue and action changes actual access.
- Decisions: H1-H7; protected manual review/categories/actions adopted; cohorts/reversal/group blocking in TECHNICAL_DEFAULTS and LIFECYCLE_AND_PRIVACY.
- Ownership: profile/Discover/chat/listing block/report actions, Settings blocked users, existing report/block tables and protected reviewer queue/actions/audit.
- Tasks: actor/subject validation; persistent report with idempotency; symmetric discovery/message denial; group case tested when groups present; reason-based hide/suspend; own report visibility without exposing reporter to subject; unblock outcome; no arbitrary reviewer UI access.
- Acceptance: both directions blocked via UI/direct clients/Realtime; pending invites/intros do not bypass; outsider/reported actor cannot read report; reviewer action persists with reason/audit and can be reversed under approved rule; unblocking not consent to re-send old notifications; user-supplied metadata cannot confer admin.
- Evidence: requester/subject/reviewer/outsider and shared-group scenarios; no invented daily SLA.
- Excluded: automatic permanent ban from unreviewed counter, full appeals platform or AI moderation.

## SL13 — Receive controllable message/inquiry notifications

- Depends on: SL06, SL08, SL12
- Readiness: packetized
- Release: pilot core; channel rollout gated
- Outcome: away recipient learns of an actionable event and returns to the right authorized place; can opt out.
- Decisions: L5/F7/I20/K2; NOTIFICATIONS_AND_MEASUREMENT; defaults/events/dispatch fixed in TECHNICAL_DEFAULTS; actual sender/device evidence pending.
- Ownership: settings notification preferences, event/outbox/dispatch, sender interface, service worker/manifest/push device binding if included.
- Tasks: inspect actual SMTP/transactional sender/secret names without values; separate global/per-user/event/channel/device states; transactional outbox, delivery idempotency/retry/lease/dead state; permission recheck; safe deep link; email first real test if configured, push requires real subscription evidence; no offline cache.
- Acceptance: main action survives sender failure; rollback emits nothing; blocked/left/deleted user suppressed on delayed retry; duplicate worker no duplicate logical delivery; master/event/channel off respected; no payload private details; second account cannot read/change prefs; logout/account switch cannot receive former user's push; actual configured channel delivery separately recorded.
- Evidence: mocked reliability tests plus authorized real recipient delivery and stop/restore/cleanup; platform/device limits explicit.
- Excluded: unsolicited marketing, new-listing matching alerts, claim email exists because Auth SMTP exists.

## SL14 — Exit an account safely

- Depends on: SL01, SL08, SL09, SL12
- Readiness: packetized
- Release: pilot core
- Outcome: user understands and requests account deletion without orphaning groups or exposing retained data.
- Decisions: B7/F6/E3/H3/M1/M2; deletion grace/shared-history/admin fallback product rules approved; legal retention detail, job/cancellation/authorization proof remain gates.
- Ownership: Settings deletion UI, server deactivation/purge job/progress, sessions/private data/Storage/shared objects and operator recovery.
- Tasks: explicit consequence/confirmation; immediate account effects; approved grace/cancel; consensual transfer/admin fallback; idempotent resource cleanup/retry/audit; retained shared messages under approved identity/retention rule; stop queued sending; no cross-owner cascade.
- Acceptance: ordinary user cannot delete another account; rejected transfer does not prevent deletion; another member's retained chat/data remains authorized; retries do not delete unrelated resources; cancellation and purge boundary match UI; revoked user cannot use stale session for sensitive actions; photos cleaned via correct API.
- Evidence: isolated fixture matrix/job failure recovery + remaining object counts; legal questions not declared answered by tests.
- Excluded: invented legal retention policy; T15 automatic inactivity hiding explicitly excluded C10.

## SL15 — Verify student-email control honestly

- Depends on: SL01, SL00
- Readiness: packetized
- Release: pilot core trust gate, included by owner Q5
- Outcome: eligible student verifies email and chooses whether public badge appears; others can still use product under approved intake.
- Decisions: B3/B4/B9/A6; domain list, OTP expiry/limits/reverify and sender proof needed, method already decided.
- Ownership: existing api/verify-student-email start/confirm, profile verification UI, private OTP storage/sender/domain registry and privileged verification update.
- Tasks: inspect existing routes before rebuilding; explicit approved BGU/Sami Shamoon domains, not every .ac.il indiscriminately; hashed expiring code; rate/retry/replay rules; private email; auto verification safe update; opt-in badge; sender failure recoverable.
- Acceptance: wrong/unapproved domain/code/expired/replayed request fail; concurrency no bypass; user cannot self-set verified; public profile reveals no student email; hide badge keeps verified private; real controlled-domain receive test if available or limitation blocks claimed completion.
- Evidence: ordinary-client authorization/OTP cases and actual authorized delivery; no ID or enrollment-validity claim beyond approved email mechanism.
- Excluded: mandatory student-only access unless A6 updated, ID/selfie/background checks.

## SL16 — Measure and operate the closed pilot

- Depends on: SL04, SL05, SL06, SL07, SL09, SL10, SL11, SL12, SL13, SL14, SL15
- Readiness: packetized
- Release: pilot integration gate
- Outcome: owner can demonstrate real journeys, recruit within approved access policy, see useful evidence and handle failures.
- Decisions: A9/A10/A11/J13/K3/K5/L3/L6/L7/M1-M5; scope, consent/access/capacity targets and operator responsibilities.
- Ownership: first-party event contracts/report, support/contact/policies, fixture/demo scripts, CI/acceptance and operational docs. Instrument source events in owning slices, not as a late retrofit.
- Tasks: define invite-only or controlled enrollment; label demo/QA/seed/organic cohorts; stable event IDs and exact denominators; repeatable two-account demo; execute TESTING workflow plus domain cases; quota/job/error visibility; backup/restore/forward recovery rehearsal; private policy/terms reviewed by appropriate owner; pilot-only release checklist.
- Acceptance: event counts match committed actions including retries/rollbacks; no private content in analytics; return metric excludes declared completed search; demo cleanly resets; source/backend/deployment versions distinguished; no global shared-config experiment; critical privacy failures block release; permissions/support and remaining limits visible.
- Evidence: dated acceptance command/counts and cleanup; funnel sample from labeled cohort; operator rehearsal and exact deployment mapping if deployed.
- Excluded: numeric funding guarantee, public-load claim from tiny pilot, replacing verified artifacts with a checklist.

## SL17 — Activate initial assisted native inventory

- Depends on: SL02, SL04, SL06
- Readiness: needs-decision
- Release: later operational preparation; owner Q3 defers, not MVP development blocker
- Outcome: initial publishers can approve useful inventory with little form-filling and real inquiry routing.
- Decisions: D0/F4/A10; owner-approval/claim workflow and temporary experiment plan needed. External-source card/scraper is not approved by unchanged D0.
- Ownership: operator-assisted draft creation/claim review, provenance/consent/freshness record, real owner activation and seed cohort labels.
- Tasks: draft privately from authorized publisher material; require price/photos/availability confirmation and real publisher account; activation only after ownership and inquiry receiver established; expiry/removal and sunset trigger; separate operator vs publisher powers.
- Acceptance: unclaimed/unapproved draft never masquerades as active native listing; publisher can correct/remove; inquiry reaches actual configured owner; no public private-contact details; seed metrics separate from organic; unrelated account cannot claim via guessed token.
- Evidence: consenting test publisher claim→activation→real request→reply; exact source/approval records and experiment end rule.
- Excluded: copying third-party personal data without resolved permission, external contact under unchanged in-app policy, fake owner accounts/traction.

## SL20 — Resident/lister Pro and business-map placement experiments

- Depends on: SL16
- Readiness: needs-decision
- Release: later
- Outcome: validated payer receives an explicitly chosen benefit without undermining the free search/contact loop.
- Decisions: G2-G6/M6; BUSINESS_MODEL hypotheses not approved entitlements/prices.
- Tasks: separately validate resident advanced preferences, professional-lister management and sponsored local business placements; consent-limited outreach; clear sponsorship label/separate map layer; choose billing/refund/cancel/tax/legal model; server-owned entitlements and verified webhook idempotency only after commercial approval.
- Acceptance: free basic search/safety still usable; payment cannot bypass blocks/address consent; subscription expiry/refund/replayed webhook correct; sponsorship not disguised as housing pin; billing tested in sandbox before authorized real charges.
- Evidence: actual willingness-to-pay experiment and approved entitlement matrix before implementation; no prototype paywall required.
- Excluded: assuming all three revenue models launch together or that interest means consent to unsolicited owner messaging.

## SL21 — Native clients after web validation

- Depends on: SL16
- Readiness: needs-decision
- Release: later
- Outcome: approved native client reuses stable data/auth contracts while providing native navigation/push behavior.
- Decisions: K1/K6/G3; mobile requirements/payment policies researched at implementation time.
- Tasks: define shared typed domain client, secure session/deep links, platform permission/privacy controls and store distribution; share contracts, not blindly web UI; replicate pilot journeys with real devices.
- Acceptance: permissions/history/block/address parity with web; auth recovery/push/deep links/background behavior; store/payment policy evidence; offline behavior explicit, never stale hidden inventory.
- Evidence: physical-device journeys plus server compatibility; no mobile readiness from web screenshot alone.

## SL22 — Furniture resale and apartment-attached items

- Depends on: SL04, SL08, SL12
- Readiness: needs-decision
- Release: later; owner Q4 explicitly defers apartment-attached items beyond MVP
- Outcome: leaving roommate offers clearly owned furniture; buyer contacts appropriate consenting seller inside product.
- Decisions: D15/D1/F3/H2; broader marketplace explicitly future.
- Tasks: settle apartment-attached vs independent items, seller identity/permissions, optional purchase/bundle price and sold/unavailable lifecycle; no shared ownership inferred from occupancy; safe media/contact and moderation; listing rented does not silently delete another seller's item.
- Acceptance: only seller/approved manager edits; private contact withheld; optional furniture cost not silently rent; sold item can't receive false availability; removal/moderation and retained conversation behavior specified.
- Evidence: actor/state matrix + two-party sale-contact scenario; no payments/escrow assumed.

## SL23 — Professional publishing/bulk inventory

- Depends on: SL04, SL12
- Readiness: needs-decision
- Release: later
- Outcome: legitimate multi-property operator manages authorized inventory without duplicates or unauthorized owners.
- Decisions: B10/D1/D11/G4/M6.
- Tasks: portfolio authorization, import preview/validate/commit, duplicate review and partial-failure report; structured authorized publisher imports distinct from third-party scraping; correct room/property identity.
- Acceptance: cross-account import denied; retries no duplicate inventory; invalid row never half-publishes; every active listing has owner/contact route and provenance.
- Evidence: bounded authorized test dataset, rollback/idempotency and owner checks.

## SL24 — Scale spatial queries and feed indexes

- Depends on: SL03, SL07, SL16
- Readiness: needs-research
- Release: later unless measured pilot constraint
- Outcome: target-size searches stay usable with measured query latency/payload and stable privacy.
- Decisions: J2-J8/K3; PostGIS only after approved need.
- Tasks: agree dataset/concurrency/latency budgets; query plans/indexes; viewport/keyset load; socket/channel plan; limit/cost monitoring; compatible rollout of changed projections.
- Acceptance: documented benchmark on agreed representative fixture set, stable paging/filters/privacy, no sensitive full-table client payload; actual capacity/billing terms refreshed.
- Evidence: reproducible query/load commands, p50/p95/payloads/connection counts and limitations; not inferred from indexes existing.

## SL25 — Broad public release and acquisition

- Depends on: SL16
- Readiness: needs-decision
- Release: later
- Outcome: a publicly accessible service has an approved operating/legal/capacity/recruiting plan.
- Decisions: L1-L7/K3-K5/M1-M6.
- Tasks: public access/abuse/terms/support/incident plan; domain/SEO public links; reliable supply/freshness and measured acquisition; operational staffing and budget; independent privacy/capacity gate; waitlist/referrals only if chosen.
- Acceptance: approved launch checklist with real evidence, current backend/deployment mapping, restore/response ownership, known legal research closed as required; no imported stock mistaken for organic traction.
- Evidence: explicit public-launch approval; pilot success alone does not authorize launch.

## SL26 — Relevant new-listing alerts and saved search

- Depends on: SL03, SL13, SL16
- Readiness: needs-decision
- Release: later area/saved-search monitor; explicitly nonessential for initial MVP after Q28
- Outcome: active searcher hears about a genuinely new relevant offer and can control frequency.
- Decisions: F7/L5/C4; new event and relevance/consent policy required.
- Tasks: private saved search, matching against newly visible room supply, event dedupe, configured digest/limit/unsubscribe; distinguish edit/reopen/new property; no sending to completed-search users by default.
- Acceptance: private budget never exposed in notification; irrelevant/replayed/restricted listing suppressed; opt-out/changed search applied before queued send; approved real sample reaches authorized recipient once.
- Evidence: relevance fixtures, outbox privacy/dedupe and real authorized delivery.

## SL27 — Media messages and scaled moderation

- Depends on: SL08, SL12
- Readiness: needs-decision
- Release: later
- Outcome: approved media can be shared without creating an unmoderated upload/private-data channel.
- Decisions: F3/H4/J9; text/listing cards remain initial scope.
- Tasks: choose allowed formats/size and ownership; private upload lifecycle, scan/review strategy, signed read access and retention; failed upload/retry cleanup; report media with authorized review access; automated moderation only when approved process/provider exists.
- Acceptance: outsider cannot read/upload another chat's media; spoofed file rejected; deletion/block/history boundaries apply; partial upload never becomes visible; retries/cleanup do not remove another owner's objects; reviewer access audited.
- Evidence: ordinary multi-party media/history/Storage checks and real supported file cases, not just thumbnail rendering.
- Excluded: enabling media before report/review/retention policy, generic public upload bucket.

## Completion and evidence register

This catalog describes intended work. For current implementation, inspect owning handoff and exact files; no slice gets a fabricated not-built/built label here. When implementation starts, create one handoff per owned outcome containing planning readiness, implementation state, checks, source/backend versions and independent integration/deployment state. PROJECT_STATUS links it; do not repeat unverifiable feature truth in a second seed table.
