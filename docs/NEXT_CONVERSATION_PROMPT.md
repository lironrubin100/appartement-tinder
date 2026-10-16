# Prompt for the next Shutaf development conversation

Historical handoff prompt, retained for evidence. The new planning entry point is [BUILD_BLUEPRINT.md](BUILD_BLUEPRINT.md) and the proposed dispatch catalog is [SLICES.md](SLICES.md). Do not automatically execute the three recommendations below as current scope; check canonical decisions and the active shared handoff. This prompt's dated implementation/test facts are not reverified by the planning task.

Use the project-orchestrator skill. Work on Shutaf in `C:/Users/User/Desktop/appartement tinder`, or the active resident-journeys checkout recorded in PROJECT_STATUS.md if that work is still in progress.

Start by reading the primary checkout's PROJECT_STATUS.md, docs/workstreams/2026-10-15-resident-journeys.md, docs/NEXT_MVP_FEATURES.md, docs/TESTING.md and the relevant DECISIONS.md rows. Confirm Git HEAD/local changes and the live migrations relevant to this task. Do not audit the entire project again or merge a stale branch wholesale. Preserve unrelated worktrees and the nested map experiment.

Current product direction:
- Residents have one personal profile, with Individuals and Groups views inside Discover; no Solo/Group/Room-Filler search mode. Non-resident property posters still use account-only intake/My Listings.
- Groups start at four members, formed from accepted personal connections with explicit invitation consent. Admin/any-member/majority admission is configurable. New members see messages sent after joining only.
- Introductions have no minimum text, with twenty sent per UTC day. Pass persists for thirty days; blocking is symmetric. Only active apartments may newly accept inquiries; exact address is private until owner acceptance.
- Apple signup is deferred. Do not use it as a blocker or implement it in this task.

Baseline: implementation c80e9b2 was merged and pushed to GitHub master on 15 October 2026. Resident/group/inquiry migrations 20261015084833, 20261015084841 and 20261015084850 are applied. Fresh production-server acceptance passed eight real Chrome tests; all temporary users/profiles/listings/groups/Storage objects were cleaned and audited zero. A separate forward test verified the reusable QA helpers and also cleaned all fixtures. Confirm the recorded master commit/push in PROJECT_STATUS.md; never infer deployment from a push. Do not reapply migrations because an old checkout lacks their files.

Then develop these three vertical slices sequentially, using docs/NEXT_MVP_FEATURES.md as the bounded work order:
1. Usable block/report flow from profiles/chats to persisted report review, with real symmetric blocking and privacy checks.
2. Share an apartment card into an existing personal or group conversation, open it in-app, and preserve the new-member history boundary.
3. Owner edits an existing apartment and its available rooms/photos atomically, with current data consistent on My Listings, Map and the public page.

Resolve only the product choices necessary for each slice before dependent code: H2/H3 report categories/reviewer/actions; E8/F3 listing-card messages and unavailable-card behavior; treatment of pending inquiries after no rooms remain. These recommendations are not automatically DECIDED. Reuse the existing privacy model, RPCs, composer and chat components. Shared wishlists (E7), automatic expiry/renewal (D6), landlord contact as a group, payments, Apple and AI matching remain out of scope.

Use one implementation writer for shared schema/chat files. Add the workstream before coding, keep small understandable outcomes, Hebrew/English and RTL/LTR on new UI, and verify each journey in separate real browser accounts. Follow docs/TESTING.md and the orchestrator's references/testing-workflow.md: run npm run test:db, prepare isolated fixtures with npm run qa:prepare and the authorized connector, run npm run test:acceptance, remove owner uploads, apply scoped cleanup, verify zero counts and forget credentials. Extend this suite for each new journey. Execute testing yourself; do not substitute a manual checklist because QA accounts or a service key are absent. Escalate only a specific unresolved dependency. Follow applicable approval requirements for shared schema changes and publication; do not assume this prompt approves new destructive production changes.

Keep PROJECT_STATUS.md and the owning handoff current with changed files, dated evidence, migrations, commit/push/merge/deployment state and exact next step. Finish with what works, what is still limited, and the next actionable step. Keep source, verification, integration and deployment distinct.
