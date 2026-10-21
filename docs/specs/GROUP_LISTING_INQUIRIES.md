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
