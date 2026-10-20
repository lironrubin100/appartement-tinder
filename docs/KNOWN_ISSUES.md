# Known issues

This is a defect register, not a feature roadmap. Keep owner-reported, source-confirmed, reproduced, fixed and verified states distinct. Current scoped review:20October2026; [complete release/evidence map](releases/2026-10-20-profiles-chat.md). A report does not authorize unrelated implementation during planning.

## LISTING-LOCATION-CONFIRM-001 — Early location confirmation can reset

- Observed once on 20 October 2026 in production Chrome at 390px: immediately after entering manual coordinates, an automated click on the location confirmation checkbox did not leave it checked. The same journey passed after allowing the map to settle; Hebrew and English publication then succeeded.
- State: observed, cause not established, not fixed. Check whether map initialization or a delayed location callback resets confirmation, reproduce without relying on timing assumptions, and verify any fix across reload, manual edits and both locales. The failure did not publish an unconfirmed location.

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
- State: fixed and verified for SL08.1 on19October2026. Application95f333b; live migration20261019211840. Real HE desktop/EN390px two-browser unread/read/background/reconnect/reload checks2/2 passed; ordinary-client outsider/block/idempotency checks passed. See [handoff](workstreams/2026-10-19-cloud-mvp-progress.md).
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
