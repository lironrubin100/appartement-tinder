# Configuration key inventory

This branch starts the inventory with the key introduced by task 2.19. It is not a claim that every older setting has been audited. DECISIONS.md remains product authority. Credentials and signing keys belong only in environment secrets, never app_config or NEXT_PUBLIC variables.

| Key | Scope / owner | Default and validation | Exposure / failure | Evidence |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_CARTO_BASEMAPS_KEY` | Existing Leaflet/CARTO browser basemap key; Vercel Development/Preview/Production and ignored local environment. | No default; trimmed string. Configure permitted origins at CARTO; this is an intentionally browser-visible provider key, not a server credential. | Embedded in the public tile URL. Missing key shows the existing map-unavailable state; tile errors offer retry while listing browsing remains available. Never use a server credential here. | Task3.2 restored the already-configured Vercel development value to ignored local env29October, with private pre-edit backup; no remote value, provider permission or product-policy change. Actual streets/pin browser acceptance remains required. |
| `LISTING_DRAFT_CURSOR_SECRET` | Server-only draft and owner-inquiry pagination; independently generated local, Vercel Production and Preview values. Owner explicitly approved hosted secret creation 23 October 2026. | No default; at least 32 characters, generated with 32 cryptographically random bytes. | Never returned to client or stored in app_config. HMAC binds account, query, sort tuple, schema version and 30-minute expiry. Separate `shutaf:listing-draft-page:v1:` and `shutaf:owner-listing-inbox:v1:` signing domains reject cross-service tokens. Missing/short key disables list service with STATE_UNAVAILABLE; no unsigned/public-key fallback. Rotation invalidates existing cursors; clients restart list. | Task6.25 reuses existing material with domain separation; no value/hosted-secret change. Local ignored env preserved before edit; both Vercel targets stored as sensitive. Values never appear in tracked records. |

Test harness controls `UX_SCREENSHOTS`, `UX_LIVE_JOURNEY`, `QA_FIXTURE_MANIFEST`, `TEST_ORIGIN` and fixture manifests are documented in docs/TESTING.md. They do not configure runtime product policy or replace target-specific mutation authorization.

QA helper update, 25 October 2026: existing QA_FIXTURE_COUNT/PREFIX/MANIFEST/DIRECTORY controls remain harness-only. CLI prepare --reusable --actors=... records purpose/named actors in ignored run.json; ensure and run reuse them with per-actor leases. No new product app_config key or environment secret was introduced. See docs/TESTING.md for target/retention/disposal behavior.


### Private one-time demo recovery operator configuration — 25 October 2026

- SUPABASE_PROJECT_REF: explicit fixed recovery target npbduvjnqnbydolmdpsc; read only by web/scripts/recover-demo-access.mjs from ignored web/.qa/demo-recovery/admin.env.
- SUPABASE_SECRET_KEY: server-only Supabase Auth-admin key, supplied locally in that same ignored file. Never app_config, NEXT_PUBLIC, browser code, tracked source or tool output. No value/default is stored in this registry; no hosted configuration change was made.
- This is operator-only tooling for the owner's four approved synthetic identities. Exact target/identity preflight, private credential checkpoints and ordinary sign-in are required. It neither authorizes new accounts nor grants general data reset. No new product app_config key.

### Repository workflow controls — 25 October 2026

`docs/planning/execution-state.json` stores `workflow_mode` (plan/build; currently plan) and `automation_control.enabled` (currently false). Both Build and enabled=true are necessary for a claim. The control's cadence_minutes, model, reasoning_effort and automation_id describe the app schedule; editing metadata does not reconfigure or enable that schedule. Current app schedule: shutaf-next-approved-task, ten minutes, gpt-6-luna/medium, PAUSED. `unit` is one approved atomic task; `reason` explains the pause. These are operator controls, not product app_config or authorization for hosted writes.

Ignored `web/.qa/automation/state.json` holds a future usage cooldown (`not_before`); `lease.json` holds exact task/fingerprint/thread/token ownership. No automatic lease expiry. Existing CODEX_THREAD_ID identifies the calling chat; no new secret or hosted environment setting. Commands and recovery gates are maintained in START_NEXT_WORK, not duplicated here.
