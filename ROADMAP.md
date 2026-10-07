# Shutaf Product Roadmap

This file tracks product scope that should not enter the MVP implementation yet. `DECISIONS.md` remains the source of truth for product rules; this roadmap records when agreed or proposed capabilities belong in the build sequence.

## MVP

- Whole-apartment listings with one total monthly price.
- Resident startup tab defaults to Discover; residents may choose Discover or Map in Settings.
- In-app messaging and one private account phone number.

## Committed post-MVP features

| Feature | Deferred scope | Revisit when | Decision reference |
|---|---|---|---|
| Individual room listings | Let posters create a listing for a specific room in an existing apartment, with its own rent and availability. Keep separate from the MVP whole-apartment listing model until the user flow and entity model are designed. | After the whole-apartment listing and inquiry flow is working with real users. | D5, D9, D12 |
| Bills-included tag | Add a clear listing attribute indicating whether utilities are included in the stated rent. | Alongside the room-listing or listing-price iteration, before expanding filters. | D5 |

## Other deferred capabilities already recorded

| Feature | Revisit when | Decision reference |
|---|---|---|
| React Native / Expo app | After the web product validates its core journey. | K1, K6 |
| Image messages in chat | After text and listing-card messaging are stable and moderation/storage needs are understood. | F3 |
| Automated photo/text moderation | After a real incident or enough moderation volume justifies it. | H4 |
| Lister bulk actions / CSV import | Only if agency users need multi-listing workflows. | Design handoff Coverage Audit |

## Intake template

Add future ideas as a row with: **feature**, **deferred scope**, **revisit trigger**, and **decision reference**. Do not treat a roadmap item as an MVP requirement unless `DECISIONS.md` is updated.
