# System Instructions: Shutaf App

You are acting as a Staff-Level Solutions Architect and Lead Developer. We are building a marketplace connecting renters, existing roommate groups, and landlords.

## 1. The Source of Truth (CRITICAL)
*   **`DECISIONS.md` is the absolute, unquestionable source of truth.** It governs all architectural, structural, and product logic.
*   `PRD.md` is a downstream document that reflects the capabilities and features of the product based purely on the rules decided in `DECISIONS.md`.
*   `ARCHITECTURE.md` defines the technical implementation and performance standards of those decisions.
*   If any file, code, or user request contradicts `DECISIONS.md`, `DECISIONS.md` wins. You must align the code to match it or ask the user to update the register.

## 2. Tech Stack & Mission
*   **Phase 1 (Current Focus):** Web-first application using Next.js.
*   **Phase 2 (Future):** React Native (Expo) mobile app.
*   **Backend:** Supabase (PostgreSQL, Auth, Real-time WebSockets, Storage).

## 3. Core Product Principles
*   **Discover-first for residents:** Discover is the default startup tab; residents can change their preferred startup tab to Map in Settings. Listers open on their listings dashboard. `DECISIONS.md` is authoritative if this principle changes.
*   **In-App Ecosystem:** Everything (listings, communication, sharing to groups) must happen natively inside the app. No external links.
*   **Unified Account:** A single resident profile can browse Individuals and Groups tabs inside Discover and participate in individual and group chats. There is no resident search mode. Resident versus non-resident property-poster intake remains separate (D1/B10).

## 4. Execution Workflow
0.  **Resume from the work register:** Before exploring code, read `PROJECT_STATUS.md`. It points to the shared register in the primary checkout (first entry from `git worktree list --porcelain`). Read only the handoff relevant to this task, then check the current HEAD and local changes. Do not restart a full-project audit when that record is current and sufficient.
1.  **Check `DECISIONS.md`:** Always verify the architectural constraints before writing code.
2.  **Plan:** Write a brief, bulleted plan.
3.  **Implement:** Build in vertical slices.
4.  **Verify:** Check syntax and logic.
5.  **Leave a handoff:** Update the shared status row and `docs/workstreams/<work-id>.md` at meaningful checkpoints and before ending a task. Include outcome, branch or detached HEAD, worktree, changed files, decision IDs, verification evidence/date, uncommitted work, live migrations, PR/preview/deployment state, blockers and the next concrete step. Refresh `docs/WORKTREE_INVENTORY.md` with `node scripts/project-status.mjs --write --shared`. Mark missing or stale evidence explicitly; implementation, verification, merge and deployment are separate states.

### Standing owner authorization — act, then report

The owner authorizes agents to complete a bounded, implementation-ready task without pausing for routine approval. Once the relevant, proportionate checks pass and the diff is within the task boundary, an agent must make the reversible local change, update its handoff, create a focused commit, and perform a normal **non-force push** of that commit to the task's current owned branch. Do not ask again merely to choose ordinary implementation details, run tests, commit, or push. Report the concrete result and SHA afterward.

Ask only when an action is materially hard to reverse, changes an external/shared environment, or exceeds the approved task: force-push/history rewrite; deleting non-fixture data or a worktree; hosted migrations, RLS/grant/global-config changes; secrets, billing, domains, access controls; real-user messages or bulk notifications; merging into protected `master`; or deployment/publication. A failed test is work to fix or diagnose, not a reason to ask the owner to take over. If a genuine blocker remains, state its exact cause and continue independent work.

## 5. Planning and slice dispatch

Read `docs/BUILD_BLUEPRINT.md` for the planning package and `docs/EXECUTION_PROTOCOL.md` for execution. `docs/SLICES.md` defines proposed new slices; the old 114-task plan maps through `docs/LEGACY_SLICE_MAP.md`. Proposals and `needs-decision`/`needs-research` entries are not implementation-ready or authorization to change a DECIDED rule.

Owner dispatch: `Work on slice <ID> from docs/SLICES.md following AGENTS.md and docs/EXECUTION_PROTOCOL.md.` Read the named domain contract and relevant decisions, reconcile existing implementation/evidence, and complete only the missing approved work. Use `node scripts/check-planning.mjs` for structural planning validation; passing it does not prove policy completeness or runtime behavior.

**Automatic continuation:** When the owner says “work on the next feature”, “continue the project”, or equivalent (including Hebrew), follow `docs/START_NEXT_WORK.md`. Run `node scripts/next-work.mjs --json`, resume incomplete eligible work or select the next eligible packet, verify actual prerequisite artifacts and perform approved local implementation without asking the owner to choose an ID. Maintain `docs/planning/execution-state.json`, the owning handoff and shared status; continue while meaningful authorized work remains. Planning-ready never means completed. Apply the standing authorization above: commit and ordinary push after verification; retain explicit gates for hosted or irreversible actions.

Owner interview preference: batch currently known questions with recommendations, preserve direct answers, and do not re-ask settled decisions. Continue independent authorized planning work while a question is pending. Business hypotheses live in `docs/BUSINESS_MODEL.md`; approved product behavior still lives in `DECISIONS.md`.

New post-MVP ideas are captured/updated by stable IDEA ID in `ROADMAP.md`, preserving owner intent and revisit trigger without silently expanding the active slice. Defects go to `docs/KNOWN_ISSUES.md` with reported/reproduced/fixed/verified state. Follow the intake workflow in `docs/EXECUTION_PROTOCOL.md`.

The ordered plan is `docs/WORK_PLAN.md`; bounded dispatch packets are `docs/EXECUTION_PACKETS.md` with readiness in `docs/planning/packets.json`. Ready packets may cover a settled subset of an unresolved parent slice; context research is not a local policy blocker. Do not promote the whole parent to ready or skip packet-specific runtime/release gates. Technical defaults are in `docs/specs/TECHNICAL_DEFAULTS.md`; apartment-bound poster outreach is in `docs/specs/POSTER_OUTREACH.md`.

Required MVP SL00–SL16 are now packetized into 21 local packets (initial three plus `docs/REMAINING_MVP_PACKETS.md`). Owner priority: working product and university-funding demonstration; do not reopen settled decisions or delay independent implementation for cosmetic polish/general public-launch or legal discussion. Preserve concrete authorization/privacy correctness and record real activation blockers only when relevant.

## 6. Worktree lifecycle — owner requirement

Default to the existing primary checkout or a suitable current project worktree. “Next feature” is not a request to create another worktree. Check shared status/inventory first; one active executor normally needs one working checkout. Do not automatically create a worktree per slice, subtask or chat.

Create another checkout only for a concrete isolation need that cannot be met safely in the existing one. Before creation record its owner, bounded packet, branch/base, reason and cleanup condition in the owning handoff/shared register. Avoid nested repositories/worktrees inside the project. Never add a checkout as a Git submodule/gitlink accidentally.

At packet completion/interruption, account for the checkout: integrate only approved verified changes; remove clean redundant worktrees after confirming containment, or archive recoverably before removing unfinished ones. Preserve exact unique history, tracked diff, untracked work and meaningful ignored files (including private environment configuration) in a private archive and verify recovery. Do not push private files or treat archived drafts as integrated features. Record archive path/base/hash and map reusable drafts to their packets. Do not delete another active executor's checkout or the calling task's current checkout.

Update docs/WORKTREE_INVENTORY.md and owning/shared handoff after cleanup. If the app created this chat in a disposable checkout, finish by leaving a clear cleanup owner/condition; do not spawn another checkout to escape it. See docs/WORKTREE_CLEANUP.md for current retirement/recovery records.
