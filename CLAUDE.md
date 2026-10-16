# Shutaf agent instructions

Read and follow [AGENTS.md](AGENTS.md); it owns the shared execution workflow. [DECISIONS.md](DECISIONS.md) is the product/architecture authority. This file intentionally does not duplicate those rules.

For next-feature or continue-project requests (including Hebrew), follow [START_NEXT_WORK](docs/START_NEXT_WORK.md) and run `node scripts/next-work.mjs --json`. Choose the next eligible packet without asking the owner for an ID, verify actual prerequisites, complete missing approved work and maintain the execution ledger and shared handoff. Preserve settled decisions and unrelated dirty work. Planning readiness never means completed, integrated or deployed. External actions require applicable authorization.
