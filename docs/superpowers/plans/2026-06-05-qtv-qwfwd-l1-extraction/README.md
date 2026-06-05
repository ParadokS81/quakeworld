# QTV + QWFWD -> Layer 1 extraction

**Spec:** `docs/superpowers/specs/2026-06-05-qtv-qwfwd-l1-extraction-design.md` (approved; corrected at `2b64c68e`)
**Seed:** `docs/superpowers/parking/2026-05-31-qtv-qwfwd-documentation.md`

**Goal:** Make both QuakeWorld streaming/forwarding tools first-class Layer 1 citizens, same shape as the engine ports -- every tunable knob extracted as a source-backed L1 entity carrying a source-verified description, MCP-queryable. Targets: Go QTV (`QW-Group/qtv`, slug `qtv`) + C QWFWD (qqshka, slug `qwfwd`), both vendored under `apps/slipgate-app/reference/`. Concept-note authoring is deferred to an evidence-based decision after the describe pass.

**Status:** Planning. Scaffold committed; slicing locked (5 phases, tracer-bullet through the load integration). Per-phase MDs are drafted by fresh terminals following `handoff-prompt.md`, each verified by a sub-agent before operator review. Phases land in commit order; each boundary is operator-reviewed before the next begins.

---

## Read in this order

1. **`prerequisites.md`** -- operator-side Task 0 (mostly verify-checks; Go + libclang toolchain are the real ones).
2. **`decisions.md`** -- 13 locked cross-cutting decisions. Every phase respects these. If a decision is wrong, amend it here (dated block); don't drift in a phase MD.
3. **`review-findings.md`** -- planner pre-flight findings (no prior plan; these are the verification evidence trail) + the phase-ownership table.
4. **`phase-template.md`** -- mandatory shape for each phase MD (includes the per-task execution-mode annotation + the sub-agent verification brief).
5. **Per-phase MDs** -- drafted in order; see the phase index below.

If you are the fresh terminal about to draft a phase, also read **`handoff-prompt.md`** (generate the per-phase prompt from it).

---

## Phase index

Phases land in order. Each commits a coherent runnable unit (decisions.md D11). Operator reviews at each boundary.

| Phase | Status | MD | Deliverable | Runnable state at end |
|---|---|---|---|---|
| 0 | approved | `phase-0-schema-plumbing.md` | Migration 020 (10 CHECKs / 9 tables) + `Project` union widened + 12 `Record<Project>` sites filled (`versions` rows deferred to Phase 1/2 first load) | DB accepts `qtv`/`qwfwd` rows; `tsc --noEmit` green |
| 1 | not started | `phase-1-qwfwd-extractor.md` | QWFWD libclang extractor on `extractor_lib` rails + the vendored `load-version --json` procedure established | QWFWD L1 rows loaded + MCP-queryable; extractor reproducible + idempotent |
| 2 | not started | `phase-2-qtv-extractor.md` | QTV native `go/ast` extractor (first non-C front-end) -> same per-type JSON, reusing Phase-1 load path | QTV L1 rows loaded + MCP-queryable; reproducible + idempotent |
| 3 | not started | `phase-3-describe-fill.md` | Per-knob `describe-fill-synthesis` (both tools), source-verified, C-vs-Go QTV guard, mother-ledger | Every qtv/qwfwd knob carries a source-verified description in MCP |
| 4 | not started | `phase-4-validate-decision.md` | `validate-extractor` (Postgres) + F1 floor probes for both + the if/which concept-note decision | Both extractors validated; concept-note decision documented; arc complete |

Status flow: `not started` -> `drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`.

---

## Slicing rationale (locked 2026-06-05)

Technique: **horizontal foundation -> tracer bullet -> second slice -> operator-gated fill -> validate.**

- The arc's real risk is the **load integration** (the loader orchestrator `extract-tag.ts` can't drive frozen, no-`.git`, Go targets -- review-findings F2). Phase 1 fires a lean end-to-end slice through that integration using the *lower-risk* libclang extractor (QWFWD), retiring the load-path risk before Phase 2 adds the novel Go front-end. One new variable per phase.
- Phase 0 is a self-contained horizontal foundation both later phases need (schema + the compiler-enforced `Project` plumbing), independently verifiable.
- No verification-regime collisions: every phase's probes are self-contained (MCP already exists, so smoke queries don't need a later phase). Context budgets all sit under 500k with subagent-heavy execution.

Alternatives considered and rejected at the slicing lock: merging schema into Phase 1 (loses Phase-0 atomicity); QTV-first (couples two novelties, can't localize a failure); extending `extract-tag` (adds git-less/Go branching to a tool whose purpose doesn't apply).

---

## What this arc deliberately does NOT cover

Per `decisions.md` D13:
- `fteqtv` as an extraction target (protocol-origin / historical reference only).
- The `hub.quakeworld.nu` web QTV viewer.
- Re-opening the MVDSV `qtv_*` L1 rows (See-also anchors, not re-litigated).
- The pending MVDSV `qtv_password` description trim (separate micro-decision).
- Concept-note authoring (deferred; decided in Phase 4).
- `qqshka/qtv-go` (Go 1.19 predecessor; byte-identical config, no extraction value).

If a phase drifts into one of these, flag it as scope creep.

---

## Operator quick-reference

- **Draft a phase:** generate `phase-<N>-drafter-prompt.md` from `handoff-prompt.md`, open a fresh terminal, attach it with `@<path>`. The terminal drafts, runs sub-agent verification, halts.
- **Review a drafted phase:** read the MD top-to-bottom, run its verification probes, eyeball file lists + execution-mode annotations, sign off (`approved` in this table) or return for revision.
- **A finding conflicts with a decision:** the decision wins; reject the finding with a one-line rationale in the phase's "Open questions." If the decision itself is wrong, amend `decisions.md` first.
- **A new finding emerges:** append to `review-findings.md` with a sequential F-number + the phase it touches.

Wave 2 (arc-orchestrator / arc-executor) can drive execution once phase MDs are approved; until then the operator drives executor terminals manually per phase.
