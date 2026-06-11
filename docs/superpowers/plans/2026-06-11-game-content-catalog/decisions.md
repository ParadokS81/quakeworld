# game-content-catalog -- locked cross-cutting decisions

These choices apply to every phase. If any phase needs to deviate, surface a "deviation" section at the top of that phase MD and stop for operator review. Mid-arc amendments land here as dated amendment blocks; never silently override in a phase MD.

Numbering note: D-numbers in this file are PLAN decisions. The design spec
(`docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md`) has its
own D1-D7 + M1-M5; this file cites those as "spec D2", "spec M3", etc. When a
drafter sees a bare "D8" in arc-plan context, it means THIS file.

---

## D1. Completion arc: re-verify, never recreate

**Decision:** The id1 baseline (37 entity defs + 41 mechanics, shipped 2026-04-27) is live and rich. This arc audits and extends it; no row is rewritten from scratch unless the audit finds a concrete citation or value error. Prior verified-state is a hypothesis (operator memory `feedback_parking_verified_state_is_hypothesis.md`); the Phase 1 audit converts it into verified-under-current-regime state.

**Why:** The genesis framing ("never extracted") had decayed; the brainstorm pre-flight verified the baseline live (spec "The reframe"). Recreating would churn ~400 cited props for zero gain.

**Implication:** Phase 1's gap sweep is exhaustive over `QW/progs/` (~20 QC files); Track-A note demands are prioritization input, NOT the boundary (spec D4). Phase drafters treat existing YAML rows as the template for every new row.

## D2. Source-truth hierarchy: source cites, cross-checks never cite

**Decision:** QC source (id1) and C source (KTX) are the only citable sources. Wikis (quake.fandom.com, quakewiki.org) and the pak `progs.dat` are cross-checks; wiki-vs-source mismatches go to the arc findings doc and the SME gate, never into rows. The pak `progs.dat` in `data/pak-cache/` is the runtime oracle for fidelity disputes.

**Why:** Spec D1 + M3; standing source-truth dichotomy (`project_qw_oracle_source_truth.md`).

**Implication:** Every `source_ref` / `*_source_ref` points into a source tree under `research/repos/`. No row ever cites a wiki URL.

## D3. Gate vocabulary joins the game_mode catalog

**Decision:** `ruleset_gate_json` uses `{"mode":"<token>"}` where the gate is a cataloged mode/mutator (yawnmode, midair, instagib, bloodfest, ...; tokens from the 27-row ktx `game_mode` catalog), `{"dm":N}` for deathmatch-number gates not covered by the id1 props convention. Single-key gates only (KTX onboarding arc D8 convention). Compound conditions: the mode stays the gate; the secondary condition goes in props (e.g. midair rocket boost: gate `{"mode":"midair"}`, props `requires_quad: true`).

**Why:** Spec D3 (operator-ratified principle: baseline + named delta, joinable by the same word). `describe_mode` assembles a mode's hardcoded overrides with zero new wiring only if the tokens match.

**Implication:** Phase 3 drafter verifies every gate token against the live `game_mode` catalog (`SELECT name FROM gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='game_mode'`) before locking the YAML. Never invent a second vocabulary.

## D4. Three-layer rule: this arc ships hardcoded behavior deltas only

**Decision:** Within the four KTX file families (`weapons.c`, `items.c`, `combat.c`, `sp_*.c`), every cvar/mode-gated VALUE divergence from an id1 baseline row earns a ktx row -- exhaustively, no hand-picked subsets. What does NOT earn rows here: knob existence (KTX cvar track), what modes set knobs to (`mode_default`, 317 rows), id1-native dm1-4 variants (props on id1 rows: `damage_dm_gt_3`, `refire_seconds_dm4` convention).

**Why:** Spec D2. The three layers already exist; duplicating them corrupts row identity and the describe_mode join.

**Implication:** Phase 3's per-file sweep prompt carries this filter explicitly. The known inventory from the 2026-06-11 source scan (spec D2 list: yawnmode / midair / instagib / bloodfest / dmm4 / CTF runes / k_dis / k_hitboxcheck_bullets / k_classic_shotgun) is the floor, not the ceiling.

## D5. One YAML per source; one assembler per phase

**Decision:** `id1-gameplay.yaml` grows (monsters cluster, audit corrections, new mechanics rows, `map_summary_key` props). NEW `ktx-gameplay.yaml` carries the override layer with its own `gameplay_source: ktx` block. Within any phase, exactly ONE inline assembler (the executor main thread) writes YAML from verified fan-out outputs -- subagents never write the seed files.

**Why:** Spec M1/M2.4. Uniform style; the loader's one-source-per-file shape; prevents merge collisions between fan-out agents.

**Implication:** Phases 1, 2, 4 write `id1-gameplay.yaml` sequentially (audit -> monsters -> join keys); Phase 3 writes `ktx-gameplay.yaml`. Sequential phases, no parallel YAML writers.

## D6. Monsters: id1-sourced ungated stat rows; KTX deviations as overlay

**Decision:** New monster rows: `kind='monster'`, `gameplay_source_id='id1'`, gate `{}`, full roster exhaustively (~15 incl. boss/oldone/fish; exact count pinned at Phase 2 execution). Health, attack damage (dice), projectile speeds, behavior props -- in `props_json` (the table has no health column; indexable columns stay weapon/item-shaped). The existing 13 ktx bloodfest rows (gate `{"mode":"bloodfest"}`, spawn-economy fact-family) are UNTOUCHED. KTX `sp_*.c` diffs against id1 QC; deviations become ktx-source overlay rows; if KTX is faithful, zero ktx stat rows result.

**Why:** Spec D1 (operator rationale: the oracle covers Quake 1 itself; single-player is reachable runtime content via ezQuake's built-in server).

**Implication:** Two rows per monster under different gates/sources is the established pattern. Phase 2 defines the monster prop vocabulary once (header comment in the monsters cluster) and applies it uniformly.

## D7. Citation resolution: two-form rule (resolves spec P2)

**Decision:** `source_ref` values resolve in two forms: (a) default -- relative to the owning source's `gameplay_sources.source_root`; (b) leading `/` -- relative to the monorepo root. `gameplay_sources.id1.source_root` stays `research/repos/qwcl-original/QW/progs/` unchanged; the ~400 existing refs are untouched. New id1 monster rows cite the acquired v1.06 QC tree with the leading-slash form (e.g. `/research/repos/<v106-tree>/soldier.qc:54`). The citation gate (D13) strips a leading `/` from `source_root` values too, which legalizes the live ktx row's `/research/repos/ktx/src` as-is.

**Why:** Spec P2 left this as planner's call. Widening the id1 root would churn every existing ref plus `verify-gameplay.ts` assertions and reads ("weapons.qc:385") that downstream surfaces display. The two-form rule costs one sentence in SCHEMA.md and one branch in the gate.

**Implication:** Phase 0 documents the rule where the citation gate lives; Phase 4's D7-conventions subsection (spec D7) carries it into SCHEMA.md. No data migration, no UPDATE statements.

## D8. Count STOP-gate moves into the seed files

**Decision:** `runLoadGameplay` (`scripts/load-knowledge/index.ts:573-581`) currently hardcodes `expectedEntities=37 / expectedMechanics=41`. Phase 0 reworks it: each seed YAML carries an `expected_counts: {entities: N, mechanics: N}` block; the loader validates the file's load result against the file's own declaration and STOPs on mismatch. The hardcoded constants are deleted.

**Why:** Pre-flight finding F2. The hardcoded gate would brick every load this arc performs and would mis-validate `ktx-gameplay.yaml` against id1 numbers. Self-describing seeds keep the STOP semantics (catch accidental row loss/dup at load time) while letting each phase bump counts alongside the data -- the gate travels with the data.

**Implication:** Every phase that edits a seed YAML also bumps that file's `expected_counts` in the same commit. The assembler updates both or the load fails -- this is the desired tripwire.

## D9. KTX overlay keyspace must stay disjoint from extractor-written rows

**Decision:** ktx gameplay rows now have two writers: the extractor pipeline (`load-gameplay-tables.ts` / `load-gameplay-taxonomies.ts` / `load-modes.ts`, all upsert-by-natural-key, no DELETE) and the new seed path (`ktx-gameplay.yaml`). Seed rows' natural keys `(gameplay_source_id, kind, name, ruleset_gate_json)` MUST NOT collide with any extractor-written key, or the two writers silently ping-pong on re-runs. Phase 3 ships a disjointness probe (SQL: no seed-manifest key appears in the extractor output manifest) and the YAML header documents the rule.

**Why:** Pre-flight finding F3. Upsert-without-delete makes coexistence safe ONLY under key disjointness.

**Implication:** Phase 3's assembler checks candidate names against the live extracted keyspace (`monster` rows gated `{"mode":"bloodfest"}`, plus the 8 taxonomy kinds) before writing. Overlay stat rows use distinct gates (e.g. `{}` or `{"mode":"<token>"}` with weapon/item names) which cannot collide with bloodfest spawn-economy keys -- the probe verifies rather than assumes.

## D10. Workflow dials: Sonnet high, low concurrency, agent() only

**Decision:** All fan-outs (audit re-verify, gap sweep, per-monster extraction, KTX delta sweep, independent verification) run as Workflow scripts with per-agent Sonnet high reasoning, low concurrency + pacing, schema-enforced structured output. No @anthropic-ai/sdk -- Workflow `agent()` is the only batch-LLM mechanism (Max subscription, no API key).

**Why:** Spec M2.5; operator memories `reference_workflow_rate_limit_and_args.md` + `reference_max_subscription_no_api_key.md` (Opus fan-out trips the shared throttle and starves terminals).

**Implication:** Phase MDs that dispatch fan-outs specify the Workflow shape (items, stages, schema) and honest counts. Single-task subagent dispatch (non-fan-out) follows the model+effort table in `feedback_model_effort_range.md` instead.

## D11. Per-value citation at extraction time; verification by independent re-derivation

**Decision:** Fan-out extraction agents emit per-value citations (`*_source_ref`) in their structured output -- citations are never patched in later. Verification = a different agent cold-reads the same source and re-derives; agreement auto-passes, only discrepancies escalate. Monsters additionally cross-check against the local wiki snapshot (D16).

**Why:** Spec M2.1/M2.2. The seed YAML's per-prop `*_source_ref` convention is the established shape; retrofitting citations invites paraphrase drift.

**Implication:** Workflow schemas REQUIRE a source_ref field per extracted value. Rows missing citations fail assembly, not review.

## D12. Operator gates are SME-level lists only

**Decision:** Exactly three operator review surfaces: (1) gap-sweep candidates ("gameplay-relevant or engine plumbing?"), (2) the KTX delta list ("does this match community reality?"), (3) wiki-vs-source mismatches. Never per-citation review.

**Why:** Spec M2.3; operator role is intent/SME, not technical gate (`feedback_operator_not_technical_review_gate.md`).

**Implication:** Phase MDs schedule these lists as explicit halt points with a compact list format. Everything else resolves against live DB + spec + this file.

## D13. Validation regime per data phase: citation gate + F1 + double-load

**Decision:** Every phase that loads a seed YAML runs, at its boundary: (a) citation gate -- every `source_ref` / `*_source_ref` mechanically resolves under the D7 two-form rule (file exists, line in range); (b) F1 quality-grid -- per-(source, kind) count probes re-baselined for exactly the kinds that phase changed, plus anchor probes whose predicates were verified against the live dev DB before shipping (F29 discipline); (c) seed double-load -- load the YAML twice, identical counts + content hash of an ordered row dump.

**Why:** Spec M3. The F29 lesson (three prior instances): paraphrased probe predicates drift from live data.

**Implication:** Phase 0 ships the citation-gate + seed-double-load probe scripts (small, reused by every later phase). `idempotency.ts` is NOT extended -- it is extract-tag-scoped by design (its D1); seed loads get the phase-local probe instead. id1 per-kind F1 probes (currently absent -- only ktx ones exist, `quality-grid.ts:2651-2664`) are added in Phase 1 via the existing `makeGameplayKindProbe` helper.

## D14. No schema migration; no new MCP surface

**Decision:** Every kind this arc writes already passes the CHECKs (`gameplay_entity_defs.kind`: item/weapon/projectile/monster -- migration 011 added monster). `props_json` carries kind-specific structure. MCP needs nothing new (`search_gameplay_entities` already admits `kind=monster` + the `gameplay_source` filter); Phase 4 verifies, doesn't build.

**Why:** Spec D6 + M5.

**Implication:** If a phase drafter believes a migration is needed, that is a deviation -- halt for operator review. Surfacing work in Phase 4 is: regenerate slipgate snapshot (`qw-gameplay.json` via build-snapshot), spot-verify MCP answers, nothing else.

## D15. Wiki cross-check: one-time local snapshot, monsters only

**Decision:** One prep step fetches the ~15 per-monster pages from each wiki (Jina reader `r.jina.ai`) into a cache dir with fetch-date + URL recorded per file. Verify agents grep the LOCAL copy -- zero per-agent web fetches. Stub pages degrade gracefully ("no external data" for that monster). Results live in the arc findings doc, never in rows.

**Why:** Spec M3 (operator wall-time/token concern, 2026-06-11); `feedback_jina_reader.md` (WebFetch fails on JS-rendered sites).

**Implication:** Phase 2 owns the snapshot prep task. Cache dir suggestion: `apps/qw-oracle/data/wiki-cache/monsters/` (sibling to `pak-cache/`; confirm gitignore status at drafting).

## D16. Sequencing: execution waits for Track A's first ship; planning does not

**Decision:** Phase MDs draft now; Phase 0 execution starts only AFTER the first Track-A weapon-pair notes ship (operator-locked, spec M4). Inline cited backfills Track A lands in `id1-gameplay.yaml` meanwhile are absorbed by Phase 1's audit (the idempotent loader keeps the tracks collision-free).

**Why:** Spec M4.

**Implication:** Phase 1's drafter notes that the YAML at execution time may differ from the YAML at drafting time -- the audit fan-out enumerates rows from the live file, never from a frozen list in the MD.

## D17. Sibling-arc git guard

**Decision:** demand-driven-l3 + docs.quake.world are live on `main`. Scope every `git add` to this arc's files; never `git add -A`; fresh commits over amend (`feedback_no_amend_shared_main.md`).

**Why:** Spec "Interplay with live tracks"; observed cross-arc clobber risk.

**Implication:** Every phase MD's task steps name exact paths in `git add` commands. The working tree will contain unrelated uncommitted files; that is normal, not drift.

## D18. Output discipline

**Decision:** ASCII only in all authored files (YAML, TS, MD): no emoji, ASCII hyphen-minus, no em/en-dashes. Comments explain WHY, not WHAT. YAML row style matches `id1-gameplay.yaml` exactly (cluster header comments with row counts, per-prop `*_source_ref` siblings, `notes:` for prose).

**Why:** Operator output discipline (`feedback_output_discipline_sentiment.md`); consistency creates leverage.

**Implication:** The Phase 3 drafter mirrors the same style into `ktx-gameplay.yaml`'s header (source block, cluster comments, expected_counts).

## D19. Execution-mode annotation is content-conditional

**Decision:** Phase MD tasks annotate `inline` when the MD ships fully-locked content (exact YAML rows, exact diffs, exact doc text); `subagent (model + effort)` only for genuine synthesis (fan-out extraction, test authoring, exploratory code). Executors honor the annotation both ways.

**Why:** `feedback_no_subagents_for_mechanical_edits.md` (2026-06-10 sharpening, F12 of the docs.quake.world ledger): annotating locked content as subagent forces wasteful ceremony or a deviation.

**Implication:** The YAML assembler steps are ALWAYS inline (D5). Workflow fan-outs are not "subagent tasks" in this sense -- they're orchestrated batch steps the inline executor drives.

## D20. SCHEMA.md conventions ship with the data

**Decision:** Phase 4 delivers a "Gameplay conventions" subsection in SCHEMA.md's gameplay section covering: gate-token vocabulary (D3), the three-layer knob/mode_default/override model (D4), the id1 props-variant convention (`damage_dm_gt_3`), the D7 two-form citation rule, `map_summary_key` aliasing, expected_counts (D8), the dual-writer disjointness rule (D9), and the gameplay_sources registry model. Plus VALIDATION-RUNBOOK.md gains a `qw` gameplay section mirroring the per-engine sections.

**Why:** Spec D7 (operator request): these conventions currently live only in arc docs + YAML comments -- exactly what the operator will forget. SCHEMA.md is the living manual.

**Implication:** This is a deliverable with its own verification (operator doc walk), not an afterthought. The drafter checks live counts before writing them into prose (pre-flight found SCHEMA.md's "~309 mode_default" vs live 317).

## D21. Aliasing: names live ON the row

**Decision:** `map_summary_key` lands as a props field on id1 item rows: 1:1 for armors/health/powerups; weapon keys on the `pickup_*` item rows; ammo keys collapse small+large (both variant rows carry the same key -- a join returning both variants is the correct answer). The classname join (`class_counts_json` -> `classname`) already works and is untouched.

**Why:** Spec D5 (operator-ratified aliasing principle: vocabularies in the wild are load-bearing; one canonical row carries all its names; never consumer-side translation tables).

**Implication:** Phase 4 ships the full 20-key mapping table in the phase MD (locked content, inline execution) and a join-coverage probe: every key in `maps.item_summary_json`'s vocabulary maps to >=1 catalog row.

---

*End of decisions. Amendments land here as dated blocks with reason -- never silently in a phase MD.*
