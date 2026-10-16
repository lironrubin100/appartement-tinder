# Matching specification — review proposal

State: C2 questionnaire baseline adopted 17 October; C3/C13 scoring baseline remains approved. TAXONOMY fixes fields/translations/comparisons and SQL owns production scoring. Source reconciliation/manifest generation and runtime evidence are implementation work, not further major architecture approval.

16 October answers: flexible ranking with optional free mandatory smoking/pet constraints; advanced controls may be paid later, no Pro in MVP. Group low-member baseline and private-budget separation accepted provisionally. Refine scoring toward end of MVP; preserve basic discovery/introduction meanwhile. Exact taxonomy/copy is not frozen by formula acceptance.

## Inputs and ownership

Separate four domains: resident facts, resident preferences about co-residents, apartment facts and private apartment-search preferences. A category heading is not automatically one single-select enum. Preserve stable category/option IDs separately from Hebrew/English labels and icon/color tokens. No matching on free-text bio or inferred sensitive facts.

Exact source taxonomy: JSON-encoded HTML template at `design_handoff_shutaf_design_system/Shutaf Design System - Foundations & Components.html:382`, Full Tag Taxonomy. The complete source options are English, not a complete approved Hebrew dictionary. The concrete normalized bilingual proposal is [TAXONOMY](TAXONOMY.md), including per-option comparisons; C2 baseline now adopted; generate typed manifest before modifying form/scorer.

## Source inventory and proposed normalization

The source options below are an exact design inventory, not automatically valid database types. All 31 headings retained. Multi-field/multi-select normalization is proposed architectural refinement of structured C1, not a trimmed taxonomy.

| ID | Source category and options | Proposed modeling/scoring use |
| --- | --- | --- |
| R01 | Gender Dynamic: 1 guy + guys; 2 girls + 1 girl; Co-ed, anyone | Group-composition options cannot represent individual identity. Define identity/composition separately from acceptance. No percentage weight until approved semantics/legal review. |
| R02 | Cleanliness: Clinically clean; Tidy common areas; Relaxed/lived-in | Own routine + acceptable routines; lifestyle weight 2. |
| R03 | Sleep Schedule: Night owl; Early bird; 9-to-5 routine | Own schedule + acceptable alternatives; named matrix, weight 2. |
| R04 | Social & Guests: Pre-game hub; Weekend gatherings; Quiet sanctuary | Own behavior + tolerance; weight 2. |
| R05 | Noise Tolerance: Needs silence to study; Constant music/TV OK | Noise produced and tolerated are distinct; do not compare tolerance labels as identical facts; weight 1. |
| R06 | Music/Vibe: Reggaeton on weekends; Lo-fi background beats; Headphones only | Playback behavior/tolerance, not musical taste ranking; weight 1. |
| R07 | Climate Control: AC on blast (18°C); Open windows/breeze | Habit/acceptance; weight 1. |
| R08 | Smoking Policy: Strictly non-smoking; Balcony only; 420 friendly | Separate behavior from permitted household policy; weight 1 and explicit mismatch notice. |
| R09 | Kitchen & Dietary: Shared groceries; Strict kosher kitchen; Separate shelves | Grocery sharing, dietary/kosher constraints and storage separate fields; weight 1 per category, not per added field. |
| R10 | Cooking Dynamics: Meal prepper; Survives on Wolt; Big shared meals | Routine + preferred sharing; weight 1. |
| R11 | Pet Ownership: Has a dog; Has a cat; Loves pets; Allergic/no pets | Pet ownership set + accepted pets/allergy disclosure; weight 1 and explicit mismatch notice. |
| R12 | Weekend Routine: Stays in the apartment; Travels home / family | Fact/preference; weight 1. |
| R13 | Relationship Status: Partner visits often; Single / rare overnights | Overnight guest behavior, not a relationship-worth score; excluded from initial percentage. |
| R14 | Study Habits: Always in the library; Studies in living room; Locked in bedroom | Optional disclosed habit; excluded initially to avoid double-counting noise/social. |
| R15 | Financial Splitting: Splits everything evenly; Pay for what you use | Explicit shared-cost preference; weight 1. |
| R16 | Reserve Duty (Miluim): Gone for weeks; Standard schedule | Optional disclosed availability context; no automatic score penalty. |
| A01 | Proximity to BGU: 5 min to Main Gate; Near Soroka; Needs scooter/car | Area/access context; do not infer travel times from an approximate public pin. |
| A02 | Air Conditioning: AC in every room; Living room only; No AC | Apartment fact + viewer requirement. |
| A03 | Security & Safety: Has a Mamad; Adjacent shelter; Window bars (soragim) | Nonexclusive facilities; separate fields, no security guarantee. |
| A04 | Water Heating: Solar (dud shemesh); Electric boiler | May coexist; fact set. |
| A05 | Furnishing & Appliances: Fully furnished; Appliances only; Completely bare | Furnishing summary plus explicitly listed equipment. |
| A06 | Hand-Me-Downs: Leaving roommate selling; Nothing for sale | Listing context; does not require general marketplace implementation. |
| A07 | Outdoor Space: Sun balcony; Private yard; Shared roof | Nonexclusive fact set. |
| A08 | Laundry Setup: Washer & dryer; Washer only; Laundromat nearby | Washer/dryer facilities + external facility claim separate. |
| A09 | Accessibility: Ground floor; Elevator building; Walk-up (stairs) | Floor/elevator/step access separately; do not claim accessible from elevator alone. |
| A10 | Parking: Private reserved spot; Free street parking; Blue & white | Fact set; street parking is not a reserved-space guarantee. |
| A11 | Pet Rules: Pet friendly; Cats only; Strictly no pets | Allowed animal policy distinct from resident pet facts. |
| A12 | Kitchen Setup: Gas stove; Induction; Dishwasher included | Stove type and dishwasher separate. |
| A13 | Hidden Costs: Arnona & vaad included; Bills paid separately | Individual cost inclusions + D5 bills_included semantics; avoid contradictory values. |
| A14 | Internet Infrastructure: Fiber optic ready; Standard connection | Infrastructure availability distinct from service included in rent. |
| A15 | Roommate Cap: Numeric · max tenants allowed | Positive integer bounded against approved occupancy/room model; not E2's social group limit. |

## Proposed scoring contract

Two outputs, never one ambiguous all-purpose percentage:

1. **Lifestyle fit**, using deliberately public lifestyle facts/choices, mutual between people. Group fit uses member comparisons.
2. **Private search suitability**, directional from viewer's budget/date/apartment requirements to listing facts. Do not return the viewer's private inputs or a probeable public score based on another person's private budget.

For comparable category c, `s(A→B,c)` is 1 when B satisfies A's preferred value, 0.5 for an explicitly accepted alternative, 0 for an explicit incompatibility. Mutual fit is `min(s(A→B,c), s(B→A,c))`. No preference means unconstrained acceptance only when explicitly chosen; missing input remains unknown. Never infer preference from identity/ownership alone.

`score = round(100 * sum(weight[c] * mutual_fit[c]) / sum(comparable_weight[c]))`.

Weights: cleanliness/sleep/social 2 each; noise/music/climate/smoking/kitchen/cooking/pets/weekend/cost-sharing 1 each. Total possible weight 15. Gender, relationship, study and military duty do not contribute to the initial percentage; retain supported input/display and explicit preference notices rather than pretending the categories disappeared.

For a split multi-field category, all required subfields must have approved comparison semantics before contributing. Each category's weight is counted once. Its subfield aggregation rule must be added to the versioned matrix; unresolved normalization means slice blocked, not permission for executor to invent a mean.

Directional accepted/preferred-set comparisons are specified exactly in TAXONOMY.md. No inferred ordinal closeness or inferred acceptance from own answer. Compound kitchen/multi-select/pet semantics are explicit there; C2 baseline adopted; wording refinements preserve these semantics.

Missing data is excluded from numerator/denominator and reported as coverage. Proposed display threshold: at least 3 comparable categories and 6 comparable weight; otherwise no percentage, show "Limited information". Return `comparable_categories`, `comparable_weight`, `possible_weight`, `scoring_version`. Never show 100% from one matching answer.

## Worked examples

- Cleanliness 1×2 + sleep 0.5×2 + guests 0×2 + noise 1×1 = 4/7, rounded 57%; four categories compared. Missing pets/smoking not assumed compatible.
- A owns a cat and accepts pets; B cannot live with cats: A→B=1, B→A=0, mutual pets=0; show clear preference difference. Do not hide under a high aggregate score.
- Scores against three members 84%,72%,91% → proposed group fit 72% (lowest member fit), with member breakdown. If any member lacks threshold coverage, show incomplete group fit and no confident aggregate. Private budgets never enter that public result.
- Viewer budget 1,800–2,300 and room prices 2,000/2,600 → first room fits, second exceeds budget. Return these assessments only to that viewer; listing public prices stay unchanged. A private budget is not a public tag.

## Eligibility, ranking and strict preferences

Updated C13: lifestyle differences normally lower rank with explanation. Explicit free no-smoking/no-pets constraints may exclude known incompatibilities; unknown is not fabricated compatibility. Additional controls remain future Pro hypotheses, no paywall in MVP (G6).

Always enforce independently of payment: blocked relationships, privacy authorization, incomplete/ineligible profiles under approved policy, prior-pass window C8, prior accepted/pending interactions as defined, unavailable inventory and group capacity/admission. Never loosen safety/access controls to increase result count.

Proposed stable ordering: sufficiently supported matches first, descending score, then recent activity where valid/approved, then stable ID. Low-coverage candidates appear in a clearly identified section, not falsely scored last. Use a cursor containing ranking version/snapshot and stable tie-break. C3/J2 technical ranking/pagination adopted; choose no hidden randomness or ML.

Explanation output may name 2–3 compatible public lifestyle categories and explicit public mismatches. Never include private budgets, birth date, private move-in dates or hidden badges. Limit score-query probing and avoid arbitrary target-input endpoints.

## Architecture proposal

- One versioned typed taxonomy consumed by input validators, label renderers and server scoring; migrations use approved stable IDs/checks. Keep historical migrations immutable.
- SQL/RPC excludes blocked/passed/unauthorized candidates before ranking and returns allowlisted projections. Exact storage/normalized fields must satisfy approved C1/J1; no free text arrays as a shortcut.
- Production scoring is one versioned SQL function called by authorized discovery RPCs before paging; private preferences never returned. TypeScript pure reference is test-only and must match exhaustive factor/unknown fixtures. No separate client scorer or second production authority.
- Private preference writes owner-only; client cannot write computed compatibility, verified status or entitlements.

## Approval and readiness gates

C13 provisional formula/direction and E6 privacy correction approved. TAXONOMY.md provides normalized bilingual fields/options, comparison rules and unknown handling; SQL production scoring owner chosen above. C2 baseline adopted, wording/visual refinement allowed; Q34 technical delegation adopted. After C2 closure generate typed manifest/validators and reconcile actual schema in the relevant packet; old source export alone is not runnable authorization.

## Required acceptance

Deterministic/versioned examples above; no unknown-as-match; matrix symmetry/directional asymmetry as intended; no duplicate category weights; private-field projection tests; group minimum/coverage behavior; blocked/pass/quota eligibility unchanged; stable pagination across ties; no sudden disappearance from a different score version without explicit refresh behavior.
