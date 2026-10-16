# Shutaf business model and validation record

Status: working record, not an approved monetization specification.
Created: 2026-10-15 (Asia/Jerusalem).

16 October checkpoint: direct answers in MVP_DECISION_ANSWERS.md. Owner confirms advanced preference controls and area-listing monitor as future potential paid value, no price/billing approved and no Pro in MVP. Furniture later; supplier outreach deferred. Budget free-only. G1 now counts unique private savers; does not authorize exposing their identities or unsolicited owner messages. Expand measurement through purposeful events, not content collection. Earlier unanswered notes below are historical; consult canonical current rows before treating anything as still open.

## Authority and purpose

DECISIONS.md remains authoritative for binding product and business rules. This document stores hypotheses, evidence, business rationale, experiments and unresolved ideas. When the owner approves a rule that affects product behavior, update its canonical decision row and reference it here; do not create competing policy in this document.

Owner intent confirmed in chat on 15 October: prepare a genuinely usable closed-pilot prototype and a clear vision for a university investment fund, before public release. Keep a durable, evolving place for business-model and Pro ideas while building. This does not approve payments or change existing deferrals.

## Existing decisions to preserve

- G2: Pro unblur concerns both identity and photo, with server-side authorization; it does not authorize implementation before other open monetization choices are resolved.
- G3: pricing/payment rails remain RESEARCH; illustrative design pricing is not approved pricing.
- G4: additional benefits remain OPEN. G6 now DECIDED: paid Pro is outside the initial prototype; exact future timing/pricing still unresolved.
- K1: web first, native phase two.

## Business hypothesis ledger

| ID | Question | Current answer | State | Evidence / next validation |
| --- | --- | --- | --- | --- |
| BIZ-01 | First pilot audience and unmet need | Beer Sheva roommate/apartment marketplace per A1; narrower recruiting cohort pending | Partly defined | Owner interview; user conversations |
| BIZ-02 | Who pays and why | Owner ideas: local-business map placements; professional-lister tools; resident Pro with advanced preferences | Proposed, not approved pricing/features | Validate each payer separately; no billing in initial prototype |
| BIZ-03 | Free core and paid boundaries | Existing G2 commitment; rest governed by G3-G6 | Open / research | Confirm proposed tiers without blocking essential marketplace loop by accident |
| BIZ-04 | Initial proof of value | Working closed pilot + credible demonstration desired | Goal confirmed; measurable threshold pending | Track journeys completed, response/use feedback, distinguish synthetic demo data |
| BIZ-05 | Fund/program and request | No specific target; owner mentions Cactus/Ben-Gurion options and wants budget/resources/team support | Intent confirmed | Do not describe a feature checklist as a guarantee of funding |
| BIZ-06 | Supply/recruitment | Owner proposes temporary day-one seeding from Facebook/other listings plus student social groups; not ongoing scraping after adoption | Proposed acquisition experiment; conflicts with current D0 | Resolve source permission, publisher consent, availability/freshness, receiver of inquiries, labeling and sunset before implementation |

## Owner interview additions — 15 October 2026

Source: direct owner messages in the planning chat. These notes preserve intent; implementation rules are binding only through DECISIONS.md.

- Vision: one hub replacing fragmented apartment/roommate searching across Facebook groups, Instagram stories and other channels. Apartment discovery/filtering and roommate discovery both central. Future marketplace expansion is secondary.
- Geography: Beer Sheva is launch/marketing focus, but owner does not want to block a Tel Aviv listing. A5 is now DECIDED accordingly; do not implement city rejection from the imported map prompt.
- Supply: temporary day-one assisted seeding, not permanent aggregation/scraping business model. Owner's latest clarification explicitly says this is only marketing/day one, to stop after adoption. Time limitation does not answer who owns the listing, who receives an inquiry or whether copying is permitted. D0 currently remains binding; no scraper or external handoff implemented.
- Matching: owner requests an architect-prepared formula proposal. Prefers flexible discovery, with strict/advanced preferences as possible later Pro value; do not silently replace C13's current hard-gate decision until proposal approved.
- Group budgets: owner questions public disclosure, requests recommendation. Proposed resolution: no derived public personal-budget summary; explicit private group search preference if needed. E6 not yet changed.
- Existing-group blocking/admin exit: owner requests recommendations and considers these less urgent. Need minimal deterministic policy if included groups expose the case; do not reopen all group design.
- Availability: owner accepts hiding unavailable inventory but wants control over continuing inquiries while a deal is uncertain. Creating a group or joining one is not signing a lease. Design room availability, inquiry intake and group discovery as separate controls; do not infer final occupancy from group state.
- Address edits: owner considers a different address a different property. Recommend property-identity invariant with a correction path; exact correction threshold and historical access need specification.
- Missing-address fallback: owner accepts manual text/map correction recommendation, subject to server validation.
- Reports: owner accepts a small manual pilot queue with inspect/hide/suspend/audit proposal; exact report categories and response schedule not newly confirmed.
- Notifications: owner accepts initial focus on new message/new inquiry, staged channels; original email and web-push intent remains. Sender existence unverified.
- Age/name/deletion: recommendations requested, not approved yet.
- Pro: owner explicitly excludes Pro from initial MVP. Pricing may be one-off/annual/other; not decided.
- Furniture: owner mentions apartment furniture selling and future broader resale marketplace; precise pilot scope still ambiguous, so do not silently defer D15 or build broad resale.
- No deadline, monthly operating budget, pilot cohort count or numeric success threshold supplied; leave unset rather than invent owner commitments.

## Temporary day-one supply proposal — not authorized implementation

Preferred experiment: recruit initial listers through existing communities; with their consent, prepare native draft listings, confirm current availability/photos/price and let them claim/approve ownership and choose a real inquiry recipient before activation. Minimize their effort; do not impersonate an owner.

Alternative external-source cards would need a separate explicit product decision: clearly label origin/unverified availability, distinguish them from native actionable inventory, and disclose whether contact leaves Shutaf. Do not attach an in-app inquiry/acceptance promise when no recipient can fulfill it. This would change D0/F4 and the measurable core loop; no such change is approved yet.

Experiment accounting: record permission/provenance, confirmation date, owner/inquiry routing, expiration/removal and a concrete sunset trigger. Separate seeded listings, active confirmed inventory and genuinely self-published supply in metrics. Do not present imported rows as active users or organic traction.

Official source check on 15 October: Meta states automated collection without permission violates its terms: https://about.fb.com/news/2021/04/how-we-combat-scraping/ . The direct current automated-collection terms page redirected to login in this session; no claim of full legal review. Publisher consent and platform authorization are separate questions.

## Recording a business idea

For each idea record: date, owner wording, problem/payer, proposed value, free/paid boundary, price hypothesis if any, evidence, experiment, outcome and canonical decision references. Use explicit states: proposed, researching, approved, rejected or deferred. Revenue estimates and willingness to pay are hypotheses until measured. Never present an experiment or mock payment as actual revenue.

## Prototype acceptance proposal — awaiting owner confirmation

Demonstrate the product's distinctive complete journey with persistent real backend behavior, consenting pilot users, clear separation of demonstration data, verified privacy and failure recovery, and feedback evidence. Keep public acquisition, billing and native applications out of the prototype acceptance unless the owner explicitly includes them. Pilot data still requires appropriate privacy/security handling; a closed audience does not eliminate those requirements.

No assertion is made that any feature list or metric guarantees investment. Research the actual fund's criteria once identified.

## Architect feedback — proposed priority, not approved monetization

1. **Protect the free useful loop.** Basic discovery, public apartment prices, sending a legitimate inquiry/introduction, accepted chat and safety/privacy should remain useful without payment. Charging before useful supply exists can weaken the evidence the pilot needs.
2. **Validate professional-lister workflow first as a recurring-value hypothesis.** Someone managing several properties may repeatedly need availability, response organization and portfolio tools, whereas a resident normally stops searching after success. This is reasoning about the proposed use cases, not measured willingness to pay. Interview potential payers and test a described offer before building billing.
3. **Resident Pro as an optional search-efficiency product.** Advanced preferences/alerts could be valuable during a short moving window. A limited-duration pass may be worth testing against a subscription; an annual plan should not be assumed appropriate for episodic search. No price or billing period chosen. Safety-critical constraints cannot be treated as paid privileges, and C13's current hard-gate contract needs explicit revision before a future flexible/strict distinction.
4. **Attention does not imply outreach consent.** Let owners respond to an actual inquiry/opted-in interest, not automatically message everyone who saved/viewed a listing. G2's historical unblur design does not settle consent or authorize open contact; specify the exact signal/permission first.
5. **Local business map placements later.** Separate sponsored places from housing pins, clearly label sponsorship, and let people keep the apartment-search map legible. Measure useful engagement with relevant services before a full self-service advertising product. Monetizing local audiences requires actual audience density; imported inventory alone does not provide it.
6. **Avoid launching three businesses together.** Housing search, general resale and ad sales have different operations. Keep the hub vision, but use the pilot to prove apartment/roommate value before broad marketplace or advertising infrastructure.

Competitor observation checked 15 October: Hinge distinguishes private flexible preferences and subscriber filter extensions. That supports the *shape* of the owner's analogy, not housing demand, conversion, legal suitability or price. Source: https://help.hinge.co/hc/en-us/articles/360011063294-How-do-I-change-my-Preferences . Do not copy sensitive dating filters into housing without approved product/legal review.

## Validation packet for a prospective fund — proposal

- Repeatable real demo of the two core journeys and honest known limits.
- Problem interviews and named recruiting route, with personal data withheld from public deck unless consented.
- Confirmed responsive room supply, separated into assisted/native-organic/demo cohorts.
- Funnel evidence: completed profiles, delivered/accepted inquiries/introductions, two-way conversations and time to reply; self-declared found-home/roommate outcome separately labeled.
- One clear funding/resources request and milestone plan: which team capacity/marketing experiment money buys and how progress will be measured. Amount/timing remain owner choices.
- One prioritized payer hypothesis with evidence/next experiment, rather than untested revenue projections.

Cactus official page checked 15 October distinguishes idea/plan and early-venture routes, plus mentoring/resources; no single feature threshold or investment guarantee is inferred. Source: https://www.bgu.ac.il/yazamut360/cactus-capital/entrepreneurs/ . No application or outreach sent.
