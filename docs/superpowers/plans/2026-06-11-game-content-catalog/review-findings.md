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

### F9 -- describe_mode does not surface the new hardcoded override rows (drafting-time, deferred)

**Resolved by:** deferred (D14 / spec M5 -- no new MCP surface this arc; Phase 3's boundary verification asserts the data-level join instead).

**Evidence:** `serve/mcp/src/tools/describe-mode.ts` joins only `kind='game_mode'` (:112) + `kind='mode_default'` (:136) (+ the L3 note + `entities`-table activation cvars). It never reads `gameplay_entity_defs` overrides or non-`mode_default` `gameplay_mechanics` rows. Planner re-verified at review 2026-06-11. D3 / spec-D3's "describe_mode can assemble a mode's hardcoded overrides with zero new wiring" is true at the DATA layer (override rows carry the mode token; one raw-SQL query by token returns catalog + mode_default + overrides) but FALSE for the tool envelope.

**Action:** Phase 3 verification step 6 asserts the data join via raw SQL. Wiring describe_mode to include overrides is a future arc -- it belongs to the standing **MCP-realignment-to-KTX-era-data** backlog entry (HANDOVER "Active arcs"), which already owns the search_mechanics/describe_mode tool-surface catch-up; the arc-reviewer carries this as a named carry-forward.

### F10 -- Phase 3 axe exemplar mischaracterized the yawnmode gate (drafting-time, resolved)

**Resolved by:** planner amendment to `phase-3-ktx-overlay.md` (2026-06-11, at Phase 3 review).

**Evidence:** The locked axe exemplar claimed "the 'dmm3' in the source comment is contextual, not a code gate (the branch checks only k_yawnmode)". Live source: `weapons.c:128` (`damage = k_yawnmode ? 50 : 20;`) sits INSIDE an `else if (deathmatch == 3)` branch at `weapons.c:126` -- dm3 IS a code gate. The row now carries `requires_deathmatch: 3` + `dm_branch_source_ref: weapons.c:126` per the D3 compound-condition rule. Second instance of the F7 class (line-accurate, role/context-wrong), caught by the planner's enclosing-context read; the drafter's own verifier had checked the value and line only.

**Lesson (reinforces F7):** verifying a gated value means reading the ENCLOSING branch structure, not just the cited line. Phase 3's Task 1 Stage-2 verify prompt already asks for the gating condition explicitly -- execution-time extraction is protected; this instance was in drafting-time locked content, which only planner/verifier cold-reads protect.

### F11 -- ktx death_rule + election_type rows cite header files not under source_root (execution finding, Phase 0)

**Resolved by:** UNRESOLVED -- flagged for Phase 3 (owns ktx data; operator decides whether to update source_root or re-cite with leading-slash form).

**Evidence:** Phase 0 citation-gate execution (2026-06-12): `scanned=823, unresolved=32`. All 32 are `reason='missing'`:
- 27 `ktx/death_rule/*` rows have `source_ref` like `deathtype.h:N` (source_root-relative form), resolving to `research/repos/ktx/src/deathtype.h` -- which does not exist. Actual file: `research/repos/ktx/include/deathtype.h`.
- 5 `ktx/election_type/*` rows have `source_ref` like `progs.h:N`, resolving to `research/repos/ktx/src/progs.h` -- which does not exist. Actual file: `research/repos/ktx/include/progs.h`.
- The `gameplay_sources` ktx row has `source_root = /research/repos/ktx/src`. The cited files are in the sibling `include/` directory, not `src/`.
- id1 fully clean: `citation-gate --source id1` reports `scanned=258 unresolved=0` (823 is the TOTAL across id1 + ktx, not the id1 count).
- (Counts corrected at orchestrator boundary verification 2026-06-12: the executor's halt report said 26 death_rule + 6 election_type and called all 823 refs "id1"; the gate's own `--json` output and a live SQL recount say 27 + 5, id1 share 258.)

**Action:** NOT introduced by Phase 0's edits (pre-existing data from ktx taxonomy loader). Phase 3 owns the fix -- either update `source_root` to the repo root (`/research/repos/ktx`) and use `include/deathtype.h:N` form, or re-cite as leading-slash form (`/research/repos/ktx/include/deathtype.h:N`). Operator reviews at Phase 3 start. Orchestrator recommendation (2026-06-12): do NOT change `source_root` (it would churn every correctly-resolving `src/` ref); fix the 32 refs at their WRITER (the taxonomy extractor emit site, per `feedback_repair_by_reextract_not_sql_update`) using the leading-slash form, then re-extract/re-load. Final form decided at Phase 3 kickoff with the writer code in view.

### F12 -- Phase 0 acquired the WRONG v1.06 branch; value spot-greps cannot certify release identity (execution finding, Phase 0)

**Resolved by:** Phase 0 bounce-back (orchestrator boundary verification 2026-06-12); re-acquire `id1-original`.

**Evidence:** The executor cloned `maddes-b/QuakeC-releases` branch `id1-fixes-1.06` (commit `0e27811`, "Add FIXME/Maddes marks for other known issues..."). The repo's own README: "original" branches carry releases "with no bug-fixes implemented"; "fixes" branches have known issues fixed and annotated. `git diff id1-original..id1-fixes-1.06` = 226 insertions / 167 deletions across 21 files INCLUDING `shambler.qc`, `soldier.qc`, `wizard.qc`, `oldone.qc`, `player.qc`, `combat.qc`, `weapons.qc` (104 lines) -- exactly the files Phase 2 cites. Task 1 criterion (1) demanded the ORIGINAL release. The Task 1 spot-verify greps (shambler 600 / ogre 200) PASSED on the wrong branch -- both branches carry those values at the same lines -- so the value-grep gate alone could not catch this.

**Correct target, verified:** branch `id1-original` @ `85ccafd2652ec550a561849a6a5eb92e62cdc115` -- spot-verify passes (`progs/shambler.qc:397` health=600, `progs/ogre.qc:502` health=200), historical flat `progs/*.qc` layout, `id1-CHANGELOG.adoc` tip section is v1.06. Caveat recorded: the repo README warns branches can be rebased, so the pinned SHA (not the branch name) is the provenance anchor.

**Lesson (F7/F10 class, acquisition flavor):** a tree can pass value spot-checks and still be the wrong RELEASE. Acquisition verification must read the mirror's branch/release semantics (README, changelog, commit messages), not only grep for known values. Phase 2's verify agents cite this tree; they inherit the pinned-SHA anchor.

---

## Phase ownership of findings

| Phase | Findings to verify before sign-off |
|---|---|
| Phase 0 | F1 (probe ships here), F2; F12 (bounce-back: re-acquire id1-original) |
| Phase 1 | F7 (resolved at drafting by planner amendment; execution audit findings will append here) |
| Phase 2 | F8 (resolved at drafting -- wiki-snapshot design adaptation) |
| Phase 3 | F3; F9 (deferred -- carry-forward to the MCP-realignment arc); F10 (resolved at drafting by planner amendment); F11 |
| Phase 4 | F4, F5 (doc text), F6 |

---

*New findings discovered during phase drafting or execution append here with sequential F-numbers, evidence, the resolving decision (or "UNRESOLVED -- flagged for Phase N"), and an ownership-table update.*
