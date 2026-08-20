# Shutaf Design System — Coverage Audit

## ✅ Foundations
Direction/logical properties, color, type, shape, nav icons.

## ✅ Components
Buttons/inputs, segmented control, attribute tags, full 31-category tag taxonomy, compatibility score, hand-me-down market, cards (listing/roommate/group), nav, map pins + states (incl. cluster), toast/snackbar, loading skeleton.

## ✅ Screens — EN + HE mobile unless noted
- Map feed, Discover swipe, Listing detail (mobile + web)
- Onboarding: residency fork → looking-mode picker → completion
- Non-resident intake (account details before quick-post)
- Mode switcher pill, placed inside Profile
- Discover group card: summary + flipped-member state
- Profile & Status
- Tag-picker form (Lifestyle / Apartment / Logistics, expandable)
- Chats: list, empty state (EN only), Accept-a-Like, thread w/ shared-listing bubble + create-group sheet
- Group profile editing (members, shared budget)
- Plus composer: quick-post (no-profile, with validation states) + resident path (profile tags) + publish confirmation
- Room-Filler: post-a-room form
- Settings (language picker, notifications, privacy, delete account)
- Lister dashboard, Verification flow, Unblur paywall — now EN + HE
- Web/desktop: Map, Discover — now EN + HE (Listing detail web already existed)
- Photo picker sheet, Dark mode example (chat thread) — **English only, first pass**

## ❌ Still open
- Dark mode is a single example screen, not a systemized dark palette across all components
- Web/desktop versions of onboarding, composer, Profile, Chats, Settings
- Photo picker: only the "choose from library" sheet; no in-app camera, cropping, or reordering
- Map clustering shown as a static pin state; no interaction spec for tap-to-zoom
- Push notification treatment (banners, permission prompt)
- Non-resident intake: no equivalent short flow decided for Room-Filler (skips straight to the room form)
- Business/agency multi-listing bulk actions for Listers (bulk edit, CSV import) — out of scope unless requested
