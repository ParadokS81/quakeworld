# Phase 3 -- KTX source-synthesis (D5-D8, D10)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- C1-C5 incl. the C3 amendment 2026-05-17,
>    P1-P5, D1-D19 incl. the D9 amendment 2026-05-17 + D11 amendment
>    2026-05-17 + D2 clarification 2026-05-17). Done.
> 2. Read `review-findings.md`; the rows whose "Phase" is this phase:
>    **F-C2a (Grave -- value-diff -> L3 not flagged; meaning-conflict
>    C2-flagged + resolved inline at the D7 tail)**, **F-D10c (Boundary --
>    describe `sv_antilag` dual, do NOT extract the dusty-* fork)**,
>    **F-C3b (Boundary -- detect+stamp+route C3 suspects, do NOT classify)**.
>    Read the dated CORRECTION 2026-05-17 in "Confirmed-good" (canonical KTX
>    is libclang/C; tree-sitter is the out-of-scope dusty-ktx fork only).
>    Done.
> 3. Recon the LIVE source before inlining anything. Done -- see "Recon
>    facts". The arc is in PLANNING: Phase 0/1/2 are approved-not-executed,
>    so Phase 3 is a paper plan whose EXECUTION presupposes Phase 0/1/2
>    EXECUTION (the C3 suspect pool, the D6 skill, the D7 gate + D11/D15
>    serializer, migration 014, the ~109 shipped_doc fill, k_short_gib
>    pre-filled). The Recon block records BOTH the live pre-execution state
>    AND the Phase-0/1/2 specified contracts Phase 3 consumes, the same
>    honest pattern Phase 2's MD used.
> 4. After drafting, dispatch the verification sub-agent (brief at the
>    bottom of `phase-template.md`, item 8 read in its 2026-05-17-corrected
>    form -- canonical KTX is libclang/C, tree-sitter is dusty-ktx only)
>    before declaring the phase MD ready.

## Goal

Phase 3 is the KTX synthesis heart: it runs the Phase-1 D6 guardrailed
per-knob skill as a sub-agent fan-out over EVERY in-scope KTX
configurable-bucket entity that Phase 2's mechanical extract did not
settle -- the ~109 `shipped_doc` candidates (each EVALUATED
affirm-vs-synthesize, never auto-counted -- D5 amendment), every residual
still-NULL KTX cvar (the ~151 not-mechanically-covered residue incl. the
38 bot `k_fbskill_*`, mechanism-only per D8), the 47 `CD_NODESC` KTX
commands, the 7 info_keys, and the triage-failed `source_inline`
comments -- so that every in-scope KTX entity ends carrying an
affirmed-or-synthesized owned description through the D7 two-tier gate,
with D10 meaning-conflicts resolved INLINE at the D7 operator tail with
source evidence in hand and genuine not-source-legible residue routed to
the C1 outreach track (tracked, never importance-cut). Phase 2 settled
NOTHING (the D9 seam -- zero quality verdict), so affirm-vs-synthesize is
decided here and nowhere else, and the D7 gate sees every synthesized
row. The synthesis pass = the D6 skill at Opus 4.7 MAX; the D7 tier-1
independent evidence re-check = an independent Opus 4.7 MAX invocation --
both spec-locked by D7, recorded here, NOT lowered. C3 suspects get the
D6 truthful dead-stamp + C1 route (detect/stamp/route only -- never
classified, F-C3b); `sv_antilag` is handled as the D10 cross-fork DUAL
exemplar without extracting the dusty-* fork (F-D10c). The runnable,
verifiable state at the phase boundary is HONESTLY hybrid: the automated
parts -- every in-scope KTX entity (probe-0 C1 denominators cvar M=260 /
command M=358 / info_key M=7) carries an affirmed-or-synthesized
description OR an enumerated C1-outreach-track residue row (never
importance-cut), `k_short_gib` reproduced exactly once and its Phase-1
`synthesized` state not regressed (C4/D19/P3), the Phase-1/2 C5 probes
plus the new Phase-3 synthesized-source_ref probe all GREEN at volume,
D7 tier-1 ran on every synthesized row, and the idempotent re-run
reproduces identical committed rows (C4) -- PLUS the operator-run part:
the D7 tier-2 batch tail (every hedged + every residue-routed + every
C2-flagged D10 meaning-conflict + a spot-check of the auto-passed bulk)
worked per-row by the operator on the Phase-1 D11/D15
`cvar-audit-review.html`-pattern page. Phase 3 is the first phase that
RUNS the operator tail; the phase is complete only when the operator has
worked it and signed off.

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

Drafter-verified via `psql` against `qw-oracle-postgres-dev` and `grep`
against the live repo/configs on 2026-05-17. NOT inferred, NOT copied
from the spec/prior-phase numbers unchecked (the spec "~157" conflation
that Phase 2 corrected to ~109 is the cautionary precedent for this
block).

- **The arc is in PLANNING; Phase 0/1/2 are approved-not-executed.**
  Live-verified absent this draft: highest migration = `013` (no `014`;
  `information_schema.columns` count for the 7 Phase-1 trail columns =
  `0`); `apps/qw-oracle/scripts/describe-fill/` does NOT exist (Phase 1
  creates it); `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts`
  does NOT exist (Phase 1 creates it); no `describe`/`synth`/`knob`/`fill`
  skill under `~/.claude/skills/` (Phase 1 builds the D6 skill, slug =
  Phase 1 Open Q (e) placeholder `<d6-skill-slug>`);
  `phase-0-artifacts/c3-suspect-pool.md` does NOT exist (only `.gitkeep`
  -- Phase 0 creates it); `k_short_gib` is `description` NULL /
  `description_origin` NULL today (Phase 1 D19 fill unexecuted).
  **Consequence:** this Phase 3 MD is a paper plan whose EXECUTION
  presupposes Phase 0 + Phase 1 + Phase 2 EXECUTION (see "Inputs from
  previous phase" + Open Q (d)); the contracts below are the
  Phase-0/1/2-specified shapes Phase 3 consumes, exactly as Phase 2's MD
  honestly recorded "Phase 2 EXECUTION presupposes Phase 1 EXECUTION".
- **KTX configurable-bucket C1 denominators (live, the coverage gate --
  never a hand-picked subset):** cvar **M=260**, command **M=358**,
  info_key **M=7** (`count(*) FROM entities WHERE project='ktx' AND
  type IN ('cvar','command','info_key')` = 260 / 358 / 7). These match
  probe-0; Phase 0 re-extracts forward and re-baselines them (correct by
  C1) -- Phase 3 EXECUTION recons the POST-Phase-0 denominators, the
  M=260/358/7 here is the live pre-Phase-0 value and the gate-shape, not
  a frozen contract number.
- **Pre-execution KTX origin distribution (live, pre-014):**
  cvar `source_inline:68`, `NULL:192`; command `source_inline:311`,
  `NULL:47`; info_key `source_inline:7`, `NULL:0`. ZERO `synthesized`,
  ZERO `shipped_doc` (Phase 1/2 unexecuted). The 47 NULL commands ARE the
  47 `CD_NODESC` set (`const char CD_NODESC[] = "no desc";`
  `research/repos/ktx/src/commands.c:335`; alias `#define`s such as
  `#define CD_KSOUND1 (CD_NODESC) // useless command now` at
  commands.c:403+ -- the alias comment is itself a C3-ish signal the D6
  skill grounds on). The DB NULL count (47) is the authoritative
  CD_NODESC number.
- **Phase 3's inbound work IS Phase 2's "Outputs to next phase"
  contract** (read it verbatim, do not re-derive): every `shipped_doc`
  candidate (live order ~109/260; exact figure = Phase 2's idempotent
  extract output -- a verified order-of-magnitude, NOT a hit-target, C1
  gate is M=260) carries retained `description_provenance` (one entry per
  contributing source-file, drift preserved per F-C2a/D9/D10) + a staged
  `description` + `description_origin='shipped_doc'` carrying ZERO quality
  verdict (D9 seam); every still-NULL KTX cvar (the ~151 residue incl.
  the 38 bot `k_fbskill_*`) flows here; the 11 non-resolving config
  set-names (`k_666`, `k_dm2mod`, `k_master`, `k_motd2..5`, `k_autoreset`,
  `sv_maxrate`, `sv_www_address`, `sv_www_authkey`) are config-drift data
  (C2/C3 class) routed here, NEVER created (D9 fill-not-create); meaning
  conflicts preserved as DATA (e.g. `k_noframechecks` polarity-label
  inversion); value-differences preserved as DATA (e.g. `k_short_gib`
  1/0, `sv_maxrate` 500000/50000) -- route to L3, NOT flagged as L1
  conflicts (D10). `k_short_gib` is the Phase-1 D19 pre-filled terminal
  `synthesized` row: Phase 3 does NOT re-synthesize it and counts it
  exactly once (C4/D19/P3 -- idempotent).
- **The D6 fan-out unit (Phase-1-specified shape Phase 3 consumes):**
  the Phase-1 D6 skill at `~/.claude/skills/<d6-skill-slug>/` (slug
  confirmed at Phase 1 review -- Phase 1 Open Q (e)), built on the live
  precedent shape (verified present: `asset-type-curate` SKILL.md 249,
  `guide-rewrite` 392, `validate-extractor` 250 lines). It hard-codes the
  six D6 guardrails (the D5/D5-amendment keep-vs-synthesize rubric as the
  judgment; read-site grounding -- input is code use-sites never the knob
  name; `source_ref` file:line + anchor evidence reusing the EXISTING
  citation mechanism, no new format -- P3/D6; the hard confabulation
  guard -- not source-legible -> hedge/route to C1 residue, never guess;
  the C3 dead-stamp sibling; the D8 mechanism-only sibling), keeps
  SKILL.md < ~300 lines (`feedback_skill_size_lean_skill_md`), and
  records its synthesis dial as **Opus 4.7 MAX** (spec-locked D7). Phase
  3 fans out over it; it does not author or modify it.
- **The D7 gate + D11/D15 serializer (Phase-1-specified contracts):**
  `apps/qw-oracle/scripts/describe-fill/review-gate.ts` -- the D7 tier-1
  independent automated evidence re-check, a separate invocation (NOT the
  authoring context) at **independent Opus 4.7 MAX** (spec-locked D7),
  engine-agnostic, consuming the structured candidate + the D6
  reasoning/verdict/confidence trail; fail -> bounce to re-synth or route
  to C1 residue; marks which rows land in the operator tier-2 tail.
  `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts` --
  the D11/D15 internal-tier emit-from-record HTML serializer, one
  sortable/filterable page, row-per-entity, the source-comment / proposed
  description / D6 reasoning shown INLINE per row as one before/after/why
  unit (`feedback_inline_pairs_over_split_panels`; D15 locked -- never
  split into panels). Phase 3 RUNS both over volume; it modifies neither.
- **The C3 suspect pool (Phase-0-specified contract):**
  `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/c3-suspect-pool.md`,
  per-(engine,type), build-pinned, no contemporaneity caveat (the
  self-built one-build oracle -- C3 amendment 2026-05-17). The KTX
  cvar/command suspect lists are the gate for "dead-stamp not describe".
  A hard prerequisite for Phase 3 synthesis (C3/D12) -- Phase 0 is first
  and independent of Phase 1; Phase 3 consumes its KTX section.
- **D10 entity-precision (verified live -- prevents asserting a
  non-existent KTX entity):** `sv_antilag` is an **MVDSV** cvar
  (`mvdsv:cvar:sv_antilag`, description NULL -- Phase 4 owns describing
  it); there is NO `ktx:cvar:sv_antilag`. The KTX-registered antilag
  entities IN Phase-3 scope are `ktx:command:antilag` (source_inline
  "toggle antilag") and `ktx:cvar:k_vp_antilag` (source_inline "votes
  percentage for antilag voting"). Mainline-KTX `sv_antilag` source
  behavior is verified: no `research/repos/ktx/src/antilag.c`; KTX reads
  `cvar("sv_antilag")` (match.c:1598) and ships `"sv_antilag 2\n" //
  antilag on` (commands.c:4155) => "on" == 2, a thin passthrough. Phase
  3 carries this as cross-reference SOURCE EVIDENCE for the Phase-4 DUAL
  description; it does NOT create a KTX `sv_antilag` entity, does NOT
  collapse the meaning, and does NOT extract the dusty-ktx fork
  (F-D10c). `k_noframechecks` IS a KTX cvar (`ktx:cvar:k_noframechecks`,
  NULL today -> Phase-2 `shipped_doc` candidate) and IS the in-scope D10
  meaning-conflict: verified live the in-repo `// disable check for
  fps/speed manipulation (0 = no, 1 = yes)` vs nQuake `// check for
  fps/speed manipulation (0 = yes, 1 = no)` is a genuine polarity-label
  inversion (Phase 2 preserves both per-source; Phase 3 resolves at the
  D7 tail with KTX source as tiebreaker).
- **The bot/judgment D8 set:** 38 distinct `k_fbskill_*` registered in
  `research/repos/ktx/src/bot_botimp.c` via `FB_CVAR_*` macros (line 15+,
  e.g. `#define FB_CVAR_DODGEFACTOR "k_fbskill_movement_dodgefactor"`),
  zero comments anywhere; 38 distinct in L1 `cvar_versions` with
  `source_file LIKE '%bot_botimp.c%'`. D8: mechanism-only synthesis ->
  `synthesized`, counts COMPLETE; tuning advice is an L3 candidate, its
  absence NOT an L1 gap.
- **The citation + anchor mechanism (existing -- P3/D6, no new format):**
  every KTX cvar is source-backed (`cvar_versions.source_file` present
  260/260); every CD_NODESC command is source-backed
  (`command_versions.source_file` present 47/47) -- the D6 read-site
  grounding always has a real registration/handler `source_ref`; the
  confabulation guard fires on behaviour-illegibility, not on a missing
  registration site. The synthesized anchor version = the live KTX head
  version (`versions` row `ktx|head|<commit_sha>`; today
  `da73e06f63f...`; Phase-0 re-extract advances it -- stamp whatever
  `versions.commit_sha` is live at EXECUTION, do NOT hard-code da73e06).
- **The D6/D7 research-doc aids (admissible, source stays ground
  truth):** `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/`
  (probe-0..5 + gap-findings + coverage.ndjson) -- locate use-sites,
  corroborate, cross-check; the committed `source_ref` + anchor remain
  the evidence (D6/D7 amendment). Phase 3 consumes them; it does not
  re-run the probes (D9: no re-harvest).
- **No new data shape; the runner is Bun.** Phase 3 writes only the
  EXISTING migration-014 columns (description / origin / anchor /
  verdict / confidence / reasoning / proposed / provenance) onto rows
  that ALREADY exist (fill-not-create) -- it introduces no new schema or
  data shape, so per C5's "probe lands in the phase that first writes
  the shape" it owes no provenance/jsonb/origin probe (those are Phase
  1/2's). It IS the first phase to write `synthesized` at VOLUME (Phase 1
  wrote exactly one -- k_short_gib) and no Phase-1/2 probe watches the
  synthesized-without-`source_ref` failure mode -> Task 4 ships the
  C5-spirit `F1.describe_fill.synthesized_requires_source_ref` probe
  (surfaced for the reading-confirm in Open Q (b)). `quality-grid.ts`
  exists live (2110 lines); the runner is `bun
  scripts/load-knowledge/index.ts quality-grid ...` -- `apps/qw-oracle/CLAUDE.md`
  pins Bun and forbids npm even though DEVELOPMENT.md still shows
  `npm run` (the Phase 0/1/2 MDs flag this; do not hard-code npm).

## Inputs from previous phase

**Phase 3 consumes Phase 0 + Phase 1 + Phase 2.** Per the locked slicing
analysis (`README.md`) and C3/D12: Phase 0's C3 suspect pool is a HARD
prerequisite for synthesis; Phase 1 is the engine-agnostic spine; Phase 2
is the KTX mechanical-extract that staged the `shipped_doc` candidates.
Phase 3 EXECUTION requires all three EXECUTED:

- **Phase 0 executed:** `phase-0-artifacts/c3-suspect-pool.md` exists,
  per-(engine,type), build-pinned (no contemporaneity caveat); the
  probe-0 KTX denominators re-baselined from the forward-fetched
  dev-head (`phase-0-results.md` records old-vs-new -- Phase 3 recons the
  POST-re-extract M, not the stale numbers); `versions` rows at the
  fresh dev-head SHA (the anchor-version source).
- **Phase 1 executed:** migration `014_description_provenance_trail.sql`
  applied (the trail columns + `description_origin` admits
  `shipped_doc`); the D6 skill exists at its confirmed slug; the D7
  two-tier gate `review-gate.ts` exists (tier-1 = independent Opus 4.7
  MAX); the D11/D15 `serialize-audit-review.ts` exists (inline-pairs,
  sortable/filterable, emit-from-record); the Phase-1 C5 probes
  `F1.describe_fill.origin_vocabulary` +
  `F1.describe_fill.synthesized_requires_anchor` registered and GREEN;
  **`k_short_gib` carries a full Phase-1 terminal `synthesized` record**
  (Phase 3 must treat it idempotently -- no re-synthesis, counted once,
  state not regressed -- C4/D19/P3).
- **Phase 2 executed:** the KTX shipped-config sibling extractor +
  loader ran idempotently; every mechanical shipped-config-resolving KTX
  cvar (~109/260 order) carries retained `description_provenance` (incl.
  the widened `structured_choices` element, D11 amendment 2026-05-17) + a
  staged `shipped_doc` candidate with NO quality verdict (D9 seam); the
  ~151 still-NULL residue (incl. 38 bot `k_fbskill_*`) + the 11
  non-resolver config-drift names are the enumerated tracked Phase-3
  hand-off; the F-C2a meaning-conflicts preserved per-source; the
  Phase-2 C5 probes (`F1.jsonb_columns_not_strings` ktx-extended,
  `F1.describe_fill.provenance_entry_exists`) GREEN.
- Operator-side `prerequisites.md` verified satisfied (Postgres dev
  container up; L1 KTX extract loaded -- the 260/358/7 entities exist;
  the research repos + the 2026-05-15 doc-landscape aids present;
  `.env` `DATABASE_URL`).

If Phase 0, 1, or 2 has not executed when Phase 3 is picked up, Phase 3
is BLOCKED on it (not a Phase 3 defect -- the slicing order is
0/1 -> 2 -> 3; Phase 0 is a hard synthesis prerequisite per C3/D12).
Halt and report BLOCKED with which precondition is missing (Open Q (d)).

## Files touched

### Created

```
apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts            # NEW Phase-3 fan-out driver: assemble in-scope set + D6 sub-agent fan-out + D7 tier-1 feed + write + coverage/residue/idempotency harness; beside the Phase-1 spine
apps/qw-oracle/scripts/describe-fill/<run-report>.md              # GENERATED run report (coverage vs M; enumerated C1-outreach residue; the 11 config-drift non-resolvers; the D10 meaning-conflict tail) -- exact filename per the Phase-1 scripts/describe-fill/ run-report convention (Open Q (c))
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts            # add F1.describe_fill.synthesized_requires_source_ref to REGRESSION_PROBES (C5-spirit: Phase 3 first writes `synthesized` at volume; no Phase-1/2 probe watches synthesized-without-citation)
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md  # Phase 3 status column only (operator-driven)
```

### Deleted

```
n/a   # Phase 3 is purely additive: fill description fields on existing rows (fill-not-create), one new probe, one driver. C4 recovery is re-run, never a delete/UPDATE.
```

The Phase-1 D6 skill (`~/.claude/skills/<d6-skill-slug>/`), the D7 gate
(`review-gate.ts`), and the D11/D15 serializer
(`serialize-audit-review.ts`) are CONSUMED by Phase 3, not touched --
they are Phase-1 deliverables; Phase 3 fans out over / runs them.

## Tasks

### Task 1 -- The in-scope KTX evaluation-set assembler (the D6 fan-out input)

- **Goal:** from the post-Phase-2 DB, assemble EVERY in-scope KTX
  configurable-bucket entity (cvar M=260 + command M=358 + info_key M=7,
  minus the idempotent Phase-1-terminal `k_short_gib`) into a fan-out
  manifest, each entity carrying its D6 input packet -- with NO entity
  exempted and NO presumptively-covered bucket (D5 amendment, C1).
- **Files:** `apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts`
  (created -- the assembler part).
- **Steps:**
  - [ ] Select every in-scope KTX entity (`project='ktx'` AND
        `type IN ('cvar','command','info_key')`) from the post-Phase-0/2
        DB. Exclude ONLY `k_short_gib` (it is Phase-1-terminal
        `synthesized` -- idempotent, counted once, NOT re-evaluated --
        C4/D19/P3). Assert the selected count == the live probe-0
        denominators minus 1 (M=260+358+7 = 625; 624 to fan, +1
        idempotent k_short_gib = 625 evaluated coverage). Recon the
        POST-Phase-0 M live (Phase 0 re-baselines -- C1); do NOT trust
        the pre-Phase-0 260/358/7 blind (the conflation-precedent
        discipline).
  - [ ] Per entity build the D6 input packet (the skill's read-site
        grounding input -- NEVER the knob name alone, D6):
        - the registration/handler `source_ref` from
          `cvar_versions`/`command_versions` `source_file`+`source_line`
          (the EXISTING citation mechanism -- 260/260 cvar, 47/47
          CD_NODESC verified source-backed; no new format -- P3/D6);
        - the Phase-2 retained `description_provenance` array (the
          `shipped_doc` candidate text + every contributing-file entry +
          the widened `structured_choices`; F-C2a per-source preservation
          incl. the `k_noframechecks` polarity pair);
        - the Phase-0 C3-suspect flag (does this knob appear in the KTX
          section of `c3-suspect-pool.md`? -- the dead-stamp gate);
        - the D8 bot/judgment flag (registered in `bot_botimp.c` /
          `k_fbskill_*` -- the mechanism-only lane);
        - the research-doc aid pointers
          (`2026-05-15-ktx-mvdsv-doc-landscape/`) -- admissible AIDS to
          locate use-sites/corroborate, source stays ground truth (D6/D7
          amendment); never a substitute citation.
  - [ ] Attach the Phase-2 11 non-resolver config-drift list
        (`k_666` ... `sv_www_authkey`) as a SEPARATE manifest section:
        these have NO entity (D9 fill-not-create) -- they are recorded
        and routed to the C1 outreach track + the D7 tail, NEVER created,
        NEVER silently dropped (C1/C2/C3).
  - [ ] Emit the deterministic fan-out manifest (stable ordering ->
        idempotent re-run, C4/P3). Comments explain WHY (P5); ASCII only
        (P5).
- **Verification:** `bun scripts/describe-fill/synthesize-ktx.ts
  --assemble-only` prints the manifest count == (live M_cvar + M_command
  + M_info_key) - 1 and a per-bucket breakdown; the 11 non-resolvers are
  a separate section with zero entity ids; re-running produces a
  byte-identical manifest. PASS: count == liveM-1, no bucket missing
  (no presumptive exemption -- D5-amendment/C1), 11 non-resolvers
  carried with no entity, manifest deterministic. FAIL: any in-scope
  bucket absent, count != liveM-1, a non-resolver promoted to an entity,
  or non-deterministic output.
- **Execution mode:** `subagent (Sonnet 4.7 medium)` -- data assembly +
  multi-source join (DB + Phase-2 provenance + Phase-0 pool + research
  aids) against a fully-specified contract; NO synthesis judgment here
  (that is the D6 skill's, Task 2). Not inline (a driver is not
  inline-shaped -- `feedback_no_subagents_for_mechanical_edits`
  sharpened; phase-template).

> **RECON NOTE 2026-05-17 (orchestrator, Phase 3 mid-loop -- the
> parameterized-family lane; READ BEFORE executing Task 2).** Task 2's
> "dispatch the D6 skill per manifest entity" is GOVERNED by the dated D6
> family-lane amendment in `decisions.md` (read it in full). The volume loop
> is SPLIT: heterogeneous knobs keep the proven per-knob Opus-4.7-MAX loop;
> 112 knobs across **7 source-grep-verified parameterized families** (xfav_go
> 20, favx_add 20, UserMode 17, TimeSet 6, ksound 6, ChangeDM 5, k_fbskill_*
> 38) ride the family lane -- ONE Opus-4.7-MAX family eval (the dial is NOT
> lowered) + per-member parameter substitution with each member's source
> binding independently + cheaply grep-verified. The false-twin
> divergence-catch (a member whose grepped binding diverges -> EJECTED to
> per-knob Opus-MAX) is a HARD BLOCKING GATE -- it is the load-bearing risk,
> not tokens; prove the lane on ONE real family with a *planted false-twin
> the catch must eject* before resuming volume. 22 family members are already
> done (15 xfav_go, 6 UserMode, 1 k_fbskill) -- correct + carried, NOT
> redone; `--status` is the cursor. Bind the per-member verifier to the
> manifest `canonical_id` (loader-lowercased per F-D10b: source `"XonX"` ->
> `ktx:command:xonx`), not the source name string. F-D6a (grep-verify any
> sub-agent line/handler/conflict claim BEFORE persist) applies in full and
> is concentrated, not relaxed, by the lane. Sub-case A (pure substitution:
> xfav_go/favx_add/TimeSet/ksound) vs sub-case B (shared-context batch,
> per-member meaning differs: UserMode/ChangeDM/k_fbskill_*) -- see the
> decisions.md block for the per-member authoring difference. This lane is
> Stage B (a fresh executor builds it) and starts ONLY after the operator
> ratifies the amendment.

### Task 2 -- The D6 guardrailed fan-out: evaluate every in-scope KTX entity (Opus 4.7 MAX -- spec-locked)

- **Goal:** fan the Phase-1 D6 skill (the unit) as sub-agents over the
  Task-1 manifest so EVERY in-scope KTX entity is evaluated and ends
  with an affirmed-or-synthesized owned description (or a routed-to-C1
  disposition) carrying the D11 decision trail -- the only place
  affirm-vs-synthesize is decided (D5 amendment; the D9 seam handed
  everything here).
- **Files:** `apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts`
  (created -- the fan-out + write part); CONSUMES
  `~/.claude/skills/<d6-skill-slug>/` (Phase 1; not modified).
- **Steps:**
  - [ ] Dispatch the D6 skill per manifest entity as a sub-agent. The
        skill runs its hard-coded D5/D5-amendment keep-vs-synthesize
        judgment on the input packet (read-site grounding, the existing
        comment/`shipped_doc` text is ONE input, never a verdict --
        D5 amendment), then takes exactly one disposition:
        - **AFFIRM** -- the existing text (a `source_inline` dev comment
          OR a Phase-2 `shipped_doc` config gloss) already meets the D5
          rubric: `verdict=affirm`, origin UNCHANGED (`source_inline`
          stays `source_inline`; `shipped_doc` stays `shipped_doc` --
          honest provenance: the dev/config-author's own words, no
          separate user-doc field to launder into -- D2/D5-amendment
          "affirmed-by-evaluation, not skipped"), the trail
          (`verdict`/`confidence`/`reasoning`) populated. An affirm of
          existing words asserts no NEW source-grounded claim, so it does
          NOT go through D7 tier-1 (Task 3); a spot-check sample of the
          affirmed bulk goes to the D7 tier-2 operator tail (D7).
        - **SYNTHESIZE** -- weak / coder-rationale / cryptic / absent:
          D6 read-site-grounded description -> `description` set,
          `description_origin='synthesized'`, `source_ref` file:line via
          the EXISTING `cvar_versions`/`command_versions` mechanism (no
          new citation format -- P3/D6), `description_anchor_version` =
          the live KTX head version (`versions.commit_sha` at EXECUTION
          -- do NOT hard-code da73e06; Phase 0 advances it). Goes through
          D7 tier-1 (Task 3) before commit.
        - **D8 bot/judgment lane** (the 38 `k_fbskill_*` + judgment-tier
          knobs): mechanism-only synthesis ("controls the bot's X
          weighting; higher = ...") -> `synthesized`, counts COMPLETE
          L1; the recommended-value/tuning piece is emitted as an L3
          candidate (routed OUT), its absence is NOT an L1 gap (D8).
        - **C3-suspect lane** (knob in the Phase-0 KTX suspect pool): the
          D6 truthful dead-stamp -- "registered in KTX source at version
          N; not reachable in a running build at this commit; appears
          non-functional, candidate upstream code bug" -- + route to the
          C1 outreach track. NEVER a confident "tunes X" (C3/D6 sibling).
          Detect+stamp+route ONLY: do NOT classify genuine-dead vs
          build-excluded (F-C3b -- the parked libclang call-graph arc).
        - **Hard confabulation guard** -- behaviour not source-legible
          even at Opus-max: hedge, or route to the C1 residue track;
          NEVER guess (D6). Tracked, never importance-cut (C1).
  - [ ] D10 three-class handling INSIDE synthesis (built on C2; the
        meaning-conflict is RESOLVED inline at the D7 tail -- Task 5 --
        not in a separate queue):
        - **Value differences** (`k_short_gib` 1/0, `sv_maxrate`
          500000/50000, `k_exclusive` 1/0 ...): the configs agree on
          what the knob DOES -- L1 takes the shared behaviour; the
          differing values become an L3 recommended-value candidate
          (routed OUT). NOT an L1 conflict -- do NOT flag it as one
          (D10).
        - **Meaning conflicts** (`k_noframechecks` polarity-label
          inversion -- verified live, a KTX cvar in scope): D6 proposes
          the source-grounded description (KTX source is the tiebreaker
          -- source-truth dichotomy) and C2-flags the row for inline
          operator resolution at the D7 tier-2 tail (Task 5), source
          evidence in hand. NEVER auto-picked (C2).
        - **Membership drift** (in-repo-only / nQuake-only): union
          coverage; provenance records which file documented it; a
          deliberate omission is L3 context, not missing L1 (D10).
        - **The `sv_antilag` cross-fork DUAL exemplar** -- collapses
          into "meaning conflict", no fork-aware schema (D10). Phase-3
          scope precision (verified live): the KTX-registered antilag
          entities are `ktx:command:antilag` + `ktx:cvar:k_vp_antilag`
          (both `source_inline` -> evaluate/affirm normally). The
          `sv_antilag` *cvar* is MVDSV (`mvdsv:cvar:sv_antilag` -- Phase
          4; there is NO `ktx:cvar:sv_antilag`). Phase 3 carries the
          mainline-KTX source behaviour (no `antilag.c`; `cvar("sv_antilag")`;
          ships `"sv_antilag 2" // antilag on` => "on"==2) as
          cross-reference SOURCE EVIDENCE in the trail for the Phase-4
          DUAL; it does NOT create a KTX `sv_antilag` entity, does NOT
          collapse the meaning, and does NOT extract the dusty-ktx fork
          (F-D10c -- a separate future arc).
  - [ ] Persist each evaluated entity's D11 decision trail
        (`description_verdict` / `description_confidence` /
        `description_reasoning` / `description_proposed`) alongside the
        committed `description`/`description_origin`; D6 emits the
        reasoning -- it is STORED, not just logged (D11 operator
        requirement). JSONB writes bind JS values directly / `tx.json`,
        never pre-stringified (P2 -- the retained provenance is
        reconciled, never regressed). All writes idempotent
        (deterministic ordering; UPSERT on the existing entity key;
        fill-not-create -- C4/P3).
  - [ ] `k_short_gib`: NOT dispatched (Phase-1 terminal `synthesized`);
        its row is left intact and counted exactly once (C4/D19/P3 --
        a re-run reproduces it identically because it is skipped, not
        re-synthesized).
- **Verification:** post-fan-out,
  `SELECT count(*) FILTER (WHERE description IS NOT NULL OR
  description_verdict IS NOT NULL) , count(*) FROM entities WHERE
  project='ktx' AND type IN ('cvar','command','info_key');` shows every
  in-scope entity carries an affirmed/synthesized description OR a
  trail-recorded C1-residue verdict (no NULL-everything row); a sampled
  C3-suspect carries the dead-stamp text + a C1-route marker (NOT a
  confident description); a sampled value-difference cvar carries the
  shared-behaviour description with NO L1-conflict flag; `k_short_gib`
  still `synthesized`, untouched. PASS: zero in-scope entity with no
  disposition; C3 sample dead-stamped+routed; value-diff sample
  not-flagged; k_short_gib intact. FAIL: any in-scope entity with no
  disposition, a C3-suspect with a confident description, a
  value-difference flagged as an L1 conflict, or k_short_gib regressed.
- **Execution mode:** **`subagent (Opus 4.7 MAX)` -- SPEC-LOCKED by D7
  (synthesis = the D6 skill at Opus 4.7 max reasoning); recorded, the
  planner does NOT lower it.** The D6 skill's hard-coded D5
  keep-vs-synthesize classify runs INSIDE this same Opus-4.7-MAX
  invocation -- D7's rationale is explicit that a low-reasoning first
  pass is false economy on the one thing that must be correct and the
  bounded corpus cost is modest; the "cheap" in cheap-classify is the
  fast AFFIRM exit (no synthesis generation work), NOT a cheaper model
  (Open Q (a) surfaces this D5-vs-D7 reading for operator confirm rather
  than silently introducing a cheaper pre-classify tier that would work
  around the spec-locked D6 dial).

### Task 3 -- The D7 tier-1 independent automated evidence re-check (independent Opus 4.7 MAX -- spec-locked)

- **Goal:** every SYNTHESIZED row passes an independent automated
  evidence re-check before it commits -- the load-bearing D7 tier-1
  (affirms of the dev's/config-author's own words carry no new claim
  and go to the tier-2 spot-check instead, D7).
- **Files:** CONSUMES
  `apps/qw-oracle/scripts/describe-fill/review-gate.ts` (Phase 1; not
  modified); `apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts`
  (created -- wires the gate into the pipeline).
- **Steps:**
  - [ ] Run the Phase-1 `review-gate.ts` tier-1 over every Task-2
        `synthesized` row as an INDEPENDENT invocation -- a separate
        context from Task 2's authoring sub-agent (D7: "an independent
        verifier (separate invocation, not the authoring context)").
  - [ ] Tier-1 confirms, per row: the cited `source_ref` file:line
        actually exhibits the claimed behaviour AND the text passes the
        D5 rubric mechanically. PASS -> the row commits. FAIL -> the row
        is bounced back to Task-2 re-synthesis (one bounded retry) OR
        routed to the C1 residue track (the confabulation guard working
        as designed -- a row whose `source_ref` does not exhibit the
        claim is NOT massaged to pass; it is tracked honestly -- C1).
  - [ ] Tier-1 marks the tier-2 operator-tail set: EVERY hedged row +
        EVERY C1-residue-routed row + EVERY C2-flagged D10
        meaning-conflict + a spot-check SAMPLE of the auto-passed bulk
        AND of the Task-2 affirmed bulk (D7 tier-2 = "hedged ones,
        residue-routed ones, and a spot-check sample of the auto-passed
        bulk").
  - [ ] The gate is engine-agnostic (Phase-1 contract) -- Phase 3 adds
        no KTX-specific gate logic; it feeds the structured candidate +
        the D6 trail and consumes the pass/fail/tail-mark.
- **Verification:** post-gate,
  `SELECT count(*) FROM entities WHERE project='ktx'
  AND description_origin='synthesized' AND description_verdict IS NULL;`
  is 0 (every synthesized row carries a gate verdict); a row whose
  tier-1 failed is either re-synthesized-and-passed OR carries a
  C1-residue verdict (NOT committed as a confident description); the
  tier-2 tail set is non-empty and includes all C2-flagged
  meaning-conflicts. PASS: no synthesized row without a gate verdict;
  failed rows bounced or residue-routed (never silently committed);
  tail set complete. FAIL: a synthesized row with no gate verdict, a
  tier-1-failed row committed as confident, or a C2-flag missing from
  the tail.
- **Execution mode:** **`subagent (Opus 4.7 MAX)` -- SPEC-LOCKED by D7
  (review = an independent Opus 4.7 at max), an INDEPENDENT invocation
  separate from Task 2's authoring context; recorded, NOT lowered.**

### Task 4 -- The C5 synthesized-source_ref probe + the idempotent coverage/residue harness

- **Goal:** ship the one C5-spirit honesty probe Phase 3 is first to
  need at volume, and the automated phase-boundary harness (coverage vs
  the C1 denominators, residue enumerated not cut, idempotency proven,
  the Phase-1/2 C5 probes GREEN at volume).
- **Files:** `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`
  (modified -- one new probe); `apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts`
  (created -- the harness part) + the generated run report.
- **Steps:**
  - [ ] Add `probeDescribeFillSynthesizedRequiresSourceRef` returning
        `ProbeResult` (the live `Probe` interface; pure read-only SQL):
        for `project IN ('ktx','mvdsv')` and `type IN
        ('cvar','command','cmdline_param','info_key')`, every row with
        `description_origin='synthesized'` resolves to a non-empty
        `source_ref` (its `cvar_versions`/`command_versions`
        `source_file`+`source_line`). Register in `REGRESSION_PROBES` as
        `F1.describe_fill.synthesized_requires_source_ref`,
        `family:'regression'`. WHY (P5 comment): Phase 3 is the first
        phase to write `synthesized` at volume; `origin_vocabulary`
        checks the tag and `synthesized_requires_anchor` checks the
        anchor, but NO Phase-1/2 probe watches a synthesized row silently
        missing its citation -- the exact C5/F-C5a honesty failure mode
        for the shape this phase first writes at volume (Open Q (b)
        surfaces the new-at-volume vs strict-first-writer C5 reading for
        operator confirm).
  - [ ] Harness (in `synthesize-ktx.ts`): assert every in-scope KTX
        entity (the live POST-Phase-0 probe-0 C1 denominators -- recon
        them, do NOT trust the pre-Phase-0 260/358/7 blind) carries an
        affirmed-or-synthesized `description` OR an enumerated
        C1-outreach-track residue row. Residue (the not-source-legible
        tail + the C3 dead-stamped + the 38 bot outcome + the 11
        non-resolver config-drift names, never created) is REPORTED, not
        cut: "doesn't matter for admins" is a C1 violation -- if any
        scope-cut is implied, surface it as a deviation, do NOT silently
        comply (C1; CLAUDE.md verification discipline).
  - [ ] `k_short_gib` assertions: exactly one entity row, counted
        exactly once in coverage, `description_origin` still
        `synthesized`, its Phase-1 provenance/anchor/trail intact (C4/
        D19/P3).
  - [ ] Idempotency: run the full extract-consuming fan-out + gate +
        write twice against a fixed input; assert a byte-identical
        committed-row fingerprint
        (`md5(string_agg(canonical_id || coalesce(description,'') ||
        coalesce(description_origin,'') || coalesce(description_verdict,'')
        ..., ORDER BY canonical_id))` over the in-scope set). C4/P3 --
        proven, not assumed.
  - [ ] Emit the run report (Open Q (c) path -- the Phase-1
        `scripts/describe-fill/` run-report convention): coverage vs M
        per bucket; the enumerated C1-outreach residue list; the 11
        config-drift non-resolvers; the D10 meaning-conflict tail list
        for the operator. ASCII only (P5).
  - [ ] Confirm the Phase-1 probes (`origin_vocabulary` --
        `synthesized`/`shipped_doc`/`source_inline` all in-vocabulary;
        `synthesized_requires_anchor` -- every volume `synthesized` row
        anchored) and the Phase-2 probes (`jsonb_columns_not_strings`
        ktx; `provenance_entry_exists`) are GREEN at volume. Do NOT
        re-add them (C5: each lands in the phase that first writes its
        shape; Phase 3 only adds the source_ref shape it is first to
        write at volume).
- **Verification (presupposes Phase-1/2 EXECUTED -- the four Phase-1/2
  probes do NOT exist in the planning-state DB; if Phase 1/2 unexecuted
  this is BLOCKED per Open Q (d), not FAIL):**
  `bun scripts/load-knowledge/index.ts quality-grid --project ktx
  --family regression --probe F1.describe_fill.synthesized_requires_source_ref`
  prints `[PASS]`; the same for the four Phase-1/2 probes; the harness
  prints coverage == M per bucket with the residue list non-empty and
  enumerated (denominator unchanged -- C1); idempotency fingerprint
  identical across two runs. PASS: the new probe + all four Phase-1/2
  probes `[PASS]` at volume; coverage == M with residue tracked;
  idempotent. FAIL: any probe `[FAIL]`, coverage < M with a silently
  dropped entity, a lowered denominator, or a non-idempotent fingerprint.
- **Execution mode:** `subagent (Sonnet 4.7 medium)` -- probe synthesis
  against the established in-file pattern (the Phase-1/2 probe functions
  are the template) + a coverage/idempotency driver against a clear
  contract; single-file probe + glue, the hard judgment is Tasks 2/3.

### Task 5 -- The D7 tier-2 operator batch tail on the D11/D15 audit page (operator-run; this IS the phase boundary)

- **Goal:** the operator works the D7 tier-2 tail per-row on the
  Phase-1 `cvar-audit-review.html`-pattern page, resolving the D10
  meaning-conflicts INLINE with source evidence; this human gate IS the
  Phase 3 boundary (Phase 3 is the first phase that RUNS the operator
  tail -- D7/D11/D15/D18).
- **Files:** CONSUMES
  `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts`
  (Phase 1; not modified); `apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts`
  (created -- invokes the emitter over the full evaluated KTX set).
- **Steps:**
  - [ ] Run the Phase-1 `serialize-audit-review.ts` emitter over the
        full evaluated KTX in-scope set -> one sortable/filterable
        `cvar-audit-review.html`-pattern page, row-per-entity, the
        original source/config comment + our proposed/committed
        description + the D6 reasoning shown INLINE per row as ONE
        before/after/why unit (D15 locked --
        `feedback_inline_pairs_over_split_panels`; never split into
        panels/views). Emit-from-record (D11/D15) -- a pure projection,
        regenerated, never hand-edited.
  - [ ] The operator works the tier-2 tail on that page (Claude
        proposes per row, operator approves/overrides -- D11): every
        hedged row, every C1-residue-routed row, a spot-check sample of
        the auto-passed + affirmed bulk, and -- inline, with the source
        evidence in hand -- every C2-flagged D10 meaning-conflict. The
        `k_noframechecks` polarity case is resolved here: the operator
        reads the D6 source-grounded proposal + both inverted config
        comments (Phase-2 retained per-source) + the KTX source
        tiebreaker and confirms the true polarity. NO separate conflict
        queue -- one workflow, source evidence still in hand (D10).
  - [ ] Operator overrides are applied by RE-RUNNING the corrected
        pipeline path (C4 -- never a hand `UPDATE` of the visibly-wrong
        row; a systemic D6 error means fix the skill and re-fan, not
        row-by-row patches). The audit page regenerates from the
        record after each correction round (D11/D15 emit-from-record).
- **Verification:** this task is OPERATOR-RUN per-row human judgment --
  NOT a YES/NO probe. Completion signal: the operator has worked the
  full tier-2 tail (every hedged + every residue + every C2-flagged
  meaning-conflict + the spot-check) on the regenerated page and signed
  off; every D10 meaning-conflict carries an operator-confirmed
  resolution; no row remains in an unreviewed C2-flagged state. The
  automated YES/NO checks are in the phase-boundary block below; THIS
  task's "verification" is the operator's per-row sign-off (the spec-
  locked human gate -- D7 tier-2 / D11 / D15 / D18 review-bandwidth).
- **Execution mode:** the page emit = `subagent (Sonnet 4.7 medium)`
  (run the existing Phase-1 emitter over volume -- a projection, no new
  logic). The tier-2 tail itself = **operator-run** -- the spec-locked
  human correctness gate (D7 tier-2; D11/D15; D18 makes the operator
  the correctness judge on every D7/D15 row). NOT a model dial, NOT
  Claude-automatable; recorded as operator-run, honestly.

## Verification (phase boundary)

The Phase 3 boundary is HONESTLY HYBRID: an automated YES/NO block the
operator runs, PLUS the operator-run D7 tier-2 tail (per-row judgment --
NOT a probe). The phase is complete only when BOTH hold. Run from
`apps/qw-oracle/` after Tasks 1-4, against the post-Phase-0/1/2 baseline.

**Precondition (state it at the command site, not just in "Inputs" --
the Phase-1-review lesson):** these commands presuppose Phase 0 + Phase
1 + Phase 2 EXECUTED. Check 7's five probes do NOT exist in the
planning-state DB (the four Phase-1/2 C5 probes are unwritten until
Phase 1/2 execute -- live-verified absent this draft; `synthesized` and
`shipped_doc` rows are zero pre-execution). Run this block ONLY against
the post-Phase-0/1/2 baseline; if Phase 0/1/2 has not executed, Phase 3
is BLOCKED (Open Q (d)), not FAIL -- do not run these checks against the
planning-state DB and read absence as a defect.

### Automated (YES/NO -- copy-paste)

```
PSQL='docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc'

# 1. Coverage == the live C1 denominators; every in-scope KTX entity has
#    an affirmed/synthesized description OR a trail-recorded disposition.
$PSQL "SELECT type, count(*) total,
  count(*) FILTER (WHERE description IS NOT NULL OR description_verdict IS NOT NULL) settled
  FROM entities WHERE project='ktx' AND type IN ('cvar','command','info_key')
  GROUP BY type ORDER BY type;"
# PASS condition: per bucket total == the live POST-Phase-0 probe-0 M
# (recon it; pre-Phase-0 was cvar 260 / command 358 / info_key 7) AND
# settled == total (every in-scope entity carries a disposition; the
# denominator is M, never cut -- C1). The residue inside `settled` is
# enumerated in the Task-4 run report as the C1-outreach track.

# 2. Idempotent re-run: identical committed-row fingerprint.
cd apps/qw-oracle && bun scripts/describe-fill/synthesize-ktx.ts --twice
# PASS condition: prints IDENTICAL=YES (two full fan-out+gate+write
# cycles produced a byte-identical in-scope entities fingerprint -- C4/P3).

# 3. k_short_gib idempotent + not regressed (D19/C4/P3).
$PSQL "SELECT description_origin='synthesized'
  AND (SELECT count(*) FROM entities WHERE canonical_id='ktx:cvar:k_short_gib')=1
  FROM entities WHERE canonical_id='ktx:cvar:k_short_gib';"
# PASS condition: prints t (exactly one row; Phase-1 synthesized state
# intact -- Phase 3 skipped it, did not re-synthesize or duplicate).

# 4. Every synthesized row carries a D7 gate verdict (tier-1 ran).
$PSQL "SELECT count(*) FROM entities WHERE project='ktx'
  AND description_origin='synthesized' AND description_verdict IS NULL;"
# PASS condition: prints 0 (D7 tier-1 ran on every synthesized row;
# tier-1 failures were bounced/residue-routed, never silently committed).

# 5. C3 suspects dead-stamped + routed, NEVER a confident description.
$PSQL "SELECT count(*) FROM entities e WHERE e.project='ktx'
  AND e.canonical_id = ANY(<the Phase-0 KTX c3-suspect canonical_id set>)
  AND (e.description_verdict <> 'flag-dead' OR e.description_origin='synthesized'
       AND e.description NOT ILIKE '%not reachable in a running build%');"
# PASS condition: prints 0 (every Phase-0 KTX suspect carries the D6
# truthful dead-stamp + C1 route, never a confident "tunes X" -- C3/F-C3b;
# detect+stamp+route only, not classified).

# 6. No value-difference flagged as an L1 conflict (D10).
#    (the Task-4 report lists every D10-classified row; assert no
#     value-difference row carries a meaning-conflict/C2 flag.)
# PASS condition: the Task-4 report's value-difference set has zero
# C2/meaning-conflict flags; the differing values are routed to L3
# candidates, not flagged as L1 conflicts.

# 7. The C5 probes GREEN at volume (the new one + the Phase-1/2 four).
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.synthesized_requires_source_ref
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.origin_vocabulary
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.synthesized_requires_anchor
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.describe_fill.provenance_entry_exists
bun scripts/load-knowledge/index.ts quality-grid --project ktx --family regression \
  --probe F1.jsonb_columns_not_strings
# PASS condition: all five print [PASS] at volume (synthesized-source_ref
# the Phase-3 add; the other four Phase-1/2 deliverables stay GREEN under
# the volume write).
```

If all seven PASS, the automated half is green. If any FAIL, consult
Recovery (C4 -- re-run the corrected pipeline, never UPDATE).

### Operator-run (the D7 tier-2 tail -- per-row judgment, NOT a probe)

This half is honest about being operator-run (the drafter prompt + D7 +
D18). The phase boundary is NOT complete on the automated block alone:
the operator must work the D7 tier-2 tail on the regenerated Phase-1
`serialize-audit-review.ts` page (Task 5) -- every hedged row, every
C1-residue-routed row, every C2-flagged D10 meaning-conflict resolved
INLINE with source evidence (`k_noframechecks` polarity the worked
case), and a spot-check sample of the auto-passed + affirmed bulk --
Claude proposes per row, operator approves/overrides. The phase is
complete only when the operator has signed off the full tail and no
row remains in an unreviewed C2-flagged state. This per-row human gate
is spec-locked (D7 tier-2 / D11 / D15) and is the binding correctness
judge (D18); it cannot be reduced to a YES/NO probe and is not
Claude-automatable.

If automated PASS AND operator tail signed off -> Phase 3 -> approved/
shipped. Otherwise consult Recovery.

## Outputs to next phase

State now true that was not before:

- **Every in-scope KTX configurable entity is closed** against the live
  C1 denominators (cvar M=260 / command M=358 / info_key M=7,
  POST-Phase-0-rebaselined): each carries an affirmed-or-synthesized
  owned description with the D11 decision trail
  (`verdict`/`confidence`/`reasoning`/`proposed`), OR an enumerated
  C1-outreach-track residue row -- never importance-cut (C1). The KTX
  slice of the describe-fill is complete and honest.
- **The D10 meaning-conflicts are resolved** inline at the D7 operator
  tail with source evidence (`k_noframechecks` polarity confirmed
  against KTX source); value-differences routed to L3 candidates (NOT
  flagged as L1 conflicts); membership-drift unioned; the `sv_antilag`
  cross-fork DUAL carried as Phase-4 cross-reference source evidence
  WITHOUT extracting the dusty-* fork (F-D10c) or creating a KTX
  `sv_antilag` entity.
- **The C3 suspects are dead-stamped + routed** to the C1 outreach
  track (the D6 truthful stamp; detect+stamp+route only -- never
  classified, F-C3b). The 11 Phase-2 config-drift non-resolvers recorded
  + tracked (never created -- D9 fill-not-create; never dropped -- C1).
- **The C1 outreach track is enumerated** (the not-source-legible tail +
  the C3 dead-stamped + the bot/judgment L3-tuning candidates' L1-side =
  complete) in the Task-4 run report -- the tracked hand-off to Phase 5
  (staleness) + the post-arc / D16 outreach. Bot `k_fbskill_*` count as
  COMPLETE L1 (D8); their tuning advice is an L3 candidate, not an L1
  gap.
- **The new C5 probe** `F1.describe_fill.synthesized_requires_source_ref`
  is registered in `REGRESSION_PROBES` and GREEN at volume; the
  Phase-1/2 C5 probes stay GREEN under the volume write.
- **`k_short_gib` reproduced exactly once**, Phase-1 `synthesized` state
  intact (D19/C4/P3 idempotency proven, not assumed).
- **Phase 4 (MVDSV) rides the identical proven pattern:** the same
  Phase-1 spine (D6 skill + D7 gate + D11/D15 serializer), the same
  fan-out/triage/residue/operator-tail shape, against the MVDSV slice
  sized by Phase 0. Phase 5 consumes the completed KTX record for the
  public projections + the D4 staleness anchor (every synthesized row
  carries `description_anchor_version`).

Runnable state: the idempotent KTX synthesis fan-out round-trips the
full in-scope set through the D6 skill + the D7 two-tier gate into
committed provenance-stamped rows, operator-signed at the tier-2 tail.
The commit at the phase boundary leaves the system runnable (P4: commits
on `main`, no worktree/PR; no per-phase tag -- the arc-ship tag is
end-of-arc).

## Open questions / deferred items

- **Question (a) -- the D5-cheap-classify vs the D7-locked D6 dial
  reconciliation.** D5-amendment says "good comment = fast affirm; weak
  or absent = full Opus-max synthesis" (implying the classify is cheap),
  while D6 says the skill HARD-CODES the D5 keep-vs-synthesize judgment
  and D7 LOCKS the synthesis pass at Opus 4.7 MAX -- so the classify
  lives inside the spec-locked-Opus-MAX D6 skill. **Default chosen for
  now:** the D6 fan-out (classify + affirm-or-synthesize, one guarded
  invocation per knob) runs at Opus 4.7 MAX -- the spec-faithful reading
  that does NOT lower or work around the locked D6 dial (D7's rationale
  is explicit: a low-reasoning first pass is false economy on the one
  thing that must be correct, the bounded corpus cost is modest); the
  "cheap" in cheap-classify is the fast AFFIRM exit (no synthesis
  generation), not a cheaper model. **Who can resolve:** operator
  confirm this is the faithful D5+D6+D7 reading (vs introducing a cheaper
  pre-classify tier, which would work around the spec-locked D6 dial --
  surfaced per the never-silently-comply rule, not silently diverged).
  Not a decisions.md change -- the locks (D6 hard-codes classify; D7
  Opus-MAX) are honored as written.

- **Question (b) -- the C5 reading for the synthesized-source_ref
  probe.** C5 says a shape's probe lands in the phase that FIRST writes
  the shape; Phase 1 first writes `synthesized` (exactly one row,
  `k_short_gib`) and shipped `synthesized_requires_anchor`. Phase 3 is
  the first to write `synthesized` AT VOLUME, and no Phase-1/2 probe
  watches the synthesized-without-`source_ref` failure mode (a real
  C5/F-C5a honesty gap -- a synthesized row silently missing its
  citation, which the D7 per-row gate enforces but no at-rest regression
  probe watches). **Default chosen for now (recommended):** Phase 3
  ships `F1.describe_fill.synthesized_requires_source_ref` -- faithful
  to C5's spirit + F-C5a, cheap, closes a real gap. **Who can resolve:**
  operator confirm new-at-volume vs strict-first-writer (if strict, the
  probe is a one-line C5 clarification moving its nominal owner to Phase
  1 retroactively -- but C1/C5 honesty is honored either way since the
  probe ships in this arc; not a decisions.md change).

- **Question (c) -- the run-report exact path/filename.** The Phase-3
  driver emits its coverage/residue/conflict run report under the
  Phase-1 `apps/qw-oracle/scripts/describe-fill/` run-report convention
  (Phase 2's `extract-ktx-mechanical.ts` already emits one there).
  **Default chosen for now:** `scripts/describe-fill/` per the Phase-1
  convention; the exact filename is low-stakes and the executor confirms
  it against the Phase-1 convention at execution (mirrors Phase 1 Open Q
  (e) skill-slug handling). **Who can resolve:** executor at execution.

- **Question (d) -- Phase 3 EXECUTION presupposes Phase 0 + Phase 1 +
  Phase 2 EXECUTION.** The arc is in PLANNING (live-verified this draft:
  no migration 014, no `describe-fill/`, no D6 skill, no
  `serialize-audit-review.ts`, no `c3-suspect-pool.md`, `k_short_gib`
  NULL). **Default chosen for now:** "Inputs from previous phase" makes
  all three a hard precondition; if any has not executed, Phase 3 halts
  and reports BLOCKED with the missing precondition (not a Phase 3
  defect -- the slicing order is 0/1 -> 2 -> 3; Phase 0 is a hard
  synthesis prerequisite per C3/D12). **Who can resolve:**
  arc-orchestrator at execution time (sequencing, flagged here -- not a
  reshape; README locks 3 after 2 and Phase 0 first/independent).

- **Sub-agent verification pass completed 2026-05-17** (Explore agent,
  full phase-template brief with item 8 read in its 2026-05-17-corrected
  form + the 13 template checks + the 5 Phase-3-specific confirmations +
  a live spot-check of the Recon numerics). Result: **ZERO CRITICAL,
  ZERO SUBSTANTIVE.** The agent independently re-verified the live
  claims (38 `k_fbskill_*` in `bot_botimp.c`; KTX is C -- 108 `.c`, 0
  `.qc`; the `k_noframechecks` polarity inversion; the Phase-1/2 C5
  probes genuinely absent from live `quality-grid.ts` -- Phase 1/2
  unexecuted) and confirmed them. One actionable ADVISORY: the
  phase-boundary probe commands asserted the Phase-1/2 probes GREEN at
  volume without restating the Phase-1/2-execution precondition AT the
  command site (an executor running them cold against the planning-state
  DB would mis-read absence as a defect -- the Phase-1-review
  missing-precondition-at-the-verification-site lesson). APPLIED: a
  precondition banner added to the automated phase-boundary block + Task
  4's verification line (consistent with the existing "Inputs" + Recon +
  Open Q (d) framing -- a clarity strengthening, not a logic change).
  The other two "advisory" items were PASS confirmations (ASCII
  discipline clean; model dials correctly locked + recorded, Task 5
  honestly operator-run). **No finding contradicted `decisions.md`;
  nothing rejected.** No lock's factual premise looked wrong (OQ-3
  discipline -- nothing surfaced for amendment).

## Recovery (if verification fails)

C4 discipline throughout: recovery is re-running the corrected pipeline
end-to-end, NEVER an `UPDATE` that patches the visibly-wrong rows in
place (a hand-patch repairs only noticed damage; the same bug typically
re-shaped unnoticed rows too -- `feedback_repair_by_reextract_not_sql_update`).

- **Check 1 coverage < M, or residue silently shrunk:** the Task-1
  assembler exempted a bucket (a presumptively-covered bucket -- the
  D5-amendment/C1 violation) OR the denominator was lowered. Do NOT
  lower M (C1). Fix the assembler to select EVERY in-scope entity, fix
  the residue enumeration to track (not cut) the not-legible tail,
  re-run the corrected fan-out end-to-end (C4). "It doesn't matter for
  admins" is a C1 violation -- surface it as a deviation to the
  operator, do NOT silently comply.
- **Check 2 IDENTICAL=NO (not idempotent):** a non-deterministic step
  (unstable manifest ordering, a timestamp in the record, a
  read-order-dependent merge). Make the manifest + the write
  deterministic, re-run twice (C4/P3). Suspect idempotency before
  staleness (`feedback_idempotency_before_staleness`).
- **Check 3 k_short_gib regressed/duplicated:** the Task-2 idempotent
  skip failed (Phase 3 re-synthesized or duplicated the Phase-1
  terminal row). Fix the skip-if-terminal guard, re-run the fan-out
  (C4). Do NOT `UPDATE` k_short_gib back by hand.
- **Check 4 a synthesized row with no gate verdict:** the D7 tier-1
  feed (Task 3) missed rows or the gate was bypassed. Fix the wiring so
  every synthesized row goes through the independent tier-1 invocation,
  re-run synthesis+gate (C4). A tier-1-failed row must be bounced or
  residue-routed -- never committed as confident.
- **Check 5 a C3-suspect carries a confident description:** the C3
  dead-stamp lane was bypassed (a confabulation-guard breach). Fix the
  D6-skill C3 routing in the fan-out, re-run the affected entities
  through the corrected skill (C4). Detect+stamp+route only -- if the
  failure is "the suspect pool is wrong", that is Phase 0 / the parked
  F-C3b arc, NOT a Phase 3 reclassification (do not classify here).
- **Check 6 a value-difference flagged as an L1 conflict (or a
  meaning-conflict NOT flagged):** the D10 three-class router is wrong.
  Fix the classifier (value-diff -> L3 candidate, NOT an L1 flag;
  meaning-conflict -> C2-flag + D7-tail), re-synth the affected
  entities, re-run the gate (C4).
- **Check 7 `synthesized_requires_source_ref` FAIL:** a synthesized row
  is missing its citation (a P3/D6 breach). Fix the D6 evidence step
  (every synthesized row carries `source_ref` via the EXISTING
  mechanism -- no new format), re-synth through the gate, re-run the
  probe. Do NOT SQL-patch the source_ref, do NOT loosen the probe.
- **Check 7 a Phase-1/2 C5 probe regressed at volume:** a volume write
  violated an honesty invariant the Phase-1/2 probe watches (bad origin
  tag / missing anchor / stringified JSONB / missing provenance entry).
  Fix the writer, re-run the corrected pipeline end-to-end (C4), never
  `UPDATE`.
- **D7 tier-1 systematically bounces (source_ref does not exhibit the
  behaviour):** the read-site grounding is wrong -- this is the
  confabulation guard WORKING. Route the un-groundable rows to the C1
  residue track honestly (tracked, never importance-cut -- C1); do NOT
  loosen tier-1 to pass them, do NOT guess (D6).
- **The operator tail surfaces a systemic D6 error (many rows wrong the
  same way):** C4 -- fix the D6 skill (a Phase-1 deliverable; surface to
  the operator as a Phase-1 skill defect, not a Phase-3 row-patch),
  re-run the fan-out end-to-end, regenerate the audit page. NEVER
  row-by-row `UPDATE`s.
- **Unanticipated failure:** route to the operator with the failing
  check's output verbatim; do not explain the gap away (CLAUDE.md
  verification discipline). Do not propose a scope deferral / residue
  importance-cut without explicit operator approval (that is the
  operator's call, not a default -- C1).
