# New decisions from this design pass — not yet in DECISIONS.md / ARCHITECTURE.md

This design pass answered several things the register still lists as `OPEN`, and it made a few calls that **contradict** existing `RECOMMENDATION`/`DECIDED` rows. Both kinds are listed below, referenced against the register's IDs, so they can be merged in.

## Answers to currently-OPEN rows

**D1 (who can post) — refined.** The register says "any user or realtor, via mode switch." This design draws the line more specifically: **residency, not persona, determines whether a profile is required.** Anyone who will live in the apartment (Solo, Group, Room-Filler) must have a completed profile before posting or matching. Anyone posting on behalf of a property they won't live in (Lister/landlord/agent) can post with an **account only** — a short name/phone/agency-name intake, no profile, no tag picker. This is a new onboarding fork, not just a mode switch after the fact.

**I9 (onboarding: exact steps, order) — answered.** Order is: (1) residency fork ("will you be living here?") → (2a) if yes: looking-mode picker (Solo/Group/Room-Filler) → completion screen; (2b) if no: short non-resident intake (name, phone, agency name — optional) → straight into the quick-post composer. Mode is editable later from a persistent switcher control placed in Profile.

**E1 (how a group is formed) — partially answered.** Direct group creation happens by **picking up to 3 existing matches from a checklist**, not by inviting arbitrary non-matched people. This is triggered from an existing chat thread's "Make group" action.

**E6 (group card content) — given a concrete interaction.** The register already decided the card is computed from members, not a separate bio. This design specifies the interaction: the group's Discover card leads with a summary (name, member count, shared budget/tags); tapping a member's avatar **flips the card** to that member's individual bio/tags; **swiping left/right always decides for the whole group**, regardless of which member is currently shown.

**D12 (listing attached to a group / room-fillers) — given a concrete flow.** A Room-Filler posts through a dedicated, shorter form scoped to their existing apartment (rent for the room, move-in date, 1–2 tags) rather than the full listing composer — the apartment itself is assumed to already exist.

**C2/C1 (tag list structure) — given a UI shape.** The 31 categories are grouped into three expandable sections for editing: **Lifestyle, Apartment preferences, Logistics** — not one long scrolling form, and not one-category-per-screen. This is a UX answer, independent of whatever the register decides about the 4-vs-31-axis scope question.

**G2 (what Pro unblurs) — confirmed in UI.** Unblur reveals both photo and name together, matching the "identity, not just pixels" rule already in ARCHITECTURE.md §4.1.

## New calls that need a row (not in the register at all)

- **Non-resident intake screen** — name, contact phone, agency name (optional) — sits between the residency fork and the quick-post composer. Needs an ID under section B or I.
- **Mode switcher as a standing UI element** — a persistent row in Profile, not just a one-time onboarding choice. Tapping it reopens the same mode picker.
- **Settings as its own screen**, separate from Profile — houses the language picker (radio-style, not a toggle), notifications, privacy, delete account.
- **Lister dashboard** — a distinct home for Lister-mode users: "My listings" with status per listing (Active + interested count, or Rented), no Discover access. Nothing in the register currently describes what a Lister's home screen is.
- **Composer required-field validation** — quick-post enforces photos, rent, address, and phone before Publish enables, with a visible incomplete state (see contradiction below on photo count).
- **Publish confirmation screen** — a dedicated "Listing published!" step with a "View listing" CTA. The composer previously had no defined end state.
- **Group profile editing** — any member can edit the shared budget and remove other members (not themselves); no admin-only gating was designed. This is a candidate answer for E3, but designed independently of it — flag for reconciliation.
- **Map pin cluster visual** — a numbered dark-circle pin shown at low zoom, no tap-to-zoom behavior specified yet (D14's zoom-14 threshold is a backend/rendering decision this doesn't touch).

## Contradictions with existing register rows — need reconciliation

- **Verification (Screens 5) shows ID + selfie upload.** This directly contradicts **B3/B4**, which decide automated verification via student email domain with **no document check**. Either the design should be corrected to remove the ID/selfie step, or B3/B4 need to be reopened — these cannot both be true.
- **Quick-post composer requires "at least 3 photos."** This contradicts **D3**'s recommendation of "1 required, 8 max." Pick one minimum and apply it consistently — the design system currently disagrees with the register.
- **Quick-post required fields are photos + rent + address + phone.** The register's **D2** required-field recommendation is title, price, bedrooms, location, available-from, ≥1 photo — a different set (no phone in D2; no title/bedrooms/available-from enforced in the design). Reconcile the field list once, then match it in both places.
- **Unblur paywall shows a concrete price, "₪9.90/mo."** **G3** (Pro price and billing rails) is still `RESEARCH`, unresolved. Treat the price shown in the design as an illustrative placeholder, not a decision — don't let it silently become the answer to G3 without someone actually deciding it.
- **I11 (dark mode)** — the register already flags this contradiction; this pass adds one more concrete dark-mode screen (a chat thread), which makes the unresolved status more visible but doesn't newly cause it.

## Recommended next step
Walk sections B (verification), D2/D3 (listing fields/photos), and G3 (pricing) in the register and either update the design to match the decided answer, or formally reopen and re-decide those rows — right now the design and the register disagree on all three.
