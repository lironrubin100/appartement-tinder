# Configuration key inventory

This branch starts the inventory with the key introduced by task 2.19. It is not a claim that every older setting has been audited. DECISIONS.md remains product authority. Credentials and signing keys belong only in environment secrets, never app_config or NEXT_PUBLIC variables.

| Key | Scope / owner | Default and validation | Exposure / failure | Evidence |
| --- | --- | --- | --- | --- |
| `LISTING_DRAFT_CURSOR_SECRET` | Server-only draft service; independently generated local, Vercel Production and Preview values. Owner explicitly approved hosted secret creation 23 October 2026. | No default; at least 32 characters, generated with 32 cryptographically random bytes. | Never returned to client or stored in app_config. HMAC binds account, query, sort tuple, schema version and 30-minute expiry. Missing/short key disables list service with STATE_UNAVAILABLE; no unsigned/public-key fallback. Rotation invalidates existing cursors; clients restart list. | Local ignored env preserved before edit; both Vercel targets stored as sensitive. Values never appear in tracked records. |

Test harness controls `UX_SCREENSHOTS`, `UX_LIVE_JOURNEY`, `QA_FIXTURE_MANIFEST`, `TEST_ORIGIN` and fixture manifests are documented in docs/TESTING.md. They do not configure runtime product policy or replace target-specific mutation authorization.

## Reconciled live configuration — map consumer (25 October 2026)

The authorized hosted project already contains an RLS-protected `app_config`
table. A read-only audit confirmed 17 public keys and 5 private keys. This
source change does not apply a migration or alter a hosted value. It consumes
only the following public allowlist from the authenticated Map route; malformed,
missing, unavailable, or non-public values use the exact existing defaults.

| Key | Default and bounded validation | Exposure and refresh behaviour | Current consumer |
| --- | --- | --- | --- |
| `map.cluster_max_zoom` | `14`, integer `1`–`22` | Public read only; server cache is at most 60 seconds. | Map marker clustering. |
| `map.new_listing_within_days` | `7`, integer `0`–`365` | Public read only; server cache is at most 60 seconds. | “New listing” card badge. |

Private keys, including map privacy offset, reporting thresholds and group
limits, are deliberately absent from the web allowlist. The historical
migration source still requires a checksum/function review before it is restored
to this repository; it must never be re-applied merely because the hosted
migration history already contains it.
