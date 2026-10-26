# Known issues

This is a defect register, not a feature roadmap. Keep owner-reported, source-confirmed, reproduced, fixed and verified states distinct. Current scoped review:20 October 2026; [complete release/evidence map](releases/2026-10-20-profiles-chat.md). A report does not authorize unrelated implementation during planning.

## LISTING-REOPEN-001 — Owner cannot undo a rented listing

- Owner reported26October2026 in this chat. Source-confirmed: markListingRented only changes active to taken, and MyListingsPage renders RentedButton only for active listings. Opening rooms/intake does not restore listing status. No reverse-action browser acceptance is claimed.
- D16/D18 and LIFECYCLE_AND_PRIVACY's Reopen transition already separate listing status, inventory, intake and occupancy. Route once to4.20/4.21, before the existing owner-path acceptance; this is an explicit undo-rented operation, not expiry renewal or a new rental-period feature. Preserve identity, room/intake settings, accepted chats/address grants and restrictions; pending requests require explicit requester reconfirmation.
- Source gap to cover atomically: the legacy taken write currently increments revision but does not mark pending requests for reconfirmation. Merely reversing status would revive stale requests. Server checks and ordinary owner/foreign/guest/direct-write tests precede UI acceptance. Current4.18 scope and immediate next4.7 priority remain unchanged.

## LISTING-OWNER-SEARCH-CUE-001 — Own listing looks like an ordinary search result

- Owner reported26October2026 that appearing in their own search is acceptable, but ownership is unclear. Source-confirmed: discovery/ListingCard has no ownership cue and MapClient renders ordinary cards/contact modal actions for the owner too. Existing4.11 detail-page management and4.12 self-inquiry denial do not certify search presentation.
- Route once to existing3.2 map/card work: derive ownership from the authenticated session's own-listing query, render localized Your listing/Manage on that result and modal, retain the same listing in search, and keep other listings unchanged. Do not add publisher identity/private fields to the public projection or treat a client badge as authorization.
- Verify resident/nonresident owners versus another viewer, HE/EN390/desktop, refresh and card/modal/detail consistency. No fix or new queue override is claimed by this Plan intake.

## CHAT-MULTILINE-001 — Cannot compose a message with line breaks

- Owner reported26October2026 in this chat: the chat composer cannot insert a new line. Source-confirmed: ChatThread.tsx renders a single-line input, while the existing message renderer already uses whitespace-pre-wrap. No browser fix/acceptance is claimed by this record.
- Routed once to existing task8.1; preserve its RPC/idempotency/draft/error scope. Provide multiline composition with a deliberate send action and documented keyboard behavior. Verify two-line Hebrew/English messages, phone/desktop typing, newline persistence for sender/recipient after reload, and retry preserving the draft. This is not image messages, message editing or a chat redesign.

## SETTINGS-PAGE-TYPE-001 — Settings route default export violates Next page props

- Reproduced26October2026 during0.9 validation on sourcebbf536c: tsc --noEmit fails in .next/types/app/(main)/settings/page.ts because the route's default SettingsPage accepts an optional localeOverride-only object instead of valid page props. Both the Hebrew route and its English wrapper currently share that default component. The new QA test's own type error was separately corrected; this remaining error is pre-existing application source.
- Bounded validation follow-up0.13: separate shared Settings content from the route default exports, retain locale/auth behavior and exact rendered controls, then verify TypeScript/lint/build and ordinary HE/EN phone/desktop Settings navigation. No settings policy, schema or preference changes.
- Fixed and locally verified26October in0.13: valid route wrappers with shared server SettingsContent, locale passed into the three previously Hebrew-only panels and locale-preserving profile link. TypeScript/focused lint and production build passed under normal network/filesystem execution; four real Chrome HE/EN390/1280 Settings/dialog/reload cases passed with no preference or deletion action. Production publication is recorded separately in the SL00 checkpoint.

## DEMO-CONTENT-PHOTOS-001 — Demo people and apartments need complete, representative profiles with visible photos

- Reported by owner, 25 October 2026. The owner wants many representative resident profiles and apartment listings with proper photos and completed relevant fields, so browsing and detail screens can be inspected as a realistic product. The current experience feels incomplete or not working correctly; this is a reported symptom, not a reproduced image-loading defect.
- State: missing synthetic content source-confirmed 25 October by bounded read-only inventory of six explicitly marked resident demos: name/bio present, canonical facts/photo URL/gallery/owned listings absent; no profile-photo objects found. Rendering/image-loading failure remains unverified. Do not assume that more accounts alone fixes the problem.
- Priority update,25 October 2026: owner promoted this to the next near-term outcome for a cheaper executor after instruction/QA preparation, ahead of normal feature continuation. Use task16.1 and its bounded work card in the existing audit handoff; diagnose missing content and image loading separately. Reuse authorized retained demo identities and preserve them; do not create/reset another cohort each run.
- Expected outcome: a useful variety of clearly synthetic people and apartments, with complete approved fields, proper profile/cover/gallery images and enough content to inspect Discover, apartment cards and detail views. Verify actual image loading, refresh persistence and HE/EN phone/desktop rendering. Preserve public/private field boundaries; define the bounded content set when this item is dispatched.
- Follow-up: owner approved one-time access recovery of four existing marked demo accounts; credentials were not historically retained. No account creation, live credential reset, image upload or browser acceptance yet. Ordinary recovery requires a credential-safe admin path. Owning review: [MVP focus audit](workstreams/2026-10-25-mvp-focus-audit.md).

## GROUP-LEAVE-ADMIN-001 — Group exit feels unavailable

- Reported by owner, 25 October 2026, while discussing repeatable QA state. Browser reproduction pending; do not infer that all group exit is missing.
- Source check: GroupActions renders Leave for a non-admin's own membership and calls remove_group_member. The migration rejects removal of the admin, and the UI provides no admin Leave control. This confirms a current admin limitation, not a newly approved transfer/disband policy.
- Keep product lifecycle acceptance separate from test cleanup. QA needs guarded exact-run scenario teardown even when no normal product exit is available. No UI/schema change in this workflow scope; revisit against the existing group/lifecycle contract before proposing a fix.
- Canonical work: existing tasks9.9/9.10 (transfer contract, then exit UI/ordinary acceptance). No duplicate exit task or change to their Stage B priority. QA repeatability is0.7–0.9, not this product fix.

## DISCOVER-LISTER-LIVE-001 — Live discovery functions exclude listers

- Reproduced 21 October 2026 on shared project `npbduvjnqnbydolmdpsc`: an onboarded synthetic lister's ordinary-client `discover_individuals` returned no people despite available synthetic resident profiles. Read-only live function definitions show that both `discover_individuals(uuid)` and `discover_groups(uuid)` require `mode <> 'lister'`. The checked-in `20261017082317_lister_safe_browsing.sql` instead permits onboarded listers to browse safe projections, consistent with B10/I19. Live history includes the later `app_config` migration; its contribution to the overwrite has not been established.
- State: reproduced, not fixed. Task 1.3 verified navigation to Discover, not a populated lister feed; that distinction corrects any broader reading of its earlier evidence. The group exclusion is confirmed in the live definition, but a populated lister group feed was not separately tested. Reconcile source, live migration history, configurable limits and any concurrent ownership before creating or applying a corrective migration; do not overwrite later changes. No schema mutation was made during this finding.

## MAP-KEYLESS-MAXZOOM-001 — Local map crashes when the provider key is absent

- Reproduced 21 October 2026 in the `6b9e` local production build at `localhost:3201/en/map` with `NEXT_PUBLIC_CARTO_BASEMAPS_KEY` absent. An authenticated synthetic lister reached the route; the public listing request returned HTTP 200, then the browser reported `Map has no maxZoom specified` and showed the generic screen error. A repeated local check gave the same result. This is not a claim of a production failure: the same lister saw a visible map container on configured production.
- State,23October: fixed and locally verified in owner-prioritized apartment-sharing scope; explicit MapContainer maxZoom18 matches installed tile default. Final18 browser cases include zero-runtime-error keyless Map listing Share. Production release pending; no local imagery claim. Original diagnosis: the keyless path omits the tile layer, while marker clustering requires a maximum zoom; the intended explicit missing-key message did not survive the client error. The local test did not verify map imagery. Investigate with the map work around task 3.2; any repair must stay within that task's permitted paths or receive an explicit scope adjustment. Verify keyless fallback and configured real tile rendering separately.

## LISTING-LOCATION-CONFIRM-001 — Early location confirmation can reset

- Observed once on 20 October 2026 in production Chrome at 390px: immediately after entering manual coordinates, an automated click on the location confirmation checkbox did not leave it checked. The same journey passed after allowing the map to settle; Hebrew and English publication then succeeded.
- State, 21 October: fixed, deployed and verified on production `3880bf9` / `dpl_8G83vrVXFU2hNWokbgtCTFvF9zy9`. The HE/EN 390px deployed regression passed 2/2 in 38.4s with the stylesheet barrier, reload and edit invalidation. Both production screenshots were inspected and show actual street tiles, marker and checked confirmation without horizontal overflow. Holding the lazy map stylesheet reproduces checkbox rollback and stale controlled coordinate fields. Leaflet styles now load eagerly with AddressField, while map JavaScript remains lazy. The unchanged production build reproduced the checkbox failure twice in a bounded stylesheet-delay diagnostic; the corrected production build passed the HE/EN 390px regression (2/2), including immediate checkbox activation, retained coordinates, reload, edit invalidation, keyboard Space and label activation. Build/TypeScript, focused ESLint and planning checks passed. Regression: `web/e2e/location-confirmation.spec.ts`; credentials stay in the ignored synthetic fixture manifest. No server validation was relaxed. Local screenshots show a styled marker/map control but no basemap because this local build has no CARTO key; provider/tile acceptance is separate.

## MAP-CARTO-KEY-001 — Basemap shows API KEY REQUIRED instead of streets

- Reported and reproduced: 19 October 2026, authenticated production Chrome at `appartement-tinder-appartinder.vercel.app/map`; owner confirmed. Listings and markers load.
- State: fixed and verified in production. Key repair `085a5f9` and phone height repair `57d458c` are published. Authenticated HE/EN desktop and 390x844 checks show actual streets, pins/clusters and attribution. See `workstreams/2026-10-19-carto-api-key.md`.
- Cause: CARTO raster tile URL lacks its required Basemaps API key; HTTP 200 serves watermark imagery. Existing network-error recovery cannot detect this successful placeholder response.
- Acceptance: valid key configured before build; real streets and OSM/CARTO attribution visible on Hebrew/English desktop and 390px; missing configuration shows an explicit state rather than requesting keyless tiles. No claim of live repair until configured and visually verified.

## LISTING-ADDRESS-001 — Address autocomplete absent from live composer

- Reported/reconciled: 19 October 2026. Owner clarified autocomplete was the reason for the provider change. Current ComposeForm has plain address plus manual latitude/longitude fields; no geocode API is present. Historical M01 was an unintegrated archived draft.
- State: fixed and verified for bounded autocomplete, 19 October 2026. Application 9d75218 published; real HE/EN lookup, parsed city/street/house fields, grouped city refinement and clean sample labels verified. Signed selection/manual fallback, private quotas, seven logic/SQL tests and HE/EN 390px mocked UI contracts passed. Full listing lifecycle not rerun. See `workstreams/2026-10-19-address-autocomplete.md`.

## CHAT-UNREAD-001 — Unread badge sticks at one, including own sent message

- Reported: owner, 16 October 2026, questionnaire Q25.
- State: fixed and verified for SL08.1 on19 October 2026. Application95f333b; live migration20261019211840. Real HE desktop/EN390px two-browser unread/read/background/reconnect/reload checks2/2 passed; ordinary-client outsider/block/idempotency checks passed. See [handoff](workstreams/2026-10-19-cloud-mvp-progress.md).
- Symptom: chat repeatedly shows one new message regardless of reading, even when the owner/user sent the message themselves.
- Owner slice: SL08; decision anchors F2/F5 and group-history/block rules.
- Diagnosis: client wall-clock read writes on mount/insert, including hidden threads; inbox compared timestamps. Replaced with authenticated, clamped, monotonic server sequence markers after focused visible rendering; sender/system messages excluded, account inbox invalidates on persisted signals. Group cutoffs/denials covered in SQL.
- Correctness: user's own outgoing message must not add to that user's unread count; reading authorized received messages advances the correct participant read marker; recipient unread increments once; global badge agrees with thread/inbox; server sequence, join cutoff and block rules hold across realtime/catch-up/reload. Typing/read events are not unread messages.
- Acceptance: A sends while A's thread open → A zero new unread, B one; B reads → B zero; reload/reconnect/second tab do not restore a phantom count; group newcomer cannot count pre-join history; leave suppresses according to F5.
- Verification scope: actual badge/read persistence and reconnect are verified;20October Production HE/EN two-browser2/2 passed again within9/9 regression on the application included in2877c38. Ordinary authorization4 groups reran and temporary block was removed. Leave/typing presentation and their broader SL08.2 lifecycle are not certified by this fix.

## ONBOARD-INTAKE-001 — Existing resident cannot enter the non-resident poster intake

- Reported: owner Q8, 16 October 2026.
- State: completed and published19October; 18October EN phone/HE desktop conversion plus focused Chats regression documented in [owning handoff](workstreams/2026-10-17-sl01-intake-and-safe-browsing.md). Execution ledger reconciled to that historical evidence, not re-tested here.
- Expected: D1/B10/I9 account-only name/private phone/optional agency for a nonresident property poster; no lifestyle preferences/photo/bio requirement. Resident cohabitants still complete required social profile.
- Finding: a fresh account reaches the residency/capability choice and can select “No, I’m posting for others”. But `web/src/app/onboarding/page.tsx` redirects every already-onboarded account away before it renders the selector, so the owner's completed resident account cannot enter the poster path. The short form and `save_onboarding` RPC already exist.
- Local implementation: Settings now offers an explicit resident-to-lister conversion with private phone and optional agency, informed confirmation, profile removal from Discover and My Listings redirect. It retains private resident fields and existing direct-chat history, but blocks conversion while the resident belongs to a group so group lifecycle is never silently corrupted. Do not create a second account model or persistent Solo/Group switch.
- Evidence reconciled20October: original Settings conversion browser checks remain dated18October.19October canonical ordinary-client checks verified actual conversion with private data retained, safe public-profile removal and atomic active-group refusal. Fresh nonresident intake/adult declaration/editor passed against a built local app+shared backend;20October actual Production lister edit/reload passed. The entire fresh intake→compose/publication journey was not rerun in this canonical release; SL02 gaps below remain. Synthetic demos are retained at owner request.

## AUTH-RESIDENT-AGE-001 — Resident completion/direct edits permit under18 DOB

- Confirmed19October: previous save_onboarding rejected only future dates; own private DOB UPDATE was granted without adulthood invariant.
- State: fixed and verified. Application95f333b, live migration20261019212312. Server current_date enforces18+ only for completed resident profiles; drafts/listers remain compatible. Guard also rejects clearing/under18 direct DOB edits while allowing adult corrections.
- Evidence: disposable PGlite boundaries/rollback plus11 real ordinary-client assertions (17draft, rejected17 completion/no mutation, exact18, direct17/null rejection and19 correction). Exact synthetic fixture retained; no existing demo/real-account mutation. Canonical required-profile storage/UI was subsequently implemented in39fdcee; only the real Google-account acceptance keeps full SL01.2 incomplete.20October canonical RPC recheck used actual server cutoff2008-10-20, rejected2008-10-21 atomically, accepted the cutoff and restored the original fixture DOB.


## PROFILE-CANONICAL-001 — Required resident completion and explicit disclosure missing

- Source-confirmed before canonical implementation19October: legacy onboarding could complete without an actual owned gallery photo and without all required bio/core answers; public legacy profile fields were not driven by explicit canonical disclosure.
- State: fixed and verified in39fdcee, included in final2877c38. Live canonical migration20261019215717 plus draft-correction20261019215905. Adult/name/bio/core4/owned-photo completion, resumable draft and completed-edit invariants are enforced atomically; no automatic disclosure/identity inference from legacy fields.
- Evidence:53-option SQL parity and negative/rollback/CAS cases;9 real ordinary-client scenario groups; fresh HE/EN draft/completion/edit;20October Production editor/privacy checks. See [release summary](releases/2026-10-20-profiles-chat.md). Full Google roundtrip is a separate acceptance gap below.

## PROFILE-NAME-PRIVACY-001 — Public full names and owner-private preference boundaries

- Source-confirmed before39fdcee: profiles_public projected profiles.name and legacy trait columns; name could be edited directly. Full-name publication/disclosure needed alignment with B6/C2.
- State: fixed and verified. Existing full names preserved in owner-private profile_private.full_name; public name abbreviated server-side. Public canonical facts are only consciously selected keys; private facts/preferences/disclosure-selection metadata stay owner-only, and legacy public identity/trait columns are NULL in the compatible shape.
- Evidence: other-account direct reads of four owner tables empty, owner original full name retained, safe person/group projection and real canonical trait-attached intro;20October ordinary privacy4 groups passed. No report of an exposed real user's data is implied; current target contains synthetic demos only under owner confirmation.

## PROFILE-PHOTO-OWNER-001 — Gallery URLs and last completed photo need server authority

- Source-confirmed before39fdcee: own-row gallery writes did not prove the URL was an actual caller-owned Storage object. A nonempty arbitrary URL was not sufficient I9 completion evidence.
- State: fixed and verified. Exact owner/bucket/path/origin checks, protected authoritative profile URL, gallery ordering/primary synchronization and last-photo gallery/Storage guards implemented in live20261019215717.
- Evidence: real uploads+byte retrieval, forged hostname/foreign-owner denial, safe secondary row-first deletion; isolated last-gallery and direct Storage removal refused, then cache-busted GET200 returned exact original PNG bytes. Last Storage refusal returned500/P0001. No claim of server image decoding/moderation.

## AUTH-GOOGLE-ACCEPTANCE-001 — Full Google account/provider roundtrip unexecuted

- State: verification gap, not a reproduced Google sign-in defect.19October provider-start preflight returned302 to accounts.google.com. No actual interactive Google-account consent/sign-in/callback completion was run.
- Impact: SL01.2 remains verification-incomplete for this required assertion. Password fixtures, callback-error safety tests and READY deployment do not substitute for provider acceptance.
- Next: perform the actual provider flow with an available authorized account/interactive channel, record destination/session persistence and actual result. Do not collect provider secrets in documentation. Independent already-verified capability contracts can support bounded following local work under EXECUTION_PROTOCOL.

## LISTING-PUBLISH-PHONE-001 — Resident publication incorrectly requires private phone

- State: source-confirmed19October; not fixed or runtime-certified in this release. D2/B2 make resident phone optional, while nonresident poster phone remains required.
- Evidence anchors: web/src/app/(main)/compose/ComposePage.tsx and ComposeForm.tsx, web/src/lib/listings/actions.ts and the source publish_apartment RPC in20261014210721_listing_journeys.sql currently require phone without restricting it to lister mode.
- Next owner: SL02.1. Reconcile actual live RPC first; apply the mode-based invariant across server/page/form and verify phone-less completed resident can publish while a lister without phone is denied. No blanket phone-grant relaxation.

## LISTING-PUBLISH-RETRY-001 — Publication lacks stable per-request identity

- State: source-confirmed19October; not fixed. publishListing generates a new listing UUID per invocation; publish_apartment has no durable actor/operation/request-key tombstone. A repeat after an uncertain response can create another listing.
- Next owner: SL02.1 / TECHNICAL_DEFAULTS. Implement compatible request-key/payload/result semantics with identical retry, changed-payload conflict, ownership, upload cleanup and forced-rollback acceptance. This record does not claim an observed real duplicate or authorize broad historical cleanup.

## LISTING-COMPOSER-DRAFT-001 — Plus navigates away and composer state is transient

- State: source-confirmed19October; not fixed. BottomNav links to /compose; ComposeForm stores photos/room prices/bedrooms in component state without persisted draft/origin. This falls short of I4 overlay over the current screen and SL02.1 draft-resume acceptance.
- Next owner: SL02.1. Preserve origin and entered data/photos through close/reopen/reload as approved, with account-scoped private draft handling and an explicit discard path. Test HE/EN phone/desktop; do not label existing standalone composer as an implemented overlay.

## PROFILE-TEXT-LENGTH-001 — Unicode text-length parity differs

- State: source-confirmed by independent canonical review19October; not fixed; no live malformed-write reproduction claimed. taxonomy.ts uses JavaScript string.length (UTF16 code units), SQL uses char_length (Unicode codepoints).
- Example: kitchen_other containing100 non-BMP emoji can exceed the160-unit client limit while staying within160 server characters. UI is stricter; this is a validation-consistency gap, not an authorization bypass.
- Next: settle a consistent technical counting convention within the approved field limits, align validators/UI/SQL and add bounded Unicode cases. Do not silently widen product limits or mark53-option enum parity as text-length parity.

## Owner management intake — 21 October 2026

The following entries are tracked for SL04.2, not fixed by this planning update. Preserve earlier runtime evidence and synthetic demos.

### LISTING-OWNER-ENTRY-001 — Owner management entry is missing or difficult to reach

- State: Owner-reported 21 October; not freshly browser-reproduced by this planning work. Source has apartments.lister_id authorization and /my-listings; absence of ownership in the database is not established.
- Task 4.9 reproduction, 21–22 October: production Chrome EN 390px with the dedicated synthetic resident and nonresident poster found no My Listings entry within the profile content for either. The lister has an additional My Listings link in its lister navigation; the resident does not. Direct `/en/my-listings` loaded the two resident-owned and one lister-owned active listings, matching ordinary-client `lister_id` queries. Source: `web/src/app/(main)/profile/page.tsx`, `web/src/app/(main)/layout.tsx`, and `web/src/app/(main)/my-listings/MyListingsPage.tsx`. Reproduced missing profile entry, not missing database ownership. HE and empty-account profile entry were not freshly checked.
- Task 4.10, 22 October: fixed and verified in production source `6a58405268f636262790e4cf47ac050d12f1b078`, deployment `dpl_GFXazPt66EArRwCvncUKTihgyY4R` READY. Chrome HE/EN 390px on local and production passed for synthetic resident and lister with zero owned listings: each Profile link opened the localized empty management page. Resident five-destination navigation remained present. Existing owned-listing display was separately tested in 4.9; no broad dashboard acceptance is implied.
- Expected: D16/I4/F4 and [LISTING_MANAGEMENT](specs/LISTING_MANAGEMENT.md).
- Next: 4.9–4.14; reproduce both resident/nonresident posters and preserve existing listing identities.

### LISTING-SELF-CONTACT-001 — Poster sees a contact-owner action for their own apartment

- State: Owner-reported 21 October; source-confirmed existing ListingContact owner branch, so the precise failing entry/identity requires reproduction. No claim that self-inquiry RPC currently permits a write.
- Task 4.9, 21–22 October: not reproduced in the tested production EN 390px path: each synthetic owner opened an active own listing from My Listings and saw Manage your listing rather than a self-contact button. `web/src/components/listings/ListingContact.tsx` checks onboarding before ownership, so other states and entry paths remain unverified. Read-only live `create_listing_inquiry(uuid)` definition excludes the listing owner; an ordinary-client self-inquiry write was not attempted here (task 4.12 owns that verification).
- Task 4.11, 22 October: owner lookup now precedes onboarding and a lookup error fails closed. Source `fc43038b17dc235b5c48f90a08b7dc12e2a09a28` deployed as `dpl_3ycGwsAuxAAqkWojvuzdcqm5GWZk` READY. Chrome HE/EN 390px verified manage CTA for synthetic resident and nonresident owners; another synthetic resident's real inquiry was sent locally against the shared backend and remained pending on production. Owner-incomplete-profile ordering was checked in an isolated component harness, not by changing a retained owner's profile. The originally reported self-contact symptom was not independently reproduced; task 4.12 retains server-side denial verification.
- Expected: D16/I4/F4 and [LISTING_MANAGEMENT](specs/LISTING_MANAGEMENT.md).
- Next: 4.9, 4.11–4.12; check UI and ordinary-client denial separately.

### LISTING-OWNER-INBOX-001 — No usable per-property and aggregate requester inbox

- 22–23 October continuation: remains incomplete future inbox work. Existing actions now explain chat/exact-address access and recover from thrown/network failures with localized retry. These bounded fixes do not supply requester identity, introductions, timestamps or filters and do not close this issue.

- State: Owner-reported 21 October; source confirms MyListingsPage currently has pending IDs/action buttons, not the approved safe sender/introduction/filterable inbox.
- Task 4.9, 21–22 October: both synthetic accounts' production EN 390px My Listings screens had no aggregate inquiry link or filter controls. Reproduced the missing aggregate entry, not the full pending-inquiry interaction: these fixtures had no pending inquiry created for this check. Source `web/src/app/(main)/my-listings/MyListingsPage.tsx` selects pending IDs and renders action buttons, not the specified requester details and filterable inbox.
- Expected: D16/I4/F4 and [LISTING_MANAGEMENT](specs/LISTING_MANAGEMENT.md).
- Next: 6.1–6.5 and 6.22–6.29, then 6.9/6.11 for groups.

### LISTING-DRAFT-LABELS-001 — Composer buttons do not describe draft/new/edit state

- 22–23 October continuation: fixed and locally verified for the existing single-device new-listing draft. Explicit Save draft and close awaits ordered persistence, Escape uses the same path, failure retains fields/photos, reopened forms autosave again, and confirmed discard is secondary. HE/EN at 390px/1280px passed. This does not implement cloud/multiple/edit drafts; production evidence belongs to the current UX handoff.

- State: Owner-reported 21 October; exact visible states require task 4.9 / targeted browser reproduction. Saving a local draft exists; this report is not proof of lost data.
- Task 4.9, 21–22 October: both synthetic owners' production EN 390px new-listing screens showed Publish listing, Close and Discard draft; no Save changes or Continue draft control appeared in that state. Reproduced those new-form labels, not an existing edit flow or data loss. `web/src/app/(main)/compose/ComposeForm.tsx` saves one local draft on close.
- Owner follow-up, 22 October: saving needs an explicit action, with discarding a secondary choice. A subagent prepared an uncommitted `ComposeForm.tsx` patch that labels the action Save draft and close, waits for local storage, states that storage is device-local and moves Discard draft into More draft options. The agent stopped before verification. Patch is preserved at `docs/handoffs/2026-10-22-compose-draft-buttons.patch`; it is not verified, committed as application code or deployed. Owner asked to stop after task 2.18; resume through the continuation prompt.
- Expected: D16/I4/F4 and [LISTING_MANAGEMENT](specs/LISTING_MANAGEMENT.md).
- Next: 2.25–2.29, 2.32 and 4.3/4.16; distinguish Save changes, Publish listing, Continue draft and save status.

### LISTING-MULTI-DRAFT-001 — Only one device-local listing draft; no cross-device draft list

- State: Source-confirmed 21 October: draft-store.ts keys IndexedDB by accountId and stores File[]; ComposeForm loads that one account draft. Multiple independent cloud drafts/photos are not implemented by this plan change.
- Task 4.9, 21–22 October: both synthetic owners' production EN new-listing screens lacked a draft chooser. Source `web/src/lib/listings/draft-store.ts` confirms one IndexedDB record per account; read-only live catalog contained no public draft table or draft-named RPC. No cross-device test was run, so this is source/catalog confirmation rather than a reproduced cross-device loss.
- Expected: D16/I4/F4 and [LISTING_MANAGEMENT](specs/LISTING_MANAGEMENT.md).
- Next: 2.16–2.33; import existing draft explicitly and retain it until verified cloud transfer.

21 October reconciliation of LISTING-COMPOSER-DRAFT-001: the newer source includes ComposerNavigation overlay and device-local IndexedDB photos; the older transient-state description is historical. This does not certify all overlay acceptance or resolve LISTING-MULTI-DRAFT-001. LISTING-PUBLISH-PHONE-001/RETRY-001 retain their dated original findings; current SL02 workstream/checked tasks describe later deployed fixes.

### LISTING-OWNER-SELF-LINK-001 — Management link on the management page reloads itself

- 22–23 October continuation: fixed and locally verified for resident/lister/empty HE/EN phone paths. Card Manage link now requires an explicit destination; dashboard retains public View listing and the public-detail owner CTA still opens My Listings. No new edit route.

- State: source-confirmed during the requested UX review, 22 October; no new browser reproduction in this review. `MyListingsPage` renders `OwnerListingCard` without a `manageHref`; the card defaults to the localized My Listings URL. A Manage listing link on that same page therefore opens no new management context.
- Expected: links describe the action they actually perform; retain the owner-detail CTA into the dashboard. Until scoped editing exists, omit the redundant card link within the dashboard or target an existing meaningful section. Do not invent an edit route.
- Follow-up: the requested UX review/release is recorded in [the owning checkpoint](workstreams/2026-10-22-owner-ux-continuation.md). The former next-chat prompt is archived in Git `6955c7f:docs/handoffs/2026-10-22-next-prompt.md`; it is not current dispatch.


### LISTING-DRAFT-CLOSE-002 — Escape bypasses acknowledged save; reopened form suppresses later autosave

- Confirmed in the 22 October continuation: dialog cancel directly hid the form, and successful explicit close left `finished` true in a mounted form. Fixed by routing cancel through the form save handle and unmounting after acknowledged close. Nested address suggestions consume their own Escape first.
- Local Chrome HE/EN at 390px and 1280px: delayed old write followed by latest close, failed IndexedDB put, preserved photo/input, explicit retry, Escape, reopened autosave/reload and confirmed local discard passed. No claim that abrupt browser termination flushes an unacknowledged debounce.
- See `workstreams/2026-10-22-owner-ux-continuation.md` for application/deployment and current acceptance evidence.

### LISTING-INQUIRY-RETRY-002 — Rejected server action leaves inquiry action busy

- Source-confirmed 22 October on request and acceptance components. Both now catch rejected actions, reset pending in finally and show localized retry feedback. Acceptance also explains exact-address access and that no room is reserved.
- Local Chrome HE/EN acceptance request aborted before reaching the server: localized error and enabled retry passed, with no existing inquiry accepted or hosted mutation. Positive new-fixture flow is separately authorized and recorded in the UX handoff.

### LISTER-PROFILE-NAV-001 — Poster navigation has no Profile/Settings/sign-out entry

- Source/browser-confirmed in the bounded continuation. Added localized Profile to the existing lister header, preserving startup My Listings. HE/EN 390px navigation to Profile and back passed. Phone owner cards now give title/actions full row width rather than a narrow column beside photo/status.


### LISTING-OWNER-CHAT-ADDRESS-001 — Owner chat promises an exact-address card but does not show it

- Reproduced on production 8bec8e5 during both exact owner-approved HE/EN synthetic lifecycle tests: publication, requester/owner network failure recovery and acceptance succeeded, but owner chat had a system message pointing to a missing address card.
- Live read-only view definition confirmed `listing_address_access` intentionally serves only accepted requesters. Keep this authorization boundary. The chat page now also reads the session poster's own apartment address using explicit apartment ID plus `lister_id=user.id` and existing RLS. No view, grant or schema change.
- Verify owner and accepted requester card/reload, outsider denial and retention after rented using the same two recorded fixture IDs; do not create more listings on retry. See the UX continuation handoff for dated results.


23 October production verification for the bounded continuation: LISTING-DRAFT-CLOSE-002, the single-device portion of LISTING-DRAFT-LABELS-001, LISTING-OWNER-SELF-LINK-001, LISTING-INQUIRY-RETRY-002, LISTER-PROFILE-NAV-001 and LISTING-OWNER-CHAT-ADDRESS-001 are fixed/verified on application b5f1bb1. Production 20/20 browser plus independent 6/6 owner/requester/outsider checks passed. This does not close LISTING-MULTI-DRAFT-001 or LISTING-OWNER-INBOX-001. See [dated scope/evidence](workstreams/2026-10-22-owner-ux-continuation.md).

### CHAT-SYSTEM-LOCALE-001 — English chat displays the legacy Hebrew inquiry system message

- Reported/reproduced by current production screenshot on 23 October: EN accepted chat has localized address card, header and composer, but its stored acceptance system-message body is Hebrew. No private message body was rewritten. Both authorized actors still get the actual exact-address card; this is a separate translation follow-up, not failed address authorization.
- Next: localize known system events at the presentation boundary using a stable event contract, preserving ordinary user messages and immutable historical content. Do not bulk rewrite stored chat bodies. Current bounded release does not claim complete older-screen translation.
- Canonical work: task8.12; depends on8.3 and Stage B eligibility. No implementation/acceptance is claimed by this planning link.

### INQUIRY-INVENTORY-RACE-001 — Waiting send may retain an older room snapshot

- Focused read-only subagent review on26October found the room EXISTS check inside create_listing_inquiry's parent SELECT FOR UPDATE. A sender waiting behind final-room closure can retain the earlier child-table snapshot, insert a pending request or clear reconfirmation after closure. Intake-stop itself uses a parent-row predicate and is covered separately. This is a code-level finding; no controlled two-session reproduction was initially available.
- Same owning task4.17: preserve the applied migration, append a correction that locks the parent first and rechecks mutable child availability afterward. Add controlled blocked-send coverage and verify the exact leased fixture is cleaned before closure. No new product rule or broader feature is introduced.
- Corrected and verified26October in append-only20261026174553 after unchanged20261026143946. Independent review confirms fresh post-lock room/block checks. Full disposable chain passes. Two live controlled blocked-reconfirmation cases observed a waiter on the closing transaction, then unavailable errors with the pending marker retained; after the second case stale acceptance was refused and explicit reconfirmation succeeded. This proves current blocked-reconfirmation behavior, not a reproduced old-version failure or controlled fresh-insert case. Exact fixture cleaned and QA journal clean.
