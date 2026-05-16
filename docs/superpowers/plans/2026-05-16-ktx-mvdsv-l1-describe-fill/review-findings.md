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
fallback (if the local fteqcc/KTX build is intractable in-loop, revert to
fetch-forward-source + the production dump under the original date-proximate
caveat -- the now-dissolved approach becomes the safety net).

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
- **KTX extractor is tree-sitter; MVDSV is libclang -- different
  methodology.** The D9 KTX sibling extractor for shipped-config is a NEW
  handler, not the registration handler, and not the libclang pattern. Phase 2
  (KTX) and Phase 4 (MVDSV) drafters must recon the actual extractor shape per
  engine; do not assume a shared scaffold. (`onboard-extractor` skill scope
  note; `project_extraction_pipeline_vision`.)

---

## Phase ownership of findings

| Finding | Severity | Phase that must honor it |
|---|---|---|
| F-C2a (config drift real) | Grave | Phase 2 (preserve per-source), Phase 3 (flag/resolve) |
| F-C5a (no probe for 4 new shapes) | Grave | Phase 1 (tag+anchor probes), Phase 2 (provenance+jsonb probes) |
| F-C3a (dump contemporaneity) | DISSOLVED 2026-05-17 | Phase 0 (self-built reproducible oracle; not an active risk) |
| F-D12a (ezquake.com figure unverified) | Substantive | Phase 0 (quantify), Phase 4 (sized by it) |
| F-D12b (load-commands free win) | Substantive (positive) | Phase 0 |
| F-D11a (audit HTML generator absent) | Substantive | Phase 1 |
| F-D13a (MCP contract surface delta) | Substantive | Phase 5 |
| F-D10b (case-fidelity soft dep) | Boundary | Phase 5 (note only) |
| F-D10c (dusty-* fork separate arc) | Boundary | Phase 3 (note only) |
| F-C3b (reachability parked arc) | Boundary | Phase 0 + Phase 3 (note only) |
| F-D14a (wiki side cross-arc) | Boundary | Phase 5 (note only) |

---

*End of risk ledger. New findings discovered during phase drafting append with
the next sequential suffix and a phase tag.*
