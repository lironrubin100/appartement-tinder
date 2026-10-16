# Shutaf Product Roadmap

This file tracks product scope that should not enter the MVP implementation yet. `DECISIONS.md` remains the source of truth for product rules; this roadmap records when agreed or proposed capabilities belong in the build sequence.

## MVP

- Apartment listings with one or more available rooms; each room has its own monthly price and bills-included is shown at apartment level.
- Resident startup tab defaults to Discover; residents may choose Discover or Map in Settings.
- In-app messaging and one private account phone number.

## Committed post-MVP features

| Feature | Deferred scope | Revisit when | Decision reference |
|---|---|---|---|
| Apartment-attached furniture selling | Seller/items/contact and sold lifecycle; no initial MVP | After core apartment/roommate pilot works; explicitly deferred by owner Q4, 16 October | D15 |

## Idea ledger — not approved implementation

Updated 16 October 2026 from direct owner answers. Approved MVP behavior remains in DECISIONS.md; ideas below are not permission to build or charge.

| Idea ID | Idea / owner rationale | State | Revisit trigger | References |
| --- | --- | --- | --- | --- |
| IDEA-001 | Resident Pro with additional strict/precise preference controls; basic smoking/pets controls free | Later hypothesis; no price or billing period selected | Validate useful search and willingness to pay | C13, G4/G6, BUSINESS_MODEL.md |
| IDEA-002 | Saved-search/area property monitor, potentially paid; alert when a relevant new property appears | Later; not MVP requirement, owner Q28 | Basic message/inquiry channels working and user demand | F7, SL26 |
| IDEA-003 | Local businesses advertise on a separate labeled map surface | Later hypothesis | Actual local audience density and payer validation | BUSINESS_MODEL.md |
| IDEA-004 | Professional-lister portfolio tools / permitted interest visibility | Later hypothesis; no consent-bypassing unsolicited outreach | Confirm repeat professional workflows and appropriate rights | G4, SL20/SL23 |
| IDEA-005 | General furniture/products marketplace replacing fragmented resale groups | Later vision, separate from D15's apartment-attached feature | Validate housing hub first | D15, SL22 |
| IDEA-006 | Initial assisted publisher outreach/messages | Deferred operational preparation; not current development blocker | Ready to recruit real supply | D0, SL17 |
| IDEA-007 | Separate shared group wishlist | Not included in MVP: owner selects chat listing card + independent personal saves | Revisit only if chat sharing/personal saves prove insufficient | E7/E8, MVP_DECISION_ANSWERS.md |

For each later conversation: update existing idea by ID instead of creating duplicate prose. Preserve date/owner intent, proposed value, scope, dependencies and evidence. Promotion into MVP requires an explicit canonical decision and revised slice/acceptance/dependency impact; discussing an idea does not promote it automatically.

## Other deferred capabilities already recorded

| Feature | Revisit when | Decision reference |
|---|---|---|
| React Native / Expo app | After the web product validates its core journey. | K1, K6 |
| Image messages in chat | After text and listing-card messaging are stable and moderation/storage needs are understood. | F3 |
| Automated photo/text moderation | After a real incident or enough moderation volume justifies it. | H4 |
| Lister bulk actions / CSV import | Only if agency users need multi-listing workflows. | Design handoff Coverage Audit |

## Intake template

Add future ideas as a row with: **feature**, **deferred scope**, **revisit trigger**, and **decision reference**. Do not treat a roadmap item as an MVP requirement unless `DECISIONS.md` is updated.
