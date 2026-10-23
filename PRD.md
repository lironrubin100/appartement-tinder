# Product Requirements Document (PRD): Shutaf

## 1. Executive Summary
A real-time web and mobile marketplace designed to eliminate friction in the rental market by allowing renters to form groups *before* securing a lease. The app functions as a live database connecting solo renters, existing roommate groups, and landlords. It is a completely enclosed ecosystem: all listings, communications, and group sharing happen strictly inside the app.

## 2. People and groups
The first onboarding fork is **residency**: anyone who will live in the apartment completes a personal profile before posting or matching. Non-resident property posters complete short account-only intake (private full name, 18+ confirmation, private phone, optional agency) and start on My Listings. Incomplete intake choices can be corrected. A completed resident may explicitly convert through Settings after informed confirmation and supplying a private phone; conversion refuses active group membership, hides the resident profile and stops new resident social actions while preserving private data and existing direct conversations. Return from a completed lister account to resident capability is not implied (B10).

Residents have no Solo/Group/Room-Filler search mode. They switch freely between **Individuals** and **Groups** tabs within Discover. Joining a group preserves their personal profile and individual conversations. Residents can also list available rooms in their existing apartment.

## 3. Core Features & App Architecture
The app ships in Hebrew (default, RTL) and English (LTR). It exposes five destinations — Profile, Discover, Map, Plus (post a listing), Chats — rendered as a fixed bottom bar on mobile and free to take another shape on desktop. Residents open on Discover by default and can choose Discover or Map as their startup tab in Settings. Non-resident property posters open on My Listings.

### Map (The Apartment Feed)
*   **Geographical Map:** Shows available apartments. For performance, map pins are lightweight, displaying only the flat rent price and location.
*   **Details on Demand:** Tapping a pin dynamically loads the full listing details, photos, and descriptions.
*   **Favorites (Wishlist):** Users can save apartments. Favorited apartments render with a distinct star icon and a yellow aura on the map.
*   **Interest counter:** A private personal save contributes one unique current saver to the aggregate interested count. Saving does not send an inquiry or expose saver identities. No separate third interested button required (G1).
*   **Apartment listings with available rooms:** A listing represents an apartment. The poster adds one or more currently available rooms with individual monthly prices, and marks whether bills are included. A room is never a separate public listing.
*   **Hand-Me-Down Market (post-MVP):** Preserve the future idea of apartment-attached furniture, with in-app seller contact; deferred explicitly in D15. No general resale marketplace in MVP.

### Discover (The Roommate Feed) [DEFAULT ENTRY POINT for residents]
*   **Structured Profiles:** Users are scored and filtered based on structured lifestyle categories (not free-form text).
*   **Interaction Model:** Users send a "Like" attached to a specific trait or bio element, along with an optional message. The receiving user must accept the like to open a chat (Accept-a-Like model).
*   **Two views:** Individuals and Groups tabs inside Discover, with no account-mode change.
*   **Dynamic Group Cards:** Formed Groups are displayed as a swipeable card. The group's card is dynamically computed and generated from the individual profiles of its members.

### Plus (Post a Listing)
*   A button in the navigation bar, but not a destination: it opens the native listing composer as an overlay over whatever screen you are on, and closes back to it.
*   Available to any user, since posting is an action rather than a persona (D1).

### Chats & Groups
*   **Accepting Matches:** Inbound likes sit here pending acceptance.
*   **Group Controls:** Accepted individual connections can form a separate group conversation (up to four members), with invitations accepted by the invitees. Personal conversations remain available. The admin selects admin approval, any-member approval or majority voting for group introductions. New members see new messages only.
*   **Guest apartments and sharing (E8/J15, owner23October):** Public apartment detail and bounded catalog work without registration. Share controls copy a native public app URL or send a reference into an existing accepted personal/group conversation. Public cards show photo, room-price range, availability, date, bills and approximate area; exact location stays private. People, saves, inquiries and chats retain authenticated authorization.
*   **Conversations:** Individual/group chats include text, safe apartment cards, read receipts and authorized ephemeral typing. Each viewer can privately save a shared apartment independently; no separate shared wishlist (E7/E8/F2/F3).
*   **Individual and group owner contact:** An individual can send an apartment inquiry. A shared group apartment card also offers Contact owner: every current group member must explicitly consent before one group inquiry reaches the owner. Owner acceptance opens a separate conversation with the owner and the consenting members; the roommate-only chat remains separate. Membership changes require fresh consent, with no automatic newcomer access to an existing owner chat/address. See F4 and [the group inquiry contract](docs/specs/GROUP_LISTING_INQUIRIES.md). This is approved MVP scope, not implemented by this document.
*   **Verified unread behavior:** Own/system messages do not create unread counts. Counts advance from server message sequences; a visible, focused thread marks displayed history read, and reload/reconnect preserves the result across two accounts. Repeated sends with the same request key return one message. This implemented SL08.1 behavior is separate from acceptance of the remaining receipts/typing/leave requirements in SL08.2.

### Profile & Status
*   The control center: a personal profile, a "Your tags" summary of structured lifestyle categories, and verification status. Language, notifications, privacy, and account deletion live in a separate **Settings** screen, not Profile itself.
*   Public profile: first name/last initial, photo, age (not DOB), disclosed lifestyle facts, bio and opted-in badges. Contact/budget/exact move-in remain private. Phone optional for resident, required nonresident poster, never public. Approximate map point; exact address after accepted inquiry, remains after room unavailable, no ordinary owner revoke control. Rooms remain apartment-owned per-room prices (B2/B9/D4/D5).
*   Residents default to Discover and can select Discover or Map as the startup tab in Settings. Listers open on My Listings.
*   **Resident completion and editing:** Require a valid name, server-validated age18+, owned profile photo, short bio and cleanliness/sleep/guests/smoking answers. Save an incomplete draft and resume after reload; remaining approved lifestyle questions are progressive. Full name remains private; public display uses first name and last initial. Profile editing detects a stale revision and asks for reload instead of overwriting another window's changes.
*   **Facts, disclosure and preferences:** The [approved taxonomy](docs/specs/TAXONOMY.md) supplies canonical HE/EN options. Each own-fact answer has an explicit public-disclosure choice, off until selected. Private roommate preferences have separate accepted/preferred choices, optional no-smoking/no-pets constraints, pet-type acceptance and quiet hours; they are not public profile tags. Missing answers differ from an explicitly answered “none.” No marital/military/gender identity questionnaire is introduced. The gallery supports owned uploads, primary-photo selection and removal while protecting the last completed-profile photo.
*   **Private account controls:** Resident and lister editors preserve private full names and contact information; a lister uses name/phone/agency editing without a lifestyle questionnaire. Student verification badge visibility remains opt-in. Startup preference and signout controls are localized in Hebrew and English.

### Lister Dashboard [DEFAULT ENTRY POINT for Lister mode]
*   Startup dashboard for non-resident property posters: "My listings" with per-listing status (Active + interested count, or Rented). It does not replace their permitted Map/Discover browsing or existing Chats. Apartment-bound outreach still requires the separate consent flow; safe browsing is not permission for unrestricted resident introductions.

## 4. The Matching Engine
Matching uses structured resident facts/preferences and apartment facts, not free-form matching text. Preserve C1's31-category inventory through the approved C2 taxonomy and typed manifest; canonical resident questionnaire/storage are implemented, while production scoring remains SL07 work. Progressive minimum onboarding I9 is name/age/photo/bio plus cleanliness/sleep/guests/smoking; remaining fields can be completed later. Multi-fact categories must not force mutually compatible facts into one exclusive answer.

**Compatibility score**: provisional C3/C13 explained flexible lifestyle ranking, with optional free no-smoking/no-pets constraints and explicit missing-information coverage. Private budget/apartment suitability is separate. Group baseline uses the lowest sufficiently supported member fit. C2 normalized options adopted, wording refinements allowed; advanced strict controls are a future Pro hypothesis, not a current paywall.

## 5. Monetization Strategy
*   Free-only MVP. Advanced filters, area monitors and professional tools remain business hypotheses in docs/BUSINESS_MODEL.md. Private saver identity is not an approved Pro entitlement (G1/G2).

## 6. Technical Constraints
*   **Tech Stack:** Web-first (Next.js PWA) to prioritize SEO and sharing, with React Native (Expo) coming in Phase 2.
*   **Enclosed Ecosystem:** No external links to Facebook or Yad2. All listings are native UGC.
*   **Performance:** Lightweight map payloads; bounded server viewport querying follows decided J2/J6; no mandatory PostGIS. Do not treat PostGIS as a decided prerequisite.


Historical planning checkpoint, 17 October (requirements, not completion evidence): ordered dispatch [WORK_PLAN](docs/WORK_PLAN.md), bounded [EXECUTION_PACKETS](docs/EXECUTION_PACKETS.md). Nonresident posters browse safe people and send apartment-bound invitations; recipient acceptance precedes chat/address. Saver identities remain private. Technical/moderation defaults adopted; runtime evidence remains separate. DECISIONS.md wins.

## 7. Delivered scope and acceptance — 20 October 2026

`95f333b` delivered sequence-based unread/read protection, retry-safe chat sends, shared typed contracts and the initial age correction. `39fdcee` delivered canonical resident onboarding/editing, private preferences/disclosure, owned-photo protection, abbreviated public names, lister consent/private account editing and localized startup/signout. `2877c38` records the production review and browser-harness support; it does not add another application feature.

The [profile workstream](docs/workstreams/2026-10-19-sl01-canonical-profile.md) separates fresh HE/EN onboarding acceptance, ordinary-client privacy/age/photo assertions and the production9/9 chat/editor/startup/signout/auth regression. The [chat workstream](docs/workstreams/2026-10-19-cloud-mvp-progress.md) records the original two-browser unread repair. Full interactive Google login/account callback remains unexecuted; its provider-start redirect is only a preflight, so SL01.2 remains verification-incomplete for that assertion. The features above are delivered; this is not a claim that all requirements in this PRD are implemented. In particular composer overlay/drafts/request-key publication, remaining chat capabilities and production matching retain their packet-specific work and acceptance gates.

## Owner-approved listing management — 21 October 2026

Every poster, including a resident, reaches My Listings from Profile. Listers continue to start there. Manage published apartments and available rooms/intake; see property-specific and aggregate inquiries, safe sender profiles, optional introductions and accepted chats. Owners see Manage instead of contacting themselves. Multiple private cloud drafts include photos and resume across devices; Plus offers New or selected draft. Autosaved edits remain private until explicit Save changes. First deliver individual management, then connect the existing unanimous group-inquiry flow to the same inbox. This is approved scope, not a delivered-feature claim. See [contract](docs/specs/LISTING_MANAGEMENT.md) and the serial checklist.
