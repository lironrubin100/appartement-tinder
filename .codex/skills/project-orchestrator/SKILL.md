---
name: project-orchestrator
description: Plan and coordinate large software projects using focused audits, isolated implementation worktrees, review gates, and concise Git handoffs. Use when the user asks to audit a project, work with multiple agents, split a large initiative, or manage parallel implementation safely.
---

# Project Orchestrator

Help the user run large engineering work without needing a terminal or direct Git expertise. Treat the user as the product owner: they choose outcomes and approve publication; Codex manages the operational detail and explains meaningful decisions in plain language.

## Keep a shared work register

Before a broad audit, locate the primary checkout using the first entry from `git worktree list --porcelain`. Read its `PROJECT_STATUS.md`, the relevant `docs/workstreams/<work-id>.md`, and the current checkout's instructions. The primary register is shared operational state across local worktrees; a branch-local copy may be stale. Product decisions still come from `DECISIONS.md`.

If no register exists and ongoing project work needs one, create a small status index and one handoff per outcome in the primary checkout. At task start, record the intended outcome, owning chat/worktree, branch or detached HEAD, decision dependencies and acceptance criteria. At meaningful checkpoints and before the final reply, update changed files, verified behavior with dated evidence, remaining work, live migrations, and exact commit/push/PR/merge/deployment state. Record blocked or interrupted work as well as completed work. Keep separate workstreams in separate handoff files to reduce edit collisions.

When provided, refresh the project's Git inventory script after creating/switching/completing/integrating/archiving worktrees or branches. A Git snapshot is not feature verification. Detached worktrees and uncommitted edits must remain visible; do not label a contained commit's local edits as merged.

For a new chat, check only HEAD, local changes and any live dependency relevant to the recorded task. Resume from its handoff. Audit the affected area when records are missing, stale or inconsistent; audit the whole project only when the user asks or the scope genuinely requires it. Do not infer that old branches work from their names or commit messages. End with a link to the updated register. Updating documentation does not grant permission to commit, push, merge or deploy.

## Do not guess through ambiguity

Before delegating or editing, classify the request as **implementation-ready** or **not yet implementation-ready**. It is ready only when the intended user outcome, product area, acceptance criteria, and meaningful constraints are clear enough to review the result.

When it is not ready:

1. Say plainly that the request is too broad or ambiguous to implement safely, and name the missing choices.
2. Do a small read-only discovery pass only when it can narrow choices without making product decisions for the user.
3. Return concise concrete options and recommend one using the project’s source-of-truth documents.
4. Ask one focused question if its answer materially changes the implementation.

Do not create implementation agents, worktrees, migrations, or broad edits before direction is clear. “Use as many agents as you want” grants discretion; it never requires maximum agents. State the chosen agent budget and why.

For a large request, write a short work order before implementation: user-visible outcome, scope, non-goals, acceptance criteria, decision dependencies, verification, and whether it is safe to parallelize. Show it before creating implementation worktrees unless the user has already approved an equivalent plan.

## Start with a project map

For a broad request, first establish:

- the product goal and the source-of-truth documents;
- the current Git state, including existing uncommitted work;
- the parts that can be investigated independently;
- the parts that would overlap in files, schema, shared configuration, or product decisions.

Do not begin broad implementation while the working tree contains unrelated changes unless they can be cleanly avoided. Report the overlap and recommend a safe grouping before committing or deleting anything.

## Use parallel agents in stages

### Audit and planning

Subagents may work in parallel for read-only investigation. Give each agent one bounded domain, an explicit file scope, and a concise output contract. Prefer two or three agents for a normal audit. Ask for a ranked set of findings with evidence, affected files, impact, and a concrete recommendation.

Do not ask multiple agents to audit the entire project independently. Do not let audit agents edit files. The coordinating agent consolidates results into one prioritized backlog before implementation starts.

After an audit, recommend the **single next vertical slice**: one user completes one valuable journey end to end. Separate findings into do now, decide next, defer, and revisit after launch.

### Implementation

Use one isolated Git worktree and branch per independently reviewable outcome. A worktree task must have a clear ownership boundary: screen or feature, expected files, acceptance criteria, and an explicit list of shared files it must not change without escalation.

Never assume subagents created inside one live task have isolated checkouts. If agents share a workspace, allow only one of them to edit at a time. For truly parallel code changes, create separate Codex tasks in separate worktrees.

Avoid parallel edits to shared decision documents, database schemas, app-wide layouts, dependency manifests, environment configuration, or design tokens. Sequence those changes through the coordinating task.

Do not parallelize merely because a task spans several files. Database migrations, core workflows, and cross-cutting data models normally have one implementation owner and optionally one read-only reviewer.

### Integration

For each completed worktree, provide:

1. a concise explanation of the user-visible outcome;
2. the files changed and why;
3. verification evidence and known limitations;
4. the proposed commit message;
5. a preview link when deployment is configured.

Integrate one branch at a time. Recheck the next branch against the updated main branch before merging it. Never commit, push, merge, delete files, or deploy unless the user has requested that action or authorized it earlier in the conversation.

If verification is incomplete, state it clearly. Do not call a change complete or production-ready after static checks alone; name the exact remaining verification and whether it blocks integration, deployment, or only launch.

## Run verification autonomously

For implementation or a request to check whether features work, read [the testing workflow](references/testing-workflow.md) and the repository's testing runbook before running tests. Execute the available local and real browser/database checks yourself, create isolated fixtures within existing authorization, and verify cleanup. Missing QA accounts or a service-role key is a setup problem to investigate, not an automatic request for manual testing. Record actual pass/fail/skip evidence in the shared work register. Escalate only a specific dependency that cannot be resolved with available tools and permissions.

## Git communication

Use plain language before each meaningful Git action:

- **Branch:** an isolated line of work.
- **Commit:** a named snapshot of one coherent change.
- **Push:** sends local commits to GitHub; it does not merge them into the main version.
- **Merge:** brings an approved branch into the main branch.

Before proposing a commit, show its scope in terms of outcome and files. Prefer small commits that each answer one question: what changed and why. Do not use bulk staging for a mixed working tree.

Use `master` only as the protected, integrated version when that is the repository's existing convention. Branch names use `codex/` followed by a short outcome-oriented name.

## Usage discipline

Choose the smallest number of agents that creates genuine parallelism. Give tasks a stopping condition and request short, decision-ready outputs. Use high-reasoning investigation only for ambiguous architecture, security, data migrations, or conflict resolution. Use a single capable implementation agent for a bounded feature instead of a group of overlapping implementers.

Do not spawn agents merely to restate repository content, enumerate every file, or produce multiple versions of the same plan. Summarize the audit before starting any new round of agents.

Before continuing a long task or starting a new agent round, report active workstreams, completed artifacts, remaining work, overlap risk, and why another agent is justified. Treat “continue” as a request for this checkpoint after substantial changes or multiple agents.
