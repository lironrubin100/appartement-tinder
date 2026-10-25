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

## Repeatable scenario state

Persistent accounts are only the identity baseline; ensure does not reset scenario data. Owner clarification, 25 October: creating/accepting a group or inquiry must not make the next run impossible. Keep completed profiles/login identities, create the minimum new run-owned group/listing/inquiry/conversation when needed, and explicitly restore the scenario after the run. An accepted relationship used as a precondition can remain a named baseline; a test of acceptance itself needs its own controlled pending state.

Use one ignored run journal with target, pool IDs, run ID and the exact IDs/object paths returned during that run. Under the actor lease: assert baseline → create scenario → exercise through ordinary actors → capture result → guarded cleanup → assert baseline again. On failure, keep the journal and stop reuse until recovery; never solve drift by creating replacement accounts. Finally hooks are required but are not proof cleanup succeeded.

Before any shared cleanup, verify every affected group member/invite/requester/conversation participant and listing owner belongs to the leased QA actors, all resource IDs are explicitly recorded as created by this run, and no retained baseline/demo, outside peer, unknown cascade or media object would be affected. Fail closed on drift. Delete/remove only run-owned resources in dependency order; retain account IDs and stable profiles. Storage removal uses the ordinary owner API, not Storage metadata SQL. Such cleanup is separate from account disposal.

Preferred implementation is an isolated local backend with a known seed/snapshot between scenarios. SQL transaction rollback is useful for SQL tests; browser/Auth/Realtime requests do not share that transaction and need explicit teardown or an isolated restore. On a shared target use only a reviewed exact-ID recovery procedure under the target/data/ownership authorization. A test-only privileged reset belongs in the private test runner, never a public application reset endpoint or a new RLS bypass.

Current limitation: the maintained helper implements identity validation and leases, not this scenario journal/reset. Do not describe account reuse as a complete repeatability solution. The next bounded QA change must implement and verify one create-group → guarded teardown → same-accounts second run, including outsider/drift rejection and a failed-run recovery case, before broadening to other scenarios. Existing whole-cohort cleanup is disposal and must not be used for this reset. Pristine onboarding/deletion cases may still need minimal disposable actors.

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

## Approved retained-demo access recovery

Owner approved one-time access recovery on 25 October for exactly the four de100001 cohort IDs ending 1–4. Their content must remain. This is separate from QA-pool provisioning/disposal and requires no repeated owner confirmation within that exact scope.

From the primary checkout's web directory, node scripts/recover-demo-access.mjs prepare writes one ignored .qa/demo-recovery/credentials.json and refuses overwrite; dry-run reports only counts. The private .qa/demo-recovery/admin.env must contain SUPABASE_PROJECT_REF=npbduvjnqnbydolmdpsc and SUPABASE_SECRET_KEY with a server-only project key supplied locally, never in chat/Git/NEXT_PUBLIC. The helper reads existing public URL/anon settings internally; it never prints values. Missing configuration stops before Auth mutation.

node scripts/recover-demo-access.mjs --apply preflights exact target/all four IDs and synthetic email marker before any update, uses supported Auth-admin password updates, verifies ordinary sign-in and local sign-out, and checkpoints private credentials so partial recovery resumes without resetting an already-working account. It runs only from primary and leases those exact actors. It changes no profile/listing content. Preserve the manifest for future ordinary-owner demo work; do not adopt it as a QA pool. Current preparation has zero verified live accounts; assets/content/browser acceptance remain open.

Focused recovery checks: node --test web/scripts/test-recover-demo-access.mjs. Wrong target/port/embedded credentials, unmarked identity and partial-recovery cases are contract tests, not evidence that hosted recovery ran. Never print SDK/config/JSON-parser errors containing private values.

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
