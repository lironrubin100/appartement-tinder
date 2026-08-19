# Decision Register

Every decision this product needs, whether or not it has been made. This file is
the arbiter: if `PRD.md`, `ARCHITECTURE.md` and the code disagree, this file wins.

## How to use it

1. **Work top-down.** Sections are ordered so that earlier decisions unblock later ones.
2. **Check `Blocks`.** A decision with a long `Blocks` list is expensive to change later — decide those carefully and early.
3. **Nothing gets built from an `OPEN` row.** If code needs an answer that isn't here, stop and add the row.
4. **Recommendations are defaults, not verdicts.** They exist so you can say "yes" and move on when you have no strong opinion.

## Status legend

| Status | Meaning |
|---|---|
| `DECIDED` | Answered. The answer is in the Decision column. |
| `OPEN` | Needs your call. Recommendation is a proposal only. |
| `RESEARCH` | Needs information neither of us has yet — usually external (legal, pricing, a platform's rules). |

---

## A. Product definition & scope

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| A1 | One sentence: what is this product? | OPEN | "The place Beer Sheva students find both an apartment and the people to share it with." Write it, then use it to reject features. | everything |
| A2 | What is it explicitly **not**? | OPEN | Not a general listings site, not a national portal, not a broker. | A1, M6 |
| A3 | The single job-to-be-done in the primary journey | OPEN | "Go from alone to signed-lease-with-roommates." | C, D, E |
| A4 | Which tab does the app open on? | DECIDED | Map. Apartments have standalone value on day one; roommate discovery does not. | I4 |
| A5 | Geographic scope and how the boundary is enforced | OPEN | Beer Sheva only. Enforce by rejecting listings outside a bounding box, not by user location. | D4, J6 |
| A6 | Students only, or anyone? | OPEN | Anyone may register; students get the verified badge. Excluding non-students loses young professionals who are the same customer. | B3, M5 |
| A7 | Languages | OPEN | Hebrew only, RTL. Adding English later costs an i18n refactor — decide now whether you ever want it. | I2, all copy |
| A8 | Off-season behaviour (Nov–Feb the market is dead) | OPEN | Sublet filter is the answer already in the PRD; decide whether the app changes shape or just gets quiet. | D8 |
| A9 | Success metric for launch | OPEN | Signed leases attributed to the app. Everything else (signups, DAU) is a proxy that can look good while the product fails. | L3, J13 |

---

## B. Identity, auth & trust

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| B1 | Auth providers | DECIDED | Google + Apple. Revisit for web — Google alone may be enough on web; Apple is only mandatory inside a native iOS app. | I9, K1 |
| B2 | Is a phone number collected? Required? | OPEN | Collect, don't require, never display. It's your only real anti-duplicate signal and your only recovery channel. | B8, H6 |
| B3 | What earns the blue check | OPEN | BGU/Sami Shamoon student email, verified by one-time code. Automatic, free, and it's exactly the trust signal your users care about. | B4, A6, D10 |
| B4 | Verification: automated or manual by you | OPEN | Automated via email domain. Manual review does not survive 3,000 users. | B3 |
| B5 | Minimum age and how it's enforced | OPEN | 18, self-declared at onboarding, no document check. | M4, H5 |
| B6 | Real-name policy | OPEN | First name + last initial displayed. Full name collected, never shown. | I9 |
| B7 | Account deletion and data retention | OPEN | Hard delete on request, cascade everywhere, 30-day grace. Legally required and cheap now, painful later. | J1, M2 |
| B8 | Duplicate accounts and ban evasion | OPEN | Accept the risk in year one; phone number (B2) is the lever if abuse appears. | B2, H6 |
| B9 | What is public on a profile vs private | OPEN | Public: first name, photo, age, tags, bio, verified badge. Private: budget, exact move-in date, phone, email. | C4, I9 |

---

## C. Roommate discovery & matching

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| C1 | **Shape of the four friction axes** — free tags, forced choice, or weighted score | OPEN | Forced choice: four questions, 3 options each, stored as four columns. A free `text[]` cannot be ranked, filtered or scored. **This is the most expensive row in the file to change later.** | C2, C3, C4, J1, J2 |
| C2 | The final vibe tag list (exact Hebrew copy) | OPEN | 10–14 tags, written by you, not me. The ones currently in the code are my invention and should be deleted. | I9, C3 |
| C3 | Feed ordering algorithm | OPEN | v1: recency + compatibility on the four axes. Do not build ML. | C1, J2 |
| C4 | Filters the user controls | OPEN | Budget, move-in month, area, gender (see C5). Keep it to four. | C5, B9 |
| C5 | **Gender filtering — in or out** | OPEN | In, as a hard filter, and default it to "any". Student housing here is frequently single-gender and users will demand it. Touches: schema, feed query, filters UI, and M5. | C4, J2, M5 |
| C6 | Is a message always required with a like? Minimum length? | OPEN | Always required, 10-char minimum. It's the anti-swipe-spam mechanism and the product's differentiator. | C7, F4 |
| C7 | Daily like limits | OPEN | 20/day free. Prevents spam and creates the natural Pro upsell. | G4, G5 |
| C8 | Is "pass" permanent? | OPEN | Permanent, but stored so the feed can exclude it. At 3,000 users a permanent pass will exhaust the feed for heavy users — see C12. | C12, J2 |
| C9 | **Mutual match, or accept-a-like?** | OPEN | Accept-a-like, as currently built — but note this contradicts the PRD's "mutual Hinge-style match". Pick one and fix the other document. | F1, F4 |
| C10 | Auto-pause: rules and how a user comes back | OPEN | Hide after 14 days inactive, un-pause automatically on next open. Tell the user it happened. | J2, L5 |
| C11 | Can you see who liked you without Pro? | OPEN | Yes, in full. Gating inbound likes kills the loop before it starts. | G2, G4 |
| C12 | Do passed profiles ever return? | OPEN | Return after 60 days. At this city size the feed will otherwise run dry. | C8, J2 |

---

## D. Apartments & listings

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| D0 | Where listings come from | DECIDED | Posted natively in-app by real users. No scraping, no external sources, no linking out. | D1, M1, M6 |
| D1 | **Who can post** | OPEN | Any registered user. Makes posting an action rather than a persona, which removes the `lister` mode entirely. | D10, E12, J1 |
| D2 | Required fields on a listing | OPEN | Title, price, bedrooms, location, available-from, ≥1 photo. Everything else optional. | D3, I9 |
| D3 | Photos: minimum, maximum, required? | OPEN | 1 required, 8 max. A photoless listing is noise on the map. | J9, K3 |
| D4 | **Address precision — exact pin or approximate?** | OPEN | Approximate (~150m jitter) until contact is made, exact after. Publishing exact addresses of occupied student flats is a safety problem. | A5, H7, J6 |
| D5 | Price semantics: per room or whole apartment? Bills included? | OPEN | Per whole apartment, with an explicit "bills included" flag. Ambiguity here poisons every filter and comparison. | D13, C4 |
| D6 | Listing lifecycle: expiry and renewal | OPEN | Auto-expire after 45 days, one-tap renew. Stale listings are the #1 killer of listing-site trust. | D7, L5 |
| D7 | Report-as-taken: threshold and consequence | OPEN | 3 distinct reporters → `flagged`, hidden from map, poster notified to confirm or renew. | D6, H3 |
| D8 | Sublet vs long-term: separate types or a flag? | OPEN | A flag, as built. A separate type doubles every query for one boolean. | A8, D13 |
| D9 | **"Whole apartment" vs "room in an apartment" — same entity?** | OPEN | Same table, discriminated by a `listing_kind` column. They share 90% of their fields and all of their map behaviour. | D12, E5, J1 |
| D10 | Moderation: pre-approval or post-hoc? | OPEN | Post-hoc with reporting. Pre-approval does not survive your launch volume and delays the supply you need. | D1, H3 |
| D11 | Duplicate listing detection | OPEN | None in v1. Revisit if the same flat appears from multiple posters. | D7 |
| D12 | Can a listing be attached to a group (room-fillers)? | OPEN | Yes — this is how "we live here, we need a fourth" works at all. | E5, D9 |
| D13 | Filter set on the map | OPEN | Price range, bedrooms, sublet, available-from. Four filters, no more. | D5, D8, J2 |
| D14 | Map clustering and zoom behaviour | OPEN | Cluster below zoom 14. 1,000 individual pins will not render acceptably. | J6, I4 |

---

## E. Groups

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| E1 | How a group is formed | OPEN | Upgrade from a 1:1 chat, per the PRD. Also allow direct creation with invites — friends who already know each other shouldn't have to match first. | F5, E3 |
| E2 | Max size — is 4 a hard limit? | OPEN | Hard limit 4, enforced in the database. | J1 |
| E3 | Admin powers, and what happens when the admin leaves | OPEN | Admin can add/remove and set status. On leaving, oldest remaining member inherits. Undefined ownership creates orphaned groups. | E4 |
| E4 | What `open` / `closed` actually mean | OPEN | `closed` = hidden from Discover, chat still live. | E5 |
| E5 | Are groups discoverable in Discover (the "Double Date" card)? | OPEN | Yes — but this needs E6 answered first or there is nothing to show on the card. | E6, C3, D12 |
| E6 | Does a group have its own bio/photo, or is it derived from members? | OPEN | Own short bio written by the admin, photos derived from members. A group with no voice is not swipeable. | E5, I9 |
| E7 | Shared wishlist mechanics | OPEN | Any member saves, all members see, anyone can remove. | E8, J1 |
| E8 | Sharing a listing into a group chat | OPEN | A listing card as a message type — this is the loop that pulls friends into the app. | F3, E7 |
| E9 | Can a group message another group? Can a solo user message a group? | OPEN | Solo → group yes. Group → group no in v1; it doubles the matching surface. | C9, F1 |
| E10 | Terminal state: what happens when a group signs a lease? | OPEN | "We found a place" — archives the group, prompts a review, and is your success metric (A9). | A9, L7 |

---

## F. Messaging

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| F1 | Realtime or polling | OPEN | Supabase Realtime. Polling at a few hundred concurrent users costs more than the socket. | J8, K3 |
| F2 | Read receipts, typing indicators | OPEN | Read receipts yes, typing no. Typing indicators triple realtime traffic for decoration. | J8 |
| F3 | Message types | OPEN | Text + listing card (E8). Images in v2 — they add storage, moderation and abuse surface. | E8, J9, H4 |
| F4 | Can you message a lister without matching? | OPEN | Yes. An apartment enquiry is not a roommate match and should not need one. | C9, C6 |
| F5 | Unmatch / leave conversation | OPEN | Leave hides the thread for you and stops notifications; it does not delete the other person's copy. | H1 |
| F6 | Message retention | OPEN | Keep indefinitely, delete with the account. | B7, M2 |
| F7 | Push notification triggers and copy | OPEN | New like, new message, listing you saved was taken. Nothing else. | L5, K2 |
| F8 | Message rate limits | OPEN | 30/hour to distinct users. | C7, H6 |

---

## G. Social proof & monetization

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| G1 | Who is counted in the hype counter? | OPEN | Anyone who tapped "interested", count shown to everyone. | G2, J4 |
| G2 | What exactly does Pro unblur? | OPEN | Photo and name of interested users. Identity must be withheld server-side, not just the image — see ARCHITECTURE. | G4, J7 |
| G3 | Pro price and billing rails | RESEARCH | Web = Stripe (no platform cut). Native iOS = in-app purchase, 15–30% to Apple, Stripe not permitted for digital goods. This is a real reason to stay on web longer. | K6, M1 |
| G4 | Other Pro features besides unblur | OPEN | Unlimited likes (C7), see who liked you first, boosted placement. Unblur alone is a thin product. | C7, C11 |
| G5 | Free tier limits | OPEN | 20 likes/day, everything else unlimited. | C7, G4 |
| G6 | When Pro ships | OPEN | Not until hype counters routinely show 5+ interested users. Before that there is nothing worth unblurring. | G1, A9 |

---

## H. Safety & moderation

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| H1 | Block: what does it hide, in which direction? | OPEN | Fully symmetric — neither sees the other anywhere, including hype counters. | F5, J2 |
| H2 | Report categories and what each triggers | OPEN | Fake listing / harassment / inappropriate photo / scam. Each into one queue. | H3 |
| H3 | Who reviews reports, and how fast | OPEN | You, daily, in the Supabase dashboard for v1. Needs an actual admin view before ~50 reports/week. | H2, D10 |
| H4 | Automated checks on photos and text | OPEN | None in v1. Revisit when a real incident happens, not before. | F3, D3 |
| H5 | Minors | OPEN | Age gate at signup (B5), delete on report. | B5, M4 |
| H6 | Harassment escalation and bans | OPEN | Manual ban by you. Needs a `banned` flag and an RLS rule. | B8, F8 |
| H7 | In-person meeting safety guidance | OPEN | A short interstitial before first contact. Cheap, and it matters. | D4 |

---

## I. Design system & UX

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| I1 | Name, logo, colour palette, typography | OPEN | All currently invented by me and should be replaced. Nothing else in this section can be decided first. | all of I |
| I2 | Hebrew/RTL typography — typeface and numerals | OPEN | A real Hebrew typeface (Assistant, Rubik, Heebo). System fonts render Hebrew badly on some Androids. | I1, A7 |
| I3 | Component library | OPEN | shadcn/ui + Tailwind, with RTL configured from the start. Retrofitting RTL is worse than it sounds. | K1, A7 |
| I4 | Tab names, order, and icons | OPEN | Map / Discover / Chats / Profile, in that order (A4). | A4, D14 |
| I5 | How the thumb-zone rule is enforced | OPEN | A documented layout rule + a shared bottom-action component, or it will be violated by the third screen. | I3 |
| I6 | How "one primary action per screen" is enforced | OPEN | One `variant="primary"` per route, checked in review. | I3 |
| I7 | Empty state for every screen | OPEN | Enumerate them explicitly. Your launch-day app is mostly empty states. | I9, L3 |
| I8 | Loading and error states | OPEN | Skeletons, not spinners. Errors must say what to do next. | I3 |
| I9 | **Onboarding: exact steps, order, what's mandatory** | OPEN | Auth → name+photo → mode → four axes → budget/dates → done. Every field you demand costs signups. | B3, B6, C1, D2 |
| I10 | Accessibility baseline | OPEN | Contrast, focus states, touch targets, labelled inputs. Cheap now. | I3 |
| I11 | Dark mode | OPEN | No in v1. It doubles design review for no acquisition benefit. | I1 |
| I12 | Motion and animation language | OPEN | Sparing. Reserve motion for the interest counter and the like send. | I3 |
| I13 | Photo aspect ratios and cropping | OPEN | Profiles 4:5, listings 3:2. Fix now or the map cards will never look consistent. | D3, J9 |

---

## J. Architecture & data

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| J1 | Final entity model | OPEN | Downstream of C1, D1, D9, E6. Do not freeze the schema until those four are answered. | everything |
| J2 | **Feed query strategy and pagination** | OPEN | Keyset pagination, filtering server-side in an RPC. The current `NOT IN (...)` of every prior like is unbounded and lives in a URL. | C1, C3, J7 |
| J3 | Where filtering happens: client, RLS, or RPC | OPEN | RPC for feeds, RLS for authorization only. RLS is a security boundary, not a query planner. | J2, J7 |
| J4 | Counters: computed, cached, or triggered? | OPEN | Trigger-maintained counter columns. The current per-apartment correlated subqueries are 2,000 subqueries per map load at 1,000 listings. | G1, D7, J5 |
| J5 | Index plan | OPEN | Write it explicitly per query, don't rely on defaults. | J2, J4 |
| J6 | **PostGIS — revisit at 1,000 listings** | OPEN | Yes, adopt it. My earlier "skip it" call assumed 200 listings and no viewport queries; at 1,000 with clustering it stops being defensible. | D14, A5, D4 |
| J7 | What moves into server-side RPCs | OPEN | Feed, map viewport, accept-like, hype faces, interest toggle. Anything multi-write or paywalled. | J2, J3, G2 |
| J8 | Realtime channel design and connection limits | RESEARCH | One channel per conversation. Need the concurrent-connection ceiling for the Supabase plan you land on. | F1, K3 |
| J9 | Photo pipeline: upload, resize, CDN, blur derivative | OPEN | Client-side resize before upload; generate the blurred derivative at upload time. Supabase image transforms are a paid feature. | D3, I13, G2, K3 |
| J10 | Caching strategy | OPEN | Cache the map payload; never cache anything user-scoped. | J2, K1 |
| J11 | How schema changes ship | OPEN | Numbered migration files in the repo, never dashboard edits. The live schema already drifted from the files once. | K5, J12 |
| J12 | Environments | OPEN | Separate dev and prod Supabase projects. Right now there is one, and it has six fake listings in it. | J11, K5 |
| J13 | Error tracking and analytics | OPEN | Sentry + PostHog. Instrument A9's metric on day one or you will never reconstruct it. | A9, L7 |
| J14 | API rate limiting | OPEN | Supabase defaults plus the app-level limits in C7/F8. | C7, F8 |

---

## K. Platform & infrastructure

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| K1 | Web stack and hosting | DECIDED | Next.js on Vercel, Supabase backend. Web first, native later. | I3, J10 |
| K2 | PWA: install prompt, offline behaviour | OPEN | Installable, no offline mode. Offline for a live marketplace is misleading. | F7, K6 |
| K3 | **Supabase free vs Pro — where does free stop being viable?** | RESEARCH | Free tier's hard limits on concurrent realtime connections, storage and bandwidth are the binding constraints at "a few hundred concurrent + 1,000 listings with photos". Needs the current published limits checked before launch, not guessed. | J8, J9, F1 |
| K4 | Domain name | OPEN | Buy before the campaign (L1) — the campaign is where the name gets committed. | L1, I1 |
| K5 | CI/CD and preview deploys | OPEN | Vercel preview per branch; migrations run manually until they're boring. | J11, J12 |
| K6 | When the native app happens, and how code is shared | OPEN | After web validates. Expect to share the Supabase layer and rewrite the UI. | G3, K2 |

---

## L. Growth, launch & operations

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| L1 | Pre-launch waitlist: where does it live? | DECIDED (approach) | Campaign before launch, WhatsApp group, accounts/waitlist ahead of go-live. Still open: is the waitlist a landing page or the real app in pre-launch mode? | K4, L2 |
| L2 | What the WhatsApp group is for after launch | OPEN | Feedback channel and support. Decide who runs it. | L6 |
| L3 | Launch-day supply target and the fallback if it misses | OPEN | Target 1,000 listings. **Define the fallback now** — an empty map on day one is unrecoverable. | A9, D0 |
| L4 | Referral / invite mechanics | OPEN | Group invites (E1) are the natural viral loop. A separate referral scheme is probably redundant. | E1, E8 |
| L5 | Lifecycle notifications and emails | OPEN | New like, new message, listing taken, you've been auto-paused. | F7, C10, D6 |
| L6 | Support channel | OPEN | WhatsApp group + an in-app "contact us". | L2, H3 |
| L7 | Analytics events to instrument | OPEN | Derive from A9 backwards. Instrument the funnel to a signed lease, not vanity counts. | A9, J13, E10 |

---

## M. Legal & compliance

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| M1 | Terms of service and privacy policy | RESEARCH | Required before you collect a single signup. Needs a real lawyer, not a template. | B7, G3 |
| M2 | Israeli Privacy Protection Law obligations | RESEARCH | You will hold a database of identifiable people. Registration/notification duties need checking. | B7, F6 |
| M3 | Cookie and tracking consent | OPEN | Minimal analytics, decline non-essential by default. | J13 |
| M4 | Age gate | OPEN | 18+ declared at signup. | B5, H5 |
| M5 | **Gender filtering and anti-discrimination law** | RESEARCH | Shared-housing gender preference is commonly permitted where general housing discrimination is not. Confirm before shipping C5 — it is a filter you cannot quietly remove later. | C5 |
| M6 | Real-estate brokerage licensing | RESEARCH | Israel licenses real-estate brokers. Whether an app that connects renters and landlords — especially if it ever charges for that connection — falls inside that regime needs a real answer before monetizing. | G3, A2 |

---

## Decisions already made in code that contradict this file

These shipped before the register existed. Each needs a row above resolved, then the code corrected.

| Where | What the code does | Register row |
|---|---|---|
| `profiles.vibe_tags` | Free `text[]`, 10 invented Hebrew tags | C1, C2 |
| Discover | Buttons and a tap-a-tag modal, no swipe gestures | I12 |
| Discover | Accept-a-like, not a mutual match | C9 |
| `apartment_stats` | Correlated subqueries per apartment | J4 |
| Discover feed | `NOT IN (...)` of every previous like | J2 |
| Map | Every active apartment in one request, one marker each | D14, J6 |
| Chats | Fetches all messages across all conversations, dedupes in JS | J2 |
| Schema | No PostGIS | J6 |
| `profiles.gender` | Column exists, nothing uses it | C5 |
| Live database | Six fake `דוגמה` listings in the production project | J12 |
| Brand | Name "Roomie", `#E8543F`, all Hebrew copy | I1, I2, C2 |
