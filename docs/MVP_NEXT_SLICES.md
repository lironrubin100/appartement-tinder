# Next MVP slices: original assessment

Approved for implementation on 15 October 2026, with resident modes replaced by Individuals/Groups views. Read [the active handoff](workstreams/2026-10-15-resident-journeys.md) for current decisions, source and verification. The remainder preserves the original assessment; it is not current task status.

Assessed 15 October 2026 against fetched `origin/master` at `8daa268` plus verified listing implementation `5f3bc7f`. The user requested recommendations now and development later. Do not start these or resolve OPEN decisions without the user's next instruction.

## 1. New resident to usable roommate profile

Journey: sign up → choose Solo/Group/Room-Filler → create profile with photo/bio/structured traits → enter Discover → return later with the same mode/profile/session.

Why first: roommate discovery needs real, useful resident profiles. Current `web/src/app/onboarding/resident-onboarding.tsx` hardcodes residents to `solo`, completes onboarding with name/birth date, and redirects to Discover without respecting the startup preference. The profile editor already contains photos, bio and structured tags; reuse it. Existing login is not wholly broken: password sign-in worked in QA. New-account/OAuth completion remains outside that evidence.

Decisions: I9, D1, B9/B10, C1/C2, I19/I22, A4. B1 currently specifies Google + Apple while email/password UI exists; confirm the intended production auth scope. Do not silently choose age/display-name policy from OPEN B5/B6.

Acceptance: a real new resident and a new lister take the correct forks; resident mode persists; another resident sees the intended public profile but never DOB/phone/private budget; interrupted onboarding resumes; sign-out/sign-in and startup preference work; Hebrew/English.

## 2. Public apartment to accepted viewing and private conversation

Journey: open the shared public apartment page → sign in and return to that apartment → request viewing → owner sees and accepts the request → both chat and only the accepted renter receives the exact address.

Why next: this closes the apartment marketplace loop now that posting and browsing work. Existing inquiry RPCs, Map contact, owner pending controls and accepted-chat address access are already integrated; complete and verify them rather than rebuild them. The new public listing page still only links back to Map and offers no direct inquiry action.

Source: `web/src/components/listings/PublicListing.tsx`, `web/src/lib/listings/inquiries.ts`, `web/src/app/(main)/my-listings/MyListingsPage.tsx`, `web/src/app/(main)/chats/[conversationId]/page.tsx`, and migration `20261014205238_listing_inquiry_conversations.sql`.

Decisions: D4, F4 (DECIDED in current main), D2/D9, B2/B9. Existing accept RPC checks owner/pending state but does not recheck apartment availability/blocking at acceptance, although creation does. Set the intended unavailable/rented/block behavior before changing it; H1 and messaging/rate-limit choices F1/F8 remain OPEN.

Acceptance: sign-in returns to the original listing; one persistent pending request; only the owner accepts; repeated acceptance creates one conversation; address absent before acceptance and to a third account; two browsers exchange persisted messages; decided unavailable/block cases are covered.

## 3. Roommate introduction to live conversation

Journey: Discover a resident → select a profile trait and send an introduction → recipient sees and accepts it → both exchange messages live; refresh preserves the interaction and thread.

Why crucial: this is the roommate loop that differentiates Shutaf. Main has pieces of it, but `DiscoverClient.tsx` stores `ref_tag: null`, filter callbacks do nothing and Pass only dismisses locally. The feed fetches a fixed set of 30 candidates without pagination. The accepted-like and Realtime code needs a real two-account journey, including outsider isolation.

Reuse existing chat components and inspect the preserved c8ce worktree's partial changes before implementing. Do not merge its stale branch wholesale.

Decisions: C9, C1/C2/C13, B9. Set C6/C7 (introduction and limits), C8/C12 (Pass persistence/return), and relevant C3/C4/J2/J3 before ordering/filter/pagination changes. F1/F8/H1 determine delivery and safety behavior. Existing code is not authority for those OPEN decisions.

Acceptance: a trait-attached introduction persists; only its recipient accepts; no conversation before acceptance; messages arrive both ways without duplicate rendering and remain after refresh; a third user cannot read; Pass and limits follow the chosen rules.

For each approved slice, add one handoff with its decisions, acceptance and worktree before coding. These proposals do not include groups, monetization or a public-launch approval.
