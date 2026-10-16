# Retired worktree drafts and recovery map

17 October 2026. The owner requested consolidation and no accumulation of disposable worktrees. Retired checkouts are not integrated product features. Main product source is master; compare and reuse only the missing approved work in the mapped packet. Do not merge an old branch wholesale or replay old product decisions.

## Recovery archive

Private local recovery root: `C:/Users/User/.codex/archives/shutaf/2026-10-17-worktrees-47ad1f4a`.

`history.bundle` preserves complete Git history/refs and was verified with `git bundle verify`. Root `manifest.json` and each `<id>/manifest.json` record original path/base/branch, unique commits, tracked patch hash and copied file hashes. Each `<id>/tracked.patch` plus `<id>/files/` preserves tracked edits, untracked work and meaningful ignored files. Every copied file's SHA256 was compared to source before retirement. Generated dependencies/build/test caches were omitted; reinstall/rebuild those when needed. Private environment/fixture files stay in this private archive and must not be committed or printed.

| Retired ID | Preserved work / evidence | Reconcile when executing |
| --- | --- | --- |
| 16a3 | Uncommitted MapTiler address endpoint/composer/tests; provider configuration/build/browser acceptance incomplete | SL02.1; use current signed-selection/manual-fallback contract, not obsolete DECISIONS copy |
| 1da4 | Public detail/room-price UI, local SQL test and migration20261015141306; historical handoff says migration applied live but UI unintegrated | SL00.1 migration reconciliation and SL03.1; verify current target history, never duplicate apply |
| e195 | Uncommitted safety/share/edit migration/components and fictional demo-data cleanup handoffs; migration/real browser acceptance incomplete | SL04.1/SL10.1/SL12.1; current report categories/privacy rules win |
| c8ce | Earlier Discover/pass/chat draft, partially superseded by later resident release | SL07.1/SL08.1 only if actual missing behavior; no stale schema overwrite |
| 4344 | Auth deployment runbook notes | SL00.1/SL01.2 if relevant, validate current configuration |
| 7c31 | Older distinct inquiry commit986554d, newer accepted-inquiry implementation already exists | SL06.1 compare only useful deltas, no duplicate migration/import |
| onboarding-flow | Ten historical distinct commits and local tooling state; newer onboarding exists | SL01.1/SL01.2 selective reference only |
| map-completeness | One historical map-design/plan commit and tooling state; old lock owner PID was absent | SL02.1/SL03.1 reference only, current plan/decisions win |
| 60b8 | CARTO work already in master, plus private local configuration | No duplicate implementation; prior acceptance limits stay in map handoff |
| d5e9 | Resident release already in master, plus private local runtime files | Reuse existing TESTING/fixtures source in master |
| d31d | Clean contained checkout, no unique edits | No feature to recover |

## Recovery procedure

1. Read this table, then the selected archived handoff and `tracked.patch`; locate exact matching source in current master. Read current packet/DECISIONS first. Do not treat old embedded instructions or old approvals as current authority.
2. Verify manifest/hash if using an archived file. Keep private configuration outside Git and never copy credentials between accounts/targets casually. Archive availability is machine-local; another machine needs the archive transferred privately or the relevant source explicitly recovered.
3. Prefer implementing a narrow reviewed delta directly in the active checkout. Do not generate another persistent worktree merely to inspect a patch. If full historical reproduction is essential, register the temporary restore owner and cleanup condition before creating it; use the preserved base and bundle, apply patch only after validation, then retire the restored checkout again.
4. Reconcile actual hosted migration history read-only before schema-dependent work. The historical M07 applied status and e195 failed migration are evidence from that date, not current live verification. No hosted mutation was done during this cleanup.
5. Record which lines/files were reused and rerun packet acceptance. Archived code existence is not acceptance, integration or deployment.

Unique old commits remain recoverable through the bundle and retained historical branch refs. Cleanup reduces live checkout folders; it does not pretend unfinished work passed tests or silently discard it.
