# Autonomous verification workflow

Read this when implementing or verifying a vertical slice. First read the repository's `docs/TESTING.md` (or its equivalent). Use its maintained commands and fixture helpers; do not rediscover the whole project or send the user a manual checklist in place of running available tests.

## Establish what can be run

1. Read the workstream's acceptance criteria, current HEAD/local changes, package scripts and relevant live migration state. Identify which assertions require a browser, ordinary authenticated client, database or Storage/Realtime.
2. Discover connected database/browser tools and installed runtimes. Missing service credentials do not imply testing is impossible: an authorized database connector can provision isolated users while browsers and API assertions use ordinary user sessions. Never ask the user to reveal passwords or service keys.
3. Prefer an isolated local backend or configured test project. If the project uses one shared backend, confirm existing authorization for temporary fixture writes and migrations separately. Prepare the concrete test plan/scripts before any necessary permission question. Authorization to implement does not authorize arbitrary production schema changes.
4. Install declared dependencies using the project's lockfile. If a bundled browser is missing, try the installed Chrome/Edge channel supported by the runner, or install the runner's browser where permitted. A failed first launch is a repair step, not proof the user must test manually.

## Execute a whole user journey

- Run relevant syntax/type/lint/build checks and local SQL/RLS tests. Passing these alone does not prove a connected feature works.
- Use fresh, uniquely named fixture users and data; record exact IDs in ignored run files. Never use personal accounts, enumerate private user data, or send mail to real addresses for convenience. Do not overwrite an unfinished run's cleanup manifest.
- Run the real browser flow against the intended checkout/server. Use distinct browser contexts for sender, recipient and outsider. Perform the visible action, assert persisted state, reload, and assert the recipient's result. Exercise denial as an ordinary outsider, not a privileged client. Check private fields through public projections and forbidden reads.
- For chat, verify live delivery without refreshing, refresh persistence, duplicate prevention and new-member history boundaries. Await actual replication readiness and perform catch-up; a joined WebSocket alone is not delivery evidence.
- Use polling assertions for observable state. Do not replace asynchronous readiness with arbitrary sleeps, disable authorization, mock the changed path, or weaken assertions merely to obtain a green run.
- If localhost is occupied, identify the process and checkout first. Reuse only a server from the intended checkout. Stop only processes started by this run. Keep secrets out of command output, traces, screenshots and commits; review any artifacts before sharing them.

## Repair, clean and report

On failure, inspect the smallest useful trace/log and reproduce the failed assertion. Fix the product or test synchronization cause, then rerun the affected test and the related acceptance set. Do not claim skipped tests passed. Do not repeatedly rerun already-passing checks without a code change or unresolved concern.

Cleanup is part of acceptance, including failure and interruption: remove fixture uploads through the owner Storage API before deleting fixture database rows; revoke sessions; delete only recorded fixture IDs with identity guards. Query that users/profiles/listings/groups/objects are gone. If cleanup fails, retain ignored recovery credentials/manifests, record IDs without passwords in the owning handoff, and finish cleanup before claiming completion. Never use blanket deletes or delete Storage metadata via SQL.

Update the work register with command, date, checkout/commit, environment/migrations, passed/failed/skipped counts, journey assertions and cleanup counts. Distinguish local verification, integration, push, deployed commit and public-launch readiness. Commit/merge/push only when requested or already authorized.

## When a human action really is required

First try the available runner, browser channel, connector and isolated fixture method. Human involvement is justified only by a specific dependency such as interactive identity-provider consent/MFA/CAPTCHA, an unavailable required tool/account permission, or an actual approval rejection. State the failed action and evidence, which checks still ran, the narrow action needed and how testing resumes. A missing reusable test, service-role key or pre-created QA account by itself is not a reason to assign the whole test back to the user. Existing approval persists within its stated scope; do not ask again for the same approved QA operation.
