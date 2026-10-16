# Legacy slice coverage map

Date: 15 October 2026. Every original BUILD_PLAN ID has exactly one primary owner below. This preserves planning coverage, not the old readiness, phase order, scope tier or implementation claim. New capabilities SL17 (assisted inventory) and SL26 (saved-search alerts) have no complete legacy equivalent.

| New slice | Legacy IDs (primary ownership) |
| --- | --- |
| SL00 | T01, T02, T09, T12, T16, T18, T19 |
| SL01 | P01, P02, P03, P06, P07, P08, P09, P10 |
| SL02 | M01, M08, M10, M16, M17, T07 |
| SL03 | M02, M03, M04, M05, M06, M07, M18, M21, M22, M23, T04 |
| SL04 | M09, M11, M12, M13 |
| SL05 | M14, M15, T05 |
| SL06 | C01, C02, C03, C04, C07, S05 |
| SL07 | R01, R02, R03, R04, R05, R06, R07, R08, R09 |
| SL08 | C05, C06, C08, C09 |
| SL09 | G01, G02, G03, G04, G05 |
| SL10 | C10, G06, G07 |
| SL11 | G08, G09 |
| SL12 | S01, S02, S03, S04, S06 |
| SL13 | C11, C12, T13 |
| SL14 | T14, T15 |
| SL15 | P05 |
| SL16 | T03, T06, T08, T10, T11, U01, U02, U03, U04, U05, U06, U07, U08, O01, O02, O03, O05, O06, O07 |
| SL20 | V01, V02, V03, V04 |
| SL21 | P04, V08, V09 |
| SL22 | M19, M20 |
| SL23 | M24, M25, V07 |
| SL24 | T17 |
| SL25 | O04 |
| SL27 | V05, V06 |

## Normalization and decision gates

- M22: area defaults/search coverage, **not** outside-Beer-Sheva rejection; A5 now DECIDED.
- P07 + M16/M17/R01/R02: one 31-category taxonomy across facts/preferences/apartment models. Preserve all headings, normalize compound options; no invented complete Hebrew dictionary.
- R01: finish normalized matrices/input contract before SL07; C13 flexible/optional-basic-strict baseline now provisionally approved, not an unresolved global-hard-gate conflict.
- M05/T17: query behavior and PostGIS need measured decision; no compulsory extension from stale architecture.
- M13/S03: D6/D7 now approved 45-day expiry/three-distinct-report hiding with notify/renew/false-report recovery. Technical recurrence windows/deduplication still need specification.
- G06 shared wishlist and G09 automatic group closure are optional/gated subcapabilities, not prerequisites for basic card sharing or group chat. Primary ownership does not approve them.
- P05: B3/B4 email-only method and SL15 MVP inclusion confirmed; real sender/domain proof still requires evidence.
- T15: automatic inactivity hide explicitly excluded C10 by Q24; preserve legacy traceability but do not implement it.
- P04: Apple deferred; future auth extension may be web as well as native, not a pilot requirement.
- M19/M20: apartment furniture explicitly deferred after MVP Q4, recorded D15; general resale also later.
- M25 duplicate detection and O04 landing/waitlist remain optional later decisions, not automatically required by placement.
- O07 original referral idea does not fully specify closed-pilot access; SL16 requires a separate enrollment policy.
- U/T quality items attach concrete acceptance to every relevant slice. SL16 is integration review, not a late fix-all phase.
- T16/J12: test isolation is required before global mutation experiments; a second hosted backend is not silently approved.

## New or previously insufficiently specified contracts

- Auth recovery/session expiry/canceled OAuth and intended return, not just successful onboarding.
- Closed-pilot enrollment/access and operator identity.
- Source/permission/owner claim/freshness for assisted inventory.
- Listing room/intake/group separation; location identity/version and grant lifetime.
- Retry/concurrency/version conflicts; group majority electorate and final-seat races.
- Private group budget, block within shared groups, admin transfer/deletion fallback.
- Reliable notification outbox, user/channel/device ownership and suppression.
- Metrics definitions/cohort/event dedupe/privacy; episodic search success.
- Restore/incident/job/quota visibility and app/schema compatible rollout.

Run `node scripts/check-planning.mjs` to compare this map against the frozen legacy ID inventory and the slice dependency graph. That checker proves structural consistency only, not product completeness or runtime correctness.
