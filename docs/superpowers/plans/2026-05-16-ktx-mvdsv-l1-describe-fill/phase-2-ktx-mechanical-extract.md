# Phase 2 -- KTX mechanical extract (D9)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- C1-C5, P1-P5, D1-D19).
> 2. Read `review-findings.md`; the rows whose "Phase" is this phase:
>    **F-C2a (Grave -- preserve per-source, never merge)** and
>    **F-C5a (Grave -- ship the provenance + jsonb probes)**.
> 3. Recon the LIVE source before inlining anything: canonical KTX is
>    libclang/C; the D9 shipped-config tier is a NEW sibling handler that
>    reads `.cfg` TEXT (not a C AST, not tree-sitter -- tree-sitter is the
>    out-of-scope dusty-ktx fork only, dated CORRECTION 2026-05-17 in
>    `review-findings.md` "Confirmed-good"). Verified against the live DB /
>    repo / configs on 2026-05-17 -- see "Recon facts" below; numbers are NOT
>    copied from the spec unchecked (the spec "~157" is conflated -- see
>    Recon facts + Open Q (a)).
> 4. After drafting, dispatch the verification sub-agent (brief at the bottom
>    of `phase-template.md`) before declaring the phase MD ready.

## Goal

Phase 2 builds the KTX shipped-config mechanical-extract tier (D9): a NEW
sibling extractor handler plus its loader adapter that lift the in-repo and
nQuake `ktx.cfg` files (and the nQuake `port_template.cfg`) into, per
(cvar, source-file), the config author's description text, structured choices
kept structured (`{value,label}` enum tables and bitmask flag tables as JSONB
data, never prose-flattened), the shipped value carried as data (NOT written
as the source default), and one retained provenance entry per contributing
file -- onto the KTX cvar rows that ALREADY exist in L1. It never creates
entities; it fills fields. In-repo-vs-nQuake drift is preserved as one record
per (cvar, source-file), NEVER merged at extract time (F-C2a/D9/C2/D10). The
extractor harvests and STOPS at the D9 seam: it renders ZERO quality verdict,
writes no `description_verdict`/`confidence`/`reasoning`, affirms nothing --
`description_origin='shipped_doc'` is a provenance-origin fact ("this
candidate text was mechanically lifted from a shipped human-written
artifact"), explicitly NOT a judgement that the text is good enough. Every
harvested `shipped_doc` candidate AND every comment-less (still-NULL) KTX cvar
flows to the Phase 3 D5-D8 evaluation, which is the only place affirm-vs-
synthesize is decided and the only thing the D7 gate sees. The runnable,
verifiable state at the phase boundary: the idempotent extractor+loader
run twice produces an identical DB state in which every mechanical
shipped-config-resolving KTX cvar carries >=1 retained `description_provenance`
entry (JSONB array, not a string scalar) against the probe-0 KTX-cvar
M=260 denominator, the Phase-1 pre-filled `k_short_gib` is reproduced
identically and counted exactly once (no row inflation, no regress of its
Phase-1 `synthesized` state), the not-mechanically-covered residue is reported
as the explicit tracked Phase-3 hand-off (never importance-cut, C1), and the
extended `F1.jsonb_columns_not_strings` plus the new
`F1.describe_fill.provenance_entry_exists` probes are GREEN.

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

Drafter-verified via `psql` against `qw-oracle-postgres-dev` and `grep`
against the live repo/configs on 2026-05-17. NOT inferred, NOT copied from the
spec. The Phase 1 review shipped two probe defects from a zero-baseline
assumption + a missing recon block; this block exists so Phase 2 does not
repeat that.

- **Migration `014` is UNEXECUTED at draft time.** Live highest migration =
  `013_entity_name_source_case_fold.sql`;
  `information_schema.columns` count for `entities.description_provenance` =
  `0`. The arc is in PLANNING -- README status `approved` means the phase MD
  is signed off, NOT executed (flow: `approved -> in execution -> shipped`).
  Phase 1 is approved-not-executed. **Consequence:** this Phase 2 MD is a
  paper plan whose EXECUTION presupposes Phase 1 EXECUTION (see "Inputs from
  previous phase"). The `014` schema Phase 2 fills is defined in
  `phase-1-discipline.md` Task 1; the `description_provenance` element shape
  Phase 1 locked is `{source_file, source_line, shipped_value, raw_comment}`.
  Phase 2 GENERALIZES that contract by widening the element with parsed
  structured choices (Open Q (b) -- surfaced as the lone deviation, not
  silently diverged).
- **KTX cvar M = 260** (live: `count(*) FROM entities WHERE project='ktx'
  AND type='cvar'` = 260). This is the probe-0 C1 coverage denominator -- the
  gate, never a hand-picked subset. **Phase 0 re-extracts dev-head forward
  and re-baselines this denominator (correct by C1) -- Phase 2 EXECUTION
  recons the POST-Phase-0 M live (`phase-0-results.md` records old-vs-new);
  the 260 here is the live PRE-Phase-0 value and the gate-SHAPE, NOT a
  frozen contract number. The locked execution order runs Phase 0 before
  Phase 2, so a KTX-cvar count != 260 that matches the Phase-0 re-baseline
  is CORRECT (C1), not a Phase-2 failure. Added 2026-05-17 (pre-dispatch
  holistic-gate Finding 1 -- the Phase-0-rebaseline propagation gap; the
  identical discipline Phases 3/4/5 already carry; review-findings F-C1a).**
- **Pre-existing origin baseline (live, pre-014):** KTX cvar
  `description_origin` distribution = `source_inline:68`, `NULL:192`. ZERO
  `synthesized`, ZERO `shipped_doc` (Phase 1's `k_short_gib` D19 fill has
  NOT executed). Arc-scope (`ktx|mvdsv` x `cvar|command|cmdline_param|
  info_key`) `source_inline` total = 466 (matches Phase 1's recon).
- **`k_short_gib` live state (pre-Phase-1):** `entities` one row
  `canonical_id='ktx:cvar:k_short_gib'`, `description` NULL,
  `description_origin` NULL, `source_state='source_backed'`.
  `cvar_versions` (linked by `entity_id`, NOT `canonical_id` -- the Phase 1
  MD's loose "WHERE canonical_id" phrasing on `cvar_versions` is a join-key
  imprecision; corrected here): `entity_id=13467`, `version='head'`,
  `source_file='src/world.c'`, `source_line=942`, `default_value` empty,
  `trailing_comment` empty (prose lives ONLY in the configs -- the
  describe-fill case). **At Phase 2 EXECUTION time (after Phase 1
  executes)** `k_short_gib` will be `description_origin='synthesized'` with
  two `shipped_doc`-class `description_provenance` entries; Phase 2's
  idempotency + clobber-guard are written against THAT post-Phase-1 terminal
  state, and the pre-Phase-1 NULL state is recorded so the contract is honest
  about which holds when.
- **Live mechanical shipped-config target (the precise D9 write set):**
  120 distinct `set`-names across the three `coverage.ndjson`
  `extractability:"mechanical"` shipped-config files
  (`research/repos/ktx/resources/example-configs/ktx/ktx.cfg` 93 set lines;
  `research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg` 95;
  `research/repos/nquake-distfiles/sv-gpl/ktx/port_template.cfg` 11).
  **109 of 120 resolve (exact-case) to a live KTX L1 cvar** -- the precise
  Phase-2 `shipped_doc` write target. 11 do NOT resolve:
  `k_666`, `k_autoreset`, `k_dm2mod`, `k_master`, `k_motd2`, `k_motd3`,
  `k_motd4`, `k_motd5`, `sv_maxrate`, `sv_www_address`, `sv_www_authkey`
  (legacy / MVDSV-owned / `k_motd1` continuation) -- the C2/C3 config-drift
  datum (config sets a name absent from the registration set). D9 is
  fill-not-create: these get NO entity; they are recorded + tracked
  (C1: never silently dropped), surfaced to Phase 3 / the C1 track.
- **The spec/gap-findings "~157/260 mechanical candidate" is CONFLATED.**
  gap-findings "~157 = in-repo union 136 + 21 nQuake-unique" where
  "136" = `world.c` `source_inline` (68) UNION in-repo `ktx.cfg` (90). That
  mixes the EXISTING `_handler_cvars.py` libclang registration surface (68
  `source_inline`, already loaded, explicitly NOT the D9 tier -- D9: "NOT
  folded into the existing KTX cvar registration handler") with the
  shipped-config surface. The honest D9 `shipped_doc` write target is
  ~**109/260**, the M=260 probe-0 figure is the C1 coverage gate, and the
  ~151 not-mechanically-covered residue (incl. the 38 bot `k_fbskill_*`,
  registered in `bot_botimp.c` with no comment anywhere) is the tracked
  Phase-3 hand-off, NEVER importance-cut (C1). Caveat: 109 is exact-case;
  the loader matches case-insensitively (`name_fold`, F-D10b soft dep) so the
  EXECUTED figure is the idempotent extract's output against M=260 -- 109 is
  the verified order-of-magnitude, not a hard contract number (C1: the
  denominator is the gate). See Open Q (a).
- **F-C2a drift verified live (real + concrete; preserve, never merge):**
  `k_short_gib` in-repo `:6 set k_short_gib 1 // remove gibs after 2 seconds
  (0 = no, 1 = yes)` vs nQuake `:7 set k_short_gib 0 // remove gibs after 2
  seconds (0 = no, 1 = yes)` -- identical comment, value 1 vs 0 = a D10
  value-difference, NOT a meaning conflict. `sv_maxrate` 500000/50000;
  `k_exclusive` 1/0; `k_exttime` 5/3. `k_noframechecks`: in-repo
  `// disable check for fps/speed manipulation (0 = no, 1 = yes)` vs nQuake
  `// check for fps/speed manipulation (0 = yes, 1 = no)` = polarity-label
  inversion = a D10 meaning conflict. Phase 2 keeps one record per
  (cvar, source-file); Phase 3 flags/resolves at the D7 tail.
- **Config structural shapes verified:** line shape
  `set <name> <ws> <value> <ws> // <comment>`; inline enum inside the
  comment `(N = label, N = label, ...)` (e.g. `set k_spw 4 // spawn mode
  (0 = qw respawns, 1 = kombat teams spawn safety, ... 4 = ktx2 respawns)`);
  bitmask = a set line whose comment ends `... (bit mask):` followed by
  `//`-only continuation line(s) of `bit=label, bit=label` (e.g.
  `k_disallow_weapons` then `//  1=sg, 2=ssg, 4=ng, ... 4096=axe`).
- **Extractor/loader plug-in pattern verified.** `extract.py`
  `collect_handlers()` lazy-imports handler classes;
  `scripts/extractors/ktx/_handler_match_events.py` is the canonical
  precedent for the D9 sibling: it explicitly "does NOT use libclang AND does
  NOT inherit from Visitor", is "standalone ... duck-typed no-op stubs so
  extract.py's per-handler lifecycle works", `name = HANDLER_NAME`,
  `setup()`, glob-discovers its source artifact. The D9 shipped-config
  handler is a NEW sibling on that exact precedent, reading `.cfg` text.
  Loader: `index.ts` per-domain subcommand pattern (`load-ktx-modes`,
  `load-ktx-taxonomies`, `load-ktx-gameplay-tables` -- each defaulting to
  `scripts/extractors/ktx/output/ktx-*-ast.json`, each with an F-anchor
  count-floor STOP guard). `natural-keys.ts` idempotency primitive =
  `INSERT ... ON CONFLICT (entity_id, version) DO UPDATE SET ...`; entities
  are UPSERTed by `canonical_id` (UPDATE existing, never duplicate).
- **ZERO existing JSONB columns** on `entities` / `cvar_versions` /
  `command_versions`. Legacy `cvar_versions.help_values` / `flag_names` are
  TEXT carrying `JSON.stringify(...)` -- the exact P2 anti-pattern.
  `entities.description_provenance` (Phase 1 / migration 014) is the FIRST
  JSONB column on these tables; **Phase 2 is the first to write it at
  volume and there is NO correct in-repo precedent to copy** -- the P2
  binding (JS value / `tx.json`, never pre-stringified) and the
  jsonb-not-string probe are load-bearing here, not boilerplate (F-C5a).
- **`F1.jsonb_columns_not_strings` is currently EZQUAKE-SCOPED**
  (`quality-grid.ts` ~218: `if (ctx.project !== 'ezquake')` -> returns a
  skip). Phase 2 extends it to run for `ktx` and assert
  `description_provenance` is a jsonb array, never a string scalar. The
  Phase 1 C5 probes (`F1.describe_fill.origin_vocabulary`,
  `F1.describe_fill.synthesized_requires_anchor`) are NOT in
  `quality-grid.ts` yet (Phase 1 unexecuted) -- Phase 2 references them as
  Phase-1-delivered inputs and ADDS `F1.describe_fill.provenance_entry_exists`.

## Inputs from previous phase

**Phase 2 consumes Phase 1, not Phase 0.** Per the locked slicing analysis
(`README.md`): Phase 0 sizes Phase 4, not the KTX side; Phase 2 (KTX
mechanical extract) is liveness-agnostic and is NOT gated by Phase 0's C3
suspect pool (C3/D12). Phase 2 EXECUTION requires Phase 1 EXECUTION complete:

- Migration `014_description_provenance_trail.sql` applied; `entities`
  carries `description_provenance JSONB NULL` (element shape
  `{source_file, source_line, shipped_value, raw_comment}`),
  `description_origin` extended to admit `shipped_doc`, plus the
  anchor/rereview/verdict/confidence/reasoning/proposed fields. `SCHEMA.md`
  documents them. No CHECK on `description_origin` (012's deliberate
  looseness; the C5 probe is the enforcement).
- The two Phase 1 C5 probes `F1.describe_fill.origin_vocabulary` and
  `F1.describe_fill.synthesized_requires_anchor` registered in
  `REGRESSION_PROBES` and GREEN at the Phase 1 baseline.
- **Pre-filled D19 row:** `entities` `canonical_id='ktx:cvar:k_short_gib'`
  carries a full Phase-1 record -- `description` non-NULL,
  `description_origin='synthesized'`, `description_anchor_version` stamped,
  `description_provenance` a JSONB array of TWO `shipped_doc`-class entries
  (in-repo + nQuake `ktx.cfg`), `description_verdict`/`confidence`/
  `reasoning` populated. Phase 2 MUST treat it idempotently: reproduce its
  two provenance entries identically and NOT regress its `synthesized`
  terminal state (clobber-guard, Task 2); coverage counts it exactly once
  (C4/P3/D19).
- Operator-side `prerequisites.md` items verified satisfied 2026-05-16:
  Postgres dev container up; L1 KTX extract loaded (`entities` carries the
  260 KTX cvars); the three shipped configs present in `research/repos/`
  (verified live this draft).

If Phase 1 has not executed when Phase 2 is picked up, Phase 2 is BLOCKED on
it (not a Phase 2 defect -- the slicing order is 1 -> 2). Halt and report.

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/ktx/_handler_shipped_config.py    # NEW duck-typed standalone sibling handler (match_events precedent); reads .cfg text, NOT libclang
apps/qw-oracle/scripts/extractors/ktx/output/ktx-shipped-config-ast.json  # GENERATED AST output (artifact; emitted by the handler, like every other output/*.json)
apps/qw-oracle/scripts/load-knowledge/load-ktx-shipped-config.ts    # NEW loader adapter (fill-not-create; JSONB via tx.json; clobber-guard; >50%-drop guard)
apps/qw-oracle/scripts/describe-fill/extract-ktx-mechanical.ts       # NEW idempotency+coverage harness/driver (beside the Phase 1 spine)
```

### Modified

```
apps/qw-oracle/scripts/extractors/ktx/extract.py                    # register the new handler in collect_handlers() (one import + one dict entry)
apps/qw-oracle/scripts/load-knowledge/index.ts                      # add the `load-ktx-shipped-config` subcommand + its usage block (mirrors load-ktx-modes)
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts               # extend F1.jsonb_columns_not_strings to ktx description_provenance + add F1.describe_fill.provenance_entry_exists to REGRESSION_PROBES
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md  # Phase 2 status column only (operator-driven)
```

### Deleted

```
n/a   # Phase 2 is purely additive (fill-not-create; new sibling handler + adapter + probes).
```

## Tasks

### Task 1 -- The KTX shipped-config sibling extractor handler

- **Goal:** a NEW duck-typed standalone handler that parses the three
  mechanical shipped-config files and emits, per (cvar, source-file), the
  candidate text + structured choices + shipped value + provenance, plus an
  `unresolved` section for config-drift set-names -- and renders ZERO quality
  verdict (D9 seam).
- **Files:** `apps/qw-oracle/scripts/extractors/ktx/_handler_shipped_config.py`
  (created); `apps/qw-oracle/scripts/extractors/ktx/extract.py` (modified);
  `apps/qw-oracle/scripts/extractors/ktx/output/ktx-shipped-config-ast.json`
  (generated).
- **Steps:**
  - [ ] Recon `_handler_match_events.py` as the precedent: a class with
        `name = HANDLER_NAME`, `setup(...)`, and Visitor-lifecycle methods as
        duck-typed no-op stubs so `extract.py`'s per-handler loop works
        without libclang. Mirror that shape. Do NOT import `clang.cindex`;
        do NOT inherit `Visitor`; do NOT touch `_handler_cvars.py` (the
        libclang registration handler is a DIFFERENT tier -- D9 forbids
        folding in).
  - [ ] Source artifact discovery: the three `coverage.ndjson`
        `extractability:"mechanical"` KTX-cvar files, by repo-relative path
        (in-repo `resources/example-configs/ktx/ktx.cfg`; nQuake
        `sv-configs/ktx/ktx.cfg`; nQuake `sv-gpl/ktx/port_template.cfg`).
        Consume ONLY mechanical-classified sources -- the usermodes
        bare-`set`, `SETUP_FFA_CTF.txt`, and wiki surfaces are LLM-assisted/
        hand-curate and route to Phase 3 / the C1 track, NOT here (D9 input
        boundary -- keeps the denominator precise, C1).
  - [ ] Parse each file. Line grammar (verified live): `^\s*set\s+(\S+)\s+
        (\S+)\s*//\s*(.*)$` -> name, shipped_value, raw_comment. A set line
        whose comment ends with a continuation marker (`(bit mask):` and the
        general "comment ends with `:`, next line(s) are `//`-only") absorbs
        subsequent `^\s*//` continuation lines into the raw_comment +
        structured bitmask table until a non-comment / blank / next-`set`
        line. Comments explain WHY in the code, not WHAT (P5).
  - [ ] Structured choices kept structured (D9 / P2): from the comment,
        parse inline enum `(N = label, N = label, ...)` into
        `[{value,label}, ...]`, and bitmask continuation `bit=label,
        bit=label` into `[{bit,label}, ...]`. Emit as DATA in the record;
        never prose-flatten (re-extract is cheap, but flattening forces a
        re-extract later for the GUI/web-manager consumer -- D9).
  - [ ] Emit `ktx-shipped-config-ast.json`:
        `{ "records": [ { name, source_file, source_line, shipped_value,
        raw_comment, structured_choices: {enum?: [...], bitmask?: [...]} },
        ... ], "unresolved": [ { name, source_file, source_line,
        shipped_value, raw_comment }, ... ], "stats": {...} }`.
        ONE record per (name, source-file) -- in-repo-vs-nQuake drift is
        emitted as TWO records, NEVER merged at extract time
        (F-C2a/D9/C2/D10). The handler does NOT decide which file "wins",
        does NOT set any verdict/affirm field, does NOT compare comments for
        quality -- it harvests and STOPS (D9 seam). `unresolved` carries
        set-names with no resolving KTX entity (the loader, which has DB
        access, makes the final resolve decision case-insensitively; the
        handler emits ALL parsed records and lets the loader split -- the
        handler has no DB).
  - [ ] Register in `extract.py` `collect_handlers()`: one lazy import + one
        entry, exactly like the existing handlers. Confirm `--handlers
        shipped_config` runs it standalone.
- **Verification:**
  `cd apps/qw-oracle && python scripts/extractors/ktx/extract.py --handlers
  shipped_config` (or the repo's documented extract invocation) emits
  `output/ktx-shipped-config-ast.json`; then
  `jq '.records | length' output/ktx-shipped-config-ast.json` is > 100 and
  `jq '[.records[] | .source_file] | unique' ...` lists exactly the three
  config paths; `jq '.records[] | select(.name=="k_short_gib")'` yields TWO
  records (in-repo value 1, nQuake value 0, identical raw_comment) -- proving
  per-(cvar,file) preservation, NOT merge. PASS condition: >=2 distinct
  source_file values, k_short_gib present as 2 unmerged records, ZERO
  verdict/affirm/quality keys anywhere in the JSON
  (`jq '[.. | objects | keys[]] | unique' ...` contains none of
  `verdict|confidence|reasoning|affirm|quality`). FAIL: a merged k_short_gib
  single record, or any quality/verdict key.
- **Execution mode:** `subagent (Sonnet 4.7 MAX)` -- new-sibling parser
  synthesis, judgment-dense (continuation-line state machine, enum/bitmask
  sub-parsing, the D9 harvest-and-STOP discipline) but the design
  constraints are fully specified here; Sonnet MAX preferred for speed over
  Opus medium. NOT inline: an extractor is explicitly not inline-shaped
  (`feedback_no_subagents_for_mechanical_edits` sharpened; phase-template).

### Task 2 -- The loader adapter (fill-not-create, idempotent, P2-correct)

- **Goal:** an idempotent loader that fills the existing KTX cvar rows from
  the AST JSON -- retained `description_provenance` JSONB (all sources,
  never merged), the staged `shipped_doc` candidate, structured choices --
  with a clobber-guard that never regresses a terminal evaluated state, a
  >50%-drop regression guard, and the config-drift `unresolved` recorded.
- **Files:**
  `apps/qw-oracle/scripts/load-knowledge/load-ktx-shipped-config.ts`
  (created); `apps/qw-oracle/scripts/load-knowledge/index.ts` (modified).
- **Steps:**
  - [ ] Mirror the `load-ktx-modes` adapter + `index.ts` subcommand shape:
        `if (subcommand === 'load-ktx-shipped-config') { await
        runLoadKtxShippedConfig(rest); return; }`, default json path
        `join(__dirname,'..','extractors','ktx','output',
        'ktx-shipped-config-ast.json')`, plus its usage block. Use the
        existing `db.ts` postgres-js helper -- no new DB access layer.
  - [ ] Resolve each AST record's `name` to a live KTX cvar entity
        case-insensitively via `entities.name_fold` (the any-case-in
        contract; API_CONTRACTS / migration 013). Records that resolve ->
        fill that entity row. Records that do NOT resolve + every AST
        `unresolved` entry -> recorded to a run report + logged (a
        config-drift datum: config sets a name absent from the registration
        set, the C2/C3 class) and routed to the Phase 3 / C1 track. NEVER
        create an entity (D9 fill-not-create). NEVER silently drop (C1).
  - [ ] For each resolved entity, build the retained `description_provenance`
        as a JS array, one object per contributing (cvar, source-file):
        `{ source_file, source_line, shipped_value, raw_comment,
        structured_choices }`. Bind it as a JS value via `tx.json(...)` (or
        pass the JS array directly to postgres-js) -- NEVER
        `JSON.stringify`. There is NO correct in-repo precedent (legacy
        help_values/flag_names are TEXT JSON.stringify -- do NOT copy that);
        P2 + F-C5a make this load-bearing. The element widens the Phase-1
        shape with `structured_choices` (Open Q (b) deviation -- additive,
        no migration; Phase 1's boolean k_short_gib never exercised it).
  - [ ] Stage the candidate: set `description` = the authoritative entry's
        `raw_comment` and `description_origin = 'shipped_doc'`. This is the
        D9 harvest, NOT a verdict: write NO
        `description_verdict`/`description_confidence`/`description_reasoning`/
        `description_proposed`/`description_anchor_version`; do NOT write the
        cvar's source `default_value` (the shipped value lives in the
        provenance entry as data -- D9/D10; config-value policy is Phase 3/
        D10). "Authoritative entry" for the staged candidate = a fixed
        deterministic precedence (in-repo `ktx.cfg` > nQuake `ktx.cfg` >
        `port_template.cfg`) so the run is idempotent; this picks which
        comment is STAGED, it is NOT a conflict resolution (Phase 3 owns
        that, with all retained entries in hand).
  - [ ] **Clobber-guard (C4/D19/P3 -- load-bearing):** the UPSERT keys on
        the existing entity row (`canonical_id`/`id`; never INSERT a new
        entity). It reconciles `description_provenance` on EVERY resolved row
        (deterministic -> identical on re-run). It writes the staged
        `description`/`description_origin='shipped_doc'` ONLY when the row is
        not already in a terminal evaluated state -- i.e. skip the
        description/origin write when `description_origin IN
        ('synthesized')` OR (`description_origin='shipped_doc'` AND
        `description_verdict IS NOT NULL`) (a Phase-1/Phase-3 terminal
        state). `k_short_gib` (Phase-1 `synthesized`): its two provenance
        entries are re-derived identically and re-written (no-op in effect);
        its `synthesized` description/verdict are left intact. No duplicate
        row, no regress, counted once.
  - [ ] Regression guard (P3, the load-bearing >50%-drop abort): before
        commit, if the resolved-and-filled count is < 50% of the prior run's
        filled count (or below an F-anchor floor recorded from the first
        green run), STOP and report -- do not bypass with `--force` without a
        logged reason. Mirror the `load-ktx-modes` "STOP - count below F-
        anchor" shape.
  - [ ] All writes in one transaction; idempotent by construction (UPSERT on
        the entity key; deterministic provenance array; deterministic staged
        candidate). Re-run = identical DB state (C4/P3).
- **Verification:** run the loader twice against a fixed AST JSON; between
  runs `SELECT md5(string_agg(canonical_id || coalesce(description,'') ||
  coalesce(description_origin,'') || coalesce(description_provenance::text,''),
  ',' ORDER BY canonical_id)) FROM entities WHERE project='ktx' AND
  type='cvar';` is identical. `SELECT count(*) FROM entities WHERE
  project='ktx' AND type='cvar';` is unchanged at 260 (fill-not-create).
  `k_short_gib` row: `description_origin` still `synthesized`, provenance
  still 2 entries. PASS: identical md5 across runs, count==260,
  k_short_gib untouched-but-reconciled. FAIL: md5 differs, count != 260, or
  k_short_gib regressed to `shipped_doc`.
- **Execution mode:** `subagent (Opus 4.7 medium)` -- multi-file
  integration where the idempotency contract, the clobber-guard against the
  Phase-1 terminal row, and the P2 JSONB-binding correctness are
  load-bearing and there is NO correct in-repo JSONB precedent to pattern-
  match; knowledge breadth across the loader corpus + the C4/D19 invariants
  matters more than raw speed. Not inline (a loader is not inline-shaped).

### Task 3 -- The two C5 JSONB/provenance F1 probes

- **Goal:** ship the regression probes for the data shape Phase 2 is the
  first to write at volume (retained-provenance JSONB), GREEN at the phase
  boundary (C5 / F-C5a): extend the existing jsonb-not-string probe to the
  KTX provenance column, and add a provenance-entry-exists probe.
- **Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`
  (modified).
- **Steps:**
  - [ ] Extend `F1.jsonb_columns_not_strings`: it currently early-returns a
        skip unless `ctx.project === 'ezquake'`. Widen so that for
        `ctx.project === 'ktx'` it also asserts
        `jsonb_typeof(description_provenance) = 'array'` for every
        `entities` row where `description_provenance IS NOT NULL`
        (a pre-stringified write would be a `string` scalar -- the live P2
        failure mode). Keep the ezQuake branch unchanged. `FAIL` lists
        offenders, else `PASS`.
  - [ ] Add `probeDescribeFillProvenanceEntryExists` returning
        `ProbeResult` (the live `Probe` interface; pure read-only SQL):
        for `project IN ('ktx','mvdsv')` and `type IN
        ('cvar','command','cmdline_param','info_key')`, every row with
        `description_origin = 'shipped_doc'` has `description_provenance`
        a JSONB array with `jsonb_array_length >= 1`. `FAIL` lists
        offenders, else `PASS`. Register in `REGRESSION_PROBES` as
        `F1.describe_fill.provenance_entry_exists`, `family:'regression'`.
  - [ ] Do NOT re-add the Phase 1 probes (`origin_vocabulary`,
        `synthesized_requires_anchor`) -- those are Phase 1 deliverables;
        Phase 2 only adds the provenance/jsonb shape it is first to write at
        volume (C5: the probe lands in the phase that first writes the
        shape). Phase 2's loader writing `shipped_doc` keeps
        `origin_vocabulary` GREEN (it is in-vocabulary) -- assert that, do
        not duplicate the probe.
- **Verification:**
  `cd apps/qw-oracle && bun scripts/load-knowledge/index.ts quality-grid
  --project ktx --family regression --probe F1.jsonb_columns_not_strings`
  then `--probe F1.describe_fill.provenance_entry_exists` then
  `--probe F1.describe_fill.origin_vocabulary`. PASS condition: all three
  print `[PASS]` after Task 2's load. Pre-load baseline: both Phase-2 probes
  are vacuously GREEN (0 `shipped_doc` rows, 0 non-null provenance pre-load);
  the real assertion is GREEN AFTER the volume load.
- **Execution mode:** `subagent (Sonnet 4.7 medium)` -- code synthesis
  against a clear, established in-file pattern (the existing probe functions
  + the ezQuake jsonb branch are the template), single file, project-scoped
  SQL reasoning required.

### Task 4 -- Idempotency + coverage assertion harness

- **Goal:** a thin driver that runs extract+load twice, asserts identical DB
  state, computes coverage vs the POST-Phase-0 KTX-cvar M denominator
  (reconned live at execution; pre-Phase-0 was 260, the gate-SHAPE not a
  frozen number -- C1; see Recon facts), confirms
  `k_short_gib` is counted exactly once and its Phase-1 state intact, and
  reports the not-mechanically-covered residue as the explicit tracked
  Phase-3 hand-off. This task IS the phase-boundary verification.
- **Files:**
  `apps/qw-oracle/scripts/describe-fill/extract-ktx-mechanical.ts`
  (created).
- **Steps:**
  - [ ] Driver: run the Task 1 extract, the Task 2 load, capture the
        Task 2 md5 fingerprint; re-run extract+load; assert the fingerprint
        is identical (C4/P3 idempotency proven, not assumed).
  - [ ] Coverage report against the POST-Phase-0 KTX-cvar M (recon it live
        from `phase-0-results.md` at execution -- Phase 0 re-baselined it;
        pre-Phase-0 was 260, the gate-SHAPE not a frozen number; C1 -- the
        exhaustive denominator, not a hand-picked subset): count KTX cvars
        with >=1 `description_provenance` entry; count `description_origin =
        'shipped_doc'`; count the residue = (POST-Phase-0 M) minus
        mechanically-covered.
        The residue (incl. the 38 bot `k_fbskill_*` + the non-resolving
        config-drift names) is REPORTED as the Phase-3 hand-off list, never
        importance-cut and never a lowered denominator (C1).
  - [ ] `k_short_gib` assertions: exactly one entity row; counted exactly
        once in the coverage count; `description_origin` still
        `'synthesized'`; `description_provenance` still 2 entries
        (D19/C4 idempotency).
  - [ ] Emit a run report (counts + the residue list + the config-drift
        `unresolved` list) under the Phase 1 `scripts/describe-fill/`
        convention. ASCII only (P5).
- **Verification:** see the phase-boundary block (this task's verification
  IS the phase boundary).
- **Execution mode:** `subagent (Sonnet 4.7 medium)` -- glue/driver +
  assertions against a clear contract, single file, light integration; the
  hard logic is in Tasks 1-3.

## Verification (phase boundary)

Copy-paste, YES/NO. Run from `apps/qw-oracle/` after Task 4, against the
post-Phase-1 baseline (Phase 1 executed: 014 applied, `k_short_gib`
`synthesized` with 2 provenance entries). These are REAL queries against the
real post-Phase-1 baseline, NOT a zero-baseline idealization.

```
# 1. Fill-not-create: KTX cvar count UNCHANGED across Phase 2 vs the
#    POST-Phase-0 M (recon the live pre-Phase-2 count first; Phase 0
#    re-baselined it -- pre-Phase-0 was 260, the gate-SHAPE not a frozen
#    number).
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "SELECT count(*) FROM entities WHERE project='ktx' AND type='cvar';"
# PASS condition: equals the POST-Phase-0 KTX-cvar M captured at Phase 2
# start (pre-Phase-0 baseline was 260) AND is UNCHANGED across Phase 2
# (Phase 2 created ZERO entities; D9 fill-not-create). A count != 260 that
# matches the Phase-0 re-baseline is CORRECT (C1), not a failure.

# 2. Idempotent re-extract: run the Task 4 driver twice; fingerprints equal
cd apps/qw-oracle && bun scripts/describe-fill/extract-ktx-mechanical.ts --twice
# PASS condition: the driver prints IDENTICAL=YES (two full extract+load
# cycles produced a byte-identical entities md5 fingerprint -- C4/P3).

# 3. Coverage vs the POST-Phase-0 M + residue tracked (NOT importance-cut)
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "SELECT count(*) FROM entities WHERE project='ktx' AND type='cvar' \
  AND description_provenance IS NOT NULL \
  AND jsonb_array_length(description_provenance) >= 1;"
# PASS condition: prints the mechanical-covered count (live-verified order
# ~109; the exact figure is the idempotent extract's output) AND the Task 4
# report lists residue = (POST-Phase-0 KTX-cvar M) - covered as the explicit
# Phase-3 hand-off (the denominator is the POST-Phase-0 M -- pre-Phase-0 was
# 260; residue is tracked, never cut -- C1).

# 4. k_short_gib idempotent + not regressed (D19/C4)
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "SELECT description_origin='synthesized' \
  AND jsonb_array_length(description_provenance)=2 \
  AND (SELECT count(*) FROM entities WHERE canonical_id='ktx:cvar:k_short_gib')=1 \
  FROM entities WHERE canonical_id='ktx:cvar:k_short_gib';"
# PASS condition: prints t (exactly one row; Phase-1 synthesized state
# intact; 2 provenance entries reproduced -- Phase 2 did not regress or
# duplicate the D19 row).

# 5. The C5 probes GREEN (the shape Phase 2 first writes at volume)
bun scripts/load-knowledge/index.ts quality-grid --project ktx \
  --family regression --probe F1.jsonb_columns_not_strings
bun scripts/load-knowledge/index.ts quality-grid --project ktx \
  --family regression --probe F1.describe_fill.provenance_entry_exists
bun scripts/load-knowledge/index.ts quality-grid --project ktx \
  --family regression --probe F1.describe_fill.origin_vocabulary
# PASS condition: all three print [PASS]. (#2 jsonb_typeof='array' proves
# P2 -- not a string scalar; provenance_entry_exists proves every
# shipped_doc row has >=1 retained entry; origin_vocabulary stays GREEN
# proving shipped_doc is in-vocabulary.)

# 6. D9 seam: the parser/loader rendered ZERO quality verdict
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "SELECT count(*) FROM entities WHERE project='ktx' AND type='cvar' \
  AND description_origin='shipped_doc' \
  AND (description_verdict IS NOT NULL OR description_confidence IS NOT NULL \
       OR description_reasoning IS NOT NULL);"
# PASS condition: prints 0 (Phase 2 staged shipped_doc candidates with NO
# evaluation verdict; affirm-vs-synthesize is Phase 3's -- D9 seam held).
```

If all six PASS, operator proceeds (Phase 2 -> approved/executed). If any
FAIL, consult Recovery.

## Outputs to next phase

State now true that was not before:

- A NEW KTX shipped-config sibling extractor handler
  (`_handler_shipped_config.py`, duck-typed standalone, registered in
  `extract.py`) + its loader adapter (`load-ktx-shipped-config.ts`, wired as
  the `load-ktx-shipped-config` subcommand) exist and are idempotent (C4/P3).
- Every mechanical shipped-config-resolving KTX cvar (live order ~109/260;
  exact figure = the idempotent extract's output) carries a retained
  `description_provenance` JSONB array (one entry per contributing
  source-file -- in-repo `ktx.cfg` / nQuake `ktx.cfg` / `port_template.cfg`;
  drift preserved, never merged -- F-C2a/D9/D10), with structured choices
  kept structured as data, and (where not already terminal) a staged
  `description` + `description_origin='shipped_doc'` candidate carrying NO
  quality verdict (D9 seam).
- **Phase 3 hand-off (the D5-D8 evaluation input):** every `shipped_doc`
  candidate AND every still-NULL KTX cvar (the ~151 not-mechanically-covered
  residue, incl. the 38 bot `k_fbskill_*`) flows to Phase 3. The residue is
  a tracked, enumerated hand-off list (Task 4 report), never importance-cut
  (C1). Meaning conflicts preserved as DATA for Phase 3 to flag at the D7
  tail (e.g. `k_noframechecks` polarity-label inversion); value-differences
  (e.g. `k_short_gib` 1/0, `sv_maxrate` 500000/50000) preserved as DATA and
  route to L3, NOT flagged as L1 conflicts (D10).
- The config-drift datum (11 live non-resolving config set-names:
  `k_666`, `k_dm2mod`, `sv_maxrate`, `sv_www_address`, `sv_www_authkey`,
  `k_motd2..5`, `k_autoreset`, `k_master`) recorded + routed to Phase 3 /
  the C1 track (C2/C3 class; never silently dropped, C1).
- `F1.jsonb_columns_not_strings` extended to the KTX `description_provenance`
  JSONB; `F1.describe_fill.provenance_entry_exists` registered in
  `REGRESSION_PROBES`; both GREEN. The Phase 1
  `F1.describe_fill.origin_vocabulary` stays GREEN with `shipped_doc` in
  vocabulary.
- `k_short_gib` reproduced identically (Phase-1 `synthesized` state intact,
  2 provenance entries, counted once) -- the D19/C4/P3 idempotency contract
  proven, not assumed.

Runnable state: the idempotent KTX mechanical-extract tier round-trips the
shipped-config corpus into retained provenance + staged candidates and STOPS
at the D9 seam. The commit at the phase boundary leaves the system runnable
(P4: commits on `main`, no worktree/PR; no per-phase tag -- the arc-ship tag
is end-of-arc).

## Open questions / deferred items

- **Question (a) -- the spec/gap-findings "~157/260 mechanical candidate" is
  conflated; Phase 2 plans against the verified ~109/260 + M=260 gate.**
  gap-findings "~157" mixes the existing `world.c` `source_inline`
  registration surface (68, already loaded, NOT the D9 tier) with the
  shipped-config surface. The honest D9 `shipped_doc` write target is
  ~109/260 (live exact-case verified; the loader matches case-insensitively
  via `name_fold` so the executed figure is the idempotent extract's output).
  **Default chosen for now:** Phase 2's gate is coverage vs the probe-0
  M=260 denominator with the residue tracked (C1), NOT a "hit ~157" target;
  the Recon facts record the conflation explicitly so no downstream phase
  consumes ~157 as the Phase-2 count. **Who can resolve:** operator confirm
  the verified ~109 + M=260-gate framing is the faithful reading of C1
  (not a scope-cut -- the residue is fully tracked to Phase 3). Not a
  decisions.md change; surfaced per the never-silently-comply rule (the
  lock is C1's exhaustive denominator, which this honors; the spec's prose
  figure was the imprecision).

- **Question (b) -- DEVIATION: the retained-provenance element shape needs
  widening for structured choices.** Phase 1's migration 014 locked the
  `description_provenance` element as `{source_file, source_line,
  shipped_value, raw_comment}`. Phase 2 must also retain the parsed
  structured choices (enum `{value,label}[]` / bitmask `{bit,label}[]`) per
  D9 ("structured choices kept structured ... as data, never prose-
  flattened"). **Default chosen for now (recommended):** widen the JSONB
  element with an additive `structured_choices` field -- JSONB is
  schemaless, so this is NOT a migration; it does not break Phase 1's
  `k_short_gib` record (a boolean cvar with no enum/bitmask -- the field is
  simply absent there). Rejected alternative: a dedicated
  `entities.description_choices` column -- that IS an append-only migration
  (P1) = a heavier deviation, and forces a join/extra column on every
  serializer for zero benefit over carrying it in the entry that already
  exists. **Who can resolve:** operator at phase review -- this is the lone
  deviation surfaced per the drafter prompt ("if the Phase 1 shape needs
  widening for the volume case, that is a deviation -- surface it, do not
  silently diverge"). If the operator wants the dedicated column, Task 2
  gains an append-only `db/migrations/015_*.sql` + `SCHEMA.md` in the same
  task (P1).

- **Question (c) -- `shipped_doc` as a staged candidate vs Phase 3's
  verdict.** D9 (zero quality verdict, every candidate flows to D5-D8) and
  D11 ("Phase 2 first writes `shipped_doc`") are reconciled by treating
  `description_origin='shipped_doc'` as a provenance-origin FACT, not an
  affirmation: Phase 2 sets NO verdict/confidence/reasoning, and Phase 3
  evaluates every `shipped_doc` row + every NULL row (D5-amendment: a
  shipped comment never auto-counts as done). **Default chosen for now:**
  the clobber-guard (Task 2) keeps this consistent with the Phase-1
  `k_short_gib` (which ended `synthesized`, not `shipped_doc`, because its
  full pipeline ran) -- Phase 2 never regresses a terminal origin.
  **Who can resolve:** Phase 3 drafter must honor "every `shipped_doc` is
  re-evaluated, never auto-affirmed by its origin"; operator confirms the
  seam at review. (No decisions.md conflict -- this is the faithful
  reading of D9 + D11 + the D5 amendment + the Phase 1 contract.)

- **Question (d) -- Phase 2 EXECUTION presupposes Phase 1 EXECUTION.** The
  arc is in planning; migration 014 + the Phase 1 C5 probes + the
  `k_short_gib` D19 fill do not exist live yet. **Default chosen for now:**
  Phase 2's "Inputs from previous phase" makes Phase-1-executed a hard
  precondition; if Phase 1 has not executed when Phase 2 is picked up,
  Phase 2 halts and reports BLOCKED (not a Phase 2 defect -- the slicing
  order is 1 -> 2). **Who can resolve:** arc-orchestrator at execution
  time (sequencing concern, flagged here, not a reshape -- README locks
  2 after 1).

Verification sub-agent pass completed 2026-05-17 (Explore agent, full
phase-template brief + 4 Phase-2-specific checks): ZERO CRITICAL, zero
defects requiring change. The two "substantive" items were independent
re-verifications that CONFIRMED the plan -- the agent recomputed the
shipped-config union live (120 distinct config set-names, 109 resolving to
KTX L1 cvars, 11 non-resolving exactly as listed) confirming the
~109-not-~157 conflation claim with its own evidence, and confirmed the
pre-014 live baseline is honestly recorded (migration 014 unexecuted,
`description_provenance` column count 0, highest migration 013). No finding
contradicted `decisions.md`; nothing rejected. The phase-template.md
sub-agent-brief block (lines ~225-229, item 8) still carries the
pre-correction "KTX must be tree-sitter, NOT libclang" phrasing -- factually
wrong per the dated CORRECTION 2026-05-17 (which fixed checklist item 3 but
missed the brief block); the verifier was dispatched with item 8 corrected
to the verified truth. Planner action item, not a Phase 2 defect (see the
report to the operator).

## Recovery (if verification fails)

C4 discipline throughout: recovery is re-running the corrected pipeline,
NEVER an `UPDATE` that patches the visibly-wrong rows in place.

- **Check 1 != 260 (entity count changed):** the loader created or deleted
  entities -- a D9 fill-not-create violation. Fix the loader to resolve-and-
  fill only (never INSERT into `entities`), re-run extract+load end-to-end
  (C4), re-run check 1. Do not SQL-delete the stray rows.
- **Check 2 IDENTICAL=NO (not idempotent):** the extractor or loader has a
  non-deterministic step (unstable ordering, timestamp in the record, a
  merge that depends on file read order). Make the parse + provenance array
  + staged-candidate selection deterministic, re-run twice (C4/P3). Suspect
  idempotency before staleness (`feedback_idempotency_before_staleness`).
- **Check 3 coverage far below the live ~109 order, or residue silently
  shrunk:** the extractor seam dropped candidates or the loader's
  case-insensitive resolve is wrong (case-fold), OR the denominator was
  lowered. Check the `coverage.ndjson` input boundary (D9 -- only the three
  mechanical files), check the `name_fold` resolve, do NOT lower the M=260
  denominator (C1). Re-run the corrected pipeline.
- **Check 4 k_short_gib regressed (origin no longer `synthesized`, or
  duplicated, or != 2 provenance entries):** the clobber-guard failed --
  Phase 2 overwrote the Phase-1 terminal state. Fix the guard (skip the
  description/origin write when origin is terminal; reconcile provenance
  only), re-run extract+load (C4). Do NOT `UPDATE` k_short_gib back by hand.
- **Check 5 `F1.jsonb_columns_not_strings` FAIL (jsonb is a string
  scalar):** the provenance was pre-stringified -- the P2 bug. Fix the
  loader to bind the JS value directly (or `tx.json`), re-run the load
  (C4). Never `UPDATE` the JSONB in place.
- **Check 5 `provenance_entry_exists` FAIL (a `shipped_doc` row with no
  entry):** the loader staged the origin without writing the provenance
  array. Fix the loader to write both atomically, re-run (C4).
- **Check 6 != 0 (a `shipped_doc` row carries a verdict):** the D9 seam was
  breached -- the parser/loader rendered a quality judgement. Remove the
  verdict write from Task 1/Task 2 (the harvest renders ZERO verdict;
  affirm-vs-synthesize is Phase 3), re-run the corrected pipeline (C4).
- **Unanticipated failure:** route to operator with the failing check's
  output verbatim; do not explain the gap away (CLAUDE.md verification
  discipline).
