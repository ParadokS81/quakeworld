# docs.quake.world -- review findings (evidence ledger)

**No prior plan attempt exists for this arc.** Unlike qw-oracle Arc 1 (which had a 3596-line monolithic plan to mine for bugs), docs.quake.world goes straight from spec to scaffold. So this ledger is NOT a post-mortem of a prior draft. It is seeded with the **known hazards** arc-planner found while reading the live producer (`build-snapshot.ts`), the schema, and the precursor's verified notes -- the things a phase drafter must design around. Further findings accrue here (sequential F-numbers) as phases are drafted and verified.

Each finding: what it is, the evidence, severity, and which decision resolves it.

---

## F1. build-snapshot extension must not break slipgate's snapshot consumption (HARD GATE)

**What:** `build-snapshot.ts` is the producer Phase 1 extends. It already writes slipgate-shaped JSON into `apps/slipgate-app/src/lib/config/data/` for ezquake, qwcl, and qw (maps/gameplay), and slipgate's loaders read those exact files. Extending the producer to emit the other codebases for docs must not perturb those files' shape.

**Evidence:** `build-snapshot.ts:43` (`DEFAULT_OUTPUT_DIR` = slipgate data dir), `:723-744` (per-project dispatch; `:743` THROWS for any project other than ezquake/qwcl/qw). The ezquake emitters (`emitEzqVariables` etc.) and `emitQwclVariables` produce the precise legacy shapes slipgate depends on (the file header comment, lines 1-29, states "Shape parity with the legacy JSONs is preserved so slipgate's loaders need zero structural change").

**Severity:** CRITICAL. A shape regression silently breaks slipgate's config viewer.

**Resolved by:** D12 (docs export is a separate emit path writing to a docs-owned dir; existing emitters untouched). Phase 1 verification regime MUST carry a slipgate-parity probe (the ezquake/qwcl/qw files in slipgate's data dir are shape-identical pre/post the Phase 1 change). Record the pre-change file hashes in `prerequisites.md` Task 0.

## F2. Non-ezQuake export shape is consumer-validated only at Phase 3 (regime smell)

**What:** The spec's phasing exports all 6 codebases in Phase 1 but renders only ezQuake in Phase 2; the other 5 codebases' JSON is not exercised by a real consumer (the renderer) until Phase 3. If Phase 1 freezes a shape that does not actually render for, say, KTX `log_template` or MVDSV `protocol_message`, that surfaces in Phase 3, not Phase 1 -- a "phase N verification depends on phase N+1" smell.

**Evidence:** Spec section 12 (phasing) + section 13 (data appendix: KTX/MVDSV/QTV/QWFWD carry entity types ezQuake does not -- log_template, protocol_message, qc_builtin, info_key, match_event).

**Severity:** SUBSTANTIVE. Not a regime COLLISION (Phase 1 has a self-contained verification: the JSON is well-formed and the uniform-shape contract holds), but a latent integration risk.

**Resolved by:** D13 (uniform record shape -- absent fields omitted, so non-ezQuake types are SUBSETS of the union shape) + D14 (type-generic renderer -- Phase 2 builds the renderer against the generic record, not an ezQuake-special path). Mitigation baked into slicing: Phase 1 emits the uniform shape for ALL types across all 6 codebases AND ships a schema-shape probe (every emitted record validates against the uniform shape); Phase 2's renderer consumes the generic record so that Phase 3 is data-only. If Phase 3 needs new component code, that is a Phase 2 failure (D14 implication) -- escalate.

## F3. category-version inversion (qtv/qwfwd/qwcl read frozen, not head)

**What:** The precursor wrote `category_inferred` to ALL version rows per entity. But qtv/qwfwd/qwcl carry TWO version rows each (frozen + `head`), and the snapshot reads the frozen one (`1.16-dev` / `1.40-dev` / `2.33`). An emitter that reads `head` for those three would diverge from the slipgate convention and risk reading the wrong row.

**Evidence:** Precursor `taxonomy.md` ("`category_inferred` write target: ALL version rows per entity ... the snapshot reads the frozen one ... writing only head would be invisible to the snapshot") + `build-snapshot.ts:683-692` (`PROJECT_DEFAULT_SNAPSHOT_VERSION`: qtv `1.16-dev`, qwfwd `1.40-dev`, qwcl `2.33`).

**Severity:** SUBSTANTIVE. Wrong-version read yields empty or mismatched categories for three codebases.

**Resolved by:** D16 (emit at the per-codebase frozen version) + a Phase 1 probe asserting non-empty category coverage for qtv/qwfwd/qwcl at their frozen versions.

## F4. ezQuake category + groups taxonomy depend on extractor AST output (not just the DB)

**What:** ezQuake's category render needs the `groups` taxonomy block, which `build-snapshot.ts` reads from the extractor AST output JSON (`scripts/extractors/ezquake/output/ezquake-variables-ast.json`), not from Postgres. If that file is absent, the ezQuake emit throws.

**Evidence:** `build-snapshot.ts:29` (comment: "Group taxonomies ... live in the extractor AST output, not knowledge.db"), `:299-305` (`readExtractorAst` throws if the file is missing), `:316` (ezQuake variables emit reads it).

**Severity:** ADVISORY (it is a prerequisite, not a design flaw). The file exists today (slipgate's ezquake emit already uses it).

**Resolved by:** D17 (ezQuake reads `groups`; others read `category_inferred`) + `prerequisites.md` Task 0 (confirm the extractor AST output JSONs are present before Phase 1). The docs emitter for the OTHER 5 codebases avoids the AST dependency (they use `category_inferred` from the DB).

## F5. Category exists only on cvar + command (other types are uncategorized)

**What:** `category_inferred` lives only on `cvar_versions` and `command_versions`. Other entity types (info_key, cmdline_param, log_template, protocol_message, qc_builtin, match_event, macro, ...) have no category. A drafter expecting per-type categories everywhere would build a filter that is always empty for those types.

**Evidence:** SCHEMA.md `cvar_versions` / `command_versions` carry `category_inferred` (migration 016); no other `*_versions` table does.

**Severity:** ADVISORY. Handled by graceful degradation.

**Resolved by:** D17 implication (uncategorized types degrade to a single "(uncategorized)" group; the Flat/Grouped toggle still works, Grouped just shows one group). D11.

---

## Findings-to-phase ownership

| Finding | Severity | Owned by phase | Resolving decision |
|---|---|---|---|
| F1 slipgate-parity gate | CRITICAL | Phase 1 | D12 + parity probe |
| F2 non-ezQuake shape validated late | SUBSTANTIVE | Phase 1 (emit uniform + probe) + Phase 2 (generic renderer) | D13, D14 |
| F3 category-version inversion | SUBSTANTIVE | Phase 1 | D16 + coverage probe |
| F4 ezQuake AST-groups dependency | ADVISORY | Phase 1 (+ prereqs Task 0) | D17 |
| F5 category only on cvar+command | ADVISORY | Phase 2 (renderer) / Phase 3 (fan-out) | D17, D11 |

New findings append below with the next sequential F-number and a phase owner.
