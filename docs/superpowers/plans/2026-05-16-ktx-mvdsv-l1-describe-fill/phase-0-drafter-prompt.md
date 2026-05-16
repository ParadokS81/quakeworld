> **REVISION 2026-05-17 -- C3 mechanism changed; this supersedes every "clean
> the frozen qw-1.log and diff it" instruction below.** Operator decision at
> the Phase 0 review: the loaded L1 extract is stale dev-head (mvdsv
> 2026-01-04, ktx 2026-03-03) and QW servers run dev-head not tagged
> releases, so C3's detection oracle is now **self-generated and
> reproducible**: Phase 0 fetches the dev-head clones forward, builds mvdsv
> (C) + ktx (QuakeC via fteqcc), runs a local `mvdsv +gamedir ktx` server to
> capture a fresh `cvarlist`/`cmdlist` dump of that exact build, and
> re-extracts L1 from the same commit -- source + oracle + substrate are ONE
> build, contemporaneity dissolved (no caveat). **F-C3a is DISSOLVED**;
> **F-C3b still stands** (detect only, do not classify). Authoritative
> mechanism, fallback, and rationale: the spec C3 amendment 2026-05-17 +
> `decisions.md` C3 amendment (read them; they win over any stale wording in
> this prompt). The 2026-04-27 production dump is retained as a SECONDARY
> cross-check only. If you are revising an already-drafted `phase-0-probes.md`:
> Task 1 (load-commands free win) is unchanged; Task 2/3 are substantively
> rewritten per this; re-read the amended decisions.md / spec / review-findings
> first.

You are drafting **Phase 0 -- Probes + the free win** of the **2026-05-16
KTX / MVDSV Layer-1 describe-fill** arc.

Phase 0 runs: (1) the verified one-line `load-commands.ts` fix that frees
28/108 MVDSV commands (F-D12b, first task, free win); (2) the **self-built
C3 detection oracle** -- fetch dev-head clones forward, build mvdsv + ktx,
run a local server to capture a fresh same-build `cvarlist`/`cmdlist` dump,
re-extract L1 from that commit, then a trivial same-build set-difference
yields the C3 suspect pool (no contemporaneity caveat -- it is structural);
(3) ezquake.com-vs-MVDSV shape-quantification (D12/F-D12a). Phase 0 SIZES
Phase 4 and re-baselines the probe-0 denominators from the fresher source
(correct by C1); it does NOT gate the KTX side (Phase 2 is
liveness-agnostic). Carry the documented fallback: if the local fteqcc/KTX
build or the server harness is intractable in-loop, fall back to
fetch-forward-source + the retained production dump under the original
date-proximate caveat -- the arc is never blocked.

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything -- no probes, no loader fix, no diff runs. The phase MD
you write becomes input to a separate execution session later.

Working directory: `/home/paradoks/projects/quakeworld`

## You are in the RIGHT arc only if this holds

This arc fills provenance-stamped descriptions onto KTX/MVDSV configurable
entities that ALREADY exist in L1. STOP and tell the operator if your phase
goal looks like any of these (wrong arc):

- "Postgres port / RRF / Voyage pipeline / Layer 2 Discord / snapshot delta"
  -> qw-oracle Arc 1 (`2026-05-02-qw-oracle-arc1`), the exemplar. Wrong arc.
- "Write game_mode concept-note bodies / mode narrative" -> the 2026-05-09
  game-mode L3 arc (sequenced AFTER this; D1 carves it out). Wrong arc.
- "Build the libclang call-graph / classify genuine-dead vs build-excluded"
  -> the parked reachability arc. Phase 0 only DETECTS a suspect pool (C3);
  it does NOT classify. Wrong scope.
- "Re-author probe-0..5 / gap-findings / coverage.ndjson" -> the 2026-05-15
  doc-landscape investigation, the GROUNDING INPUT you consume, already
  complete. You do not re-author it.

If your goal is the three Phase 0 probes above, proceed.

## Required reading (read all before drafting; do not skip)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md`
   -- phase index, the locked slicing analysis, non-goals.
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   -- C1-C5, P1-P5, D1-D19. LOCKED. Especially C3 (presence != liveness;
   suspect pool, never a verdict; date-proximate pinning sufficient), D12
   (the Phase 0 bundle), C1 (exhaustive denominator). You turn these into a
   plan; you do not re-open them. A genuine conflict is surfaced for
   amendment, never silently overridden, never silently complied with.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/review-findings.md`
   -- the rows that touch Phase 0: **F-C3a** (the dump must be
   contemporaneous with the L1 extract -- a Phase 0 task, not just a prereq),
   **F-D12a** (the ezquake.com "124" figure is NOT a real metric until you
   quantify it -- do not treat it as real), **F-D12b** (the load-commands fix
   is a verified free win, one line, NO re-extract -- do not over-scope it),
   **F-C3b** (reachability classification is the parked arc -- detect + stamp
   + route only; do NOT classify).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-template.md`
   -- the MANDATORY shape. Follow section order and the Execution-mode
   annotation rule exactly.
5. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- the source of truth for the why. Read C3 (lines ~52-97) and D12
   (lines ~542-576) closely.
6. The grounding evidence (consume, do not re-derive):
   `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/gap-findings.md`
   (threads #1 ezquake.com quantification, #2 the load-commands fix) +
   `coverage.ndjson` (the deliberately-excluded 124 note + the verified
   nQuake 63/183 = 34% floor) + `probe-3-nquake-distfiles.md` +
   `probe-5-dangling-threads.md`.

## Per-phase live recon (run it; do not trust the spec's numbers blind)

- The in-repo runtime dump:
  `apps/qw-oracle/scripts/extractors/mvdsv/validation-fixtures/ciscon-1.20-dev-2026-04-27.log`
  (the operator-captured `qw-1.log`; 2026-04-27; KTX 1.47-dev + MVDSV
  1.20-dev, Apr 11 2026 build). Inspect its actual shape (cvarlist /
  cmdlist sections, the `__k_ls_*` runtime-only noise C3 says to discount).
- The loaded L1 versions for ktx/mvdsv -- the F-C3a contemporaneity check.
  Determine which commit/version the live KTX + MVDSV L1 extract is at
  (SQL against `qw-oracle-postgres-dev`, the `versions` / `*_versions`
  tables) and whether it is contemporaneous with the Apr 11 2026 dump build.
  Plan the recovery C3 names (fresh dump at the extract commit) IF drift is
  large -- as a conditional task, not a default.
- `scripts/load-knowledge/load-commands.ts` + the MVDSV commands AST JSON --
  confirm the `entry.ast?.description` root cause (gap-findings #2) against
  the live files; the fix is one line + an idempotent reload, NO re-extract.
- The ezquake.com surface: plan to fetch `ezquake.com/docs/settings/server.html`
  (use the Jina reader `r.jina.ai` -- the site is JS-rendered; WebFetch alone
  fails) and cross-match cvar names vs the MVDSV M=183 roster. Measure the
  SHAPE of the overlap (easy common `sv_*` vs the hard dedicated-server-only
  tail: qtv / demo / master / server-antilag), not a headline count.

## Drafting rules

- ASCII only; no em-dash/en-dash/emoji; comments explain WHY (P5).
- Bun runtime; append-only migrations + SCHEMA.md if any schema touched (P1;
  Phase 0 likely touches none -- the loader fix is code, not schema).
  `source_ref` via the existing mechanism, no new format (P3). Main-tree git,
  commit-on-main, no worktree/PR ceremony (P4).
- The C3 diff yields a **suspect pool, never a verdict**. Date-proximate
  pinning is sufficient (C3) -- do NOT build hash-exact pinning (that is the
  parked arc's rigor bar, different consumer). Discount runtime-only
  `__k_ls_*` auto-generated cvars; CRLF-normalize; case-fold both sides;
  `LC_ALL=C` sort.
- The ezquake.com probe measures SHAPE, not a number. Do NOT emit a
  `124/183` style metric into any reusable artifact (F-D12a -- that is the
  fabricated-metric trap the grounding doc explicitly flagged). The verified
  floor on record is nQuake 63/183.
- The load-commands fix is one line + reload, idempotent, NO re-extract
  (F-D12b). Over-scoping it into a loader refactor is the failure mode.
- ezquake.com is a `shipped_doc`-class source (D11) -- the artifact URI goes
  in the provenance field; do NOT mint a new origin tag for it.
- Stay out of the parked arcs: detect + stamp + route the C3 suspects; do
  NOT classify them (F-C3b).
- Phase 0's verification floor is automated (a file exists; SQL before/after
  the loader fix shows 28 commands flipping from null to non-null
  description; the suspect-pool file exists with a sane count). YES/NO
  probes, not prose.

## Step by step

1. Read everything in "Required reading". Note F-C3a / F-D12a / F-D12b /
   F-C3b.
2. Run the per-phase live recon. Verify the load-commands root cause, the
   dump shape, and the L1 extract commit-vs-dump contemporaneity against
   live source. Do NOT inline spec numbers unverified.
3. Draft the phase MD at
   `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-0-probes.md`
   following `phase-template.md` exactly (section order; per-task
   Execution-mode annotation with model+effort+rationale; YES/NO
   phase-boundary verification; C4 recovery). Order the tasks free-win-first
   (load-commands fix), then the C3 diff, then the ezquake.com shape-quant;
   include the conditional fresh-dump task gated on the F-C3a
   contemporaneity result.
4. Dispatch the verification sub-agent (the brief at the bottom of
   `phase-template.md`, paths filled for Phase 0).
5. Apply the sub-agent findings. If a finding contradicts `decisions.md`,
   the decision wins -- record the rejected finding under "Open questions"
   with a one-line rationale. If a lock itself looks wrong, surface it
   explicitly for amendment; never silently override, never silently comply.
6. Halt. Reply to the operator with: the phase MD path; the sub-agent
   finding counts (CRITICAL / SUBSTANTIVE / ADVISORY); any open questions
   needing operator attention before execution; recommendation -- "ready for
   review" or "needs another pass".

Do NOT proceed to Phase 1. Do NOT execute anything. Do NOT modify the live
codebase. Drafting is paper-only.
