# Architecture

Companion to `DECISIONS.md`. Where this document and the register disagree, the register wins.

20 October 2026 planning update (F4/E8): group apartment contact is MVP scope. Store a group/listing consent round bound to the current membership revision, one consent per member, and one owner-facing inquiry only after unanimity. Owner acceptance creates a separate apartment-context conversation with the owner plus the consenting membership snapshot; it does not add the owner to the roommate-only conversation. Group size cap applies to the roommate group, not to the owner added to this separate conversation. Recheck membership, listing state and participant authorization atomically. Individual inquiry identity remains distinct. Exact contract and implementation boundary: [GROUP_LISTING_INQUIRIES](docs/specs/GROUP_LISTING_INQUIRIES.md). No schema or runtime implementation is claimed.

Scale target: **1,000 active listings, 3,000 registered renters, a few hundred concurrent users at peak**.

---

## 1. System map

```mermaid
graph TB
    subgraph client["Browser — Next.js PWA (Web-First)"]
        Map["Map<br/>viewport + clusters"]
        Disc["Discover<br/>roommate feed"]
        Chat["Chats + Groups"]
        Prof["Profile + onboarding"]
        Post["Post a listing"]
    end

    subgraph edge["Vercel"]
        SSR["Server components<br/>listing pages, SEO"]
    end

    subgraph supa["Supabase — eu-central-1"]
        Auth["Auth<br/>Google / email; Apple deferred"]
        RPC["RPCs<br/>feed, viewport, accept_like"]
        DB[("Postgres<br/>+ RLS")]
        RT["Realtime<br/>account inbox + active thread"]
        Store["Storage<br/>owned validated photos"]
    end

    Map --> RPC
    Disc --> RPC
    Chat --> RT
    Chat --> RPC
    Prof --> RPC
    Post --> DB
    SSR --> DB
    Auth --> DB
    RPC --> DB
    RT --> DB
    Prof --> Store
    Map --> Store
```

**The rule that shapes everything below: RLS is an authorization boundary, not a query planner.** Reads that need filtering, ranking or pagination go through an RPC. RLS only answers "may this user touch this row at all".

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) on Vercel | Decided K1. Web-first platform to prioritize SEO and sharing. Mobile (React Native) is Phase 2. |
| Styling | Tailwind + existing components | Fast, accessible components with built-in styling. I3 decided: preserve existing components/tokens; add accessible primitives only for concrete need.
| Backend | Supabase — Postgres, Auth, Realtime, Storage | Already provisioned, eu-central-1. Isolated development/QA local-first under free-only budget; existing hosted backend changes separately authorized (J12/K3). |
| Errors / analytics | First-party minimal events + sanitized error IDs | J13: useful interactions/replies and declared outcomes; no mandatory external analytics. |

---

## 3. Query Strategy & Performance (decision-gated proposals)

J2-J7/J10 technical defaults are now decided; exact adapters/limits in docs/specs/TECHNICAL_DEFAULTS.md. J8 hosted capacity still needs evidence. Reconcile working code before any replacement; no mandatory PostGIS. Planning entry: docs/WORK_PLAN.md.

### 3.1 Map Viewport Rendering
*   **Decided MVP model (J2/J6):** bounded viewport query using approximate public coordinates; no required PostGIS migration. `map_listings(bounds, zoom)` is a proposed contract, not an existing guaranteed API.
*   **Why:** Instead of downloading 1,000 apartments with their photos and descriptions into the client memory at startup, the client asks the server only for pins visible on the screen. The payload is tiny (`id, approximate_lat, approximate_lng, price`; favorites separately user-scoped). Clicking a pin runs a targeted query to fetch the heavy details.

### 3.2 Discover Feed Pagination
*   **The Model:** Server-side Keyset Pagination via RPC.
*   **Why:** Passing an unbounded array of passed/liked profiles in the client URL string (`NOT IN (...)`) breaks at scale. The database must exclude past interactions internally using `NOT EXISTS` subqueries.

### 3.3 Hype Counters
*   **The Model:** Indexed aggregates over unique active personal saves, plus available-room counts/ranges (J4).
*   **Why:** Keep one authority and correct retry/unsave semantics; optimize only after measured query need with a reconciliation path.

### 3.4 Chat Previews
*   **Implemented:** `list_chat_inbox()` returns authorized previews using a latest-visible-message lateral query ordered by server `message_seq`; it does not download each thread's history or require a `last_message_id` column.
*   **Unread authority:** `conversation_members.last_read_seq` advances only through `mark_conversation_read`, which locks the membership, rechecks access and clamps the requested sequence to authorized visible history. Counts exclude the caller's own messages and system messages, and respect `visible_after_seq`. Device timestamps cannot move the marker into the future or regress another tab's marker.
*   **Client synchronization:** `ChatThread` marks rendered history read only while the document is visible and focused, deduplicates persisted messages and catches up on reconnect. `InboxSync` refreshes the inbox from authorized signals. `send_chat_message` uses a unique `(conversation,sender,request_key)` so exact retries return the original message and a changed body conflicts. This delivered SL08.1 repair does not certify the remaining SL08.2 typing, receipts and leave semantics.

### 3.5 Image Processing Pipeline
*   **The Model:** Client-side compression before upload.
*   **Why:** Saves bandwidth, reduces storage costs, and offloads processing to the user's device rather than paying for server-side image transformations.

### 3.6 Data Fetching & SEO
*   **The Model:** Next.js Server Components for SEO pages, Client Components for interaction.
*   **Why:** Public apartment pages use Server-Side Rendering (SSR) to inject OpenGraph tags so WhatsApp/Facebook links render rich previews. Highly interactive screens (like the Map or swiping) use standard Client Components to talk to Supabase instantly.

---

## 4. Security Model

Four invariants. Each exists because the obvious implementation is wrong.

**4.1 Hype identity is withheld server-side.**
The personal-saver list and identities are private in MVP, regardless of account type. Only unique aggregate count is public (G1/G2). Free inbound invitations identify sender for consent; this never identifies who privately saved a listing. Future Pro visibility needs a separate explicit privacy decision.

**4.2 `is_pro` and `is_verified` are revoked at the column level.**
RLS cannot express "any column except these two".

**4.3 Multi-write operations are RPCs, not client sequences.**
Accepting a like creates a conversation, adds two members and posts a message. This happens via one `SECURITY DEFINER` function (`accept_like`).

**4.4 Profile privacy uses separate private data and an explicit public projection.**
Full name, contact details, birth date, budget, move-in date, and student email live in an owner-only `profile_private` row. Public names are server-formatted first name and last initial. Public profile reads go through an allowlisted projection that returns age (never birth date), bio/photo, selected public badges and consciously disclosed canonical `lifestyle_facts`; no contact details or private preferences. Legacy identity fields are not republished or inferred into canonical facts.

Canonical resident data uses owner-readable, RPC-write-only `profile_lifestyle` (validated facts, disclosure selection, taxonomy version and revision) and `profile_lifestyle_private` (private accepted/preferred options, pet/strict constraints and quiet hours). The approved [TAXONOMY](docs/specs/TAXONOMY.md) is represented by `web/src/lib/contracts/taxonomy.ts`; `scripts/generate-profile-schema.mjs` derives the SQL field schema, with option-parity checks. Missing answers remain distinct from an explicitly answered empty set. The scoring reference is test-only; canonical questionnaire adoption does not complete production SL07 matching.

`save_resident_profile` atomically writes public/private account data, facts, preferences and disclosure, checks expected revision and stores an actor/operation/request-key payload hash/result. Completion requires server-validated adulthood, name, bio, four core facts and a real caller-owned Storage photo; drafts may remain incomplete and later edits cannot de-onboard a completed resident. Gallery writes verify the configured Storage origin, bucket, path and owner; authoritative primary-photo writes bypass neither gallery ownership nor the completed-profile photo invariant. Direct name/bio/authoritative-photo updates are revoked.

Nonresident intake retains `save_onboarding` with a mandatory 18+ declaration on new lister completion, persisted privately as `adult_confirmed_at`. `save_lister_profile` edits private full name/phone/agency with the same revision/retry protection. Incomplete intake can be corrected; a completed or converted lister cannot regain resident capability through the resident endpoint. Explicit B10 conversion preserves private canonical state and direct history, refuses active group membership and hides resident discovery participation. Existing demos are retained without inventing answers, disclosure or retrospective adult declarations.

Apartment addresses and exact coordinates are also private. Public listing projections exclude exact address/coordinates, contact information and private owner data. The planned safe pin is persisted random displacement independent of public ID (TECHNICAL_DEFAULTS); the deterministic 500m source transform remains an identified migration/verification gap, not evidence the replacement is live. Private location reads require a valid accepted apartment-context grant (renter inquiry or accepted poster invitation), under D4 block/deletion rules.

---

## 5. Bidirectional layout standard (I7, I9)

The app ships Hebrew (RTL) and English (LTR) from v1. Direction is a property of the locale, not of a stylesheet override. There is no RTL stylesheet and no `[dir="rtl"]` override block — if one appears, a component underneath it used a physical value and should be fixed instead.

**The rule: no component, token, or design spec contains `left` or `right`.**

| Never | Always |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left: 0` / `right: 0` | `inset-inline-start: 0` / `inset-inline-end: 0` |
| `text-align: left` | `text-align: start` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `border-radius: 8px 0 0 8px` | `border-start-start-radius` etc., or the 4-value logical shorthand |
| Tailwind `ml-4`, `pl-2`, `left-0`, `text-left` | `ms-4`, `ps-2`, `start-0`, `text-start` |
| `flex-direction: row-reverse` to "fix" RTL | plain `row` — the writing direction already reverses it |

**Icons.** Direction-carrying icons (back, forward, next, previous, send, chevrons, progress arrows) mirror with the locale. Non-directional icons (search, heart, user, map pin, plus, camera) never mirror. Mirror with `transform: scaleX(-1)` scoped to `[dir="rtl"]`, or ship a mirrored asset — decide once, apply everywhere.

**Content that never flips.** Phone numbers, prices with currency, dates, latitude/longitude, and email addresses stay LTR inside RTL text. Wrap them in `<bdi>` or `dir="ltr"` or they render scrambled next to Hebrew.

**Numerals.** Western Arabic numerals (0-9) in both locales. No Eastern Arabic numerals.

**Enforcement.** `dir` is set once on `<html>` from the active locale. Verify every screen in both locales before it is called done — a screen that has only been seen in Hebrew is not finished.

---

## 6. Design tokens (I2, I14, I15)

Sourced from the design handoff (`design_handoff_shutaf_design_system/`). These are decided values, not placeholders — implement as CSS custom properties / Tailwind theme extensions, not inline hex codes.

**Color**

| Token | Hex | Use |
|---|---|---|
| Orange — Primary | `#E2883A` | primary actions, brand |
| Orange Soft | `#FBE7D2` | tinted backgrounds |
| Orange Dark | `#B5661F` | button shadow/pressed state |
| Teal — Secondary | `#1F94B3` | trust, links |
| Teal hover | `#16748C` | link hover |
| Gold — Favorites | `#F0B429` | favorite/star |
| Green — Success | `#4E9F63` | success, verified, match |
| Red — Error | `#DB5A4A` | error, destructive |
| Ink | `#262220` | primary text, dark-mode surfaces |
| Body text | `#4A4340` | secondary text |
| Muted text | `#837B76` | tertiary text/labels |
| Disabled text | `#B4ACA6` | disabled states |
| Neutral bg | `#F1ECE5` / `#F8F5F1` | cards, inputs, chips |
| Border | `#E8E2DC` | card/input borders |
| Page background | `#FBF9F6` | app background |
| Teal soft | `#DCF0F5` | tinted teal backgrounds |
| Dark mode surface | `#1C1917` / `#262220` | **not used in v1 — DECISIONS.md I11 says no dark mode.** Kept here for reference only. |
| Dark mode text | `#F5F0EA` | **not used in v1** — see I11. |

**Typography**: Rubik (400/500/600/700/800/900), via Google Fonts / `next/font/google`. Display 48px/800, H1 24px/700, Body 16px/400 (1.6 line-height), Caption 13px/500. Already wired in `web/src/app/layout.tsx`.

**Shape**: radius scale 12 / 16 / 20 / 24 / 28 / pill (999px).

**Shadows**: buttons use a "pressed" hard-shadow style — `box-shadow: 0 4px 0 <dark-variant>, 0 6px 14px rgba(38,34,32,0.15)`, collapsing to `0 0 0` on `:active` with a `translateY` press.

**Spacing**: card padding 16–40px depending on density; section gaps 32–96px on desktop; mobile screen padding 20–24px.

**Icons**: hand-built inline SVG, not an icon font/library. Each nav/tag icon carries its own brand color (never a single neutral gray). Direction-carrying icons mirror per §5; non-directional icons never do.

---

## 7. Client-side state shape (from the design handoff)

Minimum state the app needs per screen group — a starting point for whatever state/data-fetching layer gets picked (React Query, Zustand, plain Server Components + `fetch`, etc. — existing React/local/server state first; no mandatory new state library under I3):

- **Session/user**: residency (resident vs. non-resident property poster; no resident search mode), verification status, language preference.
- **Profile**: canonical facts, separate private preferences and explicit disclosed-field selection; persisted revision and an exact-payload retry key. Shared `ResidentProfileForm` drives resumable resident onboarding and editing; lister editing uses its account-only RPC. C1 inventory retained; C2 normalized baseline adopted17October and implemented in39fdcee.
- **Map/Discover**: viewport bounds → pin query, favorited listing IDs, Discover tab (Individuals or Groups, independent of account and group membership), swipe queue and decisions.
- **Group**: up to four members per group, multiple memberships allowed; safe public lifestyle summary, no member-derived public budget. Optional explicitly entered group-search budget private to members (E1/E6). Chat cards use per-viewer personal saves, no group wishlist entity (E7).
- **Chats**: pending likes queue, active thread list, per-thread message history, unread counts.
- **Composer**: draft listing fields, required-field validation state, publish status.
- **Monetization (later)**: potential Pro entitlements require approved commercial policy; no paywall in initial MVP. Save-counter identity remains private under G1/G2, not exposed by frontend blur.


Historical planning checkpoint, 17 October (requirements, not completion evidence): ordered dispatch [WORK_PLAN](docs/WORK_PLAN.md), bounded [EXECUTION_PACKETS](docs/EXECUTION_PACKETS.md). Nonresident posters browse safe people and send apartment-bound invitations; recipient acceptance precedes chat/address. Saver identities remain private. Technical/moderation defaults adopted; runtime evidence remains separate. DECISIONS.md wins.

## 8. Implementation evidence — 20 October 2026

Chat sequence/read repair and shared typed contracts shipped in `95f333b`; canonical resident/private account workflows shipped in `39fdcee`. Release record `2877c38` adds production acceptance and browser-harness support. The [canonical profile handoff](docs/workstreams/2026-10-19-sl01-canonical-profile.md) records live migrations, ordinary-client privacy/photo/age checks, fresh HE/EN onboarding and editing, and the production nine-test regression covering chat, persisted editors, startup preference, signout and safe auth returns. The [chat handoff](docs/workstreams/2026-10-19-cloud-mvp-progress.md) retains the earlier SL08.1 authorization and two-browser evidence.

These are bounded implementation results. Full interactive Google account/provider roundtrip remains unexecuted; a302 provider start is not acceptance. SL01.2 retains that verification gap. Listing phone-policy/retry/draft work and later chat/matching capabilities are separate pending packets; this checkpoint does not claim whole-project completion.

## Listing management extension — approved 21 October 2026

[LISTING_MANAGEMENT](docs/specs/LISTING_MANAGEMENT.md) defines owner-only versioned cloud drafts, private draft media, retry-safe legacy import, frozen publication snapshot/receipt reconciliation and explicit atomic published edits. Reuse current owner identity, validators, publication receipts and conversations. Store object references rather than File/temporary signed URLs; never expose draft addresses/photos via public projections or shared cache. Owner inbox projections and a separate seen marker do not change chat unread semantics. These components/migrations are planned by task; none was implemented by this documentation change.
