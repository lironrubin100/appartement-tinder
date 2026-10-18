# Local-first isolated testing workflow — planning contract

Confirmed direction: J12 isolation, free-only budget K3; exact tooling and rollout not yet installed/authorized by this document. Date: 16 October 2026.

## Standing owner preference — 18 October 2026

Docker-backed local Supabase is preferred for schema, RLS, Auth, Storage and Realtime work, but it is not a prerequisite while the shared project has no real-user data. If Docker is unavailable/inaccessible or the repository cannot reproduce the local baseline, apply reviewed migrations and run ordinary-client QA against the shared target only if the current `PROJECT_STATUS.md` explicitly confirms zero real-user data and no competing owner. Record the local skip reason, recheck target ref/migration history, and use exact-ID QA fixtures. Retain those demo fixtures when the owner asks; otherwise verify their cleanup. This does not authorize paid branches/projects, deployment, commits or changes once real-user data exists; in those cases obtain fresh target-specific owner approval.

## Simple owner explanation

1. **Local development:** own app checkout + a local test backend with fake users/properties. It is safe to test migrations, report thresholds and config changes here.
2. **Verify:** agent runs disposable SQL tests, relevant browser journeys, locale/error/permission checks and cleanup against that identified local target.
3. **Review:** demonstrate outcome and diff, then prepare migration/app rollout with compatibility and recovery plan.
4. **Shared running app:** only apply/deploy authorized versions after checks. No reset, global quota experiment or test account mutation in real users' backend by accident.

Browser frontend Preview and backend test isolation are separate things. A preview pointing at the real Supabase project still changes real data. CLI branch/worktree is source isolation, not database isolation.

## Concrete preflight for the implementation agent

- Read current TESTING.md; preserve pinned PGlite checks already available. Those are useful SQL checks, not a complete Supabase Auth/Storage/Realtime substitute.
- Check available Supabase CLI and Docker-compatible local runtime and their current documentation before installation/configuration. Multiple worktrees must not start colliding local ports/stacks; identify and never stop another chat's service.
- Use versioned config/migrations/seed to rebuild local baseline. Local fixture credentials ignored; no real resident data copied into seed.
- Confirm frontend env points to local backend ref/URL and local Auth/OAuth/redirect/sender behavior documented. Never print secrets or make local credentials look like deployed-provider proof.
- Reset commands only against a positively identified disposable local target; do not connect a destructive command to linked hosted project.
- Stub network providers for deterministic error/quota tests, then perform separately authorized real provider/channel verification. Local mail catcher proves dispatch shape, not actual delivery to a student domain.
- Global config/quota tests restore only isolated target. Hosted exact-ID QA remains possible only under task-specific authorization and does not replace isolation for global changes.
- No automatic Supabase preview branching: it may incur compute charges; no paid hosting/provider upgrade under the free-only decision.

## Evidence and sources

Official local CLI documentation supports running local Postgres/Auth/Storage with a Docker-compatible runtime; available machine resources still need verification: https://supabase.com/docs/guides/local-development/cli/getting-started . Managed preview branching has its own usage/billing model: https://supabase.com/docs/guides/platform/manage-your-usage/branching . Checked 16 October 2026.

Hosting eligibility/capacity is separate: Vercel documents Hobby for personal non-commercial use. Do not assume a startup pilot qualifies merely because it has no revenue; confirm applicable plan/credits/terms before a public commercial deployment, without unauthorized paid upgrade: https://vercel.com/docs/plans/hobby . Existing K1 stack choice is not changed by this unresolved operating constraint.

No local service started, Docker installed, account charged, hosted configuration changed or deployment made in this documentation task.
