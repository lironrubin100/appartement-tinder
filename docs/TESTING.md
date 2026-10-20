# Shutaf testing workflow

Run this workflow as the agent. The project-orchestrator skill routes here. Resume from `PROJECT_STATUS.md` and the relevant workstream; do not audit every old branch. Product rules are in `DECISIONS.md`. Keep verification and deployment claims separate.

## 1. Check the target and authorization

From the repository root, run `git status --short`, `git rev-parse HEAD` and `git worktree list --porcelain`. Read `web/AGENTS.md` before changing Next.js code. Check relevant live migrations through the connected Supabase tool. The shared MVP project is `npbduvjnqnbydolmdpsc` (J12); never infer a different project's authorization from this value.

Temporary isolated multi-account QA for the resident/group/listing work was explicitly approved on 15 October 2026. New schema changes or a different task's externally mutating tests must follow that task's authorization. Prefer a configured isolated backend when available. Do not modify existing users for test convenience. Apple signup is deferred; no manual Apple test is required for these journeys.

## 2. Run local checks

Run from `web` after installing declared dependencies with `npm ci` when needed:

```powershell
npm run test:db
npm run build
npx tsc --noEmit
# Lint changed files, including relevant tests; do not hide new errors behind old unrelated ones.
npx eslint <changed-file-paths>
git diff --check
```

`test:db` runs actual disposable PGlite SQL/RLS using the pinned dev dependency. It connects to no Supabase project and needs no credentials. It covers onboarding privacy/rollback, introductions/quota/pass expiry, group admission/capacity/consent/history, blocking and inquiry authorization/address access. Its bootstrap omits one obsolete revoke for a column moved to `profile_private`; it is not a live-schema clone or a concurrency/Realtime test.

## 3. Prepare real isolated accounts

`web/.env.local` needs the app's public Supabase URL and anon key. Use existing configured values; never print the file or request a service-role key. The browser tests use ordinary authenticated clients.

```powershell
# From web; creates local ignored files only, with no remote writes or outbound email.
npm run qa:prepare
git check-ignore .env.qa.local .qa/provision.sql .qa/prepare-cleanup.sql .qa/cleanup.sql .qa/verify.sql .qa/run.json
```

This generates exactly nine fresh UUIDs, `qa-resident-<uuid>@example.invalid` emails and random passwords. It refuses to overwrite an unfinished fixture manifest. The ignored `.qa/run.json` records target URL and IDs; `.env.qa.local` holds credentials. Never commit or show them. Do not use real email signup to work around missing fixtures.

Read `.qa/provision.sql` using a file tool into the connected Supabase `execute_sql` tool's `query` argument, using the project ID confirmed against `.qa/run.json`. Execute only after checking authorization and target. It inserts confirmed Auth users and email identities in one transaction; the real `handle_new_user` trigger creates profiles. It does not bypass tested app permissions or send email. The SQL contains temporary passwords: do not print it in commentary or include it in artifacts.

Connector orchestration example (discover actual tool name/schema first): load the SQL with a file-reading tool, keep its returned string in the orchestration variable, call `execute_sql({project_id, query: sql})`, then print only a sanitized success/error summary. Never hardcode the passwords into committed scripts. Database DDL goes through `apply_migration`, not this fixture setup.

```powershell
node scripts/qa-fixtures.mjs check
```

The check signs in all nine users and rejects missing/unprovisioned/wrong-project fixtures. `npm run test:acceptance` runs this check itself so a missing fixture file cannot produce a misleading green suite of skipped tests.

## 4. Run real browser acceptance

Use a server from this checkout on localhost:3000. Identify an existing listener's process/checkout before reusing it; do not stop someone else's server. After the build, start `npm run start` in an owned terminal session. Keep its session ID to stop it later. Playwright can start a development server if none exists, but the release evidence should name which server was used.

```powershell
# From web. Installed Chrome worked on this machine; omit if bundled Chromium is installed.
$env:PLAYWRIGHT_CHANNEL='chrome'
npm run test:acceptance
```

Acceptance uses one worker and no mocked routes:

| File | Evidence |
| --- | --- |
| `e2e/listing-slices.spec.ts` | Three tests: Hebrew/English publish → confirmation → public page → owner dashboard → rented; privacy/outsider checks and invalid listing 404 |
| `e2e/resident-auth-guest.spec.ts` | Four tests: guest login/signup UI, RTL/LTR, protected return paths and external/looping callback rejection; no mail |
| `e2e/resident-live.spec.ts` | One full test: new resident draft/resume/photo/traits → introduction → actual recipient acceptance → persistent two-way live chat → consent-based group creation → majority/any-member admission, four-member cap and new-message-only history → outsider/block denial → new lister/public listing → guest login return → inquiry → owner acceptance → private address and live chat |

Eight passing tests is the current acceptance baseline. Fixtures 0–3 serve the listing tests; 4–8 serve the resident/group/viewing test. Start a new run with fresh users for release evidence. Guest-only tests may run alone without fixtures; direct integration specs deliberately skip without fixtures, which is **not** completed integration verification.

If Chromium is absent, use installed Chrome/Edge through `PLAYWRIGHT_CHANNEL` or install the Playwright browser where allowed. If browser processes are sandbox-blocked, use the supported execution escalation with the concrete test command. Missing service credentials do not block ordinary client testing. Diagnose one failure before retrying; do not replace assertions with sleeps. Use the runner's trace on retry/temporary debug capture when needed, and review authentication/private data before sharing artifacts.

Realtime lessons: authenticate the channel with the current session before subscribing; use a unique channel per mounted effect; wait for both subscription and replication readiness; catch up and deduplicate by server message sequence. Tests must observe recipient delivery without reload and then verify reload persistence. Do not label a joined socket as a passing chat test.

## 5. Explicitly dispose of temporary fixtures, or retain owner demos

The owner currently wants useful synthetic demos retained. **Do not run disposal for retained demos.** Keep their ignored fixture manifests, uploads and evidence for inspection. A failed test does not authorize deleting a retained demo or reusing it as a pristine fixture.

When this exact run is explicitly being discarded, retain its manifest until all cleanup is verified. Completed canonical residents protect their last gallery/Storage photo. First review `.qa/prepare-cleanup.sql` against the current target and exact IDs, then apply it through the authorized database connector. New runs generate this ignored SQL automatically. For a run created before that file existed, generate it locally (no remote action):

```powershell
# From web; requires explicit disposal intent, generates SQL only.
node scripts/qa-fixtures.mjs prepare-cleanup --discard-fixtures
```

Use the same `QA_FIXTURE_COUNT`, `QA_FIXTURE_PREFIX`, `QA_FIXTURE_MANIFEST` and `QA_FIXTURE_DIRECTORY` environment overrides used to prepare a custom run; never point the default helper at unrelated manifests. The generated disposal-preparation transaction verifies exact expected QA emails, rejects conversations/groups with outside participants or administrators, locks only these fixture profiles, and sets only their `onboarded=false`. It preserves fixture identities and owner sign-in so Storage removal can use ordinary owner permissions. This is scoped fixture disposal SQL, not an application RPC, schema migration or permission bypass available to users. Do not apply it to retained demos or real users, and do not broaden a failed external-peer guard.

After that transaction succeeds on the confirmed target:

```powershell
npm run qa:storage
```

The Storage helper signs in and preflights **every** exact fixture before deleting any object's bytes. If any profile is still completed, or any identity/target check fails, it stops before deleting either bucket and explains the preparation step. Once all fixtures are explicitly de-onboarded, it removes only their UUID-prefix objects in `apartment-photos` and `profile-photos` through ordinary owner Storage APIs and signs out. It refuses unexpected nested folders. Never delete Storage metadata using SQL. Avoid concurrent fixture editing or onboarding during this disposal window; recover from an unexpected failure using the exact ignored run manifest rather than widening scope.

Apply `.qa/cleanup.sql` with the same authorized database connector/project. It guards exact IDs and expected QA emails, refuses mixed conversations/groups or leftover Storage objects, deletes only fixture conversations/groups/listings/sessions/users in one transaction and relies on existing foreign-key cascades. Do not broaden a failed guard; inspect the specific dependency. Then execute `.qa/verify.sql`. All five results (users, profiles, listings, groups, Storage objects) must be zero.

Only after observing those zero counts:

```powershell
npm run qa:forget -- --verified-clean
```

This removes the temporary credentials and SQL files, including `prepare-cleanup.sql`. If cleanup fails, keep ignored files for recovery and record the IDs and failed step in the owning handoff without passwords. Stop only the server started for this run. For the next run, use fresh fixtures rather than silently reusing onboarded accounts.

## 6. Record the outcome

Update the workstream and `PROJECT_STATUS.md`: date, checkout/commit, server type, live migration versions, exact command, passed/failed/skipped counts, real journey/privacy assertions, cleanup counts and remaining limitations. Distinguish a local passing suite from a deployed commit. Update `docs/WORKTREE_INVENTORY.md` with `node scripts/project-status.mjs --write --shared` when Git ownership/state changes.

The existing suite proves password-login journeys; it does not prove an entire external Google consent flow, load/concurrent transaction behavior or full translation of older Map/Settings/profile-editor screens. Extend tests when those areas change. A real interactive MFA/consent/CAPTCHA or unavailable required account permission can require a narrow user action; state the exact blocker, finish independent checks and explain how the automated run resumes. Do not assign the entire testing job back to the user.

## Focused contracts, unread and adult-resident checks (19 October 2026)

From `web`, `npm run test:contracts` runs the typed 31-category/locale/privacy/config contracts, test-only C2/C13 scoring reference and cross-platform packet selector checks (Node 24 is used in the cloud). `npm run test:age` runs disposable PGlite adulthood/rollback/direct-edit assertions. The production matching algorithm is not replaced by the reference.

With this run's nine exact-ID fixtures prepared/checked, `npm run test:unread` runs the real HE desktop/EN 390px chat sequence/read/reconnect journeys in a headed browser. It disables Playwright's per-page focus-emulation override on the background thread so the visibility/focus assertions exercise native browser state. A headless browser's default all-pages-focused behavior is not evidence of background-tab correctness. Use a virtual X display in a cloud environment without a desktop; keep Xvfb and Playwright in the same command/process tree and stop only the owned display. Local app URL may be selected with `PLAYWRIGHT_BASE_URL`.

`node scripts/qa-chat-authorization.mjs` (from `web`) uses only this run's fixture indices 5/6/4 to assert ordinary-client outsider isolation, protected marker columns, concurrent retry idempotency and symmetric block denial. It removes only its exact newly created temporary block and retains the demos. `node scripts/qa-resident-age.mjs` uses only the pristine index4 account to verify age17 draft, rejected completion/rollback, exact18 completion and direct-DOB guards; it intentionally refuses to re-run on a completed demo. Prepare a separate exact-ID fixture run when a new pristine test is needed. Both scripts save credential-free results in ignored `.qa`.

Cloud networking: Node 24 ordinary clients/server may need `NODE_USE_ENV_PROXY=1`. Set `PLAYWRIGHT_PROXY_SERVER` only when the configured managed proxy is needed; localhost/127.0.0.1 are bypassed for the owned local app. Preserve certificate verification. Owner explicitly approved trusting this environment's managed proxy CA for browser testing after automatic review explained the trust-store change; this is scoped to the test cloud environment, never an instruction to disable TLS or alter a production user's device. Import the configured public CA only in an execution context with the authorized NSS-store write permission, and launch the browser in that context. No credential values belong in logs, traces, status files or Git.

The guest/auth suite honors `PLAYWRIGHT_BASE_URL`, including the actual production public alias. `PLAYWRIGHT_EXECUTABLE_PATH` optionally selects an already installed Chromium executable; otherwise Playwright uses its usual browser/channel configuration. This only changes the test harness and never disables certificate verification.
