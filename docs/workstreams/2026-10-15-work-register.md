# Shared project work register

- Status: implemented; local documentation and skill updates; not committed/pushed.
- Updated: 15 October 2026, Asia/Jerusalem.
- Owning chat: `01a13c2d-9321-7ed0-b409-efc64b402f54`.
- Owning implementation checkout: d5e9, detached at `b1f12e66225c97602c36abef8ab53e1eec35e600`.
- User outcome: new conversations can find branches, worktrees, completed capabilities, evidence and next steps without repeating a project-wide audit.
- Shared location: primary checkout `C:/Users/User/Desktop/appartement tinder/PROJECT_STATUS.md`, with `docs/workstreams/` for handoffs and generated `docs/WORKTREE_INVENTORY.md` for Git facts. Derive the primary path from Git if it moves.
- Changed files: `PROJECT_STATUS.md`, `AGENTS.md`, `.codex/skills/project-orchestrator/SKILL.md`, `scripts/project-status.mjs`, and these status/handoff documents. The user-level skill at `C:/Users/User/.codex/skills/project-orchestrator/SKILL.md` carries the same work-register protocol. The primary checkout receives the entry point, instructions, script and handoffs so this remains discoverable from other worktrees.
- Lifecycle: create a row/handoff at task start; update at meaningful checkpoints and at finish/interruption; record local verification separately from merge/deployment; refresh the Git inventory when branch/worktree state changes. Each chat owns its handoff file; coordinate index edits and reread before writing.
- Verification: inventory script reads all linked worktrees and local branches without checking out or changing Git history. Snapshot identifies 14 worktrees and 10 named local branches. Skill frontmatter and syntax are validated after installation. Existing legacy work is marked unregistered/unverified, not silently described as complete.
- No live database changes for this documentation task. No branch creation, commit, push, merge, deployment or recurring automation is implied by the register.
- Next step: each ongoing older workstream should add its own evidence-backed handoff the next time it is resumed. Do not audit all of them merely to fill blank status cells. Documentation is stored on disk and available to local chats; a future authorized commit/push is needed for GitHub/cloud portability.
