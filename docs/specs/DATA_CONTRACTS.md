# Data, API and rollout blueprint

State: 17 October technical delegation adopted; J1-J7/J10-J14/K5 closed. Exact mechanics in [TECHNICAL_DEFAULTS](TECHNICAL_DEFAULTS.md) and [POSTER_OUTREACH](POSTER_OUTREACH.md). J8/K3 capacity remains research, C2 taxonomy baseline adopted. Implementation snapshot updated 20 October 2026: canonical resident storage/APIs and sequence-read/retry-safe chat are implemented and deployed as detailed below. Other proposed contracts remain distinguishable from current APIs; this document itself applies no migration.

## Entity and disclosure boundaries (J1)

| Domain | Identity / relationships | Public projection | Private/privileged data |
| --- | --- | --- | --- |
| Account/auth | Stable auth user ID; one account with residency intake | No auth user/email object | Sessions, credentials, recovery, suspensions |
| Resident | One account profile; canonical `profile_lifestyle` and owner-private companion | First name + last initial, photo, age, bio, explicitly disclosed canonical facts, selected verified badges | Full name, DOB, email/student email/phone, budget/date, preferences and disclosure-selection metadata |
| Taxonomy | Versioned category/field/option IDs; 31 source headings | Approved labels/icons/public disclosed values | Personal search preferences and nonpublic inputs |
| Apartment | One owner account; available-room children | ID, title, price/count, safe area, approximate point, approved facts/photos | Exact address/coords, contact, private provenance/location version |
| Room | Apartment parent, stable ID, price/date/availability | Only as apartment-owned available room, never independent feed entity | Owner edit history/internal negotiation state |
| Save/interest | Actor + apartment with explicit semantics | Aggregate allowed count only | Saver/interested identity unless explicitly authorized; own save state |
| Introduction/pass | Actor + individual/group target; one target type | No public list of private interactions | State/quota/time/trait snapshot; pass expiry |
| Group | Admin, current members, admission policy/version | Safe derived member card; no inferred private budget | Votes/invites/membership history/private group search preference |
| Conversation | Kind/member links; monotonic sequence boundary | None | Messages/card refs, membership/history cutoff, read markers |
| Listing inquiry | Individual requester or unanimously consenting group + apartment owner/listing | None | Consent round/membership revision, state, accepted conversation and per-person grants; individual/group contexts stay distinct |
| Address grant | Accepted inquiry + requester + listing/location version | None | Revocable precise-location reads under approved lifecycle |
| Report/action | Reporter + subject/object + protected reviewer action | No reporter/content leakage | Reasons, evidence, audit, restriction/reversal |
| Notification | Event→recipient/channel delivery; optional device subscription | None | Preferences, endpoint credentials, sender/outbox state |
| Pilot event | Stable event ID, cohort and approved object refs | Aggregated authorized report only | Pseudonymous actor, timestamps; no content/contact/exact location |

Do not duplicate auth identity across resident/lister personas or make social group membership the owner of someone's profile. Resident/lister is one account's server-authorized capability state: B10 permits only the explicit resident-to-lister Settings transition, with private data retained and active-group membership a refusal condition. A group is not an apartment; group maximum four (E2) is not maximum apartment tenants. A room is not a standalone listing. A subscription is not a permission to bypass privacy.

## Implemented profile and chat contracts — 20 October 2026

Application source `39fdcee` includes canonical profiles; `95f333b` introduced sequence read markers/retry-safe chat and typed taxonomy contracts. The [canonical workstream](../workstreams/2026-10-19-sl01-canonical-profile.md) records source/deployment/verification separately: Final release `2877c38a21e2b183805451a265354a19aa64faf2` is READY in Production deployment `dpl_CmU7JB992cBpTMvRf4DivtAcHZGA`. Fresh20October Production browser acceptance9/9 tested39fdcee application code;2877c38 changes only documentation/test harness and has no app/schema diff. The [consolidated release](../releases/2026-10-20-profiles-chat.md) records the final domain mapping and3 post-release HTTP checks. The full interactive Google account/provider roundtrip remains unexecuted; canonical functionality being live does not close that SL01.2 assertion. These are recorded checks, not a claim that every proposal in this blueprint is implemented.

| Reviewed source migration | Recorded live version on `npbduvjnqnbydolmdpsc` | Implemented boundary |
| --- | --- | --- |
| `20261019210659_monotonic_chat_read_markers.sql` | `20261019211840` | Sequence read marker, compatible inbox summary, retry-safe send |
| `20261019212059_resident_adult_validation.sql` | `20261019212312` | Server-clock adulthood and direct private-DOB guard |
| `20261019214904_canonical_resident_profiles.sql` | `20261019215717` | Canonical storage, resident/lister save APIs, private names, disclosure and photo guards |
| `20261019215827_allow_incomplete_intake_correction.sql` | `20261019215905` | Intake branch correction before completion; completed/converted lister cannot regain resident capability |

Local filename timestamps and live versions differ because reviewed SQL was applied through the connected migration tool. Read actual history before applying anything; do not reapply a source file merely because its timestamp is absent from live history.

### Canonical profile storage and writes

- `profiles` retains legacy CHECK-constrained columns for compatibility; their meanings are not widened or silently reinterpreted. `profiles.name` stores the server-derived first name and last initial. `profile_private.full_name` retains the complete owner name; new lister completion with explicit confirmation stamps owner-private `adult_confirmed_at`. Existing demos and conversion do not receive invented declarations.
- `profile_lifestyle` contains `profile_id`, server taxonomy version 1, category-validated canonical `facts` JSONB, `disclosed_fields` text array, revision and timestamp. `profile_lifestyle_private` contains validated private preferences. Both tables allow only owner reads and RPC writes. JSON CHECK validators use the exact manifest enum/set definitions; this is bounded category-specific data, not arbitrary tags. `profile_save_requests` is an RLS-protected function-only tombstone table, with no client read/write grant: owner/request key, operation-specific SHA256 payload hash and response.
- `save_resident_profile(p_name,p_birth_date,p_phone,p_bio,p_facts,p_preferences,p_disclosed_fields,p_complete,p_expected_revision,p_request_key)` returns JSON `{revision,onboarded}`. It locks the caller's profile, validates inputs at the database boundary, compares revision and commits profile/private/fact/preference/disclosure writes atomically. Missing row means revision 0. Exact request-key/payload retry returns the saved response; changed payload or stale revision conflicts. Drafts may be incomplete; completion and completed-resident edits require adult DOB by server date, nonblank name/bio, cleanliness/sleep/guests/smoking and an actual caller-owned Storage object referenced by the gallery. Draft-save flags cannot de-onboard a completed resident.
- `save_lister_profile(p_name,p_phone,p_agency,p_expected_revision,p_request_key)` returns `{revision}` and requires an already completed lister. It validates bounded name/phone/agency, keeps the full name private, uses the same lock/revision/tombstone mechanism and changes only revision metadata in existing lifestyle storage. Converted residents retain facts, preferences and disclosure privately; no reverse capability conversion occurs.
- The eight-argument `save_onboarding` remains available: legacy resident answers use conservative exact-meaning adapters and cannot bypass I9 completion. No identity-answer or disclosure inference occurs. New lister completion requires `p_tags.adult_confirmed=true`; incomplete intake choice is reversible. `convert_to_lister` retains its active-group refusal and private-data preservation. Direct `profiles.mode/onboarded/name/bio/photo_url` and legacy identity/trait writes are not granted; existing settings opt-ins and bounded private-contact edits retain their intended grants. Direct completed-resident DOB edits are still checked for adulthood, and completed-lister phone edits cannot clear the required contact.

### Public disclosure and photo authority

`profiles_public.lifestyle_facts` contains only canonical fact keys consciously listed by that owner. It never returns private preferences, disclosure-selection metadata, full name or exact DOB/contact/budget. Legacy public lifestyle/identity columns remain in the compatible row shape but return NULL. `discover_individuals` returns that view type; `discover_groups` serializes the same safe member projection. Canonical trait introductions accept an exact `profileUUID:canonical.field:option` reference only for a currently disclosed enum/set value belonging to the individual or a member of the target group, with existing eligibility/block/quota checks retained.

`profile_photos` supplies the authoritative primary URL through `sync_primary_profile_photo`. New/changed gallery URLs require the exact configured public Storage origin, `profile-photos` bucket, caller UUID path and matching object `owner_id`; an arbitrary nonempty URL is insufficient. Gallery deletion cannot remove the last owned photo of a completed canonical resident. Referenced Storage objects are protected until their gallery reference is safely removed; ordinary secondary removal uses gallery-row first, then Storage API removal. Public gallery rows contain photo identifiers/URL/order, not full names/preferences. These checks establish object metadata ownership/existence, not server-side image decoding. The isolated real Storage test additionally verified that a denied last-object removal preserved cache-busted exact PNG bytes (500/P0001 denial, subsequent GET 200).

### Chat sequence and retry APIs

`conversation_members.last_read_seq` is server-owned. `mark_conversation_read(p_conversation_id,p_through_seq)` returns the monotonic marker after authorization, history-boundary enforcement and clamping to an actually readable sequence; stale tabs cannot regress it and forged future values cannot mark future messages read. Inbox unread excludes own and system messages and uses `max(visible_after_seq,last_read_seq)`. Legacy timestamp storage remains compatible but no longer drives unread counts. The client acknowledges only rendered messages while the thread is visible and focused.

`send_chat_message(p_conversation_id,p_body,p_request_key)` returns the persisted message row as a set-returning RPC. Membership/history/block checks remain authoritative; body is bounded 1–2000 after trimming. A unique `(conversation_id,sender_id,request_key)` prevents duplicates, identical retries return the existing row, and changed-body reuse conflicts. Realtime remains an invalidation/delivery signal: reconnect fetches persisted sequence history and deduplicates messages. These changes do not claim SL08.2 typing, broader rate-limit work or a universal cursor-envelope rollout.

### Verified evidence and remaining adoption

The linked workstream records 53 disposable SQL manifest-option checks, 20 contract/selector tests, real canonical ordinary-client acceptance (9 scenario groups), real individual/group disclosure checks, server-date 18-year boundary with original DOB restored, and the isolated physical-photo guard. Production 20 October browser checks re-exercised editor/startup/signout, unread/reconnect/retry and guest/callback safety; dedicated original onboarding/discovery checks are separately dated in the handoff. All useful synthetic demos were retained, not reported as cleaned.

The resident questionnaire/editor now consumes the manifest. Apartment validators/labels, appliance/bills adapters and the scoring oracle exist in `web/src/lib/contracts`, but that does not certify full apartment composer/storage adoption or production C13 scoring; those remain successor packets. `config.ts` provides bounded consumer fallbacks/public allowlisting, not completed protected config persistence. Existing hosted `app_config` history is not fully represented in source; do not recreate it or edit global values based on this registry. A known non-authorization limitation is client UTF-16 versus server Unicode-character text-length counting; UI rejects some emoji-heavy inputs the server accepts.

## API compatibility and proposed read contracts (J2/J3/J7)

Reuse existing RPCs discovered in local source (`save_onboarding`, `save_resident_profile`, `save_lister_profile`, `mark_conversation_read`, `send_chat_message`, `publish_apartment`, `get_public_listing`, `send_introduction`, `accept_like`, `pass_discovery`, `discover_individuals`, `discover_groups`, `list_chat_inbox`, `create_listing_inquiry`, `accept_listing_inquiry`, group invite/admission/configuration functions). Do not rename/recreate them from this list without checking the current live signature and callers.

Proposed read envelope: `{items, next_cursor, has_more, projection_version}`; validate capped page size and opaque cursor. Scored feeds also include `scoring_version`/coverage. Cursor binds query/filter/version context; invalid/obsolete cursor returns explicit restart instruction. Sort keys include unique tie-break; no unbounded prior-ID arrays in URL.

Map pins: public projection filtered on approved approximate location semantics; separate detail query. Private favorites are user-scoped overlay, not a shared cached response. Individual/group feeds: exclude disallowed relationships before projection and score. Inbox: one bounded preview/unread summary per authorized conversation, never load entire histories to build it. Messages: sequence cursor, visible_after_seq/history rule and current access checked for every page.

Proposed stable error meanings: unauthenticated, forbidden/not-found as privacy requires, validation(field/code), state-conflict(current version), unavailable, quota(retry time), provider-unavailable, internal(recovery reference). Map them to localized UI, not raw SQL/stack text. Do not disclose existence of private objects by distinguishing unauthorized from missing.

## Remaining cross-domain atomic-write requirements

- Publish/update apartment and rooms: transaction; owner check; version comparison; stable request key; photos referenced only after valid ownership check. Failed transaction must not leave public partial inventory.
- Accept intro/inquiry: lock affected request and relevant conversation/capacity; recheck block/availability/member state; unique relationship/conversation guard; same logical retry returns existing outcome.
- Group apartment inquiry (F4/E8, owner update 20 October): [GROUP_LISTING_INQUIRIES](GROUP_LISTING_INQUIRIES.md) defines caller-only consent, current-membership unanimity before dispatch and owner acceptance into a separate apartment conversation. No owner access to roommate-only chat and no automatic newcomer address/history inheritance. Proposed new APIs are not existing implementation.
- Group membership: capacity and electorate version checked under lock; invitation acceptance is explicit; membership version changes invalidate stale votes as approved; join cutoff set atomically with membership.
- Quotas: server clock and approved day/timezone; atomic count/consumption including accepted sent intros; concurrent last allowed send cannot overrun. Do not refund quota for deletion/retry unless policy explicitly allows it.
- Send message: the sequence/request-key implementation is recorded above. A minimal outbox transaction is a separate requirement if an outbox is enabled; do not infer one from retry-safe sending.
- Owner actions require current identity/ownership; never accept client owner ID/is_verified/is_pro as authority. Reviewer identity comes from a protected authorization source, not user-editable metadata.

## Query/index and scale proposal (J4-J6/J8/K3)

Approve indexes against actual query plans, not every column: listing public-state/filter path; rooms by apartment+availability+price/date; intro sender/target/state/time; passes sender+target+expiry; memberships user+conversation/group; messages conversation+sequence; inquiry owner/requester/listing/state; outbox status+next attempt.

Prefer unique constraints as invariants and transaction-aware counts before trigger-maintained aggregate complexity. Counter optimization needs measured baseline, repair/reconciliation path and duplicate-write semantics. Spatial indexing/PostGIS only if approved workload/query demonstrates benefit; one-city marketing focus does not by itself mandate or prohibit an extension.

Realtime plan: authorized subscriptions, mounted active-thread channels, inbox refresh/event strategy, reconnect catch-up and dedupe. Measure peak connections/messages against actual current plan limits; do not assume one channel for every historical chat. Never claim a socket proves message persistence or access correctness.

## Cache and configuration proposal (J10/T19)

MVP public map/detail and authenticated data are no-store under J10. Future public-only cache needs measured justification and invalidation tests. Personalized favorites/score/permission/private address are not public cache entries. Authentication responses/cookie rotation must not be shared cached.

Business config: typed bounded registry with version, description, explicit `is_public=false` default, protected writes/audit and validated consumer fallbacks. Existing mvp_limits compatibility preserved until all consumers migrated. Do not globally edit introduction quotas on a shared DB just because a frontend uses Preview. Avoid dynamically mutable structural invariants that could corrupt stored relationships. Heuristic literal scans supplement tests; they cannot prove behavior parity.

## Rollout/recovery (J11/J12/K5)

1. Identify target ref/URL and current migration history before writes; reconcile branch-local missing files with already-applied history.
2. Add compatible schema/functions; review grants/RLS/public projections/privileged functions together. A fresh table is not safe just because RLS is enabled if grants/functions leak fields.
3. Verify ordinary-client old/new app compatibility; record changed function signatures and expansion/backfill plan. No direct irreversible rename/drop while old deployment serves traffic.
4. Apply only under explicit authorized target action; record migration version/checks; deploy named source separately.
5. Verify actual deployment/backend and permission behavior; rollback app only if schema backward-compatible, otherwise approved forward fix. Preserve user data and audit; never run blanket reset on a shared MVP DB.
6. Restore rehearsal on isolated data before relying on backup. Updated J12 requires isolated development/QA, local-first and free-only; actual hosted changes need target-specific authorization. See LOCAL_TESTING_WORKFLOW.md. Do not treat paid managed branching as included free.

## Specification exit gate

J1 and paging/error/idempotency/query/config/rollout defaults adopted in TECHNICAL_DEFAULTS. C2 typed manifest generation and resident adoption are implemented as recorded above; apartment/runtime-scoring adoption remains separate, not a further major product choice. Only packets with required contracts settled are ready; live provider/legal evidence is separate.

## Owner management amendment — 21 October 2026

[LISTING_MANAGEMENT](LISTING_MANAGEMENT.md) is the approved contract for private multiple cloud drafts, explicit public edits, all-poster Profile access and the shared property/aggregate inquiry inbox. It extends D16/I4/F4 without changing address/history, room/intake independence, owner identity or recipient consent. A seen request is not an accepted request or a read chat message. Existing individual/group/reverse-outreach identities remain distinct; group consent-round internals are not owner inbox data. Approval is not implementation evidence.
