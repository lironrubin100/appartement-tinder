# Decision Register

This file is the **ABSOLUTE SINGLE SOURCE OF TRUTH**. If `PRD.md`, `ARCHITECTURE.md`, `CLAUDE.md`, or the code disagree with this file, this file wins.

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
| A1 | One sentence: what is this product? | DECIDED | An all-in-one platform for Beer Sheva students to find both an apartment and the people to share it with, operating as a closed ecosystem. Web-first platform. | everything |
| A2 | What is it explicitly **not**? | OPEN | Not a general listings site, not a national portal, not a broker. | A1, M6 |
| A3 | The single job-to-be-done in the primary journey | OPEN | "Go from alone to signed-lease-with-roommates." | C, D, E |
| A4 | Which tab does the app open on? | DECIDED | Map. Apartments have standalone value on day one. | I4 |
| A5 | Geographic scope and how the boundary is enforced | OPEN | Beer Sheva only. Enforce by rejecting listings outside a bounding box, not by user location. | D4, J6 |
| A6 | Students only, or anyone? | OPEN | Anyone may register; students get the verified badge. Excluding non-students loses young professionals who are the same customer. | B3, M5 |
| A7 | Languages | DECIDED | Superseded by I16: Hebrew **and** English, both from v1. | I2, I16, all copy |
| A8 | Off-season behaviour (Nov–Feb the market is dead) | OPEN | Sublet filter is the answer already in the PRD; decide whether the app changes shape or just gets quiet. | D8 |
| A9 | Success metric for launch | OPEN | Signed leases attributed to the app. Everything else (signups, DAU) is a proxy that can look good while the product fails. | L3, J13 |

---

## B. Identity, auth & trust

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| B1 | Auth providers | DECIDED | Google + Apple. | I9, K1 |
| B2 | Is a phone number collected? Required? | OPEN | Collect, don't require, never display. It's your only real anti-duplicate signal and your only recovery channel. | B8, H6 |
| B3 | What earns the blue check | DECIDED | BGU/Sami Shamoon student email, verified by one-time code. This is the v1 mechanism — automatic, free, no review queue. **ID + selfie (as shown in the design's Verification screen) is out of scope for v1**, deferred as a possible future trust upgrade — it needs a manual review process (H3) that isn't resourced yet. Confirmed 2026-08-20: ship email-only now; revisit ID/selfie once there's someone to review submissions. | B4, A6, D10 |
| B4 | Verification: automated or manual by you | DECIDED | Automated via email domain, for v1. Manual ID/selfie review is not built until H3 (who reviews, how fast) has a real answer — don't ship the upload screen without the review process behind it. | B3 |
| B5 | Minimum age and how it's enforced | OPEN | 18, self-declared at onboarding, no document check. | M4, H5 |
| B6 | Real-name policy | OPEN | First name + last initial displayed. Full name collected, never shown. | I9 |
| B7 | Account deletion and data retention | OPEN | Hard delete on request, cascade everywhere, 30-day grace. Legally required and cheap now, painful later. | J1, M2 |
| B8 | Duplicate accounts and ban evasion | OPEN | Accept the risk in year one; phone number (B2) is the lever if abuse appears. | B2, H6 |
| B9 | What is public on a profile vs private | OPEN | Public: first name, photo, age, tags, bio, verified badge. Private: budget, exact move-in date, phone, email. | C4, I9 |
| B10 | **Non-resident intake (new — not previously in register)** | DECIDED (per design handoff) | Anyone posting on behalf of a property they won't live in (Lister/agent/landlord) gets a short account-only step — full name, contact phone, agency name (optional) — no profile, no tag picker. Sits between the residency fork and the quick-post composer. | D1, I9 |

---

## C. Roommate discovery & matching

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| C1 | **Shape of the four friction axes** — free tags, forced choice, or weighted score | DECIDED | Structured categorical columns, not a free `text[]`. **Scope, confirmed 2026-08-20:** the full **31-category taxonomy** (16 renter + 15 apartment) is the real v1 scope, not a trimmed set — go with what's designed. **Live code still contradicts the "structured" part** (`vibe_tags` is a free `text[]`) — see contradictions table. | C2, C3, C4, J1, J2, C13 |
| C2 | The final vibe tag list (exact Hebrew copy, per structured axis) | DECIDED | All 31 categories and their option values, per the Claude Design export's "Full Tag Taxonomy" (Gender Dynamic, Cleanliness, Sleep Schedule, Social & Guests, Noise Tolerance, Music/Vibe, Climate, Smoking, Kitchen & Dietary, Cooking, Pets, Weekend Routine, Relationship Status, Study Habits, Financial Splitting, Reserve Duty/Miluim on the renter side; Proximity to BGU, AC, Security, Water Heating, Furnishing, Hand-Me-Downs, Outdoor Space, Laundry, Accessibility, Parking, Pet Rules, Kitchen Setup, Hidden Costs, Internet, Roommate Cap on the apartment side). | I9, C1, C3 |
| C3 | Feed ordering algorithm | OPEN | v1: recency + compatibility on the four (or 31 — see C13) axes. Do not build ML. The Claude Design export already specifies the compatibility mechanic in detail — see C13. | C1, J2, C13 |
| C4 | Filters the user controls | OPEN | Budget, move-in month, area, gender (see C5). Keep it to four. | C5, B9 |
| C5 | **Gender filtering — in or out** | OPEN | In. The Claude Design export models this as a "Gender Dynamic" *tag category* ("1 guy + guys", "2 girls + 1 girl", "co-ed, anyone") rather than a separate hard filter — confirm whether that tag *is* the filter, or whether both a tag and a standalone filter are wanted. Touches: schema, feed query, filters UI, and M5. | C4, C13, J2, M5 |
| C6 | Is a message always required with a like? Minimum length? | OPEN | Always required, 10-char minimum. It's the anti-swipe-spam mechanism and the product's differentiator. | C7, F4 |
| C7 | Daily like limits | OPEN | 20/day free. Prevents spam and creates the natural Pro upsell. | G4, G5 |
| C8 | Is "pass" permanent? | OPEN | Permanent, but stored so the feed can exclude it. At 3,000 users a permanent pass will exhaust the feed for heavy users — see C12. | C12, J2 |
| C9 | **Mutual match, or accept-a-like?** | DECIDED | Accept-a-like. User A sends a like + message attached to a profile trait. User B must accept it to start a chat. | F1, F4 |
| C10 | Auto-pause: rules and how a user comes back | OPEN | Hide after 14 days inactive, un-pause automatically on next open. Tell the user it happened. | J2, L5 |
| C11 | Can you see who liked you without Pro? | OPEN | Yes, in full. Gating inbound likes kills the loop before it starts. | G2, G4 |
| C12 | Do passed profiles ever return? | OPEN | Return after 60 days. At this city size the feed will otherwise run dry. | C8, J2 |
| C13 | **Compatibility scoring mechanic** | DECIDED | Two-tier: **non-negotiable** tags must match exactly (budget range, smoking policy, pet policy — hard gate, shown as pass/fail) against **flexible** tags scored by closeness (cleanliness, sleep schedule, social & guests — shown as a %). Combined into a single match percentage shown before either side opens a chat (example in the export: 87% match). Now that C1 confirms all 31 categories ship, the remaining task is purely mechanical: sort each of the 31 into "non-negotiable" or "flexible" — not a scope decision anymore. | C1, C2, C3, J1 |

---

## D. Apartments & listings

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| D0 | Where listings come from | DECIDED | Pure native UGC. Everything happens in-app. No external links, scraping, or linking out. | D1, M1, M6 |
| D1 | **Who can post** | DECIDED | Refined by the design handoff: **residency, not persona, decides whether a profile is required.** Anyone who will live in the apartment (Solo, Group, Room-Filler) must complete a profile before posting or matching. Anyone posting on behalf of a property they won't live in (Lister/landlord/agent) posts with an account only — see B10. This is a first-run onboarding fork, not just a mode switch. | D10, J1, B10, I9 |
| D2 | Required fields on a listing | DECIDED | Merged 2026-08-20: **title, price, bedrooms, location, available-from, phone, ≥3 photos.** (Union of the register's original set and the design's quick-post set.) The quick-post composer UI needs a title field added — it currently doesn't show one. | D3, I9 |
| D3 | Photos: minimum, maximum, required? | DECIDED | **3 required, 8 max.** Typical apartment listing should realistically carry 6-7 photos; 8 comfortably covers that. The design's composer currently only visually has room for a few thumbnails — needs adjusting to not feel cramped at 6-7. | J9, K3, D2 |
| D4 | **Address precision — exact pin or approximate?** | OPEN | Approximate (~150m jitter) until contact is made, exact after. Publishing exact addresses of occupied student flats is a safety problem. | A5, H7, J6 |
| D5 | Price semantics: per room or whole apartment? Bills included? | OPEN | Per whole apartment (see D9 — rooms aren't a listing type at all now), with an explicit "bills included" flag. | D13, C4 |
| D6 | Listing lifecycle: expiry and renewal | OPEN | Auto-expire after 45 days, one-tap renew. Stale listings are the #1 killer of listing-site trust. | D7, L5 |
| D7 | Report-as-taken: threshold and consequence | OPEN | 3 distinct reporters → `flagged`, hidden from map, poster notified to confirm or renew. | D6, H3 |
| D8 | Sublet vs long-term: separate types or a flag? | OPEN | A flag, as built. A separate type doubles every query for one boolean. | A8, D13 |
| D9 | **"Whole apartment" vs "room in an apartment" — same entity?** | DECIDED | Whole apartment only. Not splitting into individual rooms — supersedes the earlier `listing_kind` discriminator idea, since there is no second kind to discriminate. | D12, E5, J1 |
| D10 | Moderation: pre-approval or post-hoc? | OPEN | Post-hoc with reporting. Pre-approval does not survive your launch volume and delays the supply you need. | D1, H3 |
| D11 | Duplicate listing detection | OPEN | None in v1. Revisit if the same flat appears from multiple posters. | D7 |
| D12 | Can a listing be attached to a group (room-fillers)? | DECIDED | Yes. A Room-Filler posts through a dedicated, shorter form scoped to their existing apartment — room rent, move-in date, 1-2 tags — not the full listing composer, since the apartment itself already exists. Still a whole-apartment listing under D9, just posted by an existing group. **Note:** unlike the Lister's non-resident intake (B10), no equivalent short account flow exists yet for Room-Filler — flagged as an open gap by the design handoff itself. | E5, D9, B10 |
| D13 | Filter set on the map | OPEN | Price range, bedrooms, sublet, available-from. Four filters, no more. | D5, D8, J2 |
| D14 | Map clustering and zoom behaviour | OPEN | Cluster below zoom 14. 1,000 individual pins will not render acceptably. The cluster *visual* is now decided (D17) — this row is specifically about the tap-to-zoom interaction, which the design handoff explicitly leaves open. | J6, I4, D17 |
| D15 | **Hand-Me-Down Market (new — not previously in PRD/register)** | DECIDED (per Claude Design export) | A leaving roommate lists furniture directly on the apartment listing (e.g. "bed frame + mattress, 300 ₪"); the incoming roommate messages the seller to arrange pickup during move-in. No separate marketplace, no Facebook/Yad2 handoff. **`PRD.md` needs a new feature section for this** — it currently doesn't exist there at all. | D2, D6, PRD §3 |
| D16 | **Lister dashboard (new — not previously in register)** | DECIDED (per design handoff) | A Lister's home screen, distinct from Map/Discover: "My listings" header + add button, a list of their own listings (thumbnail, price/location, status: Active + interested count, or Rented). No Discover access for Lister mode. | D1, I4 |
| D17 | **Map pin cluster — visual only (new)** | DECIDED | A numbered dark-circle pin shown when overlapping pins collapse at low zoom. The *interaction* (tap-to-zoom behaviour) is not specified — see D14. | D14 |

---

## E. Groups

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| E1 | How a group is formed | DECIDED (partial) | Triggered from an existing chat thread's "Make group" action: a bottom sheet lets you pick up to 3 existing matches from a checklist (not invite arbitrary non-matched people). Still open: whether *direct* creation with invites (friends who haven't matched yet) is ever allowed, per the original recommendation. | F5, E3 |
| E2 | Max size — is 4 a hard limit? | OPEN | Hard limit 4, enforced in the database. | J1 |
| E3 | Admin powers, and what happens when the admin leaves | OPEN | Admin can add/remove and set status. On leaving, oldest remaining member inherits. **⚠ Contradiction:** the design's Group Profile Editing screen has **no admin gating at all** — any member can edit the shared budget and remove any other member (not themselves). Designed independently of this row per the handoff's own note — needs reconciling, since the orphaned-ownership concern this row exists for doesn't go away just because the screen doesn't show it. | E4 |
| E4 | What `open` / `closed` actually mean | OPEN | `closed` = hidden from Discover, chat still live. | E5 |
| E5 | Are groups discoverable in Discover (the "Double Date" card)? | OPEN | Yes — but this needs E6 answered first or there is nothing to show on the card. | E6, C3, D12 |
| E6 | Does a group have its own bio/photo, or is it derived from members? | DECIDED | No separate bio. The group card is dynamically computed from the individual profiles of its members — supersedes the earlier "own short bio written by the admin" recommendation. **Interaction, now specified:** the Discover card leads with a summary (name, member count, shared budget/tags); tapping a member's avatar flips the card to that member's individual bio/tags; swiping left/right always decides for the *whole group*, regardless of which member is currently shown. | E5, I9 |
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
| F7 | Push notification triggers and copy | OPEN | New like, new message, listing you saved was taken. Nothing else. Web has no native push — see L5. | L5, K2 |
| F8 | Message rate limits | OPEN | 30/hour to distinct users. | C7, H6 |

---

## G. Social proof & monetization

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| G1 | Who is counted in the hype counter? | OPEN | Anyone who tapped "interested", count shown to everyone. | G2, J4 |
| G2 | What exactly does Pro unblur? | DECIDED | Photo **and** name together — confirmed in the design's Unblur paywall screen, matching the "identity, not just pixels" rule already in `ARCHITECTURE.md` §4.1. Identity must be withheld server-side, not just the image. | G4, J7 |
| G3 | Pro price and billing rails | RESEARCH | Web = Stripe (no platform cut). Native iOS = in-app purchase, 15–30% to Apple, Stripe not permitted for digital goods. **Note:** the design's Unblur paywall shows "₪9.90/mo" — treat this as an illustrative placeholder only, not an answer to this row. Don't let it silently become the decided price. | K6, M1 |
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
| I1 | Product name | DECIDED | **Shutaf** — the Hebrew word שותף ("roommate/partner") written in Latin letters. | I14, I15 |
| I2 | Hebrew/RTL typography — typeface and numerals | DECIDED | **Rubik**, per the Claude Design export (`export/…Foundations & Components.html`). Scale: Display 800/48, H1 700/24, Body 400/16, Caption 500/13. Already correctly wired in `web/src/app/layout.tsx`. | I1, A7, I16 |
| I3 | Component library | OPEN | shadcn/ui + Tailwind, with RTL configured from the start. **Note:** the Claude Design export is a bespoke, illustration-heavy system (colored icon-per-tag, custom cards) — worth confirming this is still shadcn primitives underneath a heavy skin, not a from-scratch component set, before ARCHITECTURE.md's stack table keeps asserting shadcn as fact. | K1, A7 |
| I4 | Navigation: buttons, order, platform shape | DECIDED | Five buttons: Profile, Discover, Map, Plus, Chats. Four are destinations; **Plus opens the listing composer as an overlay over the current screen** — it does not navigate away. Mobile renders the bar fixed at the bottom; desktop is free to drop the bar and place the same five elsewhere. App still opens on Map (A4). In RTL the list runs right-to-left, so Profile sits at the right edge. | A4, D14 |
| I5 | How the thumb-zone rule is enforced | OPEN | A documented layout rule + a shared bottom-action component, or it will be violated by the third screen. | I3 |
| I6 | How "one primary action per screen" is enforced | OPEN | One `variant="primary"` per route, checked in review. | I3 |
| I7 | Empty state for every screen | OPEN | The Claude Design export has concrete examples (no-matches-yet on Discover, map-load-error-with-retry) but not a full enumeration across every screen yet. Still needs the explicit list. | I9, L3 |
| I8 | Loading and error states | DECIDED | Skeletons (not spinners) for loading; toast/snackbar for transient feedback; explicit retry affordance on hard errors (e.g. map failing to load). Confirmed in the Claude Design export. | I3 |
| I9 | **Onboarding: exact steps, order, what's mandatory** | DECIDED | (1) Residency fork — "Will you be living here?" Yes → needs a profile; No, posting for a property → account-only (B10). (2a) If yes: looking-mode picker (Solo / Group / Room-Filler) → completion screen ("Go to Map"). (2b) If no: non-resident intake (B10) → straight into the quick-post composer. Mode is editable later from a persistent mode-switcher in Profile (I19). The tag picker itself (how many categories, C1/C13's scope question) is a separate open question from this flow's step order. | B3, B6, C1, D2, B10, I19 |
| I10 | Accessibility baseline | OPEN | Contrast, focus states, touch targets, labelled inputs. Cheap now. | I3 |
| I11 | Dark mode | DECIDED | **No, confirmed 2026-08-20.** No dark mode in v1 — it doubles design review for no acquisition benefit. The one dark-mode example in the design (a chat thread) is out of scope; don't build against it. | I1 |
| I12 | Motion and animation language | OPEN | Sparing. Reserve motion for the interest counter and the like send. | I3 |
| I13 | Photo aspect ratios and cropping | OPEN | Profiles 4:5, listings 3:2. Fix now or the map cards will never look consistent. | D3, J9 |
| I14 | Logo | DECIDED | Capybara mascot + wordmark, per the Claude Design export. | I1 |
| I15 | Colour palette | DECIDED | Orange (Primary) `#E2883A` · Orange Soft `#FBE7D2` · Orange Dark `#B5661F` · Teal (Secondary) `#1F94B3` · Gold (Favorites) `#F0B429` · Green (Success) `#4E9F63` · Red (Error) `#DB5A4A` · Ink (text) `#262220`. One bold saturated accent (orange) for primary actions/brand moments; teal and gold reserved for meaning, never decorative. Per the Claude Design export. **⚠ Live code still uses the old undocumented `#FF385C`** — see contradictions table. | I1, I3 |
| I16 | Language & direction | DECIDED | Hebrew **and** English, both from v1. Direction follows the locale: Hebrew RTL, English LTR. Requires a real i18n layer and logical CSS properties (`start`/`end`, never `left`/`right`) from the first component. Resolves A7. | A7, I2, I17 |
| I17 | Bidirectional layout rule | DECIDED | Every layout value is **logical, never physical**. No `left`/`right` in any component, token, or design spec — only `start`/`end`. Direction-carrying icons mirror with the locale. Enforced in the design system, not patched per screen. See `ARCHITECTURE.md` §5. **⚠ Live code currently violates this** — see contradictions table. | I16 |
| I18 | Default locale & URL shape | DECIDED | Hebrew is the default. English lives under an `/en` prefix so public listing URLs stay separately indexable (J15). | I16, J15 |
| I19 | **Mode switcher as a standing UI element (new)** | DECIDED | Not just a one-time onboarding choice — a persistent row in Profile ("Currently: [mode]" + chevron) that opens a sheet with the same mode options (Solo/Group/Room-Filler) and lets the user switch anytime. | I9, D1 |
| I20 | **Settings as its own screen (new)** | DECIDED | Split out from Profile: language picker (radio-style rows, not a toggle), notifications toggle, privacy row, destructive "Delete account" row in red. | I2, I16 |
| I21 | **Publish confirmation screen (new)** | DECIDED | The composer previously had no defined end state. Now: a dedicated "Listing published!" screen with a checkmark and a "View listing" CTA. | D2, D16 |

---

## J. Architecture & data

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| J1 | Final entity model | OPEN | Downstream of C1, D1, D9, E6 — all four are now DECIDED, so this can likely be closed next. | everything |
| J2 | **Feed query strategy and pagination** | OPEN | Keyset pagination, filtering server-side in an RPC. The current `NOT IN (...)` of every prior like is unbounded and lives in a URL. | C1, C3, J7 |
| J3 | Where filtering happens: client, RLS, or RPC | OPEN | RPC for feeds, RLS for authorization only. RLS is a security boundary, not a query planner. | J2, J7 |
| J4 | Counters: computed, cached, or triggered? | OPEN | Trigger-maintained counter columns. `apartment_stats` is now a clean security-definer view (see `supabase/rls.sql`) rather than ad-hoc subqueries, but it's still per-row correlated subqueries under the hood — the scale concern at 1,000+ listings is unresolved. | G1, D7, J5 |
| J5 | Index plan | OPEN | Write it explicitly per query, don't rely on defaults. | J2, J4 |
| J6 | **PostGIS — revisit at scale** | OPEN | `supabase/schema.sql` already carries a `ponytail:` comment deciding this in practice: no PostGIS for one city / ~200 listings, client-side filtering, add PostGIS + GIST index at ~5k listings. Worth promoting to DECIDED here to match what's actually shipped. | D14, A5, D4 |
| J7 | What moves into server-side RPCs | OPEN | Feed, map viewport, accept-like, hype faces, interest toggle. Anything multi-write or paywalled. | J2, J3, G2 |
| J8 | Realtime channel design and connection limits | RESEARCH | One channel per conversation. Need the concurrent-connection ceiling for the Supabase plan you land on. | F1, K3 |
| J9 | Photo/image pipeline: upload, resize, CDN, blur derivative | DECIDED | Compress and resize in the browser before upload, to save bandwidth and storage. Blurred derivative still needs an explicit answer (G2 depends on it). | D3, I13, G2, K3 |
| J10 | Caching strategy | OPEN | Cache the map payload; never cache anything user-scoped. | J2, K1 |
| J11 | How schema changes ship | OPEN | Numbered migration files in the repo, never dashboard edits. The live schema already drifted from the files once. | K5, J12 |
| J12 | Environments | DECIDED | Single DB environment for MVP, to move fast. Dev/Prod split later. | J11, K5 |
| J13 | Error tracking and analytics | OPEN | Sentry + PostHog. Instrument A9's metric on day one or you will never reconstruct it. | A9, L7 |
| J14 | API rate limiting | OPEN | Supabase defaults plus the app-level limits in C7/F8. | C7, F8 |
| J15 | SEO & public listing URLs | DECIDED | Next.js Server-Side Rendering (SSR) for public apartment URLs, for rich WhatsApp link previews. | I18, K1 |
| J16 | Data fetching strategy | DECIDED | Next.js Server Components for static/SEO pages, Client Components for highly interactive Map/Swipes. | J15, K1 |

---

## K. Platform & infrastructure

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| K1 | Web stack and hosting | DECIDED | Web-first (Next.js on Vercel) for Phase 1. Native app (React Native / Expo) is Phase 2. | I3, J10 |
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
| L5 | Lifecycle notifications and emails | DECIDED | Email notifications for matches/messages, since native push is not available on web. | F7, C10, D6 |
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

## Open contradictions — need your call

Resolved 2026-08-20: tag scope (C1/C2/C13 → 31 categories), verification method (B3/B4 → email-only for v1), listing fields + photo minimum (D2/D3 → merged), dark mode (I11 → no). One is still open:

| # | Where it lives | The conflict |
|---|---|---|
| 1 | E3 | **Group ownership**: register recommends admin-gated add/remove with inheritance on departure; design's Group Profile Editing has no admin gating — any member can edit/remove. Not urgent — groups are downstream of Map/Onboarding/Discover in build order. |

G3 (Unblur price) is already handled — the design's "₪9.90/mo" is noted as illustrative only, G3 stays `RESEARCH`, no action needed until you're ready to actually price it.

---

## Decisions already made in code that contradict this file

These shipped before (or outside) the register. Each needs a row above resolved, then the code corrected. Re-audited against the current tree — the mobile/Expo scaffold was deleted in the web-first pivot, so entries that only applied there are marked N/A rather than deleted outright.

| Where | What the code does | Register row | Status |
|---|---|---|---|
| `web/src/components/Header.tsx`, `web/src/app/page.tsx` | Brand name rendered as "roomie" (lowercase), not "Shutaf" | I1 | **Live — needs fixing** |
| `web/src/components/Header.tsx`, `web/src/app/page.tsx` | Hardcoded `#FF385C` (Airbnb's brand color) instead of the now-decided Orange `#E2883A` palette | I15 | **Live — needs fixing** |
| `web/src/components/Header.tsx` | Physical `mr-2`, `pl-2`, `pr-8`, `rounded-r-full`, `text-right` classes instead of logical `start`/`end` equivalents | I17 | **Live — needs fixing** |
| `web/src/app/layout.tsx` | For contrast — this file is already correct: Rubik font, `dir="rtl"`, `lang="he"`, title "Shutaf". Nothing to fix here. | I1, I2, I16 | Good |
| `supabase/schema.sql` `profiles.vibe_tags` | Free `text[]`, not structured categorical columns | C1 | **Live — needs fixing** |
| `supabase/rls.sql` `apartment_stats` | Correlated subqueries per apartment, now at least wrapped in a documented security-definer view | J4 | **Partially addressed** — scale concern at 1,000+ listings still open |
| `supabase/schema.sql` | No PostGIS | J6 | **Deliberate, documented** (`ponytail:` comment) — promote to DECIDED |
| `profiles.gender` | Column exists; no UI built against it yet (web app is pre-feature) | C5 | Not yet contradictory, just unused |
| Discover screen (buttons + tap-a-tag modal, no swipe) | — | I12, C1 | N/A — mobile scaffold removed |
| Discover accept-a-like vs mutual match | — | C9 | N/A — now formally DECIDED as accept-a-like; rebuild will match |
| Chats fetch-all-messages pattern | — | J2 | N/A — mobile scaffold removed |
| Live database seed listings | Not re-verified this pass — needs a direct DB check, not a code read | J12 | Unverified |
