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

**Action:** NOT introduced by Phase 0's edits (pre-existing data from ktx taxonomy loader). Phase 3 owns the fix. **SETTLED at Phase 3 kickoff (orchestrator, 2026-06-12, writer code in view):** the writer is `scripts/extractors/ktx/_handler_gameplay_taxonomies.py` -- `:283` emits `f"deathtype.h:{line_no}"`, `:346` emits `f"progs.h:{line}"`, bare basenames for files living under `include/` while source_root points at `src/`. Fix at the emit sites with the SOURCE_ROOT-RELATIVE form `../include/deathtype.h:{N}` / `../include/progs.h:{N}` (stays within D7's default form; path join normalizes `..`), then re-run the extractor and re-load taxonomies (re-extract semantics, `feedback_repair_by_reextract_not_sql_update`). Rejected alternatives: source_root change (churns every correct `src/` ref); leading-slash form (bakes monorepo layout into extractor output -- the handler knows the ktx repo root, not the monorepo). The handler tests may pin the old bare form -- update them in the same change. Expect `citation-gate --source ktx` 32 -> 0; the disjointness anchors (death_rule=27, election_type=5) must be unchanged by the reload.

### F12 -- Phase 0 acquired the WRONG v1.06 branch; value spot-greps cannot certify release identity (execution finding, Phase 0)

**Resolved by:** Phase 0 bounce-back (orchestrator boundary verification 2026-06-12); re-acquired `id1-original` @ `85ccafd2`, landed in `bab08857` (provenance prose updated, dev DB reloaded, re-verified by orchestrator).

**Evidence:** The executor cloned `maddes-b/QuakeC-releases` branch `id1-fixes-1.06` (commit `0e27811`, "Add FIXME/Maddes marks for other known issues..."). The repo's own README: "original" branches carry releases "with no bug-fixes implemented"; "fixes" branches have known issues fixed and annotated. `git diff id1-original..id1-fixes-1.06` = 226 insertions / 167 deletions across 21 files INCLUDING `shambler.qc`, `soldier.qc`, `wizard.qc`, `oldone.qc`, `player.qc`, `combat.qc`, `weapons.qc` (104 lines) -- exactly the files Phase 2 cites. Task 1 criterion (1) demanded the ORIGINAL release. The Task 1 spot-verify greps (shambler 600 / ogre 200) PASSED on the wrong branch -- both branches carry those values at the same lines -- so the value-grep gate alone could not catch this.

**Correct target, verified:** branch `id1-original` @ `85ccafd2652ec550a561849a6a5eb92e62cdc115` -- spot-verify passes (`progs/shambler.qc:397` health=600, `progs/ogre.qc:502` health=200), historical flat `progs/*.qc` layout, `id1-CHANGELOG.adoc` tip section is v1.06. Caveat recorded: the repo README warns branches can be rebased, so the pinned SHA (not the branch name) is the provenance anchor.

**Lesson (F7/F10 class, acquisition flavor):** a tree can pass value spot-checks and still be the wrong RELEASE. Acquisition verification must read the mirror's branch/release semantics (README, changelog, commit messages), not only grep for known values. Phase 2's verify agents cite this tree; they inherit the pinned-SHA anchor.

### F13 -- id1 audit: 14 citation/role discrepancies across 242 cited values (execution, Phase 1)

**Resolved by:** in-place corrections (9) + operator adjudication (5), Phase 1 Task 4. Detail in `phase-1-findings.md` sections A/B.

**Evidence:** The audit fan-out (15 groups, 0 nulls) re-derived 242 cited values; 232 agreed, 14 were discrepancies (each Stage-2 confirmed, each re-read against source by the executor). 9 were line-accurate-but-role-wrong citations the executor corrected in place (armor rows citing the `type=` line instead of `value=`; quad multiplier citing the `if(deathmatch==4)` gate instead of `damage*4`; dq/dr drop-on-death gates citing client.qc instead of player.qc:PlayerDie; rj default citing the override gate instead of `float rj=1` in defs.qc; trigger retrigger citing the T_Damage line; teamplay-0 citing the teamplay==1 guard instead of the fall-through damage line). 5 were operator-adjudicated disputes (rocket random-range vs KTX fixed-110 -> F15; grenade direct-damage=0 citing the splash call; drowning initial/cap citations split to their real lines; dm2_rules value_text was backwards -- dm2 SUPPRESSES respawn). This is the F7/F10 class at scale: most errors were a correct value backed by a role-wrong line.

**Action:** none open -- all 14 resolved. Confirms D1 (the April baseline was richly authored but carried citation-role errors; the audit converts it to verified-under-regime).

### F14 -- gap sweep surfaced a far larger gameplay surface than the 2 known seeds; operator scoped to Tier 1 (execution, Phase 1)

**Resolved by:** operator SME gate (D12 surface 1), 2026-06-12 -- accept Tier 1, defer Tier 2.

**Evidence:** The exhaustive per-file sweep (17 files, 0 nulls) returned 115 candidates, 0 needs_new_kind (no D14 escalation). Triage: 2 seed, 55 gameplay, 7 borderline, 21 plumbing, 30 dup. The MD anticipated ~2 new rows (the seeds); the D4-exhaustive sweep found a much larger gameplay surface. The operator accepted **Tier 1** (core combat/player/death/spawn/deathmatch rules -> 12 new mechanic rows + 6 enriched rows; mechanics 41 -> 53) and **deferred Tier 2** (map-entity hazard defaults -- door/plat/train crush, traps, fireballs, telefrag, teleport; ~26 candidates) to a follow-up arc. The seed finding stands: radius/splash damage is NOT flat -- `points = damage - 0.5*distance`, self-splash halved, T_BeamDamage (LG) twin identical.

**Action:** the deferred Tier-2 list is tracked in `phase-1-findings.md` section D (not dropped). A follow-up arc decides whether per-map entity defaults belong in the global catalog.

### F15 -- rocket direct-hit damage diverges id1 (random) vs KTX (fixed 110); Phase 3 carry-forward (execution, Phase 1)

**Resolved by:** UNRESOLVED -- flagged for Phase 3 (ktx overlay owns the KTX delta).

**Evidence:** The rocket audit dispute surfaced an id1-vs-KTX divergence the operator flagged from competitive play. id1 `damg = 100 + random()*20` (weapons.qc:385) is uniform random 100-120 (mean 110). KTX hardcodes a **fixed 110** on direct hits (`ktx/src/weapons.c:986`), with a **55** special case vs monster_shambler when not bloodfest (`weapons.c:981`). The id1 row keeps id1 truth (110 documented as the mean via its damage_formula prop); the KTX fixed-110 is a ktx-source delta.

**Action:** Phase 3 captures the KTX rocket direct-hit override (110, shambler 55) as a `gameplay_source=ktx` overlay row under the D4/D6 weapon-delta pattern.

### F16 -- makeGameplayKindProbe signature change broke quality-grid.test.ts (execution, Phase 1)

**Resolved by:** fixed in Phase 1 Task 5 (both call sites updated).

**Evidence:** Task 5 added a leading `project: Project` param to `makeGameplayKindProbe`. The phase MD's Files-touched listed only `quality-grid.ts`, not `quality-grid.test.ts`, which has 2 call sites (lines 113, 119). `tsc` caught it (TS2554, expected 5 got 4); the executor updated both call sites (`('ktx', 'ktx', ...)`) and a stale test description.

**Action:** none open. Process note for future shared-helper signature changes: grep ALL call sites including test files before declaring Files-touched complete.

### F17 -- id1 monster extraction + wiki cross-check: 15/15 clean, one wiki mismatch (execution, Phase 2)

**Resolved by:** in-place (15 rows written) + operator adjudication (1 wiki mismatch), Phase 2 Tasks 3-5. Per-monster detail in `phase-2-findings.md`.

**Evidence:** The per-monster fan-out (15 dispatched / 15 returned / 0 nulls; trial 3 then 12 in waves of 4) extracted health / gib / attacks / behaviors with per-value citations into the pristine v1.06 tree (`/research/repos/QuakeC-releases/progs/`, commit 85ccafd2) and independently re-derived each cold. Source-vs-source (extract vs verify): **15/15 agreement on health, gib, and every projectile speed -- zero value discrepancies.** quakewiki.org health/gib cross-check: 13/15 exact match; **1 mismatch** -- `monster_fish` gib: source null (zero ThrowGib code in vanilla; single death animation) vs wiki -20 (the wiki itself attributes -20 to the Scourge of Armagon expansion, not vanilla v1.06); operator keep-source 2026-06-12. 1 no-external-data: `monster_tarbaby` (quakewiki page is a "Spawn" disambiguation, not a stats page). Two citation-line items resolved at source before assembly (F7/F10 class -- value agreed, only the cited line differed): army gib (soldier.qc:259 not :256) and zombie gib=0 (the pain-reset/unconditional-gib mechanic, zombie.qc:426/456, not combat.qc:207). Bosses `monster_boss` (Chthon) and `monster_oldone` (Shub) carry `health: null` with the kill mechanic in behaviors (DAMAGE_NO weapon immunity / telefrag).

**Action:** none open -- all 15 rows live (id1 entities 37 -> 52); F1 `monster` probe PASS at 15; citation gate `--source id1` unresolved=0 (scanned 258 -> 418); seed double-load idempotent (identical hashes). The anticipated "monster extraction found N source-vs-wiki mismatches" finding: N=1, resolved.

### F18 -- session qw-oracle MCP is the deployed REMOTE prod server, not the dev DB (execution, Phase 2)

**Resolved by:** environment note; runnable state proven via the dev-DB code path. Carry-forward: a prod deploy (out of arc scope) / Phase 4 snapshot regen.

**Evidence:** Boundary check 5 pairs a dev-DB SQL roster with the `search_gameplay_entities` MCP tool, written as though both read the same DB. The qw-oracle MCP connected to the executor session is `https://oracle.slipgate.me/mcp` (deployed prod, per `~/.claude.json`), NOT the local dev DB `qw-oracle-postgres-dev`. The remote MCP returns the 13 ktx bloodfest monsters (previously deployed) but 0 id1 monsters, because this phase's dev-DB load has not been deployed. Invoking the real `searchGameplayEntities` implementation locally against the dev DB returns all 15 id1 monsters (`match_quality: strong`, correct leading-slash source_refs) -- the code path and data are correct; only deployment is pending.

**Action:** none for Phase 2 (deploy is a separate op; Phase 4 owns the slipgate snapshot regen; D14 = no new MCP surface this arc). Relates to the standing MCP-realignment backlog. Process note for Phase 3+: verify MCP-dependent boundary checks against the dev-DB code path (invoke the tool impl locally), not the connected remote MCP, until a deploy lands.

### F19 -- KTX combat-family sweep found a far larger override surface than the floor; operator SME-gated to 26 rows (execution, Phase 3)

**Resolved by:** operator SME gate (D12 surface 2), 2026-06-12/13. Per-delta ledger in `phase-3-findings.md` sections A-C.

**Evidence:** The exhaustive `weapons.c`/`items.c`/`combat.c` sweep (3 files, 0 nulls) returned 31 cvar/mode/always-gated value deltas, 0 id1-native, 0 uncited -- where the plan floor anticipated ~a dozen (same shape as F14's gap sweep at scale). The operator accepted the mode/dm/cvar-gated deltas plus the rocket `always` fixed-110 (F15) and 2 monster overlays = 26 override rows; the operator's premise: only the `{}` always-rows touch normal-deathmatch play, the rest are mode-scoped. Two candidates dropped: `k_classic_shotgun` (source read showed it only toggles the gunshot-puff effect grouping via `Multi_Finish`/`TraceAttack` send_effects -- cosmetic, damage is `4`/pellet via `ApplyMultiDamage` regardless) and `k_hitboxcheck_bullets` (inside an `#ifdef HITBOXCHECK` dev block). The operator ADDED one delta the sweep missed: `yawnmode_shotgun_deterministic_spread` (the `non_random_bullets` flag at weapons.c:550 puts shotgun/SSG pellets on a fixed grid -> reliable effective damage at range; the sweep caught this for grenades only). The `dmm4 quad OctaPower 8x` was correctly NOT surfaced (vanilla dm4, id1-native per D4).

**Action:** none open. 26 rows live (ktx override entities 11 + mechanics 15); citation gate `--source ktx` unresolved=0 (565 -> 607). Resolves F15 (rocket fixed-110 is the rocket `{}` row).

### F20 -- KTX monsters 12/15 byte-faithful; 2 stat overlays + 1 shared-code duplicate (execution, Phase 3)

**Resolved by:** in-place (2 overlay rows) + fold (1 duplicate), Phase 3 Task 2. Per-monster table in `phase-3-findings.md` section D.

**Evidence:** The 15-monster `sp_*.c` diff (15 dispatched / 15 returned / 0 nulls) found 12 byte-faithful reimplementations and 3 deviations: monster_zombie gib-lob projectile_speed (600 fixed -> 600+100*random(), sp_zombie.c:616) and monster_shambler half_damage_from_lightning_beam (true -> false; KTX `LightningHit` applies full LG-beam damage with no shambler guard, weapons.c:1118) -- both written as gate `{}` overlay rows (disjoint from the bloodfest monster keyspace by gate, D9). The third, monster_boss lavaball direct-hit 110, is the SAME `weapons.c:986` `T_MissileTouch` line as the rocket `always` delta (the boss lavaball shares the rocket touch handler), so it was folded into the rocket row's `also_applies_to` prop, NOT written as a separate monster row.

**Action:** none open. Confirms D6 (a faithful KTX yields few/zero monster overlay rows -- here 2 of 15).

### F21 -- the `monsters_have_hp_for_kill` anchor probe predicate was too broad; the overlay surfaced it (execution, Phase 3)

**Resolved by:** in-place probe re-scope, Phase 3 Task 5 (`quality-grid.ts:probeKtxMonstersHaveHpForKill`).

**Evidence:** `F1.ktx.anchor.monsters_have_hp_for_kill` asserted that EVERY ktx `kind='monster'` row carries `props_json.hp_for_kill`. That invariant was written when ktx monsters were exclusively the 13 bloodfest spawn-economy rows. Phase 3 added 2 non-bloodfest monster STAT overlay rows (gate `{}` -- zombie speed, shambler LG resistance) which legitimately carry no `hp_for_kill` (a bloodfest fact-family field), so the probe FAILed `[FAIL 2]` after the overlay load. Fix: scope the probe's WHERE to `ruleset_gate_json = '{"mode":"bloodfest"}'` (F29 discipline -- a probe asserts only of the data it governs). Grid returns to 165/165 clean.

**Action:** none open. Same class as the F29 lesson: a probe predicate that silently encodes a now-stale data assumption. The overlay was the trigger that exposed it; the fix narrows the predicate to its real invariant.

### F22 -- Phase 4 MD's locked F6 #2 text contradicts its own `grep ~309` exit gate (execution, Phase 4)

**Resolved by:** executor drain (meaning-preserving rephrase), Phase 4 Task 2 -- flagged for orchestrator ratification.

**Evidence:** Phase 4 Task 2's locked replacement text for the F6 #2 line (SCHEMA.md KTX-onboarding Migration C, :881) was `317 per-line overlays (F6: ~309 was the spec-time estimate; ...)` -- it KEEPS the literal `~309` as a historical mention. But the same Task 2 verification step AND orchestrator augmentation 5 both require `grep -n "~309" SCHEMA.md` to return NOTHING after the edits. Applying the locked text verbatim leaves `~309` at :881 and fails the gate; the two locked instructions are mutually inconsistent. The drafter wrote the historical mention to document the correction; the orchestrator (twice, emphatically) made `grep ~309 = nothing` the exit condition, almost certainly without noticing the replacement text reintroduces the token.

**Action:** executor drained in favor of the orchestrator's emphatic exit gate (the higher-priority, more-recent, twice-stated signal). The F6 #2 clause `~309 was the spec-time estimate` -> `an earlier spec-time estimate undercounted this` -- meaning preserved (old estimate was lower; 317 confirmed), literal `~309` removed, `grep ~309` now returns nothing. The F6 GOAL (kill the stale count, assert 317) is unaffected. Orchestrator may override at closeout if the historical `~309` mention is preferred; if so, the Task 2 verification grep must be narrowed to `grep "~309 per-line"` (the stale-COUNT assertion) rather than the bare token.

**RATIFIED (orchestrator boundary verification, 2026-06-14):** keep the executor's rephrase. Verified `grep -n "~309" SCHEMA.md` returns nothing and both former spots (:530, :881) now read `317 per-line overlays` with the corrected-from-lower-estimate provenance intact. The locked content genuinely self-contradicted (the "to" text reintroduced the token the verification step forbade); draining toward the twice-stated exit gate was the correct read and the meaning is fully preserved. No decisions.md change. Same class as the Phase 2a inline-vs-subagent ratification: locked content was internally inconsistent, the executor surfaced it rather than silently complying with one half, and the orchestrator independently confirmed the resolution.

---

## Phase ownership of findings

| Phase | Findings to verify before sign-off |
|---|---|
| Phase 0 | F1 (probe ships here), F2; F12 (bounce-back: re-acquire id1-original) |
| Phase 1 | F7 (resolved at drafting by planner amendment); F13 (audit corrections), F14 (gap sweep / Tier-1 scope), F16 (test signature fix) -- all resolved this phase; F15 (KTX rocket fixed-110) -> carry-forward to Phase 3 |
| Phase 2 | F8 (resolved at drafting -- wiki-snapshot design adaptation); F17 (monster extraction 15/15 clean + 1 wiki mismatch [fish gib SoA], operator keep-source -- resolved); F18 (session MCP reads remote prod, not dev DB -- env note, carry-forward to deploy/Phase 4) |
| Phase 3 | F3 (disjointness probe -- holds); F9 (deferred -- carry-forward to the MCP-realignment arc); F10 (resolved at drafting by planner amendment); F11 (Task 0 -- ktx taxonomy refs fixed, citation-gate 32->0); F15 (resolved -- rocket fixed-110 is the rocket `{}` overlay row); F19 (sweep -> 26 rows, SME-gated); F20 (monster diff 12/15 faithful, 2 overlays); F21 (hp_for_kill anchor re-scoped to bloodfest) -- all resolved this phase |
| Phase 4 | F4, F5 (doc text), F6; F22 (executor-drained MD self-contradiction -- grep gate vs locked text) |

---

*New findings discovered during phase drafting or execution append here with sequential F-numbers, evidence, the resolving decision (or "UNRESOLVED -- flagged for Phase N"), and an ownership-table update.*
