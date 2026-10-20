# Structured taxonomy v1 — adopted MVP baseline

17 October 2026. Owner explicitly adopted this baseline under C2, with later wording/visual refinement allowed. C1's 31 source headings remain traceable below. C13 approved weights/threshold remain unchanged: 12 factors, total weight15, >=3 comparable factors and weight6 before percentage. Do not replace this with a different eight-factor formula. The17October adoption document itself changed no application fields/migrations; the implemented20October snapshot is recorded next.

## Implemented snapshot — 20 October 2026

The approved31-category typed manifest and HE/EN options exist in [taxonomy.ts](../../web/src/lib/contracts/taxonomy.ts); bounded configuration/public allowlisting is in [config.ts](../../web/src/lib/contracts/config.ts). The conservative legacy adapter keeps only exact meanings and never infers disclosure or replacement identity answers. The [test-only scoring reference](../../scripts/lib/scoring-reference.mjs) checks the comparison rules below; it is not the production matching engine.

Canonical resident facts/private preferences/disclosure are now consumed by onboarding, profile editing and safe person/group projections in39fdcee, published in final2877c38. [generate-profile-schema.mjs](../../scripts/generate-profile-schema.mjs) derives the SQL option schema from that manifest; the focused canonical SQL suite checks53-option parity, and20October12 contract tests plus8 selector tests passed. [DATA_CONTRACTS](DATA_CONTRACTS.md#implemented-profile-and-chat-contracts--20-october-2026) records actual tables/RPCs and local→live migration versions. The [release record](../releases/2026-10-20-profiles-chat.md) separates original fresh onboarding/Storage checks from current Production persistence tests and the still-unexecuted Google roundtrip.

Apartment field adapters/validators exist as shared contracts, but full composer/storage adoption and production scoring remain successor work. A31-category manifest does not mean31 new compulsory resident questions or that all apartment facts have been migrated. Required resident core fields remain the four below; other facts and private preferences are progressively completable. No category/option/weight change is made by this status update.

## Storage and validation contract

Four domains: resident lifestyle facts; owner-private co-resident preferences; apartment facts; owner-private apartment-search preferences. Use typed category-specific fields, enums/check constraints and bounded numeric values; unknown is NULL, never invented false/zero. Enum IDs stable English, labels localized. Arrays contain unique canonical IDs in canonical order; explicit empty means none only when a separate answered flag is true. Missing answer differs from none.

For each scored resident field store private `accepted_<field>[]` and `preferred_<field>[]` (preferred subset of accepted). Empty accepted is unset/unconstrained, not reject everyone. Explicit no-smoking/no-pets switches separate from scored weights. No forced preference inferred from own fact. Required resident facts remain I9: cleanliness, sleep, guests, smoking; remaining fields optional/progressive. Display only consciously disclosed lifestyle facts; preferences/DOB/budget/date/contact never public. Unanswered factor contributes no denominator. Free text never scored.

## Category and field dictionary

`R` and `A` IDs map one-to-one to source headings in MATCHING.md. Option ordering is display only, never an implicit numerical distance. Slash separates stable option IDs; matching localized labels follow in parentheses in same order.

| ID / source heading | Approved question label HE / EN | Normalized field and values |
| --- | --- | --- |
| R01 Gender Dynamic | הרכב הבית / Household composition | Source heading retained; no new gender-identity intake field, desired-gender preference, filter or scoring in MVP. Group member count is real membership, not inferred identity. Existing voluntarily disclosed data requires migration/privacy review; do not automatically republish it. |
| R02 Cleanliness | ניקיון במרחב המשותף / Shared-space cleanliness | `cleanliness`: very_tidy/tidy_shared/relaxed (נקי מאוד/סדר במרחב המשותף/גישה נינוחה). Weight2. |
| R03 Sleep Schedule | שגרת שינה / Sleep schedule | `sleep_schedule`: early/regular/late/variable (מוקדם/שעות רגילות/מאוחר/משתנה). Weight2. |
| R04 Social & Guests | אירוח וחברה / Social life and guests | `guests`: rare/occasional/frequent (לעיתים רחוקות/מדי פעם/לעיתים קרובות). Weight2. |
| R05 Noise Tolerance | רעש ושקט בבית / Household noise | Own `household_noise`: quiet/moderate/lively (שקט/רעש מתון/בית תוסס); optional private quiet-hours from/to local HH:mm, both or neither. Score household_noise only weight1; quiet-hours explanation separate. |
| R06 Music/Vibe | האזנה למוזיקה בבית / Music at home | `music_habits[]`: headphones/background_speakers/social_music (אוזניות/רמקול ברקע/מוזיקה באירוח). Multiple facts; weight1 once. |
| R07 Climate Control | מיזוג ואוורור / Cooling and ventilation | `climate`: cool_ac/moderate_ac/windows/flexible (מזגן קר/מיזוג מתון/חלונות ואוויר/גמיש). flexible means unspecified score, no silent compatibility. Weight1. |
| R08 Smoking Policy | הרגלי עישון / Smoking habits | `smoking`: none/outdoors_only/indoors (לא מעשנ/ת/רק מחוץ לדירה/גם בתוך הדירה). Weight1. No substance inference from source 420 wording. Private strict_non_smoking accepts known none only; unknown labeled not provided. |
| R09 Kitchen & Dietary | כללי מטבח ושיתוף קניות / Kitchen and groceries | `kitchen_rules`: no_special_rule/kosher/other (ללא כלל מיוחד/כשר/אחר); other text max160. Independent `grocery_sharing`: separate/some_shared/shared (בנפרד/חלק משותף/קניות משותפות). Weight1 for combined category, not two. other kitchen rule unknown until discussed. |
| R10 Cooking Dynamics | הרגלי בישול / Cooking habits | `cooking_habits[]`: meal_prep/takeaway/shared_meals/individual_cooking (בישול מראש/הזמנות אוכל/ארוחות משותפות/בישול אישי). Weight1 once. |
| R11 Pet Ownership | חיות שמגיעות איתי / Pets I bring | `pets[]`: dog/cat/other (כלב/חתול/אחר), answered empty means no pets. Optional other text max80. Private accepted_pet_types, pet_preference_answered, strict_no_pets. No allergy medical record. Weight1. |
| R12 Weekend Routine | נוכחות בסוף השבוע / Weekends at home | `weekend_presence`: home/away/varies (לרוב בבית/לרוב מחוץ לבית/משתנה). varies not scored. Weight1. |
| R13 Relationship Status | אורחי לילה / Overnight guests | Optional `overnight_guests`: rare/occasional/frequent (לעיתים רחוקות/מדי פעם/לעיתים קרובות). Retains source intent without collecting marital/relationship identity. No score. |
| R14 Study Habits | לימודים ועבודה מהבית / Study and work | `study_work_location`: outside/private_room/shared_space/varies (מחוץ לבית/בחדר/במרחב המשותף/משתנה). Optional, no score. |
| R15 Financial Splitting | חלוקת הוצאות משותפות / Shared expenses | `expense_style`: equal/usage/discuss (חלוקה שווה/לפי שימוש/מסכמים יחד). discuss unknown for score. Weight1. No income inference. |
| R16 Reserve Duty | היעדרויות ממושכות / Extended absences | Optional `extended_absences`: occasional/frequent/not_expected/undisclosed (מדי פעם/לעיתים קרובות/לא צפוי/מעדיפ/ה לא לציין). No military unit/role/dates and no score. Source heading retained, no mandatory military-status question. |
| A01 Proximity to BGU | אזור וקרבה לקמפוס / Area and campus proximity | Safe area label/city; no fabricated walking minutes. Optional public campus distance band not enabled until fixed campus reference/privacy probe review; no mandatory new distance endpoint. |
| A02 Air Conditioning | מיזוג אוויר / Air conditioning | `ac_coverage`: every_bedroom/some_bedrooms/shared_only/none/unknown (כל חדר שינה/חלק מהחדרים/רק המרחב המשותף/אין/לא נמסר). |
| A03 Security & Safety | מרחב מוגן ואמצעים בדירה / Protected space and fixtures | `protected_space`: in_unit/in_building/nearby/none_known/unknown (בדירה/בבניין/בסביבה/לא ידוע על מרחב/לא נמסר); separate window_bars yes/no/unknown (יש/אין/לא נמסר). No legal safety certification implied. |
| A04 Water Heating | חימום מים / Water heating | `water_heating[]`: solar/electric/gas/other (שמש/חשמל/גז/אחר). Missing unknown, answered empty none. |
| A05 Furnishing & Appliances | ריהוט ומכשירים / Furnishing and appliances | furnishing full/partial/none/unknown (מלא/חלקי/ללא/לא נמסר); appliances[] fridge/oven/stove/washer/dryer/dishwasher (מקרר/תנור/כיריים/מכונת כביסה/מייבש/מדיח). |
| A06 Hand-Me-Downs | ציוד מהדייר היוצא / Items from outgoing resident | Retained inventory ID, capability deferred by D15; no seller/items CRUD or marketplace CTA in MVP. Do not reintroduce it as a required field. |
| A07 Outdoor Space | שטח חוץ / Outdoor space | outdoor_spaces[] balcony/private_yard/shared_yard/shared_roof (מרפסת/חצר פרטית/חצר משותפת/גג משותף). Answered empty none. |
| A08 Laundry Setup | כביסה / Laundry | laundry[] washer/dryer/washer_connection (מכונה/מייבש/חיבור למכונה); nearby_laundromat yes/no/unknown. Washer/dryer references same underlying appliance facts A05, not duplicate conflicting booleans. |
| A09 Accessibility | גישה לדירה / Access to apartment | floor integer -5..100; elevator and step_free_entry yes/no/unknown; notes max500. Never infer wheelchair accessibility merely from elevator/floor. |
| A10 Parking | חניה / Parking | parking[] reserved/free_street/paid_street/paid_lot (פרטית שמורה/רחוב ללא תשלום/רחוב בתשלום/חניון בתשלום). Street availability never guaranteed. |
| A11 Pet Rules | מדיניות חיות בדירה / Apartment pet policy | pet_rule_known boolean; allowed_pets[] dog/cat/other; restrictions max250. Known empty no pets, unknown never assumed allowed. |
| A12 Kitchen Setup | אבזור מטבח / Kitchen equipment | stove_type gas/induction/electric/none/unknown (גז/אינדוקציה/חשמל/אין/לא נמסר); dishwasher from A05 canonical appliance fact. |
| A13 Hidden Costs | חשבונות ועלויות נוספות / Bills and additional costs | Per electricity/water/arnona/building_fee/internet: included/separate/unknown (כלול/בנפרד/לא נמסר), optional nonnegative monthly estimate <=100000 ILS. bills_included true iff all supported charges known included; mixed clearly Some included / חלק כלולים. |
| A14 Internet Infrastructure | תשתית אינטרנט / Internet infrastructure | internet_type fiber/cable_dsl/mobile/none/unknown (סיבים/כבלים או DSL/סלולרי/אין/לא נמסר); optional advertised_mbps 1..10000; no speed guarantee or inference service cost included. |
| A15 Roommate Cap | מספר דיירים מרבי / Maximum occupants | max_occupants integer1..30; independent from bedrooms/current residents/available rooms and group capacity E2. Owner-provided claim, no legal occupancy certification. |

## Adopted exact comparison rules

For ordinary single fact f: directional fit1 if in preferred set; 0.5 if accepted but not preferred; 0 if outside stated accepted set. If preferred empty and accepted supplied, accepted matches1. Unset preference or missing/explicit flexible/varies/discuss/other fact means unknown. Do not infer acceptance from own lifestyle. Ordinal closeness examples in historical MATCHING are withdrawn: enum order is not a scoring algorithm.

For set facts (music/cooking): candidate must have answered nonempty set. Directional fit is minimum fit of its stated values; preferred-all1, accepted alternative lowers to0.5, disallowed value0. No duplicated category weight from multiple selected values. Explicit unanswered set unknown; no applicable cooking routine may be left unset rather than fabricated as shared-meal compatibility.

Kitchen category computes directional fit for both kitchen_rules and grocery_sharing; if either lacks meaningful input, category unknown. Otherwise minimum of the two. Weight counted once. Pets: if preference unstated -> unknown; candidate explicitly has none ->1; all known animal types accepted ->1; any explicitly disallowed ->0; other animal ->unknown and discussion notice. strict_no_pets excludes known nonempty pet set only, unknown remains visible with notice. strict_non_smoking excludes known outdoors/indoors, unknown remains visible with notice. No hidden inference of smoking substances.

Mutual category fit is minimum of both known directions; if either direction unknown, factor unknown. Weights R02/R03/R04=2, R05/R06/R07/R08/R09/R10/R11/R12/R15=1, others0. Score round(100*weighted_sum/comparable_weight). Return score nullable, scoring_version, comparable_category_count, comparable_weight, possible_weight15. Display percentage only category_count>=3 AND weight>=6. No probability-of-success claim. Group score minimum member-pair score only if every active member pair reaches threshold; otherwise incomplete. Private search suitability separate, no public group budget derived.

Examples: only cleanliness/sleep/guests all compatible ->100 at weight6 and3 factors, clearly 3/12 compared; cleanliness1*2+sleep0.5*2+guests0*2+noise1=4/7 ->57 with4 compared; one matching pet ->no percentage; missing opposite preference excludes the category. A no-pets user versus known dog owner produces pets0; high other score cannot erase difference notice. No gender/overnight/absence score.

## Implementation/review boundary

C2 adopted this baseline. Collect housing-relevant behavior only; no new marital/military/gender identity intake. Field split does not authorize new sensitive-data collection. Reuse canonical existing appliance/bills facts through adapters, not duplicate columns per heading. The locale dictionaries/validators have been generated into the linked typed manifest; preserve their parity with this approved table, without new options/weights invented by an executor. The option/unknown/original31 tests are implemented and must continue passing. Final visual styling is separate from this typed questionnaire; no design rewrite is necessary to implement unread/intake packets.
