# KTX / MVDSV L1 describe-fill -- locked cross-cutting decisions

These choices apply to every phase. They are NOT open questions; they are
commitments locked by the arc-brainstormer multi-pass (5 passes, EXIT
2026-05-16). If any phase needs to deviate, surface a "deviation" section at
the top of that phase MD and stop for operator review. Mid-arc amendments land
here as dated amendment blocks under the original decision; never silently
override in a phase MD, never silently comply with a planning direction that
contradicts a lock.

**Source of truth is the spec, not this file.** The full rationale, the
worked examples (`sv_antilag`, `k_noframechecks`), the pass-close carry-forward
tracks, and the amendment lineage live in
`docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`. This
file is the phase-facing distillation: the locked call in plain English, what
it means for a phase MD, and what NOT to do. When this file and the spec
disagree, the spec wins and this file is the bug -- fix it here, do not drift
in a phase MD. Numbering (C1-C5, D1-D18) is preserved from the spec verbatim so
cross-references hold; do not renumber.

This arc has **no prior monolithic plan**. It is born from a brainstorm spec,
not a legacy-plan rewrite. `review-findings.md` is therefore a risk /
carry-forward ledger, not a defect audit -- read it alongside this file.

---

## Project invariants (P-series -- not in the spec D-list; every phase respects)

These are monorepo + qw-oracle always-on rules. They are not arc decisions
(the spec does not number them) but they are cross-cutting and a cold phase
drafter must respect them. P-prefixed so they never collide with the spec's
C/D numbers.

### P1. qw-oracle is Postgres + Bun; SQLite era is over

**Decision:** Authoritative store is PostgreSQL 16 + pgvector + tsvector,
single engine across L1/L2/L3. Every script (loader, extractor adapters,
embed, serializers, probes) runs under **Bun**. Schema changes are
**append-only** `db/migrations/<NNN>_<name>.sql` applied by `bun db/migrate.ts`;
never edit an applied migration; update `SCHEMA.md` alongside.

**Why:** qw-oracle Arc 1 ended the SQLite era
(`docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md`).
`apps/qw-oracle/CLAUDE.md` "Always-on rules".

**Implication for phases:** `bun install` not npm in `apps/qw-oracle/`
(the `@qw/version-resolution: workspace:*` dep makes npm fail). CLI scripts
use `bun scripts/.../index.ts` with `import.meta.main` guards (Bun-only;
under Node they silently no-op). New schema fields (D2/D11) ship as a numbered
migration + `SCHEMA.md` update in the same commit. Do NOT hand-type a schema
edit into an applied migration.

### P2. JSONB columns receive JS values, never pre-stringified JSON

**Decision:** Pass JS arrays/objects directly to postgres-js (or wrap with
`tx.json(...)`). Pre-stringifying stores a JSONB string scalar -- the
legacy SQLite-era TEXT bug.

**Why:** `reference_postgres_js_jsonb_binding`; regression gate
`F1.jsonb_columns_not_strings`. The D9 structured choices and D11 retained
provenance are JSONB -- this is the live failure mode for both, and C5
mandates a probe for it.

**Implication for phases:** any phase writing structured choices, retained
multi-source provenance, or the verdict/reasoning trail (Phases 1, 2, 3, 4)
binds JS values directly and extends the `F1.jsonb_columns_not_strings`
probe to the new columns (C5).

### P3. Source citation discipline; idempotent extractors

**Decision:** Every L1 row that can carry a `source_ref` must. Layer 1
extractors are idempotent -- re-running against the same tag produces the
same rows. Regression guards (the >50% entity-count-drop abort) are
load-bearing; do not bypass with `--force` without an explicit logged reason.

**Why:** `apps/qw-oracle/CLAUDE.md` "Always-on rules"; this is the existing
mechanism D6's `source_ref` evidence requirement reuses (no new citation
format -- D6 says so explicitly).

**Implication for phases:** the D9 mechanical extractor and the D6 synthesis
skill both emit `source_ref` file:line on every row; neither invents a new
citation format. C4 (repair by re-extract) depends on idempotency holding.

### P4. Git: main-tree, commit-to-main, no PR/worktree ceremony

**Decision:** All work in the main tree on `main`. Commit after each
meaningful change. No worktree, no PR menu, no 4-option finish menu. Tag the
arc ship `git tag -a arc-ktx-mvdsv-l1-describe-fill-shipped`.

**Why:** monorepo `CLAUDE.md` "Git workflow" + "Superpowers skill overrides";
`feedback_worktree_per_terminal`. This OVERRIDES
`superpowers:finishing-a-development-branch` and
`superpowers:using-git-worktrees`.

**Implication for phases:** phase MDs do not include worktree setup, branch
ceremony, or PR steps. Each phase ends with a commit on `main`. Executor
terminals commit directly; orchestrator pushes at checkpoints.

### P5. ASCII-only output discipline in committed docs and code

**Decision:** ASCII only. No emoji. ASCII hyphen-minus, never em-dash or
en-dash. No marketing voice. Code comments explain WHY, not WHAT.

**Why:** `feedback_output_discipline_sentiment`; enforced because the operator
runs docs-check-style validation that false-positives on these patterns.
Natural voice is fine in live conversation; this rule is about committed
artifacts.

**Implication for phases:** every phase MD, every generated doc, every
committed code comment is ASCII. The D14 wiki feed, the D15 review page, the
D16 showcase are generated artifacts -- their generators emit ASCII.

---

## C1 -- Completeness is non-negotiable; "undocumented" never means "unimportant"

**Decision:** Close the entire residue (the ~13% KTX-command gap, the cvar
NULLs, the MVDSV tail) into a complete documented baseline. No phase may
scope-cut residue on an importance argument. Genuinely not-source-legible
residue still gets a row and routes to the C1 community-outreach track -- it
is tracked, not dropped.

**Why:** `feedback_exhaustive_mapping`; the operating theory that undocumented
== unimportant is explicitly distrusted. Spec C1.

**Implication for phases:** the exhaustive denominator (probe-0 N/M) is the
coverage gate, not a hand-picked subset. A phase that proposes "skip the bot
cvars / skip the MVDSV tail because they don't matter" is in violation --
surface it as a deviation, do not silently comply. Residue is a tracked
disposition (the C1 outreach track), never a silent drop. Pairs with D8
(bot/judgment cvars get mechanism-only descriptions and count as complete).

## C2 -- Clear discrepancies are flagged for manual operator review, never auto-resolved

**Decision:** Config-vs-config (nQuake vs in-repo), comment-vs-observed-
behavior, config-vs-source, and the C3-added config-sets-a-runtime-dead-cvar
class: a clear conflict is surfaced to the operator with source evidence, not
silently picked.

**Why:** Spec C2. There WILL be conflicts (probe-3 found concrete value +
polarity drift). Auto-resolution would encode one distribution's opinion as
universal fact.

**Implication for phases:** Phase 2 (mechanical extract) preserves every
contributing source as data (one record per cvar+file) so a conflict CAN be
flagged. Phase 3/4 resolve meaning-conflicts inline at the D7 review tail with
source evidence in hand -- no separate conflict queue. D10 designs the
concrete three-class policy on top of this; C2 is the constraint, D10 the
mechanism.

## C3 -- Presence is not liveness; L1 never asserts function for a runtime-dead knob

**Decision:** A symbol the source registers is not thereby alive. Detection
("registered in source, absent from a running build") is cheap and consumed
here, not built here: clean the operator-captured `qw-1.log` runtime dump
(2026-04-27; KTX 1.47-dev + MVDSV 1.20-dev, Apr 11 2026 build) and diff vs the
same-version L1 extract to yield a **suspect pool, never a verdict**.
Classification (genuine-dead vs build/#ifdef-excluded) needs the libclang
call-graph and is OUT of scope (parked arc). Date-proximate pinning is
sufficient for this arc; a mispin costs one human glance, never a shipped lie.

**Why:** Spec C3; primary-source-verified blind spot (`sb_qtvlist_url`);
`reference_qw_oracle_extraction_liveness_gap`. Detection is a hard
prerequisite for the synthesis/describe phases only; the mechanical-extract
tier is liveness-agnostic and is not gated by it.

**Implication for phases:** Phase 0 produces the suspect pool (the diff).
Phase 3/4 synthesis is gated by it: a suspect-pool knob does NOT get a
confident "tunes X" description -- it gets the D6 truthful stamp ("registered
in KTX/MVDSV source at version N; not reachable in a running build at this
commit; appears non-functional, candidate upstream code bug") and routes to
the C1 outreach track. Phase 2 (mechanical extract) is NOT gated by C3.
C3 amends D4 (new drift trigger f), D6 (confabulation-guard sibling), C2 (new
conflict class) -- those amendments are reflected in D4/D6 below.

**Amendment 2026-05-17 (operator decision, Phase 0 review -- mirrors the spec
C3 amendment; spec is source of truth, this is its phase-facing
distillation):** C3's detection input is self-generated and reproducible, NOT
a frozen third-party capture. Phase 0 fetches the dev-head clones forward,
builds mvdsv + ktx (BOTH are C, BOTH build via CMake -> the `mvdsv` binary +
the `qwprogs.so` mod it loads; NO QuakeC, NO fteqcc -- corrected 2026-05-17
per OQ-3; "QuakeC via fteqcc -> qwprogs.dat" was a planner inference error,
never source-verified, and describes the out-of-scope dusty-ktx fork shape),
runs a local `mvdsv +gamedir ktx` server to capture a fresh
`cvarlist`/`cmdlist` dump of that exact build, and re-extracts L1 from the
same commit. Source
extract + runtime oracle + describe-fill substrate are then ONE build -- the
contemporaneity problem is dissolved by construction (no caveat, no
date-proximate pinning, no "fresh dump at the OLD commit"). Rationale: QW
servers run dev-head, not tagged releases (latest KTX release 1.46/Sep-2025
is OLDER than our clone), so the KB must track dev-head or it describes
config nobody deploys. **F-C3a is DISSOLVED** (contemporaneity is structural,
not a risk). **F-C3b STILL STANDS** (detection only; classification of
genuine-dead vs build-excluded remains the parked arc -- a local build can
build-exclude symbols, which is exactly what C3 defers). The 2026-04-27
production dump is retained as a secondary real-deployment cross-check.
Documented fallback so the arc is never blocked: the only missing build tool
is `cmake` (apt-installable, Task-0-shaped; gcc/make/git/bun/python3
present); if `cmake` cannot be obtained in-loop or the server harness is
intractable, fall back to fetch-forward-source + the retained production dump
under the original date-proximate caveat. **Implication for phases:** Phase 0's C3 task is now
build-and-self-dump-and-re-extract-forward (a substantive revision of the
drafted Phase 0 MD's Task 2/3 -- the Task 1 load-commands free win is
unchanged). Phase 1/2 recon against the post-re-extract baseline (probe-0
denominators re-derive from the fresher source -- correct by C1). The
build commit is recorded as provenance (reproducible oracle). D4
staleness-cadence rethink is a Phase 5 wiring concern (flagged, not
blocking).

## C4 -- Repair by re-running the corrected pipeline, never a one-off SQL patch

**Decision:** When any phase discovers a pipeline bug (extractor, loader,
synthesis skill, projection serializer) corrupted committed rows, correct the
code and re-run the affected extracts/loads end-to-end. Never a targeted
`UPDATE` that patches the visibly-wrong rows in place.

**Why:** `feedback_repair_by_reextract_not_sql_update`; real incident
2026-05-02. A hand-patch only repairs noticed damage; the same bug typically
re-shaped unnoticed rows too. Spec C4 generalizes D9's idempotent-re-extract
to every tier this arc touches (synthesis rows, retained provenance, staleness
anchors, projections).

**Implication for phases:** every phase that writes rows depends on idempotent
re-run (P3). Recovery sections in phase MDs say "re-run the corrected
pipeline," never "UPDATE the bad rows." Narrow logged exception only when
re-extract is genuinely impossible (source artifact lost / non-deterministic
generator); totals re-verified against pre-fix baseline.

## C5 -- Every new data shape earns an F1 quality-grid probe, phase-boundary gate

**Decision:** This arc adds four data shapes no existing regression probe
watches: (1) owned description text, (2) origin tag
(`source_inline`/`synthesized`/`shipped_doc`), (3) retained multi-source
provenance (D11), (4) synthesized-description anchor version + staleness flag
(D2/D4). Each earns at least one F1 probe that fails loudly on its structural
failure mode. A shape's probe lands in the **same phase that first writes that
shape** -- not a final-phase afterthought.

**Why:** Spec C5. An honesty guarantee nothing mechanically enforces is
hollow; silent drift in any of the four ships unnoticed to every consumer.

**Implication for phases:** Phase 1 writes the schema fields -> Phase 1 ships
the origin-tag-vocabulary probe and the synthesized-needs-anchor probe.
Phase 2 first writes `shipped_doc` + retained provenance -> Phase 2 ships the
provenance-entry-exists and jsonb-not-string probes (extends P2's existing
`F1.jsonb_columns_not_strings`). The concrete probe SQL is planner/executor
scope; the gate placement is locked. A phase that introduces its data shape
without its probe is incomplete.

**Clarification 2026-05-17 (orchestrator, Phase 1 execution -- the locked
reading, not a change; the C5 honesty probes are arc-scoped).** "Four data
shapes THIS ARC adds" is arc-scoped by construction: the C5 probes gate the
D1 configurable buckets this arc owns -- `project IN ('ktx','mvdsv') AND
type IN ('cvar','command','cmdline_param','info_key')`, the same predicate
`F1.describe_fill.origin_vocabulary` already uses. Pre-existing
structural-tier `synthesized` rows (the 7 `ktx:match_event:*`, templated by
`deriveMatchEvent`; `description_anchor_version` NULL by design per
migrations 012/014; out of D1 scope -- the locked "Confirmed-good"
structural-tier exclusion) are NOT a shape this arc adds and MUST NOT gate
its phase boundary. The Phase-1 MD's `synthesized_requires_anchor` step had
been written globally with a "0 synthesized rows at baseline" claim (false:
7 exist; orchestrator-verified live 2026-05-17) -- a drafter slip the Phase 1
executor's verification discipline caught and the orchestrator adjudicated
(arc-scope it: it is the MD's own already-specified guard, not a new
choice). Tracked: review-findings F-C5b. Cross-cutting (Phase 1 ships the
probe; every later fill phase re-runs it). Not a lock change -- C5 + D1
already entail arc-scope; recorded so it is not relitigated.

---

## D1 -- Data boundary: configurable buckets only; no L3 prose

**Decision:** Fill descriptions for every configurable bucket -- cvars,
commands, cmdline params, info_keys -- for KTX and MVDSV, including every
mode-related knob (cvars/commands an admin sets to run/tune a mode). Do NOT
write the gameplay story of a mode (that is L3, the separately-docketed
game-mode arc). The 27 `game_mode` + 317 `mode_default` `gameplay_mechanics`
rows are OUT of scope -- they are not a bucket of knobs; an overlay row points
at a cvar that IS in the cvar bucket and gets its description here.

**Why:** Spec D1; single source of truth, no dual maintenance. Mode narrative
is L3 prose written once as a concept note that cites these L1 cvars.

**Implication for phases:** the provenance schema (D2/D11) governs the
`entities` table descriptions only (KTX/MVDSV cvars, commands, cmdline params,
info_keys). It does NOT model provenance for `gameplay_mechanics` (no
`description_origin` column there -- structurally extracted). No phase writes
mode-narrative prose into L1. Nothing falls through: every actual knob is a
cvar/command this arc describes.

## D2 -- Origin-state model: create the user-doc track KTX/MVDSV never had

**Decision:** ezQuake is the only engine with a user-doc track (help-JSON).
KTX/MVDSV have only dev code comments. This arc creates the missing owned
user-doc track in qw-oracle L1. Origin states: `source_inline` (a KTX/MVDSV
dev wrote it as a code comment -- the only source surface, labeling it
`source_inline` is correct, NOT the ezQuake comment-promotion bug because
there is no separate user-doc field to launder into); one NEW tag for
mechanically-lifted-from-a-shipped-human-file (label locked at D11 =
`shipped_doc`; which file is a provenance field, not its own tag);
`synthesized` (LLM-written from code behavior) PLUS two per-row fields built
now -- anchor version + re-review flag; opinion has no tag (absent from L1).

**Why:** Spec D2; `reference_ezquake_dual_doc_model`. It is NOT a docs.json
clone: it is the track PLUS provenance discipline, built to graduate upstream
(D3 path), not fork forever.

**Implication for phases:** Phase 1 ships the schema fields (origin tag
vocabulary `source_inline`/`synthesized`/`shipped_doc`; anchor version;
re-review flag) as a numbered migration (P1). The upstream-frozen marker is
NOT a column (D3 deferred). FTE/QWCL are later arcs on the same pattern --
do not build for them here.

**Clarification 2026-05-17 (verified live state, Phase 0 review -- not a lock
change):** `entities.description_origin` ALREADY EXISTS and already carries
the vocabulary `{help_json, source_inline, synthesized}` (ezQuake's
`help_json` is legitimate and pre-existing, exactly as D2/D11 say). So Phase
1's migration EXTENDS the existing column to add `shipped_doc` plus the new
anchor/re-review/retained-provenance/verdict-trail fields -- it does NOT
create `description_origin`/`description`/`name_fold` from zero (those three
all exist today). The C5 origin-tag-vocabulary probe must therefore permit
the full four-set `{help_json, source_inline, synthesized, shipped_doc}`, not
just the three this arc writes. Cross-cutting because the Phase 1 C5 probe
and every Phase 2/3/4 origin-tag write depend on it. Routed from Phase 0
OQ-2.

## D3 -- Upstream graduation deferred to a future deliberate procedure

**Decision:** Graduation (synthesized text adopted upstream, then de-duplicated
so it cannot echo back as independent source truth) stays in the locked model
but its infrastructure is NOT designed or built in this arc. The only hook
built now: `synthesized` is a distinct tag carrying an anchor version, so a
future procedure can identify "these are ours, written against version X."
No upstream-frozen column, no content-hash ledger now.

**Why:** Spec D3. Nothing can self-echo until the operator presents to the
KTX/MVDSV dev group and a deliberate manual adoption runs -- building the
guard now is infrastructure for an event that may not happen.

**Implication for phases:** no phase builds a freeze marker, a content-hash
contribution ledger, or an adoption procedure. The D2 `synthesized` tag +
anchor version + D11 retained provenance ARE the non-boxing hook -- that is
all D3 needs from this arc. Phase 6 (upstream pitch) NAMES the freeze
requirement; it does not design it.

## D4 -- Staleness = a walk-time report, operator-reviewed in-terminal

**Decision:** Each synthesized description stores its anchor version. The
per-version re-extract/ingest (already runs on a new KTX/MVDSV walk) compares
each synthesized description's knob vs its anchor and produces a walk-time
report: Drifted / Added / Removed. Drift triggers (tight, nothing looser):
(a) default changed; (b) type changed; (c) valid-values/enum set changed;
(d) knob retired/renamed; (e) a genuine upstream source comment newly
appeared; **(f -- added by C3) reachability classification changed**.
Read-site moves / cosmetic refactors are explicitly NOT triggers. Operator
reviews the report in-terminal at walk time (Claude proposes, operator
approves). A flagged description keeps serving, stamped "may be stale as of
version X" -- stale-but-present beats a hole.

**Why:** Spec D4 (+ C3 amendment adding trigger f). Cadence ~1-2 review
events per engine per year (KTX ~1 release/yr, MVDSV ~1-2/yr) -- sustainable.

**Implication for phases:** Phase 5 wires the walk-time report into the
new-version runbook. It is a manual confirm-or-rewrite pass, operator-paced,
NOT auto-edit and NOT a notification system. The report composes with the
parked reachability arc via trigger (f) -- no blocking dependency. A visual
monitoring website is a future non-blocking hook, NOT this arc.

**Amendment 2026-05-17 (planner, Phase 5 review -- retroactive
Phase-1-spine scope; the F-D4a fix; this AMENDS approved-Phase-1 +
Phase-5 scope -- the D8-amendment-class precedent, NOT a silent override).**
Primary-source-verified (planner cold-review + the Phase 5 drafter's
independent recon, agreeing): the shared
`apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts` tail
(all 13 per-type derivers; called every walk/load via `index.ts:679`)
UNCONDITIONALLY recomputes `description`+`description_origin` from the
freshly-walked source columns for every entity at the walked version, with
NO owned-row guard. D4 ("a flagged description keeps serving, stamped may
be stale as of version X") is impossible unless the walk stops clobbering
the owned rows. The owned-row guard is therefore NOT Phase-5-only: it must
exist BEFORE Phase 2 writes the first owned row, because Phase 2/3/4
C4-recovery re-runs AND Phase 4's own idempotency contract re-run the load
path (-> the derive tail), so a Phase-5-only guard lets any interim
re-extract destroy Phases 2-4's owned record and makes the per-phase
DB-state verification regime silently unsound. **Locked:** the owned-row
guard is a **Phase-1-spine deliverable** (engine-agnostic, built once,
both engines + the staleness walk ride it; added as a dated Phase-1-MD
task) -- in EACH of the four arc-bucket derivers (cvar / command /
cmdline_param / info_key) the `UPDATE` excludes rows where
`description_origin IN ('synthesized','shipped_doc')` (owned-track
membership ALONE -- NO `AND description_anchor_version IS NOT NULL`
conjunct: a staged `shipped_doc` row carries no anchor until Phase 3 and
MUST still be protected; affirmed `source_inline` rows are deliberately
NOT guarded -- they came from source, re-derive is idempotent, and a newly
changed source comment is D4 trigger (e)). ezquake/fte/qwcl rows are
unaffected (not owned-track). Phase 5 CONSUMES the Phase-1 guard and owns
ONLY the D4 walk-time Drifted/Added/Removed report + setting/serving
`description_rereview` + the "may be stale as of X" stamp;
`derive-entity-description.ts` moves out of Phase 5's Files-touched into
Phase 1's. Phase 1's draft + Phase 5's Task 4 are stale-pending this
amendment (re-drafted from it; Phase 1 is paper -- amended pre-execution,
never drifted). Tracked: review-findings F-D4a. Cross-cutting (Phase 1
builds it; Phases 2/3/4 depend on it for C4-recovery + idempotency safety;
Phase 5 consumes it).

## D5 -- Quality bar + cheap-classify triage; evaluate every entity (amended)

**Decision:** A description is good enough when it: (1) says WHAT the knob
does in admin-observable terms, not WHY the code does it; (2) is not a
restatement of the knob's name; (3) spells out units/enum meanings; (4) is
mechanism only -- no recommended value, no opinion; (5) is self-contained
without reading source. **Amendment (locked):** a trailing comment does NOT
place an entity in a "documented/done" bucket. EVERY entity -- with or without
a comment -- is evaluated. The existing comment is one input, never a verdict.
Comment reads as a genuine user description -> adopt it, tag stays
`source_inline` (affirmed-by-evaluation, not skipped). Comment is
dev-rationale/weak/absent -> synthesize -> `synthesized` + anchored. The
cheap-classify step routes EFFORT (good comment = fast affirm; weak/absent =
full synthesis); it does NOT exempt anything from evaluation.

**Why:** Spec D5 + the post-close amendment. Coverage = "every entity
evaluated and carrying an owned affirmed-or-synthesized description," never
"had a comment so counted." Reinforces C1 and the dual-doc model.

**Implication for phases:** Phase 3 (KTX) and Phase 4 (MVDSV) run every
in-scope entity through the D6 skill's keep-vs-synthesize judgment. No phase
may treat "has a trailing comment" as "done." The D5 triage sizes effort, not
scope. The "clears the bar -> kept as-is, no rework" phrasing in the original
D5 is SUPERSEDED by the amendment -- use the amended rule.

## D6 -- Synthesis is a guardrailed per-knob skill

**Decision:** Judgment + synthesis is a dedicated per-knob skill on the
`asset-type-curate`/`guide-rewrite`/`validate-extractor` precedent (hard
pre-flight, enforced rules, sub-agent fan-out). It hard-codes: the D5 rubric
as the keep-vs-synthesize judgment; the read-site-grounding method (input is
code use-sites, never the knob name); the evidence requirement (`source_ref`
file:line + anchor version on every synthesized row, reusing existing
mechanisms -- no new citation format, P3); the hard confabulation guard (not
source-legible -> hedge or route to residue, never guess). **C3 sibling:** a
suspect-pool knob gets the truthful dead-stamp, not a confident description.
**Amendment:** the landscape research docs are admissible AIDS (locate
use-sites, corroborate) -- source stays ground truth, the committed
`source_ref` + anchor remain the evidence.

**Why:** Spec D6 (+ C3 sibling + research-docs amendment).

**Implication for phases:** the skill's prose / pre-flight / fan-out wiring is
**Phase 1 deliverable** (built once, both engines ride it). Phase 3/4 fan out
over it. The skill is the unit later phases dispatch. Research docs speed and
cross-check; they are not a substitute citation.

**Amendment 2026-05-17 (orchestrator, Phase 3 mid-loop -- operator-directed
fan-out cost re-shaping: the parameterized-family lane. GOVERNS the
D7-clarification phrase "ONE guarded D6 invocation per knob" per Amendment
precedence. Ratification: see the Ratification line at the end of this
block).**

Context: the naive 1-knob-per-Opus-MAX volume fan-out costs ~55-70k tokens
and one sub-agent/terminal cycle PER knob (the surfacing terminal hit 400k
after 2 batches). A measurable slice of the in-scope set is not heterogeneous
knobs but *provable parameterized twins* -- one behaviour parameterized by one
literal, same handler, contiguous registration. Re-deriving identical
read-site judgment per twin is exactly the waste D5's cheap-classify principle
authorizes routing away from -- applied at family granularity. NOT a model
downgrade, NOT a scope cut.

1. **Trigger -- provable twins only.** A set of in-scope knobs is a family iff
   source-grep (NOT name-clustering) confirms: same handler function, same
   registration shape, contiguous registration block, differing only by one
   literal arg (the parameter axis). Detected from the Task-1 manifest
   `source_ref` + a grep of the live registration table at the anchor
   (`67253dc9`).
2. **One Opus-4.7-MAX family evaluation** establishes (a) the shared
   mechanism, read-site-grounded against the shared handler; (b) the parameter
   axis (what each member's literal selects); (c) the explicit per-member
   parameter list. This eval IS Opus-4.7-MAX -- the D6/D7 dial is NOT lowered;
   the family is the unit, not the knob.
3. **Per-member binding stays mandatory + independently verified (the safety
   property).** Each member's record = the family template with its parameter
   substituted AND its source binding confirmed mechanically: the member's
   registration row exists at its manifest `source_ref`, dispatches the SAME
   handler, with the expected literal. Cheap (grep/Sonnet), NOT Opus
   re-derivation. This is the ONLY "cheap" step -- exactly D5/D7's "cheap =
   effort routing, never a cheaper model for the judgment."
4. **False-twin divergence-catch -- a HARD BLOCKING GATE, not a formality.** A
   member whose grepped binding does NOT fit the template (different handler,
   different arg pattern, or a real distinct shipped/source comment) is
   EJECTED from the lane and runs the full per-knob Opus-4.7-MAX path. "Looks
   like the family, ship it" is forbidden; this preserves the
   never-assert-unverified core (the F-C3c / `sb_qtvlist_url` precedent).
   Realized during this recon (proof the catch is load-bearing, not
   ceremony): `src/bot_commands.c`'s 39 `Frogbot*` sub-commands are
   name-clustered but 39 DISTINCT handlers -> NOT a family, stay per-knob; and
   the `UserMode` family would have been undercounted by 9 by name-regex
   (`ffa/ctf/hoonymode/blitz2v2/blitz4v4/xonx/wipeout/carena/tot` share
   `DEF(UserMode)`) -- only source-grep yields the true family.
5. **Everything else is unchanged.** Heterogeneous knobs, shipped_doc
   candidates, C2 meaning-conflict candidates, residue/hedge keep per-knob
   Opus-4.7-MAX (the spec's deliberate price -- D7). Every family member still
   ends as its OWN owned row with its OWN verdict + D7 tier-1 re-check +
   anchor + `source_ref` via the existing `*_versions` mechanism; C1 M
   denominator unchanged; the flat `structured_choices` shape (F-D11c)
   unchanged. The lane de-duplicates *authoring effort*, never scope, rows,
   verdicts, or rigor.

**The taxonomy is THREE-way, not two (operator-surfaced 2026-05-17 from the
verdict-stamped sample; locked in the intent doc ORCHESTRATOR ADDENDUM).**
Treating a category-3 cohort as category-2 twins is a QUALITY REGRESSION
disguised as efficiency (38 templated lines where 38 distinct knobs each need
individual source-grounding). The discriminator is the per-member source
binding; the divergence-catch is a CLASSIFIER, not only a safety net.

1. **Heterogeneous individual** -> per-knob Opus-4.7-MAX, the proven loop,
   UNCHANGED (e.g. `allow_timing`, `k_admincode`, `k_noframechecks`,
   `autotrackktx`). 512 / 624 in-scope; 508 / 598 remaining.
2. **Index-twin family** -> the family lane: ONE Opus-4.7-MAX family eval
   (dial NOT lowered) + N cheap per-member index substitutions + the hard
   binding-divergence catch. Members differ ONLY by a positional
   integer/slot, SAME handler, SAME semantic role; the single eval enumerates
   each member's meaning (UserMode's per-preset names are in that one eval's
   member list -- still ONE eval, not N).
3. **Namespace cohort** -> NOT the twin lane, EVER. Shared prefix,
   SEMANTICALLY DISTINCT members each binding a different source variable +
   computation. `k_fbskill_*` is the live case (38: `aim_accuracy` /
   `reactiontime` / `missiledodge` / `wiggleframes` / `vol_oppvel_incr` ...;
   the `k_fbskill_` prefix is a red herring). The hard catch applied as a
   CLASSIFIER: feed a cohort to the twin lane and ESSENTIALLY ALL members
   fail the binding check -- that mass-rejection IS the signal it is
   category 3; route the whole cohort OUT (never "force the family").

Real category inventory (source-grep-verified at `67253dc9`, keyed off the
Task-1 manifest canonical_ids -- REPLACES the ~80-120 estimate; reconciles
624 = 512 + 74 + 38, 598 remaining = 508 + 53 + 37):

| Category | Members (in-scope) | Done | Remaining | Handling |
|---|---|---|---|---|
| 1 -- heterogeneous individual | 512 | 4 | 508 | per-knob Opus-MAX (unchanged) |
| 2 -- index-twin (6 families) | 74 | 21 | 53 | the family lane |
| 3 -- namespace cohort `k_fbskill_*` | 38 | 1 | 37 | NEVER twin; see below |

Category-2 index-twin families: xfav_go `DEF(xfav_go)` slot 1..20 (20; 15
done), favx_add `DEF(favx_add)` slot 1..20 (20), UserMode `DEF(UserMode)`
preset 1..17 (17; 6 done -- name-regex would undercount this by 9, only
source-grep yields it), TimeSet `DEF(TimeSet)` min 5..30 (6), ksound
`DEF(TeamSay)` slot 1..6 (6), ChangeDM `DEF(ChangeDM)` 1..5 (5). The 22
already-done laneable members (21 cat-2 + 1 cat-3) are correct + carried
(idempotent; NOT redone).

**Category-3 handling -- the OPEN ratification choice (the only LOCK is:
NEVER twin-collapse a cohort).** Option (a) **pure per-knob Opus-MAX** --
treat the 38 exactly as category 1 (max safety, zero efficiency gain).
Option (b) **cohort-scaffold lane** -- ONE Opus-4.7-MAX pass establishes the
shared scaffolding ("all `k_fbskill_*` are frogbot skill-tuning cvars, read
by the bot AI at <sites>, scaled by bot skill, mechanism <X>"), then EACH of
the 38 still gets an INDIVIDUAL source-grounded description (its specific
variable + effect) -- cheaper because the shared mechanism is not re-derived
38x, but with NO semantic collapse. D5-faithful effort-routing distinct from
both pure per-knob and index-twin substitution; the D8 mechanism-only bar is
unchanged (each member still its own source-grounded mechanism line). Sub-
namespaces (`k_fbskill_aim_*` 12, `k_fbskill_vol_*` 12, other 14) are still
cohorts not twins; a scaffold may be one cohort-wide pass or per-sub-
namespace. The executor sizes/builds per the ratified option.

Process-quality validation (orchestrator-verified 2026-05-17, grounds "rigor
is fine, only efficiency was wrong"): the calibration individuals spot-checked
3/3 citations EXACT against live KTX source incl. the D10 canary
`world.c:1862` (`framechecks = bound(0, !cvar("k_noframechecks"), 1)`); F-C3c
held (`autotrackktx` source-described, weak `CD_AUTOTRACKKTX` rejected, NOT
dead-stamped); the D10 meaning-conflict was detected + source-tiebroken +
surfaced for the D7 tail; F-D6a held (no fabricated citations). The expensive
per-knob process is WORTH it on real knobs -- the lane removes only
twin/cohort waste, never rigor.

Robustness rules carried into the lane build (recon-surfaced):
- The per-member binding verifier keys off the manifest `canonical_id`
  (loader-lowercased per F-D10b: source `"XonX"` -> `ktx:command:xonx`), NOT a
  reconstruction from the source name string -- else a real member
  false-ejects (a false-negative divergence). Case-insensitive match
  (operator no-case-sensitivity principle).
- F-D6a applies in full: any sub-agent line/handler/conflict claim is
  independently grep-verified BEFORE persist; the family eval's per-member
  parameter list is grep-checked against the live registration table at
  `67253dc9`. The lane does not relax the grep-verify-before-persist gate; it
  concentrates it (one family eval to verify + N cheap binding checks vs N
  independent Opus claims).

**Why:** D5 (cheap-classify routes EFFORT, not scope) at family granularity;
faithful to D6/D7 (the index-twin family eval is Opus-4.7-MAX; the only
"cheap" step is the mechanical per-member binding verify -- D5/D7-sanctioned
effort-routing, not a model downgrade) and D8 (category 3 is NEVER
twin-collapsed; whichever cat-3 option is ratified keeps the D8
mechanism-only bar per-member -- D8 is not weakened, and an undetected
cohort-as-twin would have BREACHED it, which is why the catch is a
classifier). `feedback_cheap_probes_inform_expensive_passes` (family/cohort
eval = the deliberate expensive pass; binding verify = the cheap confirm +
the category classifier), `feedback_be_decisive`, `feedback_no_case_sensitivity`,
F-D6a, F-D11c, F-D10b.

**Implication for phases:** Phase 3 -- a fresh executor terminal (AFTER
operator ratification) builds the category-2 index-twin family lane beside
the proven per-knob loop, PROVES it on ONE real family with a planted
false-twin the divergence-catch must eject AND a cohort (a `k_fbskill_*`
slice) the classifier must mass-reject and route out, then resumes the volume
loop THREE-WAY split: category 1 -> proven per-knob loop; category 2 -> the
lane; category 3 -> the ratified option (a pure per-knob OR b cohort-scaffold).
The 22 done laneable members (21 cat-2 + 1 cat-3) are carried, not redone.
Phase 4 -- MVDSV fans the SAME D6 skill (D7 clarification) so the taxonomy is
available there; the Phase-4 recon quantifies MVDSV categories by source-grep
the same way (do NOT assume KTX's inventory; cohorts get classified, never
assumed twins). The D7-clarification phrase "ONE guarded D6 invocation per
knob at Opus 4.7 MAX" is GOVERNED by this amendment: read as "ONE guarded D6
invocation per knob (cat 1, and cat 3 if option a) OR per provable index-twin
family (cat 2: one Opus-4.7-MAX family eval) OR per ratified cohort-scaffold
(cat 3 option b: one Opus-4.7-MAX scaffold pass + per-member individual
grounding), with cheap independently-verified per-member binding throughout."
Spec carries a concise mirror (Amendment precedence).

**Ratification:** RATIFIED 2026-05-17 (operator, plain-English sign-off);
**cat-3 = option (b) the cohort-scaffold lane** (one Opus-4.7-MAX
shared-mechanism pass for the `k_fbskill_*` cohort, then each of the 38 still
INDIVIDUALLY source-grounded -- the D8 mechanism-only bar per-member, NO
semantic collapse). The three-way taxonomy, the category-2 index-twin lane,
and the divergence-catch-as-classifier are ratified as drafted. Stage B is
UNBLOCKED: a fresh executor terminal builds the cat-2 index-twin lane + the
cat-3 cohort-scaffold lane beside the proven cat-1 per-knob loop, proves them
(planted false-twin ejected; a cohort slice the classifier mass-rejects and
routes to the scaffold), then resumes the volume loop three-way-split. Locked;
governs per Amendment precedence. (Operator also self-surfaced the three-way
correction -- `feedback_be_decisive` / `feedback_operator_not_technical_review_gate`:
the operator drove the taxonomy insight, the orchestrator verified + drafted
+ locked it.)

## D7 -- Two-tier review gate at Opus-max

**Decision:** Before a synthesized description commits: (1) **Automated
evidence re-check, every row, load-bearing** -- an independent verifier
(separate invocation, not the authoring context) confirms each cited
`source_ref` file:line actually exhibits the claimed behavior and the text
passes the D5 rubric mechanically; fail -> bounced to re-synth or routed to
residue. (2) **Operator batch approval on the tail only** -- hedged ones,
residue-routed ones, and a spot-check sample of the auto-passed bulk;
performed on the D11/D15 audit-review HTML page (amended by D11). Model dials
(locked): synthesis = the D6 skill at **Opus 4.7 max reasoning**; review =
an **independent Opus 4.7 at max**.

**Why:** Spec D7 (D11 amends the operator-tail surface to the HTML page).
The genuine synthesize corpus is bounded; low-reasoning first pass is false
economy on the one thing that must be correct (`feedback_best_tool_no_overkill`,
`feedback_model_effort_range` Opus-MAX ceiling for hardest reasoning).

**Implication for phases:** Phase 1 builds the two-tier gate + the independent
verifier invocation pattern. Phase 3/4 run every synthesized row through it.
The synthesis subagent and the review subagent are BOTH Opus 4.7 MAX
(this is the one place the model dial is locked by the spec, not
planner-chosen -- the per-task execution-mode annotation respects it).

**Clarification 2026-05-17 (planner, Phase 3 review -- the locked reading,
not a change; Phase 3 Open Q (a)).** The D5/D5-amendment word "cheap" is
EFFORT routing, NOT a cheaper model. The keep-vs-synthesize classify is
hard-coded INSIDE the D6 skill (D6) and the skill is Opus 4.7 MAX (D7); the
spec is explicit -- "weak or absent = full Opus-max synthesis" (spec ~line
361) and "a low-reasoning first pass is false economy" (spec ~line 399). So:
ONE guarded D6 invocation per knob at Opus 4.7 MAX; "cheap" / "fast affirm"
is the early-exit path WITHIN that single Opus-MAX invocation (a good comment
classifies-and-affirms quickly), NOT a separate cheaper pre-classify model
tier outside the skill (that alternative works around the spec-locked D6
dial and is rejected). Cross-cutting: Phase 4 fans the SAME D6 skill -- this
locks the reading so it is not relitigated there. Affects per-knob compute
only; the operator-tail review count is unchanged.

**Amendment 2026-05-18 (operator-ratified at the post-fleet reconciliation;
KTX Task-2 volume complete, 624/0, zero-fab held). Three changes; KTX
scope. Does NOT relitigate the D7 model for MVDSV/Phase 4 -- that still
runs tier-1 as written unless separately amended.**

- **A1 -- KTX D7 tier-1 DEFERRED pending the operator's manual scan.**
  Tier-1 (the independent Opus-4.7-MAX per-row evidence re-check, ~594
  synthesized KTX rows ~= a second overnight fleet) is NOT run up front.
  The operator's grouped manual scan on the Task-5 review surface is run
  FIRST. Rationale: F-D6a already proved citation integrity for every
  KTX row (each cited line re-grepped byte-exact at `67253dc9`, zero
  fabrication across all batches incl. the reconciliation tail); the
  operator's scan IS the spec-locked human correctness gate (D7 tier-2 /
  D18). If the scan surfaces grave errors -> tier-1 (scoped+run as a
  fleet) OR targeted re-synthesis is reinstated. If the scan is clean ->
  tier-1 is formally retired for KTX and that is recorded as the answer
  to phase-boundary check 4 (a synthesized row's "gate verdict" == its
  D6 verdict + the operator scan, not an automated tier-1 verdict). This
  is a deliberate cost/economy decision by the operator (do not re-do
  verified work robotically); it is NOT a relaxation of zero-fab, which
  held and still holds.
- **A2 -- Task-5 review surface enhanced (operator-directed).** The
  operator review page is a two-view grouped projection (Catalog: all
  knobs once in functional buckets, hedged + comment-vs-source-conflict
  rows flagged; By-Mode: per-mode knobs split Signature vs shared
  Baseline, standalone vs mutator -- grounded in KTX `gameplay_mechanics`
  game_mode/mode_default source data) instead of the plain alphabetical
  Phase-1 emitter output. New script
  `apps/qw-oracle/scripts/describe-fill/review-views.ts` (pure
  read-only DB projection, ASCII-only, idempotent, regenerable --
  D11/D15 emit-from-record preserved). The Phase-1
  `serialize-audit-review.ts` is left UNMODIFIED as the separate
  contract emitter. The By-Mode view is also a deliverable for the
  halted game-mode-semantics arc (cross-arc dividend).
- **A3 -- dispatcher self-patch of raw_comment authorized (executor
  process layer; not a spec/model change).** For benign
  raw_comment-imprecision the dispatcher may fill raw_comment from its
  OWN independent F-D6a c2 grep (the authoritative line it already
  fetched) instead of round-tripping the sub-agent -- removes a
  round-trip, not a check ((file,line) independence + behaviour
  grounding intact; raw_comment is deterministic from (file,line)).
  Applied-as-available for the reconciliation tail; NEVER triggered --
  the sharpened cvar-line requirement (d) in the per-knob brief fixed
  the drift at source (all 6 tail batches c2-clean first pass).
  Carry-forward: fold the cvar-line (d) sharpening into the canonical
  per-knob brief for any future fleet run (validates slice-3 STATUS
  carry-forward #1 -- the field name `raw_comment` was a trap, not an
  impossible bar). A real wrong-line / invented-behaviour fabrication
  still HALTs, unchanged.

## D8 -- Bot/judgment-tier cvars: mechanism-only is complete L1

**Decision:** Bot-skill / judgment-tier cvars (~38 `k_fbskill_*` etc.) get no
special exclusion. "Documented nowhere" means no prose source, NOT
source-illegible -- the bot-AI use-sites show what they do. Same D6 skill,
mechanism-only ("controls the bot's RL accuracy weighting; higher = more
accurate"). That satisfies the success criterion ("describes what the knob
does," never "recommends a value"). These count as fully described. The
recommended-value piece is L3 -> routed to an L3 candidate; its absence does
NOT count as an L1 gap. Genuine residue is only the tail not source-legible
even at Opus-max.

**Why:** Spec D8 + D6/D7 amendment. Reinforces C1.

**Implication for phases:** Phase 3 runs bot/judgment cvars through the D6
skill mechanism-only and counts them complete. No phase degrades them or
excludes them. Tuning advice routes OUT to the L3 line, not tracked as an L1
gap.

## D9 -- Mechanical extractor is a pure structured-lift; zero quality verdict

**Decision:** The shipped-config mechanical-extract tier is a NEW sibling
extractor handler (its own AST JSON output + loader adapter, same plug-in
pattern as every other handler; the `mvdsv.6` roff man page is a sibling
parser, same tier). NOT folded into the existing KTX cvar registration
handler. It fills description fields on cvar rows that already exist from the
libclang registration walk; it never creates entities. Idempotent re-extract.
Emit per (cvar, source-file) pair: the config author's description text;
structured choices kept structured (`{value,label}` enum + bitmask tables as
DATA, never prose-flattened); the shipped value carried as data but NOT
written as the source default; source-file provenance. **One record per
(cvar, source-file)** -- in-repo-vs-nQuake drift preserved as data, never
merged at extract time. Input boundary: consumes only `coverage.ndjson`
"mechanical"-classified sources; LLM-assisted/hand-curate surfaces route to
D6/residue. **The seam:** the extractor harvests + STOPS. It does NOT judge
text quality. Every harvested candidate AND every comment-less cvar flows to
the D5-D8 evaluation. No first-pass "comment looks fine" affirmation in the
parser.

**Why:** Spec D9. `feedback_exhaustive_mapping` (sibling-handler plug-in
pattern). A parser blessing text re-introduces the "had a comment so it
counts" trap C1/D5-amendment exist to kill.

**Implication for phases:** Phase 2 builds the KTX sibling extractor +
loader adapter; it fills ~157/260 KTX cvars with structured choices +
candidate text + retained provenance and STOPS at the seam. Phase 4 builds
the `mvdsv.6` sibling parser the same way. Structured choices stay structured
(P2: JSONB as JS values). The parser never sets a quality verdict -- that is
the D5-D8 evaluation (Phase 3/4).

**Amendment 2026-05-17 (planner, Phase 2 review -- primary-source-verified;
mirrors the spec D17 dated correction).** The "~157/260" figure above (and in
D17 / the spec / README / gap-findings) is CONFLATED and corrected.
gap-findings derived "~157" by unioning the EXISTING `_handler_cvars.py`
libclang registration surface (68 `source_inline`, already loaded -- by D9
explicitly NOT this tier) with the shipped-config surface. The honest D9
`shipped_doc` write target, verified live 2026-05-17 (3 mechanical configs:
in-repo `ktx.cfg` 93 set-lines + nQuake `ktx.cfg` 95 + nQuake
`port_template.cfg` 11 = 120 distinct set-names; 109 resolve exact-case to a
live KTX cvar; 11 non-resolvers recorded + tracked, never created -- D9
fill-not-create), is **~109/260**. The C1 gate is UNCHANGED: the probe-0
**M=260** denominator with the ~151 not-mechanically-covered residue (incl.
the 38 bot `k_fbskill_*`) tracked to Phase 3 / the C1 outreach track, NEVER
importance-cut. "~109" is a verified order-of-magnitude (exact-case; the
loader folds case via `name_fold`), NOT a hit-target -- the gate is M=260.
Phase 2 MD Recon facts + Open Q (a) carry the full live derivation.

**Clarification 2026-05-17 (planner, Phase 4 review -- the locked reading,
not a change; Phase 4 Open Q (a)).** `coverage.ndjson` tags the `mvdsv.6`
man page `extractability:"LLM-assisted"` / `structure_quality:"free prose"`,
while D9 (this decision -- "the `mvdsv.6` roff man page is a sibling parser,
same tier, same emit shape"), D11 (`mvdsv.6` named a `shipped_doc` source),
D12 ("9 from `mvdsv.6`"), the README phase-4 row, and the Phase-4 drafter
prompt all name it the D9 mechanical sibling parser. These are NOT in
conflict; the D9 harvest-and-STOP seam reconciles them. Verified live
2026-05-17 (planner, against `research/repos/mvdsv/docs/man/man6/mvdsv.6`):
the OPTIONS section is a REGULAR roff grammar -- each flag is a `.TP` then
`.B -<flag> [\fIARG\fP]` then prose lines, with non-`.B` `.TP` blocks as
section dividers a mechanical parser skips; `-progtype` / `-cheats` carry
inline enums kept structured (P2/D9/D11). The D9 mechanical sibling's job
is exactly that: lift the regular `.TP`/`.B` skeleton + the verbatim
candidate body text + the structured enums + provenance, and STOP -- ZERO
quality verdict. The "free prose" the `coverage.ndjson` tag flags is the
quality of the candidate body as a FINISHED user-doc -- which is precisely
the downstream D6 evaluation step every harvested candidate flows to per
the D5-amendment, NOT the mechanical sibling's concern. The probe-time
`LLM-assisted` tag was a structure_quality caution about producing a
finished doc, not a statement that the source has no regular extractable
skeleton (contrast the genuinely structureless surfaces the D9 input
boundary routes straight to D6: bare-`set` usermodes, `SETUP_FFA_CTF.txt`,
installer prose -- those have no `.TP`/`.B` grammar at all). So: `mvdsv.6`
IS the D9 mechanical sibling (harvest the regular skeleton + verbatim
candidate + structured enums, STOP); its prose is evaluated, like every
other shipped_doc candidate, by the D6 fan-out. Spec line 432 already
names `mvdsv.6` a D9 sibling -- this records WHY the `coverage.ndjson` tag
is not a contradiction, so the reading is not relitigated at Phase 4
execution or by a future man-page-riding fork onboarding the same pattern.
Cross-cutting (D9/D11/D12 + README + the Phase-4 prompt + any future
roff-source fork). Not a lock change; the locks are honored as written.

## D10 -- Drift/conflict policy: three classes, source-grounded, resolved inline at the D7 tail

**Decision:** Built on C2. Three classes: **Value differences**
(`sv_maxrate` 50000/500000 etc.) -- a distribution's chosen value is config
opinion, not L1 fact; configs agree on what the knob does; L1 takes the shared
behavior, the differing values become an L3 recommended-value note (NOT an L1
conflict). **Meaning conflicts** (`k_noframechecks` polarity; `sv_antilag`
cross-fork) -- the description genuinely differs; source is tiebreaker; per C2
surfaced to operator with source evidence, never auto-picked; cross-fork
collapses into meaning (no fork-aware schema -- the antilag entity surface is
identical across mainline and `dusty-*`, the divergence is one entity's
MEANING). **Membership drift** (nQuake-only / in-repo-only) -- union coverage,
provenance records which file documented it; a deliberate omission is L3
context, not missing L1. Resolution: source behavior is L1 truth; config
comments are candidate descriptions; on disagreement D6 source-grounded
synthesis produces L1 text and the disagreement is C2-flagged. Mechanism: a
meaning-conflict is resolved at author-time in the **same D7 review tail** --
no dedicated conflict queue.

**Why:** Spec D10. `project_qw_oracle_source_truth`. `sv_antilag` worked
example is primary-source-verified (mainline KTX no `antilag.c`, 0<->2 on==2;
`dusty-ktx` 783-line `antilag.c`, ==1, multi-mode) -- the L1 description is
dual, never collapsed.

**Implication for phases:** Phase 2 preserves all sources (enables flagging).
Phase 3/4 resolve meaning-conflicts inline at the D7 tail with source
evidence. Value-differences route OUT to L3 (not an L1 conflict, do not
flag as one). The `dusty-*` antilag fork extraction is a SEPARATE future arc
(carry-forward, see review-findings) -- NOT this arc. The case-fidelity
loader fidelity is a soft dependency (see review-findings F-D10b) -- never
blocks, re-projects clean when that mini-arc lands.

## D11 -- Provenance + decision-trail shape; review via the audit-review HTML pattern

**Decision:** New origin tag **`shipped_doc`** (parallels
`source_inline`/`synthesized`/ezQuake-only `help_json`) -- one tag for
mechanically-lifted-from-a-shipped-artifact; file identity in the provenance,
not tag-per-file. **Structured multi-source provenance, retained (option A):**
every contributing shipped file kept on the record -- file path, line, the
value that file shipped, raw comment text. The committed description's
citation (`source_ref`) points at the authoritative entry; alternates retained
as DATA, never discarded. **Decision trail is first-class:** each evaluated
entity carries `verdict` / `confidence` / `reasoning` / `proposed_desc`
alongside structured provenance. D6 emits the reasoning; it is stored, not
just logged. Review surface: the D7 operator tail is performed on a generated
`cvar-audit-review.html`-pattern page (same column family as the 2026-05-15
ezQuake audit artifact). **Amends D7:** "operator batch approval on the tail"
is concretely this HTML page; Claude proposes, operator approves/overrides
per row.

**Why:** Spec D11. Forced by D9 (one record per cvar+file) + C2 + D10
(a conflict cannot be flagged nor re-detected by D4 if the losing source was
dropped at load). Operator requirement: "we want the reasoning so we can
review it."

**Implication for phases:** Phase 1 ships the schema (origin tag incl
`shipped_doc`; retained-provenance JSONB; verdict/confidence/reasoning/
proposed_desc columns) + the audit-review HTML emitter (emit-from-record --
the 2026-05-15 file is a VISUAL TEMPLATE only, its generator was NOT found in
the codebase, see review-findings F-D11a). Phase 2 first populates retained
provenance. Phase 3/4 populate the decision trail. P2 applies (JSONB as JS
values).

**Amendment 2026-05-17 (planner, Phase 2 review -- approved cross-phase
deviation; Phase 2 Open Q (b)).** Phase 1's locked `description_provenance`
JSONB element `{source_file, source_line, shipped_value, raw_comment}` has no
slot for D9's mandated "structured choices kept structured" (`{value,label}`
enum + bitmask tables as DATA, never prose-flattened). Phase 1 did not
provision it because its one D19 cvar (`k_short_gib`) is boolean with no enum.
Resolution (faithful D9 realization, NOT a lock contradiction): the
retained-provenance element is widened with an ADDITIVE optional
`structured_choices` field per (cvar, source-file). JSONB is schemaless, so
this is NOT a migration and does NOT break Phase 1's `k_short_gib` record
(no enum -> field absent; element otherwise byte-identical, idempotent
reproduction holds -- C4/D19). Rejected: a dedicated column (a real
migration, no benefit). Cross-cutting: Phase 3 + the D11/D15 serializer + any
Phase 1 executor consume the element shape, recorded here. P2 still binds JS
values, never pre-stringified.

## D12 -- Cheap-probe bundle is arc Phase 0

**Decision:** Three cheap probes run as **arc Phase 0**, inside the arc
(containment + momentum over a separate pre-arc workstream): (1) **ezquake.com
shape-quantification** -- fetch ezquake.com/docs/settings/server.html,
cross-match vs MVDSV M=183, measure the SHAPE of the overlap (easy common
`sv_*` vs the hard dedicated-server-only tail), not a headline count;
ezquake.com is a `shipped_doc`-class source, artifact URI in the provenance
field. (2) **C3 runtime-dead detection diff** -- clean `qw-1.log` (CRLF-
normalize, case-fold both sides, `LC_ALL=C` sort, discount runtime-only
`__k_ls_*`), diff vs the same-version L1 extract -> the C3 suspect pool.
(3) **`load-commands.ts` one-line fix** -- verified root cause
(`entry.ast?.description` mapping), no re-extract, frees 28/108 MVDSV
commands; first task, free win.

**Why:** Spec D12. `feedback_cheap_probes_inform_expensive_passes` realized at
arc scale: Phase 0 is the probe, Phase 1 the triage, the synthesis phases the
informed pass. Phase 0 sizes the MVDSV phases; it does NOT gate the KTX side.

**Implication for phases:** Phase 0 ships these three. Phase 4 (MVDSV fill) is
sized by Phase 0's probe-1 output -- arc-planner scaffolds Phase 4's boundary
against it (a first phase that sizes a later phase is normal). Phase 0's C3
diff is a hard prerequisite for Phase 3/4 synthesis (C3). Phase 0 does NOT
gate Phase 2 (KTX mechanical extract is liveness-agnostic).

## D13 -- Multi-projection contract: two-tier serialization over the single D11 record

**Decision:** One schema, N serializers; nothing stored twice. Two-tier split
by audience. **Public projection** (MCP, Slipgate JSON snapshot, future web
server-manager, wiki.slipgate.me): description text + origin tag + anchor-
version/"may be stale as of X" stamp + type + default + D9 structured choices
as data. **Internal projection** (`cvar-audit-review.html` only): the public
set PLUS confidence + reasoning + verdict + full multi-source provenance
including losing alternates. The embedding input is itself a serializer
(prose + text-flattened structured choices for retrieval recall) -- a
serializer config, NOT a separately stored shape.

**Why:** Spec D13. The honest LABEL rides to every consumer; the audit trail
is internal-only and doubles as the deferred-D3 upstream evidence package.
Audience, not honesty, is the line (origin tag + staleness stamp already
discharge the D2 honesty obligation).

**Implication for phases:** Phase 1 defines the two-tier serializer boundary
(the internal-tier audit serializer is a Phase 1 deliverable -- it IS the D15
review page). Phase 5 emits the public projections (wiki feed + snapshot.json)
+ confirms the embedding serializer config. "What goes into the embedding" and
"the snapshot.json field list" are serializer configs -- planner/executor
scope, NOT schema decisions, NOT brainstorm questions. The MCP public-
projection delta (origin tag + staleness stamp on the L1 entity response;
orientation-blob + tool-description update) must respect
`apps/qw-oracle/API_CONTRACTS.md` new-dataset checklist (see review-findings
F-D13a).

## D14 -- Wiki-feed: bot-owned read-only namespace, regenerated each walk

**Decision:** The L1 reference projection reaches wiki.slipgate.me as
bot-generated, read-only pages in a dedicated bot-owned namespace, stamped
"auto-generated from qw-oracle Layer 1, do not edit," regenerated from the
snapshot on every KTX/MVDSV version walk. Human-authored pages link/transclude
these blocks; they never edit them. Seeded-then-editable REJECTED (a human
edit drifts the page from source -- the dual-maintenance failure the
single-source model prevents). Near-term primary consumer is the OPERATOR as a
visual progress anchor (`feedback_visual_anchors_force_hygiene`).

**Why:** Spec D14. Page styling/templates/rendering UX are consumer-surface
scope, explicitly OUT of this arc.

**Implication for phases:** Phase 5 emits the feed contract + mechanism
(read-only, fenced namespace, regenerate-on-walk, stamp). The wiki-side
namespace creation + bot write path is **qwiki-v1-beta / cross-arc scope**,
NOT this arc (see review-findings F-D14a) -- this arc owns the contract, the
wiki implementation consumes it; independent of the deferred qwiki Modes
Phases 5-8. A plain regenerated page delivers operator visibility;
prettification is separate later work -- do not gold-plate it.

## D15 -- Review page = internal-tier serializer, emitted from the record, row-per-entity inline comparison

**Decision:** The `cvar-audit-review.html` review surface is NOT a special
artifact -- it is the D13 internal-tier serializer (the one that additionally
carries confidence + reasoning + verdict + losing provenance). Emit fresh
from the structured record, same as every other projection. The 2026-05-15
artifact is retained as a VISUAL TEMPLATE (look/feel, sortable-filterable
column family), NOT a generator to reverse-engineer. One page, all entries,
scan-the-whole-work; per entry the operator sees the original codebase
comment, our proposed description, and the reasoning **together, INLINE per
row** as one before/after/why comparison unit -- not split into separate
panels or three filtered views. Row-per-entity; sortable + filterable.

**Why:** Spec D15. `feedback_inline_pairs_over_split_panels`. Recovering an
unknown old generator is rejected -- contradicts the operator's "quick 1 page"
intent and breaks the uniform one-record/N-serializers model.

**Implication for phases:** Phase 1 builds this emitter (it is the D7
operator-tail surface; D11 amended D7 to this page). It is the internal-tier
serializer of D13 -- not separate machinery. The exact emit script + where it
hooks the walk is planner/executor scope. Inline-pairs discipline is locked
(do not split into panels).

## D16 -- Upstream export: showcase-page-first, PR-path deferred

**Decision:** The upstream export does NOT lead with a PR. First artifact: a
standalone single-page HTML showcase rendered from a `snapshot.json` export of
the DB record, hosted on an operator-controlled static surface (slipgate.me or
the matchscheduler site -- host is implementation scope), shown to KTX/MVDSV
devs to socialize the work and get direction; regenerates as the fill
progresses. The PR-path decision (repo `server-cvars.md` / empty GitHub wiki
tabs / a dev-proposed landing) is explicitly DEFERRED until after that dev
conversation. NOT a new data contract -- the showcase is the D13 internal-tier
projection served as a hosted page; same serializer as D15, different host +
consumer. Every per-knob fact is a pure DB projection; the only non-DB content
is the static framing wrapper (title, the D14 stamp, a how-to-read intro,
attribution) -- zero per-entity claims, zero drift surface.

**Why:** Spec D16. probe-5 established the upstream doc surface is abandoned;
an unsolicited PR risks a year of silence; a showcase-backed conversation lets
devs pick the landing they will maintain (`feedback_cheap_probes_inform_
expensive_passes` at export scale).

**Implication for phases:** Phase 6 is the **deferrable tail** -- generate the
showcase, hold the conversation, decide the PR path AFTER. Phase 6 does NOT
gate arc completion (the arc is complete + useful at end of Phase 5). Do NOT
plan the PR. The freeze/de-dup requirement is NAMED not designed (D3 owns the
build). Attribution per `reference_upstream_pr_attribution` rides whatever PR
eventually lands -- `Assisted-by: Claude:<model-id>`, operator signs
`Signed-off-by`, AI never signs; not a planner decision.

## D17 -- Phase shape arc-planner scaffolds against (LOCKED -- do not re-derive)

**Decision:** Seven phases. arc-planner refines per-phase boundaries /
verification regime / model+effort dials / context-budget slicing; it does NOT
change the shape or the engine order.

- **Phase 0 -- Probes + the free win.** ezquake.com shape-quant; C3
  runtime-dead suspect-pool diff; `load-commands.ts` one-line fix. Sizes
  Phase 4; does NOT gate the KTX side.
- **Phase 1 -- The discipline, built once.** Provenance/staleness schema
  fields (D2/D11); the guardrailed per-knob synthesis skill (D6); the two-tier
  review gate (D7); the internal-tier audit/review serializer (D11/D15); the
  C5 F1 probes. Engine-agnostic; both engines ride it.
- **Phase 2 -- KTX mechanical extract (D9).** New sibling extractor: in-repo +
  nQuake `ktx.cfg` -> structured choices + candidate description + retained
  multi-source provenance; fills ~109/260 KTX cvars (corrected 2026-05-17 --
  see the D9 amendment; the "~157" conflated the libclang registration
  surface; M=260 is the C1 gate). Idempotent (C4).
- **Phase 3 -- KTX source-synthesis (D5-D8, D10).** The D6 skill fans out over
  CD_NODESC commands + residual cvars + bot/judgment cvars (mechanism-only,
  D8) + triage-failed comments. D10 meaning-conflicts resolved inline at the
  D7 tail; residue -> C1 outreach track.
- **Phase 4 -- MVDSV fill, sized by Phase 0.** `mvdsv.6` man-page import for
  cmdline (D9 sibling parser); loader-freed commands + the synthesis tail;
  cvars split easy-common-`sv_*` vs hard-dedicated-tail per the Phase 0 probe.
- **Phase 5 -- Staleness + projections.** Wire the D4 walk-time re-review
  report into the new-version runbook; emit the D14 public wiki feed + the
  snapshot.json; confirm the C5 probes green.
- **Phase 6 (deferrable tail) -- Upstream pitch (D16).** Generate the dev
  showcase page, hold the conversation, decide the PR path after. Explicitly
  optional: the arc is complete and useful at the end of Phase 5; Phase 6 does
  NOT gate arc completion.

**Why:** Spec D17. KTX-first preserved (Phases 2-3 before MVDSV Phase 4).
Phase 0 sizes Phase 4. Phase 1 is the build-once spine both engines consume.
Each phase ends in a verifiable, runnable state.

**Implication for phases:** the slicing analysis refines the per-phase
verification regime + context budget + model/effort dials -- it does NOT
re-derive the shape or the engine order. **Planner note (slicing input, not a
shape change):** Phase 1 has no consumer-facing deliverable of its own -- it
is a build-once horizontal foundation. To avoid a verification-regime
collision (you cannot verify "the discipline works" if verifying it needs
Phase 2/3 rows), Phase 1 ships a **self-contained smoke probe**: the skill +
gate + serializer + F1 probes exercised end-to-end against one fixture knob
(synthetic or a single real one) proving the spine round-trips before KTX
volume rides it. This is a verification-regime addition WITHIN the locked
shape, not a reshape.

## D18 -- Game-mode L3 arc: sequential by operator-bandwidth, not technical dependency

**Decision:** Technically NOT a hard dependency (the game-mode arc's substrate
-- 27 game_mode + 317 mode_default structural rows + wiki/usermodes prose --
is sufficient to author the notes; no reverse coupling since D1 carves mode
narrative out of this arc; typed-anchor auto-flag makes parallel safe by
construction). Operator decision nonetheless: **this arc completes before the
game-mode L3 arc starts.** The gate is operator review-bandwidth (non-coder,
non-server-admin, the correctness judge on every D7/D15 row -- high-focus
work, monorepo has competing workflows). This arc's post-arc review is the
greenlight checkpoint.

**Why:** Spec D18. `feedback_arc_sequencing_operator_bandwidth` (this exact
decision is its origin). "It all has to get done" -- both ship; this is
ordering, not de-scoping. Bandwidth-driven, so the order MAY be revisited if
operator circumstances change (parallel is technically safe) -- but the locked
call is sequential.

**Implication for phases:** no phase in this arc plans or depends on the
game-mode L3 arc. It is NOT a prerequisite, NOT a parallel track, NOT part of
this arc's plan. Note it on HANDOVER as gated-behind-this-arc-post-review at
session wrap (already tracked).

## D19 -- Phase 1 walking-skeleton smoke = one real simple KTX cvar (planner slicing, operator-ruled 2026-05-16)

**Decision:** Phase 1's self-contained verification is a smoke probe that runs
the ENTIRE describe-fill pipeline -- mechanical-candidate harvest -> D5-D8
evaluate -> D6 synthesize -> D7 two-tier gate -> D11/D15 serialize -> C5 F1
probe -- end-to-end against **one real, simple, well-understood KTX cvar**.
Not a synthetic throwaway; not one-per-tier. The specific cvar is the Phase 1
drafter's choice (recorded in the Phase 1 MD): pick a plain boolean/int KTX
cvar with a single unambiguous registration site AND a clear shipped-config
comment, so mechanical-candidate + source-grounding + the D7 gate are all
exercised on an easy, unambiguous case.

**Why:** The D17 planner note flags Phase 1 as a build-once foundation with no
consumer surface -- a verification-regime-collision risk (you cannot prove
"the discipline works" without Phase 2/3 rows). The walking-skeleton smoke
probe is the fix WITHIN the locked D17 shape (not a reshape). A real cvar (vs
synthetic) exercises real source-grounding -- the part of the machinery most
likely to be wrong and the thing a synthetic fixture cannot prove. One knob is
the cheapest real signal (operator decision, slicing analysis 2026-05-16,
`feedback_cheap_probes_inform_expensive_passes`).

**Implication for phases:** Phase 1 writes exactly ONE real KTX cvar's full
record (description + origin tag + retained provenance + anchor + the
verdict/confidence/reasoning trail) through the real pipeline, and its
phase-boundary verification asserts that record round-trips through the
D11/D15 serializer and the C5 tag+anchor probes go green on it -- with NO
dependency on Phase 2/3. Phase 2 (KTX mechanical extract) and Phase 3 (KTX
synthesis) MUST treat that one cvar idempotently: re-running the corrected
pipeline (C4) reproduces it identically (no duplicate row, no double-count),
and the probe-0 coverage denominator counts it exactly once (it is already
filled when Phase 2/3 run -- coverage logic is idempotent on it, per P3). The
Phase 1 drafter records the chosen cvar in the Phase 1 MD's "Outputs to next
phase" so Phase 2/3 drafters know which row is pre-filled.

---

*End of decisions. New cross-cutting commitments discovered during phase
drafting append here as D20+ with date + reason. Spec amendments land as dated
blocks under the original C/D. Never silently override in a phase MD; never
silently comply with a planning direction that contradicts a lock -- surface
it for explicit amendment.*
