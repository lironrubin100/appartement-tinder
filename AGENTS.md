# Shutaf project instructions

Web-first roommate/apartment marketplace: Next.js, Supabase; Expo is later.

## Authority and focused reading

- DECISIONS.md owns approved product/architecture rules. PRD, ARCHITECTURE and domain specs are downstream. Preserve settled rules; ask about an actual contradiction/new product choice.
- Read primary PROJECT_STATUS.md and the latest checkpoint of the owning workstream, then check HEAD/local changes. The primary is the first entry of git worktree list --porcelain.
- Execute through docs/START_NEXT_WORK.md and docs/EXECUTION_PROTOCOL.md. Read only the selected task, named decision rows, relevant contract sections and affected source. Do not reload the planning library or repeat a project audit for ordinary work.
- Phone planning writes only docs/BUSINESS_MODEL.md under its planning-agent boundary. On a named CHANGE/PR handoff, reconcile that entry into canonical decisions and the existing execution plan; no automatic priority change or whole-project re-audit.
- Residents start on Discover (Map preference allowed); listers start on My Listings. One resident profile supports Individuals/Groups. D1/B10 separate property-poster intake. Native public apartment links are allowed under E8; no external listing/communication ecosystem under D0.

## Owner authorization

- Owner update, 25 October 2026: advance through the approved queue without per-task permission. Finish and record one bounded outcome, then continue while meaningful authorized work remains. Stop for a concrete blocker, new product decision or critical action. A specifically requested single-task limit still applies to that dispatch.
- Standing publication authorization, 19 October 2026: after proportionate checks, commit, normal non-force push, integrate into the intended production branch and publish routine approved changes without asking again. Verify exact source/deployment and report actual acceptance gaps. Documentation by itself never authorizes unrelated work.
- Critical actions need explicit owner approval: destructive/irreversible operations, force/history rewrite, paid commitments, substantial risk to real-user data or privacy/authorization, and material new scope. Never print/commit credentials or send real-user/bulk messages without explicit authorization.
- Prefer isolated local Supabase. For reviewed approved-feature migrations, immediately recheck target project ref, live history, current Auth/data state and executor ownership. The standing 18/24 October authorization permits the shared project only with recorded demo/QA-only data and no competing migration owner. Ambiguous/real-user state requires fresh scoped authorization. Preview is not backend isolation; no paid resource is authorized.
- Preserve owner-retained demos/private manifests. 25 October preference: dedicated reusable QA accounts for repeatable scenarios; fresh exact-ID actors only when pristine state is necessary. Existing live data is never reset for convenience. Follow TESTING target/fixture guards.

## Completion and records

- Reuse the current/primary checkout. Create a worktree only for a documented isolation need; record owner, scope/base and cleanup condition first. Never remove another active or the calling checkout. Archive unique history/diff/untracked/meaningful ignored state and verify recovery before retirement.
- Follow web/AGENTS.md for Next.js work. Run applicable type/lint/build, domain and ordinary-client/browser checks; static success is not user-journey acceptance. Keep implemented, verified, integrated and deployed states separate.
- Update existing workstream, shared status row and applicable task/packet state. Keep summaries short: outcome, evidence/target/date, limits and next concrete step. New documents need a distinct necessary role; no copied next-agent prompts or duplicate status files. Refresh inventory with node scripts/project-status.mjs --write --shared at handoff or Git lifecycle change.
- New configurable values update docs/CONFIG_KEY_INVENTORY.md; secrets stay outside app_config. Defects go to docs/KNOWN_ISSUES.md; future ideas by stable IDEA ID in ROADMAP.md. Never promote future scope or change a DECIDED rule silently.
