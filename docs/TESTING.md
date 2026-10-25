# Testing workflow

Maintained commands and fixture modes. Execute only the selected work card's checks; common execution/authorization rules are in [EXECUTION_PROTOCOL](EXECUTION_PROTOCOL.md). Historical release results stay in owning handoffs, never inferred from a command below.

## Target and local checks

Confirm checkout/HEAD/diff, backend URL/ref, fixture ownership and applicable authorization. Shared Shutaf ref is npbduvjnqnbydolmdpsc; this name alone grants no mutation permission. Prefer an isolated local backend. Never reset shared data, repurpose real users or assume a Preview has an isolated database.

From the repository root: node scripts/check-planning.mjs; node --test scripts/test-next-work.mjs. From web: npm run test:db (disposable PGlite, not Supabase/Auth/Storage/Realtime acceptance), npx tsc --noEmit and focused npx eslint <changed files>. Build before app-code publication with npm run build, once per relevant source/dependency version. Run affected ordinary-client and browser assertions for a user journey; do not turn an unrelated whole-suite rerun into a routine micro-task cost.

## Fixture purposes

- Retained owner demos: keep their content, identities and ignored manifests for inspection. Do not reset or adopt them as a mutable QA pool.
- Dedicated reusable QA: exact marked accounts, explicitly prepared once and reused for repeatable scenarios. New listing/inquiry/group/message IDs can be scoped to each run; account identities stay. Tests own scenario preconditions/reversible cleanup and reject drift rather than hiding it.
- Pristine/destructive cases: minimal separate actors for first onboarding, exact age boundaries, deletion/suspension or other irreversible transitions. Keep those separate from the reusable pool and demos.

A missing fixture is a setup diagnosis, not a reason to create nine new accounts by default. Never print/commit credentials or provisioning SQL, which contains temporary passwords. Confirm generated artifacts are ignored. Keep incomplete manifests for recovery.

## Dedicated reusable pool

Existing controls: QA_FIXTURE_MANIFEST and QA_FIXTURE_DIRECTORY select a private ignored cohort; QA_FIXTURE_PREFIX controls marked emails. Use a separate directory/manifest for the dedicated pool. QA_FIXTURE_COUNT remains supported for legacy/pristine runs. prepare --reusable requires named actors and sizes the cohort to that list (1–9); an explicit count must agree.

From web, prepare locally once (example shell environment overrides; values here are paths, not secrets):

~~~powershell
$env:QA_FIXTURE_MANIFEST='.qa/pool/accounts.json'
$env:QA_FIXTURE_DIRECTORY='.qa/pool'
node scripts/qa-fixtures.mjs prepare --reusable --actors=owner,requester,outsider
~~~

prepare only writes exact-ID private credentials/provision/disposal SQL; it performs no remote mutation and refuses an existing manifest. Apply provisioning only through an authorized credential-safe path on the confirmed target, then complete each actor's approved role. No hard-coded known passwords or repeated real-email signup. Existing retained demo manifests are deliberately rejected as a reusable pool.

~~~powershell
node scripts/qa-fixtures.mjs ensure
node scripts/qa-fixtures.mjs run -- node node_modules/@playwright/test/cli.js test e2e/<affected-spec>.spec.ts --workers=1
~~~

ensure validates existing named identities/target and ordinary sign-in plus completed own profile; it creates/resets nothing. It does not prove a scenario's listings/messages/inquiries are pristine. run holds per-actor filesystem leases in the primary checkout's ignored web/.qa/pool-leases while running its child. Overlapping subsets/copied manifests on this computer cannot run against the same actor simultaneously. A stopped/crashed process may leave a lease: investigate the named run/owner and release only a verified stale lease; never automatically expire it or mint a replacement cohort. Cross-machine execution still needs shared ownership coordination/isolated targets.

check remains ordinary sign-in preflight for legacy or reusable manifests. Existing suites using indexed nine-account fixtures still require their documented actors; a three-actor pool is for an appropriately scoped test, not fake coverage of a nine-actor suite. New fixtures record named actors in run.json; migrate a test's role requirements when changing that test, rather than weakening assertions.

Local helper contract checks (no hosted target): node --test web/scripts/test-qa-pool.mjs web/scripts/test-qa-fixtures.mjs from root. These cover identity/target rejection, pool reuse, overlapping leases and actual CLI behavior against a localhost fake Auth/Data service. They are not live Supabase acceptance.

## Legacy/pristine acceptance

For suites needing a fresh cohort, use separate ignored manifest/directory and QA_FIXTURE_COUNT for the actual number; default legacy count remains9 for compatibility. From web: npm run qa:prepare (local files only), provision exact authorized IDs, then npm run test:acceptance. That runner checks sign-in before expanded listing/resident/auth/lister specs. A direct spec that skips missing actors is incomplete evidence. Browser assertions must use ordinary actors, refresh persistence and affected outsider denials.

npm run test:unread runs the real two-browser HE desktop/EN390 chat cases; these retain their nine-account indexed manifest requirements. Native background-focus behavior needs headed Chromium (an owned virtual display in cloud). A focused visibility/Realtime check is separate from a socket connection. Current canonical profiles must use the existing owned-photo/profile helper, not obsolete free-text fields.

Apply applicable HE/EN phone/desktop/provider scenarios from the task. PLAYWRIGHT_BASE_URL selects the named application target; PLAYWRIGHT_EXECUTABLE_PATH may select installed Chromium. NODE_USE_ENV_PROXY/PLAYWRIGHT_PROXY_SERVER apply only where the managed network requires them, bypassing localhost as appropriate. Preserve TLS verification; no device trust change from an old cloud approval. UX_SCREENSHOTS, UX_LIVE_JOURNEY and TEST_ORIGIN are harness controls, not authorization or product configuration.

## Disposal and recovery

Owner demos and the reusable pool are retained. Routine run cleanup removes/restores only exact run-owned state through supported authorized APIs; it does not delete the accounts. Never delete Storage metadata directly or widen an outsider/identity guard. A failed test is not permission to reset shared content.

For an explicitly discarded temporary cohort, keep its exact original overrides/manifest. Generate node scripts/qa-fixtures.mjs prepare-cleanup --discard-fixtures, review/apply that scoped de-onboarding SQL to the confirmed target, then npm run qa:storage (ordinary owner Storage removal), apply cleanup.sql, and query verify.sql. Only observed zero counts authorize npm run qa:forget -- --verified-clean. The existing disposable helper guards exact emails/IDs, mixed peers and leftover objects. Preserve its private files if any step fails. Intentional retirement of a dedicated pool additionally requires --discard-reusable-pool; it is never part of ordinary ensure/run. Do not dispose demos through this path.

## Local backend setup

The tracked migration chain starts after the original schema. A fresh local replay may fail on missing profiles; the20October isolated workaround used local-only bootstrap from a0ca6aa's supabase/schema.sql then rls.sql, before tracked migrations, with a unique local project_id/ports. Never add that historical bootstrap to the hosted chain or use a current schema snapshot containing later changes. Some recorded Storage origin functions are shared-target-specific; disposable local overrides were not proof of portable live configuration. Recheck Docker/baseline rather than reinstalling blindly. [LOCAL_TESTING_WORKFLOW](LOCAL_TESTING_WORKFLOW.md) is a reference route, not another fixture policy.

## Record results

Update one existing workstream/checklist/packet record as appropriate: exact source/target/date, actual pass/fail/skip, cleanup/recovery state and next step. Deployed SHA/migration/provider acceptance are separate. Do not turn a retained demo, cached build, fake-server contract check or historical test count into fresh production acceptance. Earlier detailed examples/releases remain in Git86f95f5 and the owning profile/chat/listing handoffs.
