# Product Requirements Document (PRD): Roommate & Apartment Finder

## 1. Executive Summary
A real-time mobile marketplace designed to eliminate friction in the rental market by allowing renters to form groups *before* securing a lease. It blends a Hinge-style interaction model for finding compatible roommates with an Airbnb-style map interface for discovering apartments. The app functions as a live database connecting solo renters, existing roommate groups, and landlords, leveraging social proof to drive engagement.

## 2. Target Personas (User Modes)
Users can dynamically switch between these states in their Profile:
1. **The Solo Renter:** Looking for an apartment or looking to join a group.
2. **The Formed Group:** Up to 4 matched users looking for an apartment together.
3. **The Room-Filler:** Renters currently living in an apartment looking for a final roommate to fill an empty room.
4. **The Lister (Landlord/Realtor):** Users strictly posting empty apartments to the map.

## 3. Core Features & App Architecture
The app uses a 4-tab bottom navigation bar. 

### Tab 1: Discover (The Roommate Feed)
*   **Profile Structure:** Lightweight. Users select core "Vibe Tags" (lifestyle habits) and write one short bio. 
*   **Interaction Model:** No mindless swiping. Users must "like" and send a message attached to a specific Vibe Tag or bio to initiate contact.
*   **The "Double Date" Card:** Formed Groups and existing apartments are displayed as a stacked, swipeable card showing all roommates simultaneously rather than a single generic profile.
*   **Verification:** Verified users receive a blue checkmark badge.
*   **Anti-Ghost Town Logic:** Profiles inactive for 14 days are automatically paused/hidden from the feed.

### Tab 2: Map (The Apartment Feed)
*   **Geographical Map:** Shows available apartments displaying flat rent price, exact location, and required vibe.
*   **Seasonality Toggle:** A dedicated "Sublet" (סאבלט) filter to maintain high engagement during university breaks and mid-year turnovers.
*   **The "Hype" Engine (Social Proof):** Listings feature an "I'm Interested" button. Tapping it increments a public counter and adds the user's blurred profile picture to a stack.
*   **Smart Size Warnings:** If a Formed Group views an apartment with fewer bedrooms than their group size, a yellow ⚠️ warning is displayed.
*   **Crowdsourced Moderation:** Users can tap "Report as Taken." When a threshold is met, the landlord is notified and the listing is automatically flagged to keep the map clean.

### Tab 3: Chats & Groups
*   **Upgrading Chats:** 1-on-1 chats initiate here upon a mutual Hinge-style match. Users can upgrade a chat to an official "Group."
*   **Group Controls:** Maximum of 4 members. The group admin can toggle the group status to "Closed" to stop appearing in the Discover feed.
*   **Collaborative Map Saves:** Groups share an integrated Wishlist. Favoriting an apartment on the map pushes it to the group chat for review.

### Tab 4: Profile & Status
*   The control center where users toggle their current mode, edit Vibe Tags, and manage verification.

## 4. The Matching Engine
To ensure long-term compatibility, matching prioritizes lifestyle friction points over generic hobbies:
1.  **Cleanliness Tolerance:** (Messy/Lived-in vs. Clinically Clean)
2.  **Sleep Schedule:** (Night Owl vs. Early Bird)
3.  **Guest & Social Policy:** (Quiet Sanctuary vs. The Pre-game Hub)
4.  **Noise Tolerance:** (Needs silence vs. Constant background noise)

## 5. Monetization Strategy
*   **The "Unblur" Pro Tier:** Standard users see blurred profile photos on the "I'm Interested" apartment hype counter. Premium users can pay to unblur these photos to gauge competition or snipe potential roommates.

## 6. Technical & UI Constraints
*   **Tech Stack:** React Native (Expo) for the frontend; Supabase (PostgreSQL, Auth, Real-time WebSockets) for the backend.
*   **The Thumb Zone:** Primary actions must always be in the bottom third of the screen where thumbs naturally rest.
*   **Single Primary Action:** Every screen must have one visually dominant button.
*   **Immediate Feedback:** The app must feel alive. The "I'm Interested" counter must tick up locally the exact millisecond it is tapped.

## 7. Launch Strategy (MVP)
*   **Geofence:** The MVP will strictly launch and operate in Beersheba to ensure high network density.
*   **Cold Start:** The database must be seeded with ~200 real apartment listings prior to Day 1.

## 8. Database Schema (Supabase)

**Source of truth is `supabase/schema.sql` + `supabase/rls.sql`**, both applied to the live project. The tables below are what changed from the original draft and why.

### 8.1 Tables the draft was missing
The draft schema could not support the features described above. These were added:

| Table | Why the draft could not work without it |
|---|---|
| `likes` | Discover's entire interaction — like + message pinned to a tag or the bio — had nowhere to live. Carries `message` and `ref_tag`. |
| `conversations`, `conversation_members`, `messages` | Tab 3 is a chat product with no chat schema. |
| `apartment_reports` | "Report as Taken" was a bare `reports_taken` integer, so one user could tap it 500 times. Now one row per user, primary key does the deduping. |
| `blocks`, `user_reports` | App Store guideline 1.2 requires block + report on any app where strangers message each other. Without these you cannot ship to iOS. |
| `saves` | Replaces `group_wishlist`. Solo users need saved apartments too, so `group_id` is nullable: null = private save, set = shared group wishlist. One table covers both. |
| `push_tokens` | A match/message product is dead without notifications. |

### 8.2 Fields the draft was missing
*   `profiles`: `photo_url`, `photo_blur_url`, `budget_min/max`, `move_in_date`, `birth_date`, `gender`, `onboarded`. §4 says users "edit matching criteria" but the draft defined no criteria to match on.
*   `apartments`: `title`, `address`, `description`, `photos`, `available_from`, `contact_url`, `source`. A map pin with only a price and a bed count is not a listing.
*   `groups.apartment_id`: Room-Fillers already live somewhere. Nothing in the draft connected a group to its apartment.

### 8.3 Fields deliberately removed
*   `groups.member_count` — a denormalised counter that drifts. `count(*)` on 4 rows is free.
*   `apartments.reports_taken` — same, replaced by `apartment_reports` + the `apartment_stats` view.
*   `users` renamed to `profiles`, keyed 1:1 to `auth.users(id)`. Supabase owns the auth table; app data goes beside it.

### 8.4 Security decisions worth knowing
*   **The Pro unblur has to be server-side.** If the app receives `photo_url` and blurs it in CSS, anyone can read the real URL out of the network log and the Pro tier is unsellable. The `apartment_hype_faces` view returns the blurred derivative *and withholds `user_id` and `name`* from non-Pro users — withholding only the photo still leaked, because a non-Pro client could take the user_id and fetch the sharp photo straight from `profiles`.
*   **`is_pro` and `is_verified` are revoked from the `authenticated` role at the column level.** RLS cannot express "any column except these two", so without this any user could grant themselves Pro with one REST call.
*   **Starting a chat runs through the `accept_like()` RPC**, not client writes. It is three writes that must all land or none, and one of them posts a message on the other person's behalf.
*   Every table has RLS enabled. `apartment_interests` is readable only for your own rows — public counts come from the `apartment_stats` view.

### 8.5 Deliberate simplifications
*   **No PostGIS.** One city, ~200 listings: the app fetches all active apartments once and filters in memory. Add PostGIS + a GIST index at a second city or ~5k listings.
*   **No cron for the 14-day auto-pause.** It is a `where last_active_at > now() - interval '14 days'` filter on the feed query. A background job that flips a boolean would do the same thing and be able to fall behind.

## 9. Decisions still open

| # | Decision | Recommendation |
|---|---|---|
| 1 | **What earns the blue checkmark?** `is_verified` exists with no process behind it. | BGU student email (`@post.bgu.ac.il`) one-time verify. High signal, near-zero cost, and it is exactly the trust signal your audience cares about. |
| 2 | **Vibe tags vs. the §4 matching axes.** §4 names 4 lifestyle friction axes; the schema stores a free-form `text[]`. You cannot rank or filter on a free array. | Promote the 4 axes to 4 columns with fixed values, keep `vibe_tags` for flavour. This is the one schema fork that is expensive to change later. |
| 3 | **How does a Group get discovered?** Groups have no bio, no tags, no photo — but §3 shows them as swipeable cards. | Give `groups` its own `bio` and derive tags from members. |
| 4 | **Report-as-taken threshold.** | 3 distinct reporters → `flagged`. Tune once you see real numbers. |
| 5 | **Are photos mandatory?** A blurred-photo paywall is worthless if half the users have no photo. | Require 1 photo to finish onboarding. |
| 6 | **When to build Pro.** In-app purchase means Apple/Google take 15–30% and you need RevenueCat; Stripe is not allowed for digital goods in-app. | Ship free. Build Pro when hype counters routinely show >5 interested users, or there is nothing to unblur. |
| 7 | **Account deletion.** Required by both app stores and by Israeli privacy law. | `on delete cascade` is already wired throughout; needs a button and a confirm. |

## 10. Not yet built
Discover, Map, Chats and Profile exist and talk to the live database. Still missing: onboarding flow, photo upload, the group "Double Date" card, the message thread screen (the list exists, the thread does not), realtime subscriptions, push notifications, block/report UI, swipe gestures.
