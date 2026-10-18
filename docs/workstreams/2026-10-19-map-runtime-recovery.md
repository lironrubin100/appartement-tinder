# Map runtime recovery — CARTO tiles and listing data

Updated 19 October 2026 (Asia/Jerusalem). Status: implementation published to Production; authenticated visual acceptance remains incomplete.

## Outcome and scope

- User report: the Map is currently not working and asked to continue the previously discussed map-provider work under the repository workflow.
- Diagnosis: the approved/deployed CARTO Positron tile URL returns HTTP 200 when checked on 19 October. The protected production route correctly redirects an unauthenticated visitor to login. In the current Map client, a failed `apartments_public` read was silently converted to an empty array, leaving a blank map with no recovery action; tile-load failures also had no user-visible recovery.
- Scope: retain CARTO Positron and required attribution; add localized, accessible error/retry states for listing-data and tile failures only. No schema, migration, provider-key, visual redesign, deployment, commit, push or merge.
- Decisions: I8 (explicit hard-error retry), I10 (accessible controls), D4 (coarse public location) and J16 (interactive client map).

## Acceptance and verification plan

1. A failed public-listing request shows a Hebrew/English error state with a retry action rather than a blank map.
2. A tile failure shows a Hebrew/English in-map error with a retry action; retrying remounts the tile layer.
3. CARTO URL and OSM/CARTO attribution remain unchanged.
4. Run type-check, focused lint and diff checks after dependencies are available. Authenticated browser verification needs a disposable configured fixture; none exists in this checkout.

## External state

- No hosted Supabase mutation occurred.
- Commit `c1da7ee92c2b3603c0ef51184d3087c75b15d3dd` (`Show recoverable errors on the map`) was pushed to GitHub `master` on 19 October 2026 after the user explicitly authorized publication.
- Vercel Production deployment `dpl_9jeMmE3XJ2nePBhusDCJMVm2AqHd` for that exact SHA reached `READY`; it is assigned to `https://appartement-tinder.vercel.app`.
- `web/.env.local` and `web/.qa/run.json` are absent in this checkout. Creating external QA identities is deferred until local implementation is ready and the target/fixture authorization is rechecked.

## Verification — 19 October 2026

- `curl -I https://a.basemaps.cartocdn.com/light_all/13/4885/3344.png` — HTTP 200 from CARTO; the approved provider is reachable.
- `npx tsc --noEmit` — passed.
- `npx eslint 'src/app/(main)/map/MapClient.tsx' src/components/map/LeafletMap.tsx` — passed.
- `npm run build` — passed; compiled, type-checked and generated all 29 routes.
- `git diff --check` — passed.
- `node scripts/project-status.mjs --write --shared` — could not refresh the shared inventory from this sandbox because the authoritative primary checkout is `C:/Users/User/Desktop/appartement tinder`, outside this checkout's write permission (`EPERM`). No inventory facts were changed.

The protected deployed `/map` route redirected an unauthenticated browser to `/login?returnTo=%2Fmap`, which is expected route protection rather than map-render evidence. Authenticated Hebrew, English and phone-width browser acceptance remains verification-incomplete until an isolated fixture/backend is configured. No user or QA data was created for this work.
