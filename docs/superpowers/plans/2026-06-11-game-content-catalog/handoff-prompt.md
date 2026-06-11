# Handoff prompt -- template for per-phase drafter prompts

This file is the TEMPLATE the planner/orchestrator consumes when generating per-phase drafter prompts. The operator does NOT use this file directly.

**Operator workflow:** open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/` and type `@docs/superpowers/plans/2026-06-11-game-content-catalog/phase-<N>-drafter-prompt.md` as the first message. The per-phase files are pre-substituted and self-contained (file-as-prompt shape: no wrapper text, no copy-paste markers).

Pre-substituted prompts in this directory:

- `phase-0-drafter-prompt.md` -- prereqs + loader rework
- `phase-1-drafter-prompt.md` -- id1 audit
- `phase-2-drafter-prompt.md` -- id1 monsters
- `phase-3-drafter-prompt.md` -- KTX overlay
- `phase-4-drafter-prompt.md` -- join keys + docs + surfacing

Drafting order is 0 -> 1 -> 2 -> 3 -> 4. Phases 1 and 2 prompts can draft in parallel terminals if desired (different YAML clusters, no shared draft state); 3 should wait for 1+2 drafts so its baseline references are stable; 4 last. When in doubt, sequential.

Executor prompts (`phase-N-executor-prompt.md`) are NOT pre-written; they are generated at execution kick-off (by the orchestrator session, or by the operator re-using the drafter prompt shape with "execute" framing) once the phase MD is approved.

---

## Template shape (what every per-phase prompt contains)

1. **Arc identification block** -- arc slug + date (2026-06-11 game-content-catalog), plus tell-tale signs of sibling-arc contamination so a misdirected drafter self-detects and halts.
2. **Working directory** and paper-only rule (drafting modifies nothing outside the plan directory).
3. **Required reads** (numbered; scaffold first, then phase-specific live sources).
4. **Phase scope** (what the phase delivers, pinned to spec + decisions sections).
5. **Drafting rules** (ASCII discipline, decisions to respect by D-number, content-conditional execution-mode annotation).
6. **Step-by-step** (read -> recon -> draft -> verify-dispatch -> apply findings -> halt).
7. **Halt-and-handback shape** (MD path, verifier finding counts, open questions, ready-or-needs-pass recommendation).

## Recovery: a phase MD comes back wrong

If operator review finds the MD buggy after sub-agent verification: do NOT re-prompt the same terminal (context now anchored on the wrong draft). Open a NEW fresh terminal, attach the same per-phase prompt, and prepend one paragraph: "The previous draft at <path> had these issues: <X, Y, Z>. Redraft; don't preserve the old draft's bugs." (`feedback_fresh_context_for_execution.md`)
