# Remaining MVP execution packets

17 October 2026. Owner approved product/technical baseline; this describes local work, not completed behavior. Read [WORK_PLAN](WORK_PLAN.md), [protocol](EXECUTION_PROTOCOL.md), [initial packets](EXECUTION_PACKETS.md) and parent [SLICES](SLICES.md). Source of truth is DECISIONS.md. [packets.json](planning/packets.json) lists normative decisions/dependencies separately from context research. Parent readiness does not imply runtime completion.

20 October owner amendment: prioritize a demonstrable working core, especially group apartment sharing and individual/group owner contact. [implementation_plan.md](../implementation_plan.md) sequences one micro-task at a time: ordinary working journeys first, broader hardening afterwards. This is not a full-packet verification waiver. New approved F4/E8 scope is SL06.3 below, bringing the current manifest to 22 packets; the original slice catalog is preserved, with its old group-contact exclusion explicitly superseded by this amendment.

Every packet inherits: reconcile actual module/RPC/migration signatures before editing; preserve dirty work; use baseline local-target guard and exact synthetic fixture lifecycle from SL00.1/TESTING; validate syntax/type/build/targeted lint and affected database invariants, then ordinary-client browser/persistence/authorization. Real HE/EN phone and desktop checks apply to changed user journeys. Mocks, PGlite, static checks and live-provider/device delivery are labeled separately. Before finish record SHA/backend/migrations/commands/assertions/cleanup and update shared handoff; no commit/push/hosted migration/deployment implied. Existing verified behavior is reused.

Default disposable identities: ownerA,ownerB,residentA,residentB,outsider, later groupMember. Use exact generated IDs; remove owner Storage via Storage API before DB/auth cleanup and audit zero. Never probe real residents or run shared config quota changes. Each listed scenario is an assertion, not a test result.

## SL00.2 — Generate shared typed contracts without rebuilding app

- Parent/dependencies: SL00; SL00.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: J1, J2, J3, J4, J5, J6, J7, J10, J11, J12, J13, J14, C2. Context/release research: K3, J8.
- Module anchors: docs/specs/TAXONOMY.md; web/src/lib validators/config; existing generated database types and migration callers.
- Ordered work: Inventory existing schemas/functions and consumers; generate one typed taxonomy/locale/validation manifest from TAXONOMY, private/public allowlists and bounded config registry; preserve compatible adapters and test-only scoring reference. No speculative new entities for later business ideas.
- Required fixtures/assertions: Assert every31 category mapped exactly once, every enum label HE/EN present, missing vs none preserved, no new identity-intake fields, public registry has no secrets/private preferences, invalid config fails safely; test adapter compatibility and no duplicate appliance facts.
- Scope/stop: C2 semantic changes, undocumented migrations and global config edits excluded.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL01.2 — Complete resident profile and account journeys

- Parent/dependencies: SL01; SL00.2, SL01.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: B1, B2, B5, B6, B9, B10, C2, I9, I16, I19, I22. Context/release research: none specific beyond common target/release guard.
- Module anchors: web/src/app/login, auth/callback, onboarding, profile, settings; save_onboarding callers.
- Ordered work: Keep email/Google paths and safe return URLs; consume approved typed manifest, required name/age/photo/bio/clean/sleep/guests/smoking; save draft/reload, optional progressive facts and separate private preferences; selected badge visibility; choose startup preference and signout recovery; complete the B10 resident-to-lister Settings conversion and its explicit active-group refusal.
- Required fixtures/assertions: Guest deep link returns after real login; rejected external return; interrupted setup resumes; resident conversion requires phone/confirmation, removes only safe public social visibility and denies future social actions, preserves private fields/direct history, and refuses with zero mutation for an active group member; private DOB/phone/email/budget/preferences absent from other-account direct reads; 17/18 boundary with server clock; HE/EN390px/Desktop; real Google roundtrip distinct from static callback.
- Scope/stop: No native/Apple/ID collection or auth-provider rewrite.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL02.1 — Publish located apartment with rooms

- Parent/dependencies: SL02; SL01.2. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: D1, D2, D3, D4, D5, D9, D19, A5, J9, I4, I21. Context/release research: K3.
- Module anchors: web/src/app/compose and lib/listings; address API/provider adapter; publish_apartment and owned Storage.
- Ordered work: Preserve overlay origin/draft; signed provider selection and honest manual confirmation; approved property fields and available rooms; compress3–8 owned images; validate full model and atomic request-key publish; success links actual ID.
- Required fixtures/assertions: OwnerA publishes rooms2000/2600, reload verifies price/count/date; OwnerB cannot reuse A upload; corrupt photo recoverable; midway DB failure leaves no partial public apartment; repeated key one listing; valid TelAviv not rejected; address edit invalidates selection; mocked timeout/429/manual path plus separately recorded real-provider suite.
- Scope/stop: Provider key/terms unverified blocks only live lookup acceptance; no public Nominatim or hosted mutations.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL03.1 — Browse safe map/list/details

- Parent/dependencies: SL03; SL02.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: D4, D5, D9, D13, D14, D17, A5, J2, J6, J15. Context/release research: K3.
- Module anchors: web/src/app/map and lib/listings public projections; LeafletMap/FilterBar; listing detail/metadata.
- Ordered work: Use bounded public viewport and explicit Search this area, correct same-room filters, selected-ID sync and accessible cluster chooser; private personal save overlay; safe SSR detail/metadata; plan persisted-random privacy migration locally before replacing deterministic transform.
- Required fixtures/assertions: Rooms2000/2600 and filter2300–2400 must not match; available_by uses <=; cluster children reachable at maxzoom; map/list selection agrees; guest and outsider JSON/metadata/cache never exact coordinates/address/contact; unavailable/unknown listing safe404; synthetic inversion/averaging test, no real residents; HE/EN phone attribution.
- Scope/stop: No tile restyle or fetch-all; synthetic privacy evidence and target migration review mandatory before release.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL04.1 — Manage rooms, edits and renewal

- Parent/dependencies: SL04; SL02.1, SL03.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: D2, D3, D4, D5, D6, D7, D9, D16, D18. Context/release research: none specific beyond common target/release guard.
- Module anchors: my-listings, composer editor/lib/listings validators and room/update RPC.
- Ordered work: Reuse full-model validation; expected revision prevents stale overwrite; independent room availability/intake;45day expiry/explicit renewal; preserve accepted chat; partial/all unavailable and explicit reopen; private owned-photo cleanup; prohibit property substitution.
- Required fixtures/assertions: A/B ownership denial; two-tab conflict; forced rollback preserves rows/photo refs; remove one room updates range;44/45day expiry; ordinary edit not renewal; group creation changes no room; reopening pending requires requester reconfirm; same user cannot overwrite another listing.
- Scope/stop: Report submission/reviewer UI in SL12; implement compatible renewal cohort columns without duplicating report authority.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL05.1 — Persist private personal saves and honest count

- Parent/dependencies: SL05; SL03.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: G1, G2, G6. Context/release research: none specific beyond common target/release guard.
- Module anchors: existing favorites/interest hook/RPC, listing cards/details/saved view.
- Ordered work: Separate save from inquiry; enforce unique active actor/listing relation and indexed aggregate; own state on map/detail/chat consistent; unsave/retry/removed listing behavior; migrate coupled legacy behavior compatibly.
- Required fixtures/assertions: A saves once across two cards/retries ->count+1; B adds ->+2; A unsaves ->+1; no inquiry generated; owner/outsider cannot enumerate savers or infer identity from API; unavailable saved card honest; no Pro bypass.
- Scope/stop: No separate group wishlist or interested-person list.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL08.2 — Finish chat read receipts, typing and leave semantics

- Parent/dependencies: SL08; SL01.2, SL08.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: F1, F2, F3, F5, F6, F8, H1. Context/release research: J8, K3.
- Module anchors: ChatThread/inbox/hooks; message/read membership RPC and private channels.
- Ordered work: Preserve corrected unread; bounded history/server sequence/request-key send; authenticated active thread/account signal subscriptions; receipts and5s ephemeral typing; leave hides/stops notifications until explicit reopen; reconnect catch-up.
- Required fixtures/assertions: Two ordinary browsers see live messages then reload persistence; out-of-order/double delivery one copy; outsider/prejoin forbidden; stale auth/block revocation across data paths; typing not unread and expires5s; two-tab marker monotonic; leave/new incoming no auto return; reopen restores only permitted history.
- Scope/stop: No image/edit/delete-for-all or unsolicited chat.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL06.1 — Renter inquiry to accepted apartment conversation

- Parent/dependencies: SL06; SL03.1, SL04.1, SL08.2. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: F4, D4, H1, D18, H7. Context/release research: none specific beyond common target/release guard.
- Module anchors: lib/listings/inquiries and contact controls; create/accept inquiry RPC/address grants.
- Ordered work: Guest-safe auth return; one pending inquiry per requester/listing context with optional room; owner accept/decline; recheck availability/block under lock, atomic conversation/members/address grant; unavailable/reconfirm and accepted-chat persistence.
- Required fixtures/assertions: Guest/requester/owner/outsider; requester cannot self-accept; same/racing accept one conversation/grant; cannot accept withdrawn/blocked/needs_reconfirmation; private address absent before and present only authorized after; unavailable room not reservation; no arbitrary owner revoke.
- Scope/stop: Do not infer lease or group ownership from inquiry acceptance.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL06.2 — Poster invites a person with own apartment

- Parent/dependencies: SL06; SL06.1, SL01.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: B10, C7, D4, D16, F4, G1, G2, H1, I19. Context/release research: none specific beyond common target/release guard.
- Module anchors: docs/specs/POSTER_OUTREACH.md; discovery person CTA/pending requests and apartment context RPC.
- Ordered work: Implement full POSTER_OUTREACH transaction/capability contract as separate request kind; short poster identity, own active property choice, private optional opening note, accept/decline/report/block, shared20/day quota; reuse existing accepted apartment conversation. Treat a freshly onboarded poster and a B10-converted poster identically after server capability checks.
- Required fixtures/assertions: Account-only and converted poster can browse and invite; recipient accepts before chat/grant; own listing check;19/20/21 concurrent invitation limit; no saver list/contact leak; missing/unavailable property fails; pending send not message; repeated key/racing accept one result; canceled/reopened recipient reconfirm.
- Scope/stop: No unlimited landlord direct-message privilege, no profile enrollment merely from browsing.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL06.3 — Unanimous group inquiry to apartment owner

- Parent/dependencies: SL06; SL06.1, SL09.1, SL10.1. Required artifacts: individual inquiry/owner acceptance, revisioned group membership, shared native listing card and authenticated conversation. No dependency on reverse poster outreach or final matching score.
- Required decisions: F4, E8, E3, D4, D18, H1, F1, F3. Context/release research: none specific beyond common target/release guard.
- Module anchors: docs/specs/GROUP_LISTING_INQUIRIES.md; group shared card, consent progress, owner inbox, group inquiry/accept RPC and apartment-context conversation/address grants.
- Ordered work: group/listing consent round bound to membership revision; caller-only approval; unanimity atomically sends one owner-facing inquiry; owner accepts into a separate owner-plus-consenting-members conversation. Keep personal inquiries and the roommate-only chat independent. Each current member must consent; admin/majority is insufficient.
- Required fixtures/assertions: two roommates plus owner; first vote means no owner request/notification, last vote sends one; owner acceptance creates one distinct conversation and individually authorized grants; owner cannot read roommate-only history; changed membership invalidates pending consent, newcomer has no inherited chat/address; repeated/racing vote or accept creates one result; block/unavailable/withdraw/reconfirm rules hold.
- Scope/stop: ordinary working journey first under implementation_plan; race/revocation/failure-injection evidence afterwards before full verified status. No reservation, automatic occupancy, shared property ownership, automatic new-member grants or group-to-group feature.
- Deliverable: actual changed source/migration map, ordinary scenario and separate hardening results; no implementation or completion claim from this planning amendment.

## SL09.1 — Form and operate consent-based roommate group

- Parent/dependencies: SL09; SL01.2, SL08.2. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: E1, E2, E3, E4, E5, E6, E9, E10, H1. Context/release research: none specific beyond common target/release guard.
- Module anchors: group creation/invitation/config/admission RPC; Discover groups and group chat.
- Ordered work: Multiple groups permitted, capacity4; explicit invited-member acceptance; approved admission votes with membership/electorate revision; join history cutoff; independent discoverability/chat, owner transfer acceptance7day expiry, last-member archive/deletion fallback.
- Required fixtures/assertions: Not member before accept; concurrent last-seat admission cannot overfill; changed electorate invalidates stale votes; newcomer no old messages/cards; blocked pair admission denied; private budget never derived public; hiding group preserves permitted chat; transfer refusal cannot block account deletion.
- Scope/stop: Use baseline approved intros/fixtures; no dependency on completed matching score.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL10.1 — Share native apartment cards in chats

- Parent/dependencies: SL10; SL03.1, SL08.2, SL09.1, SL05.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: E7, E8, F3, G1, H1. Context/release research: none specific beyond common target/release guard.
- Module anchors: listing share chooser/message-card renderer, send-message card validation.
- Ordered work: Reference public listing ID, safe dynamic public projection and personal save state; allow personal/group conversations only with current history/member rights; inaccessible/removed card has honest fallback.
- Required fixtures/assertions: Share to A/B and group ->one message not auto-save; A/B independently save/unsave count exact; repeated card save idempotent; outsider/prejoin cannot read card/history; no exact address snapshot; listing unavailable updates rendering; HE/EN deep link correct.
- Scope/stop: No group wishlist entity or outside-app handoff.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL11.1 — Keep group search and property lifecycle independent

- Parent/dependencies: SL11; SL04.1, SL09.1, SL10.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: D18, E4, E10, F4. Context/release research: none specific beyond common target/release guard.
- Module anchors: room management, group discovery settings, outcome UI and pending inquiry state.
- Ordered work: Optional found-place outcome; separate group hidden/discoverable, room availability and inquiry intake; preserve accepted conversations, pending reconfirm on reopen; never use group creation as lease event.
- Required fixtures/assertions: Create group ->room unchanged; group found place but still accepts members if chosen; pause inquiry without marking room unavailable; reopen request cannot be accepted before sender reconfirms; member uncertainty not forced closure; investor outcome labeled self-reported.
- Scope/stop: No lease-signing or co-ownership system.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL12.1 — Block/report with protected operator actions

- Parent/dependencies: SL12; SL01.2, SL08.2, SL09.1, SL04.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: H1, H2, H3, H4, H5, H6, H7, D7, D10. Context/release research: none specific beyond common target/release guard.
- Module anchors: profile/chat/listing report/block controls, report queue/reviewer authorization/RLS/audit.
- Ordered work: Implement typed reasons, minimal evidence and private receipt; three distinct taken-report cohort hides/notifies/renews; manual reviewer sanctions dominate; hide/suspend/reverse reason audited; symmetric shared-group block and recovery explained.
- Required fixtures/assertions: Nonreviewer direct API cannot queue/read reporter/evidence or sanction; scam reports do not increment taken threshold;3distinct hide not3duplicates; renewal old cohort no rehide, fresh cohort can; false-report reversal audited; both blocked parties lose shared-group data while others retain; unblock normal history restores; stale socket cannot leak.
- Scope/stop: No AI moderation, guaranteed SLA or permanent automatic ban by count.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL13.1 — Deliver opt-out transactional notifications

- Parent/dependencies: SL13; SL06.2, SL06.3, SL08.2, SL12.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: F7, L5, I20, K2, J13. Context/release research: K3, J8.
- Module anchors: settings/outbox worker, sender adapter, manifest/service-worker subscription binding.
- Ordered work: Emit event/outbox atomically; event/master/channel switches and preserve existing-off; lease/retry/dedupe30s heartbeat60s bursts per TECHNICAL_DEFAULTS; email safe locale deep link, supported opt-in push; suppression at actual send.
- Required fixtures/assertions: Action rollback ->no event; provider fails ->message persists; concurrent worker same logical delivery; block/leave/delete/master-off before retry ->no send; recipient reading ->no duplicate email; signout/account switch detaches endpoint; actual permitted email/push tested separately from mock; no content/address in payload.
- Scope/stop: No area-monitor alerts, arbitrary messaging or unapproved provider spend.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL14.1 — Account exit with recoverable cleanup

- Parent/dependencies: SL14; SL01.2, SL08.2, SL09.1, SL12.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: B7, F6, E3, H3, J12. Context/release research: M1, M2.
- Module anchors: settings account deletion, authorization guard, phased purge job and owned Storage.
- Ordered work: Immediate deactivation/hide/revoke,30day cancel grace,7day consensual transfer where relevant; deterministic archive fallback; checkpoint/lease/retry owner-scoped deletion and tombstone; other members' permitted shared history preserved.
- Required fixtures/assertions: 29/30day cancellation boundary; rejected transfer not hostage; stale token denied; retry after partial Storage deletion idempotent; other owner data untouched; no automatic grant/listing revival on cancel; shared messages keep removed identity according to reviewed retention; audit fixture residuals.
- Scope/stop: Real-data legal retention/redaction release gate; local synthetic cleanup implementation may proceed, no production purging.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL15.1 — Real optional student verification

- Parent/dependencies: SL15; SL01.2, SL00.2. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: B3, B4, B9. Context/release research: K3.
- Module anchors: student-email challenge endpoint/private challenge store/mail adapter/badge settings.
- Ordered work: Exact approved BGU/SamiShamoon domains verified from official sources before enabling; signed or hashed one-use challenge24h, resend cooldown60s max5/day account, expire after5failed attempts; token account/email bound; verified state server-only, badge opt-in.
- Required fixtures/assertions: Lookalike/subdomain not automatically accepted; token wrong account/email/expired/reused rejected; email change clears badge/challenge; client cannot set verified; public badge only when chosen; actual authorized student-email test distinguished from local mail-catcher.
- Scope/stop: Student status not condition for alladult access; no ID/selfie/property-ownership verification implied.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL07.1 — Finalize deterministic matching and introduction loop

- Parent/dependencies: SL07; SL01.2, SL08.2. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, C13, B9, J1, J2, J3. Context/release research: none specific beyond common target/release guard.
- Module anchors: Discover feeds/PendingLikes, versioned SQL scoring and reference fixtures.
- Ordered work: Use approved typed TAXONOMY, preferred/accepted directions and12factors weight15;3factor/weight6 threshold; group minimum with everymember coverage; server eligibility/pass/quota, fixed cursor; trait introduction and atomic acceptance into chat; no inactive-user hiding. Respect B10 conversion: lister capability excludes the account from public resident projections and all new resident matching actions.
- Required fixtures/assertions: 57percent4/7 example; oneanswer no percent; unknown opposite prefs excluded; multi-select/kitchen min once; pet mismatch notice and optional strict constraints; no gender/absence score/private budget leak;30day pass;20/day race shared with poster invitations; stale cursor explicit refresh; group incomplete no fabricated score.
- Scope/stop: No ML/payment/boosts or changing question meaning/weights under wording polish.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## SL16.1 — Pilot acceptance, honest demonstration and operations

- Parent/dependencies: SL16; SL04.1, SL05.1, SL06.2, SL06.3, SL07.1, SL09.1, SL10.1, SL11.1, SL12.1, SL13.1, SL14.1, SL15.1. Required artifacts are completed predecessor packet handoffs/contracts, not just their ready labels.
- Required decisions: A9, A10, A11, J13, K5, L7, M3. Context/release research: K3, M1, M2, M5.
- Module anchors: docs/TESTING.md acceptance suites, firstparty event report, operator runbook, deployment mapping.
- Ordered work: Ordinary signup limited marketing, no invitation platform; run full pilot proof journeys against named isolated target, labels QA/demo/pilot; sourceevent denominators, D1/D7 returns and7day reply cohorts; operator sanction/outbox/deletion recovery and restore rehearsal; explicit hosted release authorization remains separate.
- Required fixtures/assertions: All apartment/people/group/outreach/notification journeys HE/EN390px+desktop; ordinary-owner/recipient/outsider negative permissions; event counts equal committed nonQA actions after retry; cleanup zero; no source/build/live conflation; report support/capacity/legal gaps honestly; demonstrate useful interaction not guaranteed funding.
- Scope/stop: No broad public launch until actual legal/provider/capacity/restore gates pass; no fake traction.
- Deliverable: narrow missing implementation or evidence-only no-change result; local compatibility migration if needed; affected checks and visible outcome; limitations and next packet in workstream handoff. Unmet provider/legal gate prevents release, not unrelated approved local work.

## Pilot dispatch gate

Every required parent SL00–SL16 has a local packet path. SL17 assisted-supply operations and SL20+ future features remain deferred envelopes, not ready work. Pick only a packet whose predecessor artifacts actually exist; do not launch all ready labels simultaneously. Shared schema/config/API changes have one owner at a time. SL07 scoring refinement can be scheduled late while baseline discovery/group fixtures are preserved. SL16 is integration verification, never a substitute for each packet's own checks.
