# Product Requirements Document (PRD): Shutaf

## 1. Executive Summary
A real-time web and mobile marketplace designed to eliminate friction in the rental market by allowing renters to form groups *before* securing a lease. The app functions as a live database connecting solo renters, existing roommate groups, and landlords. It is a completely enclosed ecosystem: all listings, communications, and group sharing happen strictly inside the app.

## 2. People and groups
The first onboarding fork is **residency**: anyone who will live in the apartment completes a personal profile before posting or matching. Non-resident property posters complete account-only intake (name, phone, optional agency) and use My Listings.

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
*   **Conversations:** Individual/group chats include text, safe apartment cards, read receipts and authorized ephemeral typing. Each viewer can privately save a shared apartment independently; no separate shared wishlist (E7/E8/F2/F3). Contacting landlords as a group remains future.

### Profile & Status
*   The control center: a personal profile, a "Your tags" summary of structured lifestyle categories, and verification status. Language, notifications, privacy, and account deletion live in a separate **Settings** screen, not Profile itself.
*   Public profile: first name/last initial, photo, age (not DOB), disclosed lifestyle facts, bio and opted-in badges. Contact/budget/exact move-in remain private. Phone optional for resident, required nonresident poster, never public. Approximate map point; exact address after accepted inquiry, remains after room unavailable, no ordinary owner revoke control. Rooms remain apartment-owned per-room prices (B2/B9/D4/D5).
*   Residents default to Discover and can select Discover or Map as the startup tab in Settings. Listers open on My Listings.

### Lister Dashboard [DEFAULT ENTRY POINT for Lister mode]
*   Replaces Discover/Map browsing for Non-resident property posters: "My listings" with per-listing status (Active + interested count, or Rented).

## 4. The Matching Engine
Matching uses structured resident facts/preferences and apartment facts, not free-form matching text. Preserve C1's 31-category inventory while C2's actual labels/options are refined. Progressive minimum onboarding I9 is name/age/photo/bio plus cleanliness/sleep/guests/smoking; remaining fields can be completed later. Multi-fact categories must not force mutually compatible facts into one exclusive answer.

**Compatibility score**: provisional C3/C13 explained flexible lifestyle ranking, with optional free no-smoking/no-pets constraints and explicit missing-information coverage. Private budget/apartment suitability is separate. Group baseline uses the lowest sufficiently supported member fit. C2 normalized options adopted, wording refinements allowed; advanced strict controls are a future Pro hypothesis, not a current paywall.

## 5. Monetization Strategy
*   Free-only MVP. Advanced filters, area monitors and professional tools remain business hypotheses in docs/BUSINESS_MODEL.md. Private saver identity is not an approved Pro entitlement (G1/G2).

## 6. Technical Constraints
*   **Tech Stack:** Web-first (Next.js PWA) to prioritize SEO and sharing, with React Native (Expo) coming in Phase 2.
*   **Enclosed Ecosystem:** No external links to Facebook or Yad2. All listings are native UGC.
*   **Performance:** Lightweight map payloads; bounded server viewport querying follows decided J2/J6; no mandatory PostGIS. Do not treat PostGIS as a decided prerequisite.


17 October checkpoint: ordered dispatch [WORK_PLAN](docs/WORK_PLAN.md), bounded [EXECUTION_PACKETS](docs/EXECUTION_PACKETS.md). Nonresident posters browse safe people and send apartment-bound invitations; recipient acceptance precedes chat/address. Saver identities remain private. Technical/moderation defaults adopted; runtime evidence remains separate. DECISIONS.md wins.
