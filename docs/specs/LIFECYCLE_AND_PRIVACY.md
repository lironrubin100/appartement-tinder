# Lifecycle and privacy contracts

State: owner Q16/Q17/Q21/Q22/Q23/Q30 confirmed product rules on 16 October 2026; exact technical transitions remain to verify. No schema/live behavior changed.

16 October answers: ordinary history rights restored after unblock; lister/resident phone optionality and 30-day deletion grace accepted. Updated DECISIONS.md is authoritative; see MVP_DECISION_ANSWERS.md for still-unanswered questions.

## Independent state dimensions

D18 is confirmed: roommate-group formation, accepted inquiry and lease signing do not imply one another.

| Object | Proposed state/field | Controller | Meaning |
| --- | --- | --- | --- |
| Apartment | draft / published / unpublished / removed | Owner; reviewer may restrict | Publication, separate from room occupancy |
| Apartment | manual restriction + reason | Reviewer | Owner cannot override an actual reviewer sanction |
| Apartment | expired / taken-report hidden with report cohort | Server; explicit owner renewal | Automatic hiding separate from a manual moderation sanction |
| Room | available / unavailable; available_from | Apartment owner | Current room offer, no inferred lease status |
| Apartment | inquiry_intake open / paused | Owner | Willingness to receive new requests; never inferred from group membership |
| Group | discoverable / hidden; chat active / archived | Admin under approved policy | Looking for people separate from apartment inventory |
| Inquiry | pending / accepted / declined / withdrawn | Relevant actor, server checks | Accepted opens authorized conversation; not reservation |

Public eligibility requires published, no active manual/automatic hide and at least one available room. An uncertain negotiation can leave room/intake open. Proposed paused-but-still-available listing presentation must honestly disable new inquiry; never pretend send succeeded. Exact schema naming remains technical design.

When all rooms unavailable: hide from new search; retain management, saved/unavailable cards and accepted conversations. Pending requests visibly paused/unavailable; on reopening sender reconfirms before acceptance. This rule accepted Q21; no need to ask it again.

Expiry D6: 45 days then hide/explicit renewal. D7: 3 distinct taken-reports hide, owner notified and may renew. Record the report cohort consumed by a hide so old rows cannot immediately re-hide after renewal; operator can investigate false reporting and reverse abuse. Do not clear a manual reviewer sanction through ordinary renewal. TECHNICAL_DEFAULTS specifies distinct nonowner reporters per renewal cohort and recurrence tests.

## Transition contract

| Action | Preconditions | Atomic changes / failure |
| --- | --- | --- |
| Publish | Approved intake; valid address; 3–8 owned photos; at least one valid room; title/date/price validation | Apartment + rooms published atomically; failed write keeps draft, no partial public listing |
| Edit | Actor owns listing; current version matches editor's version | Validate full resulting model; commit apartment/rooms/photo references together; conflict asks reload/review, never silent overwrite |
| Mark room unavailable | Actor owns room's apartment | Change that room only; recompute public count/range; do not close group or chat |
| Mark all unavailable | Explicit owner confirmation | Bulk room update; public discovery hides; pending-intake behavior visible |
| Reopen | Valid published/nonrestricted apartment; owner chooses rooms/date/intake | New availability, no retroactive acceptance/notification spam |
| Send inquiry | Authenticated eligible requester, active room, intake open, unblocked, not self | Persist once using existing duplicate rules; outsider cannot impersonate requester |
| Accept inquiry | Owner, still available/intake compatible, both accounts eligible/unblocked | Lock/recheck; one conversation/membership/grant; retry idempotent; failure no partial grant |
| Share listing | Current conversation membership and post-join history | Reference only public listing ID; no exact address/owner/private fields in payload |
| Hide/moderate | Authorized reviewer with reason | Public visibility changes, durable audit; no user-controlled admin role |

## Location identity and grant lifetime

D4 stays binding; owner says another address is another property. Proposal: after publication, ordinary edits cannot silently turn the listing into a different address. A new property gets a new listing. After publication ordinary location edit is disabled; protected correction increments version/rechecks grants. New property always new listing.

Exact-address reads require accepted requester, valid current relationship and unblocked pair. Address remains accessible after room unavailable; blocking/account deletion/security authorization ends future access. No discretionary owner revoke-address button (Q23). Do not infer arbitrary grant cancellation from left thread alone. Never promise to retract information already seen.

No public exact address in title, metadata, notification payload, listing-card snapshot, JSON, map query, cache key exposed to user, logs or Storage filename. User-authored text/photos may reveal identifying details; product policy and guidance must address that independently from coordinates.

Local source risk: current offset uses public listing ID and known hash/radius. Before approving privacy mechanism, demonstrate with synthetic points that public output does not permit straightforward inversion. Do not test real tenants. A stable offset must be persisted or derived with an appropriate private mechanism; secret changes must not create multiple public observations that enable averaging. TECHNICAL_DEFAULTS selects a persisted cryptographically random displaced point independent of public ID; synthetic inversion/averaging tests and migration review still required.

## Authorization matrix

| Data/action | Guest | Other resident | Listing owner | Accepted requester | Reviewer |
| --- | --- | --- | --- | --- | --- |
| Safe active listing projection | Yes | Yes | Yes | Yes | Yes |
| Exact address | No | No | Own | Only current authorized grant | Only narrowly scoped audited moderation need |
| Private profile fields | No | Own only | Own only | Own only | No blanket access by default |
| Conversation/history | No | Only membership + join boundary + block rule | Same | Same | No general chat browsing privilege |
| Report | No anonymous path unless separately approved | Own submission per approved visibility | No reporter disclosure | Own submission | Assigned authorized queue |
| Restrict listing/account | No | No | No self-bypass | No | Server-authorized action + reason/audit |

Test role, ownership, field allowlist and row visibility separately. RLS does not replace column grants or safe privileged-function checks.

## Existing-group blocking — accepted Q17

Do not remove another member merely because someone blocked them. Reject invitations/admission that would create a blocked pair. For an existing shared group, proposed behavior follows a safe conflict state: members whose access would cross a blocked relationship cannot read/send/receive previews/Realtime/notifications in that group, while unrelated members retain their access. Present explicit choices to leave or resolve the conflict; no silent unblock.

Before implementation compare this proposal with current can_access_group/can_access_conversation semantics: current local code denies a viewer if any group member is blocked_with(viewer), which can affect both people. Do not implement the earlier unilateral "blocker only loses access" suggestion without changing and verifying both directions consistently. H1's symmetric boundary is binding; all outputs must agree.

Provide a constrained management path without exposing blocked chat. On unblock, ordinary membership/history rights return, including messages within that member's normal visibility window. The earlier no-backfill suggestion is withdrawn; Q17 approved normal-history restoration. UI must explain both temporary loss of access and restoration.

## Admin departure and account exit — accepted Q16

Ordinary admin exit: ownership transfer effective only after recipient accepts. Until then current admin stays owner. Cancellation/expiry of transfer leaves ownership intact. Updated E3 now includes this flow rather than deferring it.

Account deletion cannot be held hostage by transfer refusal. Offer transfer; if deletion occurs without completed transfer, archive/hide group and invalidate pending invites/admissions, preserving permitted history for others. No arbitrary successor without consent. Last-member exit behavior and cancellation recovery are technical transition details to document under this rule.

## Deletion policy (B7/F6 accepted Q30; legal retention research remains)

Immediate deactivation/hiding/access revocation, 30-day cancellation grace, then private account data/photo purge. Existing shared history may remain under "Deleted user" identity for others. Message text may still contain personal data: define retention/redaction through the research gate; removing display name does not magically anonymize content.

Inventory: hide owned active listings; stop new inquiries; pending requests canceled or visibly unavailable; exact-address grants revoked for future reads. Storage: delete only owned unreferenced objects through Storage API. Reports/audit: narrowly retained only under approved purpose/retention; never cascade away abuse evidence by accident. Shared group/chat objects must not vanish merely because one account is deleted.

Technical job contract: idempotent deactivation and resource cleanup/progress; retries/backoff; no cross-owner deletion; cancellation boundary before purge explicit; observable failures; sessions/background sending honor inactive/deleted state. B7/F6/E3 product interaction decided; retention detail, job/permission verification and cancellation recovery remain readiness gates.

## Identity and trust recommendation

18+ self-declaration/server enforcement and first-name/last-initial display accepted Q6; DOB private. Student email verification is real MVP requirement Q5, not ID/property/background proof. B10 nonresident poster requires no lifestyle profile; listers may browse safe authenticated social projections; guests sign in for people. Apartment-bound invitation requires recipient consent (POSTER_OUTREACH).

## Acceptance scenarios

Two independent owners + requester + outsider; edit conflict and transaction rollback; partial-room availability; intake paused while group active; second acceptance retry/concurrent attempt; block through direct API/Realtime/previews; group member history cutoff; address grant revocation; listing-card unavailable state; deletion retry and admin fallback with rejected transfer. Each scenario must state approved expected outcome before execution.
