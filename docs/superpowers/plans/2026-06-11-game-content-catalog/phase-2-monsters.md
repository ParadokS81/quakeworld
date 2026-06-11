# Phase 2 -- id1 monster stats + wiki snapshot cross-check

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full) and `review-findings.md` -- this phase owns F8
>    (fandom-403, resolved at drafting by this MD's design); execution findings
>    APPEND with new F-numbers + an ownership-table update.
> 2. Read spec sections D1 (monsters decision + rationale) and M3 (wiki snapshot).
> 3. Read the live source this phase touches -- verified 2026-06-11 against the
>    tree, NOT the spec's claims: `id1-gameplay.yaml` (entity-row shape +
>    complex-prop cite precedent at the `damage_sites`/`teledeath_obit_source_refs`
>    death_rule, lines 807-902; the monsters cluster lands as Cluster 4 between
>    `items` and `mechanics:`), the live ktx bloodfest monster rows (13 rows,
>    `gameplay_source_id='ktx'`, gate `{"mode":"bloodfest"}` -- the fence), the
>    MCP surface (`search_gameplay_entities kind=monster gameplay_source=id1`
>    runs clean and returns `[]` today), live id1 counts (37 entities / 41
>    mechanics), and the two wiki URL patterns (quakewiki.org resolves richly via
>    Jina; quake.fandom.com is Cloudflare bot-blocked -- 403).
> 4. After drafting, dispatch the verification sub-agent before declaring ready.

## Goal

Add the id1 single-player monster roster to the catalog as ungated stat rows
(`kind='monster'`, `gameplay_source_id='id1'`, gate `{}`): health, gib threshold,
per-attack damage dice, projectile speeds, and special behaviors -- every value
cited per-prop into the original Quake v1.06 QuakeC tree that Phase 0 acquired
(leading-slash citation form, plan D7). The roster (~15, exact count pinned by an
`ls` of the acquired tree AT execution, not assumed -- spec D1) mirrors the 13
ktx bloodfest classnames plus the two end-bosses bloodfest excludes
(`monster_boss` Chthon, `monster_oldone` Shub-Niggurath). Extraction is a
per-monster Workflow fan-out with independent cold-read verification and a
one-time LOCAL wiki snapshot cross-check (grep the cache, zero per-agent web
fetches -- M3/D15); wiki-vs-source mismatches go to one operator SME gate and
into `phase-2-findings.md`, never into rows (D2/D15). One inline assembler writes
the `monsters:` cluster, bumps `expected_counts.entities`, and reloads.
**Runnable state at boundary:** `search_gameplay_entities kind=monster
gameplay_source=id1` returns the full roster; the citation gate, seed double-load,
and a new `F1.id1.gameplay_kind.monster_count` probe are all green on the grown
seed.

## Inputs from previous phase

Phase 0 and Phase 1 delivered and must be in place:

- **Phase 0:** the loader accepts a `monsters` seed section (`kind='monster'`);
  the count STOP-gate is per-seed `expected_counts` (D8); `load-knowledge --
  citation-gate` and `load-knowledge -- seed-idempotency` exist as dispatcher
  subcommands; the Quake v1.06 QuakeC tree is at `research/repos/<v106-dir>/`
  (gitignored reading-room) with provenance on `id1`'s `gameplay_source.notes`.
  The concrete `<v106-dir>` name and the v1.06 tree's monster `.qc` files do not
  exist until Phase 0 executes; this MD pins the EXPECTED roster from the live
  ktx classnames + canonical id1 progs and confirms it by `ls` at execution
  (Task 1).
- **Phase 1:** `makeGameplayKindProbe` now takes a leading `project: Project`
  param; `ID1_GAMEPLAY_KIND_PROBES` exists in `quality-grid.ts` (run under
  `--project qw`); the id1 baseline is verified-under-regime;
  `expected_counts.mechanics` is at its post-audit value. Phase 2 touches
  neither mechanics rows nor the mechanics count.
- The dev DB `qw-oracle-postgres-dev` holds the live id1 baseline (37 entities /
  41 mechanics, confirmed 2026-06-11) plus the 13 ktx bloodfest monster rows.
- **Execution gate (plan D16 / spec M4):** the first Track-A weapon-pair notes
  have shipped. Drafting did not wait; execution does. At execution the live YAML
  may carry Track-A inline backfills beyond 37 entities -- the assembler RECOUNTS
  the live file before setting `expected_counts.entities`, never trusts a frozen
  number from this MD.

## Files touched

### Created

- `apps/qw-oracle/data/wiki-cache/monsters/` -- the one-time wiki snapshot
  (`<classname>.quakewiki.md` per monster + best-effort `<classname>.fandom.md`,
  each with a fetch-date + URL provenance header, plus a `_manifest.json`).
  Confirmed NOT gitignored 2026-06-11; committed as durable cross-check evidence
  (the existing committed `data/wiki-snapshots/` dir is the precedent, and
  quake.fandom.com bot-blocks Jina so re-fetch is unreliable -- the snapshot IS
  the evidence). Raw cache, never a row source (D2/D15).
- `docs/superpowers/plans/2026-06-11-game-content-catalog/phase-2-findings.md`
  -- the extraction + cross-check ledger: per-monster final stats with refs, the
  wiki cross-check table (source value vs quakewiki/fandom value, match/mismatch),
  the SME-gate adjudications, and any unresolved disputes. Written inline by the
  executor from the Workflow structured output (Workflow agents cannot write
  files). Arc file (D17 -- staged with the rest).

### Modified

- `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` -- new
  `# Cluster 4: monsters (<N> rows)` cluster appended after the `items` cluster
  and before the mechanics cluster, with a uniform-prop-vocabulary header comment
  (D6); the existing `# Cluster 4: mechanics` header (line 562) renumbered to
  `# Cluster 5: mechanics` in the same edit; `expected_counts.entities` bumped to
  the recounted live total (D8).
- `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts` -- one probe appended
  to `ID1_GAMEPLAY_KIND_PROBES` (created in Phase 1):
  `makeGameplayKindProbe('qw', 'id1', 'gameplay_entity_defs', 'monster', <N>)`.
- `docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md`
  -- material findings appended at execution as sequential F-numbers (e.g.
  "monster extraction found N source-vs-wiki mismatches"; the fandom-403 finding
  is already F8, numbered at planner review) + the phase-ownership table updated.
  NOT the per-monster ledger (that is `phase-2-findings.md`).

### Deleted

n/a -- no deletions.

## Tasks

Task order: 1 (roster pin) gates everything -- the item list for Tasks 2 and 3
comes from it. 2 (wiki prep) and 3 (extraction+verify fan-out) both consume the
roster; 2 must finish before 3's verify stage (the verify agents grep the LOCAL
cache 2 produced). 4 (SME gate) consumes 3's discrepancies + wiki mismatches. 5
(assemble + reload) consumes 3 and 4. 6 (F1 probe + boundary checks) runs after 5
so the predicate is verified against the post-reload live DB (F29 discipline).

### Task 1 -- Roster pin (ls the acquired tree; confirm against the pinned list; HALT on drift)

- **Goal:** Enumerate the monster `.qc` files in the Phase-0-acquired v1.06 tree,
  resolve the concrete `<v106-dir>`, and confirm the roster matches the pinned
  15-monster list below. The count is pinned FROM source at execution (spec D1),
  not assumed.
- **Files:** none (read-only recon; the resolved roster feeds Tasks 2-3).
- **Execution mode:** `inline` -- mechanical `ls` + table compare; the expected
  roster is locked below. HALT to the operator on any drift (missing expected
  file, or an extra monster `.qc` not in the table) -- do not silently extend or
  shrink the roster.
- **Pinned roster (15) -- classname = row name = wiki URL slug; qc_file backs the
  source_ref; in_bloodfest marks the 13 that already have a ktx fact-family row:**

  | # | classname (row name) | qc_file | wiki page (quakewiki.org) | in_bloodfest |
  |---|---|---|---|---|
  | 1 | monster_army | soldier.qc | Grunt | yes |
  | 2 | monster_dog | dog.qc | Rottweiler/Dog | yes |
  | 3 | monster_fish | fish.qc | Rotfish | yes |
  | 4 | monster_knight | knight.qc | Knight | yes |
  | 5 | monster_hell_knight | hknight.qc | Death Knight | yes |
  | 6 | monster_zombie | zombie.qc | Zombie | yes |
  | 7 | monster_ogre | ogre.qc | Ogre | yes |
  | 8 | monster_demon1 | demon.qc | Fiend | yes |
  | 9 | monster_shambler | shambler.qc | Shambler | yes |
  | 10 | monster_wizard | wizard.qc | Scrag | yes |
  | 11 | monster_enforcer | enforcer.qc | Enforcer | yes |
  | 12 | monster_tarbaby | tarbaby.qc | Spawn | yes |
  | 13 | monster_shalrath | shalrath.qc | Vore | yes |
  | 14 | monster_boss | boss.qc | Chthon | NO (boss) |
  | 15 | monster_oldone | oldone.qc | Shub-Niggurath | NO (boss) |

- **Steps:**
  - [ ] Resolve `<v106-dir>`: `ls -d research/repos/*/ | grep -iE 'v?1\.?06|quake.*progs|id1'`
    and read the provenance Phase 0 wrote to `id1`'s `gameplay_source.notes`
    (the dir, mirror URL, commit SHA, acquisition date live there). Pin the one
    concrete dir name; every monster source_ref below uses it.
  - [ ] `ls research/repos/<v106-dir>/*.qc` and confirm all 15 `qc_file` entries
    above are present. Note any monster `.qc` in the tree NOT in the table
    (rerelease-only monsters, e.g. a `dragon.qc`/`vomit.qc` -- the v1.06 release
    should have none; if present the tree may be the wrong release -- cross-check
    Phase 0's spot-verify).
  - [ ] Confirm the classname<->file pairing for the three where the filename
    differs from the classname (`soldier.qc` defines `monster_army`, `demon.qc`
    defines `monster_demon1`, `hknight.qc` defines `monster_hell_knight`):
    `grep -nE 'void\(\)\s+monster_(army|demon1|hell_knight)\s*=' research/repos/<v106-dir>/{soldier,demon,hknight}.qc`.
    PASS: each spawn function lives in the expected file.
  - [ ] If the live roster differs from the pinned 15 (count or membership):
    **HALT** and present the diff to the operator. The count is source-pinned;
    a mismatch is either a wrong-release tree (Phase 0 re-acquire) or a real
    roster surprise (operator decides). Do not proceed with a guessed roster.
- **Verification:** `ls research/repos/<v106-dir>/*.qc` shows all 15 pinned
  `qc_file` names; the three filename<->classname greps each return a line.
  PASS: 15 expected files present, no unexpected monster file, pairings confirmed.
  FAIL: any expected file missing / unexpected monster file present -> HALT.

### Task 2 -- Wiki snapshot prep (inline Bash loop, locked URL list, D15/D19)

- **Goal:** Fetch each monster's wiki page ONCE into the local cache so the Task 3
  verify stage greps the cache with zero per-agent web fetches (M3/D15). Record
  fetch-date + URL per file.
- **Files:** `apps/qw-oracle/data/wiki-cache/monsters/` (created).
- **Execution mode:** `inline` -- Bash loop over the locked URL list (D19). The
  URL list is deterministic: `https://quakewiki.org/wiki/<classname>` redirects
  to the right page for every one of the 15 (verified 2026-06-11 -- `monster_army`
  -> Grunt, `monster_demon1` -> Fiend, `monster_boss` -> Chthon,
  `monster_oldone` -> Shub-Niggurath, all HTTP 200). No common-name guessing.
- **Recon finding baked into the design (drafting-time, 2026-06-11):**
  quakewiki.org resolves richly via Jina (the Shambler page yields Health 600,
  Gib threshold -60, "takes only half damage from explosions", attack list,
  `shambler.qc`). quake.fandom.com is **Cloudflare bot-blocked -- Jina returns
  HTTP 403 "Just a moment..."**. So quakewiki.org is the PRIMARY cross-check;
  fandom is best-effort and degrades gracefully (D15 stub-page rule). The phase
  does NOT block on fandom. See Open questions for the F-number track.
- **Steps:**
  - [ ] `mkdir -p /home/paradoks/projects/quakeworld/apps/qw-oracle/data/wiki-cache/monsters`
    (absolute -- the harness resets cwd between Bash calls).
  - [ ] For each of the 15 classnames, fetch quakewiki.org via the Jina reader and
    prepend a provenance header. Locked loop (substitute the real date at run):

    ```bash
    cd /home/paradoks/projects/quakeworld/apps/qw-oracle/data/wiki-cache/monsters
    DATE="$(date -u +%Y-%m-%d)"   # fetch date, recorded per file
    for cn in monster_army monster_dog monster_fish monster_knight \
              monster_hell_knight monster_zombie monster_ogre monster_demon1 \
              monster_shambler monster_wizard monster_enforcer monster_tarbaby \
              monster_shalrath monster_boss monster_oldone; do
      QW="https://quakewiki.org/wiki/$cn"
      { echo "<!-- source: $QW | fetched: $DATE | via: r.jina.ai -->"; \
        curl -s -m 40 "https://r.jina.ai/$QW"; } > "$cn.quakewiki.md"
      FD="https://quake.fandom.com/wiki/$cn"
      BODY="$(curl -s -m 40 "https://r.jina.ai/$FD")"
      if echo "$BODY" | grep -qiE 'Just a moment|error 403|CAPTCHA|security verification'; then
        echo "<!-- source: $FD | fetched: $DATE | STUB: fandom bot-blocked (Cloudflare 403 via Jina) -->" > "$cn.fandom.md"
      else
        { echo "<!-- source: $FD | fetched: $DATE | via: r.jina.ai -->"; echo "$BODY"; } > "$cn.fandom.md"
      fi
      sleep 2   # pacing -- be polite to the Jina endpoint
    done
    ```
  - [ ] Write `_manifest.json`: `{ fetched: "<DATE>", primary: "quakewiki.org",
    fandom_status: "bot-blocked-403|partial|ok", count: 15, classnames: [...] }`.
  - [ ] Spot-check one rich page survived: `grep -i 'health' monster_shambler.quakewiki.md`
    returns the 600 line.
- **Verification:** 15 `*.quakewiki.md` files exist and are non-trivial
  (`wc -l`, each > 20 lines); each `*.fandom.md` is either a real page or a
  one-line STUB; `_manifest.json` records the fetch date. PASS: 15 quakewiki
  files populated, manifest present. FAIL: any quakewiki file empty/error-only ->
  re-fetch that classname (transient Jina hiccup); if quakewiki.org itself is
  down, HALT (it is the primary source -- do not proceed to verify on fandom
  alone).

### Task 3 -- Per-monster extraction + verify fan-out (Workflow, Sonnet high, low concurrency)

- **Goal:** Extract every monster's stats from the v1.06 QC with per-value
  citations (D11), then independently re-derive each cold and grep the local wiki
  cache (D15). Source-vs-source agreement auto-passes; source-vs-source
  discrepancies and source-vs-wiki mismatches escalate to Task 4.
- **Files:** none written by the fan-out (Workflow agents cannot write files);
  structured output feeds Tasks 4-5.
- **Execution mode:** `workflow fan-out (Sonnet high, low concurrency)` per D10.
  Shape: `pipeline(monsters, extract, verify)` -- each monster flows extract ->
  verify independently (no barrier). Item list = the 15 roster rows from Task 1
  (`{classname, qc_file}`). No silent cap -- every monster lands in exactly one
  pipeline item; the bosses (`monster_boss`/`monster_oldone`) are included.
- **Inline pre-step (executor main thread, before the Workflow):**
  - [ ] Pass as `args` (JSON; if `args` arrives stringified, `JSON.parse` it --
    `reference_workflow_rate_limit_and_args`): the resolved `<v106-dir>`, the
    absolute wiki-cache path, and the 15-item `[{classname, qc_file}]` list.
- **Stage 1 `extract`** -- one `agent()` per monster, Sonnet high, schema-enforced:

  ```
  You are extracting one Quake monster's gameplay stats from the original Quake
  v1.06 QuakeC source. Read files with the Read tool at absolute paths under
  /home/paradoks/projects/quakeworld/research/repos/<v106-dir>/.

  Monster: <classname> (defined in <qc_file>). Also read combat.qc for any
  monster-specific damage rule (e.g. the half-damage-from-explosions check some
  monsters get in T_RadiusDamage) and defs.qc / ai.qc if a value is defined
  there. Read the WHOLE <qc_file>.

  Extract, with a source_ref for EVERY value (the exact line that backs it),
  citing in the LEADING-SLASH repo-root form, e.g.
  "/research/repos/<v106-dir>/<qc_file>:<line>":
    - health: spawn health (self.health = N at the spawn function).
    - gib_health: the gib threshold (health below which the gib death path runs;
      usually a negative number). null if the monster has no distinct gib path.
    - spawn_source_ref: the void() <classname> = spawn function line (this is the
      row's top-level source_ref).
    - attacks: ONE entry per distinct attack. For each: name (e.g. melee_claw,
      lightning, grenade_lob), type (melee | ranged_projectile | ranged_hitscan |
      ranged_beam), damage (the dice/formula AS WRITTEN in source, e.g.
      "(random()+random()+random())*20", or an integer), damage_source_ref,
      projectile classname + projectile_speed + projectile_speed_source_ref for
      ranged_projectile (else null), and attack_fn_source_ref (the attack-think
      function line).
    - behaviors: special rules a player cares about, each cited: e.g.
      {name: half_damage_from_explosions, value: true, source_ref: combat.qc:NN},
      pain/flinch thresholds, zombie-only-gibbable-by-explosion, boss-specific
      kill mechanics. Empty list is valid.

  Read first, then record. Do NOT invent a value you cannot cite. Citations are
  REQUIRED: a value with no source_ref is a failed extraction, not a row.
  ```

- **Stage 2 `verify`** -- one `agent()` per monster, Sonnet high. It is NOT given
  Stage 1's values (independent re-derivation, D11) -- it cold-reads the same
  source AND greps the local wiki cache:

  ```
  Independently derive one Quake monster's stats and cross-check the local wiki
  snapshot. Do NOT assume any prior extraction is correct -- read the source
  yourself.

  Monster: <classname> (<qc_file>). Read /research/repos/<v106-dir>/<qc_file>
  (and combat.qc as needed) and state, with source_ref each (leading-slash form):
  health, gib_health, and each attack's damage + projectile_speed.

  Then GREP THE LOCAL wiki cache (do NOT fetch any URL):
    <wiki_cache_abs>/<classname>.quakewiki.md (and .fandom.md if not a STUB).
  Report the wiki-stated health, gib threshold, attack summary, and any notable
  rule the wiki calls out (e.g. "takes half damage from explosions"). If the
  wiki file is a STUB, set wiki_present=false.
  ```

- **Stage 1 schema (per monster; citations REQUIRED):** `classname` (str),
  `qc_file` (str), `health` (int), `health_source_ref` (str), `gib_health`
  (int|null), `gib_health_source_ref` (str|null), `spawn_source_ref` (str),
  `attacks` (array of `{name, type, damage, damage_source_ref, projectile,
  projectile_speed, projectile_speed_source_ref, attack_fn_source_ref}`),
  `behaviors` (array of `{name, value, source_ref}`), `notes` (str).
- **Stage 2 schema (per monster):** `classname` (str), `independent_health`
  (int), `independent_health_source_ref` (str), `independent_gib_health`
  (int|null), `independent_attacks` (array of `{name, damage, projectile_speed,
  source_ref}`), `wiki_present` (bool), `wiki_health` (int|null), `wiki_gib`
  (int|null), `wiki_attacks_text` (str), `wiki_notable` (str), `reasoning` (str).
- **Steps:**
  - [ ] Run the inline pre-step; dispatch the Workflow (15 items, two stages);
    collect structured output.
  - [ ] Inline comparison (executor, deterministic): for each monster compare
    Stage 1 vs Stage 2 on health (int eq), gib_health (int eq), attack count, and
    each numeric projectile_speed. Any numeric mismatch OR an attack-count
    mismatch -> SOURCE DISCREPANCY (Task 4). Attack damage FORMULAS that differ
    only in phrasing are flagged for operator eyeball, not auto-resolved.
  - [ ] Inline wiki cross-check: compare Stage 1 health/gib vs Stage 2
    `wiki_health`/`wiki_gib`; a non-null wiki value that differs -> WIKI MISMATCH
    (Task 4). `wiki_present=false` is "no external data" (degrade gracefully, D15
    -- not a mismatch).
  - [ ] Hold agreements (auto-pass), source discrepancies, and wiki mismatches
    for Tasks 4-5. Do NOT write the YAML here.
- **Verification:** every monster returned a Stage 1 + Stage 2 result; every
  Stage 1 value carries a source_ref. PASS: 15 extracted, 15 verified, zero
  uncited values. FAIL: any monster null (agent died) -> re-dispatch that item;
  any Stage 1 value missing a source_ref -> reject the extraction (D11), re-run
  that monster.

### Task 4 -- Operator SME gate (HALT; D12 surface 3 = wiki-vs-source mismatches)

- **Goal:** Adjudicate source-vs-source discrepancies and source-vs-wiki
  mismatches. This is D12 operator surface (3) ("wiki-vs-source mismatches"). The
  v1.06 QC is the source of truth for id1; the pak `progs.dat` in
  `data/pak-cache/` arbitrates genuine source disputes (D1/D2).
- **Files:** none (decisions recorded into `phase-2-findings.md` in Task 5).
- **Execution mode:** `inline` -- a HALT step; present the lists and wait.
- **Steps:**
  - [ ] If there are NO discrepancies and NO wiki mismatches (the common case --
    QC and wiki agree on health etc.), state that and skip the HALT (nothing for
    the operator to adjudicate; the wiki cross-check still lands in
    `phase-2-findings.md`).
  - [ ] Otherwise **HALT** and present two compact lists:

    ```
    ## Phase 2 -- wiki-vs-source mismatches (does the source or the wiki win?)
    Source (v1.06 QC) is truth for id1; pak progs.dat arbitrates. Mark each:
    keep-source (default) / investigate (pak) / note-only.

    | # | monster | field | source value (ref) | quakewiki value | fandom value |
    |---|---|---|---|---|---|
    | 1 | monster_X | health | 600 (shambler.qc:NN) | 600 | (stub) |
    | 2.. | ... | ... | ... | ... | ... |

    ## Phase 2 -- source-vs-source discrepancies (extract vs independent re-derive)
    | # | monster | field | extract value (ref) | re-derive value (ref) |
    |---|---|---|---|---|
    | 1.. | ... | ... | ... | ... |
    ```
  - [ ] Record the operator's keep-source / investigate / note-only decision per
    row; carry resolutions to Task 5. Wiki values NEVER enter a row (D2/D15) --
    they document the cross-check in `phase-2-findings.md` regardless of outcome.
- **Verification:** every mismatch/discrepancy has a decision with a reason. PASS:
  decision list complete (or the no-mismatch fast-path was taken). FAIL: any row
  undecided -> re-present.

### Task 5 -- Assemble monsters cluster + reload (inline assembler, D5)

- **Goal:** Write the `monsters:` cluster into `id1-gameplay.yaml` from the
  verified Stage outputs, bump `expected_counts.entities` in the same edit (D8),
  reload, and write `phase-2-findings.md`.
- **Files:** `id1-gameplay.yaml`, `phase-2-findings.md` (created).
- **Execution mode:** `inline` -- the YAML assembler is ALWAYS inline (D5/D19);
  subagents never write seed files. The per-monster VALUES are D19 synthesis
  (produced by the Task 3 fan-out against the tree Phase 0 acquires -- they cannot
  be inlined here because the tree does not exist at drafting); the row SHAPE,
  cluster header, and prop vocabulary below ARE fully locked. This is the
  ordering-mandated synthesis path, not an "engineer fills in Y" smell.
- **Steps:**
  - [ ] Insert the cluster after the `items` cluster (last item row ~line 560)
    and BEFORE the existing `# Cluster 4: mechanics (41 rows total)` header
    (live at line 562) -- and RENUMBER that header to `# Cluster 5: mechanics`
    in the same edit (monsters take the Cluster 4 slot as the fourth entity
    cluster; mechanics shift to 5). Use this LOCKED header (it defines the
    uniform prop vocabulary ONCE -- D6 -- and the leading-slash + fence rules):

    ```yaml
    # Cluster 4: monsters (<N> rows)
    #
    # id1 single-player monster stats. kind='monster', gameplay_source_id='id1',
    # ungated (ruleset_gate_json defaults to '{}'). Source: the original Quake
    # v1.06 QuakeC tree acquired by Phase 0 at /research/repos/<v106-dir>/
    # (mirror + commit + date recorded on gameplay_source.notes above).
    #
    # CITATION FORM (plan D7): monster refs use the LEADING-SLASH (repo-root-
    # relative) form because they cite the v1.06 tree, NOT the id1 source_root
    # (QW/progs/, which has single-player stripped -- it holds no monster QC).
    # The existing weapon/item/mechanic refs stay bare (source_root-relative).
    # Both forms resolve under the D7 two-form rule; the citation gate handles
    # the leading slash.
    #
    # FENCE (plan D6): the 13 ktx rows that share these classnames live under
    # gate {"mode":"bloodfest"} with gameplay_source_id='ktx' -- a DIFFERENT
    # fact-family (spawn economy: hp_for_kill / armor_for_kill / array_position)
    # and source. These id1 rows never collide (natural key differs on
    # gameplay_source_id AND gate). search_gameplay_entities for monster_shambler
    # returns both: combat stats here, bloodfest economy there.
    #
    # UNIFORM PROP VOCABULARY (applied to every row -- plan D6):
    #   health        int   spawn HP            (health_source_ref sibling)
    #   gib_health    int   gib death threshold (gib_health_source_ref); null if none
    #   attacks       list  one cited map per attack:
    #                         name   str  e.g. melee_claw / lightning / grenade_lob
    #                         type   str  melee|ranged_projectile|ranged_hitscan|ranged_beam
    #                         damage str  dice/formula as written, or an int
    #                         damage_source_ref            str
    #                         projectile                   str|null (ranged_projectile)
    #                         projectile_speed             int|null
    #                         projectile_speed_source_ref  str|null
    #                         attack_fn_source_ref         str
    #   behaviors     list  cited maps {name, value, source_ref} for special rules
    # Wiki cross-check results are NEVER row props (plan D2/D15) -- see
    # phase-2-findings.md.
    monsters:
    ```
  - [ ] Write one row per monster from the verified Task 3 output, every row in
    the SHAPE of this locked exemplar (`monster_shambler` shown with its
    quakewiki-confirmed values; `:NN` line numbers come from the fan-out against
    the acquired tree, NOT guessed here):

    ```yaml
      - name: monster_shambler
        classname: monster_shambler
        source_ref: /research/repos/<v106-dir>/shambler.qc:NN
        props:
          health: 600
          health_source_ref: /research/repos/<v106-dir>/shambler.qc:NN
          gib_health: -60
          gib_health_source_ref: /research/repos/<v106-dir>/shambler.qc:NN
          attacks:
            - name: melee_claw
              type: melee
              damage: (random() + random() + random()) * 20
              damage_source_ref: /research/repos/<v106-dir>/shambler.qc:NN
              projectile: null
              projectile_speed: null
              projectile_speed_source_ref: null
              attack_fn_source_ref: /research/repos/<v106-dir>/shambler.qc:NN
            - name: lightning
              type: ranged_beam
              damage: 10 per bolt
              damage_source_ref: /research/repos/<v106-dir>/shambler.qc:NN
              projectile: null
              projectile_speed: null
              projectile_speed_source_ref: null
              attack_fn_source_ref: /research/repos/<v106-dir>/shambler.qc:NN
          behaviors:
            - name: half_damage_from_explosions
              value: true
              source_ref: /research/repos/<v106-dir>/combat.qc:NN
          notes: >
            Shambler: 600 hp, the toughest id1 monster. Melee claw plus a
            hitscan lightning beam that never misses in range. Takes only half
            damage from rocket/grenade splash (the combat.qc T_RadiusDamage
            classname check). Boss-able in bloodfest (see the ktx fact-family
            row). Values cited into the v1.06 tree; wiki cross-check in
            phase-2-findings.md.
    ```
    Melee-only monsters (`monster_dog`, `monster_fish`, `monster_tarbaby`) carry a
    single `attacks` entry and `behaviors: []` unless the source shows a special
    rule (tarbaby = kamikaze explosion -- record it as a behavior or a self-damage
    attack, whichever the source shape fits). Projectile monsters (`monster_ogre`
    grenade, `monster_wizard` acid spit, `monster_shalrath` homing missile,
    `monster_enforcer` laser, `monster_hell_knight` magic spikes) carry a
    `ranged_projectile`/`ranged_hitscan` attack with the cited
    `projectile_speed`. Bosses (`monster_boss` Chthon lava-ball + crusher-gate
    kill mechanic; `monster_oldone` Shub telefrag-kill) record their kill
    mechanic in `behaviors` -- they have no conventional health-depletion death.
  - [ ] **Recount and bump `expected_counts.entities`** to the live total AFTER
    inserting the cluster: `entities = <pre-Phase-2 live entity count> + <N
    monsters>` (today's baseline 37 + 15 = 52; if a Track-A backfill raised the
    pre-count, the live recount is higher and correct -- D16). `expected_counts.mechanics`
    is UNTOUCHED (monsters are entity rows). Same edit as the cluster (D8 tripwire).
  - [ ] Reload: `cd apps/qw-oracle && bun run load-knowledge -- load-gameplay`.
    PASS: `total entities=<recount>`, no STOP line. FAIL: STOP -> the declared
    count != the row count; recount.
  - [ ] Write `phase-2-findings.md`: per-monster final stats (health, gib,
    attacks, behaviors) with refs; the full wiki cross-check table (source value,
    quakewiki value, fandom value or STUB, match/mismatch); the SME-gate
    adjudications; the fandom-bot-block note. Append material F-numbers to
    `review-findings.md` + update the ownership table.
- **Verification:** reload clean; the cluster has `<N>` rows; `phase-2-findings.md`
  exists with the cross-check table. PASS: clean load + complete ledger. FAIL:
  STOP line (recount) or missing ledger.

### Task 6 -- id1 monster F1 probe + run-project grid

- **Goal:** Add the `monster` per-kind F1 probe to the id1 grid Phase 1 created.
- **Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`.
- **Execution mode:** `inline` -- one fully-locked line appended to an existing
  array (D19).
- **Steps:**
  - [ ] Append to `ID1_GAMEPLAY_KIND_PROBES` (created in Phase 1, after the
    entity-kind probes) one line -- `expected` is the monster count `<N>` (today
    15), verified against the live DB before shipping (F29):

    ```ts
      makeGameplayKindProbe('qw', 'id1', 'gameplay_entity_defs', 'monster', 15),
    ```
    NOTE: this `15` is the monster ROW count (the F1 probe). It is a DIFFERENT
    number from `expected_counts.entities` (the seed's TOTAL entity count, ~52).
    Keep them distinct -- the probe counts one kind; the seed gate counts all
    entities.
  - [ ] Set `expected` to the live count: `SELECT COUNT(*) FROM
    gameplay_entity_defs WHERE gameplay_source_id='id1' AND kind='monster'` AFTER
    Task 5's reload; then `cd apps/qw-oracle && bun run typecheck`.
- **Verification:** `bun run typecheck` exits 0; `bun run load-knowledge --
  quality-grid --project qw` shows `F1.id1.gameplay_kind.monster_count` PASS at
  `<N>`. PASS: tsc clean, monster probe PASS, the Phase 1 id1 probes still PASS.
  FAIL: tsc error (the line is exact -- re-check) or probe FAIL (expected != live
  -> recount; suspect idempotency before staleness).

## Verification (phase boundary)

Run from `apps/qw-oracle/`. Each ends with PASS/FAIL.

1. **Citation gate green, id1 (dev DB).** `bun run load-knowledge -- citation-gate --source id1`
   PASS: `unresolved=0` across all id1 refs INCLUDING the new monster rows'
   leading-slash refs (`/research/repos/<v106-dir>/*.qc:*` all resolve file +
   line-in-range). FAIL: any unresolved ref -> the list is the work queue (a
   `<v106-dir>` substitution slip or a fan-out line number out of range).
2. **id1 monster F1 probe green (dev DB).** `bun run load-knowledge -- quality-grid --project qw`
   PASS: `F1.id1.gameplay_kind.monster_count` PASS at `<N>`; the Phase 1 id1
   probes (weapon/projectile/item/mechanics) still PASS. FAIL: monster probe FAIL
   (expected != live -> recount).
3. **Seed double-load idempotent (dev DB).** `bun run load-knowledge -- seed-idempotency --yaml scripts/extractors/qw/seeds/id1-gameplay.yaml`
   PASS: `pass=true`, identical counts + content hash across both loads. FAIL:
   any divergence (suspect a re-run idempotency bug before staleness,
   `feedback_idempotency_before_staleness`).
4. **expected_counts honored (dev DB).** `bun run load-knowledge -- load-gameplay`
   PASS: `total entities=<recount>` equal to `expected_counts.entities`, no STOP
   line, exit 0. FAIL: STOP line -> declared count != live file count.
5. **Roster queryable via MCP (the runnable-state check).**
   `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -t -c
   "SELECT name FROM gameplay_entity_defs WHERE gameplay_source_id='id1' AND
   kind='monster' ORDER BY name;"` AND the MCP tool
   `search_gameplay_entities kind=monster gameplay_source=id1`.
   PASS: `<N>` rows (15), the full roster, each with health in `props_json`; the
   MCP call returns the same roster (it returned `[]` before this phase). FAIL:
   missing monster -> the assembler dropped it; re-apply.
6. **Wiki snapshot present + cross-check recorded.** `ls apps/qw-oracle/data/wiki-cache/monsters/*.quakewiki.md | wc -l` == 15;
   `phase-2-findings.md` has the source-vs-wiki table for every monster.
   PASS: 15 cache files + complete cross-check table. FAIL: missing -> re-run
   Task 2 / complete the ledger.
7. **Git scope (D17).** `git add` names ONLY: `id1-gameplay.yaml`,
   `quality-grid.ts`, `phase-2-findings.md`, `review-findings.md`, and
   `apps/qw-oracle/data/wiki-cache/monsters/` (the committed snapshot).
   `research/repos/<v106-dir>/` is gitignored -> never staged. `git diff --cached
   --stat` shows exactly those paths. PASS: only arc files staged. FAIL: any
   sibling-arc or `-A` staging.

## Outputs to next phase

- The id1 monster roster (`<N>` rows, `kind='monster'`, `gameplay_source_id='id1'`,
  gate `{}`) is live and queryable; `search_gameplay_entities kind=monster
  gameplay_source=id1` returns it. Phase 3 diffs KTX `sp_*.c` against these id1
  rows -- deviations become ktx-source overlay rows (D6); a faithful KTX yields
  zero ktx stat rows.
- `expected_counts.entities` is at the post-monster live total; Phase 4 bumps it
  only if it adds entity rows (it adds props, not rows -- so likely untouched).
- The monster prop vocabulary (health / gib_health / attacks / behaviors) is
  defined in the cluster header -- Phase 3's ktx overlay monster rows (if any)
  mirror it.
- `apps/qw-oracle/data/wiki-cache/monsters/` is the committed cross-check
  snapshot; `phase-2-findings.md` is the durable extraction + wiki ledger.

## Open questions / deferred items

- **Q: commit the wiki snapshot, or gitignore it like pak-cache?**
  **Default chosen for now:** COMMIT under `data/wiki-cache/monsters/` (it is not
  gitignored today; the committed `data/wiki-snapshots/` dir is the precedent;
  quake.fandom.com bot-blocks Jina so re-fetch is unreliable and the snapshot is
  the evidence). The raw cache is never a row source (D2/D15). **Who can resolve:**
  operator (repo-hygiene call); to gitignore instead, add `data/wiki-cache/` to
  `apps/qw-oracle/.gitignore` and drop it from the Task 7 git-add list -- the
  findings doc still carries the durable cross-check.
- **Q: quake.fandom.com is Cloudflare bot-blocked via Jina (HTTP 403,
  "Just a moment...") -- discovered at drafting 2026-06-11.** RESOLVED: numbered
  **F8** in `review-findings.md` at planner review (the ledger is
  append-sequential; no collision risk with Phase 1's future execution findings).
  Design: quakewiki.org is primary; fandom is best-effort + degrades to a STUB
  (D15); proceed on quakewiki.org alone. (If a fandom value is ever needed, fetch
  via a browser-grade path outside Jina, or treat the pak progs.dat as the
  arbiter per D1.)
- **Q: row name = classname (`monster_shambler`), not a bare functional name
  (`shambler`).** **Default:** classname-as-name -- it mirrors the ktx fact-family
  rows exactly (cross-fact-family join on name), and the classnames
  (`monster_demon1`, `monster_hell_knight`) are unambiguous where common names
  are not (Fiend/Demon, Death/Hell Knight). The id1 weapon rows split name vs
  classname, but monsters have no established bare-name vocabulary in the catalog.
  **Who can resolve:** n/a (rationale noted; the prompt's "ktx names inform yours"
  steer + joinability decide it; flag only if a verifier reads it as a conflict).
- **Q: boss death mechanics (`monster_boss` Chthon, `monster_oldone` Shub) do not
  fit the health-depletion model.** **Default:** record health (if any) plus the
  kill mechanic in `behaviors` (Chthon = crusher/lightning-gate kill;
  Shub = telefrag). They are full roster members (spec D1 "incl. boss/oldone").
  If the source shows no `self.health` for a boss, `health: null` with the
  mechanic in `behaviors` is the honest shape. **Who can resolve:** extraction
  fan-out (cite what the source says); operator at the SME gate if a boss's model
  is genuinely ambiguous.

## Recovery (if verification fails)

- **Roster `ls` drift (Task 1):** the tree lacks an expected `.qc` or has an
  extra monster file. Likely a wrong-release tree (2021 rerelease reorganizes +
  adds monsters) -> cross-check Phase 0's spot-verify (shambler 600 / ogre 200);
  if wrong, Phase 0 re-acquires. A genuine roster surprise -> operator decides
  before the count is pinned.
- **quakewiki.org fetch fails (Task 2):** transient Jina hiccup -> re-fetch that
  classname (the loop is per-file). quakewiki.org itself down -> HALT (it is the
  primary cross-check); do not proceed to verify on fandom (it is bot-blocked).
- **A fan-out agent died (Task 3, monster returned null):** re-dispatch only that
  monster (the fan-out is read-only, idempotent). Do not assemble from a partial
  result -- a missing monster means an unverified row.
- **A Stage 1 value lacks a source_ref:** reject the extraction (D11 -- citations
  required); re-run that monster. Never write an uncited value.
- **Citation gate reports an unresolved monster ref:** the `<v106-dir>`
  substitution is wrong, or a fan-out line number is out of range. Re-check the
  resolved dir name (Task 1) and the offending `.qc` line; fix the ref (it is a
  real data error introduced this phase, not a probe bug).
- **load-gameplay STOPs at the boundary:** `expected_counts.entities` != the live
  entity row count -- you added `<N>` monsters but bumped by a different number,
  or a Track-A backfill landed mid-phase (D16). Recount the file's entity rows
  (weapons + projectiles + items + monsters) and set the declared count to match;
  do not force-pass.
- **monster F1 probe FAIL (count mismatch):** diff expected vs live (`SELECT
  COUNT(*) ... kind='monster' AND gameplay_source_id='id1'`). Most likely the
  probe `expected` was not set to the live monster count, OR a natural-key
  collision doubled a row -- suspect idempotency before staleness
  (`feedback_idempotency_before_staleness`); the loader is idempotent, so a
  doubled count means two rows share `(id1, monster, name, {})`.
- **Unanticipated failure:** route to the operator with the command, the output,
  and the task it blocks.
