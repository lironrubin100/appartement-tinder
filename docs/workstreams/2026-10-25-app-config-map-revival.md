# App Config revival — public map consumer

- Date: 25 October 2026, Asia/Jerusalem.
- State: first source-level consumer restored and verified locally; no hosted
  migration, data mutation, deployment, or configuration write was performed.
- Worktree: `C:/Users/User/.codex/worktrees/e21c/appartement tinder`.
- Branch: `codex/revive-app-config`, based on `origin/master` at
  `86f95f5f9205c3ee1f8694c78f3f3059cad1ed4d`.
- Decision constraints: `DECISIONS.md` remains the authority. Config is only
  for bounded product parameters; it does not move privacy, authorization,
  schema, or secret values into a browser-controlled setting.

## Outcome

- Added the live `app_config` table shape to the local Supabase type contract.
- Added a server-side public-map allowlist. It reads exactly
  `map.cluster_max_zoom` and `map.new_listing_within_days`, requires public
  visibility, validates their integer bounds, caches for 60 seconds, and falls
  back to the existing values `14` and `7` respectively on any unavailable or
  invalid result.
- The authenticated map route now passes those resolved values into its client
  components. The client cannot write configuration and receives no private key.
- Documented the two active configuration keys in
  `docs/CONFIG_KEY_INVENTORY.md`.

## Evidence

- Before this source change, a read-only live audit confirmed the hosted
  `app_config` schema, 17 public/5 private rows, and that the historic
  `app_config` migrations are already present in the authorized project.
- `npx eslint` for all changed TypeScript files: passed, 25 October 2026.
- `npx tsc --noEmit`: passed, 25 October 2026.
- `npm run build`: passed, 25 October 2026.

## Deliberate boundaries and next step

The recovered historical SQL source and its broader caller set were not copied
or re-applied. First compare the archived migration functions to live function
definitions and current source contracts; only then recover source history in a
separate change. The next web consumer pass can add Discover, Compose and Chats
only after each value has a bounded contract and a focused journey check.
