# Implementation plan SL04 — owner management

- Owner decision21October2026; implementation has not started. Planning publisher: f185 at base6d24755; executor continuation: existing6b9e checkout after updating from master. No extra worktree required.
- Bounded SL04.2 tasks are enumerated in execution-state.micro_task_dispatch; first4.9, last4.19. Existing 4.6 remains later.
- Required decisions: D16/I4/F4 amended directly by the owner, plus D1/D2/D3/D4/D5/D9/D18/B10/I7/I21/H1. Contract [LISTING_MANAGEMENT](../specs/LISTING_MANAGEMENT.md).
- Current source has apartments.lister_id, MyListingsPage, ListingContact owner branch and one per-account IndexedDB draft. User reports navigation/self-contact/button defects; task4.9 must reproduce exact failing contexts. No blanket claim of absent ownership.
- Predecessor evidence: SL01 handoff completes1.1–1.4; latest SL02 handoff records deployed publication/confirmation fixes. Full Google and parent packet hardening remain open. No runtime test or live schema query was performed by this planning update.
- First milestone: ownership/navigation, cross-device cloud drafts/photos, explicit published edits, room/intake and one owner inquiry inbox. Second milestone reuses group/share/consent tasks in their physical prerequisite order.
- Pending verification: all new task acceptance, actual schema/signature reconciliation and owner/outsider browser/client tests. No migrations, application code or fixtures created by planning.
- Next: update the existing executor from integrated master, then execute task4.9 only. Read current shared ownership/data state before any later hosted mutation; f185 is only publishing this planning change.
