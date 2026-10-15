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
*   **The "Hype" Engine:** Listings feature an "I'm Interested" button.
*   **Apartment listings with available rooms:** A listing represents an apartment. The poster adds one or more currently available rooms with individual monthly prices, and marks whether bills are included. A room is never a separate public listing.
*   **Hand-Me-Down Market:** A leaving roommate can list furniture directly on their apartment's listing (e.g. "bed frame + mattress, 300 ₪"). The incoming roommate messages the seller to arrange pickup during move-in — no separate marketplace, no Facebook/Yad2 handoff.

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
*   **Conversations:** Individual and group conversations appear in Chats. Apartment sharing into either conversation and contacting landlords as a group are future capabilities.

### Profile & Status
*   The control center: a personal profile, a "Your tags" summary of structured lifestyle categories, and verification status. Language, notifications, privacy, and account deletion live in a separate **Settings** screen, not Profile itself.
*   Public profile fields are display name, photo, age (not birth date), lifestyle tags, bio, and badges the user chooses to show. Phone, email, budget, and exact move-in date stay private. One optional phone number is kept per account and is never printed on the public listing; enquiries stay in-app. Listings show a stable approximate map pin, 500m from the precise point; their exact address is released only after the poster accepts an in-app enquiry. Each public listing represents an apartment and shows its available room or rooms, their individual monthly price, and whether bills are included; rooms do not appear as standalone listings.
*   Residents default to Discover and can select Discover or Map as the startup tab in Settings. Listers open on My Listings.

### Lister Dashboard [DEFAULT ENTRY POINT for Lister mode]
*   Replaces Discover/Map browsing for Non-resident property posters: "My listings" with per-listing status (Active + interested count, or Rented).

## 4. The Matching Engine
Matching uses structured, filterable, indexed categories (columns in the database) — a **31-category taxonomy** (16 renter-lifestyle + 15 apartment-characteristic categories: Gender Dynamic, Cleanliness, Sleep Schedule, Social & Guests, Noise Tolerance, Music/Vibe, Climate Control, Smoking Policy, Kitchen & Dietary, Cooking Dynamics, Pet Ownership, Weekend Routine, Relationship Status, Study Habits, Financial Splitting, Reserve Duty/Miluim, plus Proximity to BGU, AC, Security & Safety, Water Heating, Furnishing, Hand-Me-Downs, Outdoor Space, Laundry, Accessibility, Parking, Pet Rules, Kitchen Setup, Hidden Costs, Internet, Roommate Cap — see `DECISIONS.md` C2 for the full list). Each renter selects one value per lifestyle category via a grouped tag picker (Lifestyle / Apartment preferences / Logistics).

**Compatibility score**: a two-tier match shown before either side opens a chat. **Non-negotiable** categories (e.g. budget, smoking, pets) must match exactly — a hard gate. **Flexible** categories (e.g. cleanliness, sleep schedule, social & guests) are scored by closeness and combined into a single match percentage.

## 5. Monetization Strategy
*   **The "Unblur" Pro Tier:** Premium users can pay to unblur interested profiles on the apartment hype counter.

## 6. Technical Constraints
*   **Tech Stack:** Web-first (Next.js PWA) to prioritize SEO and sharing, with React Native (Expo) coming in Phase 2.
*   **Enclosed Ecosystem:** No external links to Facebook or Yad2. All listings are native UGC.
*   **Performance:** Lightweight map payloads (lat/lng/price only) with PostGIS server-side rendering support.
