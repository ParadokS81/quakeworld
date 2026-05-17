You are drafting **Phase 5 -- Staleness + projections** of the
**2026-05-16 KTX / MVDSV Layer-1 describe-fill** arc.

Phase 5 is the cross-cutting projection + staleness phase that turns the
now-content-complete describe-fill record (KTX from Phase 3 + MVDSV from
Phase 4 -- every in-scope configurable-bucket entity carries an
affirmed-or-synthesized provenance-stamped owned description, or an
enumerated C1-outreach-track residue row) into its consumer-facing
projections and wires the D4 staleness re-review into the new-version walk.
Four deliverables: (1) wire the D4 walk-time re-review report into the
new-KTX/MVDSV-version runbook -- a manual operator-paced confirm-or-rewrite
pass at walk time, NOT auto-edit, NOT a notification system; (2) emit the
D13 PUBLIC projection -- `snapshot.json` (description text + origin tag +
anchor-version / "may be stale as of X" stamp + type + default + the D9
structured choices as DATA) and confirm the embedding serializer config
(prose + text-flattened structured choices for retrieval recall -- a
serializer config, not a stored shape); (3) emit the D14 wiki-feed CONTRACT
+ the snapshot the wiki consumes (bot-owned read-only fenced namespace,
regenerate-on-walk, the "auto-generated from qw-oracle Layer 1, do not edit"
stamp) -- the CONTRACT only, NOT the wiki-side implementation; (4) land the
F-D13a MCP public-projection delta (the origin tag + staleness stamp now
ride the L1 entity response; the Discovery orientation blob + the tool
descriptions update in the SAME commit; NO new MCP tool) and confirm ALL C5
probes stay GREEN through the projection round-trip. The arc is COMPLETE
and useful at the end of Phase 5 (D16/D17); Phase 6 (the D16 upstream
showcase) is the deferrable, non-gating tail and is NOT this phase.

This is a structured planning task. Your output is ONE markdown file. You
do NOT execute anything. The phase MD you write becomes input to a separate
execution session later. Phase 5's context budget is ~150-300k (README
slicing -- a projection/wiring phase, lighter than the fill phases); size
the task table subagent-default and say so.

Working directory: `/home/paradoks/projects/quakeworld`

## You are in the RIGHT arc/phase only if all of these hold

This arc fills provenance-stamped descriptions onto KTX/MVDSV configurable
entities that ALREADY exist in L1. Phase 5 is the projection + staleness
phase over the completed record. STOP and tell the operator if your phase
goal looks like any of these:

- "Fill KTX/MVDSV cvars/commands/cmdline / build the mvdsv.6 or .cfg
  sibling / run the D6 fan-out / the D7 tail" -> Phases 2-4 (approved).
  The fills are DONE; Phase 5 consumes the completed record. Wrong phase.
- "Build the D6 skill / the D7 gate / the D11/D15 internal audit-review
  serializer / migration 014" -> Phase 1 (approved). Phase 5 emits the
  PUBLIC projections + wires staleness; it RE-USES the Phase-1 spine, it
  does not rebuild it. The D15 internal audit page is Phase 1's; Phase 5
  is the PUBLIC tier (D13). Wrong phase.
- "Create the wiki namespace / write the bot wiki-write path / style the
  wiki pages / build the MediaWiki side" -> qwiki-v1-beta / cross-arc
  scope (F-D14a). Phase 5 owns the feed CONTRACT + the snapshot the wiki
  consumes ONLY; it does NOT implement the wiki side. Wrong scope.
- "Add an MCP tool for the new dataset" -> WRONG (F-D13a). Per
  `API_CONTRACTS.md` this is L1, the query shape matches the existing
  `lookup_entity` / `search_entities` -- NO new tool; update the
  orientation blob + tool descriptions in the SAME commit instead.
- "Generate the D16 dev showcase HTML page / hold the upstream dev
  conversation / decide the PR path" -> Phase 6 (the deferrable,
  non-gating tail; D16). The arc is complete at the end of Phase 5.
  Wrong phase.
- "Classify genuine-dead vs build-excluded / build the libclang
  call-graph" -> parked reachability arc (F-C3b). Out of scope.
- "Fix entity-name casing so it projects `loadFragfile` not
  `loadfragfile`" -> the separate tracked case-fidelity mini-arc
  (F-D10b). Phase 5 NOTES that it re-projects clean when that mini-arc
  lands; it does NOT fix casing here. Wrong scope.

If your goal is "wire the D4 walk-time staleness report + emit the D13
public snapshot.json + the D14 wiki-feed contract + the F-D13a MCP
public-projection delta + confirm the C5 probes green over the completed
KTX+MVDSV record", proceed.

## Required reading (read all before drafting; do not skip)

1. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/README.md`
   -- phase index, slicing analysis, non-goals. Phase 5's verification
   regime is MIXED: the staleness report is operator-run at a (simulated)
   walk; the public projections verify by automated round-trip (the
   record serializes out and the projection regenerates deterministically).
   Self-contained -- no Phase 6 dependency (the arc is complete at end of
   Phase 5).
2. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md`
   -- C1-C5 (incl. the **C3 amendment 2026-05-17**), P1-P5, D1-D19, and
   **read every dated amendment/clarification block in full**: the **D9
   amendment** (~157->~109 -- the precedent for verifying your own numbers
   live), the **D9 clarification 2026-05-17** (the `mvdsv.6`
   mechanical-sibling-vs-`coverage.ndjson`-LLM-assisted reconciliation --
   context for the completed record you project), the **D11 amendment**
   (the widened `structured_choices` provenance element -- it rides the
   public projection as DATA), the **D7 clarification**, the **D2
   clarification** (`description_origin` already exists; the full
   four-tag vocabulary `{help_json, source_inline, synthesized,
   shipped_doc}`), **D19**. Especially: **D4** (staleness = a walk-time
   report, operator-reviewed in-terminal; tight drift triggers a-f incl.
   the C3 trigger f; NOT auto-edit, NOT a notification system; a flagged
   description keeps serving stamped "may be stale as of version X"),
   **D13** (the two-tier serializer: PUBLIC = text + origin + anchor/stale
   stamp + type + default + structured choices as DATA; INTERNAL = the D15
   audit page, Phase 1's, NOT this phase; the embedding input is itself a
   serializer config, NOT a stored shape; "what goes in the embedding" +
   "the snapshot.json field list" are planner/executor serializer-config
   scope, NOT schema or brainstorm questions), **D14** (the wiki feed:
   bot-owned read-only fenced namespace, regenerate-on-walk, the
   do-not-edit stamp; seeded-then-editable REJECTED; near-term primary
   consumer is the OPERATOR as a visual progress anchor; do NOT
   gold-plate -- a plain regenerated page delivers it, prettification is
   separate later work), **D16** (Phase 6 is the deferrable non-gating
   tail; Phase 5 does NOT plan or build it). You turn these into a plan;
   you do not re-open them.
3. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/review-findings.md`
   -- the rows touching Phase 5: **F-D13a** (the public projection changes
   the MCP contract surface -- per `API_CONTRACTS.md` new-dataset
   checklist: this is L1, query shape matches existing tools, NO new
   tool; but the Discovery orientation blob + the tool descriptions +
   the Query `match_quality` story MUST update in the SAME commit or the
   contract silently breaks); **F-D14a** (the wiki-side namespace + bot
   write path is qwiki-v1-beta / cross-arc -- Phase 5 emits the contract
   + the snapshot the wiki consumes; it does NOT implement the wiki
   side); **F-D10b** (case-fidelity is a soft dependency -- the
   description projects on a loader-lowercased key; it re-projects clean
   with ZERO description rework when the tracked mini-arc lands; Phase 5
   NOTES this, it does NOT fix casing). Read the "Confirmed-good" block
   (the structural tier is out of scope; the probe-0 N/M denominators are
   the gate).
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-template.md`
   -- the MANDATORY shape. Section order exactly; the **REQUIRED "###
   Recon facts (verified ...)" Goal sub-block between Goal and "Inputs"**;
   per-task Execution-mode annotation (subagent-default; model+effort +
   one-line rationale; near-zero inline; Phase 5 has NO spec-locked
   Opus-MAX task -- the D6/D7 Opus-MAX dial is the fill phases', Phase 5
   is serialization + wiring + a doc/runbook edit). Run the verification
   sub-agent brief at the bottom after drafting (item 8 in its
   2026-05-17-corrected form).
5. `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
   -- source of truth for the why. Read **D4, D13, D14, D16** closely.
   When the spec and `decisions.md` disagree, the spec wins; surface it.
6. `apps/qw-oracle/API_CONTRACTS.md` -- the new-dataset checklist is
   load-bearing for F-D13a. The phase MD must include the
   orientation-blob + tool-description + `match_quality`-story edit in
   the SAME commit as the public-projection change, and must NOT add a
   tool. Recon the actual checklist text; do not infer it.
7. The grounding evidence (consume, do not re-derive):
   `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/` (the
   probe-0 N/M denominators -- the C1 gate the coverage assertion uses).
8. **Phases 0/1/2/3/4 are hard inputs -- read their real outputs as the
   contract you consume:**
   - `phase-1-discipline.md` "Outputs": migration 014 (the
     description/origin/anchor/verdict/confidence/reasoning/proposed/
     provenance family + `description_anchor_version`); the D6 skill;
     the D7 gate; the **D11/D15 INTERNAL-tier `serialize-audit-review.ts`**
     (Phase 5 emits the D13 PUBLIC tier as a SIBLING serializer over the
     SAME record -- one record, N serializers, nothing stored twice); the
     two Phase-1 C5 probes.
   - `phase-2-ktx-mechanical-extract.md` + `phase-3-ktx-source-synthesis.md`
     "Outputs": the completed KTX slice (every in-scope KTX entity
     affirmed-or-synthesized with the D11 trail; the C1-outreach track
     enumerated; `F1.describe_fill.provenance_entry_exists` +
     `synthesized_requires_source_ref` registered + GREEN; the jsonb
     probe extended to `ktx`).
   - `phase-4-mvdsv-fill.md` "Outputs": the completed MVDSV slice (every
     in-scope MVDSV entity affirmed-or-synthesized with the D11 trail;
     the `sv_antilag` D10 cross-fork DUAL described dual + operator-
     confirmed; the C3 MVDSV suspects dead-stamped + routed; the
     C1-outreach track enumerated in the Task-7 run report incl. the 8
     `mvdsv.6` man-only flags + 2 Windows-only params + cvar
     config-drift non-resolvers; `F1.jsonb_columns_not_strings` extended
     to `mvdsv`; the four Phase-1/2/3 C5 probes GREEN at MVDSV volume;
     **every synthesized KTX+MVDSV row carries
     `description_anchor_version`** -- the D4 staleness anchor Phase 5
     consumes; Phase 5 owns the public projections + the D4 wiring; the
     MCP F-D13a delta is explicitly Phase 5).

## Per-phase live recon (run it; do not trust spec/prior-phase numbers blind)

Record in the mandatory "### Recon facts (verified ...)" Goal sub-block,
drafter-verified via psql/grep/ls, never inferred (the ~157->109 conflation
is the precedent for why this block exists):

- The arc is in PLANNING: Phases 0-4 are approved-not-executed. Verify
  live what is absent (migration 014, the D6 skill, `describe-fill/`,
  `serialize-audit-review.ts`, the phase-0 artifacts, any
  `snapshot.json` describe-fill projection, the MCP orientation/tool
  surface state) and record that Phase 5 EXECUTION presupposes Phases
  0-4 EXECUTION (the same honest pattern Phases 2/3/4 used; flag as an
  orchestrator-sequencing Open Q, not a reshape).
- The probe-0 N/M denominators (the C1 gate the public-projection
  coverage assertion uses): KTX cvar/command/info_key, MVDSV
  cvar/command/cmdline_param/info_key -- live `count(*) FROM entities
  WHERE project IN ('ktx','mvdsv') AND type IN (...)`. Phase 5 asserts
  the public projection carries EVERY in-scope entity OR its enumerated
  residue disposition (C1 -- never importance-cut); the projection is a
  faithful mirror of the completed record, not a curated subset.
- The LIVE MCP contract surface: recon `apps/qw-oracle/API_CONTRACTS.md`
  (the new-dataset checklist verbatim) AND the live MCP
  orientation-blob + tool-description source files (grep the actual
  paths -- do NOT infer them; F-D13a requires editing them in the same
  commit). Confirm `lookup_entity` / `search_entities` are the existing
  tools whose response shape gains the origin tag + staleness stamp;
  confirm NO new tool is implied.
- The Phase-1 INTERNAL serializer (`serialize-audit-review.ts`) shape
  and where it hooks -- the D13 PUBLIC serializer is a SIBLING over the
  same structured record (one record, N serializers; nothing stored
  twice). Recon the live `snapshot` builder (the loader CLAUDE.md names
  a snapshot builder) so the public projection extends the existing
  snapshot mechanism, not a parallel one.
- The D4 anchor: confirm every `description_origin='synthesized'` row is
  designed to carry `description_anchor_version` (Phase 1/3/4 contract);
  Phase 5 wires the walk-time compare (anchor vs current per the tight
  D4 triggers a-f), it does not invent a new staleness column.

## Drafting rules

- ASCII only; no em-dash/en-dash/emoji; comments explain WHY (P5).
  Main-tree git, no worktree/PR (P4). Bun runtime; Phase 5 expects to
  add NO new schema (it projects an existing record) -- any schema delta
  is a deviation, surfaced (P1: append-only + SCHEMA.md same task if it
  somehow arises). JSONB binds JS values, never pre-stringified (P2 --
  the structured choices ride the public projection as DATA). `source_ref`
  reuses the existing mechanism -- no new format (P3).
- One record, N serializers (D13): the PUBLIC projection
  (`snapshot.json` + the wiki-feed payload + the embedding input) and the
  Phase-1 INTERNAL audit page are serializers over the SAME structured
  record. Nothing is stored twice. The PUBLIC tier is text + origin tag +
  anchor-version/"may be stale as of X" stamp + type + default + the D9
  structured choices as DATA. The INTERNAL tier (confidence + reasoning +
  verdict + losing provenance) is Phase 1's D15 page -- NOT re-emitted
  here; the PUBLIC tier deliberately EXCLUDES it (audience, not honesty,
  is the line -- the origin tag + stale stamp already discharge the D2
  honesty obligation).
- F-D13a is load-bearing: the public projection changes the MCP L1 entity
  response (origin tag + staleness stamp). Per `API_CONTRACTS.md`
  new-dataset checklist this is NO new tool -- but the Discovery
  orientation blob + the tool descriptions + the Query `match_quality`
  story MUST be edited in the SAME commit, or Discovery silently breaks.
  Adding a tool here is WRONG. State this as a hard task constraint.
- F-D14a boundary: Phase 5 emits the D14 wiki-feed CONTRACT (the
  bot-owned read-only fenced namespace shape, the regenerate-on-walk
  mechanism, the "auto-generated from qw-oracle Layer 1, do not edit"
  stamp) + the snapshot the wiki consumes. It does NOT create the wiki
  namespace, does NOT write the bot wiki-write path, does NOT style wiki
  pages -- that is qwiki-v1-beta / cross-arc. Do not gold-plate (D14):
  a plain regenerated projection is the deliverable; prettification is
  separate later work.
- D4 staleness is a walk-time operator-paced confirm-or-rewrite report
  (Drifted / Added / Removed against the tight triggers a-f, incl. the
  C3 reachability trigger f), wired into the new-KTX/MVDSV-version
  runbook. It is NOT auto-edit, NOT a notification system, NOT a
  monitoring website. A flagged description keeps serving, stamped "may
  be stale as of version X" -- stale-but-present beats a hole. Cadence
  ~1-2 events/engine/year. The phase MD's staleness verification is
  operator-run at a (simulated) walk, honestly -- NOT a YES/NO probe.
- C1: the public projection is a faithful mirror of the completed
  record -- every in-scope KTX+MVDSV entity OR its enumerated
  C1-outreach-track residue disposition rides the projection; "skip the
  residue / the rare dedicated knob in the public view" is a C1
  violation -- surface as a deviation, do NOT silently comply.
- C5: Phase 5 writes NO new data shape (it serializes an existing
  record) -- per C5 it ships NO new probe; its C5 obligation is to
  CONFIRM the Phase-1/2/3 probes + the jsonb ktx+mvdsv extension stay
  GREEN through the projection round-trip (the serializer must not
  regress an honesty invariant). If Phase 5 somehow introduces a new
  shape, that is a deviation -- surface it.
- Idempotent (C4/P3): the public projection regenerates deterministically
  from the record (re-run = byte-identical snapshot.json + wiki payload).
  C4 recovery = re-run the corrected serializer, NEVER an `UPDATE`.
- F-D10b note only: descriptions project on the loader-lowercased
  `name_fold` key; they re-project clean (zero description rework) when
  the tracked case-fidelity mini-arc lands. Phase 5 NOTES this in a
  boundary line; it does NOT fix casing.
- Stay out of scope: no fill rework (Phases 2-4 done); no rebuild of the
  Phase-1 spine; no D16 showcase / upstream PR (Phase 6 deferrable tail);
  no wiki-side implementation (F-D14a); no MCP tool (F-D13a); no C3
  classification (F-C3b); no casing fix (F-D10b).

## Step by step

1. Read everything in "Required reading", including Phases 0-4 real
   outputs and `API_CONTRACTS.md`. Note the Phase 5 findings (F-D13a,
   F-D14a, F-D10b) and the D4/D13/D14 + D9-clarification dated blocks.
2. Run the per-phase live recon. Verify the probe-0 N/M denominators,
   the live MCP orientation/tool surface paths (grep them -- do not
   infer), the Phase-1 internal serializer + the live snapshot builder
   shape, and the D4 anchor-version contract. Record in the mandatory
   "### Recon facts (verified ...)" Goal sub-block -- live, not inferred.
3. Draft the phase MD at
   `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/phase-5-staleness-projections.md`
   following `phase-template.md` EXACTLY: section order; the required
   Recon sub-block; per-task Execution-mode (subagent-default + model +
   effort + one-line rationale; near-zero inline -- a serializer / a
   runbook-wiring script / an MCP-surface edit are NOT inline-shaped; no
   spec-locked Opus-MAX task in Phase 5); a HONEST MIXED phase-boundary
   verification (automated YES/NO: the public snapshot.json regenerates
   deterministically and carries every in-scope entity OR its residue
   disposition vs the C1 N/M gate; the origin tag + stale stamp ride the
   MCP L1 response; the orientation/tool edit is in the same commit; NO
   new tool; the embedding serializer config is set; all C5 probes GREEN
   through the round-trip; idempotent re-emit -- PLUS the operator-run
   half: the D4 walk-time staleness report worked at a simulated walk,
   per-row confirm-or-rewrite -- NOT a probe); C4 recovery
   (re-run the corrected serializer, never UPDATE).
4. Dispatch the verification sub-agent (the brief at the bottom of
   `phase-template.md`; item 8 in its 2026-05-17-corrected form). The
   brief must also confirm: NO new MCP tool (F-D13a -- orientation +
   tool-desc + match_quality edited in the same commit); the wiki side
   is NOT implemented (F-D14a -- contract + snapshot only); the public
   tier EXCLUDES the internal confidence/reasoning/verdict/losing-
   provenance (D13 audience line) and is one-record-N-serializers (not a
   second stored copy); coverage is the C1 N/M gate (residue carried,
   never importance-cut); D4 is operator-paced walk-time (not auto-edit /
   not a notifier); Phase 5 ships NO new probe (writes no new shape) but
   confirms all green; ASCII (P5); no D16/showcase creep; no casing fix
   (F-D10b note only).
5. Apply the sub-agent findings. If a finding contradicts `decisions.md`,
   the decision wins -- record the rejected finding under "Open questions"
   with a one-line rationale. If a lock premise looks wrong (a factual
   premise -- the OQ-3 discipline), surface it explicitly for amendment;
   never silently override, never silently comply.
6. Halt. Reply to the operator with: the phase MD path; the sub-agent
   finding counts (CRITICAL / SUBSTANTIVE / ADVISORY); any open questions
   needing operator attention before execution (esp. the snapshot.json
   field list + the embedding serializer config -- these are
   planner/executor serializer-config scope per D13, recorded not
   re-opened; and the F-D13a exact orientation/tool-description edit
   sites); a recommendation -- "ready for review" or "needs another
   pass".

Do NOT proceed to Phase 6. Do NOT execute anything. Do NOT modify the live
codebase. Drafting is paper-only. The arc is complete and useful at the end
of Phase 5; Phase 6 is the deferrable, non-gating tail and is a SEPARATE
later prompt.

## Optional hint slot

**REVISION 2026-05-17 (planner Phase 5 cold-review -- SURGICAL Task-4
rescope only; the rest of your draft is sound and APPROVED in substance,
PRESERVE it verbatim).** Your draft was excellent: the Recon (the clobber
verified to primary-source depth), Tasks 1/2/3/5, the F-D13a six edit
sites, the D13 audience line, C1/C5, the D14-outbound-vs-snapshot.py-inbound
catch, and all three applied sub-agent SUBSTANTIVEs are correct and stay
as-is. You correctly caught the derive-tail clobber and surfaced Open Q (b)
rather than silently shipping it -- that is exactly right.

The planner adjudicated Open Q (b): the owned-row guard is **retroactive
Phase-1-spine scope, NOT Phase 5's** (decisive: Phase 2/3/4 C4-recovery
re-runs AND Phase 4's own idempotency contract re-run the load path -> the
derive tail, so the guard MUST exist before Phase 2's first owned write or
the arc destroys its own record mid-execution; a Phase-5-only guard makes
the per-phase DB-state verification regime silently unsound). Authority:
the dated `decisions.md` **D4 amendment 2026-05-17** + the dated Phase-1-MD
amendment block + **review-findings F-D4a** -- READ ALL THREE before
redrafting. Phase 1 now owns the guard (in all four arc-bucket derivers;
predicate = `description_origin IN ('synthesized','shipped_doc')` --
owned-track membership ALONE, NO `description_anchor_version` conjunct,
which under-protected staged `shipped_doc`).

Make ONLY these changes; touch nothing else:

1. **Task 4** -- rescope to the D4 walk-time report ONLY. Drop the
   owned-row-guard step + the `derive-entity-description.ts` edit entirely
   (that is now Phase 1, consumed not built). Task 4 keeps: the
   `staleness-walk-report.ts` Drifted/Added/Removed taxonomy (tight
   triggers a-f incl. C3 trigger (f)); setting `description_rereview=TRUE`
   on a Drifted owned row so the public projection stamps "may be stale as
   of version X" and KEEPS SERVING; wiring the report into the walk at the
   `index.ts` derive-tail seam (the report runs AFTER the
   Phase-1-guarded derive tail -- the guard is a precondition Phase 5
   consumes, not Phase 5's edit); operator-paced confirm-or-rewrite, not
   auto-edit, not a notifier. Update Task 4's Goal/Files/Steps/
   Verification/Execution-mode accordingly (Execution mode can drop to
   `subagent (Sonnet 4.7 MAX)` -- it no longer touches the shared derive
   tail; the cross-cutting load-tail risk moved to Phase 1).
2. **Files touched** -- remove
   `apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts`
   from Phase 5's Modified set (it is Phase 1's now). Keep
   `staleness-walk-report.ts` (Created) and the `index.ts` report-wiring
   (Modified -- the report seam only, not the guard).
3. **Recon facts** -- keep the clobber-verification bullet (it is
   accurate and load-bearing context) but reframe its conclusion: the
   owned-row guard is delivered by Phase 1 (the dated D4 + Phase-1
   amendments); Phase 5 CONSUMES it and asserts (does not build) that the
   derive tail no longer clobbers owned rows. Add a one-line cite to the
   D4 amendment + F-D4a.
4. **Inputs from previous phase** -- under "Phase 1 executed", add: the
   owned-row guard at the shared derive tail exists (the dated Phase-1
   scope-amendment task) -- Phase 5 consumes it.
5. **Open Q (b)** -- rewrite as RESOLVED: "Adjudicated by the planner
   2026-05-17 as retroactive Phase-1-spine scope; landed as the dated D4
   amendment + the Phase-1-MD amendment + F-D4a. Phase 5 consumes the
   Phase-1 guard; this MD's Task 4 is the report only. No longer open."
6. **Outputs / Recovery B1** -- adjust the one or two lines that asserted
   Phase 5 owns the guard to "Phase 5 consumes the Phase-1 owned-row
   guard; the D4 report sets the rereview flag, never the text". Recovery
   B1's fix becomes "the guard is Phase 1's -- if it failed, that is a
   Phase-1 defect surfaced to the operator, re-run the corrected
   Phase-1-guarded derive tail (C4); Phase 5's report only sets the
   flag".

Re-run the verification sub-agent (phase-template brief) after the
rescope, focused on: Task 4 no longer edits the shared derive tail; the
guard is correctly consumed-from-Phase-1; no other section regressed; the
D13/F-D13a/D14/C5 content is byte-unchanged. Halt with the standard
handback (finding counts + the confirm that Task 4 is now report-only +
the rest preserved). Do NOT reopen Tasks 1/2/3/5 or any other section.
