# Notifications, pilot measurement and operations

State: 17 October technical defaults adopted; event keys/defaults/heartbeat/dedupe/retry/leases in [TECHNICAL_DEFAULTS](TECHNICAL_DEFAULTS.md). Preserve disabled preferences. Actual provider delivery unverified; no authorization to start sending from this plan.

## Channel and event contract

F4/E8 amendment, 20 October: a group consent round is private to the roommate group. Emit the owner-facing `listing_inquiry_received` only once when all current members have approved and the group inquiry is committed; a first vote or shared card does not notify the owner. Owner acceptance uses the separate apartment conversation, never the roommate-only thread. See [GROUP_LISTING_INQUIRIES](GROUP_LISTING_INQUIRIES.md).

Owner Q27 confirms email/supported push and action events in updated F7/L5: messages, inquiries, invitations/admission requests needing response, with master/event/channel controls and redundant-email suppression during active reading. Keep distinct event keys rather than a generic match count. D7 hidden/renewal notices must reach owner-visible status and configured channel handling. Saved-search/area new-listing monitors are explicitly later Q28, not MVP dependencies.

Separate system event enablement (operator) from a recipient's master, per-event and per-channel choices. Device subscription is not user consent to every event. Proposed dispatch eligibility = allowed event/channel AND active eligible account AND master enabled AND effective event preference AND verified reachable email or authorized current push subscription AND conversation/history/block rights at send time. Recheck after queue delay/retry, not only when enqueued.

Retain notifications_enabled data and use an accurate all-channel label when push introduced under approved F7 controls. Defaults/version migration explicit; cannot infer it from a sender that never existed. No paid sender or arbitrary emailing under free-only K3.

## Reliable delivery proposal

- Emit a minimal durable event/outbox record in the same transaction as the committed action, without calling an external provider inside that transaction.
- Event ID unique; delivery uniqueness `(event_id, recipient_id, channel)`; provider idempotency where available. Retry does not create a second message/inquiry.
- States queued/processing/sent/suppressed/retry/dead; processing lease recovers crashed worker; bounded attempts with backoff and sanitized diagnostics. At-least-once dispatch must not be described as guaranteed exactly-once delivery.
- Dedupe conversation bursts using configured interval; define message seen/open suppression before implementation. User's send action succeeds even if notification service unavailable.
- Payload contains safe generic text and relative app route resolved from a trusted origin; no message body, exact address, private budget or sender's hidden badge. Link authorization checked again when opened; intended return/locale retained.
- Unsubscribe/Settings route usable, preference changes prevent later queued sends; server validates subscriber ownership. Invalid push endpoint response removes/deactivates that subscription.
- Push endpoints/keys are sensitive delivery credentials, not public app_config. Validate endpoints to prevent arbitrary-server requests; web-push sender uses vetted protocols/hosts and bounded networking. Never fetch arbitrary client endpoint URLs manually.
- Device logout/account switch must detach prior account subscription before rebinding; test multiple tabs/devices and revoked permission. Multi-device receive rights belong to current account, not whatever user last opened the browser.
- Service worker handles push/click only; no offline caching implied. Recheck platform support/docs before implementation; no claim of real iOS verification without device evidence.

## Measurement contract

Source events server-committed for business state; client events only for genuine view/start interactions. Unique event IDs and UTC timestamp; pseudonymous actor ID, pilot/demo/QA cohort, source version, channel and approved object references. No email/phone/address/message text/raw private preferences in analytics. Define retention/access before choosing a provider. J13 first-party pipeline adopted; M3 nonessential consent/legal review remains release gate; minimal first-party aggregates can be proposed without claiming consent/legal conclusions.

| Metric | Exact proposed definition | Interpretation caveat |
| --- | --- | --- |
| Onboarding completion | Unique residents completing required profile / unique residents starting setup, same cohort/window | Separate lister intake; exclude QA/demo |
| First useful interaction | Resident sends first valid introduction or listing inquiry | Save/view is a weaker separate event |
| Introduction acceptance | Accepted intros / eligible delivered intros in a specified observation window | Separate person vs group; pending not called rejection |
| Inquiry response | Inquiries accepted/declined by owner / eligible delivered inquiries | Show time-window and unresolved count |
| Useful reply time | Median and p90 time from sent inquiry/intro to first relevant owner/recipient response | Report unresolved/censored cases, not just fast responders |
| Active searchable supply | Confirmed currently visible listings/available rooms with real reachable owner | Separate seeded/organic; stale copied rows not responsive inventory |
| Searcher return | Cohort still seeking housing that returns on defined subsequent days | Exclude declared found-home users from avoidable-churn interpretation |
| Conversation engagement | Accepted conversations receiving messages from both parties | No analysis of private message content |
| Outcome | User-declared found roommate / arranged viewing / found place | Declared, not verified signed lease unless independently evidenced |
| Notification effectiveness | Eligible queued → sent → safe link open | Delivery/open telemetry incomplete; no claim notification caused retention |

Specify all denominators, observation windows, dedupe and timezone in report. No generic `match_rate` mixing intro acceptance, inquiry acceptance, group join and lease outcomes. Funnel charts based on generated demo activity must say demo.

## Retention experiment outside initial message loop

Relevant new listings: store explicit saved search preferences privately; event when a newly publishable listing matches; dedupe/relevance limits and opt-in delivery schedule. This is not a free incidental consequence of message email. Add a separate slice after basic alerts if the owner prioritizes it. Product success is finding housing; avoid mechanisms designed merely to prolong search.

## Minimal operator contract

Named owner/operator; protected review queue; send-disable switch; registration/pilot access policy; provider quota visibility; stuck-outbox/deletion job visibility; incident note with version/target; backup/restore procedure verified before relying on it. H2 categories adopted; no response-time SLA promised. Public launch requires a separate capacity/privacy/operational gate.

## Required acceptance

Mock sender proves enqueue/rollback/dedupe/retry/suppression; real configured test destination proves one actual email/push with ordinary account; channel disable and master-off suppress queued retry; blocked/left/deleted user receives nothing; another account cannot modify preferences/subscription; logout rebind prevents old-account push; links cannot redirect externally or expose unauthorized thread; analytics event count agrees with actual committed state after retried/rolled-back actions. Restore only fixture configuration under an isolated target, never global shared production limits.

## Owner inquiry viewed marker — 21 October 2026

[LISTING_MANAGEMENT](LISTING_MANAGEMENT.md) adds owner-only seen state for a sent inquiry when its details are opened. Loading a list does not mark it seen. It is independent of message unread/read counters and does not accept a request or create a notification. Existing F7 delivery rules remain; unsent group consent rounds produce no owner-facing notification.
