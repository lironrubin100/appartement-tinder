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

Updated through 29 October 2026 from direct owner answers and the ongoing product-vision interview. Approved MVP behavior remains in DECISIONS.md; ideas below are not permission to build or charge.

| Idea ID | Idea / owner rationale | State | Revisit trigger | References |
| --- | --- | --- | --- | --- |
| IDEA-001 | Resident Pro with additional strict/precise preference controls; basic smoking/pets controls free | Later hypothesis; no price or billing period selected | Validate useful search and willingness to pay | C13, G4/G6, BUSINESS_MODEL.md |
| IDEA-002 | Saved-search/area property monitor, potentially paid; alert when a relevant new property appears | Later; not MVP requirement, owner Q28 | Basic message/inquiry channels working and user demand | F7, SL26 |
| IDEA-003 | Useful neighborhood places for any resident, including bakeries, fitness and daily services as well as student businesses; paid business placements are a separate hypothesis | Later; no business layer, billing or advertising implementation | Learn usefulness and payer demand separately; define source/freshness and labeled sponsorship on a separate layer without hiding housing or changing matching | BUSINESS_MODEL.md |
| IDEA-004 | Professional-lister portfolio tools / permitted interest visibility | Later hypothesis; no consent-bypassing unsolicited outreach | Confirm repeat professional workflows and appropriate rights | G4, SL20/SL23 |
| IDEA-005 | General furniture/products marketplace replacing fragmented resale groups | Later vision, separate from D15's apartment-attached feature | Validate housing hub first | D15, SL22 |
| IDEA-006 | Initial assisted publisher outreach/messages | Deferred operational preparation; not current development blocker | Ready to recruit real supply | D0, SL17 |
| IDEA-007 | Separate shared group wishlist | Not included in MVP: owner selects chat listing card + independent personal saves | Revisit only if chat sharing/personal saves prove insufficient | E7/E8, MVP_DECISION_ANSWERS.md |
| IDEA-008 | Additional deal-breakers: kosher kitchenware, hosting and music | Future meaning/constraint decision, owner brief 25 October; no inference from free bio or disclosure of private preferences | Explicit C13 semantics and collection/editing before filtering | C13, BUSINESS_MODEL.md |
| IDEA-009 | Master bedroom, bathrooms, balcony, yard and resident count; short sublets | Gaps/proposals to reconcile with existing fields, not claimed live | Verify actual collection/editing before filters; short sublet needs date range and period pricing, not just a label | D2, D9, BUSINESS_MODEL.md |
| IDEA-010 | Paid listing bump alongside multi-property publisher and business revenue hypotheses | Future hypothesis; no final price, threshold, paywall or billing approved | Validate payer/value separately after the useful free housing journey | G3, G6, BUSINESS_MODEL.md |
| IDEA-011 | Interactive city/area understanding within the map, with neighborhoods and lived local areas | Owner direction; boundaries/content/interaction and launch scope open | Curate and verify initial local knowledge; reconcile with existing map | docs/PRODUCT_VISION.md |
| IDEA-012 | Personal questionnaire recommending three areas with explained tradeoffs and optional handoff to chosen-area housing search | Owner direction; questions, scoring and scope open | Define inputs, evidence and explanation before implementation | docs/PRODUCT_VISION.md |
| IDEA-013 | Travel-time guidance to academic institutions by travel mode | Candidate for near-term work, not committed launch scope; provider/cost/accuracy unresolved | Check feasible approved data, routing and location-privacy boundaries | docs/PRODUCT_VISION.md, D4 |
| IDEA-014 | General campus destination guidance based on degree or actual study locations | More distant feasibility direction; no verified mapping or institutional partnership | Establish reliable coverage and manual destination choice | docs/PRODUCT_VISION.md |
| IDEA-015 | Preferred housing areas and geographic flexibility in resident/group discovery | New direction; semantics and matching/filter rules open | Define individual choices and group conflicts without inferring policy | docs/PRODUCT_VISION.md, C13/E6 |
| IDEA-016 | Understand residents and household life from the listing, and the actual home from Discover; identify roommate-recruiting homes on map | Existing tasks 9.12–9.15 cover part; reverse link, household portrayal and request routing need clarification | Reuse existing cards/inquiries; resolve partial registration and E6/D12 changes before new tasks | docs/PRODUCT_VISION.md, D12/E6/F4 |
| IDEA-017 | Planned, organized resident-tip contribution for a future pilot | Plan collection/organization/presentation now; no active collection or public workflow selected | Decide contextual metadata, editorial responsibility, freshness and privacy | docs/PRODUCT_VISION.md |
| IDEA-018 | Local benefits as a possible reward for useful, honest area contributions | Experiment hypothesis; no partners, funding or eligibility mechanism chosen | Validate participation and economics; reward must not depend on a positive opinion | docs/PRODUCT_VISION.md, BUSINESS_MODEL.md |
| IDEA-019 | Coordinated apartment viewing windows for several interested people | Separate distant idea from founder experience; outside current promise | Revisit after core housing journeys and explicit owner selection | docs/PRODUCT_VISION.md |
| IDEA-020 | Local community activities and events after useful post-move guidance gains an audience | Distant horizon, not the current pitch or launch requirement | Evidence of useful local guidance, repeat use and actual community demand | docs/PRODUCT_VISION.md |

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
