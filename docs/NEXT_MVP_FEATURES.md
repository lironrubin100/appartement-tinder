# Three next MVP vertical slices

Historical focused recommendation, retained as supporting domain evidence. For current comprehensive pilot planning and decision gates use [BUILD_BLUEPRINT.md](BUILD_BLUEPRINT.md), [SLICES.md](SLICES.md) and DECISIONS.md; later owner answers, including H3, supersede old OPEN descriptions below. No execution authorization comes from this file.

Chosen 15 October 2026 from a focused inspection of the implemented marketplace, discovery and chat paths. These are recommendations for the next development conversation, not completed features or permission to silently resolve OPEN product decisions. Resident-journey acceptance passed all eight browser tests; consult PROJECT_STATUS.md for integration state. Apple signup is deferred by the user.

## 1. Block and report from a real interaction

Journey: open a person or conversation → block or report → confirm the result → the blocked pair disappear from each other's Discover and cannot message → an authorized reviewer can read and act on the report.

Why first: the database has block/report records and the resident migration enforces blocking, but the inspected Discover and Chat screens offer no way to perform these actions. A social marketplace needs a usable exit from harassment/scams before a public launch. This is a product safety workflow, not just another table or a fake report button.

Reuse: `blocks`, `user_reports`, `apartment_reports`, existing `blocked_with`, conversation membership/history helpers, Discover/PendingLikes/ChatThread and My Listings. Keep reporter identity and report contents out of public reads.

Decisions: H1 is DECIDED (symmetric block). H2/H3 are OPEN: agree report categories, what a reviewer can do, who reviews and where. Do not treat the existing recommendation "user reviews daily in Supabase" as approved. Report persistence may be implemented independently once categories are settled, but do not promise an unimplemented moderation response. Also decide how unblock is exposed; do not invent unmatch semantics from OPEN F5.

Acceptance: two accounts exercise block in both directions; pending intros and direct REST/Realtime access cannot bypass it; a group containing the pair follows the documented rule; report submitted once survives refresh; only its reporter/authorized reviewer sees it; Hebrew/English and recoverable failure states.

## 2. Share an apartment into an existing personal or group conversation

Journey: open an active apartment → Share → choose an existing accepted personal/group chat → send an apartment card → recipients see it live and open its in-app public page to discuss it.

Why next: this closes the group apartment-hunting loop the user described. Favorites already persist via `useFavorites`/`toggle_apartment_save_and_interest`, and public apartment pages already exist. Neither the inspected public listing nor ChatThread implements listing-card messages. Start with sharing directly from a listing; a separate collaborative wishlist is not required for this slice.

Reuse: public listing projection/URLs, inbox membership checks, chat sequencing and new-member history boundary. Persist an apartment reference, not client-supplied address/price/owner fields. Resolve safe card fields on the server. A lister contact/inquiry is a separate action; do not contact landlords as a group in this slice.

Decisions: E8/F3 remain OPEN; obtain approval for listing-card messages in both chat types. E7 shared wishlist is a separate OPEN decision and stays deferred. Decide the rented/deleted listing card treatment; recommend a visible unavailable card that does not reveal private data. No external links or exact-address fields.

Acceptance: share to personal and group chats with ordinary accounts; outsiders cannot send/read; two browsers receive one card live; refresh preserves it; a newcomer cannot read cards from before joining; opening it uses the correct locale; a rented/removed listing has a clear unavailable state; no exact address/coordinates/phone in message payloads, card reads or previews.

## 3. Edit a published apartment and its available rooms

Journey: owner opens My Listings → Edit → changes description, available-room prices/count, availability and photos → previews/validates → saves → Map, public page and owner dashboard show the same current apartment.

Why next: current owner management supports publication and marking rented, but the inspected dashboard has no edit entry point or update transaction. Owners must correct prices and room availability without duplicating inventory. Reliable current inventory is essential for an MVP marketplace.

Reuse: composer fields and compression, apartment/room model, existing owner RLS, opaque listing photo paths/Storage ownership, public projections and validation. Implement an authorized atomic update; failure must not partially replace room rows or lose existing photos. Keep old photo objects until the saved update no longer references them, then safely clean only owned objects.

Decisions: D1-D5/D9/D16 govern the existing model. D6 expiry/renewal is OPEN: no automatic expiration, renewal, reopening of rented listings or invented lifecycle policy in this slice. Agree treatment of pending inquiries when all rooms become unavailable. Editing exact location must preserve the approximate-location boundary; existing accepted address access follows D4.

Acceptance: owner edits an existing multi-room listing, refreshes, and sees matching price ranges/availability on all surfaces; stranger reads/writes remain denied; invalid input and a forced write failure preserve the original listing and photos; removal/reordering does not delete another owner's objects; no public exact-address leak; Hebrew/English desktop/mobile.

## Verification and scope

Use real separate browser accounts and ordinary authenticated clients; provision only temporary QA users/data and clean them up. Run relevant rollback-protected SQL checks, TypeScript, targeted lint and a production build. Keep implementation, live migration, commit, push and deployment states separate. These slices do not imply public-launch approval, a payment system, Apple signup, group landlord contact, AI matching or a comprehensive rewrite of older English screens.
