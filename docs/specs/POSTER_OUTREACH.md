# Apartment-bound poster invitations

Owner-approved in this conversation, recorded 17 October 2026. Canonical rules: B10, C7, D4, D16, F4, G1/G2, H1 and I19. No application implementation or live schema change claimed.

## Capability matrix

20 October F4/E8 amendment adds a separate renter-initiated unanimous group inquiry after native group sharing; see [GROUP_LISTING_INQUIRIES](GROUP_LISTING_INQUIRIES.md). It does not change the person-recipient consent of reverse poster outreach or authorize contacting a group without its approval.

| Action | Guest | Account-only nonresident poster | Completed resident profile |
| --- | --- | --- | --- |
| Safe active apartment/map | Yes | Yes | Yes |
| Safe people/group discovery | Sign in required | Yes | Yes |
| Resident-style introduction / group participation | No | Complete I9 first | Yes, consent/quota apply |
| Apartment-bound poster invitation | No | Own active apartment + completed B10 | Own active apartment |
| Private saves/phone/budget of another person | No | No | No |

My Listings remains poster startup. Browsing does not enroll a nonresident in roommate discovery. Only explicitly published social profiles appear there. Entering Map/Discover does not require completing lifestyle questions.

## Transaction and UI contract

1. Poster opens safe person card, chooses Contact about my apartment. Show only their currently public eligible apartments. Never suggest that the person saved that property.
2. Validate owned active apartment, eligible accounts, no block, not self, no existing pending sender/recipient invitation, and daily C7 quota. Optional opening text follows existing C6 limits. Server binds sender; client cannot impersonate owner.
3. Create pending `poster_listing` invitation with listing ID, recipient ID, unique request key and created timestamp. Store no private listing-address snapshot in event/card. This is a request, not a chat message. Recipient sees safe poster identity, apartment card, and Accept/Decline/Report/Block.
4. Accept locks invitation then listing/context pair, rechecks current visibility/account/block state. Atomically mark accepted, create or reuse one apartment-context conversation with both participants, and create D4 address grant for recipient. Same accepted request returns same result. No public introduction quota consumed by recipient.
5. Decline closes request; no conversation/address grant. Sender sees generic declined state, no reason required. Pending decline does not auto-pass the resident in roommate discovery. C8 pass is a separate explicit action.
6. If listing becomes unavailable before acceptance, show unavailable; acceptance fails without grant. Reopening requires recipient reconfirmation, consistent with D18. Sender can withdraw pending request. No automatic repeated send on reopen.
7. Multiple posters cannot merge conversations. Owner change is not a supported shortcut. An apartment with an existing conversation opens that conversation rather than issuing duplicate requests; accepted relationship remains subject to block/deletion/history rules.

Safe poster identity: approved display name and supplied profile image if any; label Property poster, plus optional agency. Never fabricate student/property verification. Private phone stays private. Lister profile needs no roommate compatibility percentage. Listing photo provides card context when poster has no portrait.

## Acceptance fixtures

Use two eligible posters with separate apartments, a resident recipient, and outsider. Prove receiver consent, real pending-to-accept persistence, one conversation/grant under concurrent retries, own-listing enforcement, daily quota shared with resident invitations, private saver/phone/budget withholding, withdrawn/hidden/blocked denial, no notification to blocked/deleted recipient and correct HE/EN phone flow. Clean exact fixture accounts/uploads after testing.

Integrate as a new packet under SL06, after SL01/SL03/SL04/SL08 contracts. It is additional approved work, not a claim existing renter-initiated inquiry code already implements reverse invitations.
