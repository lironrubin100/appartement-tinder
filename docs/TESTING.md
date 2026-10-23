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

### Isolated Docker baseline when migrations lack a bootstrap

The tracked migrations begin after the original schema was installed, so `supabase start` in a fresh project can fail on missing `profiles`. On 20 October 2026, an isolated copy of `supabase/` successfully replayed the migration chain after an earlier local-only bootstrap migration containing `supabase/schema.sql` and `supabase/rls.sql` from Git commit `a0ca6aa`, in that order. Set a unique local `project_id`, check ports and existing containers first, and never add this historical bootstrap migration to the production chain. The current schema snapshot cannot replace it because it already contains later structural changes. See the SL02 and location-privacy handoffs for exact evidence and outstanding gaps.

The canonical profile and SL02 listing photo ownership functions currently pin the shared project's public Storage origin. For an isolated local acceptance run, their origins were replaced only inside the disposable database with its local API origin; this tests ownership behavior locally but does not establish portable configuration or a live migration. Set local URL/key only in the test process, verify the target is the intended loopback service, and never print credentials. Local browser results and PGlite do not prove hosted changes, live provider coverage, or production acceptance.

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

The eight-test result is the historical 15 October acceptance baseline, not the count or completeness of the current expanded suites. Fixtures 0–3 serve the listing tests; 4–8 serve the resident/group/viewing test. Start a new run with fresh users for release evidence. Guest-only tests may run alone without fixtures; direct integration specs deliberately skip without fixtures, which is **not** completed integration verification.

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

Password-fixture suites prove those tested login journeys; they do not prove an entire external Google consent flow or load/capacity behavior. The canonical profile/editor now has dedicated HE/EN evidence below; that does not establish full translation of unrelated older screens. Extend tests when those areas change. A real interactive MFA/consent/CAPTCHA or unavailable required account permission can require a narrow user action; state the exact blocker, finish independent checks and explain how the automated run resumes. Do not assign the entire testing job back to the user.

## Focused contracts, unread and adult-resident checks (19 October 2026)

From `web`, `npm run test:contracts` runs the typed 31-category/locale/privacy/config contracts, test-only C2/C13 scoring reference and cross-platform packet selector checks (Node 24 is used in the cloud). `npm run test:age` runs disposable PGlite adulthood/rollback/direct-edit assertions. The production matching algorithm is not replaced by the reference.

With this run's nine exact-ID fixtures prepared/checked, `npm run test:unread` runs the real HE desktop/EN 390px chat sequence/read/reconnect journeys in a headed browser. It disables Playwright's per-page focus-emulation override on the background thread so the visibility/focus assertions exercise native browser state. A headless browser's default all-pages-focused behavior is not evidence of background-tab correctness. Use a virtual X display in a cloud environment without a desktop; keep Xvfb and Playwright in the same command/process tree and stop only the owned display. Local app URL may be selected with `PLAYWRIGHT_BASE_URL`.

`node scripts/qa-chat-authorization.mjs` (from `web`) uses only this run's fixture indices 5/6/4 to assert ordinary-client outsider isolation, protected marker columns, concurrent retry idempotency and symmetric block denial. It removes only its exact newly created temporary block and retains the demos. `node scripts/qa-resident-age.mjs` uses only the pristine index4 account to verify age17 draft, rejected completion/rollback, exact18 completion and direct-DOB guards; it intentionally refuses to re-run on a completed demo. Prepare a separate exact-ID fixture run when a new pristine test is needed. Both scripts save credential-free results in ignored `.qa`.

Cloud networking: Node 24 ordinary clients/server may need `NODE_USE_ENV_PROXY=1`. Set `PLAYWRIGHT_PROXY_SERVER` only when the configured managed proxy is needed; localhost/127.0.0.1 are bypassed for the owned local app. Preserve certificate verification. Owner explicitly approved trusting this environment's managed proxy CA for browser testing after automatic review explained the trust-store change; this is scoped to the test cloud environment, never an instruction to disable TLS or alter a production user's device. Import the configured public CA only in an execution context with the authorized NSS-store write permission, and launch the browser in that context. No credential values belong in logs, traces, status files or Git.

The guest/auth suite honors `PLAYWRIGHT_BASE_URL`, including the actual production public alias. `PLAYWRIGHT_EXECUTABLE_PATH` optionally selects an already installed Chromium executable; otherwise Playwright uses its usual browser/channel configuration. This only changes the test harness and never disables certificate verification.


## Canonical profile and release verification — 20 October 2026

Use the [canonical profile handoff](workstreams/2026-10-19-sl01-canonical-profile.md) for source/deployment/date-specific evidence. Application `39fdcee4982bc8184181dc7cf4d061f4402b93c0` is included unchanged in final release `2877c38a21e2b183805451a265354a19aa64faf2`, mapped to READY Production `dpl_CmU7JB992cBpTMvRf4DivtAcHZGA`; the source/live migration mapping is in [DATA_CONTRACTS](specs/DATA_CONTRACTS.md#implemented-profile-and-chat-contracts--20-october-2026). Read those records before treating an older fixture setup or suite count as current. No test command below authorizes a new target or disposal of retained demos.

### Local SQL, manifest and contract checks

```sh
# Repository root; Node 24 supports the TypeScript manifest imports.
node scripts/test-canonical-profile-sql.mjs
node scripts/generate-profile-schema.mjs --check
node scripts/test-resident-sql.mjs
node scripts/test-resident-age.mjs
node --test scripts/test-contracts.mjs scripts/test-next-work.mjs
node scripts/check-planning.mjs
```

The canonical PGlite suite loads both reviewed profile migrations and validates 53 resident manifest-option mappings plus required fields/adulthood, photo metadata ownership, disclosure/private fields, names, revision/request-key semantics, lister editing/adult declaration, retained-data conversion, group/trait guards and incomplete intake correction. It connects to no hosted project. The separate resident/chat suite verifies sequence/read/send authorization and retries; `test:age` retains the earlier narrow age suite. The contract/selector result recorded for this release is 20 passed. `generate-profile-schema --check` detects SQL definition drift from the TS manifest; it is not a migration application or runtime acceptance test. Production C13 scoring is still separate from the test-only oracle.

### Fresh profile fixtures versus retained-demo checks

The canonical scripts use their own ignored `.env.profile-qa.local` credentials and `.qa/profile/run.json` target/ID record, rather than the default `.env.qa.local` run. Prepare a fresh profile run only when fresh onboarding is needed, using the fixture helper's `QA_FIXTURE_COUNT=9`, `QA_FIXTURE_PREFIX=qa-profile`, `QA_FIXTURE_MANIFEST=.env.profile-qa.local` and `QA_FIXTURE_DIRECTORY=.qa/profile` overrides. Apply only that run's reviewed provisioning SQL and run its helper check with the same overrides. Never overwrite a retained manifest. A different `PROFILE_QA_MANIFEST` may be supplied to `canonical-profile.spec.ts` for a separately provisioned fresh browser fixture; retained-demo suites have their own fixed-manifest expectations.

| Command/file, from `web` | Fixture/side-effect boundary and actual evidence |
| --- | --- |
| `node scripts/qa-canonical-profile.mjs` | Fresh profile-run indices 3–8 only; indices 0–2 reserved for browser intake. Refuses preexisting completed/canonical/gallery state. Nine ordinary-client scenario groups passed on 19 October: actual PNG upload/byte fetch, forged/foreign photo rejection, required-field atomic rollback, fresh-session draft reload, concurrent CAS/idempotency, private full name/preferences/disclosure, lister consent/edit/conversion, actual accepted chat/group admission and group-conversion refusal. Retains useful demos/photos/chats; report `.qa/profile/acceptance.json`. Do not rerun it against those now-completed accounts. |
| `npx playwright test e2e/canonical-profile.spec.ts --workers=1 --headed` | Fresh canonical HE desktop/EN 390px intake, owned JPEG upload, draft/resume, required core facts, private preferences and consciously disclosed fields; also new lister completion/edit. Original corrected checks are separately dated in the handoff. Requires fresh fixture ownership; an earlier test-only lister redirect assertion was corrected, and a separate fresh final lister run passed 1/1. |
| `npx playwright test e2e/canonical-discovery.spec.ts --workers=1 --headed` | Original 19 October 1/1 check verified abbreviated peer name, localized disclosed canonical fact and a real trait-attached introduction. It changes the designated sender's pass/introduction state; it is not a read-only sweep or an authorization to rewrite other retained fixtures. |
| `node scripts/qa-canonical-age.mjs` | Existing profile-run index 5 only. Reads current own payload/revision, rejects DOB one day beyond the actual server cutoff with zero mutation, accepts the exact cutoff/idempotent retry, then restores original DOB and all other fields through the same RPC; revision increases exactly twice. Requires freshly queried server-clock evidence described below. Saves `.qa/profile/age-boundary.json`; does not create fixtures or replace photos. Passed again on 20 October using server cutoff 2008-10-20 (2008-10-21 rejected). |
| `node scripts/qa-profile-photo-guard.mjs` | A separate fresh single-account `qa-photo-guard` run only, under `.env.photo-guard-qa.local` / `.qa/photo-guard`. Actual sole-gallery DELETE and sole-object Storage API removal must fail; cache-busted retrieval must still return exact PNG bytes. 19 October passed: Storage 500/P0001, subsequent GET 200/exact bytes, gallery/primary unchanged. It retains that demo. Never repurpose a previous demo for this destructive-negative check; the script's isolated new-path recovery is only for its own new synthetic object if Storage unexpectedly removes bytes. Report `.qa/photo-guard/acceptance.json`. |

For the repeatable age check, query the confirmed project's server clock read-only through the connector:

```sql
select current_date::text as server_date,
       (current_date - interval '18 years')::date::text as adult_cutoff,
       ((current_date - interval '18 years')::date + 1)::text as next_day;
```

Write only those returned values plus `target` and `observed_at` into ignored `.qa/profile/server-age-clock.json`; the script requires evidence less than one hour old. Do not calculate the authoritative cutoff from the device clock, hardcode yesterday's date or expose credentials. A DOB-restoration failure must be recovered on that exact fixture and recorded before continuing.

### Actual deployed regression, distinct from original onboarding

From `web`, the recorded 20 October release runner was:

```sh
PLAYWRIGHT_BASE_URL=https://appartement-tinder.vercel.app \
PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium \
npx playwright test e2e/profile-persistence.spec.ts e2e/chat-unread.spec.ts \
  e2e/resident-auth-guest.spec.ts --workers=1 --headed
```

The optional executable path is for the cloud's installed Chromium; use the appropriate browser setting on another machine. Run headed/native-focus checks within an owned display/Xvfb session, with the managed proxy/CA setup above when required. This command does not start or deploy the application: the base URL chooses the actual target, whose backend still must be checked independently.

Actual Production result: **9/9 passed in 1.6 minutes**, with no mocked routes or skips. It rechecked two-browser HE/EN sequence unread/visible read/reconnect/retry, retained resident/lister private editor/startup persistence/signout, and guest/deep-link/callback safety. It did not rerun fresh onboarding on the already retained browser users. The same day's separate ordinary release privacy/photo checks passed four scenario groups; the exact server age boundary and four chat authorization scenario groups were rechecked, with only the newly created temporary block removed. No new schema migration was needed for that release review. Refer to the handoff for the exact runtime-log window and individual original intake/discovery dates; a READY deployment alone is not this acceptance evidence.

Full Google interactive account/provider/callback acceptance remains **unexecuted**. The recorded 302 start redirect to Google proves provider configuration/start only. Keep that SL01.2 assertion verification-incomplete, while distinguishing the bounded canonical functionality actually implemented and verified. Current UI/server text length counting also differs for some emoji-heavy strings; neither SQL-option parity nor the browser suites should be described as resolving that known limit.


## Bounded owner UX continuation — 22–23 October 2026

From `web`, `e2e/owner-ux.spec.ts` requires the retained `.env.qa-sl01-card.local`, `.env.qa-sl01-lister.local` and `.env.qa-sl04-empty.local` synthetic manifests. With an owned server and `PLAYWRIGHT_BASE_URL` / an installed `PLAYWRIGHT_CHANNEL`, run it alongside `e2e/location-confirmation.spec.ts` (set `QA_FIXTURE_MANIFEST=.env.qa-sl01-card.local`) and `e2e/resident-auth-guest.spec.ts`. The 12 owner UX tests cover HE/EN phone/desktop ordered local writes, acknowledged close/Escape/reopen, photos, failed local writes, confirmed local discard and read-only owned-card/profile/empty/public-owner navigation. Acceptance failure is injected by aborting the action before the server; no existing inquiry is accepted. Set `UX_SCREENSHOTS` to this run's evidence directory if screenshots are wanted. Traces/video are disabled for credential safety.

`e2e/owner-ux-live.spec.ts` is an **explicitly authorized two-listing workflow**, disabled unless `UX_LIVE_JOURNEY=1`. It creates only two new synthetic listings using the retained lister, receives requests from the retained resident, accepts those requests into chats/address grants and marks only those new listings rented. Photos/listings/chats are retained. Durable `.qa/owner-ux/live-he.json` and `live-en.json` records prevent retries from silently creating extra fixtures; an uncertain publication with no exact titled owner row fails for receipt reconciliation. Do not delete these records or reuse this workflow as a generic clean slate. The 22–23 October owner authorization is for these two records only. Refer to the workstream for actual run/production results, not this command description as proof.


## Cloud draft service adapter — task 2.19

From `web`, `node --test scripts/test-draft-services.cjs` runs validation/row-decoding/cursor/auth/error unit checks without a database. `node scripts/qa-draft-services.cjs --allow-private-fixtures` runs actual `draft-actions.ts` functions against ordinary authenticated Supabase clients supplied at the Next cookie-client boundary; SQL/auth/RPC/query results are real. No test endpoint or UI is added to production. This is server-service acceptance, not browser cloud-draft acceptance.

The live helper is scoped to the existing synthetic `.env.qa-sl04-empty.local` owner and `.env.qa-sl01-card.local` outsider, with exactly two new private draft receipts/IDs retained in ignored `.qa/task219/manifest.json`. It never edits previous fixtures, creates a listing, uploads media, sends a message or invokes delete/complete. It verifies create idempotency, signed bounded pages, two competing saves/one conflict, fresh-session persistence and outsider/anonymous/foreign-source/forged-fields denial. Reuses the same two receipts on repeat; do not remove the manifest to get a fresh run. Local `LISTING_DRAFT_CURSOR_SECRET` must be present but is never printed. Production/Preview have distinct sensitive signing keys, explicitly approved by the owner; see CONFIG_KEY_INVENTORY.

## Private listing draft media (task 2.20)

`node scripts/test-resident-sql.mjs` wires `plan_listing_draft_media.sql` into disposable Postgres with Storage RLS enabled. It checks private bucket access, immutable bytes, exact owner/draft association, revision conflicts, publication freeze, unreferenced cleanup and preservation of published source photos. This is database evidence, not the Storage HTTP service.

From `web`, `node scripts/qa-draft-media.cjs --allow-private-fixtures` uses ordinary retained synthetic lister/outsider credentials and the exact project guard. It creates/reuses only its two durable private draft receipts in ignored `.qa/task220/manifest.json`; it never resets existing demos. It checks actual upload/download, signed preview, public URL denial, guest/outsider replacement/deletion/association denial, concurrent revisions and a synthetic freeze/cancel. One new private associated image and both drafts remain for inspection; only the exact unused test image is removed. Do not log the generated signed URL. No public listing is created. Future cloud-media UI acceptance remains separate.

## Draft media adapter (task 2.21)

From web, run `node --test scripts/test-draft-services.cjs scripts/test-draft-media.cjs`. The media tests exercise unsafe persisted envelopes, anonymous/sanitized errors and published-image routing without copy/delete.

`node scripts/qa-draft-media-services.cjs --allow-private-fixtures` executes actual TS adapters through real ordinary client factories. Real Chrome tests compression/corrupt input and renders a fresh-session authorized private preview in a separate context. Exact-path HTTP fault injection proves interrupted upload preservation, lost-response byte reconciliation and conflict rejection; a real in-memory session change during signing proves old-account results are suppressed. The harness keeps exactly its two new private draft receipts/five JPEG identities, stable prepared bytes and credential-free manifest under ignored `.qa/task221/`. No public listing is created and no previous demo is reset. Temporary URLs are neither logged nor stored. This is service/Storage/browser image evidence, separate from future cloud composer/action HTTP integration.

## Explicit legacy draft import (task 2.22)

From web, `node --test scripts/test-draft-services.cjs scripts/test-draft-media.cjs scripts/test-draft-import.cjs` covers unsafe envelopes, expected-account preconditions, no deletion for already-published attempts and media/privacy contracts. `node scripts/test-draft-store-browser.cjs` uses isolated real Chrome IndexedDB to check version-1 upgrade/File preservation, blocked-open recovery, concurrent tabs and reload-stable receipts; it has no cloud writes.

`node scripts/qa-draft-import.cjs --allow-private-fixtures` runs actual import/store/media modules with real browser Supabase SDK, canvas and IndexedDB. The Next server-function boundary bridges to actual TS actions with ordinary signed-in clients. Exact-path upload/download faults, local transaction abort and actual account switch validate source retention. A concurrent local edit must return sourceRemoved false and survive; the next explicit import creates its own snapshot. Do not treat skipped completed phase markers as newly replayed faults: the persistent ignored QA profile preserves exact receipts, while an unconditional final audit rechecks every draft/reference/download digest and absence of cross-account rows. Six private drafts/seven private images and one synthetic cancellation tombstone are retained in ignored `.qa/task222/`; no existing public listing/demos are modified. Never reset other demo fixtures to replay this test. The importer remains explicit/standalone until chooser task 2.29; service/binding evidence is separate from deployed UI/HTTP acceptance.
