# Data, API and rollout blueprint

State: 17 October technical delegation adopted; J1-J7/J10-J14/K5 closed. Exact mechanics in [TECHNICAL_DEFAULTS](TECHNICAL_DEFAULTS.md) and [POSTER_OUTREACH](POSTER_OUTREACH.md). J8/K3 capacity remains research, C2 taxonomy baseline adopted. Reconcile current schema; no live migration applied.

## Entity and disclosure boundaries (J1)

| Domain | Identity / relationships | Public projection | Private/privileged data |
| --- | --- | --- | --- |
| Account/auth | Stable auth user ID; one account with residency intake | No auth user/email object | Sessions, credentials, recovery, suspensions |
| Resident | Profile belongs to account; structured disclosed facts | Chosen display identity, photo, age, bio, lifestyle facts, selected badges | DOB, email/student email/phone, budget/date, hidden badges/preferences |
| Taxonomy | Versioned category/field/option IDs; 31 source headings | Approved labels/icons/public disclosed values | Personal search preferences and nonpublic inputs |
| Apartment | One owner account; available-room children | ID, title, price/count, safe area, approximate point, approved facts/photos | Exact address/coords, contact, private provenance/location version |
| Room | Apartment parent, stable ID, price/date/availability | Only as apartment-owned available room, never independent feed entity | Owner edit history/internal negotiation state |
| Save/interest | Actor + apartment with explicit semantics | Aggregate allowed count only | Saver/interested identity unless explicitly authorized; own save state |
| Introduction/pass | Actor + individual/group target; one target type | No public list of private interactions | State/quota/time/trait snapshot; pass expiry |
| Group | Admin, current members, admission policy/version | Safe derived member card; no inferred private budget | Votes/invites/membership history/private group search preference |
| Conversation | Kind/member links; monotonic sequence boundary | None | Messages/card refs, membership/history cutoff, read markers |
| Listing inquiry | Requester + apartment owner/listing | None | State, accepted conversation/grant references |
| Address grant | Accepted inquiry + requester + listing/location version | None | Revocable precise-location reads under approved lifecycle |
| Report/action | Reporter + subject/object + protected reviewer action | No reporter/content leakage | Reasons, evidence, audit, restriction/reversal |
| Notification | Event→recipient/channel delivery; optional device subscription | None | Preferences, endpoint credentials, sender/outbox state |
| Pilot event | Stable event ID, cohort and approved object refs | Aggregated authorized report only | Pseudonymous actor, timestamps; no content/contact/exact location |

Do not duplicate auth identity across resident/lister personas or make social group membership the owner of someone's profile. Resident/lister is one account's server-authorized capability state: B10 permits only the explicit resident-to-lister Settings transition, with private data retained and active-group membership a refusal condition. A group is not an apartment; group maximum four (E2) is not maximum apartment tenants. A room is not a standalone listing. A subscription is not a permission to bypass privacy.

## API compatibility and proposed read contracts (J2/J3/J7)

Reuse existing RPCs discovered in local source (`save_onboarding`, `publish_apartment`, `get_public_listing`, `send_introduction`, `accept_like`, `pass_discovery`, `discover_individuals`, `discover_groups`, `list_chat_inbox`, `create_listing_inquiry`, `accept_listing_inquiry`, group invite/admission/configuration functions). Do not rename/recreate them from this list without checking the current live signature and callers.

Proposed read envelope: `{items, next_cursor, has_more, projection_version}`; validate capped page size and opaque cursor. Scored feeds also include `scoring_version`/coverage. Cursor binds query/filter/version context; invalid/obsolete cursor returns explicit restart instruction. Sort keys include unique tie-break; no unbounded prior-ID arrays in URL.

Map pins: public projection filtered on approved approximate location semantics; separate detail query. Private favorites are user-scoped overlay, not a shared cached response. Individual/group feeds: exclude disallowed relationships before projection and score. Inbox: one bounded preview/unread summary per authorized conversation, never load entire histories to build it. Messages: sequence cursor, visible_after_seq/history rule and current access checked for every page.

Proposed stable error meanings: unauthenticated, forbidden/not-found as privacy requires, validation(field/code), state-conflict(current version), unavailable, quota(retry time), provider-unavailable, internal(recovery reference). Map them to localized UI, not raw SQL/stack text. Do not disclose existence of private objects by distinguishing unauthorized from missing.

## Atomic writes, conflict and idempotency

- Publish/update apartment and rooms: transaction; owner check; version comparison; stable request key; photos referenced only after valid ownership check. Failed transaction must not leave public partial inventory.
- Accept intro/inquiry: lock affected request and relevant conversation/capacity; recheck block/availability/member state; unique relationship/conversation guard; same logical retry returns existing outcome.
- Group membership: capacity and electorate version checked under lock; invitation acceptance is explicit; membership version changes invalidate stale votes as approved; join cutoff set atomically with membership.
- Quotas: server clock and approved day/timezone; atomic count/consumption including accepted sent intros; concurrent last allowed send cannot overrun. Do not refund quota for deletion/retry unless policy explicitly allows it.
- Send message: server membership check, sequence assignment and unique client request identity where used; transaction with minimal outbox event if enabled. Realtime is a delivery signal, database is persistence.
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

J1 and paging/error/idempotency/query/config/rollout defaults adopted in TECHNICAL_DEFAULTS. C2 adopted baseline requires typed manifest generation, not further major product choice. Only packets with required contracts settled are ready; live provider/legal evidence is separate.
