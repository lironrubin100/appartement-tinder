# Product Requirements Document (PRD): Shutaf

## 1. Executive Summary
A real-time web and mobile marketplace designed to eliminate friction in the rental market by allowing renters to form groups *before* securing a lease. The app functions as a live database connecting solo renters, existing roommate groups, and landlords. It is a completely enclosed ecosystem: all listings, communications, and group sharing happen strictly inside the app.

## 2. Target Personas (User Modes)
The first onboarding fork is **residency, not persona**: "Will you be living here?" Anyone who will live in the apartment must complete a full profile before posting or matching; anyone posting on behalf of a property they won't live in gets an account-only intake (name, phone, agency — no profile). Within "living here," a single account dynamically switches its "Mode" (similar to Bumble / Bumble BFF) at any time via a persistent mode-switcher in Profile:
1. **The Solo Renter:** Looking for an apartment or looking to join a group.
2. **The Formed Group:** Up to 4 matched users looking for an apartment together.
3. **The Room-Filler:** Renters currently living in an apartment looking for a final roommate to fill an empty room. Posts through a shorter, apartment-scoped form (room rent, move-in date, tags) rather than the full listing composer.
4. **The Lister (Landlord/Realtor):** Account-only, no profile. Has a dedicated dashboard ("My listings") instead of Discover access.

## 3. Core Features & App Architecture
The app ships in Hebrew (default, RTL) and English (LTR). It exposes five destinations — Profile, Discover, Map, Plus (post a listing), Chats — rendered as a fixed bottom bar on mobile and free to take another shape on desktop. It opens directly to the Map.

### Map (The Apartment Feed) [DEFAULT ENTRY POINT]
*   **Geographical Map:** Shows available apartments. For performance, map pins are lightweight, displaying only the flat rent price and location.
*   **Details on Demand:** Tapping a pin dynamically loads the full listing details, photos, and descriptions.
*   **Favorites (Wishlist):** Users can save apartments. Favorited apartments render with a distinct star icon and a yellow aura on the map.
*   **The "Hype" Engine:** Listings feature an "I'm Interested" button.
*   **Whole Apartments Only:** All listings represent an entire apartment, not individual rooms.
*   **Hand-Me-Down Market:** A leaving roommate can list furniture directly on their apartment's listing (e.g. "bed frame + mattress, 300 ₪"). The incoming roommate messages the seller to arrange pickup during move-in — no separate marketplace, no Facebook/Yad2 handoff.

### Discover (The Roommate Feed)
*   **Structured Profiles:** Users are scored and filtered based on structured lifestyle categories (not free-form text).
*   **Interaction Model:** Users send a "Like" attached to a specific trait or bio element, along with an optional message. The receiving user must accept the like to open a chat (Accept-a-Like model).
*   **Dynamic Group Cards:** Formed Groups are displayed as a swipeable card. The group's card is dynamically computed and generated from the individual profiles of its members.

### Plus (Post a Listing)
*   A button in the navigation bar, but not a destination: it opens the native listing composer as an overlay over whatever screen you are on, and closes back to it.
*   Available to any user, since posting is an action rather than a persona (D1).

### Chats & Groups
*   **Accepting Matches:** Inbound likes sit here pending acceptance.
*   **Group Controls:** 1-on-1 chats can be upgraded to official Groups (max 4 members).
*   **In-App Ecosystem:** Users can share favorited map listings directly into the group chat for review.

### Profile & Status
*   The control center: a persistent mode-switcher row ("Currently: [mode]"), a "Your tags" summary of structured lifestyle categories, and verification status. Language, notifications, privacy, and account deletion live in a separate **Settings** screen, not Profile itself.

### Lister Dashboard
*   Replaces Discover/Map browsing for Lister-mode accounts: "My listings" with per-listing status (Active + interested count, or Rented).

## 4. The Matching Engine
Matching uses structured, filterable, indexed categories (columns in the database) — a **31-category taxonomy** (16 renter-lifestyle + 15 apartment-characteristic categories: Gender Dynamic, Cleanliness, Sleep Schedule, Social & Guests, Noise Tolerance, Music/Vibe, Climate Control, Smoking Policy, Kitchen & Dietary, Cooking Dynamics, Pet Ownership, Weekend Routine, Relationship Status, Study Habits, Financial Splitting, Reserve Duty/Miluim, plus Proximity to BGU, AC, Security & Safety, Water Heating, Furnishing, Hand-Me-Downs, Outdoor Space, Laundry, Accessibility, Parking, Pet Rules, Kitchen Setup, Hidden Costs, Internet, Roommate Cap — see `DECISIONS.md` C2 for the full list). Each renter selects one value per lifestyle category via a grouped tag picker (Lifestyle / Apartment preferences / Logistics).

**Compatibility score**: a two-tier match shown before either side opens a chat. **Non-negotiable** categories (e.g. budget, smoking, pets) must match exactly — a hard gate. **Flexible** categories (e.g. cleanliness, sleep schedule, social & guests) are scored by closeness and combined into a single match percentage.

## 5. Monetization Strategy
*   **The "Unblur" Pro Tier:** Premium users can pay to unblur interested profiles on the apartment hype counter.

## 6. Technical Constraints
*   **Tech Stack:** Web-first (Next.js PWA) to prioritize SEO and sharing, with React Native (Expo) coming in Phase 2.
*   **Enclosed Ecosystem:** No external links to Facebook or Yad2. All listings are native UGC.
*   **Performance:** Lightweight map payloads (lat/lng/price only) with PostGIS server-side rendering support.
