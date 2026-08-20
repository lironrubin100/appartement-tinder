# Changelog — what changed in this design pass

This design system started as a single file with foundations, components, and 3 screens (Map, Discover, Listing detail). Everything below was added or fixed in this pass. If you're diffing against an earlier version Claude Code has seen, this is the delta.

## Bug fixed
- The original file had two leftover `<x-import>` mounts at the top with no content, which rendered a blank device frame covering the entire page on load. Removed — this was a rendering bug, not a design decision.

## New product decisions this pass introduced
- **Residency, not persona, is the first onboarding fork.** Whether someone will live in the apartment determines if they need a profile — not which of the 4 PRD personas they are. Concretely: anyone living in the apartment (Solo, Group, Room-Filler) must build a profile. Anyone posting on behalf of a property they won't live in (Lister/agent/landlord) can post with an account only, no profile.
- **Mode switching** (Solo/Group/Room-Filler) happens after the residency fork, as a first-run choice, and is editable later from Profile via a persistent mode-switcher control.
- **Discover has a looking-mode toggle** (already existed as Solo/Group segmented control) and a new **group card**: tapping a member's avatar flips the card to show that member's individual bio/tags, but swiping left/right always decides for the whole group.
- **Chats gained an "Accept-a-Like" gate**: an inbound like must be explicitly accepted before a chat opens (per PRD's accept-a-like model), plus a "create group from matches" flow to upgrade a 1:1 chat into a group of up to 4.
- **The Plus composer forks by the same residency logic**: "I live here" pulls in the user's already-confirmed profile tags; "I'm posting for a property" is the quick, no-profile path with its own short account-details intake (name/phone/agency) and field-level validation (required photos/rent/address/phone block Publish until filled).

## Screens added (previously nonexistent)
Onboarding (residency fork → looking-mode → completion), non-resident account intake, mode switcher, Discover group card (summary + flipped-member state), Profile & Status, the 31-category tag-picker form (grouped into Lifestyle/Apartment/Logistics, expandable), Chats (list, empty state, Accept-a-Like, thread with shared-listing bubble, create-group sheet), group profile editing, Plus composer (both fork paths, quick-post validation states, publish confirmation), Room-Filler post-a-room, Lister dashboard, Verification, Unblur paywall, web/desktop Map & Discover, Settings, a photo-picker sheet, and one dark-mode example screen.

All of the above were built in both Hebrew (RTL) and English (LTR) except: the photo picker and dark-mode example (English-only, explicitly flagged as first passes, not decided directions).

## Structural change: file split
The single design-system file grew to ~4,500 DOM elements and stopped rendering reliably for screenshot/export tooling. It's now split into 7 files (an index + Foundations & Components + 5 screen-flow files, grouped by product area) — see the README's Files section for the map. No content was removed in the split, only reorganized.

## Still open (see Coverage Audit for the full list)
Dark mode is one example screen, not systemized. No push-notification treatment. No in-app camera/cropping for photos. Map pin cluster has no defined tap-to-zoom behavior. No equivalent short intake flow for Room-Filler (unlike the Lister's non-resident intake). These are flagged, not silently skipped.
