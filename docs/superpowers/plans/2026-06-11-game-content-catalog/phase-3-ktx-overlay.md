# Phase 3 -- KTX hardcoded-override layer (ktx-gameplay.yaml)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full) and `review-findings.md` -- this phase owns F3
>    (dual-writer keyspace). Drafting-time findings APPEND with new F-numbers +
>    an ownership-table update (this draft surfaces F9 -- see the callout below).
> 2. Read spec sections D2 (override scope -- the bounded inventory floor) and
>    D3 (gate vocabulary).
> 3. Read the live source this phase touches -- verified 2026-06-11 against the
>    tree, NOT the spec's claims: `research/repos/ktx/src/{weapons.c (60KB),
>    items.c (68KB), combat.c (31KB)}` + 18 `sp_*.c` (15 monster files +
>    `sp_ai.c`/`sp_client.c`/`sp_monsters.c` infra); the live 27-token
>    `game_mode` catalog; the ktx keyspace (`gameplay_entity_defs` ktx = ONLY 13
>    `monster` rows, ALL gated `{"mode":"bloodfest"}`; `gameplay_mechanics` ktx =
>    8 taxonomy kinds); the ktx `gameplay_sources` registry row (`display_name=
>    KTX`, `source_root=/research/repos/ktx/src`, `description=KTX -- canonical
>    QuakeWorld server modification.`, `notes=NULL`); `load-gameplay.ts`
>    (`SeedFile` shape, the `gameplay_source` UPSERT, MECHANIC_KIND_BY_LIST);
>    `serve/mcp/src/tools/describe-mode.ts` (what it actually joins -- see F9);
>    `id1-gameplay.yaml:1-30` (the header style this phase mirrors).
> 4. After drafting, dispatch the verification sub-agent before declaring ready.

---

## Decisions surfaced at drafting (operator/planner: read before execution)

Two items this draft cannot resolve unilaterally. Neither blocks drafting; both
are routed to the points below. Stated here at the top per `decisions.md`'s
"surface deviations before silently overriding" rule.

1. **Gate vocabulary needs a third single-key form for cvar-gated deltas
   (D3 boundary).** D3 enumerates `{"mode":"<token>"}` and `{"dm":N}`. The spec
   D2 floor inventory itself contains deltas that are gated on a **cvar, with no
   mode token**: `k_dis` (discharge rule; `combat.c:1196` branches on
   `cvar("k_dis") == 2`), `k_classic_shotgun` (`weapons.c:549`, default "1"),
   `k_hitboxcheck_bullets` (`weapons.c:743`, tagged `// DEBUG` in source). These
   have no `game_mode` catalog token. **Recommended default (used by this MD):**
   a third single-key gate form `{"cvar":"<name>"}` -- single-key (honors D3),
   joins the cvar catalog by the same word (honors the operator-ratified
   "joinable by the same word" principle; the cvar name IS the word), with any
   value-specific condition (e.g. `k_dis == 2`) in `props` (`cvar_value: 2`).
   This is an EXTENSION within D3's single-key constraint, not a contradiction.
   **RESOLVED: ratified as decisions.md D22 (operator, 2026-06-11, at planner
   review of this draft).** The Task 3 SME gate still triages each individual
   cvar-gated delta (accept / reject / drop -- e.g. the `// DEBUG`-tagged
   k_hitboxcheck_bullets is a likely drop); the FORM is settled.

2. **F9 -- `describe_mode` does NOT surface the new override rows (verified
   2026-06-11; live-source finding).** D3 / spec D3 claim "`describe_mode` can
   assemble a mode's hardcoded overrides with zero new wiring." Verified against
   `serve/mcp/src/tools/describe-mode.ts`: the tool joins ONLY `kind='game_mode'`
   (catalog) + `kind='mode_default'` (cvar settings, `:133-140`) + the L3 note +
   `entities`-table activation cvars. It never reads `gameplay_entity_defs`
   override rows or non-`mode_default` `gameplay_mechanics` rows. The claim is
   true at the **data layer** (override rows carry the mode token, so a query by
   token returns them -- "joinable by the same word" holds) but **false for the
   tool envelope**. Wiring `describe_mode` to surface overrides would be new MCP
   behavior, which D14 / spec M5 forbid this arc ("MCP needs nothing new; Phase 4
   verifies, doesn't build"). **Consequence for this phase:** the boundary
   verification asserts the **data join** via raw SQL (catalog + mode_default +
   override rows all returned under one token), NOT that `describe_mode`'s output
   includes them. The tool-surfacing gap is filed as F9 for the arc-reviewer / a
   future arc. Ready-to-lift F9 text is in Open questions.

---

## Goal

Add the KTX hardcoded-behavior override layer as a NEW seed file,
`apps/qw-oracle/scripts/extractors/qw/seeds/ktx-gameplay.yaml`, carrying every
cvar/mode-gated VALUE divergence from an id1 baseline row within the four KTX
file families (`weapons.c`, `items.c`, `combat.c`, the 15 monster `sp_*.c`) --
exhaustively, deltas-not-knobs (D4). Each delta becomes a ktx-source row whose
NAME matches the id1 baseline row it modifies (so the two join by the same word)
and whose gate is a `game_mode` catalog token (`{"mode":"<token>"}`), a
`{"dm":N}` deathmatch gate, or -- for cvar-gated deltas with no mode token -- the
`{"cvar":"<name>"}` form (decision 1 above). A per-monster diff of KTX's
`sp_*.c` against the Phase 2 id1 monster rows (D6) produces ktx monster overlay
rows ONLY where KTX deviates from the id1 baseline; a faithful KTX yields zero
monster rows, which is a valid and likely outcome stated explicitly. One
operator SME gate reviews the consolidated delta list ("does this match
community reality?", D12). One inline assembler writes the YAML -- its
`gameplay_source: ktx` block becomes the canonical owner of the live ktx registry
row (F3) -- bumps the file's own `expected_counts` (D8), and reloads. The
keyspace-disjointness probe (F3 / D9) proves no seed row collides with an
extractor-written ktx key, and the F1 grid re-baselines every ktx kind whose
count this phase changes. No schema migration; no new MCP surface (D14).
**Runnable state at boundary:** loading both seed YAMLs is green and idempotent;
a raw-SQL join over one mode token returns the `game_mode` catalog row + its
`mode_default` overlays + the new hardcoded override rows together (the data-level
"assemble a mode's overrides" that D3 promises); the citation gate, seed
double-load, disjointness probe, and re-baselined ktx F1 grid all pass.

## Inputs from previous phase

Phases 0, 1, 2 delivered and must be in place:

- **Phase 0:** `load-gameplay.ts` accepts a `monsters` seed section AND an
  OPTIONAL `mechanics` key (the `seed.mechanics ?? {}` guard -- a ktx overlay
  that ships only entity deltas loads cleanly); the count STOP-gate is per-seed
  `expected_counts` (the hardcoded 37/41 is gone); `expectedCountsMismatch` is
  exported; `load-knowledge -- citation-gate` and `load-knowledge --
  seed-idempotency` exist as dispatcher subcommands; the `--yaml <path>` flag
  loads an arbitrary seed (`load-gameplay --yaml scripts/extractors/qw/seeds/ktx-gameplay.yaml`).
- **Phase 1:** `makeGameplayKindProbe` takes a leading `project: Project`
  parameter; the 9 ktx call sites pass explicit `'ktx'`
  (`makeGameplayKindProbe('ktx','ktx',...)`); `KTX_GAMEPLAY_KIND_PROBES` is the
  array Phase 3 extends; the id1 baseline is verified-under-regime.
- **Phase 2:** the id1 monster roster is live (`gameplay_source_id='id1'`,
  `kind='monster'`, gate `{}`, ~15 rows) and queryable -- the diff baseline for
  this phase's `sp_*.c` comparison; the monster prop vocabulary (health /
  gib_health / attacks / behaviors) is fixed in the id1 cluster header and any
  ktx monster overlay row mirrors it.
- The dev DB `qw-oracle-postgres-dev` holds: the id1 baseline (post-Phase-1/2),
  the 13 ktx bloodfest monster rows, the 27-token ktx `game_mode` catalog, 317
  ktx `mode_default` rows, and the other ktx taxonomy kinds.
- **Execution gate (plan D16 / spec M4):** the first Track-A weapon-pair notes
  have shipped. Drafting did not wait; execution does. The id1 baseline NAMES
  this phase joins against (axe, super_shotgun, green_armor, rocket, ...) are
  enumerated from the LIVE id1 rows at execution, never from a frozen list here.

## Files touched

### Created

- `apps/qw-oracle/scripts/extractors/qw/seeds/ktx-gameplay.yaml` -- the KTX
  override layer: a `gameplay_source: ktx` block (canonical owner of the registry
  row per F3), an `expected_counts` block (D8), and the override clusters
  (weapons / items / projectiles / monsters / mechanics, only the clusters that
  have rows). Loaded as a second `load-gameplay --yaml` call (spec M1).
- `docs/superpowers/plans/2026-06-11-game-content-catalog/phase-3-findings.md`
  -- the delta ledger: every accepted delta (row name, id1 baseline value+ref,
  ktx value+ref, gate, requires-secondary props), the full sweep candidate list
  with accept/reject + operator reason, the cvar-gate decision outcome, the
  monster-diff result (per-monster faithful/deviates), and any source-vs-verify
  disputes. Written inline by the executor from the Workflow structured output
  (Workflow agents cannot write files). Arc file (D17 -- staged with the rest).

### Modified

- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` -- `KTX_GAMEPLAY_KIND_PROBES`
  gains a probe per NEW (ktx, kind) the overlay introduces (e.g.
  `gameplay_entity_defs` weapon/item/projectile; `gameplay_mechanics`
  constant/...); the existing `makeGameplayKindProbe('ktx','ktx','gameplay_entity_defs','monster',13)`
  is bumped to `13 + <monster-overlay count>` IF (and only if) monster overlays
  land. Counts are post-load live values, verified before shipping (F29).
- `docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md`
  -- F9 (describe_mode override-surfacing gap, drafting-time) numbered into the
  ledger + the phase-ownership table updated; execution-time material findings
  (e.g. "N cvar-gated deltas confirmed", "KTX monsters faithful -- zero overlay
  rows") append with sequential F-numbers. NOT the per-delta ledger (that is
  `phase-3-findings.md`).

### Deleted

n/a -- no deletions. The ktx `gameplay_sources` row is UPSERTed (re-owned), not
deleted; the existing KTX-onboarding seeding (KTX onboarding Phase 1 Task 5, an
idempotent INSERT) becomes redundant once `ktx-gameplay.yaml` owns the row, but
removing that one-off insert is out of this arc's scope (it is idempotent and
harmless; note it in `phase-3-findings.md`).

## Tasks

Task order: 1 (combat-family delta sweep) and 2 (monster `sp_*.c` diff) are
independent read-only fan-outs and MAY run concurrently. 3 (SME gate) consumes
both and resolves the cvar-gate decision. 4 (assemble + reload) consumes 3. 5
(F1 probes + disjointness + boundary validation) runs after 4 so every predicate
is verified against the post-reload live DB (F29 discipline).

### Task 1 -- KTX combat-family value-delta sweep (Workflow, Sonnet high, low concurrency)

- **Goal:** Find every cvar/mode-gated VALUE divergence from an id1 baseline row
  in `weapons.c`, `items.c`, `combat.c`, exhaustively (D4). The spec D2 inventory
  is the FLOOR -- agents rediscover it plus anything it missed.
- **Files:** none written by the fan-out (read-only); output feeds Task 3.
- **Execution mode:** `workflow fan-out (Sonnet high, low concurrency)` per D10.
  Shape: `pipeline(files, sweep, verify)` -- each file flows sweep -> independent
  verify with no barrier (D11).
- **Item list (3 files; re-`ls` at execution):** `weapons.c`, `items.c`,
  `combat.c` -- absolute paths under
  `/home/paradoks/projects/quakeworld/research/repos/ktx/src/`. One agent per
  file (the files are large -- 60KB/68KB/31KB -- but a single Sonnet-high agent
  reads each whole). No silent cap: every cvar/mode branch that changes a
  cataloged value is a candidate.
- **Inline pre-step (executor main thread, before the Workflow):**
  - [ ] Enumerate the LIVE id1 baseline rows the deltas join against: `SELECT
    kind, name FROM gameplay_entity_defs WHERE gameplay_source_id='id1'` +
    `SELECT kind, name FROM gameplay_mechanics WHERE gameplay_source_id='id1'`.
    Pass this name list to each agent as `args` (JSON; if `args` arrives
    stringified, `JSON.parse` it -- `reference_workflow_rate_limit_and_args`) so
    the agent matches each delta to a real baseline name.
  - [ ] Re-query the live `game_mode` catalog tokens (`SELECT name FROM
    gameplay_mechanics WHERE gameplay_source_id='ktx' AND kind='game_mode'`) and
    pass them too, so the agent only proposes catalog-backed mode gates.
- **Stage 1 `sweep`** -- one `agent()` per file, Sonnet high, schema-enforced.
  Per-agent prompt shape (the D4 three-layer filter is stated VERBATIM):

  ```
  You are hunting for KTX hardcoded gameplay VALUE deltas in ONE KTX C file --
  cvar/mode-gated divergences from the vanilla (id1) baseline. Read the file with
  the Read tool at the absolute path below; read the WHOLE file.

  File: /home/paradoks/projects/quakeworld/research/repos/ktx/src/<file>
  id1 baseline row names (your delta's `name` MUST match one of these so the two
  join by the same word; if a delta has NO id1 counterpart, set
  joins_id1_baseline=false and give a descriptive name): <id1 names from args>
  Live game_mode catalog tokens (propose a mode gate ONLY from this set):
    <tokens from args>

  THE THREE-LAYER FILTER -- this arc ships HARDCODED BEHAVIOR DELTAS ONLY. A delta
  earns a row ONLY if it is a cvar/mode-gated VALUE that DIVERGES from an id1
  baseline value. The following do NOT earn rows here:
    - knob EXISTENCE (that a cvar like k_yawnmode exists) -- that is the KTX cvar
      track, already shipped.
    - what a MODE SETS a knob TO (e.g. "ca sets k_noitems 1") -- that is
      mode_default, 317 rows, already shipped.
    - id1-NATIVE deathmatch variants (dm1-4 behavior that vanilla Quake itself
      defines). Example: in dmm4 quad becomes "OctaPower" at 8x -- that is
      Quake's own dm4 octapower (already an id1 dm_mode_rule), NOT a KTX delta.
      If a `deathmatch == N` branch reproduces vanilla dmN behavior, mark it
      id1_native=true (a flag, not a row).
  You are cataloging KTX's HARDCODED divergences: where KTX's C code, under a
  cvar or mode gate, makes a cataloged value DIFFERENT from the id1 baseline.

  For each delta, emit (citation REQUIRED -- a delta with no source_ref is a
  failed extraction, not a row):
    - name: the id1 baseline row name it modifies (join key), or a descriptive
      name if joins_id1_baseline=false.
    - target_table: entity_defs (weapon/item/projectile/monster) or mechanics.
    - kind: weapon | item | projectile | constant | env_hazard | player_stat |
      powerup_behavior | armor_model | spawn_rule | dm_mode_rule.
      (Do NOT propose death_rule -- KTX death_rule rows are owned by the extractor
       pipeline; a death-attribution delta is re-homed or flagged, never written
       here. See the disjointness rule.)
    - changed_field: the indexable column or prop that differs (e.g. damage,
      pellet_count, armor_absorb, projectile_speed).
    - id1_value / ktx_value: the baseline value and KTX's gated value.
    - gate_kind: mode | dm | cvar.
        mode -> the catalog token whose cvar/helper the branch checks
                (k_yawnmode -> yawnmode; cvar("k_midair") -> midair;
                 cvar("k_instagib") -> instagib; isCTF() -> ctf;
                 the bloodfest path -> bloodfest).
        dm   -> the integer N for a `deathmatch == N` branch that is NOT
                id1-native (KTX-specific dmN behavior).
        cvar -> a standalone cvar with no mode token (k_dis, k_classic_shotgun,
                k_hitboxcheck_bullets). Give the cvar name; put any value
                condition (k_dis == 2) in requires_secondary.
    - gate_value: the token / N / cvar-name.
    - requires_secondary: a compound condition kept OUT of the single-key gate
      and destined for props (e.g. "requires_quad: true" for the midair rocket
      boost that also checks super_damage_finished; "cvar_value: 2" for k_dis 2).
    - source_ref: "<file>:<line>" (bare, source_root-relative -- ktx source_root
      is /research/repos/ktx/src, so do NOT use a leading slash).
    - id1_native: true if this reproduces vanilla dmN behavior (flag, no row).
    - confidence: high | medium | low.
    - rationale: one line a server admin would recognize.

  Read first, then record. The known FLOOR (rediscover these plus anything else;
  do not stop at them): yawnmode axe 50 (weapons.c ~128), yawnmode SSG 21 pellets
  + spread (weapons.c ~858), yawnmode SNG 16, yawnmode green-armor absorb 0.4
  (items.c ~474), yawnmode grenade non-random + backpack cap, midair rocket
  speed 2000 with quad (weapons.c ~1061), instagib 5000-damage bullets
  (combat.c ~716), CTF strength/resistance rune damage modifiers (combat.c
  ~548-557), k_dis discharge rules, k_classic_shotgun spread model,
  k_hitboxcheck_bullets. Report what you found AND, if you could not locate a
  floor item in this file, say so (no silent drops).
  ```

- **Stage 2 `verify`** -- for each Stage-1 candidate, one `agent()` cold-reads
  ONLY that (file, line, claimed delta) and re-derives independently (NOT told
  Stage 1's values). Per F7: the verify prompt asks what ROLE the cited line
  plays, not only whether it contains the number. Prompt shape:

  ```
  Cold-read one claimed KTX delta. File
  /home/paradoks/projects/quakeworld/research/repos/ktx/src/<file> at line
  <line>. The claim: under gate <gate_kind>=<gate_value>, the value <changed_field>
  for <name> is <ktx_value> (vanilla is <id1_value>). Read the surrounding code
  and state INDEPENDENTLY: (a) what value the code uses and the exact line; (b)
  what CONDITION gates it (which cvar/mode/dm branch) and whether that condition
  matches the claimed gate; (c) whether the gate is genuinely a divergence from
  vanilla or just reproduces id1 dmN behavior (id1_native). Do not assume the
  claim is right or wrong.
  ```

- **Stage 1 schema (per candidate; citation REQUIRED):** `name` (str),
  `joins_id1_baseline` (bool), `target_table` (`entity_defs`|`mechanics`),
  `kind` (str), `changed_field` (str), `id1_value` (str), `ktx_value` (str),
  `gate_kind` (`mode`|`dm`|`cvar`), `gate_value` (str), `requires_secondary`
  (str|null), `source_ref` (str), `id1_native` (bool), `confidence`
  (`high`|`medium`|`low`), `rationale` (str).
- **Stage 2 schema (per candidate):** `name` (str), `independent_value` (str),
  `independent_source_ref` (str), `independent_gate` (str), `is_id1_native`
  (bool), `reasoning` (str).
- **Steps:**
  - [ ] Run the inline pre-step; dispatch the Workflow (3 files, two stages);
    collect structured output.
  - [ ] Inline partition (executor, deterministic): agreements (Stage 1 value +
    gate confirmed by Stage 2) auto-pass; value or gate mismatches -> dispute
    (Task 3); `id1_native=true` (either stage) -> NOT a ktx row, logged as a
    rejected candidate with reason "id1-native dmN behavior" (D4).
  - [ ] Hold accepted deltas + disputes for Tasks 3-4. Do NOT write the YAML here.
- **Verification:** every file returned a result; every accepted delta carries a
  `source_ref` and a gate. PASS: 3 files swept, every floor item either
  rediscovered or explicitly reported absent-in-this-file, every delta cited.
  FAIL: any file null (agent died) -> re-dispatch; any accepted delta missing
  `source_ref` -> reject (D11).

### Task 2 -- KTX monster sp_*.c overlay diff (Workflow, Sonnet high, low concurrency)

- **Goal:** Diff each KTX `sp_*.c` monster implementation against the Phase 2 id1
  monster row; deviations become ktx monster overlay rows (D6). A faithful KTX
  yields ZERO overlay rows -- a valid, likely outcome the MD states explicitly.
- **Files:** none written by the fan-out; output feeds Task 3.
- **Execution mode:** `workflow fan-out (Sonnet high, low concurrency)` per D10.
  Shape: `pipeline(monsters, diff, verify)`.
- **Item list (15 monster files; re-`ls research/repos/ktx/src/sp_*.c` at
  execution -- pinned 2026-06-11 as 18 `sp_*.c`, of which 3 are infra):** the 15
  monster files `sp_soldier.c, sp_dog.c, sp_fish.c, sp_knight.c, sp_hknight.c,
  sp_zombie.c, sp_ogre.c, sp_demon.c, sp_shambler.c, sp_wizard.c, sp_enforcer.c,
  sp_tarbaby.c, sp_shalrath.c, sp_boss.c, sp_oldone.c`. The 3 infra files
  (`sp_ai.c` AI movement, `sp_client.c` spawn glue, `sp_monsters.c` shared
  spawn/precache) are NOT items -- they are SHARED READS each agent may open if a
  value lives there. One agent per monster (15 agents).
- **Inline pre-step (executor main thread):**
  - [ ] Pass as `args` (JSON; `JSON.parse` if stringified): the 15
    `{classname, sp_file}` pairs, AND for each the Phase 2 id1 baseline row
    (health, gib_health, attacks with damage+projectile_speed, behaviors) pulled
    live: `SELECT name, props_json FROM gameplay_entity_defs WHERE
    gameplay_source_id='id1' AND kind='monster'`. The agent diffs KTX against
    THIS, not against a frozen list.
- **Stage 1 `diff`** -- one `agent()` per monster, Sonnet high, schema-enforced:

  ```
  You are diffing one KTX monster implementation against the vanilla (id1)
  baseline already in the catalog. Read /home/paradoks/projects/quakeworld/
  research/repos/ktx/src/<sp_file> (and sp_monsters.c / combat.c if a value lives
  there) with the Read tool; read the WHOLE <sp_file>.

  Monster: <classname>. The id1 baseline row (vanilla values, already cataloged):
    <health, gib_health, attacks[], behaviors[] from args>

  For EACH baseline value, find KTX's value in <sp_file> and compare:
    - health, gib threshold, each attack's damage dice/formula, each projectile
      speed, special behaviors (e.g. half-damage-from-explosions).
  Emit a deviation ONLY where KTX's value DIFFERS from the baseline (citation
  REQUIRED on every deviation: "<file>:<line>", bare source_root-relative form).
  If KTX matches the baseline on a value, do NOT emit it. If KTX matches on
  EVERYTHING, return deviations=[] (faithful -- the expected outcome).

  Do NOT touch the bloodfest spawn-economy facts (hp_for_kill / array_position /
  boss_able) -- those are a DIFFERENT fact-family already cataloged under gate
  {"mode":"bloodfest"}; you are diffing STATS (health/damage/speed/behavior), not
  spawn economy.
  ```

- **Stage 2 `verify`** -- for each deviation, one `agent()` cold-reads the same
  `sp_file` line and independently confirms KTX's value + that it differs from
  the stated baseline. Same independent-re-derivation shape as Task 1 Stage 2.
- **Stage 1 schema (per monster):** `classname` (str), `sp_file` (str),
  `faithful` (bool), `deviations` (array of `{field, id1_value, ktx_value,
  source_ref}`), `notes` (str).
- **Stage 2 schema (per deviation):** `classname` (str), `field` (str),
  `independent_ktx_value` (str), `independent_source_ref` (str), `differs_from_baseline`
  (bool), `reasoning` (str).
- **Steps:**
  - [ ] Run the inline pre-step; dispatch the Workflow (15 monsters); collect.
  - [ ] Partition: confirmed deviations (Stage 1 + Stage 2 agree it differs) ->
    candidate ktx monster overlay rows (gate `{}` -- see Task 4 gate rule);
    Stage-1-only or disputed -> Task 3. Monsters with `faithful=true` -> logged,
    no row.
  - [ ] Record the per-monster faithful/deviates result for `phase-3-findings.md`.
- **Verification:** 15 monsters returned a result; every deviation cited. PASS:
  15 diffed, every deviation has a `source_ref` and a Stage-2 confirmation; a
  monster with no deviations is a clean PASS (zero rows is correct). FAIL: any
  monster null -> re-dispatch; any deviation uncited -> reject (D11).

### Task 3 -- Operator SME gate (HALT; D12 surface 2 = the KTX delta list)

- **Goal:** Triage the consolidated delta list ("does this match community
  reality?") and resolve the cvar-gate vocabulary decision. This is D12 operator
  surface (2) -- NOT per-citation review.
- **Files:** none (decisions recorded into `phase-3-findings.md` in Task 4).
- **Execution mode:** `inline` -- a HALT step; present the list and wait.
- **Steps:**
  - [ ] **HALT. Present the consolidated delta list in this exact format**
    (combat-family deltas from Task 1 + monster deviations from Task 2, sorted by
    gate then confidence; id1-native rejections listed separately so the operator
    sees what was filtered and why):

    ```
    ## Phase 3 KTX delta list -- does this match community reality?
    Mark each: accept (-> ktx row) / reject (+ one-line reason).

    | # | name | id1 value | ktx value | gate | secondary | source_ref | conf | rationale |
    |---|------|-----------|-----------|------|-----------|------------|------|-----------|
    | 1 | axe | 20 | 50 | mode:yawnmode | - | weapons.c:128 | high | yawn axe one-shots in dmm3 |
    | 2 | super_shotgun | 14 pellets | 21 pellets | mode:yawnmode | spread 0.18/0.12 | weapons.c:858 | high | yawn SSG buffed |
    | 3 | rocket | speed 1000 | speed 2000 | mode:midair | requires_quad:true | weapons.c:1061 | high | midair quad rockets fly fast |
    | 4.. | <from sweep> | ... | ... | ... | ... | ... | ... | ... |

    ## Filtered as id1-native (NOT ktx rows -- shown for confirmation, D4)
    | name | behavior | source_ref | why id1-native |
    |------|----------|------------|----------------|
    | quad_damage_multiplier | 8x in dmm4 (OctaPower) | combat.c:545 | vanilla dm4 octapower; already an id1 dm_mode_rule |

    ## Monster sp_*.c diff result
    | monster | faithful? | deviations (field: id1 -> ktx, ref) |
    |---------|-----------|-------------------------------------|
    | monster_shambler | yes | (none) |
    | ...     | ...       | ...                                 |
    ```
  - [ ] **Cvar-gated deltas (form settled by D22; membership is the question).**
    Present the cvar-gated deltas (k_dis, k_classic_shotgun,
    k_hitboxcheck_bullets, plus any the sweep added) as a flagged sub-list for
    individual accept / reject / drop. `k_hitboxcheck_bullets` is tagged
    `// DEBUG` in source -- surface that so the operator can drop it as dev
    plumbing:

    ```
    ## Cvar-gated deltas -- gate form {"cvar":"<name>"} per D22; accept/reject each
    | name | id1 value | ktx value | proposed gate | note |
    |------|-----------|-----------|---------------|------|
    | super_shotgun | id1 spread | classic spread | cvar:k_classic_shotgun | default "1" |
    | <discharge>   | id1 dis    | k_dis 2 rule  | cvar:k_dis (props cvar_value:2) | |
    | <hitbox bullets> | - | debug | cvar:k_hitboxcheck_bullets | tagged // DEBUG -- likely drop |
    ```
  - [ ] If Task 1/2 produced disputes (Stage 1 vs Stage 2 disagree on a value or
    gate), present them as a short second list: name, field, the two re-derived
    values+refs. The KTX C source is the arbiter; operator adjudicates.
  - [ ] Record accept/reject + reason per delta, the cvar-gate ratification
    outcome, and dispute resolutions; carry accepted rows to Task 4.
- **Verification:** every delta has an accept/reject decision with a reason on
  rejects; the cvar-gate form is ratified or each cvar delta is re-homed/dropped;
  no dispute left unadjudicated. PASS: decision list complete. FAIL: any item
  undecided -> re-present.

### Task 4 -- Assemble ktx-gameplay.yaml + reload (inline assembler, D5)

- **Goal:** Write `ktx-gameplay.yaml` from the accepted deltas, declare its
  `expected_counts` (D8), reload, and write `phase-3-findings.md`.
- **Files:** `ktx-gameplay.yaml` (created), `phase-3-findings.md` (created).
- **Execution mode:** `inline` -- the YAML assembler is ALWAYS inline (D5/D19);
  subagents never write seed files. The per-delta VALUES are D19 synthesis (Task
  1/2 fan-out output); the file HEADER, `gameplay_source` block, row SHAPE, gate
  rules, and disjointness rule below are fully locked.
- **Steps:**
  - [ ] Write the file header + `gameplay_source` block + `expected_counts`
    placeholder. The `gameplay_source` block is the canonical owner of the live
    ktx registry row (F3): **re-query `SELECT display_name, description,
    source_root, notes FROM gameplay_sources WHERE id='ktx'` at execution and
    reproduce the live values** (pinned 2026-06-11 below); the loader UPSERTs them
    (`ON CONFLICT (id) DO UPDATE SET display_name, description, source_root,
    notes`), so a wrong `source_root` would break the citation gate for EVERY ktx
    row. Carry overlay provenance into `notes` (currently NULL). LOCKED header:

    ```yaml
    # KTX hardcoded gameplay overrides for QuakeWorld.
    #
    # Source: research/repos/ktx/src/ (canonical KTX C gamecode). Every row cites
    # "<file>:<line>" BARE (source_root-relative) -- the ktx source_root is
    # /research/repos/ktx/src, and the citation gate (plan D7) strips the leading
    # slash before joining, so weapons.c:128 resolves to
    # research/repos/ktx/src/weapons.c:128. (Contrast the id1 monster cluster,
    # which uses the LEADING-SLASH form because it cites a tree OUTSIDE its
    # source_root.)
    #
    # Loader: apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts
    #         (loaded via: load-knowledge -- load-gameplay --yaml <this file>).
    # Schema: gameplay_sources / gameplay_entity_defs / gameplay_mechanics (v14).
    #
    # WHAT THIS FILE IS (plan D4 -- three-layer model): KTX HARDCODED BEHAVIOR
    # DELTAS only. Each row is a cvar/mode-gated VALUE that DIVERGES from an id1
    # baseline row; its `name` matches that baseline row so the two join by the
    # same word (baseline + named delta -- plan D3). What is NOT here: knob
    # existence (KTX cvar track); what modes SET knobs to (mode_default, 317
    # rows); id1-native dmN variants (Quake's own dm1-4 behavior -- those stay on
    # id1 rows, plan D4).
    #
    # GATE VOCABULARY (plan D3, single-key only):
    #   {"mode":"<token>"}  a game_mode catalog token (yawnmode/midair/instagib/
    #                       bloodfest/ctf/...). Verify every token against the
    #                       live catalog before locking.
    #   {"dm":N}            a deathmatch-number gate that is KTX-specific (NOT a
    #                       vanilla dmN behavior).
    #   {"cvar":"<name>"}   a standalone cvar with no mode token (k_dis,
    #                       k_classic_shotgun). Single-key; the cvar name is the
    #                       join word. Value-specific conditions (k_dis == 2) go
    #                       in props (cvar_value). [Operator-ratified 2026-06-11
    #                       -- plan D22.]
    #   Compound conditions keep the mode/dm/cvar as the single-key gate; the
    #   secondary condition goes in props (midair rocket boost: gate
    #   {"mode":"midair"}, props requires_quad: true).
    #
    # DUAL-WRITER DISJOINTNESS (plan D9 / finding F3): ktx gameplay rows now have
    # TWO writers -- the extractor pipeline (load-gameplay-tables / -taxonomies /
    # -modes; upsert-by-natural-key, no DELETE) and THIS seed file. A seed key
    # (gameplay_source_id, kind, name, ruleset_gate_json) that equals an
    # extractor key makes the two writers silently ping-pong on every re-run.
    # Disjointness holds BY CONSTRUCTION and is enforced by two rules + a probe:
    #   1. No row here uses kind=death_rule. death_rule is the ONLY mechanic kind
    #      written by BOTH the seed loader and the extractor for ktx (27 extractor
    #      rows). A death-attribution delta is re-homed (e.g. as a constant) or
    #      flagged -- never written here.
    #   2. No monster row here uses gate {"mode":"bloodfest"}. The 13 extractor
    #      monster rows live under that gate (spawn-economy fact-family). KTX
    #      monster STAT overlays use gate {} (KTX's reimplementation vs id1,
    #      unconditional), which is disjoint from the bloodfest economy keys.
    #   Weapon/item/projectile rows are disjoint automatically (the extractor
    #   writes ONLY monster entity rows for ktx). The seven id1-style mechanic
    #   kinds usable here (constant/env_hazard/player_stat/powerup_behavior/
    #   armor_model/spawn_rule/dm_mode_rule) share NO kind with the extractor's
    #   eight ktx mechanic kinds (game_mode/mode_default/election_type/
    #   score_system/drop_item/loc_macro/teamplay_message + death_rule) -- the
    #   only name that appears in both the seed loader's kind map AND the
    #   extractor's is death_rule, which rule 1 above excludes. The Phase 3
    #   disjointness probe verifies this held.

    gameplay_source:
      id: ktx
      display_name: KTX
      description: >
        KTX -- canonical QuakeWorld server modification.
      source_root: /research/repos/ktx/src
      notes: >
        This block is the canonical owner of the ktx gameplay_sources registry
        row (finding F3): the extractor-path loaders (load-gameplay-tables /
        -taxonomies / -modes) only ASSERT this row exists; this seed file is the
        sole writer of its display_name / description / source_root / notes. The
        hardcoded override rows below are the game-content-catalog arc's Phase 3
        deliverable (2026-06-11); the bloodfest monster rows and the eight
        taxonomy kinds are written by the KTX onboarding extractor pipeline and
        are NOT in this file. source_root carries the leading slash by historical
        convention; the citation gate treats it as repo-root-relative (plan D7).

    # Count STOP-gate (plan D8, finding F2): the loader validates this load
    # against these self-declared totals and STOPs on mismatch. Bump them IN THE
    # SAME COMMIT that adds or removes rows. These count THIS file's override rows
    # only (NOT the extractor-written ktx rows). entities = weapon + item +
    # projectile + monster override rows; mechanics = constant + ... override
    # rows. If KTX is faithful on monsters, the monster contribution is 0.
    expected_counts:
      entities: 0   # set to the live override-entity count after assembling
      mechanics: 0  # set to the live override-mechanic count after assembling
    ```
  - [ ] Append the accepted override rows under their cluster (`weapons:` /
    `items:` / `projectiles:` / `monsters:` / `mechanics:` with the eight
    sublists -- include only clusters that have rows; the loader tolerates absent
    clusters via `?? []` and `mechanics ?? {}`). Every row in the SHAPE of these
    LOCKED exemplars (the `:NN` lines are drafting-time-grounded from the
    2026-06-11 grep; the executor's Task 1 verify stage confirms them):

    ```yaml
    # Cluster: weapon overrides
    weapons:
      - name: axe                      # joins id1 weapon axe (damage 20)
        damage: 50
        ruleset_gate:
          mode: yawnmode
        source_ref: weapons.c:128
        props:
          id1_baseline_damage: 20
          baseline_source: id1 weapon axe
          requires_deathmatch: 3       # compound condition kept out of the gate (D3)
          dm_branch_source_ref: weapons.c:126
        notes: >
          Yawnmode raises axe damage 20 -> 50 (one-shot kills in dmm3). The
          assignment at weapons.c:128 sits INSIDE an `else if (deathmatch == 3)`
          branch (weapons.c:126) -- the delta requires yawnmode AND dm3, so dm3
          is a real code gate, recorded as the secondary condition in props per
          the single-key rule (D3). An earlier draft claimed the dmm3 was
          comment-contextual only; the enclosing branch proves otherwise (F10).

      - name: super_shotgun            # joins id1 weapon super_shotgun
        ruleset_gate:
          mode: yawnmode
        source_ref: weapons.c:858
        props:
          changed_field: pellet_count
          id1_pellet_count: 14
          ktx_pellet_count: 21
          spread: "0.18 horizontal / 0.12 vertical"
          spread_source_ref: weapons.c:550
        notes: >
          Yawnmode SSG fires 21 pellets (vanilla 14) with a tightened
          non-random spread. pellet_count is not an indexable column, so it lives
          in props with its own source_ref sibling.
    ```
    ```yaml
    # Cluster: projectile overrides
    projectiles:
      - name: rocket                   # joins id1 projectile rocket
        ruleset_gate:
          mode: midair
        source_ref: weapons.c:1061
        props:
          changed_field: projectile_speed
          id1_projectile_speed: 1000
          ktx_projectile_speed: 2000
          requires_quad: true          # compound condition kept out of the gate (D3)
          quad_check_source_ref: weapons.c:1059
        notes: >
          In midair, a quad-carrying player's rockets fly at 2000 (vanilla 1000).
          Single-key gate {"mode":"midair"}; the quad requirement
          (super_damage_finished > time) is the secondary condition, in props.
    ```
    ```yaml
    # Cluster: monster overrides (gate {} -- KTX reimplementation vs id1;
    # disjoint from the bloodfest economy rows by gate). EMPTY if KTX is faithful
    # (the likely outcome -- D6). Mirror the Phase 2 id1 monster prop vocabulary.
    monsters: []
    ```
    ```yaml
    # Cluster: mechanic overrides
    mechanics:
      constants:
        - name: ctf_strength_rune_damage   # CTF rune modifier (no id1 baseline -> descriptive name)
          ruleset_gate:
            mode: ctf
          source_ref: combat.c:551
          props:
            formula: "damage *= (k_ctf_rune_power_str / 2) + 1"
            tunable_cvar: k_ctf_rune_power_str
            joins_id1_baseline: false
          notes: >
            CTF strength rune scales outgoing damage by a k_ctf_rune_power_str
            factor. Gate {"mode":"ctf"}; the rune is a runtime player flag and the
            multiplier is cvar-tunable (recorded in props, not the gate).
      env_hazards: []
      player_stats: []
      powerup_behaviors: []
      armor_models: []
      spawn_rules: []
      dm_mode_rules: []
      # NOTE: no death_rules sublist with ktx rows -- death_rule is extractor-owned
      # for ktx (disjointness rule 1). Omit the sublist or leave it [].
    ```
  - [ ] **Set `expected_counts`** to the live override-row counts after
    assembling: `entities` = total weapon+item+projectile+monster override rows;
    `mechanics` = total mechanic override rows. Same edit as the rows (D8
    tripwire).
  - [ ] Reload: `cd apps/qw-oracle && bun run load-knowledge -- load-gameplay
    --yaml scripts/extractors/qw/seeds/ktx-gameplay.yaml`. PASS: `total
    entities=<E> mechanics=<M>` equal to `expected_counts`, no STOP line. FAIL:
    STOP -> declared count != row count; recount.
  - [ ] Write `phase-3-findings.md`: the accepted delta ledger (name, id1 value+ref,
    ktx value+ref, gate, secondary), the full candidate list with accept/reject +
    reason, the id1-native rejections (D4 audit trail), the cvar-gate outcome, the
    per-monster faithful/deviates result, and the note that KTX-onboarding Phase 1
    Task 5's `gameplay_sources` insert is now redundant (this file owns the row).
    Append material F-numbers to `review-findings.md` + update the ownership table.
- **Verification:** reload clean; `phase-3-findings.md` exists with the delta
  ledger. PASS: clean load + complete ledger. FAIL: STOP line (recount) or
  missing ledger.

### Task 5 -- Disjointness probe + F1 ktx grid re-baseline + boundary validation

- **Goal:** Prove keyspace disjointness (F3/D9), add/bump the ktx F1 per-kind
  probes for every kind this phase changed (D13), and confirm the data-level
  mode-join D3 promises.
- **Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`.
- **Execution mode:** `inline` -- the disjointness probe is locked SQL + a static
  YAML scan; the F1 probe edits are fully-locked TS appends/bumps (D19).
- **Steps:**
  - [ ] **Disjointness probe (locked; run at the boundary).** Two parts, both
    must pass:
    - **Static YAML scan** (parse `ktx-gameplay.yaml`): assert every mechanic
      row's `kind` (resolved via the loader's `mechanics` sublist -> kind map) is
      NOT `death_rule`; assert every `monsters:` row's `ruleset_gate` is NOT
      `{"mode":"bloodfest"}`. These two rules GUARANTEE disjointness given the
      loader's kind vocabulary (weapon/item/projectile never collide -- the
      extractor writes only `monster` entities; the seven id1-style mechanic kinds
      minus `death_rule` never collide with the extractor's seven taxonomy kinds).
      FAIL: any death_rule sublist row, or any bloodfest-gated monster row -> the
      offending row is the work queue (re-home it).
    - **Live key check (SQL, after the seed load):** the extractor-owned ktx
      anchor keys are intact and unduplicated:

      ```sql
      -- No (kind, gate) collision between seed and extractor in the live ktx
      -- keyspace: every extractor-signature row count equals its known baseline.
      SELECT
        (SELECT COUNT(*) FROM gameplay_entity_defs
           WHERE gameplay_source_id='ktx' AND kind='monster'
             AND ruleset_gate_json = '{"mode":"bloodfest"}') AS monster_bloodfest, -- expect 13
        (SELECT COUNT(*) FROM gameplay_mechanics
           WHERE gameplay_source_id='ktx' AND kind='death_rule')    AS death_rule,    -- expect 27
        (SELECT COUNT(*) FROM gameplay_mechanics
           WHERE gameplay_source_id='ktx' AND kind='mode_default')  AS mode_default,  -- expect 317
        (SELECT COUNT(*) FROM gameplay_mechanics
           WHERE gameplay_source_id='ktx' AND kind='game_mode')     AS game_mode;     -- expect 27
      ```
      PASS: 13 / 27 / 317 / 27 -- the extractor keyspace is untouched by the seed
      load. FAIL: any drop -> a seed row overwrote an extractor row (a collision
      the static scan should have caught; the static scan is the primary guard,
      this is the belt-and-suspenders live confirmation).
  - [ ] **F1 ktx grid re-baseline (`quality-grid.ts`, `KTX_GAMEPLAY_KIND_PROBES`).**
    For each NEW (ktx, table, kind) the overlay introduced, append a probe; set
    each `expected` to the POST-load live count (`SELECT COUNT(*) FROM <table>
    WHERE gameplay_source_id='ktx' AND kind=<k>`) and verify it before shipping
    (F29). These ride the existing `--project ktx` grid (ktx is both project and
    source). Example shape (counts are placeholders -- set live):

    ```ts
      // Phase 3 (game-content-catalog) -- ktx hardcoded override layer. One probe
      // per kind this overlay introduces; counts are LIVE post-load values, bumped
      // in the SAME commit that adds/removes override rows (mirrors the seed
      // expected_counts D8 tripwire). Verify each against the dev DB before ship.
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_entity_defs', 'weapon', /* live */ 0),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_entity_defs', 'projectile', /* live */ 0),
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_mechanics', 'constant', /* live */ 0),
    ```
    Add ONLY the kinds that actually have rows (an absent override kind gets no
    probe). If monster overlays landed, BUMP the existing monster probe:

    ```ts
      // was 13 (bloodfest only); now 13 + <monster overlay count>. If KTX was
      // faithful (zero overlay rows) this stays 13 -- do NOT change it.
      makeGameplayKindProbe('ktx', 'ktx', 'gameplay_entity_defs', 'monster', /* 13 + N */ 13),
    ```
  - [ ] `cd apps/qw-oracle && bun run typecheck` (the new probe lines are exact);
    then `bun run load-knowledge -- quality-grid --project ktx` and confirm the
    new + bumped ktx probes PASS.
- **Verification:** the disjointness probe passes both parts; `bun run typecheck`
  exits 0; the ktx F1 grid is green. PASS: disjoint + tsc clean + ktx probes
  PASS. FAIL: a disjointness violation (re-home the row), a tsc error (the diffs
  are exact -- re-check), or a probe FAIL (expected != live -> recount, suspect
  idempotency before staleness).

## Verification (phase boundary)

Run from `apps/qw-oracle/`. Each ends with PASS/FAIL.

1. **Citation gate green, ktx (dev DB).** `bun run load-knowledge -- citation-gate --source ktx`
   PASS: `unresolved=0` across all ktx refs INCLUDING the new override rows' bare
   refs (`weapons.c:128`, `items.c:474`, `combat.c:551`, ...) resolving under
   `research/repos/ktx/src` via the D7 leading-slash-on-source_root strip.
   FAIL: any unresolved ref -> the list is the work queue (a bad line number, or a
   ref that wrongly used a leading slash).
2. **Both seeds load green; counts honored (dev DB).** `bun run load-knowledge --
   load-gameplay` (id1, default) THEN `bun run load-knowledge -- load-gameplay
   --yaml scripts/extractors/qw/seeds/ktx-gameplay.yaml` (ktx).
   PASS: each reports `total` equal to its file's `expected_counts`, no STOP line,
   exit 0. FAIL: a STOP line -> declared count != file row count (recount).
3. **Seed double-load idempotent, ktx (dev DB).** `bun run load-knowledge --
   seed-idempotency --yaml scripts/extractors/qw/seeds/ktx-gameplay.yaml`
   PASS: `pass=true`, identical counts + content hash across both loads. FAIL:
   any divergence (suspect a re-run idempotency bug before staleness,
   `feedback_idempotency_before_staleness`).
4. **Keyspace disjointness (dev DB).** The Task 5 static YAML scan reports no
   death_rule row and no bloodfest-gated monster row; the live key SQL returns
   `monster_bloodfest=13, death_rule=27, mode_default=317, game_mode=27`.
   PASS: static scan clean AND all four anchors intact. FAIL: a death_rule/
   bloodfest seed row (re-home it) or an anchor drop (a collision overwrote an
   extractor row).
5. **ktx F1 grid green (dev DB).** `bun run load-knowledge -- quality-grid --project ktx`
   PASS: every `F1.ktx.gameplay_kind.*` probe PASSes, including the new override
   kinds and the (possibly bumped) monster probe; the 8 extractor taxonomy probes
   still PASS. FAIL: any ktx gameplay probe FAIL (expected != live -> recount).
6. **Data-level mode-join works (the runnable-state check -- NOT describe_mode;
   see F9).** Pick a mode token that gained override rows (e.g. `yawnmode`):

   ```sql
   -- catalog row + mode_default overlays + NEW hardcoded override rows, all under
   -- one token -- the data-level "assemble a mode's overrides" D3 promises.
   SELECT 'catalog' AS layer, name, value_text FROM gameplay_mechanics
     WHERE gameplay_source_id='ktx' AND kind='game_mode' AND name='yawnmode'
   UNION ALL
   SELECT 'mode_default', name, value_text FROM gameplay_mechanics
     WHERE gameplay_source_id='ktx' AND kind='mode_default'
       AND ruleset_gate_json->>'mode'='yawnmode'
   UNION ALL
   SELECT 'override', name, NULL FROM gameplay_entity_defs
     WHERE gameplay_source_id='ktx' AND ruleset_gate_json->>'mode'='yawnmode'
   UNION ALL
   SELECT 'override', name, NULL FROM gameplay_mechanics
     WHERE gameplay_source_id='ktx' AND ruleset_gate_json->>'mode'='yawnmode';
   ```
   PASS: the result contains the catalog row, any mode_default overlays, AND the
   new override rows -- demonstrating the token is the join key across all three
   layers. (`describe_mode('yawnmode')` returns catalog + mode_default ONLY -- it
   does NOT include the override rows; that gap is F9, deferred per D14/M5.)
   FAIL: the override rows do not appear under the token -> a gate-token typo
   (verify against the live catalog).
7. **Git scope (D17).** `git add` names ONLY: `ktx-gameplay.yaml`,
   `quality-grid.ts`, `phase-3-findings.md`, `review-findings.md`. `git diff
   --cached --stat` shows exactly those four paths. PASS: only arc files staged.
   FAIL: any sibling-arc or `-A` staging.

## Outputs to next phase

- `ktx-gameplay.yaml` is live and loaded: KTX's hardcoded value deltas are
  cataloged as ktx-source rows joining the id1 baseline by name and the
  `game_mode` catalog by gate token. The ktx `gameplay_sources` row is owned by
  this seed file (F3).
- The keyspace-disjointness rule (D9) is documented in the YAML header and proven
  by the Task 5 probe; Phase 4 (no new gameplay rows) does not re-run it but
  inherits the invariant.
- `phase-3-findings.md` is the durable delta ledger; F9 (describe_mode
  override-surfacing gap) is in `review-findings.md` for the arc-reviewer.
- The ktx F1 grid covers every override kind; Phase 4's full-sweep verification
  (`--project qw` + `--project ktx`) runs green.
- Phase 4 input: `map_summary_key` props attach to id1 item rows only; this phase
  touched no id1 rows, so the id1 entity count Phase 4 reads is the Phase 2
  post-monster total, unchanged.

## Open questions / deferred items

- **Q: gate form for cvar-gated deltas (no mode token) -- decision 1 at top.**
  **RESOLVED:** `{"cvar":"<name>"}` ratified as decisions.md D22 (operator,
  2026-06-11, planner review). The Task 3 SME gate triages individual deltas;
  the form is settled.
- **Q: F9 -- should `describe_mode` surface the override rows?** **RESOLVED at
  planner review (2026-06-11):** NO this arc -- D14 / spec M5 forbid new MCP
  surface; the data is joinable by token now (verification step 6 proves it).
  F9 is numbered in `review-findings.md` with the carry-forward routed to the
  standing MCP-realignment backlog entry (HANDOVER "Active arcs"), which already
  owns the describe_mode/search_mechanics tool-surface catch-up.
- **Q: gate for KTX monster STAT overlays (if any).** **Default:** gate `{}`
  (KTX's monster reimplementation deviating from id1, unconditional) -- disjoint
  from the bloodfest economy rows by gate; joins the id1 monster row by name
  across sources. If a deviation is genuinely bloodfest-MODE-only AND would need
  `{"mode":"bloodfest"}` (which collides), HALT to operator (rare; the
  disjointness probe catches it). **Who can resolve:** Task 2 fan-out (cite what
  the source says) / operator at the SME gate.
- **Q: "dmm4 quad 8x" -- ktx delta or id1-native?** **Default:** id1-native
  (vanilla dm4 OctaPower; already an id1 `dm_mode_rule`), so NOT a ktx row -- the
  sweep's `id1_native` filter rejects it and logs it in the candidate list for
  operator confirmation (D4). "Quad strips armor/cells in dmm4" is triaged
  separately by the sweep (KTX-specific vs vanilla). **Who can resolve:** Task 1
  fan-out + operator at the SME gate.
- **Q: split this phase (combat-family vs monsters) into two commits?**
  **Default:** NO -- one `ktx-gameplay.yaml`, one assembler (D5); the monster diff
  likely yields zero rows, so a split would create an empty commit. Surface only
  if the monster diff turns out large. **Who can resolve:** executor.

## Recovery (if verification fails)

- **Citation gate reports an unresolved ktx ref:** the unresolved list is the
  work queue. Most likely a fan-out line number out of range, or a ref that wrongly
  used a leading slash (ktx refs are BARE, source_root-relative). Re-read the
  cited `.c` line and fix; it is a real data error introduced this phase.
- **load-gameplay STOPs (ktx).** `expected_counts` != the override-row count in
  `ktx-gameplay.yaml` -- you added N rows but declared a different number. Recount
  the file's entity + mechanic override rows; set the declared counts to match.
- **Disjointness static scan fails (death_rule or bloodfest-gated monster row):**
  re-home the row. A death-attribution delta becomes a `constant` (or is flagged
  to the operator as out-of-scope -- death_rule is the extractor's domain). A
  bloodfest-mode monster stat deviation moves to gate `{}` or HALTs to operator.
- **Disjointness live anchor drop (e.g. monster_bloodfest=12, not 13):** a seed
  row overwrote an extractor row in place. The static scan missed a collision --
  find the seed row whose (kind, name, gate) equals an extractor key, re-home it,
  and RE-RUN the extractor loaders to restore the overwritten row (re-extract
  semantics, `feedback_repair_by_reextract_not_sql_update`).
- **ktx F1 probe FAIL (count mismatch):** diff expected vs live (`SELECT COUNT(*)
  ... WHERE gameplay_source_id='ktx' AND kind=<k>`). Most likely the probe
  `expected` was not set to the post-load count, OR a natural-key collision
  doubled a row -- suspect idempotency before staleness
  (`feedback_idempotency_before_staleness`); the loader is idempotent, so a
  doubled count means two rows share a key.
- **The mode-join SQL (step 6) returns no override rows under the token:** a
  gate-token typo in the YAML (e.g. `{"mode":"yawn"}` not `{"mode":"yawnmode"}`).
  Verify every gate token against the live `game_mode` catalog and reload.
- **A sweep/diff Workflow agent died (returned null):** re-dispatch only that
  file/monster (the fan-out is read-only, idempotent). Do not assemble from a
  partial result -- a missing file means unverified deltas.
- **Unanticipated failure:** route to the operator with the command, the output,
  and the task it blocks.
