# Review findings -- game-content-catalog

No prior plan exists for this arc (the brainstorm went straight to spec); there is no legacy plan to walk. This ledger opens with the findings from the 2026-06-11 planner pre-flight (live-source verification of the spec's claims) and accrues new findings during phase drafting and execution. New findings append with sequential F-numbers and a phase-ownership tag.

Decisions in `decisions.md` are the FIX; this file is the WHY. Phase drafters consult both.

---

## Pre-flight findings (2026-06-11, planner session)

### F1 -- spec M3 cites a deleted script (`idempotency-ktx.sh`)

**Resolved by:** D13 (phase-local seed double-load probe).

**Evidence:** `idempotency-ktx.sh` was deleted 2026-05-08 and lifted into `scripts/load-knowledge/idempotency.ts` (arc-history line 176; header comment of `idempotency.ts`). The lifted probe is extract-tag-scoped by design -- it re-runs `extract-tag` and explicitly excludes the `qw` namespace ("id1 is a separate seed namespace, not extracted via extract-tag"). It cannot cover seed-YAML loads.

**Action:** Phase 0 ships a small seed-idempotency probe (load twice, diff counts + content hash of an ordered row dump) reused by Phases 1-4. Do NOT extend `idempotency.ts` -- its scoping decision is deliberate (its own D1).

### F2 -- hardcoded count STOP-gate would brick every load this arc performs

**Resolved by:** D8 (expected_counts block in each seed YAML).

**Evidence:** `scripts/load-knowledge/index.ts:573-581` hardcodes `expectedEntities=37 / expectedMechanics=41` and sets `process.exitCode = 1` on mismatch. Phase 1 (new mechanics rows), Phase 2 (monsters), and Phase 4 (props edits do not change counts, but Phase 2's monster rows do) all trip it. Worse, a `--yaml ktx-gameplay.yaml` load would be validated against the id1 numbers.

**Action:** Phase 0 task. Per-file `expected_counts` declared in the seed; loader validates against the file's own declaration.

### F3 -- ktx gameplay rows acquire a second writer; key collisions ping-pong silently

**Resolved by:** D9 (keyspace disjointness + probe).

**Evidence:** Extractor-path loaders (`load-gameplay-tables.ts:195,249`, `load-gameplay-taxonomies.ts:122,157`, `load-modes.ts`) upsert via `ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE`, no DELETE. The new seed path (`ktx-gameplay.yaml` via `load-gameplay.ts`) uses the same conflict target. Coexistence is safe ONLY if seed keys never equal extractor keys; a collision means each writer overwrites the other on every re-run with no error.

**Action:** Phase 3 ships a disjointness probe and the YAML header documents the rule. Note the extractor-path loaders only ASSERT the `gameplay_sources` ktx row exists -- the seed loader is the sole registry-row writer, so `ktx-gameplay.yaml`'s `gameplay_source:` block becomes the canonical owner of that row's display_name/description/notes (record overlay provenance there).

### F4 -- `verify-gameplay.ts` asserts stale totals AND source-unscoped per-kind counts

**Resolved by:** Phase 4 (spec M3 ride-along; standing HANDOVER:43 item folds in).

**Evidence:** `serve/mcp/scripts/verify-gameplay.ts:61-62` asserts totals 37/41 vs live 50/487 (already failing per HANDOVER). Additionally `:52` asserts `env_hazard` count 7 and `:55` asserts `death_rule` count 7 -- but `searchMechanics` results depend on source scoping, and live data has id1 death_rule=7 PLUS ktx death_rule=27. Any fix must be gameplay_source-aware, not just count-bumped, and must re-baseline again after Phases 1-3 land new rows.

**Action:** Phase 4 drafter reads the live tool implementations (does `searchMechanics` default-filter by source?) before writing assertions; parametrize totals or derive from per-source sums.

### F5 -- `gameplay_sources` source_root forms are inconsistent (leading slash)

**Resolved by:** D7 (two-form rule legalizes both).

**Evidence:** Live registry: `id1 -> research/repos/qwcl-original/QW/progs/` (relative), `ktx -> /research/repos/ktx/src` (leading slash). Both intend repo-root-relative.

**Action:** No data churn. The citation gate strips a leading `/` before joining; SCHEMA.md's D20 subsection documents both forms as equivalent.

### F6 -- SCHEMA.md v14/KTX section count drift

**Resolved by:** Phase 4 (D20 doc deliverable).

**Evidence:** SCHEMA.md's KTX-onboarding section says `mode_default: ~309`; live DB and `quality-grid.ts:2658` agree on 317. Minor narrative drift; worth correcting while the D20 subsection lands in the same file.

**Action:** Phase 4 drafter verifies every count it writes against the live DB at drafting time (D20 implication).

### F7 -- locked falloff row mischaracterized the combat.qc clamp (drafting-time, resolved)

**Resolved by:** planner amendment to `phase-1-audit.md` (2026-06-11, at Phase 1 review).

**Evidence:** The Phase 1 draft's locked `splash_falloff_gradient` row carried `clamp_rule: points_below_zero_clamped_to_zero` citing `combat.qc:274`. Source order: the `:273-274` clamp bounds the DISTANCE TERM before the `points = damage - points` subtraction (`:275`) -- dead code in practice, since `vlen` is non-negative. The actual no-negative-damage behavior is the `if (points > 0)` delivery gate at `:279`. The drafter's verification sub-agent touched this exact prop (corrected the line 273 -> 274) but fixed only the line number, not the meaning.

**Lesson (for Phase 2/3 drafters + verifiers):** a citation can be line-accurate and semantically wrong. Verification briefs should ask "what ROLE does the cited line play in the mechanism?", not only "does the line contain the value?". Same class as the F29 probe-predicate discipline, applied to row props.

### F8 -- quake.fandom.com is Cloudflare-bot-blocked via Jina; quakewiki.org is the monster cross-check primary (drafting-time, resolved)

**Resolved by:** Phase 2 MD design (quakewiki.org primary; fandom best-effort degrading to a STUB file per D15).

**Evidence:** Phase 2 drafting recon 2026-06-11: `r.jina.ai` fetches of quake.fandom.com return HTTP 403 "Just a moment..." (Cloudflare bot gate). quakewiki.org resolves richly via Jina, and its `/wiki/<classname>` URLs redirect correctly for the full roster (planner re-verified `monster_shambler` live at review: Health 600, gib threshold -60, half-explosion-damage note all present). Spec M3 said "each wiki"; primary + best-effort is an adaptation WITHIN D15's degrade-gracefully rule -- no decision amendment needed.

**Action:** none open -- baked into Phase 2 Task 2 (the fetch loop writes a STUB with the block reason when fandom 403s; `_manifest.json` records `fandom_status`). If a fandom value is ever genuinely needed, fetch outside Jina or arbitrate via the pak `progs.dat` (D1/D2).

---

## Phase ownership of findings

| Phase | Findings to verify before sign-off |
|---|---|
| Phase 0 | F1 (probe ships here), F2 |
| Phase 1 | F7 (resolved at drafting by planner amendment; execution audit findings will append here) |
| Phase 2 | F8 (resolved at drafting -- wiki-snapshot design adaptation) |
| Phase 3 | F3 |
| Phase 4 | F4, F5 (doc text), F6 |

---

*New findings discovered during phase drafting or execution append here with sequential F-numbers, evidence, the resolving decision (or "UNRESOLVED -- flagged for Phase N"), and an ownership-table update.*
