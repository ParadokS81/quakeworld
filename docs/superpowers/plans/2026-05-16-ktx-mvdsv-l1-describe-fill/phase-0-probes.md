# Phase 0 -- Probes + the free win

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full -- C1-C5 incl. the **C3 amendment
>    2026-05-17**, P1-P5, D1-D19, the **D2 clarification 2026-05-17**).
>    Done.
> 2. Read `review-findings.md`; Phase 0 rows: **F-C3a DISSOLVED
>    2026-05-17** (kept for trail, not an active risk), F-D12a
>    (substantive), F-D12b (substantive-positive), F-C3b (boundary --
>    STILL STANDS). Done.
> 3. Recon the LIVE source before inlining anything. Done -- see "Recon
>    facts". This revision is driven by recon that contradicts a lock's
>    factual premise (KTX build); surfaced in OQ-3, not silently
>    complied with.
> 4. After drafting, dispatch the verification sub-agent. Done; findings
>    applied.

> **REVISION 2026-05-17.** The C3 mechanism changed by operator decision
> at the Phase 0 review (spec C3 amendment 2026-05-17 + decisions.md C3
> amendment; F-C3a DISSOLVED). Task 1 (load-commands free win) and the
> ezquake.com shape probe are unchanged. The old "clean the frozen
> qw-1.log + diff it" Task 2/3 are replaced by a self-built reproducible
> C3 oracle (build forward, self-dump, re-extract forward -- source +
> oracle + substrate are ONE build, contemporaneity dissolved by
> construction). The retained 2026-04-27 production dump becomes a
> secondary cross-check only.

## Goal

Phase 0 runs the free win plus the two cheap probes that size Phase 4
and gate the KTX/MVDSV synthesis phases. Task 1 flips the verified
`load-commands.ts` description mapping so 28/108 MVDSV commands stop
loading NULL (no re-extract; idempotent reload). Task 2 builds the
**self-generated reproducible C3 oracle**: fetch the dev-head ktx+mvdsv
clones forward, build both (CMake C -- both engines; see Recon facts /
OQ-3), stand up a local `mvdsv +gamedir ktx` server, capture a fresh
same-build `cvarlist`/`cmdlist`, re-extract L1 from that same commit,
then take a trivial per-(engine,type) set difference -- source extract,
runtime oracle, and describe-fill substrate are ONE build, so
contemporaneity is structural (no caveat, no date-proximate pinning).
Task 3 fetches ezquake.com/docs/settings/server.html and measures the
SHAPE of its overlap with the MVDSV cvar roster so Phase 4 is sized
against evidence, never the fabricated `124` figure. Phase 0 SIZES
Phase 4 and re-baselines the probe-0 denominators from the fresher
source (correct by C1); it is a hard prerequisite for Phase 3/4
synthesis; it does NOT gate Phase 1 or Phase 2 (KTX mechanical extract
is liveness-agnostic). The arc is never blocked: a documented fallback
(Recovery) reverts to fetch-forward-source + the retained production
dump under the original date-proximate caveat if the local build or
server harness is intractable in-loop. **Runnable, verifiable state at
the boundary:** 28 MVDSV commands carry `help_desc` (was 0); a fresh
dated same-build runtime fixture + the same-commit re-extract exist with
the build commit recorded as provenance; the C3 suspect pool exists
per-engine with no contemporaneity caveat; the ezquake.com shape report
exists with bucketed name lists and no `N/183` headline metric; every
artifact re-derives by re-running the committed scripts.

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

- DB up: `qw-oracle-postgres-dev` healthy. Pre-re-extract denominators
  (`entities`): ktx cvar 260 / command 358 / info_key 7; mvdsv cvar 183
  / command 108 / cmdline_param 11. These are the C1 exhaustive
  denominators TODAY; Task 2 re-derives them from the fresher source
  (they re-baseline -- correct by C1, recorded old-vs-new).
- Loaded L1 extract is dev-head at stale commits: ktx `da73e06`
  (2026-03-03), mvdsv `f816d28` (2026-01-04). Both research clones are
  `origin https://github.com/QW-Group/{ktx,mvdsv}.git`, **NOT shallow**
  (`is-shallow-repository: false`) -- `git fetch origin` + checkout
  advances them to current dev-head (they were frozen only because
  un-fetched, not by shallow depth). The contemporaneity GAP framing is
  retired: F-C3a is DISSOLVED 2026-05-17 because Phase 0 now
  self-generates the oracle from one forward build.
- **Build toolchain (the real, recon-verified feasibility gate):**
  `gcc` 13.3.0, `make` 4.3, `git` 2.43, `bun` 1.3.11, `python3` 3.12.3
  are present. **`cmake` is MISSING** (and `ninja` MISSING). Both KTX
  and MVDSV build via CMake (`build_cmake.sh` + `CMakeLists.txt`;
  MVDSV README "Prerequisites: None at the moment"; KTX README
  "essential build tools and CMake" -> `cmake -B build . && cmake
  --build build`). cmake is the concrete prerequisite -- it is
  installable (`apt install cmake`), an operator/Task-0-shaped step the
  agentic loop may not have rights for; the fallback covers
  intractability.
- **KTX is C, not QuakeC (contradicts the C3-amendment wording -- see
  OQ-3).** `research/repos/ktx/src` = **108 `.c`, 0 `.qc`**, no
  `qwprogs.dat`, no `progs.src`. `CMakeLists.txt:4` = `project(qwprogs
  C)`; the Linux artifact is **`qwprogs.so`**. The KTX L1 extractor's
  own docstring: KTX is "a QC-replacement game module hosted by MVDSV"
  (libclang over `src/*.c`, mirrors the MVDSV driver). Canonical KTX
  does NOT use fteqcc and does NOT emit `qwprogs.dat`; that wording
  describes the separate, out-of-scope `dusty-ktx` QuakeC fork (F-D10c).
  fteqcc is NOT on the system and is NOT needed. Net effect: the
  operator's named "main feasibility unknown" (fteqcc) evaporates;
  Phase 0's build path is MORE feasible (two homogeneous CMake C
  builds), gated only by `cmake` presence + the server/rcon harness.
- Re-extract is the existing idempotent pipeline (P3/C4):
  `load-knowledge -- extract-tag` is atomic ("`git checkout <tag>` +
  run extractors + load every type for the project"); or
  `python3 scripts/extractors/{ktx,mvdsv}/extract.py` then
  `load-knowledge -- load-version` per type. The >50%-entity-drop guard
  lives in `load-version` (aborts without `--force`; load-bearing, do
  not bypass). F1 verify: `load-knowledge -- quality-grid --project
  <p>`. NOTE: DEVELOPMENT.md shows `npm run load-knowledge` but
  apps/qw-oracle/CLAUDE.md pins Bun and forbids npm -- the executor
  recons the exact runner from `package.json` + DEVELOPMENT.md; do not
  hard-code npm-vs-bun blind.
- Runtime-dump capture recipe is already documented in
  `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/README.md`
  ("How to refresh the dump": `rcon <pw> log_file 1` ->
  `cvarlist` -> `cmdlist` -> `log_file 0` -> fetch
  `<gamedir>/qconsole.log`; filename pattern
  `<server>-<engine-version>-YYYY-MM-DD.log`). One
  `mvdsv +gamedir ktx` server enumerates BOTH engines' registrations
  (KTX `k_*` register into MVDSV's cvar system -- verified: the
  retained dump carries `k_motd1` / `qwm_*` alongside MVDSV engine
  cvars).
- The proven dump-parser is `scripts/extractors/mvdsv/diff-runtime.sh`'s
  awk (decodes the `%c %s %s` SERVERINFO flag column, CRLF,
  header/footer, lowercase, `sort -u`). The fresh fixture has the
  identical shape (same rcon recipe), so Task 2 LIFTS that parser; what
  changes vs the original tool: Postgres DB side at the SAME fresh
  commit, union(ktx,mvdsv) scope, `^__k_ls` discount only (NOT
  `ktx-progs-prefixes.txt`, which would wrongly strip legitimate KTX
  `k_*`), provenance-stamped file output, no contemporaneity caveat.
- `entities` already has `description`, `description_origin`,
  `name_fold`, `source_state` (D2 clarification 2026-05-17 routed this
  from the old OQ-2; see OQ-2). Phase 0 writes NONE of them. Phase 0
  touches no schema and introduces no new DB data shape. **Therefore
  Phase 0 owes no C5 F1 quality-grid probe:** C5 binds the phase that
  first writes a new shape; the free-win write targets the existing
  `command_versions.help_desc` column (already under F1), and the C3 /
  ezquake.com outputs are markdown artifacts, not DB shapes.

## Inputs from previous phase

Phase 0 has no previous phase. Inputs are the checked items in
`prerequisites.md` (verified 2026-05-17) PLUS one new build prerequisite
this revision surfaces:

- Postgres dev container up; L1 ktx+mvdsv extracts loaded (stale
  dev-head; Task 2 re-extracts forward).
- `apps/qw-oracle/.env` has `DATABASE_URL`.
- Research repos present (ktx + mvdsv clones; non-shallow, fetchable).
- The retained 2026-04-27 production dump present at the
  validation-fixtures path (now the SECONDARY cross-check, not the
  primary oracle).
- **NEW: `cmake` available** (build prerequisite for Task 2's local
  builds). MISSING today; operator installs (`apt install cmake`) or
  the Task 2 fallback fires. Surfaced in Recovery + OQ-3.

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/<server>-devhead-YYYY-MM-DD.log
    # the fresh self-built same-build cvarlist/cmdlist dump; dated
    # filename per the validation-fixtures README pattern; committed
    # alongside (NOT replacing) ciscon-1.20-dev-2026-04-27.log.
apps/qw-oracle/scripts/extractors/mvdsv/c3-liveness-diff.sh
    # bash; lifts diff-runtime.sh's proven awk dump-parser; Postgres DB
    # side at the SAME fresh commit; union(ktx,mvdsv) scope; ^__k_ls
    # discount; provenance-stamped file output; NO contemporaneity
    # caveat (structural now). Sibling to diff-runtime.sh + the fixture.
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/c3-suspect-pool.md
    # the C3 suspect pool; build-provenance header (exact fetched
    # commit; "source+oracle+substrate are one build"); per-engine
    # sections; consumed by Phase 3 (KTX) + Phase 4 (MVDSV).
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/ezquake-com-shape.md
    # ezquake.com vs MVDSV roster SHAPE report (bucketed name lists; no
    # N/183 headline metric -- F-D12a); consumed by the Phase 4 MD.
docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts/phase-0-results.md
    # one-page summary the Phase 1/3/4 drafters read: free-win delta,
    # the fetched build commit(s), old-vs-new re-baselined denominators,
    # Phase 4 sizing call, fallback-fired? yes/no.
```

### Modified

```
apps/qw-oracle/scripts/load-knowledge/load-commands.ts
    # line 28: help_desc: entry.desc ?? ast?.description ?? null
    # (ast already destructured at line 20). One line. No refactor.
apps/qw-oracle/scripts/load-knowledge/types.ts
    # CommandAstBlock: add `description?: string | null;` so
    # ast?.description typechecks. One field; only MVDSV emits it today.
apps/qw-oracle/scripts/extractors/{ktx,mvdsv}  (working tree state only)
    # Task 2 git-fetch-forwards + checks out current dev-head and
    # re-extracts. The committed extractor OUTPUT json under
    # scripts/extractors/<p>/output/ regenerates (committed per the
    # extractor convention). No handler-code edit -- re-extract only.
```

### Deleted

```
n/a -- nothing deleted. diff-runtime.sh RETAINED (Chesterton's Fence:
source of the proven parser, still serves its own diagnostic). The
2026-04-27 production dump RETAINED (now the secondary cross-check, not
replaced -- operator-directed).
```

## Tasks

### Task 1 -- The free win: load 28/108 MVDSV command descriptions

- **Goal:** the 28 MVDSV commands whose harvested banner already sits in
  the AST as `ast.description` stop loading NULL `help_desc`. No
  re-extract; idempotent reload only (F-D12b). UNCHANGED by the
  2026-05-17 revision (verified correct by the prior sub-agent pass).
- **Files:** `scripts/load-knowledge/load-commands.ts`,
  `scripts/load-knowledge/types.ts`.
- **Steps:**
  - [ ] In `types.ts` `CommandAstBlock` (lines 87-94) add
        `description?: string | null;`. WHY: the MVDSV extractor emits
        `ast.description`; the type omits it, so `ast?.description`
        would not typecheck.
  - [ ] In `load-commands.ts` change line 28 from
        `help_desc: entry.desc ?? null,` to
        `help_desc: entry.desc ?? ast?.description ?? null,`. `ast` is
        already in scope (`const ast = entry.ast;`, line 20). Do NOT
        restructure the builder/adapter/extractor (F-D12b: over-scoping
        into a loader refactor is the failure mode).
  - [ ] `cd apps/qw-oracle && bunx tsc --noEmit` -- clean.
  - [ ] Reload MVDSV commands through the existing idempotent loader
        path (no re-extract; the AST JSON is unchanged). Recon the
        exact runner from `package.json` + DEVELOPMENT.md; do not
        invent a flag.
  - [ ] Re-run the loader a second time; confirm the count is still 28
        (idempotency P3 -- not 56, no duplicate-row inflation;
        `feedback_idempotency_before_staleness`).
- **Verification:**
  - `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "select count(cv.help_desc) from entities e join command_versions cv on cv.entity_id=e.id where e.project='mvdsv' and e.type='command';"`
    -- PASS: returns exactly `28` (pre-fix baseline `0`).
  - The same query for `e.project in ('ezquake','fte','qwcl')` grouped
    by project, run BEFORE and AFTER -- PASS: the three non-MVDSV
    counts are byte-identical (the `??` fallback only fires where
    `desc` is nullish AND `ast.description` is set; only MVDSV emits the
    latter).
  - `cd apps/qw-oracle && bunx tsc --noEmit` -- PASS: exit 0.
  - FAIL: count != 28, OR any non-MVDSV count changed, OR tsc errors.
- **Execution mode:** `subagent (Sonnet medium)` -- clear spec, 2
  files, code synthesis + typecheck + idempotent reload + cross-project
  regression assertion. Not inline (code-with-logic + reload + gate is
  not inline-shaped).

### Task 2 -- Self-built reproducible C3 detection oracle

- **Goal:** produce the C3 suspect pool (registered in the L1
  KTX+MVDSV source set, absent from a running build) from a
  self-generated, reproducible oracle: source extract, runtime dump,
  and describe-fill substrate are ONE forward-built commit, so
  contemporaneity is dissolved by construction (no caveat, no
  date-proximate pinning -- spec C3 amendment 2026-05-17). A suspect
  pool, never a verdict. Detect + route only; do NOT classify
  genuine-dead vs build-excluded -- a default-config local build can
  build-exclude symbols and that is exactly the classification C3
  defers to the parked libclang call-graph arc (F-C3b STILL STANDS).
- **Files:** the fresh dated fixture, `c3-liveness-diff.sh`,
  `phase-0-artifacts/c3-suspect-pool.md` (all Created); the
  `research/repos/{ktx,mvdsv}` working trees + committed extractor
  `output/` json (Modified, via re-extract).
- **Steps:**
  - [ ] **Build-prereq + recon gate FIRST.** Confirm `cmake` is
        available (Recon facts: MISSING today). If absent and not
        operator-installable in-loop, STOP and invoke the Recovery
        fallback; do NOT force a build. Recon each repo's build doc
        (`README.md` "Building binaries", `build_cmake.sh`,
        `CMakeLists.txt`). Note for the executor: KTX is C/CMake ->
        `qwprogs.so`, NOT QuakeC/fteqcc/`qwprogs.dat` (Recon facts /
        OQ-3); build it like MVDSV.
  - [ ] **Fetch forward + pin.** `git -C research/repos/ktx fetch
        origin` and checkout current dev-head; same for mvdsv. Record
        the exact resulting commit SHA + repo date for each -- this is
        the reproducible-oracle provenance, written into
        `c3-suspect-pool.md`'s header and `phase-0-results.md`.
  - [ ] **Build both (Linux-native).** mvdsv: `cmake -B build . &&
        cmake --build build` (C; "Prerequisites: None"). ktx: same
        CMake flow -> `qwprogs.so`. Capture build logs; a build failure
        is a fallback trigger, not a hard block.
  - [ ] **Stand up the local oracle + self-dump.** Run a minimal local
        `mvdsv +gamedir ktx` (built mvdsv binary; built `qwprogs.so` in
        the ktx gamedir; set an rcon password via the documented
        mechanism). Capture `cvarlist` + `cmdlist` per the
        validation-fixtures README recipe. Save as
        `<server>-devhead-YYYY-MM-DD.log` in `validation-fixtures/`
        ALONGSIDE the retained 2026-04-27 dump (do NOT replace it).
  - [ ] **Re-extract L1 forward (idempotent, P3/C4).** Re-extract +
        reload KTX and MVDSV from the SAME fetched commit through the
        existing pipeline (`extract-tag`, or `extract.py` +
        `load-version`). Confirm the >50%-drop guard did NOT trip (do
        not `--force` past it without a logged reason). Re-derive the
        probe-0 N/M denominators from the fresh DB; record old-vs-new
        in `phase-0-results.md` (they re-baseline -- correct by C1, not
        a regression).
  - [ ] **Set-difference -> suspect pool.** Write `c3-liveness-diff.sh`
        lifting `diff-runtime.sh`'s awk parser verbatim; change three
        things with a WHY comment each: (a) DB side = the fresh
        same-commit Postgres extract (`docker exec ... psql`;
        source-backing via `*_versions.source_file IS NOT NULL` per
        `reference_qw_oracle_transition_log_artifact`), (b) scope =
        union(ktx,mvdsv) x (cvar,command), four per-(engine,type)
        sections, (c) discount = `^__k_ls` only. CRLF-normalize,
        case-fold both sides, `LC_ALL=C sort`. Suspects = L1-present,
        dump-absent. Emit `c3-suspect-pool.md`: the build-provenance
        header (the fetched commits; "source+oracle+substrate = one
        build; contemporaneity structural, no caveat"), the per-engine
        suspect lists + counts, and the inverse list (dump-present /
        L1-absent) as informational membership-drift only.
  - [ ] **Secondary cross-check (do NOT resolve).** Diff the fresh pool
        against the retained 2026-04-27 production dump; note
        divergences as a C2 flag-don't-resolve appendix (real-deploy vs
        local-default-build differences are expected and informative,
        not errors to fix here).
- **Verification:**
  - `ls apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ | grep -E 'devhead-[0-9]{4}-[0-9]{2}-[0-9]{2}\.log' && test -f apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ciscon-1.20-dev-2026-04-27.log`
    -- PASS: a new dated fixture exists AND the 2026-04-27 dump is
    still present (retained, not replaced).
  - `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "select project, commit_sha, tag_date from versions where project in ('ktx','mvdsv') and version='head';"`
    -- PASS: commit_sha for both is the freshly-fetched dev-head SHA
    (NOT da73e06 / f816d28), and `c3-suspect-pool.md` records the same
    SHAs.
  - `F=docs/.../phase-0-artifacts/c3-suspect-pool.md; test -f "$F" && grep -q 'one build' "$F" && ! grep -qiE 'date-proximate|contemporan' "$F" && [ "$(grep -c '__k_ls' "$F")" = 0 ]`
    -- PASS: pool exists; build-provenance header present; NO
    contemporaneity/date-proximate caveat (it is structural now);
    `__k_ls*` never appears as a suspect.
  - `bash apps/qw-oracle/scripts/extractors/mvdsv/c3-liveness-diff.sh`
    twice -- PASS: identical output (deterministic; sorted).
  - Re-baselined denominators recorded old-vs-new in
    `phase-0-results.md`; the >50%-drop guard did not trip.
  - FALLBACK-FIRED PASS: if the build/harness was intractable, the
    fallback path (Recovery) ran instead, `phase-0-results.md` records
    "fallback fired: fetch-forward-source + retained production dump
    under date-proximate caveat", and the suspect pool carries that
    caveat explicitly. This is a PASS (arc never blocked), flagged for
    the operator.
  - FAIL: no fresh fixture AND no fallback record; OR versions still at
    the stale SHAs with no fallback; OR `__k_ls*` leaked; OR the
    re-extract collapsed a denominator >50% without a logged reason.
- **Execution mode:** `subagent (Opus medium)` -- multi-step
  integration with real, live unknowns (a missing-cmake build prereq,
  two CMake C builds, a local QW server + rcon harness, the idempotent
  re-extract pipeline, and a fallback judgment). Knowledge-breadth
  across toolchain + QW-server + extractor pipeline matters more than
  raw speed here, so Opus medium over Sonnet MAX (`feedback_model_effort_range`:
  multi-file judgment-dense -> Sonnet MAX or Opus medium; Opus medium
  when breadth dominates). Sonnet MAX is an acceptable substitute if
  Opus is unavailable. Not inline (integration with unknowns).

### Task 3 -- ezquake.com SHAPE quantification (sizes Phase 4)

- **Goal:** fetch ezquake.com/docs/settings/server.html, cross-match
  cvar names against the (re-baselined) MVDSV cvar roster, and
  characterize the SHAPE of the overlap (easy common `sv_*` vs the hard
  dedicated-server-only tail) so Phase 4's boundary + context budget
  are sized against evidence. NOT a headline count: do NOT emit a
  `124/183`-style metric into any reusable artifact (F-D12a -- the
  fabricated-metric trap; the only verified MVDSV-cvar floor on record
  is nQuake 63/183). UNCHANGED in substance by the 2026-05-17 revision;
  it now cross-matches against the Task-2 re-baselined roster.
- **Files:** `phase-0-artifacts/ezquake-com-shape.md` (created).
- **Steps:**
  - [ ] Fetch `https://r.jina.ai/https://ezquake.com/docs/settings/server.html`
        (Jina reader -- the site is JS-rendered; plain WebFetch fails,
        `feedback_jina_reader`). Extract the cvar name list + each
        entry's type/default/prose if present.
  - [ ] Pull the live MVDSV cvar roster post-Task-2 re-extract:
        `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc "select name from entities where project='mvdsv' and type='cvar' order by name;"`
        (use the re-baselined set; note its size in prose, not as a
        ratio).
  - [ ] Cross-match by name (case-fold). Bucket into: (A) on
        ezquake.com AND in MVDSV L1 -- the easy common `sv_*` core;
        (B) in MVDSV L1, absent from ezquake.com -- split the
        dedicated-server-only families the spec names (qtv / demo /
        master / server-antilag) vs other; (C) on ezquake.com, absent
        from MVDSV L1. Write the bucketed NAME LISTS, not ratios.
  - [ ] Record ezquake.com as a `shipped_doc`-class source (D11): the
        artifact URI goes in a provenance line; do NOT mint a new
        origin tag for a hosted-vs-repo distinction (D2 vocabulary
        discipline).
  - [ ] Write the Phase 4 sizing call in prose: bucket A is
        mechanical-light; bucket B is the synthesis-heavy tail routing
        to D6 / the C1 residue track. No `N/183`.
- **Verification:**
  - `test -f docs/.../phase-0-artifacts/ezquake-com-shape.md` -- PASS:
    exists; three bucket name-lists + the `shipped_doc` provenance URI.
  - `grep -nE '\b[0-9]{2,3}[[:space:]]*/[[:space:]]*[0-9]{2,3}\b' docs/.../ezquake-com-shape.md`
    -- PASS: NO `NN/NN`-shaped ratio (F-D12a). A bucket stated as "list
    of N names" is fine; a `124/183`-shaped metric is the failure.
  - FAIL: file missing, OR a `*/NNN` ratio present, OR a new origin tag
    invented for ezquake.com.
- **Execution mode:** `subagent (Sonnet medium)` -- fetch + parse +
  bounded name cross-match + shape classification with explicit bucket
  criteria. Escalate to Sonnet MAX only if the dedicated-tail boundary
  proves genuinely ambiguous.

## Verification (phase boundary)

Copy-paste; YES/NO. Operator runs at the Phase 0 boundary.

```bash
cd /home/paradoks/projects/quakeworld
PSQL='docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc'
A=docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-artifacts

# 1. Free win: exactly 28 MVDSV command descriptions (0 before).
$PSQL "select count(cv.help_desc) from entities e join command_versions cv on cv.entity_id=e.id where e.project='mvdsv' and e.type='command';"
# PASS: 28

# 2. No cross-project regression on the shared loader.
$PSQL "select e.project, count(cv.help_desc) from entities e join command_versions cv on cv.entity_id=e.id where e.type='command' and e.project in ('ezquake','fte','qwcl') group by e.project order by e.project;"
# PASS: identical to the pre-change capture

# 3. Loader typechecks.
( cd apps/qw-oracle && bunx tsc --noEmit ) ; echo "tsc exit=$?"
# PASS: tsc exit=0

# 4. Self-built oracle: fresh dated fixture exists, 2026-04-27 retained.
ls apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ | grep -qE 'devhead-[0-9]{4}-[0-9]{2}-[0-9]{2}\.log' \
 && test -f apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ciscon-1.20-dev-2026-04-27.log \
 && echo "FIXTURE OK" || echo "FIXTURE FAIL (check fallback record in phase-0-results.md)"
# PASS: FIXTURE OK  (or: fallback fired -- see check 7)

# 5. L1 re-extracted forward; suspect pool is build-pinned, caveat-free.
$PSQL "select project, commit_sha from versions where project in ('ktx','mvdsv') and version='head';"
# PASS: both SHAs are the fresh dev-head (NOT da73e06 / f816d28)
test -f "$A/c3-suspect-pool.md" && grep -q 'one build' "$A/c3-suspect-pool.md" \
 && ! grep -qiE 'date-proximate|contemporan' "$A/c3-suspect-pool.md" \
 && [ "$(grep -c '__k_ls' "$A/c3-suspect-pool.md")" = 0 ] \
 && echo "C3 POOL OK" || echo "C3 POOL FAIL"
# PASS: C3 POOL OK

# 6. C3 diff deterministic.
bash apps/qw-oracle/scripts/extractors/mvdsv/c3-liveness-diff.sh >/tmp/c3a 2>&1
bash apps/qw-oracle/scripts/extractors/mvdsv/c3-liveness-diff.sh >/tmp/c3b 2>&1
diff -q /tmp/c3a /tmp/c3b && echo "C3 DETERMINISTIC"
# PASS: C3 DETERMINISTIC

# 7. Results summary exists (free-win delta; build commits; old-vs-new
#    denominators; Phase 4 sizing; fallback-fired yes/no).
test -f "$A/phase-0-results.md" && echo "RESULTS OK"
# PASS: RESULTS OK

# 8. ezquake.com shape report exists, no fabricated NN/NN metric.
test -f "$A/ezquake-com-shape.md" \
 && ! grep -qE '\b[0-9]{2,3}[[:space:]]*/[[:space:]]*[0-9]{2,3}\b' "$A/ezquake-com-shape.md" \
 && echo "EZQ SHAPE OK" || echo "EZQ SHAPE FAIL"
# PASS: EZQ SHAPE OK
```

If all PASS (including the documented fallback path as a valid PASS for
checks 4-6, flagged for the operator), Phase 0 unblocks Phase 3/4 and
delivers the Phase 4 sizing input; it never gated Phase 1/2. Any FAIL ->
Recovery.

## Outputs to next phase

- **MVDSV command `help_desc`:** 28/108 populated from the AST (was 0).
  `load-commands.ts` + `types.ts` committed on `main`. The MVDSV
  command synthesis tail shrinks to 80 (Phase 4).
- **Fresh same-build runtime fixture + same-commit L1 re-extract:**
  dated fixture in `validation-fixtures/`; `versions` rows at the
  fetched dev-head SHA; the build commit recorded as reproducible-oracle
  provenance in `c3-suspect-pool.md` + `phase-0-results.md`. The
  retained 2026-04-27 dump remains as the secondary real-deploy
  cross-check.
- **Re-baselined probe-0 denominators:** recorded old-vs-new in
  `phase-0-results.md` (correct by C1). Phase 1/2/3/4 recon against the
  POST-re-extract baseline, not the stale numbers.
- **C3 suspect pool:** `phase-0-artifacts/c3-suspect-pool.md`,
  per-(engine,type), build-pinned, NO contemporaneity caveat. Hard
  prerequisite for Phase 3 (KTX slice) + Phase 4 (MVDSV slice): a
  suspect knob gets the D6 truthful dead-stamp + routes to the C1
  outreach track; classification stays the parked arc (F-C3b).
- **ezquake.com shape:** `phase-0-artifacts/ezquake-com-shape.md`,
  bucketed name lists + `shipped_doc` provenance URI. Sizes the Phase 4
  boundary + context budget; resolves the README's "Phase 4 ctx
  200-400k uncertain until P0".
- Runnable state: every artifact re-derives by re-running the committed
  scripts at the recorded commit; the DB delta is idempotent (P3).

## Open questions / deferred items

- **OQ-1 -- F-C3a contemporaneity recovery direction. RESOLVED
  2026-05-17.** The earlier draft surfaced a three-way choice
  (proceed-with-caveat / re-extract-forward / fresh-dump-at-old-commit)
  because the L1 extract materially predated the dump. The operator
  resolved this at the Phase 0 review by changing the C3 mechanism
  itself: the oracle is now self-generated from one forward build, so
  contemporaneity is structural and **F-C3a is DISSOLVED**. Trail kept.
  Authoritative: spec C3 amendment 2026-05-17 + `decisions.md` C3
  amendment + `review-findings.md` F-C3a (DISSOLVED). No operator action
  needed; Task 2 implements the resolution.

- **OQ-2 -- pre-existing `entities` origin/description columns. STILL
  STANDS (Phase 1-owned; now authoritatively routed).**
  - **Question:** `entities.description_origin` / `description` /
    `name_fold` ALREADY EXIST; `description_origin` already carries
    `{help_json, source_inline, synthesized}`. Phase 1's migration must
    EXTEND (add `shipped_doc` + the anchor/re-review/retained-provenance/
    verdict-trail fields), NOT create from zero; the C5 origin-tag
    probe must permit the full four-set
    `{help_json, source_inline, synthesized, shipped_doc}`.
  - **Default chosen for now:** Phase 0 does nothing with these (writes
    none). The fact is now locked authoritatively in `decisions.md`
    **D2 clarification 2026-05-17** ("Routed from Phase 0 OQ-2").
  - **Who can resolve:** Phase 1 drafter/executor (build the migration
    as an EXTEND; the C5 probe as the four-set). Carried forward, not
    Phase-0-closeable -- hence "still stands".

- **OQ-3 -- the C3-amendment's "KTX = QuakeC via fteqcc ->
  `qwprogs.dat`" wording is factually wrong; surface for amendment.**
  - **Question:** spec C3 amendment 2026-05-17 + `decisions.md` C3
    amendment + the drafter-prompt REVISION all say Phase 0 builds
    "ktx (QuakeC via fteqcc -> `qwprogs.dat`)". Recon-verified live:
    canonical KTX is **C** (`research/repos/ktx/src` = 108 `.c`, 0
    `.qc`; `CMakeLists.txt:4` `project(qwprogs C)`; artifact
    `qwprogs.so`; the KTX L1 extractor docstring calls it "a
    QC-replacement game module"). fteqcc is neither present nor needed;
    that wording describes the separate out-of-scope `dusty-ktx`
    QuakeC fork (F-D10c). This is a lock whose factual premise is
    wrong, not a planning disagreement.
  - **Default chosen for now:** Task 2 is drafted against verified
    truth -- KTX built via CMake C -> `qwprogs.so` exactly like MVDSV.
    The "main feasibility unknown (fteqcc)" the operator flagged
    DISSOLVES; the real, smaller gate is `cmake` being absent
    (installable) + the local server/rcon harness. Surfaced here, NOT
    silently complied with (would send the executor hunting a
    nonexistent fteqcc/`.dat`) and NOT silently overridden
    (`decisions.md` preamble; drafter step 5).
  - **Who can resolve:** operator -- recommend amending the spec C3
    amendment + `decisions.md` C3 amendment + the drafter prompt to
    read "ktx (C via CMake -> `qwprogs.so`)" and re-scope the
    feasibility unknown to "cmake availability + local server harness".
    Non-blocking: Phase 0 executes correctly against the verified-truth
    draft regardless of when the wording is fixed.

- **Sub-agent findings vs decisions.md:** none rejected. The KTX-build
  finding (OQ-3) contradicts the lock's *factual premise*, not its
  *intent* (a reproducible same-build oracle); it is surfaced for
  amendment, and the draft follows verified source truth, exactly as
  the decisions.md preamble and drafter step 5 require.

## Recovery (if verification fails)

Per failure mode. **C4 discipline: re-run the corrected pipeline, never
`UPDATE` the bad rows.**

- **THE documented fallback (build/harness intractable in-loop).** If
  `cmake` cannot be installed in-loop, or a CMake build fails, or the
  local `mvdsv +gamedir ktx` + rcon harness cannot be stood up: do NOT
  force it. Fall back to **fetch-forward-source + the retained
  2026-04-27 production dump under the original date-proximate caveat**
  (the now-dissolved approach becomes the safety net -- spec C3
  amendment). Still re-extract L1 forward (source-only, no local
  binary) so the source side is fresh; the suspect pool then carries an
  explicit "date-proximate caveat -- fallback path; production dump is
  an Apr-11 build vs the fetched source commit; version-drift suspects
  caught at the D7 glance". Record "fallback fired" in
  `phase-0-results.md`. The arc is NEVER blocked. Flag to the operator.
- **#1 count != 28:** 0 -> the `??` fallback or reload did not land;
  re-check `load-commands.ts:28`, re-run the idempotent reload (not a
  SQL patch). > 28 -> a non-MVDSV extractor also emits `ast.description`
  (inspect that extractor) or a duplicate-row idempotency bug
  (`feedback_idempotency_before_staleness`); fix the loader, re-run
  end-to-end (C4).
- **#2 a non-MVDSV count changed:** the fallback is firing where it must
  not. Inspect that project's command AST; if legitimately
  description-bearing, surface to the operator as a separate
  improvement -- do NOT silently absorb it into this free win (F-D12b
  scope discipline).
- **#5 versions still at stale SHAs / >50% denominator collapse:** the
  fetch-forward or re-extract did not run, or the drop-guard tripped.
  Do NOT `--force` past the guard without a logged reason (it is
  load-bearing). Re-run `extract-tag` at the recorded commit; if the
  drop is real (upstream removed entities), record old-vs-new in
  `phase-0-results.md` -- a true re-baseline is correct by C1, not a
  failure.
- **#5 caveat leaked into the build-pinned pool:** the pool wrongly
  carries a contemporaneity/date-proximate caveat though the build path
  succeeded. Regenerate the header from the build-provenance facts
  (one-build => structural, no caveat). A spurious caveat misleads the
  Phase 3/4 D7 reviewer.
- **#6 C3 non-deterministic / `__k_ls*` leaked:** cleaning regressed;
  re-derive from `diff-runtime.sh`'s proven awk, confirm the discount
  is `^__k_ls` only and case-fold + `LC_ALL=C sort` on both sides.
- **#8 `NN/NN` metric present:** F-D12a breach; strip the ratio,
  re-state as a named list, regenerate.
- **Unanticipated failure:** route to the operator with the failing
  probe's output. Do not lower a denominator (C1) or scope-cut a
  suspect on an importance argument to make a probe pass.
