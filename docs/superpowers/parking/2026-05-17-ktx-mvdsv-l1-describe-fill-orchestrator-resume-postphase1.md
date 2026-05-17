# KTX/MVDSV L1 describe-fill -- orchestrator RESUME (post-Phase-1, Phase 2 in flight)

**For:** a fresh terminal resuming the `arc-orchestrator` role. Created
2026-05-17 at a deliberate ~400k context wrap (arc-orchestrator skill Step
7/8: do NOT drive phase-boundary verification past the smell zone --
judgment fidelity degrades exactly where it is most needed). Phase 2 is
RUNNING in its own executor terminal; nothing else in flight. This
SUPERSEDES `2026-05-17-ktx-mvdsv-l1-describe-fill-orchestrator-resume.md`
(that one was the post-gate/mid-correction state -- long consumed; kept
only as git trail).

---

## THE HOLISTIC GATE IS CLEAN AND CONSUMED. DO NOT RE-RUN IT. DO NOT RE-READ THE 9,300-LINE PLAN.

The pre-dispatch holistic gate ran to verdict (NOT CLEAN -> 3 findings ->
Corrections 1+2+3 all landed + verified). Its verdict + sound-list are
captured in the prior resume doc and the git trail. The gate is
**once-per-arc**. Any future "re-run the gate" is a FOCUSED re-check of a
specific corrected surface, NEVER a whole-plan re-read. Burning ~400k to
"re-verify the plan" is the exact waste this note exists to prevent.

## Where things are

- Arc dir: `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/`.
  PLAN COMPLETE; all phase MDs approved; gate CLEAN.
- **Phase 0: SHIPPED + orchestrator-boundary-verified.** Free win (28
  MVDSV cmd descriptions), self-built reproducible C3 oracle, ezquake.com
  shape. **F-C3c ratified** (the ktx/command C3 leg is measurement-invalid
  -- `mvdsv cmdlist` is structurally blind to KTX `cmds[]` mod-path
  commands; primary-source-verified; NON-DIAGNOSTIC, excluded -- this
  prevented a 357-command false-death lie). **F-C3d** (latent:
  `extract-tag --version head` does not fetch origin -> Phase 5 D4 walk
  must explicit-fetch + SHA-pin + `--commit`). Re-baseline EXACT: ktx
  260/358/7, mvdsv 183/108/11/45 (unchanged across dev-head advance;
  correct by C1).
- **Phase 1: SHIPPED + orchestrator-boundary-verified.** The full
  build-once spine: F-D4a owned-row guard + migration 014 schema + 2 C5
  probes + the D6 `describe-fill-synthesis` skill + the D7 two-tier gate +
  the D11/D15 audit serializer + the D19 `k_short_gib` end-to-end smoke.
  **F-D4a re-derive-safe gate INDEPENDENTLY PROVEN by the orchestrator** (a
  real `re-derive --project ktx --type cvar`, 260 entities touched, left
  `k_short_gib`'s full owned-column fingerprint `9b4595a4...`
  byte-identical; still `synthesized`, guard held). F-C5b (probe
  arc-scoped), F-C5c (tsc gate was vacuous -- perturbation-proven fixed),
  F-D11b (audit HTML gitignored) all ratified. **The spine is built ONCE
  for both engines -- do NOT rebuild it.**
- **Phase 2: RUNNING** (KTX shipped-config D9 mechanical sibling extractor
  + loader; prompt: `phase-2-executor-prompt.md`). Writes the FIRST
  `shipped_doc` owned rows at volume. Not yet halted.
- Tree: all arc work committed + pushed on `main` (latest arc commit
  `1f3b8610`). Parallel `enforce-L1` arc lands its own commits on `main`
  -- NOT ours, no collision (different files); never sweep its drift in.
- Anchor_version convention RATIFIED arc-wide: `git describe` of the
  loaded dev-head (`k_short_gib` = `1.47-2-g67253dc`); Phase 3/4 stamp
  identically; `shipped_doc` rows carry NO anchor until Phase 3.

## Reads required (MINIMAL -- this is the point)

1. This handoff (consume the captured state; do NOT re-derive it).
2. The arc `README.md` -- status + locked slicing + phase index.
3. `review-findings.md` -- the ledger you OWN. In play: F-C1a, F-C3c,
   F-C3d, F-C5b, F-C5c, F-D11b, F-D9a + the Confirmed-good anchor_version
   convention + the ownership table. New Phase-2 findings get the next
   F-suffix, dated, never silent.
4. `decisions.md` -- ONLY the dated blocks if a specific question needs
   them (D9 + D9 amendment, D11 + D11 amendment, D4 amendment/F-D4a,
   C1-C5). Do NOT re-read it whole.
5. `phase-2-ktx-mechanical-extract.md` + `phase-2-executor-prompt.md` --
   what Phase 2 was told to do (to verify its report against).
6. When Phases 3/4/5 come up: their phase MD + generate their executor
   prompt from the pattern in `phase-0/1/2-executor-prompt.md` (the
   established file-as-prompt shape).
7. Invoke the `arc-orchestrator` skill. Confirm the captured state WITHOUT
   re-deriving (tell-tale scope: F-D4a owned-row guard, `k_short_gib`,
   M=260, the D9 `shipped_doc` ~109/260, `mvdsv cmdlist` blind to KTX
   `cmds[]`). A sibling-arc (`enforce-L1`) misdirection means STOP.

## The psql verification recipe (bake this in -- do not rediscover it)

`psql` is NOT on PATH; the dev DB is the docker container
`qw-oracle-postgres-dev`. From `apps/qw-oracle/`:

```
DBURL=$(grep -E '^DATABASE_URL=' .env|head -1|cut -d= -f2-|tr -d '"'"'"'')
PGUSER=$(echo "$DBURL"|sed -E 's#.*://([^:]+):.*#\1#')
PGDB=$(echo "$DBURL"|sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')
Q(){ docker exec -e PGPASSWORD="$(echo "$DBURL"|sed -E 's#.*://[^:]+:([^@]+)@.*#\1#')" \
  qw-oracle-postgres-dev psql -U "$PGUSER" -d "$PGDB" -P pager=off -tA -c "$1"; }
```

The real derive-tail (the F-D4a proof path, idempotent, safe on dev):
`cd apps/qw-oracle && bun scripts/load-knowledge/index.ts re-derive --project ktx --type cvar`
Owned-column fingerprint (per entity):
`md5(coalesce(description,'')||'|'||coalesce(description_origin,'')||'|'||coalesce(description_anchor_version,'')||'|'||coalesce(description_provenance::text,'')||'|'||coalesce(description_verdict,'')||'|'||coalesce(description_confidence::text,'')||'|'||coalesce(description_reasoning,'')||'|'||coalesce(description_proposed,''))`
(`source_ref`/`trailing_comment` are NOT entities columns -- source_ref is
inside `description_provenance`; trailing_comment is on the version row.)

## When Phase 2 halts -- the boundary verification (run it YOURSELF)

A dispatched terminal's "PASS" is a HYPOTHESIS (proven 7x this arc:
F-C1a/F-C3c/F-C5b/F-C5c/F-D11b/F-D9a + the F-D4a re-derive proof). Run,
verbatim:

1. **NON-NEGOTIABLE -- F-D4a `shipped_doc` leg.** Phase 2 writes the first
   `shipped_doc` owned rows. Fingerprint them + `k_short_gib` BEFORE; run
   the real `re-derive --project ktx --type cvar`; fingerprint AFTER.
   Every Phase-2 `shipped_doc` row AND `k_short_gib` (still `synthesized`,
   byte-identical) MUST be unchanged. The guard's predicate is
   `description_origin IN ('synthesized','shipped_doc')`, NO anchor
   conjunct -- a `shipped_doc` row carries no anchor and MUST still be
   protected. If anything changed -> the arc is corrupting its own record;
   HALT, do not proceed.
2. **Coverage vs the POST-Phase-0 M.** Recon M live (`phase-0-results.md`
   re-baselined ktx cvar = 260 this walk; recon, do not hardcode).
   Honest `shipped_doc` write target ~109/260; M=260 is the C1 gate; the
   ~151 residue tracked to Phase 3 / C1-outreach, NEVER importance-cut.
3. **The 2 C5 probes GREEN** (provenance-entry-exists + the extended
   jsonb-not-string); the 7 `ktx:match_event:*` rows still excluded;
   `origin_vocabulary` + `synthesized_requires_anchor` still `[PASS]`.
4. **F-C2a:** one record per (cvar, source-file); in-repo vs nQuake drift
   preserved, NEVER merged.
5. **F-D9a:** trailing `\r` stripped (KTX configs are CRLF) -- spot-check a
   harvested `raw_comment`/value in `description_provenance` has no `\r`.
6. **Idempotent re-run** byte-identical (D9/C4).
   CLEAN -> ratify, capture cross-phase memory (dated), generate the Phase
   3 executor prompt, report to operator in plain English with a decisive
   recommendation, dispatch Phase 3. ANY finding -> HALT, surface dated,
   never silent (the F-D4a/F-C5b/F-C3c handling pattern).

## Remaining sequence

Phase 2 (running) -> **Phase 3** (KTX source synthesis, D5-D8/D10; the D6
skill fans out; D6 synthesis + D7 review are **Opus 4.7 MAX, spec-locked,
not lowerable**; **carries F-C3c: do NOT dead-stamp KTX commands -- they
have no Phase-0 C3 signal; describe from source**; the operator-run D7
tier-2 tail) -> **Phase 4** (MVDSV fill; the `mvdsv.6` D9 sibling parser;
sized by the Phase 0 ezquake.com shape; **F-D12a: no NN/NN ratio**;
re-check probe #2's exact query -- a Phase-0 honest-gap watch-item) ->
**Phase 5** (D4 staleness walk + projections; **F-C3d: explicit
fetch+SHA-pin+`--commit`**; F-D13a MCP contract; F-D11b ignore discipline;
tag `arc-ktx-mvdsv-l1-describe-fill-shipped`). Phase 6 deferrable,
non-gating. Generate each executor prompt from the
`phase-{0,1,2}-executor-prompt.md` pattern; Phase 3/4 are subagent-heavy
(flag the smell-zone fresh-terminal handoff in their prompts).

## Critical rules (locked; carried -- do not relitigate)

- The holistic gate is once-per-arc, CLEAN, consumed. Verify corrected
  surfaces focused, never whole-plan.
- **F-D4a sequencing (non-negotiable).** The owned-row guard is LIVE +
  orchestrator-proven. Re-confirm the `shipped_doc` leg at the Phase-2
  boundary and the guard green at every subsequent fill-phase boundary.
- Spec is source of truth; a dated amendment GOVERNS its original C/D text
  (the spec's `## Amendment precedence` clause). Never silently override a
  lock; never silently comply against one -- dated amendment, surfaced.
- Verification discipline highest priority: re-derive load-bearing
  numbers/paths via the psql recipe / grep / ls. Prior "verified" is a
  hypothesis.
- Coverage = POST-Phase-0 N/M, recon live; residue tracked, NEVER
  importance-cut. D6 + D7 = Opus 4.7 MAX, not lowerable.
- Operator: non-coder, conceptually fluent; NOT the technical gate (you
  are). Plain-English-first; be decisive (recommend, do not poll); one
  question at a time; momentum over ceremony; ASCII committed docs;
  main-tree git, commit-on-main, push at checkpoints, no worktree/PR
  ceremony (Claude runs git silently); commit ONLY this arc's files.
- Model/effort the operator is using: phase executor TERMINALS on Opus
  (Phase 1 max reasoning; Phase 0/2 medium, high if margin wanted); the
  per-task subagent dials are locked IN each phase MD (D6/D7 Opus-MAX),
  the executor honors them, does not choose them.
- The arc is complete + useful at end of Phase 5; Phase 6 is the
  deferrable tail (routes to arc-reviewer post-arc, fresh terminal).

## First actions (fresh terminal)

1. Read this handoff + the arc README; invoke `arc-orchestrator`; confirm
   the captured state WITHOUT re-deriving (scope tell-tale above). Sibling
   -arc misdirection -> STOP.
2. If Phase 2 has halted: run the boundary verification YOURSELF (the
   recipe above; the F-D4a `shipped_doc` proof is non-negotiable). If
   still running: wait; do not poll the executor.
3. CLEAN -> ratify + capture dated cross-phase memory + generate the Phase
   3 executor prompt (carry F-C3c, the Opus-MAX D6/D7 lock, the smell-zone
   handoff note) + report to the operator with a decisive plain-English
   recommendation + dispatch instruction.
4. Track your own context budget. At ~350k, wrap at the cleanest phase
   boundary and write the next orchestrator-resume (this shape).

## When in doubt

The gate is CLEAN, consumed -- do not re-derive it. Phases 0+1 are
orchestrator-verified -- do not re-verify them. Verify Phase 2's boundary
against live source before trusting it. A lock conflict surfaces as a
dated amendment, never silent. Genuine decisions route to the operator
with a decisive plain-English recommendation, one question at a time. Do
not execute phase code as the orchestrator -- verify, own the cross-phase
memory, dispatch the next executor.
