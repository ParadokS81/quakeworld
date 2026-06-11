# Prerequisites -- operator-side Task 0

Almost everything in this arc is agent-doable (the v1.06 QC acquisition is Phase 0 agent work, not an operator task). The operator-side list is short; the first item is the only hard gate.

---

## Execution gate (the one that matters)

- [ ] **First Track-A weapon-pair notes shipped.** Execution of Phase 0 starts only after the demand-driven-l3 arc ships its first weapon-pair concept notes (operator-locked sequencing, spec M4 / plan D16). Drafting all phase MDs does NOT wait on this -- only execution does.

## Environment (verify once before Phase 0 execution)

- [ ] **Postgres dev container running.** `docker ps` shows `qw-oracle-postgres-dev` (pgvector/pgvector:pg16). All loads target `qw_oracle`; the loader-extension test targets `qw_oracle_test` (same container).
- [ ] **pak progs.dat available.** `apps/qw-oracle/data/pak-cache/` holds the extracted id1 pak content -- the runtime oracle for wiki-vs-source fidelity disputes (plan D2). Already in place from the maps arc; confirm it still exists.
- [ ] **Jina reader reachable.** Phase 2's wiki snapshot prep fetches ~30 pages via `https://r.jina.ai/<url>`. No API key needed at the free tier; just confirm WSL has outbound HTTPS.

## What this list deliberately does NOT include

- API keys -- none needed. All batch LLM work runs through Workflow `agent()` under the Max subscription (plan D10).
- The v1.06 QC source acquisition -- Phase 0 agent work (clone/download + provenance + spot-verify).
- Anything the phases create (probe scripts, YAML files, doc sections).

## Sign-off

When the execution gate is met and the three environment boxes are checked, hand a fresh terminal the Phase 0 executor prompt.
