# Known issues

This is a defect register, not a feature roadmap. Keep owner-reported, reproduced, fixed and verified states distinct. A report does not authorize unrelated implementation during planning.

## MAP-CARTO-KEY-001 — Basemap shows API KEY REQUIRED instead of streets

- Reported and reproduced: 19 October 2026, authenticated production Chrome at `appartement-tinder-appartinder.vercel.app/map`; owner confirmed. Listings and markers load.
- State: reproduced; required key integration in progress. See `workstreams/2026-10-19-carto-api-key.md`.
- Cause: CARTO raster tile URL lacks its required Basemaps API key; HTTP 200 serves watermark imagery. Existing network-error recovery cannot detect this successful placeholder response.
- Acceptance: valid key configured before build; real streets and OSM/CARTO attribution visible on Hebrew/English desktop and 390px; missing configuration shows an explicit state rather than requesting keyless tiles. No claim of live repair until configured and visually verified.

## CHAT-UNREAD-001 — Unread badge sticks at one, including own sent message

- Reported: owner, 16 October 2026, questionnaire Q25.
- State: reported, not reproduced/diagnosed in this planning task.
- Symptom: chat repeatedly shows one new message regardless of reading, even when the owner/user sent the message themselves.
- Owner slice: SL08; decision anchors F2/F5 and group-history/block rules.
- Reproduction to capture: two ordinary users and a group; who sent, which thread/inbox badge, read marker after opening, reload/reconnect and second tab. No guessed diagnosis yet.
- Correctness: user's own outgoing message must not add to that user's unread count; reading authorized received messages advances the correct participant read marker; recipient unread increments once; global badge agrees with thread/inbox; server sequence, join cutoff and block rules hold across realtime/catch-up/reload. Typing/read events are not unread messages.
- Acceptance: A sends while A's thread open → A zero new unread, B one; B reads → B zero; reload/reconnect/second tab do not restore a phantom count; group newcomer cannot count pre-join history; leave suppresses according to F5.
- Do not fix by hiding the badge or marking every message read globally. No fix or runtime test claimed yet.

## ONBOARD-INTAKE-001 — Existing resident cannot enter the non-resident poster intake

- Reported: owner Q8, 16 October 2026.
- State: fixed locally on 17 October; awaiting the new reviewed migration, real browser acceptance and separate code-publication authorization.
- Expected: D1/B10/I9 account-only name/private phone/optional agency for a nonresident property poster; no lifestyle preferences/photo/bio requirement. Resident cohabitants still complete required social profile.
- Finding: a fresh account reaches the residency/capability choice and can select “No, I’m posting for others”. But `web/src/app/onboarding/page.tsx` redirects every already-onboarded account away before it renders the selector, so the owner's completed resident account cannot enter the poster path. The short form and `save_onboarding` RPC already exist.
- Local implementation: Settings now offers an explicit resident-to-lister conversion with private phone and optional agency, informed confirmation, profile removal from Discover and My Listings redirect. It retains private resident fields and existing direct-chat history, but blocks conversion while the resident belongs to a group so group lifecycle is never silently corrupted. Do not create a second account model or persistent Solo/Group switch.
- Remaining acceptance: fresh nonresident follows short intake→My Listings→compose; an eligible existing account makes the approved conversion and reaches My Listings; a group member gets a clear blocked state; lister direct reads never expose the retained private data. Verify HE/EN phone/desktop with a disposable fixture and clean it exactly.
