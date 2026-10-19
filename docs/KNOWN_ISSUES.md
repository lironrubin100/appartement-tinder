# Known issues

This is a defect register, not a feature roadmap. Keep owner-reported, reproduced, fixed and verified states distinct. A report does not authorize unrelated implementation during planning.

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
- Verification scope: actual badge/read persistence and reconnect are verified; leave/typing presentation and their broader SL08.2 lifecycle are not certified by this fix.

## ONBOARD-INTAKE-001 — Existing resident cannot enter the non-resident poster intake

- Reported: owner Q8, 16 October 2026.
- State: completed and published19October; 18October EN phone/HE desktop conversion plus focused Chats regression documented in [owning handoff](workstreams/2026-10-17-sl01-intake-and-safe-browsing.md). Execution ledger reconciled to that historical evidence, not re-tested here.
- Expected: D1/B10/I9 account-only name/private phone/optional agency for a nonresident property poster; no lifestyle preferences/photo/bio requirement. Resident cohabitants still complete required social profile.
- Finding: a fresh account reaches the residency/capability choice and can select “No, I’m posting for others”. But `web/src/app/onboarding/page.tsx` redirects every already-onboarded account away before it renders the selector, so the owner's completed resident account cannot enter the poster path. The short form and `save_onboarding` RPC already exist.
- Local implementation: Settings now offers an explicit resident-to-lister conversion with private phone and optional agency, informed confirmation, profile removal from Discover and My Listings redirect. It retains private resident fields and existing direct-chat history, but blocks conversion while the resident belongs to a group so group lifecycle is never silently corrupted. Do not create a second account model or persistent Solo/Group switch.
- Remaining acceptance: fresh nonresident follows short intake→My Listings→compose; an eligible existing account makes the approved conversion and reaches My Listings; a group member gets a clear blocked state; lister direct reads never expose the retained private data. Verify HE/EN phone/desktop with a disposable fixture and clean it exactly.

## AUTH-RESIDENT-AGE-001 — Resident completion/direct edits permit under18 DOB

- Confirmed19October: previous save_onboarding rejected only future dates; own private DOB UPDATE was granted without adulthood invariant.
- State: fixed and verified. Application95f333b, live migration20261019212312. Server current_date enforces18+ only for completed resident profiles; drafts/listers remain compatible. Guard also rejects clearing/under18 direct DOB edits while allowing adult corrections.
- Evidence: disposable PGlite boundaries/rollback plus11 real ordinary-client assertions (17draft, rejected17 completion/no mutation, exact18, direct17/null rejection and19 correction). Exact synthetic fixture retained; no existing demo/real-account mutation. Full required-profile SL01.2 work remains separate.
