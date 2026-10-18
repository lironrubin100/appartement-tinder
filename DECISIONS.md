# Decision Register

This file is the **ABSOLUTE SINGLE SOURCE OF TRUTH**. If `PRD.md`, `ARCHITECTURE.md`, `CLAUDE.md`, or the code disagree with this file, this file wins.

## How to use it

1. **Work top-down.** Sections are ordered so that earlier decisions unblock later ones.
2. **Check `Blocks`.** A decision with a long `Blocks` list is expensive to change later — decide those carefully and early.
3. **Nothing gets built from an `OPEN` row.** If code needs an answer that isn't here, stop and add the row.
4. **Recommendations are defaults, not verdicts.** They exist so you can say "yes" and move on when you have no strong opinion.

## Status legend

17 October checkpoint: owner explicitly delegated the explained technical and moderation recommendations and approved apartment-bound poster invitations requiring recipient acceptance. Decisions below distinguish that approval from live provider/legal evidence. Historical answers remain in docs/MVP_DECISION_ANSWERS.md; current execution order in docs/WORK_PLAN.md. Delegated technical choices are recorded as architect choices, not verbatim owner field-by-field answers.

| Status | Meaning |
|---|---|
| `DECIDED` | Answered. The answer is in the Decision column. |
| `OPEN` | Needs your call. Recommendation is a proposal only. |
| `RESEARCH` | Needs information neither of us has yet — usually external (legal, pricing, a platform's rules). |

---

## A. Product definition & scope

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| A1 | One sentence: what is this product? | DECIDED | An all-in-one platform for Beer Sheva students to find both an apartment and the people to share it with, operating as a closed ecosystem. Web-first platform. | everything |
| A2 | What is it explicitly **not**? | DECIDED | Initial MVP is apartment/room and roommate discovery, native communication and group coordination. No general resale, payments/lease execution, agency operation or national marketing launch in MVP. Other-city valid inventory remains allowed A5. Legal classification is M6 research, not asserted by product naming. | A1, M6 |
| A3 | The single job-to-be-done in the primary journey | DECIDED | Help a person find a suitable apartment/room and co-residents in one native hub, then reach a useful in-app conversation/viewing arrangement. Signing a lease is an optional declared outcome, not a transaction the MVP must execute. Confirmed by owner scope and Q35, 2026-10-16. | C, D, E |
| A4 | Which tab does the app open on? | DECIDED | Residents default to Discover. They can change their startup preference to Discover or Map in Settings (I22). Lister-mode accounts open on My Listings (D16), which remains their startup destination. | I4, I20, I22, D16 |
| A5 | Geographic scope and how the boundary is enforced | DECIDED | Beer Sheva is the initial recruiting, marketing and default-search focus, not a publication boundary. Do not reject an otherwise valid listing because it is in another Israeli city (the owner explicitly gave Tel Aviv as an example). Search/autocomplete may prioritize Beer Sheva and offer other cities. Supersedes the previous OPEN bounding-box recommendation. Confirmed directly by owner 2026-10-15. | D4, J6 |
| A6 | Students only, or anyone? | DECIDED | Any adult may use the product, not students only. Eligible students may verify their email and choose to show the badge. Owner Q2, 2026-10-16. | B3, M5 |
| A7 | Languages | DECIDED | Superseded by I16: Hebrew **and** English, both from v1. | I2, I16, all copy |
| A8 | Off-season behaviour (Nov–Feb the market is dead) | DECIDED | Same product/navigation through off-season; sublet flag/filter remains available. No separate seasonal interface or automatic shutdown. Pilot cohorts/measurement show seasonality rather than inventing demand. | D8 |
| A9 | Success metric for launch | DECIDED | Initial measurement: profile completion, confirmed available supply and owner response, inquiry/introduction response, time to reply, two-way conversations, return among people still searching and declared outcomes. Distinguish QA/demo/assisted supply/real users. Owner accepts this baseline and wants to expand measurement for specific learning goals; this does not authorize unrestricted content or personal-data collection. Q31, 2026-10-16. | L3, J13 |
| A10 | Initial delivery target | DECIDED | A genuinely usable web prototype for a controlled pilot and presentation to potential university/early-stage funders, before public launch. Demonstrate apartment/room and roommate discovery as one hub. Broad public launch, native apps and paid Pro are not prototype completion requirements. Preserve existing decided product capabilities; individual release allocation remains in the reviewed pilot scope. Do not describe any feature list as a guarantee of investment. Confirmed directly by owner 2026-10-15. | A1, C1, K1, G6, L3 |
| A11 | Pilot enrollment access | DECIDED | Ordinary signup through normal app link with limited Beer Sheva recruitment/marketing, explicitly chosen by owner in this conversation. No invite-code system or approval allowlist required for MVP. Do not call nonpublic marketing an access restriction. Operational suspension/safety controls remain server-enforced. | SL16 |

---

## B. Identity, auth & trust

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| B1 | Auth providers | DECIDED | Google; Apple signup is deferred by user instruction on 2026-10-15 and is not an MVP acceptance gate. Existing email/password access remains available for current MVP testing. | I9, K1 |
| B2 | Is a phone number collected? Required? | DECIDED | One private account phone, optional for residents and required for non-resident property posters; no SMS verification in the MVP. Never public or separately recollected per listing. Inquiries stay in-app. Owner Q6, 2026-10-16; supersedes earlier all-accounts-optional wording. | B8, H6, D2, B9 |
| B3 | What earns the blue check | DECIDED | Student badge verifies control of an approved BGU/Sami Shamoon student email by one-time code. Real email verification is included in the initial MVP (Q5, 2026-10-16); no simulated badge. Badge public visibility remains opt-in B9. No ID/selfie or claim of property ownership/background safety. Domain/sender proof remains an implementation verification gate. | B4, A6, D10 |
| B4 | Verification: automated or manual by you | DECIDED | Automated via email domain, for v1. Manual ID/selfie review is not built until H3 (who reviews, how fast) has a real answer — don't ship the upload screen without the review process behind it. | B3 |
| B5 | Minimum age and how it's enforced | DECIDED | 18+ self-declaration with server validation during onboarding; no document age check in the MVP. Owner Q6, 2026-10-16. | M4, H5 |
| B6 | Real-name policy | DECIDED | Display first name and last initial; full name private. Birth date and contact data never public. Owner Q6, 2026-10-16. | I9 |
| B7 | Account deletion and data retention | DECIDED | Immediately hide/deactivate the account and stop access/notifications on deletion request; allow a 30-day cancellation grace before purging private profile/contact data and owned photos. Shared conversation history may remain for other participants under a removed identity, not by cascading away their conversation. Report/audit retention requires a separately documented purpose/duration and appropriate review. Owner Q30, 2026-10-16. This is product policy, not a claim legal retention questions M1/M2 are answered. | J1, M2 |
| B8 | Duplicate accounts and ban evasion | DECIDED | MVP accepts residual duplicate-account risk without mandatory SMS or fingerprinting. Server suspension, per-account limits and manual report investigation apply; do not silently collect device fingerprints or add paid verification. | B2, H6 |
| B9 | What is public on a profile vs private | DECIDED | Public profile: name, photo, age (never date of birth), lifestyle tags, and bio. Badges are opt-in and user-controlled: show only badges the user selects, including the student-verification badge; none are public by default. Private: budget, exact move-in date, phone, and email (including student email). If availability is ever shown publicly, use a coarse range only with the user's choice. | C4, I9, B2 |
| B10 | **Non-resident intake (new — not previously in register)** | DECIDED | Nonresident property poster uses the same account, with short intake: valid name, 18+ confirmation, private phone and optional agency; no lifestyle questionnaire. Can publish/manage own listings and browse authenticated safe people/group feeds. Can initiate an apartment-bound invitation under F4, with recipient acceptance before chat. A completed resident may explicitly convert to this account-only poster capability from Settings after informed confirmation and supplying a private phone; the safe resident profile is hidden and new resident introductions/passes stop. Private profile data and existing direct-chat history remain; conversion is refused while the account belongs to an active group, so group lifecycle is resolved first. Return from lister to resident is not implied or implemented by this decision. | D1, I9, E3 |

---

## C. Roommate discovery & matching

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| C1 | **Shape of the four friction axes** — free tags, forced choice, or weighted score | DECIDED | Structured categorical columns, not a free `text[]`. **Scope, confirmed 2026-08-20:** the full **31-category taxonomy** (16 renter + 15 apartment) is the real v1 scope, not a trimmed set — go with what's designed. **Live code still contradicts the "structured" part** (`vibe_tags` is a free `text[]`) — see contradictions table. | C2, C3, C4, J1, J2, C13 |
| C2 | The final vibe tag list (exact Hebrew copy, per structured axis) | DECIDED | Owner adopted docs/specs/TAXONOMY.md as the MVP questionnaire baseline in this conversation, with later wording/visual refinement allowed. Preserve all 31 source headings in inventory, normalize facts vs private preferences and progressive completion; collect housing-relevant behavior, not marital/military identity. No gender/relationship/military matching score or gender filter. I9 minimum unchanged. C13 weights/coverage and exact comparison rules remain stable; wording improvements may not silently change validation, disclosure, requiredness or scoring. Generate one typed field/locale manifest from approved table before implementation, reusing existing canonical facts. | I9, C1, C3 |
| C3 | Feed ordering algorithm | DECIDED | Provisional MVP baseline: deterministic lifestyle-compatibility ranking, then recent activity and stable tie-break; no ML. Use versioned scoring and meaningful coverage, not guessed scores for missing data. Owner accepts architect's proposal provisionally in Q12/Q13, 2026-10-16, with scoring scheduled toward the end of MVP delivery. | C1, J2, C13 |
| C4 | Filters the user controls | DECIDED | MVP apartment search uses D13 plus chosen area/city and private budget/date preferences. People discovery has flexible C13 compatibility, optionally free strict no-smoking/no-pets constraints; no gender filter in MVP C5. Do not publish budget/date or add a general people budget probe. Advanced paid controls remain later. | C5, B9 |
| C5 | **Gender filtering — in or out** | DECIDED | No new gender/composition hard-filter feature in the initial pilot. Keep the future question recorded and research M5 before promotion; do not infer approved identity/filter semantics from old composition examples. Owner Q11, 2026-10-16. | C4, C13, J2, M5 |
| C6 | Introduction message length | DECIDED | No minimum character count. A trait introduction can be sent without added text. Confirmed 2026-10-15. | C9 |
| C7 | Daily introduction allowance | DECIDED | Twenty sent invitations per account per Asia/Jerusalem calendar day across individuals, groups and apartment-bound poster outreach, including later-accepted invitations. Atomic consumption on first successful send; idempotent retries do not consume again. No separate landlord quota bypass. Existing recipient-initiated apartment inquiries are a separate F4 action with duplicate/rate controls. | C6, E9 |
| C8 | Pass behavior | DECIDED | Pass hides that individual or group from the sender for thirty days and persists across sessions. Confirmed 2026-10-15. | C12 |
| C9 | **Mutual match, or accept-a-like?** | DECIDED | Accept-a-like. User A sends a like + message attached to a profile trait. User B must accept it to start a chat. | F1, F4 |
| C10 | Auto-pause: rules and how a user comes back | DECIDED | Do not automatically hide inactive user profiles in the MVP. Supersedes the old OPEN 14-day auto-pause recommendation. Owner Q24, 2026-10-16. | J2, L5 |
| C11 | Can you see who liked you without Pro? | DECIDED | Incoming introductions remain visible/actionable in the free initial MVP; no Pro gate is implemented while Pro is excluded by G6. Any future paid entitlement requires its own approved policy. | G2, G4 |
| C12 | Return of passed results | DECIDED | Passed individuals and groups become eligible again after thirty days. Confirmed 2026-10-15. | C8 |
| C13 | **Compatibility scoring mechanic** | DECIDED | Provisional MVP scoring baseline accepted in owner Q10/Q12/Q13, 2026-10-16: flexible explained lifestyle ranking, with optional free mandatory no-smoking/no-pets preferences; payment must never bypass blocking/privacy. Cleanliness/sleep/guests weight 2; other approved scored lifestyle categories weight 1; unknown excluded; percentage only with at least 3 comparable categories and weight 6. Mutual category fit uses the lower directional satisfaction; group aggregate uses lowest sufficiently supported member score, otherwise incomplete. Private budget/apartment suitability is separate from public lifestyle percentage. Normalized fields/matrices/labels still require completion under C2. Advanced strict preferences are a future business hypothesis, no paid Pro in MVP. Supersedes old universal exact-match hard-gate wording. | C1, C2, C3, J1 |

---

## D. Apartments & listings

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| D0 | Where listings come from | DECIDED | Pure native UGC. Everything happens in-app. No external links, scraping, or linking out. | D1, M1, M6 |
| D1 | **Who can post** | DECIDED | Refined by the design handoff: **residency, not persona, decides whether a profile is required.** Anyone who will live in the apartment must complete a profile before posting or matching. Anyone posting on behalf of a property they won't live in (Lister/landlord/agent) posts with an account only — see B10. First-run onboarding is a residency/capability fork; an already completed resident can later make the explicit B10 Settings conversion, never a silent mode switch. | D10, J1, B10, I9 |
| D2 | Required fields on a listing | DECIDED | One apartment with title, total bedrooms, location, bills-included status, available-from date and 3–8 photos; one or more available rooms each has monthly price. Account phone follows B2: optional resident, required non-resident poster; no extra per-listing phone collection. Phone private, enquiries in-app. Clarified after owner Q6 2026-10-16. | B2, B9, D3, D5, D9, I9 |
| D3 | Photos: minimum, maximum, required? | DECIDED | **3 required, 8 max.** Typical apartment listing should realistically carry 6-7 photos; 8 comfortably covers that. The design's composer currently only visually has room for a few thumbnails — needs adjusting to not feel cramped at 6-7. | J9, K3, D2 |
| D4 | **Address precision — exact pin or approximate?** | DECIDED | Public listing/map uses stable approximate location at the approved 500m scale, never exact address/coordinates. Owner acceptance of an in-app inquiry grants private location access. The grant remains after the room becomes unavailable; blocking/account deletion/security authorization changes stop future reads. No ordinary owner-discretionary revoke-address control in MVP (Q23, 2026-10-16). Different property means new listing; minor correction route specified separately. Previously seen information cannot be recalled. The public transform must not be straightforwardly reconstructible from public ID/algorithm. | A5, H7, J6 |
| D5 | Price semantics: per room or whole apartment? Bills included? | DECIDED | Price is set **per available room** in MVP. `bills_included` is an apartment-level yes/no tag. A public apartment card shows its available room count and a single price or price range; rooms are never separate listings. | D9, D13, C4 |
| D6 | Listing lifecycle: expiry and renewal | DECIDED | Automatically hide an expired listing after 45 days; owner can explicitly renew it. Owner Q22, 2026-10-16, accepts automatic hiding; group creation or uncertain negotiations are not expiry/occupancy events. | D7, L5 |
| D7 | Report-as-taken: threshold and consequence | DECIDED | Three distinct taken-reports hide the apartment, notify its owner and allow explicit owner renewal. Provide operator review/reversal and controls for repeated false reporting; repeated reports from the same person do not count as distinct and old reports must not instantly re-hide a renewed listing. Owner Q22, 2026-10-16. Exact abuse-window/renewal mechanics must be specified and tested, not left to UI alone. | D6, H3 |
| D8 | Sublet vs long-term: separate types or a flag? | DECIDED | Sublet is a listing flag using the same apartment/room model and search, with clear term dates when supplied; not a separate listing entity. | A8, D13 |
| D9 | **"Whole apartment" vs "room in an apartment" — same entity?** | DECIDED | An apartment is the only public listing entity and owns zero or more available-room records. A room has a price and availability, but never appears independently in Discover or Map. An apartment may have only one rentable room because its other rooms are already occupied. | D5, D12, E5, J1 |
| D10 | Moderation: pre-approval or post-hoc? | DECIDED | Immediate publication after validation, with post-publication reporting and owner-operated protected manual review. No universal preapproval. Three distinct taken reports follow D7; scams/harassment/photo reports enter H2 review without automatic three-report sanctions. Owner adopted moderation recommendations in this conversation. | D1, H3 |
| D11 | Duplicate listing detection | DECIDED | No automated cross-poster duplicate-property detector in MVP. Prevent duplicate writes with request-key uniqueness and provide inaccurate/scam report review; do not merge different owners' listings automatically. | D7 |
| D12 | Can a listing be attached to a group (room-fillers)? | DECIDED | A resident Room-Filler posts their existing apartment and adds only the room or rooms currently available. Group attachment is deferred with group work; the apartment and available-room records work for an individual resident now. | E5, D9, B10 |
| D13 | Filter set on the map | DECIDED | Price range (per available room), total bedrooms, bills included, sublet, and available-from. | D5, D8, J2 |
| D14 | Map clustering and zoom behaviour | DECIDED | Explicit Search this area after map pan; filters/search action query bounded public viewport. Cluster tap fits child bounds; max-zoom overlapping pins expose accessible spiderfy or equivalent listing chooser. Pin/list selected ID synchronized; filter-ineligible selection clears visibly. Preserve current styling and test all child listings reachable. | J6, I4, D17 |
| D15 | **Hand-Me-Down Market (new — not previously in PRD/register)** | DECIDED | Apartment-attached furniture selling is post-MVP, confirmed owner Q4 2026-10-16. Preserve the future idea: leaving roommate offers items attached to the apartment with in-app seller contact. General resale marketplace is also later and separately scoped. Supersedes old initial-release placement, not the future vision. | D2, D6, PRD §3 |
| D16 | **Lister dashboard (new — not previously in register)** | DECIDED | My Listings remains the nonresident lister startup dashboard with own listings/status/current unique saver count. Listers may also browse Map and the authenticated safe Individuals/Groups feeds without completing a roommate lifestyle profile. Owner explicitly approved proactive outreach: invitation must identify the poster and one owned active apartment; recipient acceptance opens the chat. No private saver identities or arbitrary unsolicited chat access. See F4/B10/I19. | D1, I4 |
| D17 | **Map pin cluster — visual only (new)** | DECIDED | A numbered dark-circle pin shown when overlapping pins collapse at low zoom. The *interaction* (tap-to-zoom behaviour) is not specified — see D14. | D14 |
| D18 | Group, inquiry and occupancy are independent | DECIDED | Group creation/join and accepted inquiry do not imply signed lease or occupied room. Room availability, willingness to receive inquiries and group visibility are separate controls. Owner may continue receiving requests during uncertain negotiations. No new requests when inventory/intake unavailable; pending requests remain visibly unavailable and need requester reconfirmation on reopening; accepted conversations remain. Owner Q21, 2026-10-16. | D6, D9, E3, F4 |
| D19 | Address not found in autocomplete | DECIDED | Provide manual address entry and map-point correction as a fallback when autocomplete cannot resolve the address. The server must validate the saved location, and public/private location boundaries remain D4. Do not apply the superseded Beer Sheva-only publication rejection (A5). Provider/language quality still needs validation. Owner accepted this recommendation 2026-10-15. | A5, D2, D4 |

---

## E. Groups

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| E1 | Group creation | DECIDED | Residents form groups from existing accepted individual conversations; explicit invite acceptance, creator/admin and initial four-member cap. A resident may belong to multiple groups without losing personal profile/conversations or becoming committed to a property. Owner Q15, 2026-10-16. | E2, E3, E9 |
| E2 | Group size | DECIDED | Up to four members for the initial testable MVP. Keep the limit centralized so it can be revised. Confirmed 2026-10-15. | E1, E3 |
| E3 | Group management and admission | DECIDED | Admin manages membership. Admission configurable as admin/any-member/strict majority; invited/applicant consent and new-message-only access on joining remain. Ordinary admin departure requires accepted ownership transfer to an existing member. Account deletion is not hostage to transfer: if no transfer completes, archive/hide the group. Owner Q16, 2026-10-16; supersedes earlier deferred-admin-exit wording. | E1, E2, E9, F1 |
| E4 | What `open` / `closed` actually mean | DECIDED | Hide a group from Discover independently from its active chat; admin can undo hiding. No inferred listing occupancy. Owner Q18, 2026-10-16. | E5 |
| E5 | Are groups discoverable in Discover? | DECIDED | Yes. Discover has Individuals and Groups tabs, freely switchable without changing an account mode. Group cards derive from member profiles (E6). Membership, admission and history rules must be resolved separately before implementation. Confirmed by user 2026-10-15. | E1, E2, E3, E6, E9, I19 |
| E6 | Does a group have its own bio/photo, or is it derived from members? | DECIDED | Group card derived from member profiles, no independent group bio. Show group identity/member count/public lifestyle traits; member avatar may expose that member's safe public details, and like/pass targets the group. Do not publish numerical budget derived from private member budgets. Optional explicit group-owned search budget is private to members. Owner Q14, 2026-10-16; replaces public shared-budget wording. Scoring follows provisional C13. | E5, I9 |
| E7 | Shared wishlist mechanics | DECIDED | No separate shared group-wishlist entity/UI in MVP. Share an apartment card into the group chat (E8); each member can privately save/unsave it themselves. Each actual personal save contributes at most one current interest under G1; sending a card or another member's save does not create saves for others. Direct owner clarification 2026-10-16. | E8, J1 |
| E8 | Sharing a listing into a group chat | DECIDED | Share an apartment card into an accepted personal or group chat; native public listing reference only, no exact address/private data. Include in MVP, owner Q18, 2026-10-16. Shared wishlist E7 remains separately unresolved. | F3, E7 |
| E9 | Individual to group interactions | DECIDED | Individuals can send introductions to discoverable groups. Admission follows the group setting (E3); acceptance joins the group conversation with new-message-only access. Group-to-group matching is deferred. | E3, E5, C9 |
| E10 | Terminal state: what happens when a group signs a lease? | DECIDED | Found-a-place is optional self-reported outcome; do not automatically archive group/chat or mark a listing rented. Group Discover visibility controlled separately E4. Owner Q18, 2026-10-16. | A9, L7 |

---

## F. Messaging

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| F1 | Realtime or polling | DECIDED | Supabase Realtime for authenticated private chat/inbox signals and ephemeral typing, with persisted database history, deduplication and reconnect catch-up. No subscription per historical chat; one active thread plus account inbox channel. Channel authorization and revocation tests required. Actual hosted limits remain J8/K3 research. | J8, K3 |
| F2 | Read receipts, typing indicators | DECIDED | Read receipts AND typing indicators included in MVP, owner explicitly requests WhatsApp-like typing in Q25/Q26, 2026-10-16. Typing ephemeral, authorized-conversation only, expires on idle/disconnect; never a durable message or unread increment. Individual/group presentation and event limits must respect the same membership/history/block boundary. | J8 |
| F3 | Message types | DECIDED | MVP message types: text plus safe apartment-card references in individual/group chats. Images, edit-message and delete-for-everyone are outside this initial scope. Owner Q18/Q25, 2026-10-16. | E8, J9, H4 |
| F4 | Can you message a lister without matching? | DECIDED | Authenticated renter may inquire about an apartment without roommate match; owner accepts before chat/address grant. Owner also explicitly approves reverse outreach: B10-complete poster sends an invitation identifying the poster and one owned active apartment; recipient may accept/decline, and only acceptance opens one apartment-context conversation. Receiving an invitation never grants the recipient's contact/private search preferences to poster. Reverse acceptance grants recipient access to the referenced apartment address under D4, not any profile private fields. Pending invitation has no messages beyond initial optional introduction. One pending sender/recipient; once accepted use existing apartment-context conversation; room reference is not a reservation or a second chat. | C9, C6 |
| F5 | Unmatch / leave conversation | DECIDED | Leave hides thread for that participant and stops its notifications; other party keeps history. New messages do not automatically restore a left thread; leaver explicitly reopens. Leave is not block or deletion-for-everyone. Owner Q25, 2026-10-16. | H1 |
| F6 | Message retention | DECIDED | Shared conversation history may be retained for remaining participants under removed identity after deletion, following B7; no blanket cascade deleting the other person's conversation. Final retention duration/redaction must pass M1/M2 review. Owner Q30, 2026-10-16. | B7, M2 |
| F7 | Push notification triggers and copy | DECIDED | MVP action notifications: messages, listing inquiries, invitations/admission requests needing response; master plus event/channel controls; push device permission explicit. Suppress redundant message email while recipient reads the thread; no private message/address payload. Owner Q27, 2026-10-16. Relevant-new-listing saved-search alerts are later, not MVP requirement (Q28). Channel feasibility/capacity still verified, not assumed. | L5, K2 |
| F8 | Message rate limits | DECIDED | Server-authoritative message throttle: 30 message sends per account per rolling minute, burst 5 per 5 seconds; conversation authorization and anti-spam rejection before insertion. New person invitations share C7 20/day, including apartment-bound lister invitations, with one pending invitation per sender/recipient. Return retry_after without losing draft. No distinct-user limit that prevents replying in existing chats. | C7, H6 |

---

## G. Social proof & monetization

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| G1 | Who is counted in the hype counter? | DECIDED | Private save is the interest signal for the MVP: aggregate counter counts unique current savers, with no separate interested button or automatic inquiry/owner outreach. Removing one's save removes that current interest; retries/duplicates do not inflate it. Saver identity stays withheld from public/ordinary unauthorized reads. Owner Q20, 2026-10-16; supersedes inquiry-count-only proposal. | G2, J4 |
| G2 | What exactly does Pro unblur? | DECIDED | Post-MVP Pro identity visibility is a business hypothesis, not an MVP entitlement. G1 private personal saver identities remain withheld from listing owners; neither invitation outreach nor payment in this MVP reveals them. Free inbound introductions show the sender identity needed to accept/decline under C11. Any later unblur feature requires its own canonical privacy approval before implementation, superseding the old unconditional design-export rule. | G4, J7 |
| G3 | Pro price and billing rails | RESEARCH | Web = Stripe (no platform cut). Native iOS = in-app purchase, 15–30% to Apple, Stripe not permitted for digital goods. **Note:** the design's Unblur paywall shows "₪9.90/mo" — treat this as an illustrative placeholder only, not an answer to this row. Don't let it silently become the decided price. | K6, M1 |
| G4 | Other Pro features besides unblur | OPEN | Future business hypotheses include additional strict preferences for resident Pro, advanced saved-search/area alerts, and professional-lister tools. Owner Q10/Q28 2026-10-16 explicitly wants these documented as possible paid value. No chosen price/period/entitlement or permission to build paywalls now (G6). | C7, C11 |
| G5 | Free tier limits | DECIDED | Initial MVP free introduction quota remains C7 twenty sent introductions per account per day; other limits require their own approved purpose. No new Pro entitlement or free-tier reduction implied by future monetization notes. | C7, G4 |
| G6 | When Pro ships | DECIDED | Paid Pro is outside the initial usable prototype/pilot. Document resident advanced-preference and professional-lister ideas as business hypotheses; price, billing period, permissions and introduction timing are not yet approved. Do not implement paywalls/billing as a prototype requirement. Supersedes the earlier OPEN hype-count release suggestion. Confirmed directly by owner 2026-10-15. | G1, G3, G4, A10 |

---

## H. Safety & moderation

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| H1 | Blocking | DECIDED | Symmetric block for discovery/messaging; groups cannot bypass. For an existing shared group, both blocked parties lose read/send access to that shared conversation while the block exists; unrelated members continue. No automatic expulsion. Explain consequences in UI and provide constrained group-management path. Unblock restores ordinary membership/history permissions. Owner Q17, 2026-10-16. Inquiry acceptance still requires active listing and unblocked pair. | D4, F4, E3 |
| H2 | Report categories and what each triggers | DECIDED | Authenticated reports use listing_unavailable, suspected_scam, inaccurate_listing, harassment, inappropriate_content, underage, other. One protected reviewer queue; optional short explanation, subject ID and minimal relevant evidence. Reporter identities/evidence are private. Only listing_unavailable counts toward D7 distinct-report automatic hiding; other categories require reviewer action. Report receipt confirms submission without a response-time promise. | H3 |
| H3 | Who reviews reports, and how fast | DECIDED | Owner-operated manual review for the pilot, with a small protected queue supporting inspection, hiding content, suspending accounts and recording reviewer actions. Owner accepted this direction 2026-10-15. A daily response SLA, exact report categories (H2), sanction durations and appeal rules have not been confirmed; do not promise a response time from the old recommendation. | H2, D10, H6 |
| H4 | Automated checks on photos and text | DECIDED | No automated AI text/photo moderation in MVP. Enforce file/type/size/ownership and structured validation, plus manual report review. A future moderation system is a separate slice; upload validation is not a claim to detect abusive content. | F3, D3 |
| H5 | Minors | DECIDED | 18+ gate follows B5/M4. Underage report enters private review; operator may suspend while checking. Confirmed ineligible account follows B7 deletion/access rules rather than uncontrolled cascade deletion. Do not collect identity documents in MVP. | B5, M4 |
| H6 | Harassment escalation and bans | DECIDED | Authorized operator may hide a listing, suspend an account or reverse a sanction with reason and audit. Suspension is enforced by server authorization across writes, discovery, private reads and Realtime renewal; account-owned metadata cannot grant reviewer rights. No automatic permanent ban from report count alone. Manual review/unrestriction path handles false reports; no promised SLA. | B8, F8 |
| H7 | In-person meeting safety guidance | DECIDED | Show concise first-contact safety guidance once, with accessible later help: verify property/identity independently, inspect before paying, avoid advance transfers to unverified parties. It never blocks urgent reporting or claims verification guarantees. No forced interstitial on every message. | D4 |

---

## I. Design system & UX

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| I1 | Product name | DECIDED | **Shutaf** — the Hebrew word שותף ("roommate/partner") written in Latin letters. | I14, I15 |
| I2 | Hebrew/RTL typography — typeface and numerals | DECIDED | **Rubik**, per the Claude Design export (`export/…Foundations & Components.html`). Scale: Display 800/48, H1 700/24, Body 400/16, Caption 500/13. Already correctly wired in `web/src/app/layout.tsx`. | I1, A7, I16 |
| I3 | Component library | DECIDED | Keep existing React/Next.js/Tailwind components and shared tokens. No mandatory component-library migration or wholesale redesign. Add accessible primitives only when needed by a concrete slice, preserving Hebrew RTL/English LTR and current visual identity. | K1, A7 |
| I4 | Navigation: buttons, order, platform shape | DECIDED | Five buttons: Profile, Discover, Map, Plus, Chats. Four are destinations; **Plus opens the listing composer as an overlay over the current screen** — it does not navigate away. Mobile renders the bar fixed at the bottom; desktop is free to drop the bar and place the same five elsewhere. Residents default to Discover and can choose Discover or Map as their startup tab in Settings; Listers open on My Listings (A4/D16). In RTL the list runs right-to-left, so Profile sits at the right edge. | A4, I20, I22, D14 |
| I5 | How the thumb-zone rule is enforced | DECIDED | Phone layouts keep primary actions reachable above safe-area/bottom navigation and keyboard, without obscuring fields/cards/map controls. Reuse shared action placement and verify 390px and desktop per affected journey. | I3 |
| I6 | How "one primary action per screen" is enforced | DECIDED | One visually dominant action per screen/dialog state, with secondary actions clearly subordinate. Composer overlay owns its submit action; review/error/retry states have explicit actions. Enforce through component review and visible acceptance, not a brittle literal count. | I3 |
| I7 | Empty state for every screen | DECIDED | Each slice must specify and verify initial loading, empty data, filtered-empty, permission/unavailable, recoverable error, retry and success states where applicable. Keep draft on provider/network failure; empty results are not an error. Screen inventory and expected copy belong to that slice packet. | I9, L3 |
| I8 | Loading and error states | DECIDED | Skeletons (not spinners) for loading; toast/snackbar for transient feedback; explicit retry affordance on hard errors (e.g. map failing to load). Confirmed in the Claude Design export. | I3 |
| I9 | **Onboarding: exact steps, order, what is mandatory** | DECIDED | Residency/capability fork: anyone living with potential co-residents completes personal profile; non-resident posters complete account-only B10 without lifestyle preferences. Provisional resident minimum accepted Q7 2026-10-16: valid name/age, photo, short bio, cleanliness/sleep/guests/smoking answers; remaining category inputs progressively completable, subject to C2 label/model review. No Solo/Group/Room-Filler picker. Resident startup follows A4/I22; lister My Listings. Settings also exposes the one-way-for-now, confirmed B10 resident→lister conversion with explicit consequence copy and private-phone collection; it must not bypass active-group lifecycle. Owner Q8 requests explanation/verification of current same-form report, not a reversal of B10/D1. | D1, B9, B10, I19, I22, E3 |
| I10 | Accessibility baseline | DECIDED | Keyboard-operable labeled controls, visible focus, semantic error associations, accessible names, contrast target WCAG AA, >=44px primary touch targets, reduced-motion support and correct RTL/LTR reading order. Verify each changed journey; this is an engineering baseline, not a formal certification claim. | I3 |
| I11 | Dark mode | DECIDED | **No, confirmed 2026-08-20.** No dark mode in v1 — it doubles design review for no acquisition benefit. The one dark-mode example in the design (a chat thread) is out of scope; don't build against it. | I1 |
| I12 | Motion and animation language | DECIDED | Use brief opacity/transform feedback only when helpful, respect reduced motion, avoid blocking decorative animation. Preserve working interaction feedback; no new animation framework for MVP. | I3 |
| I13 | Photo aspect ratios and cropping | DECIDED | Profile thumbnails 4:5, listing thumbnails 3:2 with object-fit cover; original detail gallery preserves image aspect and lets user inspect uncropped content. Do not destructively crop stored originals. Reuse J9 compression and server ownership/type checks. | D3, J9 |
| I14 | Logo | DECIDED | Capybara mascot + wordmark, per the Claude Design export. | I1 |
| I15 | Colour palette | DECIDED | Orange (Primary) `#E2883A` · Orange Soft `#FBE7D2` · Orange Dark `#B5661F` · Teal (Secondary) `#1F94B3` · Gold (Favorites) `#F0B429` · Green (Success) `#4E9F63` · Red (Error) `#DB5A4A` · Ink (text) `#262220`. One bold saturated accent (orange) for primary actions/brand moments; teal and gold reserved for meaning, never decorative. Per the Claude Design export. **⚠ Live code still uses the old undocumented `#FF385C`** — see contradictions table. | I1, I3 |
| I16 | Language & direction | DECIDED | Hebrew **and** English, both from v1. Direction follows the locale: Hebrew RTL, English LTR. Requires a real i18n layer and logical CSS properties (`start`/`end`, never `left`/`right`) from the first component. Resolves A7. | A7, I2, I17 |
| I17 | Bidirectional layout rule | DECIDED | Every layout value is **logical, never physical**. No `left`/`right` in any component, token, or design spec — only `start`/`end`. Direction-carrying icons mirror with the locale. Enforced in the design system, not patched per screen. See `ARCHITECTURE.md` §5. **⚠ Live code currently violates this** — see contradictions table. | I16 |
| I18 | Default locale & URL shape | DECIDED | Hebrew is the default. English lives under an `/en` prefix so public listing URLs stay separately indexable (J15). | I16, J15 |
| I19 | **Resident discovery without search modes** | DECIDED | Individuals and Groups are freely switchable Discover tabs, with no resident search mode. All authenticated eligible accounts including nonresident listers may browse safe social projections. Group membership does not replace a personal profile. Resident social introductions/group participation require I9; a nonresident lister can instead send the apartment-bound invitation in F4 after B10 intake. Guest access to people is not included. Listing sharing to personal/group chats is MVP E8, superseding old future-work wording. | I9, E5, E6, E8, D1 |
| I20 | **Settings as its own screen (new)** | DECIDED | Split out from Profile: language picker (radio-style rows, not a toggle), notifications toggle, privacy row, destructive "Delete account" row in red. | I2, I16 |
| I21 | **Publish confirmation screen (new)** | DECIDED | The composer previously had no defined end state. Now: a dedicated "Listing published!" screen with a checkmark and a "View listing" CTA. | D2, D16 |
| I22 | **Resident startup tab preference (new)** | DECIDED | Residents default to Discover and may choose Discover or Map as persisted startup preference. Nonresident listers start on My Listings and can navigate to Map/Discover/Chats; startup dashboard is not a browsing restriction. Resume safe intended deep links after authentication/intake. | A4, I4, I20, D16 |

---

## J. Architecture & data

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| J1 | Final entity model | DECIDED | Entity/disclosure boundaries are specified in docs/specs/DATA_CONTRACTS.md: one account; optional social profile/facts and private preferences; owned apartment/rooms; personal saves; introductions/inquiries; groups/memberships/votes; conversations/messages/read markers; address grants; reports/reviewer audit; outbox/preferences; pseudonymous pilot events. Exact taxonomy options remain C2 review; those fields cannot be guessed. Reconcile and reuse actual migration objects before adding compatible schema, never rewrite existing identities. | everything |
| J2 | **Feed query strategy and pagination** | DECIDED | Server-filtered bounded keyset pagination, unique final ID tie-break and version/query-bound opaque cursors. No unbounded prior-ID exclusion arrays or all-history fetch. Concrete limits/errors in DATA_CONTRACTS; scoring refresh explicitly restarts cursor. Map viewport bounded separately. | C1, C3, J7 |
| J3 | Where filtering happens: client, RLS, or RPC | DECIDED | RLS/column grants/privileged-function checks authorize access; bounded RPCs perform feed/search filtering and multi-write transactions. Private fields never reach client for later filtering. No service-role client in browser. | J2, J7 |
| J4 | Counters: computed, cached, or triggered? | DECIDED | Start with indexed relational aggregates for unique active personal saves and available-room count/range; enforce uniqueness and transactional consistency. Client never writes counters. Add maintained cache only after measured query need, with rebuild/reconciliation tests; do not preemptively duplicate aggregate authority. | G1, D7, J5 |
| J5 | Index plan | DECIDED | Index actual access paths and verify plans on representative disposable fixtures: unique actor/target saves and requests; membership lookup; messages conversation/sequence; pass expiry; rooms apartment/availability/price/date; outbox due state; listing public-state/public-location filters. Add indexes alongside each feature migration rather than speculative indexes on every column. | J2, J4 |
| J6 | **PostGIS — revisit at scale** | DECIDED | No mandatory PostGIS migration for MVP. Query approximate public coordinates with bounded server-side bounding boxes and current Leaflet clustering. Measure representative performance; add PostGIS/GiST only via separate justified change when required. City marketing scope does not limit valid publication. | D14, A5, D4 |
| J7 | What moves into server-side RPCs | DECIDED | Feeds/map projections, private address reads, publish/edit/room mutations, saves, invitation/inquiry acceptance, messages/read markers, group admission, quota checks and reviewer actions use server-authorized RPCs/handlers. Multi-write state changes are transactional with idempotent retries. Preserve current compatible function signatures where possible. | J2, J3, G2 |
| J8 | Realtime channel design and connection limits | RESEARCH | Channel mechanics decided F1: account inbox plus one active thread per browser context, authorized private typing and persisted catch-up. Actual project-plan peak connections/messages, replication/channel revocation readiness and realistic pilot capacity still require current official limits and target evidence. Do not subscribe every historical chat or treat a websocket handshake as acceptance. | F1, K3 |
| J9 | Photo/image pipeline: upload, resize, CDN, blur derivative | DECIDED | Compress and resize in the browser before upload, to save bandwidth and storage. Blurred derivative still needs an explicit answer (G2 depends on it). | D3, I13, G2, K3 |
| J10 | Caching strategy | DECIDED | Private/authenticated/permission-sensitive responses no-store; MVP public listing/map data also no-store initially to avoid stale moderation/privacy state. Static assets use versioned caching. Add public-only bounded TTL/cache invalidation only after measured need and stale-visibility tests; never shared-cache private favorites, scores, contacts or exact locations. | J2, K1 |
| J11 | How schema changes ship | DECIDED | Append-only versioned SQL migrations in repo, compatible expansion/backfill before contraction. Read target history first and reconcile already-applied migrations; no dashboard-only schema edits or shared reset. Local migration tests precede separately authorized hosted application; web deployment and DB migration are distinct operations. | K5, J12 |
| J12 | Environments | DECIDED | Separate real-user data from development/QA schema/global-config experiments, local isolated backend first under free-only budget. A frontend Preview is not evidence of backend isolation. No automatic paid branch/project; document exact target and workflow. Owner Q33, 2026-10-16; supersedes single-shared-DB-only development assumption. Existing hosted project unchanged until separately authorized implementation. | J11, K5 |
| J13 | Error tracking and analytics | DECIDED | MVP uses first-party minimal server-committed business events and sanitized operational error IDs; no mandatory Sentry/PostHog dependency or paid analytics. Separate QA/demo/pilot cohorts and event denominators; no message text/contact/exact location/private preferences in telemetry. Optional third-party analytics requires M3/legal/provider review; operational reports are owner-only. | A9, L7 |
| J14 | API rate limiting | DECIDED | Rate limits and atomic quotas are enforced at server/DB boundary using account-bound counters with expiry, not instance-local memory or client controls. Apply C7/F8 and MAP_SEARCH limits, bounded pagination and request validation. Record sanitized denials; no raw query/contact logging. Platform defaults supplement application controls. | C7, F8 |
| J15 | SEO & public listing URLs | DECIDED | Next.js Server-Side Rendering (SSR) for public apartment URLs, for rich WhatsApp link previews. | I18, K1 |
| J16 | Data fetching strategy | DECIDED | Next.js Server Components for static/SEO pages, Client Components for highly interactive Map/Swipes. | J15, K1 |

---

## K. Platform & infrastructure

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| K1 | Web stack and hosting | DECIDED | Web-first (Next.js on Vercel) for Phase 1. Native app (React Native / Expo) is Phase 2. | I3, J10 |
| K2 | PWA: install prompt, offline behaviour | DECIDED | Installable web PWA when supported; no offline marketplace mode. Never service-worker-cache private API/auth/address/chat responses. Show recoverable offline state; push permission explicitly requested only after explanation, no forced install prompt. | F7, K6 |
| K3 | **Supabase free vs Pro — where does free stop being viable?** | RESEARCH | Free-only operating budget confirmed owner Q32, 2026-10-16. No paid plan/project/provider or overage commitment without new approval. Verify actual published quotas/terms and available account resources; record when a requirement cannot fit free limits rather than silently billing or weakening acceptance. Plan/provider feasibility is still research, not guaranteed by owner budget preference. | J8, J9, F1 |
| K4 | Domain name | OPEN | Buy before the campaign (L1) — the campaign is where the name gets committed. | L1, I1 |
| K5 | CI/CD and preview deploys | DECIDED | Type/build/targeted lint and relevant SQL/browser tests gate integration. Use isolated local backend by default; Preview URL alone is not DB isolation. Versioned hosted migrations and deployment require target-specific authorization, no automatic shared schema mutation by CI. Record SHA/backend/deployment separately. | J11, J12 |
| K6 | When the native app happens, and how code is shared | DECIDED | Native Expo after web validation/funding, outside MVP. Share domain IDs/validators/typed API contracts where practical; do not add native abstraction or rewrite web UI in advance. | G3, K2 |

---

## L. Growth, launch & operations

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| L1 | Pre-launch waitlist: where does it live? | DECIDED (approach) | Campaign before launch, WhatsApp group, accounts/waitlist ahead of go-live. Still open: is the waitlist a landing page or the real app in pre-launch mode? | K4, L2 |
| L2 | What the WhatsApp group is for after launch | OPEN | Feedback channel and support. Decide who runs it. | L6 |
| L3 | Launch-day supply target and the fallback if it misses | OPEN | Pilot size, reachable active-room supply and recruitment date are launch-operational choices, not an inherited 1,000-listing requirement. Start with a small truthful responsive cohort; mark demo/assisted/organic separately. Owner deferred day-one outreach details. No fake responsive owner or scraped content workaround to unchanged D0. | A9, D0 |
| L4 | Referral / invite mechanics | DECIDED | MVP reuses consent-based native group invitations and safe apartment sharing. No separate referral reward, coupon or campaign infrastructure. Pilot enrollment restriction remains owner choice before opening real access. | E1, E8 |
| L5 | Lifecycle notifications and emails | DECIDED | Email and supported web push with per-user/event/channel controls, following F7. Owner accepted this direction and defaults Q27, 2026-10-16. Remove obsolete claim that web push is unavailable; real sender, browser support and device subscription must be verified. Saved-search property-monitor alerts later. | F7, C10, D6 |
| L6 | Support channel | OPEN | WhatsApp group + an in-app "contact us". | L2, H3 |
| L7 | Analytics events to instrument | DECIDED | Start with A9's explicit funnel/response/supply/return/outcome events and distinguish synthetic from actual cohorts. Owner wants measurement to expand for product improvement, Q31 2026-10-16. Every addition needs learning purpose/schema/privacy/retention; no inference of permission to collect private content or arbitrary exhaustive telemetry. | A9, J13, E10 |

---

## M. Legal & compliance

| ID | Decision | Status | Recommendation / Answer | Blocks |
|---|---|---|---|---|
| M1 | Terms of service and privacy policy | RESEARCH | Required before you collect a single signup. Needs a real lawyer, not a template. | B7, G3 |
| M2 | Israeli Privacy Protection Law obligations | RESEARCH | You will hold a database of identifiable people. Registration/notification duties need checking. | B7, F6 |
| M3 | Cookie and tracking consent | DECIDED | No third-party advertising trackers in MVP; optional nonessential analytics defaults disabled pending explicit choice and required policy review. Minimal first-party operational/business-event contract J13, privacy allowlists and synthetic local testing approved. This is technical/product consent behavior, not a legal determination; M1/M2 review remains release gate. | J13 |
| M4 | Age gate | DECIDED | 18+ self-declared with server enforcement, consistent with B5. Owner Q6, 2026-10-16. No claim of documentary identity verification. | B5, H5 |
| M5 | **Gender filtering and anti-discrimination law** | RESEARCH | Gender filtering explicitly excluded from MVP C5; no executor may add it from historical export. Any later shared-housing gender preference/filter requires applicable anti-discrimination/legal review before promotion; do not assume an exemption. | C5 |
| M6 | Real-estate brokerage licensing | RESEARCH | Israel licenses real-estate brokers. Whether an app that connects renters and landlords — especially if it ever charges for that connection — falls inside that regime needs a real answer before monetizing. | G3, A2 |

---

## Contradiction history and current review queue

Resolved 2026-08-20: tag scope (C1/C2/C13 → 31 categories), verification method (B3/B4 → email-only for v1), listing fields + photo minimum (D2/D3 → merged), dark mode (I11 → no). The 15 October planning review distinguishes historical conflicts from new proposals below; proposals do not override the canonical rows.

| # | Where it lives | The conflict |
|---|---|---|
| 1 | E3 | Resolved 16 October: consensual admin transfer and deletion-without-transfer archive fallback now decided. Older any-member removal design does not override E3. |
| 2 | C13/C2 | C13 provisional flexible scoring/basic free constraints accepted; exact normalized taxonomy/copy C2 reopened for recommendations. No more universal exact-match hard-gate mandate. |
| 3 | E6/B9 | Resolved: no public member-derived numerical budget. Optional explicit group search budget private to members. |
| 4 | D0/F4 | Owner defers supply outreach/preparation; D0 native/in-app remains. No third-party scraping/contact exception approved or required to start MVP development. |

G3 (Unblur price) is already handled — the design's "₪9.90/mo" is noted as illustrative only, G3 stays `RESEARCH`, no action needed until you're ready to actually price it.

---

## Decisions already made in code that contradict this file

These shipped before (or outside) the register. Each needs a row above resolved, then the code corrected. Re-audited against the current tree — the mobile/Expo scaffold was deleted in the web-first pivot, so entries that only applied there are marked N/A rather than deleted outright.

| Where | What the code does | Register row | Status |
|---|---|---|---|
| `web/src/components/Header.tsx`, `web/src/app/page.tsx` | Brand name rendered as "roomie" (lowercase), not "Shutaf" | I1 | **Live — needs fixing** |
| `web/src/components/Header.tsx`, `web/src/app/page.tsx` | Hardcoded `#FF385C` (Airbnb's brand color) instead of the now-decided Orange `#E2883A` palette | I15 | **Live — needs fixing** |
| `web/src/components/Header.tsx` | Physical `mr-2`, `pl-2`, `pr-8`, `rounded-r-full`, `text-right` classes instead of logical `start`/`end` equivalents | I17 | **Live — needs fixing** |
| `web/src/app/layout.tsx` | For contrast — this file is already correct: Rubik font, `dir="rtl"`, `lang="he"`, title "Shutaf". Nothing to fix here. | I1, I2, I16 | Good |
| `supabase/schema.sql` `profiles.vibe_tags` | Free `text[]`, not structured categorical columns | C1 | **Live — needs fixing** |
| `supabase/rls.sql` `apartment_stats` | Correlated subqueries per apartment, now at least wrapped in a documented security-definer view | J4 | **Partially addressed** — scale concern at 1,000+ listings still open |
| `supabase/schema.sql` | No PostGIS | J6 | **Deliberate, documented** (`ponytail:` comment) — promote to DECIDED |
| `profiles.gender` | Column exists; no UI built against it yet (web app is pre-feature) | C5 | Not yet contradictory, just unused |
| Discover screen (buttons + tap-a-tag modal, no swipe) | — | I12, C1 | N/A — mobile scaffold removed |
| Discover accept-a-like vs mutual match | — | C9 | N/A — now formally DECIDED as accept-a-like; rebuild will match |
| Chats fetch-all-messages pattern | — | J2 | N/A — mobile scaffold removed |
| Live database seed listings | Not re-verified this pass — needs a direct DB check, not a code read | J12 | Unverified |
| `web/src/app/page.tsx` | Previously sent every user to Map; now checks sign-in/onboarding, sends residents to saved Discover/Map choice, and Listers to My Listings | A4, I22, D16 | Resolved in current working tree; Lister dashboard added, dashboard interest counts and status actions remain incomplete |
