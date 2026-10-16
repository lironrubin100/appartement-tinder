# Known issues

This is a defect register, not a feature roadmap. Keep owner-reported, reproduced, fixed and verified states distinct. A report does not authorize unrelated implementation during planning.

## CHAT-UNREAD-001 — Unread badge sticks at one, including own sent message

- Reported: owner, 16 October 2026, questionnaire Q25.
- State: reported, not reproduced/diagnosed in this planning task.
- Symptom: chat repeatedly shows one new message regardless of reading, even when the owner/user sent the message themselves.
- Owner slice: SL08; decision anchors F2/F5 and group-history/block rules.
- Reproduction to capture: two ordinary users and a group; who sent, which thread/inbox badge, read marker after opening, reload/reconnect and second tab. No guessed diagnosis yet.
- Correctness: user's own outgoing message must not add to that user's unread count; reading authorized received messages advances the correct participant read marker; recipient unread increments once; global badge agrees with thread/inbox; server sequence, join cutoff and block rules hold across realtime/catch-up/reload. Typing/read events are not unread messages.
- Acceptance: A sends while A's thread open → A zero new unread, B one; B reads → B zero; reload/reconnect/second tab do not restore a phantom count; group newcomer cannot count pre-join history; leave suppresses according to F5.
- Do not fix by hiding the badge or marking every message read globally. No fix or runtime test claimed yet.

## ONBOARD-INTAKE-001 — Non-resident poster reportedly receives full resident onboarding

- Reported: owner Q8, 16 October 2026.
- State: reported, not reproduced in exact browser/origin.
- Expected: D1/B10/I9 account-only name/private phone/optional agency for a nonresident property poster; no lifestyle preferences/photo/bio requirement. Resident cohabitants still complete required social profile.
- Local source observation: ResidentOnboarding already has resident/lister branch state and branch-specific name/date/phone validation. This does not prove the user's deployed/origin/account state selects it correctly.
- Owner slice: SL01. Capture fresh-account path, returning account mode, actual origin/deployment and selected intent before diagnosis. Do not create a second account model or persistent Solo/Group switch.
- Acceptance: fresh nonresident follows short intake→My Listings→compose; resident follows profile path; later capability expansion completes missing fields on same account under approved rules. UI copy should explain the distinction without internal jargon.
