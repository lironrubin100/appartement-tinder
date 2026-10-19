# CARTO Basemaps API key repair

Updated: 19 October 2026 (Asia/Jerusalem).

- Owner: current a6de chat; existing disposable checkout, detached HEAD `87e7f11fbc3b9da1863014653ab3f0088da9b0f9`. No new checkout needed.
- Scope: diagnose reported broken basemap and wire the approved CARTO Positron provider to its required browser Basemaps key. Decisions D4, I8, J16, K3; preserve public approximate coordinates and attribution.
- Reproduced: authenticated owner Chrome tab at `https://appartement-tinder-appartinder.vercel.app/map` displays 13 listings, markers/clusters, attribution and repeated `API KEY REQUIRED` images instead of streets. Owner independently confirmed the same symptom.
- Cause: the tile URL omits `?key=...`. CARTO returns a valid image with a watermark, so HTTP 200, image load success and attribution checks do not prove usable map imagery. The earlier runtime-recovery handoff's reachability check is insufficient.
- Provider evidence: https://github.com/CartoDB/basemap-styles and https://carto.com/basemaps/apikey/ checked 19 October; raster tiles require a Basemaps API key in the `key` query parameter.
- Plan: add build-time public key configuration and a clear missing-configuration state; document setup; run focused type/lint checks. Actual streets require a valid key and visual acceptance.
- No hosted database mutations, migrations, account creation, terms acceptance, commit, push, merge or deployment authorized/performed in this chat.
- Shared primary register is older than this checkout and outside writable roots. Preserve newer local records; request only scoped documentation write escalation if needed.
- Cleanup: retire a6de only after work is integrated or recoverably archived and this chat is inactive; do not remove the calling checkout.

## Checkpoint: owner requested setup instructions

- Implemented locally, uncommitted: `web/src/components/map/LeafletMap.tsx` reads `NEXT_PUBLIC_CARTO_BASEMAPS_KEY`, URL-encodes it as `?key=`, and avoids keyless tile requests when missing. Missing configuration has HE/EN unavailable copy while listing cards remain available. Existing tile-error retry remains.
- `web/README.md` documents the exact setting, build-time behavior, browser visibility/origin restrictions and real-imagery acceptance. `docs/KNOWN_ISSUES.md` records MAP-CARTO-KEY-001; local PROJECT_STATUS has this workstream row.
- `git diff --check` passed after the patch. Type/lint/build/browser acceptance of the patch are not yet verified. `npm ci` in sandbox failed with ENOTFOUND registry.npmjs.org and EPERM cleanup; an escalated locked-dependency install was started but had no completion evidence at this checkpoint.
- Shared inventory command attempted and failed EPERM writing the primary Desktop checkout outside writable roots. Shared primary status remains stale; local newer status must not overwrite it wholesale.
- User steering: provide detailed instructions for obtaining the key and placing it in Vercel. No key requested in chat. Explain that saving an environment variable alone cannot repair the deployed code: this local implementation must also be verified and published under separate authorization.
- Next step: owner obtains a CARTO Basemaps key at https://carto.com/basemaps/apikey/ and saves it as `NEXT_PUBLIC_CARTO_BASEMAPS_KEY` in the correct Vercel project's Production/Preview environments. Then finish checks, obtain publication authorization, deploy the patch and inspect actual streets in authenticated HE/EN desktop/390px. Never infer map correctness from HTTP 200 alone.

## Follow-up: key configured, deployed code still keyless

- Owner reported setting the key. Read-only Chrome verification on 19 October confirms `NEXT_PUBLIC_CARTO_BASEMAPS_KEY` exists in the correct Vercel project (`appartinder/appartement-tinder`), scoped to All Environments. No key value is stored in this handoff.
- After reloading the authenticated production `/map`, all 15 rendered CARTO tile image URLs still omit the `key` query parameter. This directly confirms the live browser is using keyless code. It does not test validity of the configured key.
- Local TypeScript (`npx tsc --noEmit`), focused ESLint and `git diff --check` passed. Restricted build failed on Google Fonts DNS and EPERM output writes; escalated build compiled, type-checked and generated 29 pages; final process exited 0: production build passed. Authenticated visual acceptance with the real configured key remains pending publication.
- Shared inventory refreshed successfully using scoped escalation: 7 worktrees, 10 local branches. No checkout created or removed.
- Required next action: publish the verified local key-wiring patch under explicit owner authorization, rebuild with the saved Production variable, then verify real street imagery. No further owner key setup is currently indicated by evidence. No commit, push or deployment has occurred in this chat.

## Publication authorization and preparation

- Owner explicitly approved commit/push/production publication on 19 October and gave standing authorization for routine verified fixes/features without repeated approval, except critical actions. Updated AGENTS.md, EXECUTION_PROTOCOL.md and START_NEXT_WORK.md to remove conflicting routine approval gates; hosted DB/data gates remain. This is project policy, not an unverified claim of changing global Codex settings.
- Previous fresh local checks: TypeScript, focused ESLint and production build all passed; `git diff --check` and planning validation passed after the policy-only edits. No application code changed since the successful build.
- Intended target: GitHub `lironrubin100/appartement-tinder`, non-force fast-forward `master`; Vercel project `prj_XAJx2MhiQegnszuLPjR0GiRG0Isk`, team `team_MFJ5mOsQxL74JqEmQDMA03Up`, Production. Remote master fetched and equals starting HEAD `87e7f11fbc3b9da1863014653ab3f0088da9b0f9` before commit. No unrelated commits to integrate.
- Production acceptance after publication must verify real loaded streets with keyed requests, attribution and markers at HE/EN desktop/390px. Do not print the browser key or store it in tracked files.

## First publication and phone regression

- `085a5f92f66d62272758853258297561b529b8e1` pushed by normal fast-forward to master; remote SHA independently confirmed. Vercel Production `dpl_6edgE3AGkKVru7amXCdGawMn5xEY` reached READY and all production aliases were assigned.
- Authenticated HE desktop Chrome: 13 listings, pins/clusters, actual streets and OSM/CARTO attribution visible; 15/15 rendered tiles had nonempty key and loaded. No watermark. Key value omitted from records.
- Required 390x844 check found pre-existing layout defect: `.leaflet-container` measured width 343.2px and height 0px. Parent had only min-height, while nested Leaflet used percentage height; desktop flex stretching masked it.
- Focused follow-up: give map parent explicit responsive height (`h-96`, desktop viewport height with 384px minimum), retain existing responsive layout and listing controls. Rebuild/focused lint before publication; verify HE/EN phone and desktop after release.
- Primary checkout has unrelated dirty BUILD_PLAN.md/new plan work. It was not reset/merged. New standing policy copies and scoped shared records were synchronized; primary remains on historical local master and must not be treated as the live source.
- Phone height fix: fresh production build (including TypeScript) and focused ESLint for both MapClient/LeafletMap passed; no schema/auth/query changes. Publishing this bounded follow-up under the owner's standing authorization.

## Verified production outcome, 19 October 2026

- Phone height commit `57d458c3fc90c68f3e7f1d76c092135c13c4cf75` pushed normally to master; Vercel Production `dpl_HSGqyZBPtzLDwJ36cPJ728X84RDk` reached READY and all 3 aliases were assigned.
- Authenticated real Chrome at `appartement-tinder-appartinder.vercel.app`: HE and EN routes both visibly show actual street imagery, listing pins/clusters and OSM/CARTO attribution at desktop and 390x844. Phone Leaflet dimensions are 343.2x384, previously height zero. EN desktop dimensions 872x475.2. Existing Hebrew filter/listing copy on EN is pre-existing, outside this repair; this is locale-route map-render evidence, not full translation acceptance.
- No backend writes, QA accounts, migrations, uploads, messages or paid resources. Existing owner session used for read-only checks. Temporary responsive viewport override reset; dedicated QA tab is ephemeral. No key values in tracked files.
- Owner's follow-up clarified address autocomplete is the intended listing outcome; it is separate missing implementation, recorded under `2026-10-19-address-autocomplete`. Do not mark that feature fixed based on this map release.
- a6de cleanup remains owner/next executor after this chat is inactive and committed history is preserved; do not remove the calling checkout. Primary dirty planning work remains intact.
