# Owner listing management, multiple drafts and inquiry inbox

Approved by the owner on 21 October 2026. This is a contract for future application work, not evidence of implementation. Canonical rules: D1/D2/D3/D4/D5/D9/D16/D18, B10, I4/I7/I21, F4, E8 and H1. Execute the physical checklist in `implementation_plan.md`; do not implement the whole document in one prompt.

## Two delivery milestones

1. SL04.2: every poster reaches My Listings from Profile; manages owned listings, multiple cloud drafts, explicit published edits, room availability/intake, and individual inquiries per listing and across listings.
2. Existing core/group/share work followed by SL06.3: unanimous group inquiry uses the same owner inbox and a separate accepted owner/group conversation. No second inquiry dashboard or alternate group consent flow.

The owner retained five navigation destinations. Profile has a permanent My Listings entry for residents and nonresident posters, including empty accounts. Listers still start on My Listings. Plus remains an overlay over the current screen: choose New or a saved draft when drafts exist; with none, create a new draft. A local legacy draft offers explicit import before choosing. Never silently resume the last draft.

## Owned listings

Reuse `apartments.lister_id` and existing owner authorization. The reported missing ownership is not proof of absent database ownership; task 4.9 reproduces navigation/record/CTA failures. Existing listings retain IDs, ownership and conversations. No ownership transfer, co-ownership, historical reassignment or property duplication is authorized.

The detail CTA checks ownership before renter/profile-completion routing. Owners see Manage listing, never Contact yourself; the RPC independently rejects self-inquiry. Until a scoped edit route exists, Manage links to My Listings. Editing may alter approved facts/rooms/photos, not replace the property/address or owner. A different property requires a new listing; D4's separate minor-correction policy is not expanded here.

## Draft data and services

- Each draft has an opaque UUID, immutable session-derived owner, schema version, integer revision, timestamps, partial approved listing fields, ordered photo references, publication request identity, and lifecycle state. A new draft has no source listing; an edit draft has `sourceListingId` and `sourceRevision`. At most one open edit draft exists per owner/listing. Multiple new-listing drafts are supported without a new product quota in this slice.
- Drafts accept incomplete fields and fewer than three photos. Publication still validates D2/D3 and the canonical model. Never serialize `File`, a signed URL, or credentials as persisted draft content. Existing validators are reused; no second set of publication rules.
- Owner-only list/load/create/save/delete services take actor identity from the authenticated session. Save requires `expectedRevision`; stale edits return conflict and preserve visible local input. Do not silently merge or use last-write-wins. Return typed not-found/conflict/retryable errors; list uses the standard bounded pagination contract.
- Save writes are ordered and debounced; only a server acknowledgement shows Saved. Close flushes pending writes or presents failure without discarding input. Logout/account switch clears in-memory/private rendered content. Conflict offers reload and comparison; automatic cross-device merging is out of scope.
- Autosave during an edit changes only the private draft. Save changes performs the existing atomic full-model owner update against `sourceRevision`; after success it reconciles/completes that edit draft. Ordinary editing does not renew expiry or alter occupancy/intake implicitly.
- Publication freezes a draft revision/snapshot and reuses its request key. Existing request-key receipts remain authoritative. An ambiguous response requires receipt reconciliation before changing payload or cleaning files. Only a verified owned published result completes the selected draft; completion failure is reconciled on reopening. Other drafts remain untouched.

The future storage/service names must be reconciled with actual source/live signatures in task 4.9. `draft-types.ts` defines the shared TypeScript model; `draft-actions.ts`, `draft-media.ts`, `draft-import.ts` and `draft-publish.ts` are bounded adapters, not alternative publication engines. Migrations are additive and created via the CLI; the planned timestamp in each task is replaced before SQL writing.

## Private media and legacy import

Use private bucket `listing-draft-media`, with account/draft/object identity and owner-only Storage and association rules. Preview URLs are short-lived and generated for authorized reads; public listing projections, metadata and shared caches must not contain draft data. Existing published photo references may be retained by an edit draft after server ownership checks; removing them from the draft does not remove the active image.

Reuse existing compression. Publication stages verified owned media through the existing apartment-photo publication path; do not make the draft bucket public. Storage cannot participate in a database transaction: track exact staged objects and receipts, and never delete on an ambiguous publish result. Cleanup removes only proven unreferenced owned objects, with exact retry records on failure. RLS/grants accompany each new table/RPC/bucket rather than being a later hardening task.

Legacy IndexedDB remains an import source, not a competing multi-draft authority. Import is explicit and scoped to the signed-in owner. A durable import identity is stored locally and uniquely receipted server-side; retry resumes the same cloud draft and objects. Remove the local copy only after fields and all images have been verified in cloud storage. A failed/partial import preserves the source and is retryable.

## Owner inquiries

Reuse existing inquiry and conversation identities. New individual inquiries accept an optional opening message, maximum 500 Unicode codepoints on both server and client. Existing signatures/callers and NULL-message inquiries remain supported. This reuses the existing invitation maximum (likes_message_check and DiscoverClient both use 500); it does not widen it. This is one introduction attached to the request, not pre-acceptance chat; changing the text of an existing pending request is not a retry.

The owner reader filters by session-owned apartment IDs and optionally by listing/status, with standard bounded pagination. Cards include safe requester projection, apartment context, optional introduction, time/state and an accepted conversation link. No phone, email, full birth date, private preferences or saver identities. Old unavailable/declined requests display honestly; an unavailable listing cannot receive/accept a fresh inquiry.

Views are Listings, Drafts and Inquiries within the existing My Listings destination. Opening a property's inquiries uses the same aggregate inbox with a property filter. Use safe query state rather than a second list implementation. Expand/view request details to mark it seen; merely loading a list does not. The owner-only seen marker is idempotent and independent of inquiry acceptance and chat unread/read state. New = the owner has not viewed that inquiry; new chat messages keep their existing unread semantics.

Accept/decline remains server-authoritative. Acceptance reuses/creates one apartment-context conversation and authorized address access atomically; a room is not booked by accepting. Pausing intake, room availability and taken status are distinct D18 actions. Accepted chats remain; unavailable pending requests require requester reconfirmation before later acceptance. Existing task 6.20 supplies individual decline before card actions; group branches are completed only after group schema exists.

After group-sharing/consent prerequisites exist, extend this reader/card with kind=group, safe group identity/members and sent inquiries only. No roommate consent-round data, notification or owner request before unanimity. Recheck membership revision and H1 at dispatch and acceptance; no newcomer automatically inherits conversation/history/address. The existing GROUP_LISTING_INQUIRIES contract remains binding.

## Delivery and prerequisite boundary

SL04.2 depends on verified SL00.1/SL01.1 and reuses the actual completed sign-in/intake and SL02 publication artifacts. It does not depend on full SL01.2 Google certification, full public-map behavior, expiry/renewal, proactive poster outreach, matching, or full group lifecycle. Task 4.9 checks concrete source/target artifacts before any dependent connection; absent artifacts block the affected task, not justify falsely verifying a parent packet.

First-milestone tasks are explicitly enumerated in the execution ledger's `micro_task_dispatch`. The selector reads the actual checklist and preserves any preceding unfinished task; it never skips a blocker or promotes incomplete packet prerequisites. Once the enumerated milestone is checked and verified, ordinary packet selection resumes. For milestone two, dispatch `implementation_plan.md` in its existing physical prerequisite order; groups/sharing/chat must be available before 6.6–6.12. Full parent packets retain outstanding evidence.

Check each TS/SQL task under the existing plan's compile/local ordinary-client rules. SQL test files need a runnable repository test harness before a task is checked; use the existing PGlite/ordinary-client workflow rather than committing inert SQL assertions. No application code, migration, hosted query, fixture creation, external message or runtime acceptance occurs merely by publishing this contract.
