# KTX/MVDSV L1 describe-fill -- Phase 1 executor RESUME handoff

**For:** a fresh terminal resuming the `arc-executor` role for **Phase 1**
of the 2026-05-16 KTX/MVDSV L1 describe-fill arc. Created 2026-05-17 at a
deliberate context-budget wrap (executor prompt Open Q (f) / arc-executor
smell-zone rule: do NOT push the highest-judgment work past the smell
zone). The Phase-1 spine is built, per-task verified, and checkpoint
committed. What remains is the single highest-judgment unit: Task 6 (the
D19 walking-skeleton smoke), the phase-boundary verification, and the
final commit + halt-report. Nothing is in flight; tree state below.

---

## ORCHESTRATOR RATIFICATION (2026-05-17, post-spine boundary-check -- READ FIRST)

The orchestrator independently re-derived the spine at `95e8d726` (NOT
relayed from the prior terminal's self-report):

- **F-D4a guard structurally VERIFIED.** Exactly the 4 arc-bucket derivers
  (deriveCvar/Command/CmdlineParam/InfoKey) carry the 2-clause
  `IS DISTINCT FROM 'synthesized'` + `IS DISTINCT FROM 'shipped_doc'`
  owned-track-alone guard; NULL-safe; NO anchor conjunct; deriveCvarAlias +
  the other derivers + the dispatch map untouched; WHY-commented (P5).
- **F-C5c RATIFIED (genuinely resolved).** The project `tsc` gate was
  proven NON-vacuous by a perturbation test (an injected type error in
  `derive-entity-description.ts` was caught: `error TS2322`, exit 2; clean
  tree = exit 0). The per-task `tsc EXIT=0` claims are real, not vacuous.
- **F-D11b RATIFIED.** `.gitignore` for `output/describe-fill/*.html` (the
  regenerable projection) is correct.
- **F-C5b** already ratified (`7824fb20`); the arc-scoped
  `synthesized_requires_anchor` + the 7 excluded `match_event` rows hold.
- **Open Q (e) CONFIRMED, do not relitigate:** D6 skill slug =
  `describe-fill-synthesis` (live, registered); audit HTML default =
  `apps/qw-oracle/output/describe-fill/cvar-audit-review.html`. Reversible;
  locked as-is.
- `review-findings.md` carries F-C5c + F-D11b (Substantive/Advisory +
  ownership); the phase-1 MD Files-touched > Modified now lists
  `tsconfig.json` + `.gitignore` + `derive-entity-description.ts`.

**Your remaining work is EXACTLY: Task 6 (D19 smoke) -> the 5
phase-boundary checks -> the orchestrator guard re-derive-safe assertion
-> final commit + halt-report.** Do not rebuild the spine. Do not re-run
the holistic gate (CLEAN, captured).

**THE NON-NEGOTIABLE GATE (the orchestrator re-runs this itself at the
boundary -- your self-report is a hypothesis until psql-proven):** the D19
smoke must prove, with verbatim psql output, that a simulated re-derive
does NOT clobber the owned `k_short_gib` row AND that running the derive
tail twice leaves that owned record byte-identical. Phase 1 does NOT pass
the boundary without that proof green. Everything else is recoverable;
this is the one that silently corrupts the whole arc if wrong.

---

## THE SPINE IS BUILT + PER-TASK VERIFIED + COMMITTED. DO NOT REBUILD IT.

Checkpoint commit: **`95e8d726`** (pushed to origin/main). This arc's 8
files only; the ~22 pre-existing parallel-arc drift files were
deliberately NOT swept in (they are not ours -- same rule the
orchestrator-resume doc states).

| Unit | State | Where |
|---|---|---|
| Pre-flight + critical-review-before-execute | DONE, CLEAN | -- |
| **F-D4a owned-row guard** (the non-negotiable FIRST job) | DONE, verified | `apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts` -- NULL-safe `IS DISTINCT FROM 'synthesized'`/`'shipped_doc'` in EXACTLY the 4 arc-bucket derivers (`deriveCvar`/`deriveCommand`/`deriveCmdlineParam`/`deriveInfoKey`); other 9 + dispatch map byte-identical; project `tsc` clean |
| Task 1 -- 014 migration + SCHEMA.md | DONE, verified | `db/migrations/014_description_provenance_trail.sql` (7 cols, no CHECK), `SCHEMA.md`. 9-name IN-list = 9 (was 2). Migrator tracked, idempotent. |
| Task 2 -- 2 C5 F1 probes | DONE, verified | `scripts/load-knowledge/quality-grid.ts`. `F1.describe_fill.origin_vocabulary` (GLOBAL 5-set + ARC-SCOPED) + `F1.describe_fill.synthesized_requires_anchor` (ARC-SCOPED per F-C5b). Both `[PASS]` at baseline (ktx + mvdsv). |
| Task 3 -- D6 synthesis skill | DONE, verified | `~/.claude/skills/describe-fill-synthesis/` (SKILL.md 312 lines + 4 references/). **OUTSIDE the repo (user-global) -- NOT in the commit; it exists on this machine.** |
| Task 4 -- D7 two-tier review gate | DONE, verified | `apps/qw-oracle/scripts/describe-fill/review-gate.ts` |
| Task 5 -- D11/D15 audit serializer | DONE, verified | `apps/qw-oracle/scripts/load-knowledge/serialize-audit-review.ts` |
| **Task 6 -- D19 smoke (one real KTX cvar)** | **PENDING -- the resume work** | `apps/qw-oracle/scripts/describe-fill/smoke-one-cvar.ts` (to create) |
| Phase-boundary verification (5 checks + guard re-derive-safe assertion) | **PENDING -- run it YOURSELF, verbatim** | -- |
| Final commit + structured halt-report | **PENDING** | -- |

The describe-fill-synthesis skill loaded and is triggerable (it appeared
in the available-skills list this session). The project typecheck now
covers `scripts/describe-fill/` (F-C5c drain) -- `cd apps/qw-oracle &&
bunx tsc --noEmit` is now a real gate for the spine, exit 0 at the wrap.

---

## What is resolved / what to surface (do NOT re-derive)

- **The pre-dispatch holistic gate is CLEAN. Do NOT re-run it.** Verdict
  captured in
  `docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-orchestrator-resume.md`.
- **F-C5b RESOLVED + orchestrator-ratified** (commit `7824fb20`, an
  ancestor of HEAD). The Phase-1 `synthesized_requires_anchor` probe is
  arc-scoped (`project IN ('ktx','mvdsv') AND type IN
  ('cvar','command','cmdline_param','info_key')`) -- it does NOT police
  the 7 pre-existing structural-tier `ktx:match_event:*` `synthesized`
  rows (NULL anchor by design, out of D1 scope). Built correctly.
- **F-C5c (NEW -- surface for orchestrator ratification).** The new
  `scripts/describe-fill/` dir was absent from `apps/qw-oracle/
  tsconfig.json` `include`, so the phase typecheck gate was silently
  vacuous for the entire spine. Drained in `95e8d726` (added
  `scripts/describe-fill/**/*`). `tsconfig.json` is now a Files-touched
  Modified delta NOT in the original Phase-1 MD -- the orchestrator
  should ratify it (independently re-derive, then dated-trail like
  F-C5b).
- **F-D11b (NEW -- surface for ratification).** `apps/qw-oracle/
  .gitignore` covered `output/*.json` but not the regenerable
  `output/describe-fill/*.html` audit projection. Drained in `95e8d726`
  (`output/describe-fill/` ignored). `.gitignore` is likewise a
  Files-touched delta to ratify.
- **Open Q (e) executor choices (low-stakes, reversible; confirm with
  operator at review):** D6 skill slug = `describe-fill-synthesis`
  (`~/.claude/skills/describe-fill-synthesis/`); audit HTML default
  output path = `apps/qw-oracle/output/describe-fill/cvar-audit-review.html`.
- **LOCKED cross-task contracts (Tasks 3+4 produced these; Task 6 +
  Phase 5 MUST honor them exactly):**
  - `description_verdict` enum is EXACTLY `affirmed | synthesized |
    dead_stamped | hedged | residue_routed` (no other strings anywhere).
  - `source_ref` points at the authoritative READ use-site that exhibits
    the behavior (registration site ONLY for `dead_stamped` /
    `residue_routed`).
  - `review-gate.ts` `GateResult`: `{ tier1: 'pass'|'fail', failReason?,
    route?: 're_synthesis'|'c1_residue', descriptionVerdict,
    descriptionConfidence, descriptionReasoning, inTail: boolean,
    tailReason: 'hedged'|'residue'|'spotcheck'|null }`. Confidence stored
    = lower(D6, reviewer). Evidence-fail -> `c1_residue`; rubric-only
    fail -> `re_synthesis`.
  - The describe-fill-synthesis skill Step 6 emits the per-knob record;
    `description_provenance` is bound as a JS value, NEVER pre-stringified
    (P2).

---

## k_short_gib recon (VERIFIED live this session 2026-05-17 -- do not re-derive blind; re-confirm only if you doubt it)

- Entity row exists: `entities` `canonical_id='ktx:cvar:k_short_gib'`,
  `description` NULL, `description_origin` NULL, `source_state='source_backed'`.
- `cvar_versions`: `source_file='src/world.c'`, `source_line=942`,
  `trailing_comment` empty, `default_value` NULL.
- Registration (single): `research/repos/ktx/src/world.c:942` ->
  `RegisterCvar("k_short_gib");`
- Read use-sites (the D6 grounding -- behavior is legible here):
  - `research/repos/ktx/src/player.c:1048`:
    `int k_short_gib = cvar("k_short_gib"); // if set - remove faster`
  - `research/repos/ktx/src/player.c:1063`:
    `newent->s.v.nextthink = g_globalvars.time + (k_short_gib ? 2 : (10 + g_random() * 10));`
    (i.e. gibs removed after 2s when set, vs 10-20s default.)
- Shipped-config comments (identical text, differing value -- a D10
  value-difference, NOT a meaning conflict; both retained in provenance):
  - in-repo `research/repos/ktx/resources/example-configs/ktx/ktx.cfg:6`:
    `set k_short_gib 1 // remove gibs after 2 seconds (0 = no, 1 = yes)`
  - nQuake `research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg:7`:
    `set k_short_gib 0 // remove gibs after 2 seconds (0 = no, 1 = yes)`
- Baseline (verified): arc-scope `synthesized`/`shipped_doc` = 0; the
  origin-vocabulary + synthesized-requires-anchor probes are GREEN; the 7
  `ktx:match_event:*` synthesized rows are out-of-scope (F-C5b).
- DB: container `qw-oracle-postgres-dev`; `.env` `DATABASE_URL` present;
  `bun db/migrate.ts` connectivity confirmed; 14 migrations applied.

---

## Task 6 -- the resume work (mixed execution mode, recorded per sub-step)

Create `apps/qw-oracle/scripts/describe-fill/smoke-one-cvar.ts`. FULL
pipeline end-to-end on `k_short_gib` ONLY, self-contained, ZERO Phase 2/3
dependency. Read the phase-1-discipline.md "Task 6" section + the
"Verification (phase boundary)" + "Recovery" blocks first.

1. **Harvest (Sonnet medium)** -- read the `k_short_gib` line from BOTH
   ktx.cfg files; emit the candidate record in the EXACT shape the Phase 2
   D9 extractor must also emit (per-(cvar, source-file) records: candidate
   text = the comment; the shipped value as DATA, not the source default;
   one retained-provenance entry per file). Real harvest of one knob, NOT
   a synthetic fixture (D19), NOT the Phase 2 volume extractor.
2. **D6 synthesis (Opus 4.7 MAX, via the describe-fill-synthesis skill)** --
   on `ktx:cvar:k_short_gib`, grounded in the real source above. Spec-locked
   dial; do not lower.
3. **D7 tier-1 (Opus 4.7 MAX, SEPARATE invocation -- NOT the authoring
   context)** -- via the `review-gate.ts` contract. The independence is
   structural (the whole point of D7); do not collapse steps 2 and 3 into
   one subagent.
4. **Commit the full record (wire-up, Sonnet medium)** onto the existing
   `ktx:cvar:k_short_gib` row: `description`, `description_origin`
   (`synthesized` -- the source line has no comment; the configs are
   `shipped_doc` evidence retained in provenance), `description_anchor_version`,
   `description_provenance` (JSONB, TWO entries, bound as a JS value NOT
   pre-stringified -- P2), `description_verdict`, `description_confidence`,
   `description_reasoning`, `description_proposed`.
5. Emit the Task 5 page; assert `k_short_gib` round-trips (one row,
   before/after/why inline).
6. Run the two C5 probes; assert both GREEN on the filled row.
7. Idempotency: re-running the smoke reproduces the identical record (no
   duplicate row, no double count, byte-identical owned record).

---

## Phase-boundary verification -- RUN IT YOURSELF, verbatim (do NOT trust the smoke's self-report)

From `apps/qw-oracle/`. Copy the 5 checks verbatim from the
phase-1-discipline.md "Verification (phase boundary)" block. PASS = all 5.
PLUS the orchestrator-augmented assertions (executor prompt, non-negotiable):

- **Guard re-derive-safe (the F-D4a behavioral proof):** a simulated
  re-derive of the `cvar` deriver at `k_short_gib`'s version does NOT
  clobber the filled row, AND running the derive tail / smoke twice
  yields a byte-identical owned record. Verify with `psql`, not the
  smoke's self-report. The phase does NOT pass the boundary without the
  guard live AND this assertion green.
- The 5 checks: (1) schema family = 9; (2) `k_short_gib` full record =
  `t` (jsonb_typeof='array' proves P2); (3) both C5 probes `[PASS]`;
  (4) serializer round-trips one inline before/after/why row; (5)
  self-containment -- `synthesized`/`shipped_doc` KTX-cvar set = exactly
  `{ktx:cvar:k_short_gib}` (baseline 0).
- Recon-additional (F-C5b): confirm `synthesized_requires_anchor` is
  vacuously GREEN arc-scoped AND the 7 `ktx:match_event:*` rows are
  EXCLUDED (not offenders); after the fill it stays GREEN on the real
  `k_short_gib` row.

Recovery on any FAIL = C4: re-run the corrected pipeline, NEVER an
`UPDATE` patch. The Recovery section in the phase MD anticipates each
failure mode.

---

## Reads required for the fresh terminal (minimal)

1. This handoff.
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-1-executor-prompt.md`
   -- the executor contract (scope check, augmentations, halt contract).
3. `phase-1-discipline.md` -- the AMENDMENT block, Recon facts, Task 6
   section, "Verification (phase boundary)", Recovery, "Outputs to next
   phase".
4. `decisions.md` -- D19, D7 (+ clarification), D6, D4 amendment (F-D4a),
   D11 (+ amendment), C4, C5 (+ clarification), P2, P4, P5.
5. `~/.claude/skills/describe-fill-synthesis/SKILL.md` + `references/`
   (the synthesis unit) and `apps/qw-oracle/scripts/describe-fill/
   review-gate.ts` (the `GateResult` contract + `REVIEWER_PROMPT` +
   `REVIEWER_MODEL_DIAL`) and `scripts/load-knowledge/serialize-audit-review.ts`
   (`renderRows` + the DB predicate).
6. The orchestrator-resume parking doc (gate verdict CLEAN -- consume,
   do not re-run).
7. Invoke the `arc-executor` skill first.

---

## Critical rules (locked; do not relitigate)

- Verification discipline is the highest priority. A prior session's
  "verified" is a hypothesis -- re-derive load-bearing numbers/paths via
  psql/grep/ls. Run the phase-boundary checks + the guard re-derive-safe
  assertion YOURSELF; a "PASS" without the verbatim probe output is not
  acceptable.
- F-D4a guard is LIVE in `95e8d726`. Do NOT rebuild it; VERIFY it at the
  boundary (the re-derive-safe behavioral proof).
- Opus-4.7-MAX is spec-locked for the Task 6 synthesis pass AND the
  independent tier-1 pass. Recorded, not lowerable (D7 + clarification).
- The D19 smoke is a REAL `k_short_gib` harvest+synthesis, not a
  synthetic fixture (D19 -- real source-grounding is the part most likely
  to be wrong).
- Honor the locked cross-task contracts (verdict enum / source_ref
  semantics / GateResult / P2 JSONB) exactly; do not invent alternatives.
- Never silently override a lock; never silently comply with a direction
  that contradicts one -- surface a dated amendment to the operator.
- This arc's files ONLY. The ~22 pre-existing parallel-arc drift files
  (incl `enforce-L1` churn) are NOT ours -- do not sweep them into any
  commit. ASCII only. Main-tree git, commit-on-main, push at checkpoints,
  no worktree/PR ceremony (run git silently; the operator does not touch
  git).
- Do NOT proceed to Phase 2. Do NOT re-run the holistic gate.

---

## First actions (fresh terminal)

1. Invoke the `arc-executor` skill. Read this handoff + the executor
   prompt + the phase-1-discipline Task 6/boundary/Recovery sections.
   Confirm scope (F-D4a, the owned-row guard, `k_short_gib`, the spine at
   `95e8d726`). A sibling-arc misdirection (wrong finding numbers /
   handler names / `enforce-L1`) means STOP.
2. Verify the spine is intact at HEAD: the 8 files in `95e8d726`, the
   F-D4a guard predicate present in exactly the 4 arc-bucket derivers,
   both C5 probes `[PASS]`, the skill at
   `~/.claude/skills/describe-fill-synthesis/`. Re-derive, don't trust.
3. Execute Task 6 per the mixed sub-step dials (harvest Sonnet-medium;
   synthesis Opus-4.7-MAX via the skill; independent tier-1 Opus-4.7-MAX
   via the gate; wire-up persist+emit+probe+idempotency).
4. Run the 5 phase-boundary checks + the guard re-derive-safe assertion
   YOURSELF, verbatim outputs.
5. Commit the final Phase-1 boundary state (smoke file + the filled
   `k_short_gib` row state) -- this arc's files only -- on main, push.
6. Halt with the structured arc-executor report (DONE /
   DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED). Surface for orchestrator
   ratification: F-C5c, F-D11b, the Open Q (e) names, the locked
   cross-task contracts. Do NOT proceed to Phase 2.

## When in doubt

Verify before asserting. A lock conflict surfaces as a dated amendment,
never silent. The D19 smoke must be real, not synthetic. Genuine
decisions route to the operator with a decisive plain-English
recommendation, one question at a time. The spine is built and verified
-- your job is the integration smoke + the operator-trusted phase-boundary
gate, done with full judgment fidelity (the reason this wrap exists).
