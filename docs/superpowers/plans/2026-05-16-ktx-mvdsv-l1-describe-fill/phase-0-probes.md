# Phase 0 -- Probes + the free win

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- C1-C5, P1-P5, D1-D19). Done.
> 2. Read `review-findings.md`; Phase 0 rows: F-C3a (substantive),
>    F-D12a (substantive), F-D12b (substantive-positive), F-C3b
>    (boundary). Done.
> 3. Recon the LIVE source before inlining anything. Done -- see the
>    "Recon facts" block below; every number and path here is verified
>    against the live DB / repo / dump, not copied from the spec.
> 4. After drafting, dispatch the verification sub-agent. Done; findings
>    applied (see "Open questions").

## Goal

Phase 0 runs the three cheap probes that size the MVDSV phases and gate
the KTX/MVDSV synthesis phases, plus the one verified free win. Task 1
flips the verified `load-commands.ts` description mapping so 28/108 MVDSV
commands stop loading NULL (no re-extract, idempotent reload). Task 2
cleans the operator-captured runtime dump and diffs it against the L1
KTX+MVDSV registered set to produce the C3 suspect pool (registered in
source, absent from a running build) -- a pool, never a verdict, carrying
a mandatory pinning-caveat header. Task 3 is the conditional F-C3a
contemporaneity recovery (the L1 extract materially predates the dump
build; the recovery direction is an operator decision surfaced below).
Task 4 fetches ezquake.com/docs/settings/server.html and measures the
SHAPE of its overlap with the MVDSV cvar roster so Phase 4 is sized
against real evidence instead of the fabricated `124` figure. Phase 0
SIZES Phase 4 and is a hard prerequisite for Phase 3/4 synthesis; it does
NOT gate Phase 1 or Phase 2 (KTX mechanical extract is
liveness-agnostic). **Runnable, verifiable state at the boundary:** the
28 MVDSV commands carry `help_desc` in the DB (was 0); the C3 suspect-pool
file exists with its pinning caveat and a sane per-engine count; the
ezquake.com shape report exists with bucketed name lists and no
`N/183` headline metric; all four are re-derivable by re-running the
committed scripts.

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

- DB up: `qw-oracle-postgres-dev` healthy. Denominators confirmed
  against `entities`: ktx cvar 260 / command 358 / info_key 7; mvdsv
  cvar 183 / command 108 / cmdline_param 11. These match probe-0; they
  are the C1 exhaustive denominators.
- Loaded L1 extract: ktx `head` @ commit `da73e06` (repo date
  **2026-03-03**), mvdsv `head` @ commit `f816d28` (repo date
  **2026-01-04**). Both research clones are FROZEN at those commits
  (local HEAD == extract commit; zero newer revisions present locally).
- Runtime dump: `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ciscon-1.20-dev-2026-04-27.log`
  -- operator capture 2026-04-27, MVDSV 1.20-dev + KTX 1.47-dev,
  **build date 2026-04-11**, Linux ARM64. 873 lines, CRLF, every data
  line prefixed `[YYYY-MM-DD HH:MM:SS] `. cvarlist footer `758/758`
  (733 plain `[ts]   name val` + ~25 SERVERINFO `[ts] s name val`),
  cmdlist footer `107/107`. **181 of the 758 cvars are `__k_ls*`**
  runtime-generated KTX leaderboard noise (C3 discount set).
- MVDSV `SERVER_VERSION` is `"1.20-dev"` at the Jan-4 extract commit
  AND the dump self-reports `version MVDSV 1.20-dev`: the version
  string is identical at both points and is a FALSE FRIEND for
  contemporaneity. Only the commit date exposes the gap (mvdsv ~3
  months, ktx ~5 weeks). This is the F-C3a risk, live.
- Free-win root cause confirmed: `scripts/load-knowledge/load-commands.ts`
  line 28 maps `help_desc: entry.desc ?? null`. The MVDSV commands AST
  (`scripts/extractors/mvdsv/output/mvdsv-commands-ast.json`, 108
  entries) carries `ast.description` on exactly **28** entries and
  `entry.desc` on **0**. `CommandAstBlock` in
  `scripts/load-knowledge/types.ts` (lines 87-94) does NOT declare a
  `description` field -- the fix is one mapping line PLUS one optional
  type field, nothing more. DB pre-fix baseline: mvdsv command rows 108
  total, **0** with `help_desc`.
- A working sibling tool exists:
  `scripts/extractors/mvdsv/diff-runtime.sh`. Its awk parser already
  correctly decodes the dump (the `%c %s %s` flag-column shape -- a
  `[ts] s name` line is a SERVERINFO-flagged cvar, NOT a wrap artifact),
  CRLF, header/footer, lowercase-fold, `sort -u`. But it queries
  **SQLite** (`data/knowledge.db`, pre-Postgres-migration -- stale under
  P1), is **MVDSV-only**, and FILTERS OUT all KTX `k_*` via
  `ktx-progs-prefixes.txt` (`k_ _k_ __k_ add_q_ dmm4_`). C3 needs the
  opposite: KTX `k_*` IN scope (they are L1 KTX entities), only the
  `__k_ls*` auto-generated leaderboard class discounted, both engines
  diffed, Postgres DB side, provenance-stamped file output.
- `entities` already has `description`, `description_origin`,
  `name_fold`, `source_state`. Phase 0 writes NONE of these (see
  "Open questions" -- pre-existing-column note is a Phase 1 input, not
  Phase 0 scope). Phase 0 touches no schema and introduces no new DB
  data shape. **Therefore Phase 0 owes no C5 F1 quality-grid probe:**
  C5 binds the phase that first writes a new shape; the free-win write
  targets the existing `command_versions.help_desc` column (already
  under F1), and the C3 / ezquake.com outputs are markdown artifacts,
  not DB shapes.

## Inputs from previous phase

Phase 0 has no previous phase. Inputs are the checked items in
`prerequisites.md` (verified satisfied 2026-05-17):

- Postgres dev container up; L1 ktx+mvdsv extracts loaded
  (`ktx|260` cvars etc. per the recon block).
- `apps/qw-oracle/.env` has `DATABASE_URL`.
- Research repos present (ktx + mvdsv clones; nQuake distfiles;
  `mvdsv.6`).
- C3 runtime dump present at the validation-fixtures path above.

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/mvdsv/c3-liveness-diff.sh
    # bash; lifts diff-runtime.sh's proven awk dump-parser, but Postgres
    # DB side + union(ktx,mvdsv) scope + __k_ls* discount + file output.
    # Lives next to the dump fixture + its diff-runtime.sh ancestor
    # (consistency over taxonomic purity -- it reads that fixture).
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/c3-suspect-pool.md
    # the C3 suspect pool; mandatory pinning-caveat header; per-engine
    # sections; consumed by the Phase 3 (KTX) and Phase 4 (MVDSV) MDs.
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/ezquake-com-shape.md
    # ezquake.com vs MVDSV M=183 SHAPE report (bucketed name lists, no
    # N/183 headline metric -- F-D12a); consumed by the Phase 4 MD.
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/phase-0-results.md
    # one-page summary the Phase 1/3/4 drafters read: free-win delta,
    # F-C3a disposition, Phase 4 sizing call.
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/load-commands.ts
    # line 28: help_desc: entry.desc ?? ast?.description ?? null
    # (ast is already destructured at line 20). One line. No refactor.
apps/qw-oracle/scripts/load-knowledge/types.ts
    # CommandAstBlock: add `description?: string | null;` so ast?.description
    # typechecks under bunx tsc. One field. MVDSV's extractor is the only
    # one that emits it today.
```

### Deleted

```
n/a -- Phase 0 deletes nothing. diff-runtime.sh is RETAINED (Chesterton's
Fence: it is the source of the proven parser and still serves its own
extractor-gap diagnostic; c3-liveness-diff.sh is a sibling, not a
replacement).
```

## Tasks

### Task 1 -- The free win: load 28/108 MVDSV command descriptions

- **Goal:** the 28 MVDSV commands whose harvested banner already sits in
  the AST as `ast.description` stop loading NULL `help_desc`. No
  re-extract; idempotent reload only (F-D12b).
- **Files:** `scripts/load-knowledge/load-commands.ts`,
  `scripts/load-knowledge/types.ts`.
- **Steps:**
  - [ ] In `types.ts` `CommandAstBlock` (lines 87-94) add
        `description?: string | null;`. WHY: the MVDSV extractor emits
        `ast.description`; the type omits it, so `ast?.description` would
        not typecheck.
  - [ ] In `load-commands.ts` change line 28 from
        `help_desc: entry.desc ?? null,` to
        `help_desc: entry.desc ?? ast?.description ?? null,`. `ast` is
        already in scope (`const ast = entry.ast;`, line 20). Do NOT
        restructure the builder, the adapter, or the extractor
        (F-D12b: over-scoping into a loader refactor is the failure
        mode).
  - [ ] `cd apps/qw-oracle && bunx tsc --noEmit` -- clean.
  - [ ] Reload MVDSV commands through the existing loader path (the
        idempotent `load-version` / load-commands route; no
        re-extract, the AST JSON is unchanged). Recon the exact reload
        invocation from `DEVELOPMENT.md` / `scripts/load-knowledge/`
        before running; do not invent a flag.
  - [ ] Re-run the loader a second time and confirm the count is still
        28 (idempotency, P3 -- not 56, not a duplicate-row inflation).
- **Verification:**
  - `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "select count(cv.help_desc) from entities e join command_versions cv on cv.entity_id=e.id where e.project='mvdsv' and e.type='command';"`
    -- PASS condition: returns exactly `28` (pre-fix baseline was `0`).
  - `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "select e.project, count(cv.help_desc) from entities e join command_versions cv on cv.entity_id=e.id where e.type='command' and e.project in ('ezquake','fte','qwcl') group by e.project order by e.project;"`
    run BEFORE and AFTER the change -- PASS condition: the three
    non-MVDSV counts are byte-identical before and after (the `??`
    fallback only fires where `desc` is nullish AND `ast.description`
    is set; only MVDSV's extractor emits the latter -- this proves no
    cross-project regression).
  - `cd apps/qw-oracle && bunx tsc --noEmit` -- PASS condition: exit 0,
    no errors.
  - FAIL condition: count != 28, OR any non-MVDSV count changed, OR tsc
    errors.
- **Execution mode:** `subagent (Sonnet medium)` -- clear spec, 2 files,
  code synthesis + typecheck + idempotent reload + cross-project
  regression assertion. Not inline: a loader/type edit with a reload and
  a regression gate is not inline-shaped (`feedback_no_subagents_for_mechanical_edits`,
  sharpened: code-with-logic is subagent-default).

### Task 2 -- C3 contemporaneity assessment + runtime-dead suspect-pool diff

- **Goal:** produce the C3 suspect pool -- names registered in the L1
  KTX+MVDSV source set but absent from the running-build dump -- as a
  provenance-stamped file carrying a mandatory pinning caveat. A
  suspect pool, never a verdict (C3). Detect + stamp + route only; do
  NOT classify genuine-dead vs build-excluded (that needs the libclang
  call-graph -- the parked arc, F-C3b).
- **Files:** `scripts/extractors/mvdsv/c3-liveness-diff.sh` (created);
  `phase-0-artifacts/c3-suspect-pool.md` (created).
- **Steps:**
  - [ ] **Contemporaneity assessment FIRST (F-C3a -- this is a task,
        not a checkbox).** Record into the suspect-pool header: L1
        extract commits (ktx `da73e06` 2026-03-03; mvdsv `f816d28`
        2026-01-04); dump build 2026-04-11; the explicit note that
        MVDSV `1.20-dev` is identical at both points and is NOT a
        contemporaneity signal; the conclusion "L1 extract materially
        predates the dump build (mvdsv ~3mo, ktx ~5wk); version-drift
        false suspects are possible and are caught at the D7 human
        glance in Phase 3/4 (C3: suspect-pool-never-verdict,
        date-proximate sufficient for this arc's rigor bar)." If the
        operator chose a Task 3 recovery direction, reflect it here.
  - [ ] Write `c3-liveness-diff.sh`. LIFT the awk dump-parser from
        `diff-runtime.sh` verbatim (it correctly decodes the `%c %s %s`
        flag column, CRLF, header/footer). CHANGE three things, with a
        WHY comment on each: (a) DB side queries Postgres via
        `docker exec qw-oracle-postgres-dev psql` (P1: SQLite is dead;
        diff-runtime.sh's `sqlite3 data/knowledge.db` is the stale
        pre-migration path), source-backing signal = `*_versions.source_file
        IS NOT NULL` (per `reference_qw_oracle_transition_log_artifact`:
        verify source-backing via the version row, not `source_state`/
        the transition log); (b) scope = union of ktx AND mvdsv,
        cvars AND commands, reported in four per-(engine,type) sections
        (Phase 3 consumes the KTX slice, Phase 4 the MVDSV slice); (c)
        discount set = `^__k_ls` only (the 181 runtime-generated
        leaderboard cvars), NOT `ktx-progs-prefixes.txt` (that file
        strips legitimate KTX `k_*` -- wrong for C3, which wants those
        IN). CRLF-normalize, case-fold BOTH sides, `LC_ALL=C sort`.
  - [ ] Run it; write `c3-suspect-pool.md`: the caveat header, then per
        (engine,type) the suspect names (L1-present, dump-absent) and a
        count, plus the inverse (dump-present, L1-absent) as a separate
        "membership-drift / newer-than-extract" list (informational --
        NOT suspects, this is the version-drift surface F-C3a predicts).
  - [ ] Sanity-check the counts in-file: suspect count per engine is
        > 0 and well below the L1 denominator (a near-total suspect
        list means the diff or the cleaning is broken, not that the
        engine is dead); `__k_ls*` appears in neither output list.
- **Verification:**
  - `test -f docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/c3-suspect-pool.md && head -30 ...c3-suspect-pool.md`
    -- PASS condition: file exists; header names both extract commits +
    the 2026-04-11 dump build + the version-string-false-friend note +
    the date-proximate disposition.
  - `grep -c '__k_ls' ...c3-suspect-pool.md` -- PASS condition: `0`
    (the discount set never appears as a suspect).
  - `bash apps/qw-oracle/scripts/extractors/mvdsv/c3-liveness-diff.sh`
    re-run -- PASS condition: identical output (deterministic; sorted).
  - FAIL condition: file missing, OR caveat header absent/incomplete,
    OR `__k_ls*` present in a suspect list, OR a suspect list is
    empty or ~= the full L1 set (cleaning/diff broken).
- **Execution mode:** `subagent (Sonnet medium)` -- data-processing
  script lifting a proven parser with three well-specified changes plus
  a provenance-stamped artifact. Clear spec; subagent-default for code.

### Task 3 -- Conditional F-C3a recovery (operator-gated)

- **Goal:** if the operator elects a recovery direction (see "Open
  questions" OQ-1), execute it; otherwise the suspect pool ships with
  the Task 2 caveat and Phase 0 is NOT blocked (C3 explicitly blesses
  proceeding -- the pool is never a verdict; every suspect gets a D7
  human glance with source in hand in Phase 3/4).
- **Files:** depends on the chosen direction (see steps); at minimum
  `phase-0-artifacts/c3-suspect-pool.md` (caveat header updated).
- **Steps:**
  - [ ] Read OQ-1's operator decision. If "proceed with caveat"
        (default): no action beyond confirming the Task 2 header states
        it; mark Task 3 n/a-by-decision and STOP this task.
  - [ ] If "re-extract forward" (recommended enhancement): the
        operator allows a research-clone fetch to the
        2026-04-11-contemporaneous commit (mvdsv ~1.20-dev @ Apr 11,
        ktx ~1.47-dev @ Apr 11). Fetch, re-extract + reload L1 for the
        affected engine(s) through the idempotent pipeline (P3/C4 --
        re-run the pipeline, never SQL-patch), re-run Task 2's diff,
        regenerate `c3-suspect-pool.md`. Verify the post-reload L1
        denominators did not collapse (the >50% drop-guard is
        load-bearing -- do not `--force` past it without a logged
        reason).
  - [ ] If "fresh dump at extract commit" (C3's literal text): this is
        an OPERATOR-SIDE action (build + run the engine at `da73e06`/
        `f816d28`, capture a new cvarlist/cmdlist). The subagent cannot
        do this. Record the dependency, halt Task 3, surface to the
        operator. (Noted in OQ-1 as the least-attractive direction:
        it pins to the STALER Jan4/Mar3 baseline and is out of the
        agentic loop -- surfaced, not silently overridden.)
- **Verification:**
  - PASS condition (default branch): `c3-suspect-pool.md` header
    explicitly records "drift accepted; C3 date-proximate disposition;
    every suspect carries version-drift-possible, resolved at the D7
    glance" -- and Task 2's PASS held.
  - PASS condition (re-extract branch):
    `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "select project, commit_sha, tag_date from versions where project in ('ktx','mvdsv') and version='head';"`
    shows the new contemporaneous commit(s); L1 denominators within
    50% of the pre-reload baseline; the regenerated suspect pool
    re-ran clean.
  - FAIL condition: a recovery was elected but the artifact state does
    not reflect it, OR the re-extract collapsed the denominator.
- **Execution mode:** `subagent (Sonnet medium)` for the assessment +
  the default/re-extract branches; the fresh-dump branch is
  operator-side and the subagent only records the dependency and halts.

### Task 4 -- ezquake.com SHAPE quantification (sizes Phase 4)

- **Goal:** fetch ezquake.com/docs/settings/server.html, cross-match
  cvar names against the live MVDSV M=183 roster, and characterize the
  SHAPE of the overlap (easy common `sv_*` vs the hard
  dedicated-server-only tail) so Phase 4's boundary and context budget
  are sized against evidence. NOT a headline count: do NOT emit a
  `124/183` style metric into any reusable artifact (F-D12a -- the
  fabricated-metric trap the grounding doc explicitly flagged; the only
  verified MVDSV-cvar floor on record is nQuake 63/183).
- **Files:** `phase-0-artifacts/ezquake-com-shape.md` (created).
- **Steps:**
  - [ ] Fetch `https://r.jina.ai/https://ezquake.com/docs/settings/server.html`
        (Jina reader -- the site is JS-rendered; plain WebFetch fails,
        per `feedback_jina_reader`). Extract the cvar name list + each
        entry's type/default/prose if present.
  - [ ] Pull the live MVDSV cvar roster:
        `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "select name from entities where project='mvdsv' and type='cvar' order by name;"`
        (M=183, verified).
  - [ ] Cross-match by name (case-fold). Bucket into: (A) present on
        ezquake.com AND in MVDSV L1 -- the easy common `sv_*` core;
        (B) in MVDSV L1, absent from ezquake.com -- split by the
        dedicated-server-only families the spec names (qtv / demo /
        master / server-antilag) vs other; (C) on ezquake.com, absent
        from MVDSV L1 (client-server-shared or stale-on-the-page).
        Write the bucketed NAME LISTS, not ratios.
  - [ ] Record ezquake.com as a `shipped_doc`-class source (D11): the
        artifact URI goes in a provenance line in the report; do NOT
        mint a new origin tag for a hosted-vs-repo distinction (D2
        vocabulary discipline).
  - [ ] Write the Phase 4 sizing call in prose: "bucket A is
        mechanical-light for Phase 4; bucket B is the synthesis-heavy
        tail that routes to D6 / the C1 residue track." No `N/183`.
- **Verification:**
  - `test -f ...phase-0-artifacts/ezquake-com-shape.md` -- PASS
    condition: exists, contains the three bucket name-lists and the
    `shipped_doc` provenance URI line.
  - `grep -nE '\b[0-9]{2,3}\s*/\s*183\b' ...ezquake-com-shape.md`
    -- PASS condition: NO match (F-D12a: no fabricated headline
    metric). A bucket SIZE stated as "list of N names" is fine; a
    `124/183`-shaped ratio is the failure.
  - FAIL condition: file missing, OR a `*/183` ratio present, OR a new
    origin tag invented for ezquake.com.
- **Execution mode:** `subagent (Sonnet medium)` -- fetch + parse +
  bounded 183-name cross-match + shape classification with explicit
  bucket criteria. If the executor finds the dedicated-tail boundary
  genuinely ambiguous it may escalate to Sonnet MAX, but the spec'd
  buckets make medium the right floor.

## Verification (phase boundary)

Copy-paste; YES/NO. Operator runs these at the Phase 0 boundary.

```bash
cd /home/paradoks/projects/quakeworld

# 1. Free win: exactly 28 MVDSV command descriptions, 0 before.
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "select count(cv.help_desc) from entities e join command_versions cv on cv.entity_id=e.id where e.project='mvdsv' and e.type='command';"
# PASS: 28

# 2. No cross-project regression on the shared loader.
docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
 "select e.project, count(cv.help_desc) from entities e join command_versions cv on cv.entity_id=e.id where e.type='command' and e.project in ('ezquake','fte','qwcl') group by e.project order by e.project;"
# PASS: identical to the pre-change capture (operator compares; the
#       fix is a nullish-fallback, only MVDSV emits ast.description)

# 3. Loader typechecks.
( cd apps/qw-oracle && bunx tsc --noEmit ) ; echo "tsc exit=$?"
# PASS: tsc exit=0

# 4. C3 suspect pool exists, caveat-headed, no __k_ls noise.
F=docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/c3-suspect-pool.md
test -f "$F" && grep -q 'da73e06' "$F" && grep -q 'f816d28' "$F" \
  && grep -q '2026-04-11' "$F" && [ "$(grep -c '__k_ls' "$F")" = 0 ] \
  && echo "C3 POOL OK" || echo "C3 POOL FAIL"
# PASS: C3 POOL OK

# 5. C3 diff is deterministic (idempotent re-run).
bash apps/qw-oracle/scripts/extractors/mvdsv/c3-liveness-diff.sh > /tmp/c3a.txt 2>&1
bash apps/qw-oracle/scripts/extractors/mvdsv/c3-liveness-diff.sh > /tmp/c3b.txt 2>&1
diff -q /tmp/c3a.txt /tmp/c3b.txt && echo "C3 DETERMINISTIC"
# PASS: C3 DETERMINISTIC

# 6. ezquake.com shape report exists, no fabricated N/183 metric.
G=docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/ezquake-com-shape.md
test -f "$G" && ! grep -qE '\b[0-9]{2,3}[[:space:]]*/[[:space:]]*183\b' "$G" \
  && echo "EZQ SHAPE OK" || echo "EZQ SHAPE FAIL"
# PASS: EZQ SHAPE OK

# 7. phase-0-results.md summary exists for the Phase 1/3/4 drafters.
test -f docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/phase-0-results.md \
  && echo "RESULTS OK"
# PASS: RESULTS OK
```

If all PASS, operator proceeds (Phase 0 unblocks Phase 3/4 synthesis and
delivers the Phase 4 sizing input; it never gated Phase 1/2). If any
FAIL, consult Recovery.

## Outputs to next phase

State true at the boundary that was not before:

- **MVDSV command `help_desc`**: 28/108 now populated from the AST
  (was 0). `load-commands.ts` + `types.ts` committed on `main`.
  Consumed by Phase 4 (the MVDSV command synthesis tail is now 80, not
  108 -- it shrank by the free win).
- **C3 suspect pool**:
  `phase-0-artifacts/c3-suspect-pool.md`, per (engine,type) sections +
  the mandatory pinning caveat. Hard prerequisite input to Phase 3
  (KTX synthesis -- the KTX slice) and Phase 4 (MVDSV synthesis -- the
  MVDSV slice): a suspect knob gets the D6 truthful dead-stamp and
  routes to the C1 outreach track, never a confident description.
- **ezquake.com shape**:
  `phase-0-artifacts/ezquake-com-shape.md`, bucketed name lists +
  `shipped_doc` provenance URI. Sizes the Phase 4 boundary + context
  budget (bucket A mechanical-light vs bucket B synthesis-heavy);
  resolves the README's "Phase 4 ctx 200-400k uncertain until P0".
- **F-C3a disposition**: recorded in `phase-0-results.md` and the
  suspect-pool header (default: proceed-with-caveat; or the operator's
  elected recovery).
- Runnable state: every artifact re-derives by re-running the
  committed scripts; the DB delta is idempotent (P3).

## Open questions / deferred items

- **OQ-1 -- F-C3a recovery direction (operator).**
  - **Question:** the L1 extract materially predates the dump build
    (mvdsv f816d28 2026-01-04 vs build 2026-04-11 ~3mo; ktx da73e06
    2026-03-03 ~5wk) and the local research clones are FROZEN at the
    extract commits, so a same-commit re-extract reproduces the SAME
    old baseline -- it does not close the gap. Three directions:
    (A) C3's literal recovery -- operator builds+runs the engine at the
    OLD extract commits and captures a fresh dump (exact, but
    operator-side, out of the agentic loop, and pins to the STALER
    Jan4/Mar3 baseline -- worse for describe-fill freshness);
    (B) re-extract forward -- fetch clones to the Apr-11-contemporaneous
    commit, re-extract+reload L1 (idempotent P3/C4, in-loop, needs a
    clone fetch), diff vs the existing dump (aligns to the freshest
    reachability oracle);
    (C) proceed with the mandatory caveat -- run the diff on the
    available baseline, every suspect flagged version-drift-possible
    and caught at the D7 human glance (C3 explicitly blesses this for
    this arc's rigor bar; the parked reachability arc, not this one,
    needs hash-exact pinning).
  - **Default chosen for now:** **(C) proceed with caveat** -- Phase 0
    is NOT blocked. C3's own text makes date-proximate sufficient here
    (suspect-pool-never-verdict; one extra human glance, never a
    shipped lie). **(B) is the recommended enhancement** if the
    operator wants tighter precision and permits a clone fetch.
  - **Surface, not silent compliance:** C3's literal text names (A).
    With the clones frozen at the OLD commits, (A) is the
    least-attractive direction (staler baseline, out of loop). This is
    surfaced for the operator rather than silently overriding the
    spec's wording or silently complying with a sub-optimal path
    (decisions.md preamble; drafter step 5). Not a lock contradiction
    -- C3 anticipates imperfect pinning; this is a direction choice.
  - **Who can resolve:** operator (Task 3 branches on this).

- **OQ-2 -- `entities.description_origin` / `description` / `name_fold`
  already exist (Phase 1 input, not Phase 0 scope).**
  - **Question:** the live `entities` table already carries
    `description`, `description_origin`, `name_fold`, `source_state`.
    D2/D11/F-D11a are written as if the owned user-doc track is built
    from zero in Phase 1; it partially exists.
  - **Default chosen for now:** Phase 0 does nothing with these (it
    writes none of them) and only records the fact here so the Phase 1
    drafter recons the existing columns before authoring the migration
    (build-on vs add-new is a Phase 1 decision).
  - **Who can resolve:** Phase 1 drafter (recon the existing schema;
    the C5 origin-tag-vocabulary probe must reconcile with whatever
    `description_origin` already holds).

- **Sub-agent findings vs decisions.md:** none rejected. No
  verification-sub-agent finding contradicted a lock; applied findings
  are folded into the tasks above (see the post-draft note).

## Recovery (if verification fails)

Per failure mode. **C4 discipline: re-run the corrected pipeline, never
`UPDATE` the bad rows.**

- **#1 count != 28 (e.g. 0, or > 28):** 0 -> the `??` fallback did not
  land or the reload did not run; re-check `load-commands.ts:28` and
  re-run the idempotent reload (not a SQL patch). > 28 -> either a
  non-MVDSV project also emits `ast.description` (inspect that
  extractor's AST; the type field is shared) or a duplicate-row
  idempotency bug (`feedback_idempotency_before_staleness`: suspect the
  re-run, not staleness) -- fix the loader, re-run end-to-end (C4).
- **#2 a non-MVDSV count changed:** the fallback is firing where it
  must not. Inspect that project's command AST for an
  `ast.description`; if legitimate, that is a separate improvement to
  surface to the operator (do NOT silently absorb it into this free
  win -- F-D12b scope discipline). Revert to a MVDSV-guarded mapping
  only with operator sign-off.
- **#4/#5 C3 pool missing / non-deterministic / `__k_ls*` leaked:** the
  cleaning regressed. Re-derive from `diff-runtime.sh`'s proven awk
  (do not hand-roll); confirm the discount regex is `^__k_ls` only and
  the `LC_ALL=C sort` + case-fold are on both sides. Re-run the script
  (it is the pipeline; there is nothing to SQL-patch).
- **#4 caveat header incomplete:** regenerate the header from the
  recon facts (both extract commits + the 2026-04-11 build + the
  version-string-false-friend note + the disposition). The header is
  load-bearing provenance, not decoration -- a suspect pool without it
  is a C3 violation.
- **#6 `*/183` metric present:** F-D12a breach. Strip the ratio,
  re-state the bucket as a named list, regenerate the report.
- **Unanticipated failure:** route to the operator with the failing
  probe's output. Do not lower a denominator (C1) or scope-cut a
  suspect on an importance argument to make a probe pass.
