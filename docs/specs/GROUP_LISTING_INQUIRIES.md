# Group apartment inquiries

Approved by direct owner instruction on 20 October 2026 (Asia/Jerusalem). Product authority: DECISIONS.md F4/E8; D4/D18/E3/H1/F1/F3 still apply. Planning only: no migration, application feature or runtime acceptance was performed when recording this change.

## Owner decision

An individual can still contact an apartment owner. A group can also contact an owner about an apartment shared into its roommate chat. The shared card offers **Contact owner**. Each current group member must explicitly approve contacting that owner about that apartment. Only after all members approve does one group inquiry reach the owner. Sharing a card, saving it, a majority vote, an administrator click or silence is not unanimous consent.

The owner's phrase “only when all group members contact them” is represented by these individual approvals and one collective request, rather than duplicate requests from every member. Owner acceptance starts a separate apartment-context conversation containing the owner and the consenting members. The original roommate chat stays private to roommates. This preserves the existing accept-before-chat/address rule.

## Bounded implementation contract

- Context identity is group ID plus apartment ID; an individual requester remains a different context. Reposting a card references the same current group/property request state, without manufacturing another request.
- A consent round records the current group membership revision and exact member IDs. Each eligible current member may approve only for themselves. Before unanimous approval, show progress such as 2/3 inside the group only; no owner inbox item, message or notification exists.
- The final approval locks/rechecks the round, membership and listing eligibility and atomically creates one pending group inquiry. Preserve a stable request key and uniqueness; retry returns the same result. There is no client loop sending individual inquiries as a substitute.
- Membership change before dispatch or owner acceptance invalidates the old consent round. Start a fresh round for current members; do not silently inherit votes. A pending inquiry with stale consent cannot be accepted.
- The listing owner sees a group request and safe public member information, and may accept or decline. No private budgets, contact details or roommate-only history are included.
- Acceptance rechecks unanimous current consent, active apartment/intake, account eligibility and blocks. Atomically create/reuse one group/apartment owner conversation, attach the consenting participants and create individually authorized D4 address grants. A failed acceptance creates no partial conversation or grants.
- Group admission policy (admin/any/majority) is unrelated to this unanimous decision. Roommate capacity remains four; the listing owner is an additional participant in the separate apartment conversation, not an extra roommate-group member.
- No automatic access for a later group member to prior owner conversation history or exact address. Existing block, deletion, membership/history authorization and leave rules remain enforced per participant; no blanket group ID address grant.
- Individual requests and owner reverse invitations remain available and keep their distinct identities/consent. C7's invitation allowance is not charged once per group member for renter-initiated consent; F4 inquiry duplicate/rate controls apply.
- Inquiry acceptance does not reserve a room, mark occupancy, close group discovery or create shared property ownership. Unavailable/reopened pending requests use D18 reconfirmation and a current unanimous round.

## Demo-first execution and later hardening

Implement the ordinary path first: two members share a listing, both approve, owner sees one request, owner accepts, all three exchange persistent text in the new conversation. A second ordinary request proves individual contact still works. Verify the owner never appears in the roommate-only chat and a nonparticipant cannot open the owner conversation/address.

After that visible core works, execute concurrency, repeated requests, changing electorate, stale approvals, revocation/old socket and failure-injection tests. Record these separately; a working ordinary scenario does not mean robustness is verified. See [implementation_plan.md](../../implementation_plan.md) for serial micro-tasks.

## Planning ownership and superseded wording

New packet **SL06.3**, parent SL06, consumes SL06.1 individual inquiry, SL09.1 membership and SL10.1 shared cards. It does not create a cycle: group creation/sharing must not depend on completed group owner contact. SL06.2 reverse poster outreach remains separate and is not a prerequisite for demonstrating group contact.

At the owner's original request, docs/SLICES.md is preserved unchanged. Its SL06 exclusion “group acting as landlord requester until specified” is now superseded for this explicitly specified F4 feature, as is SL10's former exclusion of group landlord negotiation. No other catalog scope is promoted. The packet manifest, downstream PRD/architecture and new implementation plan carry this explicit amendment.

Next implementation step is reconciliation of current source and the active work owner, then SL09/SL10 artifacts before SL06.3. No implementation or packet verification is implied by this approval.

## Shared owner inbox — 21 October 2026

Use the [listing management inbox](LISTING_MANAGEMENT.md). Tasks 6.9/6.11 extend its existing card/reader and accepted conversation link rather than a second pending list in Chats. Request kind/listing filters retain individual and group contexts. Membership validity (6.13) and retry/acceptance checks (6.14) are moved into the core before final group acceptance; no unauthorized history/address access is deferred as hardening.

## Owner clarification — 25 October 2026

The owner distinguishes a nonresident landlord from a resident publisher looking for co-residents. In both cases the listing publisher decides whom to rent to. A group inquiry is a request to rent, not a request to attach the listing to the group's Discover card. The existing F4 acceptance-before-conversation and unanimous-consent rules remain in force: no owner conversation at the first member's click or merely on sharing.

Multiple independent groups and individuals may inquire about the same apartment while its inventory/intake permits. Each accepted group has its own apartment-context conversation with the publisher and its consenting snapshot; never one conversation mixing competing applicants. The roommate-only chat remains private. No inquiry, consent round or accepted conversation exclusively locks the apartment, marks a room occupied or closes intake. A group's withdrawal must not change another group's inquiry, delete accepted conversation history or close the listing. Apply existing D18 controls and state-transition contracts rather than a new reservation lifecycle. Tasks 6.13/6.14 and final journey acceptance must cover two applicant groups, an individual inquiry and withdrawal/retry isolation.

The owner further clarified that residence, not student status, is the distinction: a resident publisher is also a prospective co-resident, so the apartment conversation supports roommate acquaintance as well as rental coordination. A nonresident publisher participates as the rental counterparty, not as an inferred roommate. A still-searching roommate group remains independent and may approach different publishers in separate apartment-context conversations. Neither type of conversation means its participants already live together. Existing explicit owner room/taken controls record the later decision to rent; no automatic occupancy, automatic admission into an existing residents' group, contract-signing system or change to private-history rules is authorized. Student verification under B3 is a separate capability, not a substitute for resident status.

### Discover cards: independent housing intent and attachment

D12/E6 scope now includes two honest card presentations within existing Discover Groups: searching together, and recruiting for an actual linked apartment. The supplied conceptual mockup is content/hierarchy guidance, not pixel or fixture data. Explicit housing intent is distinct from `groups.apartment_id`; legacy NULL remains unknown until collected. No fake listing, public budget derived from private member preferences, inferred location or invented room price.

A safe linked summary uses current public listing data: cover, public area, actual available-room price or range and availability, with a link to the existing listing detail before introduction. Preserve existing group introduction behavior; add no action whose backend is absent. When removed or full, preserve group/conversations and intent, show unavailable/no available room and remove stale availability claims. Exact address remains D4-controlled. A rental inquiry does not require or automatically set the group's own `apartment_id`.

Link creation/revocation authority must be settled separately before that behavior is built; group management never grants property editing/ownership. Tasks 9.12–9.15 record the bounded expansion and isolate this unresolved linking rule. Public card and server authorization require ordinary-client plus HE/EN phone/desktop visual acceptance, including legacy/long/empty/multiple-room/removed/full cases.
