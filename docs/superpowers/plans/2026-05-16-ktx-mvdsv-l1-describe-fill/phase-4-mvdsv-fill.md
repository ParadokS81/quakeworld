# Phase 4 -- MVDSV fill, sized by Phase 0

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- C1-C5 incl. the C3 amendment 2026-05-17,
>    P1-P5, D1-D19 incl. the D9 amendment 2026-05-17 + D11 amendment
>    2026-05-17 + D2 clarification 2026-05-17 + the D7 clarification
>    2026-05-17). Done.
> 2. Read `review-findings.md`; the rows whose "Phase" is this phase:
>    **F-D12a (Substantive -- the ezquake.com "124" is not a metric; Phase
>    0 produced the SHAPE; consume it, never resurrect NN/183)**,
>    **F-D12b (Substantive-positive -- the load-commands free win, 28/108
>    MVDSV commands; Phase 0 delivered it)**, **F-C2a / F-D10c (the
>    `sv_antilag` cross-fork DUAL -- describe dual, do NOT extract the
>    dusty-* fork)**, **F-C3b (Boundary -- detect+stamp+route C3 suspects,
>    do NOT classify)**. Read the dated CORRECTION 2026-05-17 in
>    "Confirmed-good": MVDSV is libclang/C; the `mvdsv.6` sibling is a NEW
>    roff-text handler, NOT the libclang registration handler, NOT
>    tree-sitter. Done.
> 3. Recon the LIVE source before inlining anything. Done -- see "Recon
>    facts". The arc is in PLANNING: Phase 0/1/2/3 are
>    approved-not-executed, so this Phase 4 MD is a paper plan whose
>    EXECUTION presupposes Phase 0/1/2/3 EXECUTION. The Recon block records
>    BOTH the live pre-execution state AND the Phase-0/1/2/3 specified
>    contracts Phase 4 consumes -- the same honest pattern Phase 2/3 used.
> 4. After drafting, dispatch the verification sub-agent (brief at the
>    bottom of `phase-template.md`, item 8 read in its
>    2026-05-17-corrected form -- MVDSV is libclang/C, the man-page sibling
>    is a non-libclang text handler) before declaring the phase MD ready.

## Goal

Phase 4 closes the MVDSV slice of the describe-fill by RE-USING the exact
machinery KTX rode -- the Phase-1 spine (the D6 guardrailed per-knob skill,
the D7 two-tier gate, the D11/D15 audit serializer, the C5 probes), the
Phase-2 D9 mechanical-extract pattern (a NEW duck-typed sibling parser, the
loader fill-not-create + clobber-guard + idempotency, the widened
`structured_choices` provenance element), and the Phase-3 D6 fan-out +
operator-tail workflow -- against every in-scope MVDSV configurable-bucket
entity, sized by Phase 0. Three mechanical surfaces feed candidates: a NEW
`mvdsv.6` roff man-page sibling parser for the cmdline tier (D9 sibling,
same emit shape as the Phase-2 KTX `.cfg` sibling -- 9 of 11
cmdline_params resolve; the 2 Windows-only and the 8 man-only macro-wrapped
flags are tracked config-drift, NEVER created -- D9 fill-not-create / C1);
a NEW MVDSV shipped-config sibling parser over nQuake `mvdsv.cfg` +
`port_template.cfg` for the cvar tier (the verified mechanical floor); and
the Phase-0 loader-freed 28/108 MVDSV commands (the free win, each
EVALUATED -- a banner is one input, never a "done" verdict, D5 amendment).
The cvar approach is split by the Phase-0 ezquake.com SHAPE report (consumed,
never re-fetched, never a NN/183 ratio -- F-D12a): bucket A easy common
`sv_*` mechanical-light, bucket B the hard dedicated-server-only tail
(qtv / demo / master / server-antilag) synthesis-heavy routing to D6 / the
C1 residue track, bucket C ezquake.com-only. Then the Phase-1 D6 skill fans
out (Opus 4.7 MAX -- spec-locked D7, recorded, NOT lowered) over EVERY
in-scope MVDSV entity that the mechanical extract did not settle: the
shipped_doc candidates (each evaluated affirm-vs-synthesize, D5 amendment),
every residual NULL cvar (the hard dedicated tail), the ~80 command
synthesis tail, every cmdline_param, and the 45 source_inline info_keys
(structural -- evaluated, near-universal affirm; no presumptive exemption,
C1) -- each ending with an affirmed-or-synthesized owned description through
the D7 two-tier gate, with D10 meaning-conflicts (incl. the `sv_antilag`
cross-fork DUAL -- Phase 4 OWNS `mvdsv:cvar:sv_antilag`, describing BOTH
the mainline-MVDSV/KTX-consumed meaning and the dusty-ktx fork meaning,
never collapsed, the fork NOT extracted -- F-D10c) resolved INLINE at the
D7 operator tail, C3 suspects dead-stamped + routed (detect/stamp/route
only, never classified -- F-C3b), and genuine not-source-legible residue
tracked to the C1 outreach track (never importance-cut, C1). The runnable,
verifiable state at the phase boundary is HONESTLY hybrid (the same regime
Phase 3 used): the automated half -- every in-scope MVDSV entity (the
POST-Phase-0 re-baselined probe-0 C1 denominators; pre-Phase-0 cvar M=183 /
command M=108 / cmdline_param M=11 / info_key M=45) carries an
affirmed-or-synthesized description OR an enumerated C1-outreach-track
residue row, the mechanical extract is idempotent (C4/P3), D7 tier-1 ran on
every synthesized row, `F1.jsonb_columns_not_strings` is extended to MVDSV
and GREEN, and the Phase-1/2/3 C5 probes stay GREEN at volume -- PLUS the
operator-run half: the D7 tier-2 batch tail (every hedged + every
residue-routed + every C2-flagged D10 meaning-conflict incl. the
`sv_antilag` DUAL + a spot-check of the auto-passed/affirmed bulk) worked
per-row by the operator on the Phase-1 D11/D15
`cvar-audit-review.html`-pattern page. Phase 4 is complete only when BOTH
halves hold.

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

Drafter-verified via `psql` against `qw-oracle-postgres-dev` and `grep`
against the live repo/configs/man-page on 2026-05-17. NOT inferred, NOT
copied from the spec/prior-phase numbers unchecked (the spec "~157"->109
conflation Phase 2 corrected is the cautionary precedent for this block).

- **The arc is in PLANNING; Phase 0/1/2/3 are approved-not-executed.**
  Live-verified absent this draft: highest migration = `013`
  (`information_schema.columns` count for `entities.description_provenance`
  = `0`; the 7 Phase-1 trail columns do not exist); `apps/qw-oracle/
  scripts/describe-fill/` does NOT exist (Phase 1 creates it);
  `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts` does
  NOT exist (Phase 1 creates it); no `describe`/`synth`/`knob`/`fill` D6
  skill under `~/.claude/skills/` (Phase 1 builds it; slug = Phase 1
  Open Q (e)); `phase-0-artifacts/` holds only `.gitkeep` (Phase 0
  creates `c3-suspect-pool.md`, `ezquake-com-shape.md`,
  `phase-0-results.md`); `load-commands.ts:28` is still
  `help_desc: entry.desc ?? null,` (the Phase-0 free win is unexecuted --
  the 28 MVDSV command banners are NOT yet loaded). **Consequence:** this
  Phase 4 MD is a paper plan whose EXECUTION presupposes Phase 0 + 1 + 2 +
  3 EXECUTION (see "Inputs from previous phase" + Open Q (d)); the
  contracts below are the Phase-0/1/2/3-specified shapes Phase 4 consumes,
  exactly as Phase 2/3's MDs honestly recorded their precondition.
- **MVDSV configurable-bucket C1 denominators (live, pre-Phase-0 -- the
  coverage gate-shape, never a hand-picked subset):** `count(*) FROM
  entities WHERE project='mvdsv' AND type IN ('cvar','command',
  'cmdline_param','info_key')` = cvar **M=183**, command **M=108**,
  cmdline_param **M=11**, info_key **M=45**. These match probe-0 exactly.
  **Phase 0 re-extracts forward and re-baselines them (correct by C1) --
  Phase 4 EXECUTION recons the POST-Phase-0 M from
  `phase-0-results.md` (old-vs-new); the M=183/108/11/45 here is the
  live pre-Phase-0 value and the gate-shape, not a frozen contract
  number.** The conflation-precedent discipline: do not trust a spec
  figure blind.
- **Pre-execution MVDSV origin distribution (live, pre-014):** cvar
  `source_inline:35`, `NULL:148`; command `NULL:108` (ALL undescribed);
  cmdline_param `NULL:11` (ALL undescribed); info_key `source_inline:45`
  (100% -- structural star-keys, already complete). ZERO `synthesized`,
  ZERO `shipped_doc` (Phase 1/2/3 unexecuted; the MVDSV side has no Phase-1
  D19 pre-fill -- `k_short_gib` is a KTX cvar, so unlike Phase 2/3 there is
  NO idempotent MVDSV pre-filled row to special-case).
- **`mvdsv:cvar:sv_antilag` live state (the D10 cross-fork DUAL Phase 4
  OWNS):** `entities` one row `canonical_id='mvdsv:cvar:sv_antilag'`,
  `description` NULL, `description_origin` NULL, `source_state=
  'source_backed'`. `cvar_versions`: `source_file='src/sv_phys.c'`,
  `source_line=53`, no trailing comment, empty default. Phase 3
  deliberately deferred it (Phase 3 Recon: "the `sv_antilag` *cvar* is
  MVDSV -- Phase 4; there is NO `ktx:cvar:sv_antilag`"). Source verified
  live:
  - **MVDSV engine side (line-identical across mainline + dusty-mvdsv --
    SAME entity, the divergence is MEANING not entity-set, D10):**
    `src/sv_phys.c:53` `cvar_t sv_antilag = {"sv_antilag","",
    CVAR_SERVERINFO}` (empty default); `Cvar_Register(&sv_antilag)` at
    `src/sv_main.c:3521`; engine treats `== 2` as full antilag (+
    projectiles with `sv_antilag_projectiles`) at `pr_cmds.c:663`,
    `pr2_cmds.c:509`, `sv_phys.c:751`, and any nonzero as base antilag at
    `sv_phys.c:1105`, `sv_user.c:4512`.
  - **DUAL leg A -- mainline-MVDSV / mainline-KTX-consumed meaning:**
    mainline KTX ships `"sv_antilag 2\n" // antilag on`
    (`research/repos/ktx/src/commands.c:4155`) and reads
    `cvar("sv_antilag")` (`ktx/src/match.c:1598`); no
    `ktx/src/antilag.c`. "On" == 2; thin passthrough into the MVDSV
    engine's `==2` path.
  - **DUAL leg B -- dusty-ktx fork meaning:**
    `research/repos/dusty-ktx/src/antilag.c` exists (783 lines, verified);
    the fork engages at `cvar("sv_antilag") == 1`
    (`dusty-ktx/src/client.c:4684`, `weapons.c:1111/1260/1649/1903/1970`),
    multi-mode. Same cvar NAME + same MVDSV engine registration, divergent
    MEANING in the dusty-ktx deployment.
  - **`dusty-ktx` AND `dusty-mvdsv` clones ARE present** at
    `research/repos/dusty-{ktx,mvdsv}`. Phase 4 reads them ONLY as
    corroborating cross-reference SOURCE EVIDENCE for the DUAL; it does
    NOT extract them into L1 (F-D10c -- the parked
    `2026-05-16-dusty-antilag-fork-l1.md` arc). `sv_antilag_no_pred` /
    `sv_antilag_projectiles` are separate MVDSV cvars in the 183 (normal
    D6 entities; `sv_antilag_no_pred` carries a source comment) -- only
    `sv_antilag` itself is the DUAL.
- **The `mvdsv.6` roff man page (the D9 cmdline sibling source):**
  `research/repos/mvdsv/docs/man/man6/mvdsv.6` exists (4763 bytes; roff
  `.SH`/`.TP`/`.B` structure). The OPTIONS section (line 52+) is a
  sequence of `.TP` blocks; a flag block is `.TP` then
  `.B -<flag> \fIARG\fP` then 1+ prose lines until the next `.TP`/`.SH`;
  non-flag `.TP` blocks exist as section dividers
  (`[unix specific parameters]`, `[common parameters]`) -- the parser
  skips a `.TP` whose next line is not `.B -<flag>`/`.B +<flag>`.
  `-progtype` enumerates 4 values inline (0=pr1, 1=native, 2=q3vm,
  3=q3vm+JIT) -- structured choices kept structured (P2/D9/D11). This is
  a REGULAR grammar a mechanical sibling parser harvests, exactly
  analogous to the `.cfg` `set <name> <val> // <comment>` grammar
  Phase 2's `_handler_shipped_config.py` parses. **Reconciliation note
  (Open Q (a)):** `coverage.ndjson` tags the man page
  `extractability:"LLM-assisted"` (probe-time structure_quality caution),
  but `decisions.md` D9 ("the `mvdsv.6` roff man page is a sibling parser
  -- same tier, same emit shape"), D11 (`mvdsv.6` named a `shipped_doc`
  source), and D12 ("MVDSV cmdline M=11, 9 from `mvdsv.6`") + the README
  phase-4 row + the drafter prompt all lock it as the D9 mechanical
  sibling parser. The decisions are the authority (`decisions.md`
  preamble: spec/decisions win); the regular `.B`-prefixed roff grammar
  bears that out. Recorded, surfaced for operator confirm, NOT silently
  diverged.
- **The cmdline cross-match (the precise Phase-4 cmdline split, verified
  live):** L1 cmdline_param set (M=11) = `-basedir`, `-d`, `-g`,
  `-game`, `+gamedir`, `-ip`, `-noerrormsgbox`, `-nopriority`, `-port`,
  `-t`, `-u`. `mvdsv.6` documents 17 flags. **9 of 11 L1 params resolve
  to a `.TP` block** (the `shipped_doc` mechanical write target): `-t`,
  `-u`, `-g`, `-d`, `-basedir`, `-game`, `+gamedir`, `-ip`, `-port`
  (matches probe-0's 9/11 = 82%). **2 L1 params NOT in `mvdsv.6`**
  (`-noerrormsgbox`, `-nopriority` -- Windows-only; the Debian man page
  omits them) -> the cmdline residue, D6-synthesized from the source
  `COM_CheckParm` site if legible, else routed to the C1 track (tracked,
  never importance-cut -- C1). **8 `mvdsv.6` flags NOT in L1** (`-cheats`,
  `-enablelocalcommand`, `-democache`, `-progtype`, `-minmemory`,
  `-heapsize`, `-mem`, `+exec` -- macro-wrapped `COM_CheckParm` via
  `src/server.h:1106-1112`, which the existing libclang `_handler_cmdline`
  Pattern-1 skips): a config-drift datum (the man documents a flag absent
  from the L1 registration set, the C2/C3 class). D9 is fill-not-create:
  Phase 4 gives these NO entity, records + tracks them (C1: never
  silently dropped), routes them to the C1 track + the D7 tail note. The
  Pattern-2 extractor extension to onboard them is OUT of scope (a
  separate concern; this arc fills descriptions, it does not re-derive the
  entity set -- D9 / arc non-goals).
- **The MVDSV shipped-config mechanical floor (the D9 cvar sibling
  source, verified live present):** nQuake
  `research/repos/nquake-distfiles/sv-configs/ktx/mvdsv.cfg` (7058 bytes,
  covers 63/183 mvdsv cvars per coverage.ndjson) and nQuake
  `research/repos/nquake-distfiles/sv-gpl/ktx/port_template.cfg` (1649
  bytes, 3/183) are the `extractability:"mechanical"` MVDSV-cvar
  shipped-config sources -- the same `set <name> <val> // comment`
  grammar Phase 2's KTX sibling parses (`fpd` 8-flag bitmask spelled out;
  boolean/int elsewhere). 35 cvars are already `source_inline` from the
  registration walk (evaluated, never auto-counted -- D5 amendment); the
  148 NULL are the gap (87 are `sv_*`, the core admin surface). The
  ezquake.com shape (Phase-0 `ezquake-com-shape.md`) sizes which of the
  148 are bucket-A mechanical-light vs bucket-B synthesis-heavy.
- **The Phase-0 free win (F-D12b, consumed):** `load-commands.ts:28` is
  live `help_desc: entry.desc ?? null,` with `const ast = entry.ast;`
  already at line 20; Phase 0 Task 1 changes it to
  `entry.desc ?? ast?.description ?? null` (+ a `types.ts`
  `CommandAstBlock.description?` field) so the 28/108 Doom-style
  function-banner descriptions already in `mvdsv-commands-ast.json` reach
  `command_versions.help_desc` -> `entities.description`. Phase 4
  consumes the POST-Phase-0 state: the 28 are description-bearing
  (origin = whatever Phase-0's free-win + `derive-entity-description`
  pipeline produced -- recon at execution; expected `source_inline`
  banner-harvested) and are EVALUATED by D6 (a banner is ONE input, never
  a "done" verdict -- D5 amendment); the remaining ~80 are the command
  synthesis tail.
- **The D9 sibling-handler precedent (verified live -- NOT libclang, NOT
  tree-sitter):** every `apps/qw-oracle/scripts/extractors/mvdsv/
  _handler_*.py` (cmdline, commands, cvars, info_keys, log_templates,
  protocol, qc_builtins) imports `from clang.cindex` and the cmdline
  handler is `class CmdlineMvdsvHandler(Visitor)` -- the EXISTING
  libclang registration tier. The Phase-4 `mvdsv.6` parser and the MVDSV
  shipped-config parser are NEW duck-typed STANDALONE siblings on the
  verified KTX `_handler_match_events.py` precedent ("does NOT use
  libclang AND does NOT inherit from Visitor", `HANDLER_NAME`,
  `setup()`, duck-typed no-op Visitor-lifecycle stubs) -- the SAME
  precedent Phase 2's `_handler_shipped_config.py` rode. They are NEW
  siblings distinct from the libclang registration handler, NOT folded in
  (D9; the dated CORRECTION 2026-05-17). `mvdsv/extract.py` exposes
  `collect_handlers()` (line 75) + an `all_handlers` dict (line 309) --
  the registration point (one lazy import + one entry, mirror Phase 2).
- **The loader / probe / citation contracts (existing -- no new format):**
  `index.ts` per-domain subcommand pattern (`load-ktx-modes` line 41,
  each with an F-anchor count-floor STOP guard at ~line 560); there are
  currently NO `load-mvdsv-*` subcommands (Phase 4's loaders are NEW
  subcommands, mirroring Phase 2's NEW `load-ktx-shipped-config`).
  `entities.name_fold` (migration 013, `UNIQUE(project,type,name_fold)`,
  `lower(name)` except `token_primitive`) is the case-insensitive resolve
  key (any-case-in/source-case-out -- API_CONTRACTS). `quality-grid.ts`
  (live 2110 lines): `F1.jsonb_columns_not_strings` early-returns a skip
  unless `ctx.project === 'ezquake'` (line 218); `REGRESSION_PROBES`
  array at line 1962; ZERO `describe_fill` probes exist yet (Phase 1/2/3
  unexecuted -- Phase 4 references them as Phase-1/2/3-delivered inputs).
  Every MVDSV cvar/command is source-backed (`cvar_versions`/
  `command_versions` `source_file`+`source_line`) -- the D6 read-site
  grounding always has a real `source_ref`; the existing citation
  mechanism is reused, no new format (P3/D6). The synthesized anchor
  version = the live MVDSV head `versions.commit_sha` at EXECUTION
  (Phase-0 re-extract advances it -- do NOT hard-code; recon live).
- **No new data shape; runner is Bun.** Phase 4 writes only the EXISTING
  migration-014 columns (description / origin / anchor / verdict /
  confidence / reasoning / proposed / provenance incl. the D11-amendment
  `structured_choices`) onto MVDSV rows that ALREADY exist
  (fill-not-create) -- it introduces NO new schema or data shape. Per C5
  ("the probe lands in the phase that first writes the shape") Phase 4
  owes no NEW probe; its C5 obligation is to EXTEND
  `F1.jsonb_columns_not_strings` to `mvdsv` (mirroring Phase 2's `ktx`
  extension -- Phase 4 is the first to write MVDSV
  `description_provenance` JSONB at volume) and to keep the four
  Phase-1/2/3 probes GREEN at MVDSV volume (Open Q (b)). `apps/qw-oracle/
  CLAUDE.md` pins Bun and forbids npm even though DEVELOPMENT.md still
  shows `npm run` -- the runner is `bun scripts/load-knowledge/index.ts`;
  do not hard-code npm.

## Inputs from previous phase

**Phase 4 consumes Phase 0 + Phase 1 + Phase 2 + Phase 3.** Per the locked
slicing analysis (`README.md`) and C3/D12: Phase 0's ezquake.com shape SIZES
Phase 4 and its C3 suspect pool is a HARD prerequisite for synthesis;
Phase 1 is the engine-agnostic spine; Phase 2 is the proven D9 mechanical
pattern; Phase 3 is the proven D6 fan-out + D7 tail workflow. Phase 4
EXECUTION requires all four EXECUTED:

- **Phase 0 executed:** `phase-0-artifacts/ezquake-com-shape.md` exists
  (bucketed name lists A/B/C + the `shipped_doc` provenance URI; NO
  `NN/183` ratio -- F-D12a) -- THIS sizes the Phase-4 cvar approach;
  `phase-0-artifacts/c3-suspect-pool.md` exists, per-(engine,type),
  build-pinned (no contemporaneity caveat) -- Phase 4 consumes its MVDSV
  section; `phase-0-results.md` records the free-win delta (28/108 MVDSV
  commands now carry `help_desc`), the re-baselined probe-0 MVDSV
  denominators (old-vs-new -- Phase 4 recons the POST-Phase-0 M), the
  fetched build commit (the anchor-version source), fallback-fired y/n.
  `load-commands.ts` + `types.ts` committed (the 28 freed).
- **Phase 1 executed:** migration `014_description_provenance_trail.sql`
  applied (the trail columns + `description_origin` admits `shipped_doc`;
  no CHECK -- the C5 probe is the enforcement); the D6 skill exists at
  its confirmed slug (synthesis dial spec-locked Opus 4.7 MAX); the D7
  two-tier gate `apps/qw-oracle/scripts/describe-fill/review-gate.ts`
  exists (tier-1 = independent Opus 4.7 MAX); the D11/D15
  `serialize-audit-review.ts` exists (inline-pairs, sortable/filterable,
  emit-from-record); the Phase-1 C5 probes
  `F1.describe_fill.origin_vocabulary` +
  `F1.describe_fill.synthesized_requires_anchor` registered + GREEN.
  (The `k_short_gib` D19 pre-fill is KTX -- it does NOT touch the MVDSV
  slice; Phase 4 has no MVDSV idempotent pre-filled row to special-case.)
- **Phase 2 executed:** the KTX shipped-config sibling extractor +
  loader + the widened `description_provenance` element
  (`{source_file, source_line, shipped_value, raw_comment,
  structured_choices}` -- the D11 amendment 2026-05-17, additive, no
  migration) shipped and idempotent; `F1.jsonb_columns_not_strings`
  extended to `ktx`; `F1.describe_fill.provenance_entry_exists`
  registered + GREEN. Phase 4 RE-USES that element shape + that probe
  pattern for MVDSV.
- **Phase 3 executed:** the KTX D6 fan-out + the D7 tier-1/tier-2
  operator-tail workflow shipped; `F1.describe_fill.
  synthesized_requires_source_ref` registered + GREEN; the
  mainline-KTX `sv_antilag` source behaviour carried in the Phase-3
  trail as cross-reference evidence for the Phase-4 DUAL. Phase 4 RE-USES
  the proven fan-out/triage/residue/operator-tail shape and the
  `synthesized_requires_source_ref` probe (does NOT re-ship it).
- Operator-side `prerequisites.md` verified satisfied (Postgres dev
  container up; L1 MVDSV extract loaded -- the 183/108/11/45 entities
  exist; the research repos incl. `mvdsv.6` + the nQuake MVDSV configs +
  the 2026-05-15 doc-landscape aids present; `.env` `DATABASE_URL`).

If Phase 0, 1, 2, or 3 has not executed when Phase 4 is picked up, Phase 4
is BLOCKED on it (not a Phase 4 defect -- the slicing order is
0/1 -> 2 -> 3 -> 4; Phase 0 is a hard synthesis prerequisite per C3/D12
AND the Phase-4 sizing input per D12/F-D12a). Halt and report BLOCKED with
which precondition is missing (Open Q (d)).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/mvdsv/_handler_mvdsv6_cmdline.py        # NEW duck-typed standalone sibling (match_events precedent); parses the mvdsv.6 roff .TP blocks; NOT libclang/Visitor
apps/qw-oracle/scripts/extractors/mvdsv/_handler_shipped_config.py        # NEW duck-typed standalone sibling; nQuake mvdsv.cfg + port_template.cfg .cfg text; the Phase-2 KTX sibling pattern, MVDSV side
apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-mvdsv6-cmdline-ast.json   # GENERATED AST output (emitted by the mvdsv.6 handler)
apps/qw-oracle/scripts/extractors/mvdsv/output/mvdsv-shipped-config-ast.json   # GENERATED AST output (emitted by the shipped-config handler)
apps/qw-oracle/scripts/load-knowledge/load-mvdsv-cmdline.ts               # NEW loader adapter (fill-not-create; tx.json JSONB; clobber-guard; >50%-drop guard)
apps/qw-oracle/scripts/load-knowledge/load-mvdsv-shipped-config.ts        # NEW loader adapter (same shape; the cvar tier)
apps/qw-oracle/scripts/describe-fill/synthesize-mvdsv.ts                  # NEW Phase-4 driver: assemble in-scope set + D6 fan-out + D7 tier-1 feed + write + coverage/residue/idempotency harness; beside the Phase-1 spine
apps/qw-oracle/scripts/describe-fill/<run-report>.md                      # GENERATED run report (coverage vs M; enumerated C1-outreach residue; the 8 man-only macro-wrapped flags + the 2 Windows-only cmdline residue + the cvar config-drift non-resolvers; the D10 meaning-conflict tail incl. sv_antilag) -- exact filename per the Phase-1 scripts/describe-fill/ run-report convention (Open Q (c))
```

The `apps/qw-oracle/scripts/describe-fill/` directory is the Phase-1
engine-agnostic-spine home; Phase 4 adds the MVDSV driver beside it (the
mirror of Phase 2's `extract-ktx-mechanical.ts` + Phase 3's
`synthesize-ktx.ts`, combined for the single-phase MVDSV slice).

### Modified

```
apps/qw-oracle/scripts/extractors/mvdsv/extract.py                       # register the two new handlers in collect_handlers()/all_handlers (two lazy imports + two entries; mirror Phase 2)
apps/qw-oracle/scripts/load-knowledge/index.ts                           # add `load-mvdsv-cmdline` + `load-mvdsv-shipped-config` subcommands + usage blocks (mirror load-ktx-modes / Phase-2 load-ktx-shipped-config)
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts                    # extend F1.jsonb_columns_not_strings to run for ktx AND mvdsv (the Phase-4 C5 obligation; mirrors Phase 2's ktx extension). No NEW probe (no new data shape -- Open Q (b))
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md   # Phase 4 status column only (operator-driven)
```

The Phase-1 D6 skill (`~/.claude/skills/<d6-skill-slug>/`), the D7 gate
(`review-gate.ts`), the D11/D15 serializer (`serialize-audit-review.ts`),
and the Phase-2 `_handler_shipped_config.py` are CONSUMED / pattern-reused
by Phase 4, not modified -- they are Phase-1/2 deliverables. (If the
Phase-2 KTX shipped-config handler is parameterizable per-engine rather
than KTX-hard-coded, the MVDSV shipped-config handler may be a thin
config of it instead of a copy -- the executor judges fidelity-vs-reuse at
Task 2; either way it is a NEW MVDSV sibling registered in `mvdsv/
extract.py`, never a KTX-handler edit. Recorded, not pre-decided.)

### Deleted

```
n/a   # Phase 4 is purely additive: fill description fields on existing MVDSV rows (fill-not-create), two new sibling handlers + two loader adapters + one driver, one probe extension. C4 recovery is re-run, never a delete/UPDATE.
```

## Tasks

### Task 1 -- The `mvdsv.6` roff man-page sibling parser (D9 cmdline tier)

- **Goal:** a NEW duck-typed standalone handler that parses the `mvdsv.6`
  roff OPTIONS `.TP` blocks and emits, per (param, source-file), the
  man-page prose + structured choices (`-progtype` enum) + provenance,
  plus an `unresolved` section, and renders ZERO quality verdict (D9
  seam).
- **Files:** `apps/qw-oracle/scripts/extractors/mvdsv/
  _handler_mvdsv6_cmdline.py` (created);
  `apps/qw-oracle/scripts/extractors/mvdsv/extract.py` (modified);
  `apps/qw-oracle/scripts/extractors/mvdsv/output/
  mvdsv-mvdsv6-cmdline-ast.json` (generated).
- **Steps:**
  - [ ] Recon `apps/qw-oracle/scripts/extractors/ktx/
        _handler_match_events.py` as the precedent: a class with
        `name = HANDLER_NAME`, `setup(...)`, duck-typed no-op
        Visitor-lifecycle stubs so `extract.py`'s per-handler loop works
        without libclang. Mirror that shape. Do NOT import
        `clang.cindex`; do NOT inherit `Visitor`; do NOT touch
        `_handler_cmdline.py` (the libclang registration handler is a
        DIFFERENT tier -- D9 forbids folding in; the dated CORRECTION
        2026-05-17).
  - [ ] Source artifact discovery: `research/repos/mvdsv/docs/man/man6/
        mvdsv.6` by repo-relative path (glob-discover, like the precedent
        discovers its artifact).
  - [ ] Parse the roff OPTIONS section. Grammar (verified live): from
        `.SH OPTIONS` to the next `.SH`, a flag block is `.TP` then
        `.B <flag> [\fI..\fP]` then 1+ prose lines until the next `.TP`/
        `.SH`. SKIP a `.TP` whose next line is NOT `.B -<flag>`/
        `.B +<flag>` (the `[unix specific parameters]` /
        `[common parameters]` section dividers are NOT flags). Strip roff
        markup (`\fI..\fP`, `\fP`, `.br`, leading `.B`) into plain ASCII
        prose (P5). Comments explain WHY (P5).
  - [ ] Structured choices kept structured (D9/P2/D11): `-progtype`
        enumerates `0=pr1, 1=native, 2=q3vm, 3=q3vm+JIT` inline -> parse
        into `structured_choices.enum = [{value,label},...]`; `-cheats`
        enumerates give-item codes -> same. Emit as DATA, never
        prose-flatten.
  - [ ] Emit `mvdsv-mvdsv6-cmdline-ast.json`:
        `{ "records": [ { name, source_file, source_line, raw_text,
        structured_choices? }, ... ], "unresolved": [ ... ],
        "stats": {...} }`. ONE record per (name, source-file) -- the man
        page is the single source here, so one record per flag; the
        shape still matches the Phase-2 per-(name,source-file) contract
        so the loader is uniform. `name` is the flag exactly as written
        (`-basedir`, `+gamedir`). The handler does NOT decide
        resolve-vs-unresolved (it has no DB) -- it emits ALL parsed flag
        blocks; the loader (DB access) splits resolve vs config-drift
        case-insensitively. The handler renders NO verdict/affirm/quality
        field (D9 seam: harvest + STOP).
  - [ ] Register in `mvdsv/extract.py` `collect_handlers()`/
        `all_handlers`: one lazy import + one entry, exactly like the
        existing handlers. Confirm `--handlers mvdsv6_cmdline` runs it
        standalone.
- **Verification:**
  `cd apps/qw-oracle && python scripts/extractors/mvdsv/extract.py
  --handlers mvdsv6_cmdline` (or the repo's documented extract
  invocation) emits `output/mvdsv-mvdsv6-cmdline-ast.json`; then
  `jq '.records | length' ...` is >= 17 (the documented flag blocks);
  `jq '.records[] | select(.name=="-progtype") | .structured_choices.enum
  | length' ...` is 4; `jq '[.. | objects | keys[]] | unique' ...`
  contains NONE of `verdict|confidence|reasoning|affirm|quality` (D9
  seam). PASS: >=17 records, `-progtype` carries the 4-value enum, ZERO
  verdict/quality keys. FAIL: a section-divider `.TP` emitted as a flag,
  `-progtype` enum prose-flattened, or any quality/verdict key.
- **Execution mode:** `subagent (Sonnet 4.7 MAX)` -- new-sibling roff
  parser synthesis, judgment-dense (the `.TP`/`.B`/divider state machine,
  roff-markup stripping, inline-enum sub-parsing, the D9 harvest-and-STOP
  discipline) but the design constraints are fully specified here;
  Sonnet MAX preferred for speed over Opus medium. NOT inline (an
  extractor is explicitly not inline-shaped --
  `feedback_no_subagents_for_mechanical_edits` sharpened; phase-template).

### Task 2 -- The MVDSV shipped-config sibling parser (D9 cvar tier)

- **Goal:** a NEW duck-typed standalone handler that parses the nQuake
  MVDSV shipped configs and emits, per (cvar, source-file), the config
  author's description text + structured choices + shipped value (as
  DATA, not the source default) + provenance, plus an `unresolved`
  section, ZERO quality verdict (D9 seam) -- the MVDSV mirror of Phase 2's
  KTX shipped-config tier.
- **Files:** `apps/qw-oracle/scripts/extractors/mvdsv/
  _handler_shipped_config.py` (created);
  `apps/qw-oracle/scripts/extractors/mvdsv/extract.py` (modified);
  `apps/qw-oracle/scripts/extractors/mvdsv/output/
  mvdsv-shipped-config-ast.json` (generated).
- **Steps:**
  - [ ] Recon Phase 2's `apps/qw-oracle/scripts/extractors/ktx/
        _handler_shipped_config.py` (the proven precedent -- the
        match_events duck-typed shape + the `set <name> <val> //
        comment` line grammar + the inline-enum `(N = label, ...)` +
        bitmask-continuation sub-parsers + the per-(name,source-file)
        emit + the `unresolved` section + the D9 harvest-and-STOP seam).
        Reuse it: if it is per-engine parameterizable, register a thin
        MVDSV config of it; if KTX-hard-coded, copy the proven shape into
        the MVDSV sibling (the executor judges reuse-vs-copy fidelity --
        recorded, not pre-decided; either way a NEW MVDSV sibling, never a
        KTX-handler edit).
  - [ ] Source artifact discovery: the two `coverage.ndjson`
        `extractability:"mechanical"` MVDSV-cvar shipped configs by
        repo-relative path -- nQuake `sv-configs/ktx/mvdsv.cfg` (63/183)
        and nQuake `sv-gpl/ktx/port_template.cfg` (3/183). Consume ONLY
        mechanical-classified sources (D9 input boundary -- keeps the
        denominator precise, C1).
  - [ ] Parse: the verified `^\s*set\s+(\S+)\s+(\S+)\s*//\s*(.*)$` line
        grammar (+ the bitmask-continuation absorption Phase 2 proved --
        e.g. nQuake `mvdsv.cfg`'s `fpd` 8-flag table). Structured choices
        kept structured (enum `{value,label}[]`, bitmask `{bit,label}[]`)
        as DATA (D9/P2/D11), never prose-flattened.
  - [ ] Emit `mvdsv-shipped-config-ast.json` in the EXACT Phase-2 AST
        shape: `{ "records": [ { name, source_file, source_line,
        shipped_value, raw_comment, structured_choices? }, ... ],
        "unresolved": [ ... ], "stats": {...} }`. ONE record per (cvar,
        source-file) -- drift preserved as TWO records, NEVER merged at
        extract time (F-C2a/D9/C2/D10). ZERO verdict/affirm/quality field
        (D9 seam: harvest + STOP). The handler emits ALL parsed records;
        the loader (DB access) splits resolve vs config-drift.
  - [ ] Register in `mvdsv/extract.py`: one lazy import + one entry.
        Confirm `--handlers shipped_config` runs it standalone.
- **Verification:**
  `cd apps/qw-oracle && python scripts/extractors/mvdsv/extract.py
  --handlers shipped_config` emits
  `output/mvdsv-shipped-config-ast.json`; `jq '.records | length' ...`
  is > 60; `jq '[.records[] | .source_file] | unique' ...` lists exactly
  the two nQuake MVDSV config paths; the `fpd` bitmask is a structured
  `bitmask` array (not prose); `jq '[.. | objects | keys[]] | unique'
  ...` contains none of `verdict|confidence|reasoning|affirm|quality`.
  PASS: >60 records, 2 source_file values, `fpd` structured, ZERO
  verdict/quality keys. FAIL: merged records, prose-flattened bitmask, or
  a quality key.
- **Execution mode:** `subagent (Sonnet 4.7 MAX)` -- new-sibling parser
  synthesis reusing the proven Phase-2 shape; judgment-dense
  (reuse-vs-copy fidelity call + the continuation state machine) but
  fully specified; Sonnet MAX for speed. NOT inline (extractor).

### Task 3 -- The two MVDSV mechanical loader adapters (fill-not-create, idempotent, P2-correct)

- **Goal:** two idempotent loaders (`load-mvdsv-cmdline`,
  `load-mvdsv-shipped-config`) that fill EXISTING MVDSV rows from the
  Task-1/Task-2 AST JSON -- retained `description_provenance` JSONB (incl.
  the D11-amendment `structured_choices`), the staged `shipped_doc`
  candidate -- with a clobber-guard, a >50%-drop regression guard, and
  the config-drift residue (the 8 man-only macro-wrapped flags + the 2
  Windows-only cmdline params + the cvar non-resolvers) recorded + tracked
  (C1), NEVER created (D9 fill-not-create).
- **Files:** `apps/qw-oracle/scripts/load-knowledge/load-mvdsv-cmdline.ts`
  + `apps/qw-oracle/scripts/load-knowledge/load-mvdsv-shipped-config.ts`
  (created); `apps/qw-oracle/scripts/load-knowledge/index.ts` (modified).
- **Steps:**
  - [ ] Mirror the `load-ktx-modes` / Phase-2 `load-ktx-shipped-config`
        adapter + `index.ts` subcommand shape:
        `if (subcommand === 'load-mvdsv-cmdline') { await
        runLoadMvdsvCmdline(rest); return; }` (and `-shipped-config`),
        default json paths under `scripts/extractors/mvdsv/output/`,
        usage blocks. Use the existing `db.ts` postgres-js helper -- no
        new DB access layer.
  - [ ] Resolve each AST `name` to a live MVDSV entity case-insensitively
        via `entities.name_fold` (migration 013;
        `type='cmdline_param'` for Task 1's output, `type='cvar'` for
        Task 2's). Records that resolve -> fill that entity row. Records
        that do NOT resolve + every AST `unresolved` entry -> recorded to
        the run report + logged and routed to the C1 track + the D7 tail
        note (NEVER create an entity -- D9 fill-not-create; NEVER silently
        drop -- C1). Specifically the cmdline loader records the **8
        man-only macro-wrapped flags** (`-cheats`, `-enablelocalcommand`,
        `-democache`, `-progtype`, `-minmemory`, `-heapsize`, `-mem`,
        `+exec`) as the config-drift datum (man documents a flag absent
        from the L1 registration set -- the C2/C3 class); the Pattern-2
        extractor extension to onboard them is OUT of scope (a separate
        concern -- D9 fill-not-create / arc non-goals).
  - [ ] For each resolved entity build the retained
        `description_provenance` as a JS array, one object per
        contributing (entity, source-file): `{ source_file, source_line,
        shipped_value, raw_comment, structured_choices }` -- the
        D11-amendment widened element Phase 2 established (additive, no
        migration). Bind it as a JS value via `tx.json(...)` or pass the
        JS array directly to postgres-js -- NEVER `JSON.stringify` (P2 /
        F-C5a; the legacy `help_values`/`flag_names` TEXT-JSON is the
        anti-pattern, do NOT copy it). For the cmdline tier `shipped_value`
        is absent (a flag has no shipped value) -- omit the field, keep
        the element shape uniform.
  - [ ] Stage the candidate: set `description` = the authoritative
        entry's `raw_comment`/`raw_text` and `description_origin =
        'shipped_doc'`. This is the D9 harvest, NOT a verdict: write NO
        `description_verdict`/`confidence`/`reasoning`/`proposed`/
        `anchor_version`; do NOT write the cvar's source `default_value`
        (the shipped value lives in provenance as DATA -- D9/D10;
        config-value policy is Task 5/D10). "Authoritative entry" = a
        fixed deterministic precedence (cmdline: the single `mvdsv.6`
        entry; cvar: nQuake `mvdsv.cfg` > `port_template.cfg`) so the run
        is idempotent; this STAGES a comment, it is NOT conflict
        resolution (Task 5 owns that, with all retained entries in hand).
  - [ ] **Clobber-guard (C4/P3 -- load-bearing):** UPSERT on the existing
        entity key (`canonical_id`/`id`; never INSERT a new entity).
        Reconcile `description_provenance` on EVERY resolved row
        (deterministic -> identical on re-run). Write the staged
        `description`/`description_origin='shipped_doc'` ONLY when the row
        is not already in a terminal evaluated state (skip when
        `description_origin IN ('synthesized')` OR
        (`description_origin='shipped_doc'` AND `description_verdict IS
        NOT NULL`)). MVDSV has no Phase-1 D19 pre-fill, so unlike Phase 2
        there is no `k_short_gib`-class row to protect at THIS phase --
        but the guard is still load-bearing for Phase-4-internal
        re-runs (Task 5 may set `synthesized`/verdict on a row that
        Task 3 re-touches on a recovery re-run -- C4).
  - [ ] Regression guard (P3, the >50%-drop abort): if the
        resolved-and-filled count is < 50% of the prior run's filled
        count (or below an F-anchor floor recorded from the first green
        run), STOP and report -- do not bypass with `--force` without a
        logged reason. Mirror the `load-ktx-modes` "STOP - count below
        F-anchor" shape.
  - [ ] All writes in one transaction; idempotent by construction
        (UPSERT on the entity key; deterministic provenance array;
        deterministic staged candidate). Re-run = identical DB state
        (C4/P3).
- **Verification:** run each loader twice against fixed AST JSON; between
  runs `SELECT md5(string_agg(canonical_id || coalesce(description,'') ||
  coalesce(description_origin,'') || coalesce(description_provenance::text,
  ''), ',' ORDER BY canonical_id)) FROM entities WHERE project='mvdsv'
  AND type IN ('cvar','cmdline_param');` is identical across runs;
  `SELECT count(*) FROM entities WHERE project='mvdsv' AND type IN
  ('cvar','command','cmdline_param','info_key');` unchanged at the live M
  (fill-not-create); the run report enumerates the 8 man-only flags + the
  2 Windows-only params + the cvar non-resolvers. PASS: identical md5,
  count unchanged, residue enumerated (not dropped). FAIL: md5 differs,
  count changed, or any residue silently dropped.
- **Execution mode:** `subagent (Opus 4.7 medium)` -- multi-file
  integration where the idempotency contract, the clobber-guard, and the
  P2 JSONB-binding correctness are load-bearing and the only in-repo
  JSONB precedent is Phase 2's (consume it, do not regress it); knowledge
  breadth across the loader corpus + the C4/P3 invariants matters more
  than raw speed. Not inline (a loader is not inline-shaped).

### Task 4 -- The in-scope MVDSV evaluation-set assembler (the D6 fan-out input)

- **Goal:** from the post-Phase-0/3 DB, assemble EVERY in-scope MVDSV
  configurable-bucket entity (cvar + command + cmdline_param + info_key,
  the live POST-Phase-0 M) into a deterministic fan-out manifest, each
  entity carrying its D6 input packet + its Phase-0 bucket/suspect tags --
  with NO entity exempted and NO presumptively-covered bucket (D5
  amendment, C1).
- **Files:** `apps/qw-oracle/scripts/describe-fill/synthesize-mvdsv.ts`
  (created -- the assembler part).
- **Steps:**
  - [ ] Select every in-scope MVDSV entity (`project='mvdsv'` AND
        `type IN ('cvar','command','cmdline_param','info_key')`) from the
        post-Phase-0/3 DB. Assert the selected count == the live
        POST-Phase-0 probe-0 denominators (recon them from
        `phase-0-results.md`; do NOT trust the pre-Phase-0
        183/108/11/45 blind -- the conflation-precedent discipline). No
        MVDSV idempotent pre-fill exists (k_short_gib is KTX) -- nothing
        excluded; coverage == M.
  - [ ] Per entity build the D6 input packet (the skill's read-site
        grounding input -- NEVER the knob name alone, D6):
        - the registration/handler `source_ref` from `cvar_versions`/
          `command_versions`/the cmdline handler `source_file`+
          `source_line` (the EXISTING citation mechanism -- no new
          format, P3/D6);
        - the Task-1/2/3 retained `description_provenance` array (the
          `shipped_doc` candidate text + every contributing-file entry +
          the widened `structured_choices`; F-C2a per-source
          preservation);
        - the **Phase-0 ezquake.com bucket tag** (consume
          `phase-0-artifacts/ezquake-com-shape.md` -- bucket A easy
          common `sv_*` mechanical-light / bucket B hard
          dedicated-server-only tail synthesis-heavy / bucket C
          ezquake.com-only; ezquake.com is a `shipped_doc`-class source,
          its artifact URI a provenance line -- NO new origin tag, D2;
          do NOT re-fetch ezquake.com, do NOT compute a NN/183 ratio --
          F-D12a);
        - the **Phase-0 C3-suspect flag** (is this knob in the MVDSV
          section of `c3-suspect-pool.md`? -- the dead-stamp gate);
        - the D8 judgment-tier flag where applicable (mechanism-only
          lane);
        - the research-doc aid pointers
          (`2026-05-15-ktx-mvdsv-doc-landscape/`) -- admissible AIDS to
          locate use-sites/corroborate, source stays ground truth (D6/D7
          amendment); never a substitute citation.
  - [ ] Attach as SEPARATE manifest sections (NO entity -- recorded +
        routed to the C1 track + the D7 tail, NEVER created, NEVER
        dropped -- C1/C2/C3): the 8 `mvdsv.6` man-only macro-wrapped
        flags; the cvar config-drift non-resolvers (Task 2/3 output); and
        flag the 2 Windows-only cmdline params (`-noerrormsgbox`,
        `-nopriority` -- they DO have entities but NO `mvdsv.6` prose, so
        they route to D6 source-grounded synthesis from their
        `COM_CheckParm` site, or to C1 if not source-legible).
  - [ ] Attach the **`sv_antilag` D10 DUAL packet** specially: the MVDSV
        engine source (`sv_phys.c:53` registration; the `==2` full /
        nonzero base behaviour sites) + the mainline-KTX cross-reference
        evidence (KTX ships `sv_antilag 2`; from the Phase-3 trail) + the
        dusty-ktx fork cross-reference evidence (`dusty-ktx/src/
        antilag.c`, `==1` multi-mode -- read for corroboration ONLY,
        F-D10c: the fork is NOT extracted). Marked as a C2 meaning-
        conflict for inline resolution at the D7 tail (Task 8).
  - [ ] Emit the deterministic fan-out manifest (stable ordering ->
        idempotent re-run, C4/P3). Comments explain WHY (P5); ASCII only
        (P5).
- **Verification:** `bun scripts/describe-fill/synthesize-mvdsv.ts
  --assemble-only` prints the manifest count == the live POST-Phase-0
  (M_cvar + M_command + M_cmdline_param + M_info_key) and a per-bucket
  breakdown; the man-only flags + cvar non-resolvers are separate sections
  with zero entity ids; `sv_antilag` is flagged as the D10 DUAL with both
  source legs attached; re-running produces a byte-identical manifest.
  PASS: count == live M-sum, no bucket missing (no presumptive exemption
  -- D5-amendment/C1), residue sections carried with no entity,
  `sv_antilag` DUAL-tagged, manifest deterministic. FAIL: any in-scope
  bucket absent, count != live M-sum, a non-resolver promoted to an
  entity, the DUAL collapsed/missing, or non-deterministic output.
- **Execution mode:** `subagent (Sonnet 4.7 medium)` -- data assembly +
  multi-source join (DB + Task-1/2/3 provenance + Phase-0 shape/pool +
  research aids) against a fully-specified contract; NO synthesis
  judgment here (that is the D6 skill's, Task 5). Not inline (a driver is
  not inline-shaped).

### Task 5 -- The D6 guardrailed fan-out: evaluate every in-scope MVDSV entity (Opus 4.7 MAX -- spec-locked)

- **Goal:** fan the Phase-1 D6 skill (the unit) as sub-agents over the
  Task-4 manifest so EVERY in-scope MVDSV entity is evaluated and ends
  with an affirmed-or-synthesized owned description (or a routed-to-C1
  disposition) carrying the D11 decision trail -- the only place
  affirm-vs-synthesize is decided (D5 amendment; the D9 seam handed
  everything here).
- **Files:** `apps/qw-oracle/scripts/describe-fill/synthesize-mvdsv.ts`
  (created -- the fan-out + write part); CONSUMES
  `~/.claude/skills/<d6-skill-slug>/` (Phase 1; not modified).
- **Steps:**
  - [ ] Dispatch the D6 skill per manifest entity as a sub-agent. The
        skill runs its hard-coded D5/D5-amendment keep-vs-synthesize
        judgment on the input packet (read-site grounding; the existing
        `source_inline` comment / `shipped_doc` config or man-page gloss /
        the Phase-0-freed command banner is ONE input, never a verdict --
        D5 amendment), then takes exactly one disposition:
        - **AFFIRM** -- the existing text already meets the D5 rubric:
          `verdict=affirm`, origin UNCHANGED (`source_inline` stays
          `source_inline`; `shipped_doc` stays `shipped_doc` -- honest
          provenance, the dev/config-author's own words, no separate
          user-doc field to launder into -- D2/D5-amendment
          "affirmed-by-evaluation, not skipped"), the trail populated.
          An affirm asserts no NEW source-grounded claim, so it does NOT
          go through D7 tier-1 (Task 6); a spot-check sample of the
          affirmed bulk goes to the D7 tier-2 operator tail (Task 8).
          (The 45 source_inline info_keys + most of the 35 source_inline
          cvars + many Phase-0-freed command banners are expected to land
          here -- structural/clean; evaluated, never auto-counted -- D5
          amendment / C1.)
        - **SYNTHESIZE** -- weak / coder-rationale / cryptic / absent
          (the bucket-B hard dedicated tail, the ~80 command synthesis
          tail, the residual NULL cvars): D6 read-site-grounded
          description -> `description` set, `description_origin=
          'synthesized'`, `source_ref` file:line via the EXISTING
          mechanism (no new format -- P3/D6), `description_anchor_version`
          = the live MVDSV head `versions.commit_sha` at EXECUTION (do
          NOT hard-code; Phase 0 advances it). Goes through D7 tier-1
          (Task 6) before commit.
        - **D8 judgment lane:** judgment-tier MVDSV knobs get
          mechanism-only synthesis -> `synthesized`, count COMPLETE L1;
          the recommended-value/tuning piece is emitted as an L3
          candidate (routed OUT), its absence is NOT an L1 gap (D8).
        - **C3-suspect lane** (knob in the Phase-0 MVDSV suspect pool):
          the D6 truthful dead-stamp -- "registered in MVDSV source at
          version N; not reachable in a running build at this commit;
          appears non-functional, candidate upstream code bug" -- + route
          to the C1 outreach track. NEVER a confident "tunes X". Detect +
          stamp + route ONLY: do NOT classify genuine-dead vs
          build-excluded (F-C3b -- the parked libclang call-graph arc).
        - **Hard confabulation guard** -- behaviour not source-legible
          even at Opus-max: hedge, or route to the C1 residue track;
          NEVER guess (D6). Tracked, never importance-cut (C1).
  - [ ] **The `sv_antilag` D10 cross-fork DUAL (Phase 4 OWNS
        `mvdsv:cvar:sv_antilag`):** D6 produces a DUAL description
        carrying BOTH meanings, each source-grounded: leg A
        (mainline-MVDSV engine `sv_antilag.value == 2` full antilag +
        projectiles, nonzero base; as consumed by mainline KTX which
        ships `sv_antilag 2` "on"); leg B (the dusty-ktx fork's
        `antilag.c`, engages at `== 1`, multi-mode -- a different
        deployment of the SAME cvar name + SAME MVDSV registration). The
        description is NEVER collapsed to one; the dusty-* fork is NOT
        extracted (F-D10c -- a separate parked arc; the dusty clones are
        read ONLY as corroborating cross-reference evidence). C2-flagged
        (per C2 a clear cross-fork meaning divergence is surfaced to the
        operator with source evidence, never auto-picked) for inline
        resolution at the D7 tier-2 tail (Task 8) -- NO separate conflict
        queue, one workflow, source evidence in hand (D10).
  - [ ] D10 three-class handling INSIDE synthesis (built on C2):
        - **Value differences** (e.g. `sv_maxrate` if nQuake-vs-other
          differ): configs agree on what the knob DOES -- L1 takes the
          shared behaviour; the differing values become an L3
          recommended-value candidate (routed OUT). NOT an L1 conflict --
          do NOT flag it as one (D10).
        - **Meaning conflicts:** D6 proposes the source-grounded
          description (MVDSV source the tiebreaker -- source-truth
          dichotomy) and C2-flags the row for inline operator resolution
          at the D7 tier-2 tail (Task 8). NEVER auto-picked (C2).
          `sv_antilag` is the exemplar.
        - **Membership drift** (a cvar in one shipped config not the
          other, or man-only): union coverage; provenance records which
          file documented it; a deliberate omission is L3 context, not
          missing L1 (D10).
  - [ ] Persist each evaluated entity's D11 decision trail
        (`description_verdict`/`confidence`/`reasoning`/`proposed`)
        alongside the committed `description`/`description_origin`; D6
        emits the reasoning -- STORED, not just logged (D11). JSONB binds
        JS values / `tx.json`, never pre-stringified (P2 -- the retained
        provenance reconciled, never regressed). All writes idempotent
        (deterministic ordering; UPSERT on the existing entity key;
        fill-not-create -- C4/P3).
- **Verification:** post-fan-out, `SELECT type, count(*) FILTER (WHERE
  description IS NOT NULL OR description_verdict IS NOT NULL), count(*)
  FROM entities WHERE project='mvdsv' AND type IN ('cvar','command',
  'cmdline_param','info_key') GROUP BY type;` shows every in-scope entity
  carries an affirmed/synthesized description OR a trail-recorded
  C1-residue verdict (no NULL-everything row); a sampled C3-suspect
  carries the dead-stamp + a C1-route marker (NOT a confident
  description); `mvdsv:cvar:sv_antilag` carries a DUAL description naming
  BOTH the `==2` mainline meaning AND the `==1` dusty-ktx-fork meaning,
  C2-flagged, NOT collapsed; a sampled value-difference carries the
  shared-behaviour description with NO L1-conflict flag. PASS: zero
  in-scope entity with no disposition; C3 sample dead-stamped+routed;
  `sv_antilag` dual + C2-flagged; value-diff sample not-flagged. FAIL:
  any in-scope entity with no disposition, a C3-suspect with a confident
  description, `sv_antilag` collapsed to one meaning or not C2-flagged,
  or a value-difference flagged as an L1 conflict.
- **Execution mode:** **`subagent (Opus 4.7 MAX)` -- SPEC-LOCKED by D7
  (synthesis = the D6 skill at Opus 4.7 max reasoning); recorded, the
  planner does NOT lower it.** Per the **D7 clarification 2026-05-17**:
  the D6 skill's hard-coded D5 keep-vs-synthesize classify runs INSIDE
  this same single Opus-4.7-MAX invocation per knob; "cheap"/"fast
  affirm" is the early-exit WITHIN it (a good comment classifies-and-
  affirms quickly), NOT a separate cheaper pre-classify model tier
  outside the skill (that alternative works around the spec-locked D6
  dial and is rejected -- locked at the D7 clarification, NOT
  relitigated here).

### Task 6 -- The D7 tier-1 independent automated evidence re-check (independent Opus 4.7 MAX -- spec-locked)

- **Goal:** every SYNTHESIZED row passes an independent automated
  evidence re-check before it commits -- the load-bearing D7 tier-1
  (affirms of the dev's/config-author's own words carry no new claim and
  go to the tier-2 spot-check instead, D7).
- **Files:** CONSUMES `apps/qw-oracle/scripts/describe-fill/
  review-gate.ts` (Phase 1; not modified);
  `apps/qw-oracle/scripts/describe-fill/synthesize-mvdsv.ts` (created --
  wires the gate into the pipeline).
- **Steps:**
  - [ ] Run the Phase-1 `review-gate.ts` tier-1 over every Task-5
        `synthesized` row as an INDEPENDENT invocation -- a separate
        context from Task 5's authoring sub-agent (D7: "an independent
        verifier (separate invocation, not the authoring context)").
  - [ ] Tier-1 confirms, per row: the cited `source_ref` file:line
        actually exhibits the claimed behaviour AND the text passes the
        D5 rubric mechanically. PASS -> commit. FAIL -> bounced back to
        Task-5 re-synthesis (one bounded retry) OR routed to the C1
        residue track (the confabulation guard working as designed -- a
        row whose `source_ref` does not exhibit the claim is NOT massaged
        to pass; it is tracked honestly -- C1). The `sv_antilag` DUAL is
        re-checked against BOTH source legs.
  - [ ] Tier-1 marks the tier-2 operator-tail set: EVERY hedged row +
        EVERY C1-residue-routed row + EVERY C2-flagged D10
        meaning-conflict (incl. `sv_antilag`) + a spot-check SAMPLE of
        the auto-passed bulk AND of the Task-5 affirmed bulk (D7 tier-2).
  - [ ] The gate is engine-agnostic (Phase-1 contract) -- Phase 4 adds
        no MVDSV-specific gate logic; it feeds the structured candidate +
        the D6 trail and consumes the pass/fail/tail-mark.
- **Verification:** post-gate, `SELECT count(*) FROM entities WHERE
  project='mvdsv' AND description_origin='synthesized' AND
  description_verdict IS NULL;` is 0 (every synthesized row carries a
  gate verdict); a tier-1-failed row is either re-synthesized-and-passed
  OR carries a C1-residue verdict (NOT committed as confident); the
  tier-2 tail set is non-empty and includes `sv_antilag` + all C2-flagged
  meaning-conflicts. PASS: no synthesized row without a gate verdict;
  failed rows bounced/residue-routed (never silently committed); tail
  set complete incl. `sv_antilag`. FAIL: a synthesized row with no gate
  verdict, a tier-1-failed row committed as confident, or a C2-flag
  missing from the tail.
- **Execution mode:** **`subagent (Opus 4.7 MAX)` -- SPEC-LOCKED by D7
  (review = an independent Opus 4.7 at max), an INDEPENDENT invocation
  separate from Task 5's authoring context; recorded, NOT lowered.**

### Task 7 -- The C5 jsonb-probe MVDSV extension + the idempotent coverage/residue harness

- **Goal:** discharge Phase 4's C5 obligation (extend
  `F1.jsonb_columns_not_strings` to MVDSV -- the shape Phase 4 is the
  first to write at MVDSV volume; mirrors Phase 2's ktx extension) and
  ship the automated phase-boundary harness (coverage vs the C1
  denominators, residue enumerated not cut, idempotency proven, the
  Phase-1/2/3 C5 probes GREEN at MVDSV volume).
- **Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`
  (modified -- the jsonb-probe MVDSV extension only, NO new probe);
  `apps/qw-oracle/scripts/describe-fill/synthesize-mvdsv.ts` (created --
  the harness part) + the generated run report.
- **Steps:**
  - [ ] Extend `F1.jsonb_columns_not_strings`: it currently skips unless
        `ctx.project === 'ezquake'` and Phase 2 widened it to `ktx`.
        Widen so for `ctx.project === 'mvdsv'` it also asserts
        `jsonb_typeof(description_provenance) = 'array'` for every
        `entities` row where `description_provenance IS NOT NULL` (a
        pre-stringified write is a `string` scalar -- the live P2 failure
        mode). Keep the ezQuake + ktx branches unchanged. `FAIL` lists
        offenders, else `PASS`. WHY (P5 comment): Phase 4 is the first to
        write MVDSV `description_provenance` JSONB at volume; C5 places a
        shape's probe in the phase that first writes it -- here that is
        the project extension, not a new probe (Open Q (b)).
  - [ ] Do NOT add a new probe: Phase 4 writes NO new data shape (only
        the existing migration-014 columns + the Phase-2 `structured_choices`
        element + `synthesized`, all already watched by the Phase-1/2/3
        probes). `F1.describe_fill.origin_vocabulary` (the type-IN list
        already includes `cmdline_param`), `synthesized_requires_anchor`,
        `provenance_entry_exists`, `synthesized_requires_source_ref` all
        cover MVDSV by their existing `project IN ('ktx','mvdsv')` /
        global scope -- Phase 4 asserts them GREEN at volume, does NOT
        re-ship them (C5: each lands in the phase that first writes its
        shape). Surfaced as Open Q (b) for the operator's
        new-at-volume-vs-strict-first-writer confirm.
  - [ ] Harness (in `synthesize-mvdsv.ts`): assert every in-scope MVDSV
        entity (the live POST-Phase-0 probe-0 C1 denominators -- recon
        them, do NOT trust pre-Phase-0 183/108/11/45 blind) carries an
        affirmed-or-synthesized `description` OR an enumerated
        C1-outreach-track residue row. Residue (the not-source-legible
        tail + the C3 dead-stamped + the D8 outcome's L1-side complete +
        the 8 man-only macro-wrapped flags + the 2 Windows-only cmdline
        params + the cvar config-drift non-resolvers -- none created) is
        REPORTED, not cut: "doesn't matter for a dedicated-server admin"
        / "rare qtv knob, skip it" is a C1 violation -- if any scope-cut
        is implied, surface it as a deviation, do NOT silently comply
        (C1; CLAUDE.md verification discipline).
  - [ ] Idempotency: run the full extract-consuming fan-out + gate +
        write twice against a fixed input; assert a byte-identical
        committed-row fingerprint (`md5(string_agg(canonical_id ||
        coalesce(description,'') || coalesce(description_origin,'') ||
        coalesce(description_verdict,'') ..., ORDER BY canonical_id))`
        over the in-scope MVDSV set). C4/P3 -- proven, not assumed.
  - [ ] Emit the run report (Open Q (c) path -- the Phase-1
        `scripts/describe-fill/` run-report convention; Phase 2/3 already
        emit there): coverage vs M per bucket; the enumerated
        C1-outreach residue list; the 8 man-only flags + the 2
        Windows-only params + the cvar config-drift non-resolvers; the
        D10 meaning-conflict tail incl. the `sv_antilag` DUAL, for the
        operator. ASCII only (P5).
  - [ ] Confirm the Phase-1/2/3 probes GREEN at MVDSV volume:
        `origin_vocabulary` (`source_inline`/`synthesized`/`shipped_doc`
        in-vocabulary), `synthesized_requires_anchor`,
        `provenance_entry_exists`, `synthesized_requires_source_ref`,
        and the now-MVDSV-extended `jsonb_columns_not_strings`. Do NOT
        re-add them (C5).
- **Verification:** see the phase-boundary block (this task's automated
  assertions ARE the automated half of the phase boundary).
- **Execution mode:** `subagent (Sonnet 4.7 medium)` -- a one-branch
  probe extension against the established in-file pattern (Phase 2's ktx
  branch is the template) + a coverage/idempotency driver against a
  clear contract; single-file probe edit + glue, the hard judgment is
  Tasks 5/6.

### Task 8 -- The D7 tier-2 operator batch tail on the D11/D15 audit page (operator-run; this IS the phase boundary)

- **Goal:** the operator works the D7 tier-2 tail per-row on the Phase-1
  `cvar-audit-review.html`-pattern page, resolving the D10
  meaning-conflicts INLINE with source evidence -- the `sv_antilag`
  cross-fork DUAL the headline case; this human gate IS the Phase 4
  boundary (D7 tier-2 / D11 / D15 / D18).
- **Files:** CONSUMES `apps/qw-oracle/scripts/load-knowledge/
  serialize-audit-review.ts` (Phase 1; not modified);
  `apps/qw-oracle/scripts/describe-fill/synthesize-mvdsv.ts` (created --
  invokes the emitter over the full evaluated MVDSV set).
- **Steps:**
  - [ ] Run the Phase-1 `serialize-audit-review.ts` emitter over the
        full evaluated MVDSV in-scope set -> one sortable/filterable
        `cvar-audit-review.html`-pattern page, row-per-entity, the
        original source/config/man-page text + our proposed/committed
        description + the D6 reasoning shown INLINE per row as ONE
        before/after/why unit (D15 locked --
        `feedback_inline_pairs_over_split_panels`; never split into
        panels/views). Emit-from-record (D11/D15) -- a pure projection,
        regenerated, never hand-edited.
  - [ ] The operator works the tier-2 tail on that page (Claude proposes
        per row, operator approves/overrides -- D11): every hedged row,
        every C1-residue-routed row, a spot-check sample of the
        auto-passed + affirmed bulk, and -- inline, source evidence in
        hand -- every C2-flagged D10 meaning-conflict. The **`sv_antilag`
        DUAL is resolved here**: the operator reads the D6 dual proposal
        + the MVDSV engine source (`==2` full / nonzero base) + the
        mainline-KTX cross-ref (`sv_antilag 2` = on) + the dusty-ktx
        cross-ref (`antilag.c`, `==1`) and confirms the DUAL stands as
        two source-grounded meanings, NOT collapsed (F-D10c -- the fork
        stays un-extracted; the parked arc owns that). NO separate
        conflict queue -- one workflow (D10).
  - [ ] Operator overrides are applied by RE-RUNNING the corrected
        pipeline path (C4 -- never a hand `UPDATE`; a systemic D6 error
        means fix the skill and re-fan, not row-by-row patches). The
        audit page regenerates from the record after each correction
        round (D11/D15 emit-from-record).
- **Verification:** this task is OPERATOR-RUN per-row human judgment --
  NOT a YES/NO probe. Completion signal: the operator has worked the
  full tier-2 tail (every hedged + every residue + every C2-flagged
  meaning-conflict incl. the `sv_antilag` DUAL + the spot-check) on the
  regenerated page and signed off; every D10 meaning-conflict carries an
  operator-confirmed resolution; the `sv_antilag` DUAL is operator-
  confirmed as two non-collapsed source-grounded meanings; no row remains
  in an unreviewed C2-flagged state. The automated YES/NO checks are in
  the phase-boundary block below; THIS task's "verification" is the
  operator's per-row sign-off (the spec-locked human gate -- D7 tier-2 /
  D11 / D15 / D18 review-bandwidth).
- **Execution mode:** the page emit = `subagent (Sonnet 4.7 medium)`
  (run the existing Phase-1 emitter over volume -- a projection, no new
  logic). The tier-2 tail itself = **operator-run** -- the spec-locked
  human correctness gate (D7 tier-2; D11/D15; D18 makes the operator the
  correctness judge on every D7/D15 row). NOT a model dial, NOT
  Claude-automatable; recorded as operator-run, honestly.

## Verification (phase boundary)

The Phase 4 boundary is HONESTLY HYBRID (the same regime Phase 3 used): an
automated YES/NO block the operator runs, PLUS the operator-run D7 tier-2
tail (per-row judgment -- NOT a probe). The phase is complete only when
BOTH hold. Run from `apps/qw-oracle/` after Tasks 1-7, against the
post-Phase-0/1/2/3 baseline.

**Precondition (stated at the command site, not just in "Inputs" -- the
Phase-1-review lesson):** these commands presuppose Phase 0 + 1 + 2 + 3
EXECUTED. The five `F1.describe_fill.*`/`jsonb` probes and the
`description_*` trail columns do NOT exist in the planning-state DB
(live-verified absent this draft: highest migration 013,
`description_provenance` column count 0, zero `describe_fill` probes in
`quality-grid.ts`); `synthesized`/`shipped_doc` MVDSV rows are zero
pre-execution. Run this block ONLY against the post-Phase-0/1/2/3
baseline; if any precondition phase has not executed, Phase 4 is BLOCKED
(Open Q (d)), not FAIL -- do not run these checks against the
planning-state DB and read absence as a defect.

### Automated (YES/NO -- copy-paste)

```
PSQL='docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc'

# 1. Fill-not-create: MVDSV in-scope counts unchanged at the live
#    POST-Phase-0 M (Phase 4 created ZERO entities; D9 fill-not-create).
$PSQL "SELECT type, count(*) FROM entities WHERE project='mvdsv'
  AND type IN ('cvar','command','cmdline_param','info_key')
  GROUP BY type ORDER BY type;"
# PASS: each == the live POST-Phase-0 probe-0 M (recon from
# phase-0-results.md; pre-Phase-0 was cvar 183 / command 108 /
# cmdline_param 11 / info_key 45). FAIL: any count moved (an entity was
# created/deleted -- D9 violation).

# 2. Coverage == the live C1 denominators; every in-scope MVDSV entity
#    has an affirmed/synthesized description OR a trail-recorded
#    disposition (the denominator is M, never cut -- C1).
$PSQL "SELECT type, count(*) total,
  count(*) FILTER (WHERE description IS NOT NULL OR description_verdict IS NOT NULL) settled
  FROM entities WHERE project='mvdsv'
  AND type IN ('cvar','command','cmdline_param','info_key')
  GROUP BY type ORDER BY type;"
# PASS: per bucket settled == total == the live POST-Phase-0 M. The
# residue inside `settled` is enumerated in the Task-7 run report as the
# C1-outreach track (incl. the 8 man-only flags + 2 Windows-only params
# + cvar non-resolvers, never created -- C1).

# 3. Idempotent re-run: identical committed-row fingerprint.
cd apps/qw-oracle && bun scripts/describe-fill/synthesize-mvdsv.ts --twice
# PASS: prints IDENTICAL=YES (two full extract+fan-out+gate+write cycles
# produced a byte-identical in-scope MVDSV fingerprint -- C4/P3).

# 4. Every synthesized row carries a D7 gate verdict (tier-1 ran).
$PSQL "SELECT count(*) FROM entities WHERE project='mvdsv'
  AND description_origin='synthesized' AND description_verdict IS NULL;"
# PASS: 0 (D7 tier-1 ran on every synthesized row; tier-1 failures were
# bounced/residue-routed, never silently committed).

# 5. C3 suspects dead-stamped + routed, NEVER a confident description.
$PSQL "SELECT count(*) FROM entities e WHERE e.project='mvdsv'
  AND e.canonical_id = ANY(<the Phase-0 MVDSV c3-suspect canonical_id set>)
  AND (e.description_verdict <> 'flag-dead'
       OR (e.description_origin='synthesized'
           AND e.description NOT ILIKE '%not reachable in a running build%'));"
# PASS: 0 (every Phase-0 MVDSV suspect carries the D6 truthful dead-stamp
# + C1 route, never a confident "tunes X" -- C3/F-C3b; detect+stamp+route
# only, not classified).

# 6. The sv_antilag D10 cross-fork DUAL is dual + C2-flagged, NOT collapsed.
$PSQL "SELECT (description ILIKE '%2%' AND description ILIKE '%dusty%')
  AND description_verdict IS NOT NULL
  FROM entities WHERE canonical_id='mvdsv:cvar:sv_antilag';"
# PASS: t (the description names BOTH the mainline ==2 meaning AND the
# dusty-ktx fork meaning; carries a trail verdict from the D7 tail). The
# Task-7 report lists it under the D10 meaning-conflict tail with an
# operator-confirmed resolution; the dusty-* fork is NOT an L1 entity set
# (F-D10c -- assert no dusty-* entities were created: see check 1).

# 7. The C5 probes GREEN at MVDSV volume (the jsonb MVDSV extension +
#    the four Phase-1/2/3 deliverables).
bun scripts/load-knowledge/index.ts quality-grid --project mvdsv --family regression --probe F1.jsonb_columns_not_strings
bun scripts/load-knowledge/index.ts quality-grid --project mvdsv --family regression --probe F1.describe_fill.origin_vocabulary
bun scripts/load-knowledge/index.ts quality-grid --project mvdsv --family regression --probe F1.describe_fill.synthesized_requires_anchor
bun scripts/load-knowledge/index.ts quality-grid --project mvdsv --family regression --probe F1.describe_fill.provenance_entry_exists
bun scripts/load-knowledge/index.ts quality-grid --project mvdsv --family regression --probe F1.describe_fill.synthesized_requires_source_ref
# PASS: all five print [PASS] at volume (jsonb the Phase-4 MVDSV
# extension; the other four Phase-1/2/3 deliverables stay GREEN under the
# MVDSV volume write).
```

If all seven PASS, the automated half is green. If any FAIL, consult
Recovery (C4 -- re-run the corrected pipeline, never UPDATE).

### Operator-run (the D7 tier-2 tail -- per-row judgment, NOT a probe)

This half is honest about being operator-run (the drafter prompt + D7 +
D18). The phase boundary is NOT complete on the automated block alone: the
operator must work the D7 tier-2 tail on the regenerated Phase-1
`serialize-audit-review.ts` page (Task 8) -- every hedged row, every
C1-residue-routed row, every C2-flagged D10 meaning-conflict resolved
INLINE with source evidence (the `sv_antilag` cross-fork DUAL the headline
case -- confirmed as two non-collapsed source-grounded meanings, the
dusty-* fork left un-extracted), and a spot-check sample of the
auto-passed + affirmed bulk -- Claude proposes per row, operator
approves/overrides. The phase is complete only when the operator has
signed off the full tail and no row remains in an unreviewed C2-flagged
state. This per-row human gate is spec-locked (D7 tier-2 / D11 / D15) and
is the binding correctness judge (D18); it cannot be reduced to a YES/NO
probe and is not Claude-automatable.

If automated PASS AND operator tail signed off -> Phase 4 ->
approved/shipped (and the KTX+MVDSV describe-fill is content-complete --
Phase 5 is staleness + projections, Phase 6 the deferrable tail).
Otherwise consult Recovery.

## Outputs to next phase

State now true that was not before:

- **Every in-scope MVDSV configurable entity is closed** against the live
  C1 denominators (POST-Phase-0-rebaselined; pre-Phase-0 cvar M=183 /
  command M=108 / cmdline_param M=11 / info_key M=45): each carries an
  affirmed-or-synthesized owned description with the D11 decision trail
  (`verdict`/`confidence`/`reasoning`/`proposed`), OR an enumerated
  C1-outreach-track residue row -- never importance-cut (C1). The MVDSV
  slice of the describe-fill is complete and honest; with Phase 3 (KTX)
  the describe-fill is content-complete.
- **A NEW `mvdsv.6` roff man-page sibling parser + a NEW MVDSV
  shipped-config sibling parser** (both duck-typed standalone, registered
  in `mvdsv/extract.py`) + their two loader adapters
  (`load-mvdsv-cmdline`, `load-mvdsv-shipped-config`) exist and are
  idempotent (C4/P3). The 9/11 cmdline params + the mechanical-config
  cvars carry retained `description_provenance` (incl. the D11-amendment
  `structured_choices`).
- **The Phase-0 free win is consumed:** the 28/108 MVDSV command banners
  are evaluated (a banner was ONE input, never a "done" verdict -- D5
  amendment); the ~80 command synthesis tail is filled or
  residue-tracked.
- **The D10 cross-fork DUAL `mvdsv:cvar:sv_antilag` is described dual**
  (mainline-MVDSV `==2`/nonzero as consumed by mainline KTX vs the
  dusty-ktx fork `==1` multi-mode), source-grounded, operator-confirmed at
  the D7 tail, NEVER collapsed; the dusty-* fork was NOT extracted
  (F-D10c -- the parked `2026-05-16-dusty-antilag-fork-l1.md` arc is
  untouched; no dusty-* L1 entity created). Other D10 meaning-conflicts
  resolved inline; value-differences routed to L3 candidates;
  membership-drift unioned.
- **The C3 MVDSV suspects are dead-stamped + routed** to the C1 outreach
  track (the D6 truthful stamp; detect+stamp+route only -- never
  classified, F-C3b). The 8 `mvdsv.6` man-only macro-wrapped flags + the
  2 Windows-only cmdline params + the cvar config-drift non-resolvers are
  recorded + tracked (never created -- D9 fill-not-create; never dropped
  -- C1).
- **The C1 outreach track is enumerated** (the not-source-legible tail +
  the C3 dead-stamped + the D8 L1-side-complete + the man-only/Windows-
  only/config-drift residue) in the Task-7 run report -- the tracked
  hand-off to Phase 5 (staleness) + the post-arc / D16 outreach.
- **`F1.jsonb_columns_not_strings` extended to MVDSV** and GREEN; the
  four Phase-1/2/3 C5 probes stay GREEN under the MVDSV volume write.
- **Phase 5 consumes the completed MVDSV record** for the public
  projections (wiki feed + snapshot.json) + the D4 staleness anchor
  (every synthesized MVDSV row carries `description_anchor_version`); the
  MCP public-projection delta (F-D13a) is Phase 5, NOT touched here.

Runnable state: the idempotent MVDSV mechanical-extract + D6 synthesis
fan-out round-trips the full in-scope set through the D7 two-tier gate
into committed provenance-stamped rows, operator-signed at the tier-2
tail. The commit at the phase boundary leaves the system runnable (P4:
commits on `main`, no worktree/PR; no per-phase tag -- the arc-ship tag
is end-of-arc).

## Open questions / deferred items

- **Question (a) -- the `mvdsv.6` `coverage.ndjson` "LLM-assisted" tag vs
  the D9/D11/D12-locked "mechanical sibling parser" treatment.**
  `coverage.ndjson` tags the man page `extractability:"LLM-assisted"`
  (probe-time structure_quality caution -- "an LLM or simple parser can
  extract"), while `decisions.md` D9 ("the `mvdsv.6` roff man page is a
  sibling parser -- same tier, same emit shape"), D11 (`mvdsv.6` named a
  `shipped_doc` source), D12 ("9 from `mvdsv.6`"), the README phase-4
  row, and the drafter prompt all lock it as the D9 mechanical sibling
  parser. **Default chosen for now:** Task 1 builds it as the D9
  mechanical sibling -- the decisions are the authority (`decisions.md`
  preamble: spec/decisions win over a probe's prose), and the regular
  roff `.TP`/`.B`-prefixed grammar (verified live) bears that out exactly
  as the `.cfg` `set ... //` grammar did for Phase 2. **Who can resolve:**
  operator confirm this is the faithful D9 reading (the decisions
  explicitly name `mvdsv.6` the sibling parser at four locked sites; the
  coverage.ndjson tag was probe-time imprecision, not a lock). Surfaced
  per the never-silently-comply rule; NOT a decisions.md change (D9/D11/
  D12 already lock it).

- **Question (b) -- the C5 reading for Phase 4 (no new probe).** C5 says
  a shape's probe lands in the phase that FIRST writes the shape. Phase 4
  writes NO new data shape (only the existing migration-014 columns + the
  Phase-2 `structured_choices` element + `synthesized`, all watched by
  the Phase-1/2/3 probes). Its only C5 obligation is the
  `F1.jsonb_columns_not_strings` MVDSV project extension (the shape it is
  first to write at MVDSV volume -- exactly mirroring Phase 2's ktx
  extension). **Default chosen for now (recommended):** extend the jsonb
  probe to MVDSV, ship NO new probe, assert the four Phase-1/2/3 probes
  GREEN at MVDSV volume. **Who can resolve:** operator confirm
  new-at-volume-via-project-extension (vs a stricter reading demanding a
  new probe). C1/C5 honesty is honored either way -- the jsonb invariant
  is mechanically enforced for MVDSV and the four cross-cutting probes
  cover MVDSV by their existing scope. Not a decisions.md change.

- **Question (c) -- the run-report exact path/filename.** The Phase-4
  driver emits its coverage/residue/conflict run report under the Phase-1
  `apps/qw-oracle/scripts/describe-fill/` run-report convention (Phase 2's
  `extract-ktx-mechanical.ts` + Phase 3's `synthesize-ktx.ts` already
  emit one there). **Default chosen for now:** `scripts/describe-fill/`
  per the Phase-1 convention; the exact filename is low-stakes and the
  executor confirms it against the Phase-1 convention at execution
  (mirrors Phase 1 Open Q (e) / Phase 3 Open Q (c)). **Who can resolve:**
  executor at execution.

- **Question (d) -- Phase 4 EXECUTION presupposes Phase 0 + 1 + 2 + 3
  EXECUTION.** The arc is in PLANNING (live-verified this draft: no
  migration 014, no `describe-fill/`, no D6 skill, no
  `serialize-audit-review.ts`, no `phase-0-artifacts/*.md`, the
  load-commands free-win unexecuted, zero `describe_fill` probes).
  **Default chosen for now:** "Inputs from previous phase" makes all four
  a hard precondition; if any has not executed, Phase 4 halts and reports
  BLOCKED with the missing precondition (not a Phase 4 defect -- the
  slicing order is 0/1 -> 2 -> 3 -> 4; Phase 0 is BOTH a hard synthesis
  prerequisite per C3/D12 AND the Phase-4 sizing input per D12/F-D12a).
  **Who can resolve:** arc-orchestrator at execution time (sequencing,
  flagged here -- not a reshape; README locks 4 after 3 and Phase 0
  first/independent).

- **Question (e) -- the resolved Phase-4 context budget + the
  reuse-vs-copy call for the MVDSV shipped-config handler.** README
  flagged Phase 4 as 200-400k "uncertain until P0". Phase 4 combines a
  mechanical-extract tier (Phase-2-shaped) + a synthesis fan-out
  (Phase-3-shaped) + the cmdline parser into ONE locked-D17 phase, so it
  is the heaviest single-engine phase. Phase 0's `ezquake-com-shape.md`
  resolves the swing: a bucket-A-heavy result keeps Phase 4 toward
  mechanical-light (~200k); a bucket-B-heavy (hard dedicated tail) result
  pushes it toward synthesis-heavy (~400k, Phase-3-class). **Default
  chosen for now:** the task table is **subagent-heavy, near-zero
  inline** throughout (every code-synthesis + fan-out task delegated; the
  D6/D7 passes Opus 4.7 MAX spec-locked) to hold the lower bound; the
  mechanical sub-deliverable (Tasks 1-3) and the synthesis
  sub-deliverable (Tasks 4-8) are separable commits within the phase, so
  a mid-phase fresh-terminal handoff is available without a reshape.
  The MVDSV shipped-config handler is a NEW sibling either way (a thin
  per-engine config of the Phase-2 handler if it is parameterizable, else
  a copy of its proven shape -- the executor judges fidelity-vs-reuse at
  Task 2; never a KTX-handler edit). **Who can resolve:**
  arc-orchestrator at execution time -- flagged here as an
  orchestrator/context-budget concern (the same pattern Phase 1 used for
  its own watch-phase budget), NOT a reshape; the README slicing analysis
  already names Phase 4 a watch phase and the budget is resolved once
  Phase 0's shape is consumable.

No sub-agent finding contradicted `decisions.md` at draft time; the
verification sub-agent pass (next) may add rejected-finding rationales
here. If a finding contradicts a lock, the decision wins and the finding
is rejected here with a one-line rationale; if a lock's factual premise
looks wrong (the OQ-3 discipline), it is surfaced for amendment, never
silently overridden, never silently complied with.

## Recovery (if verification fails)

C4 discipline throughout: recovery is re-running the corrected pipeline
end-to-end, NEVER an `UPDATE` that patches the visibly-wrong rows in place
(a hand-patch repairs only noticed damage; the same bug typically
re-shaped unnoticed rows too -- `feedback_repair_by_reextract_not_sql_update`).

- **Check 1 a count moved (entity created/deleted):** a D9
  fill-not-create violation -- the loader INSERTed (likely a man-only
  macro-wrapped flag or a cvar non-resolver wrongly promoted to an
  entity). Fix the loader to resolve-and-fill only (record non-resolvers
  to the report + C1 track, never INSERT), re-run extract+load
  end-to-end (C4), re-run check 1. Do not SQL-delete the stray rows.
- **Check 2 coverage < M, or residue silently shrunk:** the Task-4
  assembler exempted a bucket (a presumptively-covered bucket -- the
  D5-amendment/C1 violation) OR the denominator was lowered. Do NOT lower
  M (C1). Fix the assembler to select EVERY in-scope entity, fix the
  residue enumeration to track (not cut) the not-legible tail / the
  man-only / Windows-only / config-drift residue, re-run the corrected
  fan-out end-to-end (C4). "It's a rare dedicated-server knob, skip it"
  is a C1 violation -- surface it as a deviation to the operator, do NOT
  silently comply.
- **Check 3 IDENTICAL=NO (not idempotent):** a non-deterministic step
  (unstable manifest ordering, a timestamp in the record, a
  read-order-dependent merge in the man-page/`.cfg` parse, the staged-
  candidate precedence not fixed). Make the parse + manifest + write
  deterministic, re-run twice (C4/P3). Suspect idempotency before
  staleness (`feedback_idempotency_before_staleness`).
- **Check 4 a synthesized row with no gate verdict:** the D7 tier-1 feed
  (Task 6) missed rows or the gate was bypassed. Fix the wiring so every
  synthesized row goes through the independent tier-1 invocation, re-run
  synthesis+gate (C4). A tier-1-failed row must be bounced or
  residue-routed -- never committed as confident.
- **Check 5 a C3-suspect carries a confident description:** the C3
  dead-stamp lane was bypassed (a confabulation-guard breach). Fix the
  D6-skill C3 routing in the fan-out, re-run the affected entities
  through the corrected skill (C4). Detect+stamp+route only -- if the
  failure is "the suspect pool is wrong", that is Phase 0 / the parked
  F-C3b arc, NOT a Phase 4 reclassification (do not classify here).
- **Check 6 `sv_antilag` collapsed / not C2-flagged / fork extracted:**
  the D10 cross-fork DUAL handling failed. If the description collapsed
  to one meaning, fix the D6 dual-handling and re-synth `sv_antilag`
  through the gate (C4). If a dusty-* entity was created, that is an
  F-D10c boundary breach -- delete-by-re-extract (re-run the corrected
  fill that creates NO dusty-* entity; the dusty-* extraction is the
  parked arc, not this one) and route to the operator. Never hand-edit
  the DUAL.
- **Check 7 `jsonb_columns_not_strings` FAIL (jsonb a string scalar):**
  the provenance was pre-stringified -- the P2 bug. Fix the loader to
  bind the JS value directly (or `tx.json`), re-run the load (C4). Never
  `UPDATE` the JSONB in place.
- **Check 7 a Phase-1/2/3 C5 probe regressed at MVDSV volume:** a volume
  write violated an honesty invariant (bad origin tag / missing anchor /
  missing provenance entry / missing source_ref). Fix the writer, re-run
  the corrected pipeline end-to-end (C4), never `UPDATE`.
- **D7 tier-1 systematically bounces (source_ref does not exhibit the
  behaviour):** the read-site grounding is wrong -- this is the
  confabulation guard WORKING. Route the un-groundable rows to the C1
  residue track honestly (tracked, never importance-cut -- C1); do NOT
  loosen tier-1 to pass them, do NOT guess (D6).
- **The operator tail surfaces a systemic D6 error (many rows wrong the
  same way):** C4 -- fix the D6 skill (a Phase-1 deliverable; surface to
  the operator as a Phase-1 skill defect, not a Phase-4 row-patch),
  re-run the fan-out end-to-end, regenerate the audit page. NEVER
  row-by-row `UPDATE`s.
- **Unanticipated failure:** route to the operator with the failing
  check's output verbatim; do not explain the gap away (CLAUDE.md
  verification discipline). Do not propose a scope deferral / residue
  importance-cut without explicit operator approval (that is the
  operator's call, not a default -- C1).
