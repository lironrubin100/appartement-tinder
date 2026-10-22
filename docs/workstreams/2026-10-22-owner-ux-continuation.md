# Owner UX continuation — 22 October 2026

- Outcome: complete the bounded UX review in `docs/handoffs/2026-10-22-next-prompt.md`; do not start task 2.19 or implement the future inquiry inbox.
- Owner: current continuation chat; existing `6b9e`, `codex/implementation-plan`, base b4a4e64. No new checkout. Shared primary has unrelated dirty files; preserve them.
- Reconciliation: b4a4e64 already committed/pushed the original unverified ComposeForm patch to its branch, while remote master is e9f3bcc. It is not yet a verified production release.
- Decisions: D2/D3/D4/D16/B10/F4/I4/I6/I7/I10/I21. Existing device-local draft storage stays device-local; cloud adapter/media/import and full inbox remain later tasks.
- Implementation in progress: save-and-close covers Escape through the form's acknowledgement path; closing unmounts the form so a later opening can autosave again. Redundant dashboard self-link removed; inquiry exceptions recover with localized retry and address-access consequence copy.
- Verification: pending current browser acceptance, type/lint/build and production release. No hosted schema change or migration claim. Reuse retained synthetic fixtures; do not delete their data.
- Cleanup: retain existing checkout and ignored fixtures until inactive and safely integrated or archived; next executor owns retirement. Next: run HE/EN phone/desktop draft/error/photo and management acceptance, then publish verified bounded fixes.

## Current checkpoint — 22–23 October

- Local Chrome: `owner-ux.spec.ts` 10/10 initial tests, manual location confirmation 2/2 and guest/auth 4/4 passed. Additional localized acceptance-abort recovery 2/2 passed; first test-only failures were strict locator collisions with status/route announcer, corrected by scoping. Final suite now contains 12 owner UX tests. HE/EN at 390px and 1280px covers acknowledged close, reopened autosave, ordered delayed writes, latest snapshot, failed write preserving fields/photo, Escape retry, reload and confirmed local discard.
- TypeScript, focused ESLint, isolated owner card and planning validation passed; production build is running. Read-only independent code review found no correctness/security blocker. No schema/API authorization logic changed.
- Additional source/browser fixes: lister Profile navigation was missing; phone cards left ~120px for title/actions; both fixed using existing UI. Nested address suggestions consume Escape before the composer cancel handler. RequestViewing now also recovers from a rejected server action.
- Automatic review initially rejected the broader hosted lifecycle test because fresh synthetic-data/ownership evidence was missing. Owner has now explicitly approved exactly two new synthetic QA listings with inquiries, accepted chats/private synthetic-address grants and rented-state mutation. Retain them and preserve all existing demos. This exact scoped authorization supersedes that test blockage; no schema mutation is authorized/needed.
- Perform these two lifecycle journeys on production after routine deployment so exactly two created listings cover HE/EN deployed behavior. Record exact IDs privately in ignored `web/.qa/owner-ux`; no secrets in tracked evidence. Full inbox/safe requester identity remains future work, and task 2.19 is unstarted.
