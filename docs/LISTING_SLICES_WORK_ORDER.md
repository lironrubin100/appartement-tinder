# Three apartment journeys

Decision dependencies: D2/D3 (publication fields and photos), D4 (address privacy), D5/D9 (rooms inside one apartment), D16 (owner dashboard), I8 (loading/errors), I16/I17/I18 (Hebrew/English and direction), I21 (publication confirmation), J9 (browser image compression), J15/J16 (public server-rendered listing).

1. Map to shareable apartment: full photo gallery, available-room price range, bills and availability, Hebrew `/listings/:id` and English `/en/listings/:id`, rich preview metadata, unavailable/error/loading states. Anonymous lookup exposes one active apartment through an explicit projection; no exact address, coordinates, owner or phone.
2. Publish to confirmation to listing: validate and compress photos, disable duplicate submission, save apartment and rooms in one transaction, recover from errors, confirm the saved ID and offer View listing. English composer and confirmation use `/en/compose`.
3. Dashboard to rented: own listings only, room counts and price ranges, explicit confirmation and pending/error states, owner-scoped update, remove rented apartments from the public lookup/map. Available to resident posters as well as listers; lister startup remains unchanged. English dashboard uses `/en/my-listings`.

Implementation runs sequentially in the existing clean isolated worktree. Shared schema/types and locale infrastructure have one owner. No changes to open product decisions, matching/inquiries, groups, account deletion, monetization or listing renewal. Publication to GitHub/Vercel is a separate action.

Verification: TypeScript and ESLint; rollback-protected SQL checks of anonymous privacy, authenticated publication and RLS; real browser publication with photo uploads, confirmation, public reads in both locales, dashboard persistence, cancel/confirm rented, non-owner isolation, unavailable listing response. Temporary QA accounts, listing rows and uploaded photos are removed after tests. Screenshots and test results are saved locally.
