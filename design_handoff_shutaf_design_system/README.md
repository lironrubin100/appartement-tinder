# Handoff: Shutaf Design System

## Overview
Shutaf is a real-time web/mobile marketplace for renters to form roommate groups before securing a lease, matching solo renters, formed groups, room-fillers, and landlords/listers around apartment listings. This package covers the full design system: foundations, components, and every screen designed so far, in Hebrew (RTL, default) and English (LTR).

## About the Design Files
The bundled HTML files in this package are **design references**, built as interactive prototypes to communicate visual language, layout, and intended behavior — they are not production code to copy directly. The task is to **recreate these designs in the target codebase's existing environment** (the project's PRD specifies Next.js/React web-first, PWA, with React Native/Expo in Phase 2) using that environment's established component patterns, state management, and libraries. If no environment exists yet, React + Next.js is the recommended choice given the PRD's stated stack.

Every screen was designed twice — once in Hebrew (RTL) and once in English (LTR) — using CSS logical properties throughout (`margin-inline-start`, `inset-inline-end`, etc., never `left`/`right`). This is a core requirement, not a nice-to-have: the production implementation must support both directions from the same component tree, driven by a `dir` attribute on the locale root, not a separate RTL stylesheet.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows, and copy (in both languages) are final design decisions, not placeholders — recreate them pixel-precisely. Where a screen shows a striped placeholder block labeled "photo" or "photo gallery," that is an explicit stand-in for real user-uploaded imagery, not a finished visual.

## Screens / Views

### Foundations reference (no screen, but binding rules)
- **Direction**: every component built once with logical CSS properties, rendered under `dir="rtl"` or `dir="ltr"`. Directional icons (back/forward/send/chevrons) mirror with locale; non-directional icons (search, heart, pin, plus, camera, star) never mirror. Prices/phone numbers/dates stay LTR inside Hebrew text.
- **Type**: Rubik (400/500/600/700/800/900), Google Fonts. Display 800/48px, H1 700/24px, Body 400/16px, Caption 500/13px.
- **Color**: see Design Tokens below.
- **Shape**: radius scale 12 / 20 / 24 / 28 / pill (999px).

### Map feed (mobile, default entry point)
- **Purpose**: browse available whole-apartment listings geographically. Opens directly on app launch.
- **Layout**: full-bleed map background (striped placeholder), floating search bar pinned top (16px inset, white/85% + 6px blur, 16px radius), price pins scattered absolutely, a listing preview card docked above the bottom nav (20px radius, white, 16px padding, 64×64px photo thumbnail + text + favorite button), 5-item bottom tab bar.
- **Pin states**: default (dark pill, `#262220` bg), favorited (gold `#F0B429` bg + star + soft yellow glow ring), selected (orange `#E2883A` bg, elevated shadow), cluster (dark circle with count, shown when zoomed out).
- **Empty/error states**: centered icon + headline + one-line body + single CTA pill, both a "no matches" and a "map failed to load" variant.

### Discover — individual (mobile, full-bleed card)
- **Purpose**: swipe-based roommate matching, Tinder-style.
- **Layout**: full-bleed profile photo (striped placeholder), Solo/Group segmented pill top-center, bottom-anchored gradient scrim with name/university, 2 tag pills, one-line bio quote, pass (✕, white circle) and like (♥, orange circle) buttons bottom-center.

### Discover — group card
- **Purpose**: swiping a pre-formed group (up to 4 members) instead of an individual.
- **Layout**: same full-bleed card frame. Adds a row of overlapping member avatars top-left (52px circles, 3px border, active member highlighted in orange) with a "tap to flip" pill label beneath. Default state shows group name + member count + shared budget/tags. Tapping an avatar flips the card to that member's individual bio/tags while the like/pass controls stay fixed.
- **Interaction**: swipe left/right always decides for the *whole group*, regardless of which member is currently shown.

### Listing detail (mobile + web)
- **Purpose**: full listing view after tapping a map pin or card.
- **Layout (mobile)**: 280px photo gallery header (with page indicator, e.g. "1/6") + favorite button overlay, scrollable body (price, location, tag pills, description), sticky footer bar (interested-avatars stack + count, "I'm interested" CTA).
- **Layout (web)**: two-column split — 1.3fr photo gallery / 1fr detail panel with the same content, in a browser-chrome frame.

### Onboarding — residency fork
- **Purpose**: first screen after signup. Determines profile requirement.
- **Layout**: two stacked selectable cards (44px icon tile + 16px headline + 13px body), both start unselected (neutral 2px border), Continue button disabled (`#F1ECE5` bg / `#B4ACA6` text) until a card is picked.
- **Copy**: "Will you be living here?" → Yes (needs profile) / No, posting for a property (account-only, no profile).

### Onboarding — looking-mode picker (residents only)
- **Purpose**: second onboarding step, only shown to residents.
- **Layout**: 3 stacked option rows (40px icon tile + label + one-line description): Solo, Group, Room-Filler. Same disabled-Continue pattern.

### Onboarding — completion
- **Purpose**: lands the onboarding flow instead of ending mid-air.
- **Layout**: centered checkmark badge (72px circle, `#E9F5EC` bg), headline, one-line body, full-width CTA ("Go to Map").

### Mode switcher (component, lives in Profile)
- Persistent row: icon tile + "Currently: [mode]" + chevron, opens a sheet with the same mode options as onboarding.

### Profile & Status
- **Purpose**: control center — identity, current mode, tags, settings entry points.
- **Layout**: avatar + name + verified badge, mode-switcher row, "Your tags" summary card (chips + Edit link), settings list (Language, Verification status, Log out), bottom nav with Profile active.

### Edit Profile — Tag Picker
- **Purpose**: the input form behind the 31-category tag taxonomy (16 renter-lifestyle + 15 apartment categories).
- **Layout**: 3 expandable accordion sections — Lifestyle, Apartment preferences, Logistics. One expanded by default showing category rows (label + row of selectable chips, single-select per category — selected chip solid-filled in its category color, unselected chips outlined). Save button pinned to footer.

### Non-Resident Intake
- **Purpose**: short account step for the "posting for a property" fork before the quick-post composer.
- **Layout**: 3 plain text fields (Full name, Contact phone, Agency name — optional), single CTA "Continue to post a listing."

### Chats — list
- **Purpose**: entry point for all conversations.
- **Layout**: "New likes" horizontal avatar row (pending accept, orange-ringed avatars) above an "Active" section of standard message-list rows (avatar, name, snippet, timestamp, unread dot). Bottom nav Chats icon carries a red notification-dot badge when likes are pending.
- **Empty state**: centered icon + "No chats yet" + guidance text.

### Accept-a-Like
- **Purpose**: opens when tapping a pending like from the Chats list.
- **Layout**: centered large avatar, "X liked you" headline, "Based on: [trait]" subline, the sender's optional message in a quoted card, Decline/Accept & chat button pair pinned to bottom.

### Chat thread
- **Purpose**: 1:1 or group messaging.
- **Layout**: header (avatar + name + "Make group" pill action), scrollable message list (received bubbles left-aligned white, sent bubbles right-aligned orange, 14px radius with one corner squared toward the sender), a special bubble type for a shared listing (thumbnail + price/location), text input + send button footer.
- **Dark mode**: one example built — dark surfaces `#1C1917`/`#262220`, text `#F5F0EA`, orange accent unchanged. Not yet systemized across all screens.

### Create group from matches
- **Purpose**: upgrade a 1:1 chat (or start fresh) into a group of up to 4.
- **Layout**: bottom sheet, checkbox-style list of existing matches (avatar + name + selection ring), running count in the CTA ("Create group (n selected)").

### Group Profile Editing
- **Purpose**: manage a formed group's shared identity.
- **Layout**: group name + member count, member list rows with a "Remove" action per non-self member, shared budget field, Save CTA.

### Plus — Composer fork
- **Purpose**: entry point for posting, opened as an overlay (bottom sheet) over the current screen.
- **Layout**: bottom sheet, drag handle, "Who's posting?" headline, two option cards: "I live here" (uses profile) / "I'm posting on behalf of a property" (quick post).

### Plus — Quick post (no profile)
- **Purpose**: the non-resident/lister listing form.
- **Layout**: header with "No profile required" badge, photo grid (dashed-border add tiles), rent/address/rooms text fields, tag-add chips ("+ Furnished" style, plus a "+N more categories" overflow), contact phone field, Publish CTA.
- **Validation states**: incomplete state shows red dashed borders + red asterisk labels on required fields (photos ≥3, rent, address, phone) and a disabled grey Publish button with a red helper line; complete state shows filled fields, checked tag chips, and an enabled orange Publish button.
- **Confirmation**: on publish, a centered checkmark + "Listing published!" + "View listing" CTA screen.

### Plus — Resident path
- **Purpose**: the "I live here" composer fork — pulls confirmed profile tags instead of re-asking.
- **Layout**: same field set as quick-post minus contact/photo emphasis, but tags render as a read-only "already confirmed" checked-chip row sourced from the user's profile.

### Room-Filler — Post a room
- **Purpose**: filling the last room in an apartment the user already lives in (fewer fields than a full listing since the apartment already exists).
- **Layout**: subtitle naming the parent apartment address, room rent field, move-in date field, 2 tag-add chips, Publish CTA.

### Lister Dashboard
- **Purpose**: a Lister's (landlord/agent) home — manages their own listings, no Discover access.
- **Layout**: "My listings" header + add button, list of listing rows (thumbnail, price/location, status: Active/interested-count or Rented).

### Verification
- **Purpose**: ID + selfie identity check, referenced from Profile.
- **Layout**: headline + rationale copy, two dashed-border upload targets (ID photo, selfie), Submit CTA.

### Unblur paywall
- **Purpose**: monetization surface — a Lister/resident sees blurred avatars of people interested in their listing until they subscribe.
- **Layout**: blurred avatar teaser, headline, benefit checklist (2 items), price CTA ("Unblur Pro · ₪9.90/mo").

### Settings
- **Purpose**: dedicated language picker + account-level settings (split out from Profile).
- **Layout**: Language section (radio-style rows, selected = filled orange circle+check), Notifications toggle row, Privacy row, destructive "Delete account" row in red.

### Web / Desktop — Map & Discover
- **Purpose**: first web-specific layouts (PRD calls out web-first priority).
- **Map**: fixed 340px left sidebar (search + listing list) + full-bleed map canvas, in browser-chrome frame.
- **Discover**: centered card (340×480px) with pass/like buttons rendered beside it rather than overlaid, since desktop has room.

### Photo picker sheet
- **Purpose**: the add-photos interaction referenced from both composer paths.
- **Layout**: bottom sheet, 3-across photo grid, first filled slot marked "Cover", "Choose from library" CTA. First pass only — no in-app camera, cropping, or reordering designed yet.

## Interactions & Behavior
- **Onboarding forks are hard gates**: Continue is disabled until a choice is made on both the residency and looking-mode screens (no default selection).
- **Group card flip**: tapping a member avatar swaps the card's name/photo/tags/bio to that member; swipe direction always applies to the group as a whole, not the currently-shown member.
- **Accept-a-Like model**: an inbound like requires explicit accept before a chat opens (PRD: "Accept-a-Like model").
- **Composer validation**: required-field state (photos, rent, address, phone) is enforced before Publish enables — do not let users submit an empty listing.
- **Map pin clustering**: overlapping pins collapse into a numbered cluster pin at low zoom; no interaction spec beyond "tap to zoom in" has been defined yet — flag this as an open question for engineering.
- **RTL mirroring rule**: mirror only directional icons (back/forward/send/chevron); never mirror non-directional icons (search/heart/pin/plus/camera/star). Numbers, prices, and phone numbers stay LTR even inside RTL text runs.

## State Management
Minimum state the production app will need per screen group:
- **Session/user**: current mode (Solo/Group/Room-Filler/Lister), residency (resident vs. non-resident/no-profile), verification status, language preference.
- **Profile**: 16 lifestyle tag selections (renter) + 15 apartment tag selections (lister/room context), one value per category (single-select).
- **Map/Discover**: viewport bounds → pin query, favorited listing IDs, Discover looking-mode (individual vs. group), swipe queue and decisions.
- **Group**: member list (≤4), shared budget, shared tags (computed/aggregated from members per PRD — "dynamically computed and generated from the individual profiles of its members").
- **Chats**: pending likes queue, active thread list, per-thread message history, unread counts.
- **Composer**: draft listing fields, required-field validation state, publish status.
- **Monetization**: Unblur Pro subscription status gating profile visibility on the interested-list.

## Design Tokens

**Color**
| Token | Hex | Use |
|---|---|---|
| Orange — Primary | `#E2883A` | primary actions, brand |
| Orange Soft | `#FBE7D2` | tinted backgrounds |
| Orange Dark | `#B5661F` | button shadow/pressed |
| Teal — Secondary | `#1F94B3` | trust, links |
| Teal hover | `#16748C` | link hover |
| Gold — Favorites | `#F0B429` | favorite/star |
| Green — Success | `#4E9F63` | success, verified, match |
| Red — Error | `#DB5A4A` | error, destructive |
| Ink | `#262220` | primary text, dark surfaces |
| Body text | `#4A4340` | secondary text |
| Muted text | `#837B76` | tertiary text/labels |
| Disabled text | `#B4ACA6` | disabled states |
| Neutral bg | `#F1ECE5` / `#F8F5F1` | cards, inputs, chips |
| Border | `#E8E2DC` | card/input borders |
| Page background | `#FBF9F6` | app background |
| Teal soft | `#DCF0F5` | tinted teal backgrounds |
| Dark mode surface | `#1C1917` / `#262220` | dark background/cards |
| Dark mode text | `#F5F0EA` | dark mode primary text |

**Typography**: Rubik, weights 400/500/600/700/800/900. Display 48px/800, H1 24px/700, Body 16px/400 (1.6 line-height), Caption 13px/500.

**Radius scale**: 12px, 16px, 20px, 24px, 28px, pill (999px).

**Shadows**: buttons use a "pressed" hard-shadow style, e.g. `box-shadow: 0 4px 0 #B5661F, 0 6px 14px rgba(38,34,32,0.15)` (offset color-matched shadow + soft ambient shadow), collapsing to `0 0 0` on `:active` with a `translateY` press.

**Spacing**: card padding 16–40px depending on density; section gaps 32–96px on the desktop design-system page; mobile screen padding 20–24px.

## Assets
No external image assets — all imagery in the prototypes is a striped diagonal-gradient placeholder (`repeating-linear-gradient(45deg, #F1ECE5, #F1ECE5 Npx, #E8E2DC Npx, #E8E2DC 2Npx)`) labeled in monospace text (e.g. "photo: living room", "photo gallery · 1/6"). All icons are hand-built inline SVG, not an icon font/library — recreate them as an SVG icon set or swap in an equivalent from the target codebase's icon library, preserving the color-per-category convention (each nav/tag icon carries its own brand color, not a single neutral gray).

## Files
This package includes the standalone, self-contained HTML design files (open directly in any browser, no server needed):
- `Shutaf Design System — Index.html` — navigation hub linking the files below
- `Shutaf Design System — Foundations & Components.html` — direction/color/type/shape, buttons, tags, taxonomy, compatibility score, cards, nav, map pins, feedback/loading
- `Shutaf Design System — Screens 1 (Map, Discover, Listing).html`
- `Shutaf Design System — Screens 2 (Onboarding, Profile, Tags).html`
- `Shutaf Design System — Screens 3 (Composer & Listings).html`
- `Shutaf Design System — Screens 4 (Chats & Groups).html`
- `Shutaf Design System — Screens 5 (Business, Web, Settings).html`

A running list of intentionally-out-of-scope/open items lives in `Shutaf Design System - Coverage Audit.md` (also included) — check it before assuming a missing screen was an oversight.
