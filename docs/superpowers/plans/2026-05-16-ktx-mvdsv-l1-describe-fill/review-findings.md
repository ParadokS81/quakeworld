# Review findings -- risk / carry-forward ledger

**This arc has no prior monolithic plan.** It is born from the arc-brainstormer
spec (`docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`),
not a legacy-plan rewrite. There is therefore no defect audit of a prior plan.

This file is the **evidence / risk ledger**: the spec's tracked
carry-forwards, the grounding-evidence risks (probe-3 drift, the unquantified
ezquake.com figure), and the known gotchas a cold phase drafter must check
while writing each phase MD. The FIX for each is the decision it points at in
`decisions.md`; this file is the WHY and the watch-list. Phase drafters consult
both.

F-numbers are suffixed with the decision they relate to (e.g. `F-C3a`,
`F-D11a`) so the linkage is visible at a glance. New findings discovered
during phase drafting append with the next sequential suffix.

---

## How to use this doc

While drafting each phase MD:

1. Find the rows whose "Phase" is the phase you're drafting (see the
   ownership table at the bottom).
2. Confirm the relevant `decisions.md` entry resolves / contains the risk.
3. If the phase does not naturally honor a risk that touches it, surface it
   in the phase's "Open questions" section -- do not silently proceed.
4. Phase 0, Phase 1, and Phase 2 carry the highest risk density (the
   prerequisite probes, the build-once spine, and the first multi-source
   merge).

---

## Grave risks (would ship a corrupted or dishonest KB)

### F-C2a -- in-repo vs nQuake ktx.cfg drift is REAL and concrete

**Contained by:** C2 + D9 (one record per cvar+file) + D10 (three-class
policy).

**Evidence (probe-3, primary-source-verified 2026-05-15):** in-repo
`example-configs/ktx/ktx.cfg` vs nQuake `sv-configs/ktx/ktx.cfg` -- 73 cvars
shared, 22 nQuake-only, 19 in-repo-only. Concrete value conflicts:
`sv_maxrate` 50000/500000, `k_exclusive` 0/1, `k_exttime` 3/5, `k_vp_admin`
75/51, `maxclients` 32/8, `maxspectators` 12/4, `fpd` 206/222 (different
security posture, not an error), `sv_reliable_sound` 1/0. Polarity-label
drift: `k_noframechecks` comment inverts meaning between the two files.
`sv_antilag` is in-repo-only -- nQuake's omission is an intentional
operational choice, not missing data.

**Risk:** a naive merge at extract time silently encodes one distribution's
opinion as universal fact and destroys the ability to flag the conflict.

**Phase:** Phase 2 (preserve per (cvar, source-file), never merge -- D9).
Phase 3 (value-differences route to L3 not flagged; meaning-conflicts
C2-flagged and resolved inline at the D7 tail -- D10).

### F-C5a -- four new data shapes have no regression probe until this arc adds them

**Contained by:** C5 (phase-boundary gate) + P2 (`F1.jsonb_columns_not_strings`
extension).

**Evidence:** the arc adds owned description text, the origin tag, retained
multi-source provenance (JSONB), and the synthesized anchor+staleness fields.
No existing F1 probe watches any of them. Spec C5; the JSONB-string-scalar
failure mode is the live one (`reference_postgres_js_jsonb_binding`, real
incident 2026-05-02).

**Risk:** an honesty guarantee nothing mechanically enforces is hollow; silent
drift in any shape ships unnoticed to every consumer (MCP, snapshot, wiki, the
D16 showcase).

**Phase:** Phase 1 (origin-tag-vocabulary probe + synthesized-needs-anchor
probe, since Phase 1 first writes those shapes). Phase 2 (provenance-entry-
exists + jsonb-not-string probes, since Phase 2 first writes `shipped_doc` +
retained provenance). The probe lands in the same phase that first writes the
shape -- not deferred to Phase 5.

### F-D4a -- the shared derive tail clobbers the owned describe-fill rows on every walk

**Contained by:** the dated `decisions.md` D4 amendment 2026-05-17 (the
owned-row guard is a Phase-1-spine deliverable -- built once, engine-agnostic,
BEFORE Phase 2's first owned write; predicate = owned-track membership;
Phase 5 consumes it + owns only the D4 report) + the dated Phase-1-MD
scope-amendment 2026-05-17.

**Evidence (primary-source-verified 2026-05-17 -- planner Phase 5
cold-review + the Phase 5 drafter's independent recon, agreeing):**
`apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts` -- all
13 per-type derivers (the file's own header comment line 48: "All 13
derivers write description_origin every time they UPDATE"; verified
`deriveCvar` 70-121, `deriveCommand` 123-143, `deriveCmdlineParam`
166-186, ...) issue `UPDATE entities SET
description=COALESCE(help_*/trailing_comment),
description_origin=CASE ... ELSE NULL ... WHERE entities.id=vt.entity_id
AND ...version/project/type` with NO
`description_origin IN ('synthesized','shipped_doc')` guard. It runs on
every version walk/load via `index.ts:679
deriveEntityDescriptionsForVersion(...)` inside the load transaction. None
of Phases 1-4 touch this file (Phase 1 adds the
`description_rereview`/`description_anchor_version` columns + the C5 probes,
never the derive tail).

**Risk (arc-invalidating):** the arc's entire owned
`synthesized`/`shipped_doc` record is overwritten back to the source
comment -- or to NULL (most KTX/MVDSV cvars have no trailing comment, the
reason this arc exists) -- on the FIRST post-write re-extract. That
re-extract is not rare: D4 staleness mandates one on every new KTX/MVDSV
version; C4 recovery ("re-run the corrected pipeline") in Phases 2/3/4
re-runs the load path; Phase 4's own idempotency contract re-runs
extract+load twice. Scoping the guard to Phase 5 (the original Phase 5
draft + drafter Open Q (b) Reading A) leaves Phases 2-4's owned writes
destroyed by any interim re-extract and makes the per-phase DB-state
verification regime silently unsound (a verified Phase-2 boundary wiped
before Phase 5 ever runs). A staged `shipped_doc` row (Phase 2, pre-Phase-3
evaluation) carries no anchor, so an
`AND description_anchor_version IS NOT NULL` conjunct in the guard
under-protects it -- the predicate must be owned-track membership alone.

**Phase:** Phase 1 (the owned-row guard at the shared derive tail --
engine-agnostic, built once, BEFORE Phase 2's first owned write; dated D4
amendment + dated Phase-1-MD scope-amendment 2026-05-17). Phase 5 CONSUMES
the Phase-1 guard and owns only the D4 walk-time Drifted/Added/Removed
report + the `description_rereview`/"may be stale as of X" wiring (Phase 5
Task 4 rescoped; `derive-entity-description.ts` moves out of Phase 5's
Modified set into Phase 1's). Caught at the final arc gate by the
fresh-context cold review -- the verification discipline's per-phase
load-bearing catch, here at arc-shape level.

## Substantive risks (would size a phase wrong or break a prerequisite)

### F-C3a -- DISSOLVED 2026-05-17 (self-built reproducible C3 oracle)

**Status: DISSOLVED** by the spec C3 amendment 2026-05-17 +
`decisions.md` C3 amendment (operator decision, Phase 0 review). Kept here
for the trail, not as an active risk.

**Original framing (verified, kept for reference):** the loaded L1 extract
is dev-head at stale commits (mvdsv `f816d28` 2026-01-04; ktx `da73e06`
2026-03-03; clones frozen there), the 2026-04-27 production dump is an
Apr-11-2026 build, and `1.20-dev`/`1.47-dev` are constant dev strings that
cannot expose the ~3-month (mvdsv) / ~6-week (ktx) gap. Under the original
"diff a frozen third-party dump against whatever extract exists" mechanism
this was a real false-suspect risk.

**Why dissolved:** Phase 0 now self-generates the C3 oracle from a
forward-fetched dev-head build (build mvdsv + ktx, run a local server,
capture `cvarlist`/`cmdlist`) and re-extracts L1 from the same commit.
Source extract + runtime oracle + describe-fill substrate are ONE build, so
contemporaneity is structural, not a risk to manage. Decisive rationale: QW
servers run dev-head, not tagged releases, so the KB must track dev-head
anyway. See the spec C3 amendment + `decisions.md` C3 amendment for the full
mechanism, the retained-production-dump cross-check, and the documented
fallback (if `cmake` -- the only missing build tool, apt-installable --
cannot be obtained in-loop, revert to fetch-forward-source + the production
dump under the original date-proximate caveat -- the now-dissolved approach
becomes the safety net). NOTE: KTX and MVDSV are both C / CMake (not
QuakeC/fteqcc -- a planner inference error corrected 2026-05-17, OQ-3); the
build path is homogeneous and more feasible than first framed.

**Phase:** Phase 0 (self-build + self-dump + re-extract-forward -- a
substantive revision of the drafted Phase 0 MD's Task 2/3; Task 1
load-commands free win unchanged). Not an active risk to track.

### F-D12a -- the ezquake.com "124 MVDSV cvars" figure is NOT a real metric yet

**Contained by:** D12 (Phase 0 probe-1 quantifies it).

**Evidence:** gap-findings + coverage.ndjson scoping note: probe-5 did NOT
cross-match the ezquake.com/docs/settings/server.html surface against MVDSV
M=183. `124/183` is deliberately EXCLUDED from `coverage.ndjson` to avoid
injecting a fabricated metric. The only quantified MVDSV-cvar floor on record
is nQuake `mvdsv.cfg` 63/183 (34%).

**Risk:** sizing Phase 4 against an unverified 124 (68%) vs the verified floor
34% swings the whole MVDSV-cvar approach (mechanical-heavy vs synthesis-heavy).
Treating 124 as real before Phase 0 quantifies it is the exact fabricated-
metric trap the grounding doc flagged.

**Phase:** Phase 0 (probe-1 produces the real shape). Phase 4 boundary +
context budget are scaffolded against Phase 0's output, not against 124.

### F-D12b -- the load-commands.ts fix is a verified free win, no re-extract

**Status:** verified root cause; ready to execute.

**Evidence:** gap-findings thread #2; root cause confirmed against live AST +
`load-commands.ts` -- the `entry.ast?.description` mapping. 28/108 MVDSV
commands are present in `mvdsv-commands-ast.json` but not loaded. One-line
loader fix + reload, no re-extract.

**Risk:** none if done as specified. The risk is OVER-scoping it (treating it
as a loader refactor) or UNDER-verifying (the AST already has the data; do not
re-extract). Idempotent reload only.

**Phase:** Phase 0, first task (the free win; momentum).

### F-D11a -- the audit-review HTML generator does NOT exist in the codebase

**Contained by:** D11 + D15 (emit-from-record; the 2026-05-15 file is a
visual template only).

**Evidence:** Pass 3/4 close carry-forward said the generator was NOT found
under `apps/qw-oracle/scripts`. Stronger, verified 2026-05-16: **neither the
generator NOR the `cvar-audit-review.html` artifact itself exists anywhere
under `/home/paradoks/projects`** (searched maxdepth 6). The spec's "2026-05-15
ezQuake cvar-provenance audit artifact ... retained as a VISUAL TEMPLATE"
(D15) is a description in prose, not a recoverable file in the tree. Spec D15
explicitly rejects reverse-engineering an unknown old generator anyway.

**Risk:** a Phase 1 drafter hunts for a phantom file, or plans to "reuse" a
generator that does not exist -- an unexecutable task. **This is NOT a
blocker:** D11 + D15 fully specify the column family
(`name / source_file / verdict / confidence / reasoning / proposed_desc`,
sortable + filterable, row-per-entity, source-comment/our-description/reasoning
shown INLINE per row as one before/after/why unit). Phase 1 builds a NEW
emitter that serializes the structured D11 record against that specified
column family. If the operator has the old artifact outside the repo (a
screenshot / an Unraid path), it is a nice-to-have pixel reference, not a
dependency.

**Phase:** Phase 1 (the internal-tier audit serializer is a Phase 1
deliverable; it IS the D15 review page and the D7 operator-tail surface).

### F-D13a -- the public projection changes the MCP contract surface

**Contained by:** D13 + `apps/qw-oracle/API_CONTRACTS.md` new-dataset
checklist.

**Evidence:** origin tag + staleness stamp now ride the L1 entity response.
Per API_CONTRACTS: this is L1, the query shape matches existing tools
(`lookup_entity` / `search_entities`) -- **no new tool**; but Discovery
(orientation blob + tool descriptions) and Query (`match_quality` story) must
be updated in the same change, or the contract silently breaks.

**Risk:** shipping the projection without the orientation/tool-description
update is invisible to consumers and breaks Discovery (API_CONTRACTS "Update
rule"). Adding a tool would be wrong (the checklist says no new tool here).

**Phase:** Phase 5 (when the public projection lands) -- the phase MD must
include the orientation-blob + tool-description edit in the same commit, and
must NOT add a tool.

### F-C1a -- Phase 0 forward re-extract re-baselines the probe-0 denominators; Phase 2 hardcoded M=260

**Surfaced by:** the pre-dispatch holistic gate 2026-05-17 (Finding 1 of 3 --
the mechanical cross-document propagation class per-phase review structurally
misses; the F-D4a precedent).

**Contained by:** the spec C3 amendment 2026-05-17 (Phase 0 Task 2 re-extracts
dev-head forward and re-baselines the probe-0 denominators -- correct by C1) +
the Correction-1 Phase-2 MD revision 2026-05-17 (committed `d0bd2068`).

**Evidence:** locked execution order is Phase 0 || Phase 1 first, then
2->3->4; Phase 0's own Outputs name "Phase 1/2/3/4 recon against the POST-
re-extract baseline." Phases 3/4/5 carried the "recon POST-Phase-0 M;
pre-Phase-0 was X, gate-SHAPE not frozen" discipline verbatim. Phase 2 was
the lone KTX fill phase missing it -- Recon called 260 "the gate", boundary
checks 1/3 + Task 4 hardcoded 260. At execution, if any KTX cvar churned
since commit `da73e06`, Phase 2's boundary spuriously FAILs, or an executor
misreads a legitimate Phase-0 re-baseline as a fill-not-create violation, or
force-fits 260.

**Risk:** RETIRED -- Correction 1 (landed + committed `d0bd2068`) made the
Phase-2 Recon `M=260` bullet carry the POST-Phase-0-recon caveat and removed
the hardcoded 260 from boundary checks 1/3 + Task 4 goal/coverage step
(recon the POST-Phase-0 M live; pre-Phase-0 260 is gate-SHAPE, not a frozen
contract number). The C1 gate is unchanged.

**Phase:** Phase 2 (recon the POST-Phase-0 M; no hardcoded 260), Phase 0
(produces the re-baseline).

### F-C3c -- the ktx/command C3 leg is measurement-invalid (mvdsv `cmdlist` is structurally blind to KTX mod-path commands)

**Surfaced by:** the Phase 0 executor, Task 2 two-stage review 2026-05-17
(primary-source-verified live). The Task 2 design assumed KTX commands are
`cmdlist`-enumerable and never verified it -- the class per-phase drafting
structurally misses (the F-D4a / F-C1a precedent, here caught at executor
two-stage review instead of the holistic gate).

**Contained by:** the Executor correction 2026-05-17 in
`phase-0-artifacts/c3-suspect-pool.md` + `phase-0-results.md` +
`c3-liveness-diff.sh` (ktx/command excluded as NON-DIAGNOSTIC; genuine pool
= ktx/cvar 0 + mvdsv/cvar 5 + mvdsv/command 4). Faithful to C3 (removes a
357-entry false-death hazard before commit), NOT a decision amendment.

**Evidence:** the C3 oracle is `mvdsv +gamedir ktx` -> `cvarlist`/`cmdlist`.
KTX cvars register into mvdsv's cvar system via `Cvar_Register`, so
`cvarlist` enumerates them (ktx/cvar leg valid: 259/259, 0 suspects). KTX
commands are struct-literal `cmd_t cmds[]` / frogbot `std_commands[]` /
`editor_commands[]` tables iterated by KTX mod-side dispatch (KTX command
extractor docstring: "PATTERN 4 -- struct-literal command tables iterated
via dispatch"; KTX `Cmd_AddCommand` call sites commented out, `teamplay.c`).
`mvdsv cmdlist` enumerates only engine-side `Cmd_AddCommand`, so it CANNOT
observe the KTX mod-command surface: 357/358 "absent" is the trivial
structural default, zero liveness signal. The raw 357 are unmistakably LIVE
core commands (`1on1`,`2on2`,`4on4`,`ready`,`break`,`captain`,`yes`,`no`,
`+scores`,`pickup`,`agree`). The retained 2026-04-27 production dump
reproduces 357==357 (structural, not build/liveness).

**Risk (arc-invalidating if uncorrected):** consumed per the C3/D6 contract,
357 live KTX commands -- ~the entire competitive-QW command surface -- would
get the D6 "appears non-functional, candidate upstream code bug" dead-stamp
and route to C1 outreach: precisely the shipped lie C3 forbids (the dual of
"presence is not liveness" -- never assert DEATH for a knob the oracle
cannot observe). Distinct from F-C3b: F-C3b parks *classifying genuine
suspects*; here the instrument yields *no valid suspects to classify* for
this leg.

**Open question (Phase 0 boundary -- operator/orchestrator ratify):** the
artifacts are corrected so Phase 3 cannot dead-stamp KTX commands (it
describes them from source behavior like any non-suspect knob). Ratify the
non-diagnostic framing. Whether KTX-command runtime-liveness ever warrants a
KTX-mod-side oracle (candidate: the parked libclang call-graph reachability
arc over the `cmds[]` dispatch) is flagged out-of-this-arc -- NOT decided
here, NOT a Phase 0/3 deliverable.

**Phase:** Phase 0 (detect the oracle limitation, exclude the leg, correct
the artifacts), Phase 3 (consume the corrected reading -- KTX commands carry
no Phase-0 C3 signal; do NOT dead-stamp them).

### F-C3d -- `extract-tag --version head` does not advance from origin (latent; the Phase 5 D4 staleness walk shares it)

**Surfaced by:** the Phase 0 executor, Task 2 advisory 2026-05-17. The
re-extract subagent worked around it correctly -- fetched origin, pinned the
exact dev-head SHA, passed an explicit `--commit`; the Phase 0 oracle is
sound (orchestrator-verified live: `versions` ktx `67253dc9`, mvdsv
`18d03621`, NOT the stale `da73e06` / `f816d28`).

**Contained by:** explicit fetch + SHA-pin + `--commit` at every dev-head
re-extract; recorded in `phase-0-results.md` provenance.

**Evidence:** `extract-tag --version head` checks out the local clone's
master as-is; it does NOT `git fetch` origin first, so any step that trusts
it to "re-extract dev-head" silently extracts a stale tree.

**Risk (advisory, not arc-invalidating):** the Phase 5 D4 staleness walk
("re-dump + re-extract on every version walk", spec C3 amendment) is the
next consumer; if it assumes `extract-tag` advances it anchors staleness
against a stale tree -- a silent false-"not drifted". The mitigation is a
one-line discipline already proven in Phase 0.

**Phase:** Phase 5 (the D4 staleness-walk runbook explicitly fetches origin
+ pins the exact dev-head SHA + passes `--commit`; do not assume
`extract-tag` advances).

### Pre-dispatch holistic gate 2026-05-17 -- audit trail (Findings 2 + 3)

The gate (orchestrator pre-dispatch, whole-plan-as-one-object) returned NOT
CLEAN -- 3 mechanical cross-document propagation gaps, no design change, no
lock relitigation. **Finding 1 -> F-C1a** above (Correction 1, committed
`d0bd2068`). **Finding 2 (OQ-3 5th site):** Phase 1 MD drafter-checklist
item 3 carried the pre-correction "KTX tree-sitter vs MVDSV libclang are
DIFFERENT" falsehood -- the 5th OQ-3 propagation site; corrected 2026-05-17
(Correction 2, committed `d0bd2068`; also recorded in the Confirmed-good
CORRECTION 2026-05-17 block). **Finding 3 (resolved 2026-05-17, Correction
3):** the spec declared the "spec wins" tiebreaker but carried only the
original D2/D4/D7/D9/D11 text -- the dated amendments lived only in
`decisions.md` + the phase MDs. Applying "spec wins" literally at Phase 5 or
post-arc review would read a D4 with no owned-row guard and could un-do
F-D4a (the single most load-bearing, arc-invalidating fix in the plan).
Defused by Correction 3: a global "Amendment precedence" clause near the
spec top (the "spec wins" rule resolves spec-vs-distillation only, never
amended-vs-original) + concise mirrored dated blocks under spec
D2/D4/D7/D9/D11 (the C3 amendment + the D17 ~157->109 correction were
already mirrored -- the template pattern).

### F-C5b -- the Phase-1 `synthesized_requires_anchor` probe was specified globally; FAILs at baseline on 7 out-of-scope structural-tier rows

**Surfaced by:** the Phase 1 executor's verification discipline at
execution 2026-05-17 (the F-D4a-class catch per-phase review missed -- the
drafter verified the arc-scope origin distribution but wrote the anchor
probe globally and asserted "0 synthesized at baseline").

**Contained by:** arc-scoping the probe to the D1 configurable buckets --
the same `project IN ('ktx','mvdsv') AND type IN
('cvar','command','cmdline_param','info_key')` guard its sibling
`F1.describe_fill.origin_vocabulary` already carries (Phase-1 MD lines
279-283) + the dated decisions.md C5 clarification 2026-05-17 + the
Phase-1-MD correction 2026-05-17.

**Evidence (orchestrator-verified live 2026-05-17, docker psql -- not the
executor's word):** exactly 7 `synthesized` rows exist --
`ktx:match_event:{damage,death,pick_mapitem,pick_powerup,drop_powerup,
pick_backpack,drop_backpack}`, all `description_anchor_version IS NULL`. A
literal global probe FAILs at baseline with 7 offenders, breaking Phase-1
phase-boundary check 3 on legitimate out-of-scope data. Arc-scoped count =
0 -> vacuously GREEN exactly as the MD intends. Migrations 012 (line 114:
"match_event will populate via deriveMatchEvent origin='synthesized' in
this same arc") + 014 (NULL anchor by design, no backfill) corroborate the
rows are expected, templated, out of D1 scope (the locked structural-tier
"Confirmed-good" exclusion lists `match_events (7)`).

**Risk:** RETIRED -- adjudicated Option 1 (orchestrator, decisive: it is
the MD's own already-specified arc-scope guard + the `origin_vocabulary`
precedent, not a new design choice -- not operator-polled). Rejected:
global-minus-`match_event` (a blocklist coupled to a structural-tier type
name; the structural tier has many `synthesized`-stamping derivers per 012
-- accretes special-cases; PoSD/grug-fail).

**Phase:** Phase 1 (ship the probe arc-scoped, mirror the
`origin_vocabulary` guard), every later fill phase (re-runs it at its
boundary).

### F-C5c -- the project typecheck gate was silently vacuous for the entire describe-fill spine

**Surfaced by:** the Phase 1 executor 2026-05-17 (the F-D4a class -- a gate
that does not gate; per-phase drafting structurally missed that
`scripts/describe-fill/` was never in `tsconfig.json`'s `include`, so every
"tsc EXIT=0" on the spine was vacuous).

**Contained by:** the Executor fix in `95e8d726` (`scripts/describe-fill/**/*`
added to `tsconfig.json` include) + orchestrator ratification 2026-05-17.

**Evidence (orchestrator-verified live 2026-05-17 -- perturbation test, not
relayed):** an injected type error in
`scripts/load-knowledge/derive-entity-description.ts` was caught by the
project `tsc` (`error TS2322`, exit 2); the clean tree at `95e8d726` is
exit 0. The gate is now genuinely non-vacuous -- the per-task `tsc EXIT=0`
claims are real. `tsconfig.json` is a legitimate Files-touched (Modified)
delta not in the original phase MD.

**Risk:** RETIRED -- without the fix the entire spine (guard, schema,
probes, skill, gate, serializer) could have shipped with type errors behind
a green-but-blind gate. Now covered + perturbation-proven.

**Phase:** Phase 1 (fix landed `95e8d726`; the resuming executor's boundary
typecheck is now genuine), every later phase that runs the project tsc.

### F-D11b -- the regenerable audit-review HTML projection was not gitignored

**Surfaced by:** the Phase 1 executor 2026-05-17. `.gitignore` covered
`output/*.json` but not `output/describe-fill/*.html` -- the D11/D15
audit-review page is an emit-from-record regenerable projection (D11/D15:
never hand-maintained) and must not be committed.

**Contained by:** the Executor fix in `95e8d726` (`output/describe-fill/`
ignored) + orchestrator ratification 2026-05-17. `.gitignore` is a
legitimate Files-touched (Modified) delta.

**Risk:** low -- a committed regenerable projection would drift from the
record and violate the single-source-of-truth model. Retired.

**Phase:** Phase 1 (fix landed `95e8d726`); Phase 5 (the public projection
emitter inherits the same ignore discipline).

### F-D9a -- the shipped KTX configs are CRLF; the D9 mechanical extractor must strip trailing `\r`

**Surfaced by:** the Phase 1 executor 2026-05-17 (D19 smoke harvest). The
in-repo / nQuake `ktx.cfg` shipped configs use CRLF line endings; the
one-cvar harvest had to strip the trailing `\r` before the regex match
(handled + WHY-commented in the smoke). Ledger curation is
orchestrator-owned -- routed here + into the Phase 2 executor prompt.

**Contained by:** the Phase 2 D9 mechanical extractor + loader applying the
same trailing-`\r` strip at volume; carried explicitly into the Phase 2
executor prompt 2026-05-17.

**Evidence:** the Phase 1 smoke proved the strip is required on the real
shipped configs (one cvar). Phase 2's D9 extractor reads the SAME files for
the ~109/260 mechanical-candidate cvars; without the strip every harvested
value and every `raw_comment` carries a trailing `\r` into
`description_provenance` -- a silent data-quality defect across the whole
`shipped_doc` surface that the jsonb-not-string / provenance C5 probes do
NOT catch.

**Phase:** Phase 2 (the D9 sibling extractor + loader strip trailing `\r`
on every harvested config line before regex/persist -- a recon-note
requirement, not probe-caught).

### F-D11c -- the live `structured_choices` is a flat `[{value,label}]` array, NOT the phase-2-MD `{enum?,bitmask?}` sub-shape

**Surfaced by:** the Phase 2 executor's Concern 1 2026-05-17 (the
F-D9a / F-C1a class -- MD-text vs the live Phase-1-concretised reality;
the executor built to verified live truth and SURFACED it, did not
silently diverge).

**Contained by:** orchestrator ratification 2026-05-17 (verified live --
not relayed). NOT a `decisions.md` change: the D11 Amendment 2026-05-17
already authorizes "an additive `structured_choices` field"; the phase-2
MD Task 1/2 `structured_choices: {enum?:[{value,label}],
bitmask?:[{bit,label}]}` was a stale drafter elaboration the Phase-1
spine had already concretised.

**Evidence (orchestrator-verified live 2026-05-17):**
`apps/qw-oracle/scripts/describe-fill/review-gate.ts:83-89` LOCKS
`ProvenanceEntry.structured_choices?: Array<{ value: string; label:
string }>` -- a flat array, with its own WHY-comment citing the D11
Amendment ("absent for boolean knobs like the D19 `k_short_gib`,
present for enum/bitmask knobs"). `checkMechanicalRubric` consumes it
flat; the project `tsc` gate is non-vacuous (F-C5c) so a mismatch fails
the build. The executor realized it faithfully -- a bitmask bit-number
is carried as the `value` string. Confirmed in the live DB:
`ktx:cvar:k_noframechecks` provenance carries
`structured_choices: [{value:"0",label:"no"},{value:"1",label:"yes"}]`
(flat), the in-repo / nQuake polarity inversion preserved per-source.

**Risk:** RETIRED for Phase 2 (built to live truth, ratified).
**FORWARD (load-bearing):** Phase 3's D6-skill provenance consumption +
the D7 D11/D15 audit serializer, and Phase 5's public-projection
serializer, MUST consume the flat `[{value,label}]` shape. A serializer
written against the stale `{enum?,bitmask?}` MD sub-shape would silently
mis-render every enum/bitmask KTX cvar.

**Phase:** Phase 2 (built to live truth, ratified), Phase 3 (D6 + the
D7 D11/D15 serializer consume the flat shape), Phase 5 (public-projection
serializer consumes the flat shape).

### F-D9b -- the loader clobber-guard is a whole-record skip for terminal owned rows ("every resolved row" reads as "every NON-terminal resolved row")

**Surfaced by:** the Phase 2 executor's Concern 2 2026-05-17 (surfaced
for ratification, NOT silently applied -- the never-silently-comply
discipline; the F-C5b / F-C3c / F-D9a handling pattern).

**Contained by:** orchestrator ratification 2026-05-17 -- independently
proven the ONLY implementation consistent with the non-negotiable F-D4a
gate. NOT a `decisions.md` change: it is the faithful reading of the
phase-2 MD's "never regress a terminal evaluated state" intent; the MD's
literal "reconciles `description_provenance` on EVERY resolved row"
over-specified.

**Evidence (orchestrator-verified live 2026-05-17 -- the F-D4a proof,
not relayed):** `load-ktx-shipped-config.ts:22-33` self-documents the
WHY; `isTerminalOwned()` (`:107-113`) = `description_origin =
'synthesized'` OR (`'shipped_doc'` AND `description_verdict IS NOT
NULL`); a terminal owned row is SKIPPED ENTIRELY (no
description/origin/provenance write); `covered = filled +
skipped_terminal`. Reconciling a terminal row's provenance WOULD itself
break F-D4a: the general Task-1 enum rule emits
`structured_choices: [{0,no},{1,yes}]` from `k_short_gib`'s
`(0 = no, 1 = yes)` comment, which Phase-1's boolean smoke deliberately
omitted -- re-writing it changes the Phase-1 byte-identical owned
record. A real `re-derive --project ktx --type cvar` (260 entities) left
the owned-rows fingerprint byte-identical (`5253de8f...` before AND
after) precisely because the whole-record terminal skip leaves
`k_short_gib` untouched. The shipped_doc leg of the F-D4a guard --
load-bearing for the first time this arc -- holds.

**Risk:** RETIRED for Phase 2. **FORWARD (Phase 3):** once Phase 3
stamps a verdict on a `shipped_doc` row it becomes terminal-owned, so
any subsequent Phase-2 loader re-run SKIPS it entirely (no provenance
re-reconcile). Correct for idempotency / F-D4a, but Phase 3 OWNS
provenance integrity from the verdict-write onward -- the Phase-2 loader
will not re-touch terminal rows.

**Phase:** Phase 2 (built + ratified), Phase 3 (owns provenance
integrity once it stamps verdicts; the Phase-2 loader will not re-touch
terminal rows).

### F-D6a -- the D6 fan-out sub-agent can fabricate line/conflict claims; the dispatcher must grep-verify before persist

**Surfaced by:** the Phase 3 executor batch-1 2026-05-17 (an Opus D6
sub-agent asserted a `command_versions.source_line` off-by-one
-- 879 vs a claimed "live 880" -- with a fabricated C2-style conflict
note for the D7 tail; independent `grep -n` disproved it: live IS 879,
L1 IS 879, byte-exact across spot-checked rows -- the existing L1
citation mechanism is byte-accurate at the anchor). Caught + corrected
BEFORE persist; zero bad data reached the DB.

**Contained by:** the Phase 3 executor process control (2026-05-17,
recorded in `phase-3-executor-resume.md` + commit `34328a96`): the
two-stage review now independently `grep`s any sub-agent line/conflict
claim before persisting, and the D6 dispatch prompt was sharpened to
forbid memory-based line numbers + fabricated conflicts. Net effect
proven: batch 2 had 0 re-dispatches vs batch 1's 4. Orchestrator-
ratified 2026-05-17 (F-D4a held byte-identical across the period; no
bad data persisted -- the rigor working, not a contract gap).

**Risk:** a confabulated source-line / conflict that reaches `description`
or the D7 tail is a shipped lie (the dual of the D6 confabulation
guard). NOT Phase-3-only -- Phase 4 (MVDSV fill) fans out the SAME D6
skill over MVDSV source; without the grep-verify-before-persist gate +
the sharpened dispatch prompt it inherits the same fabrication surface.

**Phase:** Phase 3 (caught + discipline added + orchestrator-ratified
2026-05-17), Phase 4 (the Phase-4 executor prompt MUST carry the
grep-verify-any-sub-agent-line/conflict-claim-before-persist gate + the
memory-based-line-numbers-forbidden dispatch-prompt hardening).

## Boundary risks (out-of-scope items a drafter might wrongly pull in)

### F-D10b -- case-fidelity loader is a soft dependency, NOT this arc

**Boundary:** descriptions land on a key the loader currently lowercases, so
they project as `loadfragfile` not `loadFragfile`. This NEVER blocks the work;
it resolves by re-projection (zero description rework) when the tracked
mini-arc lands:
`docs/superpowers/parking/2026-05-16-l1-entity-name-case-fidelity-miniarc.md`
(loader-only fold-key column, no re-extraction). API_CONTRACTS already
documents the `entities.name_fold` any-case-in/source-case-out contract.

**Risk:** a phase drafter tries to "fix the casing" inside this arc -- scope
creep into a separate tracked mini-arc.

**Phase:** Phase 5 note only (re-projects clean when the mini-arc lands). No
phase in this arc fixes casing.

### F-D10c -- the dusty-* antilag fork extraction is a SEPARATE future arc

**Boundary:** D10's `sv_antilag` worked example surfaced a behavior/
description fork (shared entity names, divergent meaning across mainline KTX
vs `dusty-ktx`). Extracting the `dusty-*` fork into L1 is a separate future
arc, captured at `docs/superpowers/parking/2026-05-16-dusty-antilag-fork-
l1.md` + HANDOVER. This arc handles `sv_antilag` as a DUAL L1 description
(D10 meaning-conflict), it does NOT extract the fork.

**Risk:** a Phase 3 drafter tries to extract the `dusty-*` codebase -- scope
creep into a separate arc.

**Phase:** Phase 3 boundary note only (describe `sv_antilag` dual per D10; do
not extract the fork).

### F-C3b -- reachability classification is the parked libclang arc, NOT this arc

**Boundary:** C3 detection (suspect pool) is in scope. C3 classification
(genuine-dead vs build/#ifdef-excluded) needs the libclang call-graph and is
the parked arc
`docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`.
The two arcs compose via D4 trigger (f); no blocking dependency.

**Risk:** a Phase 0/3 drafter tries to classify suspects (build the
call-graph) -- scope creep into a parked arc. Suspects get the D6 truthful
dead-stamp and route to the C1 track; they are NOT classified here.

**Phase:** Phase 0 + Phase 3 boundary note (detect + stamp + route; do not
classify).

### F-D14a -- wiki-side namespace + bot write path is cross-arc, NOT this arc

**Boundary:** D14 locks the feed CONTRACT (read-only, fenced namespace,
regenerate-on-walk, stamp). The wiki-side namespace creation + bot write path
is qwiki-v1-beta / cross-arc scope, independent of the deferred qwiki Modes
Phases 5-8. This arc owns the contract; the wiki implementation consumes it.

**Risk:** a Phase 5 drafter tries to create the wiki namespace / wire the bot
write path -- scope creep into the qwiki arc.

**Phase:** Phase 5 boundary note (emit the contract + the snapshot the wiki
consumes; do not implement the wiki side).

## Confirmed-good (carry forward, do not relitigate)

- **anchor_version convention (ratified 2026-05-17, orchestrator -- Phase 1
  Open Q (e) class; reversible but arc-wide).** A `synthesized` row's
  `description_anchor_version` = the `git describe` of the loaded dev-head;
  Phase 1's `k_short_gib` = `1.47-2-g67253dc` (KTX dev-head commit
  `67253dc9`, orchestrator-verified as the loaded ktx version). Rationale:
  reproducible, human-readable release lineage + embedded SHA, directly
  comparable for the D4 staleness walk. Phase 3 (KTX) and Phase 4 (MVDSV)
  stamp this identically (MVDSV: `git describe` of its own loaded
  dev-head). `shipped_doc` rows carry NO anchor until Phase 3 evaluation
  (the F-D4a guard protects them precisely because they are anchor-less --
  no anchor conjunct). Recorded so it is not relitigated per-phase.

- **The structural tier needs no prose and is OUT of scope.** KTX
  log_templates (1195) / match_events (7) / gameplay_tables (83) /
  gameplay_taxonomies (32) / info_keys (7); MVDSV log_templates (691) /
  protocol (105) / qc_builtins (93) / info_keys (45) -- all ~100%
  structurally complete in L1, no external prose source exists for any, and
  the investigation proved they need no admin prose. Confirm-exclude; do not
  manufacture prose. (D1 + gap-findings tier-2 verdict.)
- **probe-0 N/M denominators are THE coverage gate** (C1 exhaustive). KTX
  cvars M=260, commands M=358 (311 in L1, 47 CD_NODESC), info_keys M=7 (done);
  MVDSV cvars M=183, commands M=108 (28 loader-blocked), cmdline M=11 (9 from
  `mvdsv.6`). Use these, not a hand-picked subset.
- **Canonical KTX and MVDSV are BOTH libclang/C -- the D9 shipped-config
  extractor is a NEW sibling handler (the real per-engine difference is the
  handler, NOT the parse methodology).** Phase 2 (KTX) and Phase 4 (MVDSV)
  drafters recon the actual extractor shape per engine; the D9 shipped-config
  sibling is a NEW handler distinct from the existing registration handler --
  do not fold it in. (`onboard-extractor` skill scope note;
  `project_extraction_pipeline_vision`.)

  **CORRECTION 2026-05-17 (planner, primary-source-verified at Phase 1
  review -- OQ-3 discipline; supersedes, does not silently override).** The
  original wording of this bullet asserted "KTX extractor is tree-sitter;
  MVDSV is libclang -- different methodology ... [KTX] not the libclang
  pattern." That is FALSE for canonical KTX and is the same inference-not-
  verified failure family as OQ-3. Verified live: every
  `apps/qw-oracle/scripts/extractors/ktx/_handler_*.py` (cvars:63,
  commands:88, info_keys:68, modes:90, gameplay_taxonomies:78,
  log_templates:56) imports `from clang.cindex` (libclang); `extract.py:45`
  uses `clang.cindex.Config, Index`; `apps/qw-oracle/scripts/extractors/
  CLAUDE.md:25` states "libclang for C/C++ ports (ezquake, fte, mvdsv, qwcl,
  KTX-canonical); tree-sitter is reserved for the dusty-ktx fork's qcsrc/
  (QuakeC), not yet onboarded." Tree-sitter applies ONLY to the out-of-scope
  `dusty-ktx` QuakeC fork (F-D10c), never to canonical KTX. The Phase 1
  drafter correctly surfaced this (Phase 1 MD top "Recon correction" +
  Open Q (a)) rather than consuming the wrong premise; this dated block is
  the planner acting on that surface so the Phase 2 KTX drafter prompt is
  generated against verified truth. `phase-template.md` checklist item 3
  inherited the same false phrasing and is corrected in the same commit. 5th
  OQ-3 propagation site (pre-dispatch holistic gate, 2026-05-17): the Phase 1
  MD drafter-checklist item 3 still carried this falsehood (self-contradicted
  10 lines down by the RESOLVED recon note); corrected 2026-05-17 (Correction
  2, committed `d0bd2068`) -- dated, never silently, per the OQ-3 lock.

---

## Phase ownership of findings

| Finding | Severity | Phase that must honor it |
|---|---|---|
| F-C2a (config drift real) | Grave | Phase 2 (preserve per-source), Phase 3 (flag/resolve) |
| F-C5a (no probe for 4 new shapes) | Grave | Phase 1 (tag+anchor probes), Phase 2 (provenance+jsonb probes) |
| F-D4a (derive tail clobbers owned rows) | Grave | Phase 1 (owned-row guard at the shared derive tail; dated D4 + Phase-1 scope amendment 2026-05-17), Phase 5 (consume the guard; own only the D4 report -- Task 4 rescoped) |
| F-C3a (dump contemporaneity) | DISSOLVED 2026-05-17 | Phase 0 (self-built reproducible oracle; not an active risk) |
| F-D12a (ezquake.com figure unverified) | Substantive | Phase 0 (quantify), Phase 4 (sized by it) |
| F-D12b (load-commands free win) | Substantive (positive) | Phase 0 |
| F-D11a (audit HTML generator absent) | Substantive | Phase 1 |
| F-D13a (MCP contract surface delta) | Substantive | Phase 5 |
| F-C1a (Phase-2 hardcoded M=260; Phase-0 re-baselines) | Substantive | Phase 2 (recon POST-Phase-0 M, no hardcoded 260), Phase 0 (produces the re-baseline) -- Correction 1 committed `d0bd2068` |
| F-C5b (synthesized-anchor probe was global; arc-scoped) | Substantive | Phase 1 (ship arc-scoped, mirror the `origin_vocabulary` guard), all fill phases (re-run) -- adjudicated Option 1 2026-05-17 |
| F-C3c (ktx/command C3 leg measurement-invalid; cmdlist blind to KTX mod commands) | Substantive | Phase 0 (exclude leg as NON-DIAGNOSTIC, correct artifacts -- Executor correction 2026-05-17), Phase 3 (do NOT dead-stamp KTX commands) |
| F-C3d (extract-tag head doesn't advance from origin; latent) | Advisory | Phase 5 (D4 walk: explicit fetch + SHA-pin + `--commit`) -- Phase 0 proved the mitigation |
| F-C5c (project tsc gate silently vacuous for the spine) | Substantive | Phase 1 (fixed `95e8d726`, perturbation-verified), all phases running project tsc -- ratified 2026-05-17 |
| F-D11b (regenerable audit HTML not gitignored) | Advisory | Phase 1 (fixed `95e8d726`), Phase 5 (same ignore discipline) -- ratified 2026-05-17 |
| F-D9a (KTX configs CRLF; strip trailing `\r`) | Substantive | Phase 2 (D9 extractor + loader strip `\r` before regex/persist -- recon-note, not probe-caught) -- routed from Phase 1 2026-05-17 |
| F-D11c (live `structured_choices` is flat `[{value,label}]`, not `{enum?,bitmask?}`) | Substantive | Phase 2 (built to live truth, ratified 2026-05-17), Phase 3 (D6 + D7 D11/D15 serializer consume flat), Phase 5 (public-projection serializer consumes flat) |
| F-D9b (clobber-guard = whole-record skip for terminal owned rows) | Substantive | Phase 2 (built + orchestrator-ratified 2026-05-17, F-D4a-proven), Phase 3 (owns provenance integrity once it stamps verdicts) |
| F-D6a (D6 sub-agent can fabricate line/conflict claims; grep-verify before persist) | Substantive | Phase 3 (caught + discipline added + orchestrator-ratified 2026-05-17), Phase 4 (executor prompt MUST carry the grep-verify gate + dispatch-prompt hardening) |
| F-D10b (case-fidelity soft dep) | Boundary | Phase 5 (note only) |
| F-D10c (dusty-* fork separate arc) | Boundary | Phase 3 (note only) |
| F-C3b (reachability parked arc) | Boundary | Phase 0 + Phase 3 (note only) |
| F-D14a (wiki side cross-arc) | Boundary | Phase 5 (note only) |

---

*End of risk ledger. New findings discovered during phase drafting append with
the next sequential suffix and a phase tag.*
