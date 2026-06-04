# KTX / MVDSV Layer-1 describe-fill -- post-arc analysis (2026-06-04)

**Reviewer:** post-arc fresh terminal (did NOT execute any phase; cold read).
**Sources read:** design spec `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md` (D1-D18, C1-C5, phase plan D17); plan scaffold `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/` -- `decisions.md` (D1-D21, P1-P5, C1-C5), `review-findings.md` (22 findings F-C2a..F-D14a), all phase MDs 0-5 + drafter/executor prompts, `workflow-chunk-campaign-brief.md`, the dated handoffs (2026-06-02 .. 2026-06-04), `mvdsv-describe-fill-findings.md`; arc-history entries (2026-05-17 in-execution, 2026-05-21 format-unify, 2026-05-22 categorize, 2026-06-02 NULL-fill milestone); **live PostgreSQL state** (qw-oracle dev container, read-only SELECTs); **live code/artifacts** (grep/read across `apps/qw-oracle/`, `~/.claude/skills/`, `apps/slipgate-app/`, `apps/matchscheduler/`).

---

## Verdict

**Data-complete, projection-incomplete.** The arc met its stated *purpose* -- every admin-configurable KTX/MVDSV knob now carries a Layer-1 description (KTX 100%: 689/689; MVDSV 99.4%: 345/347, only the two `sv_antilag` cvars deferred per D10). The hard part -- per-knob source-grounded judgment at Opus-MAX with an independent cold verification pass -- shipped, and the data side **over-delivered** versus the spec (a Workflow chunk-runner, a two-pass synthesis+verification methodology with planted-canary honesty gates, an unplanned 56-knob rigor-catchup, a cross-engine info_key methodology, and a 74-finding harvest that produced 5 upstream MVDSV PRs incl. two memory-safety fixes).

But the arc's own completion criterion -- D17: *"the arc is complete and useful at the end of Phase 5"* -- is **not met**. Phase 5 (the projection/serving layer that carries the descriptions to the MCP public contract, the Slipgate snapshot, and the wiki) did **not** ship and has been re-docketed as the separate MCP-realignment arc (`docs/superpowers/plans/2026-05-31-mcp-ktx-serving-realignment.md`, currently 0/55). Consequence: the descriptions are written and honestly labeled in the DB and reachable as raw text via MCP `lookup_entity`, but the D13/D14 contract that makes them render to consumers with origin + staleness labels is absent. The arc is correctly **NOT arc-tagged** -- this review is the honest accounting of why.

Verdict tally across the seven phases: **3 DELIVERED (0/1/3), 2 DELIVERED-DIFFERENT (2/4), 1 MISSING-re-docketed (5), 1 deferrable-partial (6).** Plus substantial shipped-beyond-spec. No silent drops -- every gap is tracked somewhere; the MISSING items are routed, not lost.

---

## Phase walkthrough

The spec's deliverable units are the seven phases (D17). Cross-cutting decisions (D1-D18) and constraints (C1-C5) are folded into the phase they land in, with a consolidated constraints check after.

### Phase 0 -- Probes + the free win (D12)

Status: **DELIVERED.**
Evidence: MVDSV commands are 108/108 described in the live DB -- the `load-commands.ts` one-line free win (28 commands freed from NULL `help_desc`) landed and held. The C3 self-built reproducible oracle and the ezquake.com shape probe are recorded in `phase-0-artifacts/`; F-C3a (contemporaneity risk) was dissolved by construction.
Notes: I did not re-run the C3 suspect-pool diff; the downstream phases consumed it without issue, so it is taken as delivered. The OQ-3 "KTX = QuakeC/fteqcc" planner error was caught and corrected here (both engines are C/CMake).

### Phase 1 -- The build-once discipline spine

Status: **DELIVERED** (one cosmetic deviation).
Evidence:
- Migration `db/migrations/014_description_provenance_trail.sql` applied -- 7 columns on `entities` (`description_anchor_version`, `description_rereview`, `description_provenance` JSONB, `description_verdict`, `description_confidence`, `description_reasoning`, `description_proposed`).
- **F-D4a owned-row guard live and correct** -- the load-bearing deliverable. All four arc-bucket derivers in `scripts/load-knowledge/derive-entity-description.ts` exclude `description_origin IN ('synthesized','shipped_doc')` (cvar 149-151, command 178-180, cmdline_param 244-246, info_key 386-388), predicate = owned-track-membership **alone**, no anchor conjunct (exactly as the spec amendment requires; header 79-93 documents why). This is the guard the whole arc rests on, and it is exactly as specified.
- D6 skill `~/.claude/skills/describe-fill-synthesis/SKILL.md` present; D7 gate `scripts/describe-fill/review-gate.ts` present; D11/D15 internal-tier serializer `scripts/load-knowledge/serialize-audit-review.ts` present.
- `k_short_gib` lives as a `synthesized` row, confirming the D19 walking-skeleton round-tripped.
Notes (DELIVERED-DIFFERENT seam): the audit serializer landed in `scripts/load-knowledge/` rather than `scripts/describe-fill/` -- cosmetic, the artifact exists and self-identifies. C5 probe coverage is incomplete -- see the C5 constraint check below.

### Phase 2 -- KTX mechanical extract (D9)

Status: **DELIVERED-DIFFERENT.**
Evidence: `scripts/extractors/ktx/_handler_shipped_config.py` + `output/ktx-shipped-config-ast.json` (76 KB) + `scripts/load-knowledge/load-ktx-shipped-config.ts` all present; the live DB shows 260/275 KTX cvars carry `description_provenance` JSONB -- the mechanical extract ran and populated the provenance trail.
Notes: **the `shipped_doc` origin tag (D11) has zero rows anywhere in the table.** Every KTX cvar that the mechanical tier touched is now `description_origin='synthesized'`, not `shipped_doc`. The D20/D21 format-unify + categorize sibling arcs recast the KTX descriptions to the user-doc template and folded origin to `synthesized` (D21 amendment 2026-06-04). So Phase 2's *mechanism* shipped and its provenance survives, but the spec's `shipped_doc` disposition was effectively dissolved -- the mechanically-lifted text became synthesized owned text. This is an honest outcome (the text IS our owned user-doc now), but it means the D9/D11 "shipped_doc tier" as a distinct labeled surface does not exist in the final state.

### Phase 3 -- KTX source-synthesis (D5-D8, D10)

Status: **DELIVERED.**
Evidence: live DB shows KTX cvar 275/275 and command 358/358 fully described, all `synthesized`, and **0 rows with a NULL verdict** -- i.e. every KTX cvar/command synthesized row carries the D7 verdict/reasoning trail. The D6 three-way taxonomy (heterogeneous / index-twin / namespace-cohort, incl. the 38 `k_fbskill_*` bot cvars as mechanism-only per D8) was applied. `synthesize-ktx.ts` present.
Notes: KTX info_keys are a different story (49 of 56 lack the verdict trail) -- but those were filled by the later cross-engine info_key pass, not Phase 3, and are accounted under YELLOW #3.

### Phase 4 -- MVDSV fill (D9 sibling parsers + synthesis)

Status: **DELIVERED-DIFFERENT** (significant -- this is where execution diverged most from plan).
Evidence the *data* delivered: MVDSV cvar 181/183, command 108/108, cmdline_param 11/11, info_key 45/45 described; cvar/command/cmdline carry full verdict trails (0 NULL-verdict). The `sv_antilag` dual-meaning D10 case was handled (and the fork correctly NOT extracted).
Three substantive deviations from the Phase 4 MD:
1. **The mechanical-extract tier was never built for MVDSV.** No `_handler_mvdsv6_cmdline.py`, no MVDSV `_handler_shipped_config.py`, no `load-mvdsv-cmdline.ts` / `load-mvdsv-shipped-config.ts`. The `mvdsv.6` roff parser and the shipped-config parser -- both locked D9 deliverables -- do not exist. MVDSV was filled **by synthesis only** (`scripts/describe-fill/synthesize-mvdsv.ts`). Consequence: **MVDSV has zero `description_provenance` on any row.** The retained multi-source evidence trail that D11/D13/D16 designated as the upstream-pitch material does not exist for MVDSV.
2. **Execution vehicle changed.** The planned per-entity `synthesize-mvdsv.ts` D6 fan-out was replaced mid-arc by a programmatic Workflow chunk-runner (`describe-fill-chunk-runner.js`) -- risk-ordered chunks, Opus-MAX synthesis in groups of <=4, an independent cold Opus-MAX verification pass per knob, planted-canary HG1 honesty gates. This is a genuine improvement (see Shipped-beyond-spec) but it is not what the MD described.
3. **Two unplanned passes were added** -- the 56-knob rigor-catchup (`source_inline` rows that were "counted but never synthesized") and the cross-engine info_key fill (83 keys) -- neither in the Phase 4 MD.
Notes: net, the MVDSV *content* is arguably higher-quality than the spec demanded (every row cold-verified), but the D9 mechanical tier and the provenance trail it would have produced are absent. DELIVERED-DIFFERENT, leaning over-delivered on quality / under-delivered on the evidence-trail mechanism.

### Phase 5 -- Staleness + projections (D4, D13, D14)

Status: **MISSING (re-docketed).** This is the headline gap.
Evidence of absence (all verified live):
- `serialize-public.ts` (D13 public-tier serializer) -- does not exist anywhere in `apps/qw-oracle`.
- `build-snapshot.ts` -- the project switch (723-744) handles only `qwcl`/`ezquake`/`qw`, then throws *"build-snapshot does not yet support project=..."*. There is **no ktx or mvdsv case**. No `mvdsv-*.json` snapshot exists under `apps/slipgate-app/src/lib/config/data/` (the only `ktx-*.json` is `ktx-commands.json`, dated Apr 14, pre-arc).
- F-D13a MCP public-projection delta -- absent. `entity-record.ts` / `types.ts` / `orientation.ts` do not return or teach the describe-fill public fields (origin tag + staleness stamp). `lookup_entity` does return raw `description` text (so the text is reachable), but not the labeled public projection the contract specifies.
- `wiki-feed-contract.md` (D14) -- absent.
- `staleness-walk-report.ts` (D4 walk-time Drifted/Added/Removed report) -- absent. (The DB scaffolding -- `description_rereview` column, the F-D4a guard -- exists; the report script that uses it does not.)
Disposition: the work is re-docketed as the **MCP-realignment arc** (`docs/superpowers/plans/2026-05-31-mcp-ktx-serving-realignment.md`, **0/55 checkboxes done**) and tracked in HANDOVER. So it is routed, not silently dropped -- but per arc-reviewer rules, a core phase that did not ship and was not an original non-goal is MISSING, promoted out of "deferred." The practical meaning: **the arc's data does not yet reach the consumers it was built to feed.**

### Phase 6 -- Upstream pitch (D16, deferrable)

Status: **DELIVERED-DIFFERENT** (explicitly optional; does not gate completion).
Evidence: the KTX side shipped a real showcase -- `build-l1-audit-catalog.ts` generator + `docs/reviews/2026-05-22-ktx-l1-catalog.html` (and a 2026-05-26 revision) + published copy at `apps/matchscheduler/public/ktx-documentation.html` (live at scheduler.quake.world). No MVDSV catalog/showcase exists yet. Separately, upstream engagement **over-delivered** through a different door: 5 MVDSV bug-fix PRs from the findings harvest (2 merged: #205 `penfilters[]` overflow, #206 wrong-mutex unlock; 3 filed: #207/#208/#209), rather than the doc-showcase pitch the spec envisioned.
Notes: the MVDSV showcase can't be generated yet anyway -- the generator is flag-driven (`--project ktx|mvdsv`) but depends on the Phase 5 snapshot path that doesn't exist.

---

## Cross-cutting constraints (C1-C5)

- **C1 -- completeness, no importance cuts: DELIVERED.** 1031/1033 in-scope entities described (99.8%); the 2 holes are the D10-deferred `sv_antilag` pair. Residue (11 non-resolving KTX config names, the bot cohort, etc.) tracked, never importance-cut.
- **C2 -- discrepancies flagged not auto-resolved: DELIVERED.** `k_noframechecks` polarity and the `sv_antilag` cross-fork meaning handled at the operator tail; 74 findings harvested rather than silently absorbed.
- **C3 -- presence != liveness, self-built oracle: DELIVERED.** Phase 0 oracle; F-C3a dissolved; F-C3c (cmdlist blind to KTX mod commands) correctly excluded KTX commands from dead-stamping.
- **C4 -- repair by re-extract, never one-off SQL: DELIVERED-DIFFERENT.** Mostly honored (the d4-extractor wipe was handled by restore+recast, the format-unify/categorize ran through apply scripts). Possible soft exception: the cross-engine info_key fill was "applied to `entities.description`" via a lighter apply path rather than a corrected-extractor re-run; worth confirming it went through an idempotent loader, not ad-hoc UPDATEs. (The KTX info_key *extractor* bug WAS fixed at source and re-extracted -- that part is C4-clean.)
- **C5 -- every new data shape earns an F1 probe: DELIVERED-DIFFERENT (has a hole).** Three describe_fill probes shipped and are registered (`origin_vocabulary`, `synthesized_requires_anchor`, `provenance_entry_exists`) plus the `jsonb_columns_not_strings` extension. Live checks pass: 0 synthesized-without-anchor, origin vocabulary clean. **But** `synthesized_requires_source_ref` (claimed as a Phase 3 deliverable) was never shipped under any name, and **no probe catches synthesized-without-verdict** -- which is why the 94 trail-less info_keys (YELLOW #3) sit undetected. C5's intent (honesty mechanically enforced) has a gap exactly where the lighter info_key path wrote rows.

---

## Key policy decisions

- **D9/D11 (mechanical-extract + `shipped_doc` tier): PARTIAL / DISSOLVED.** Built for KTX (provenance survives), never built for MVDSV, and the `shipped_doc` origin tag ended with 0 rows (folded to `synthesized`). The distinct labeled mechanical tier the spec designed does not exist in the final state.
- **D13 (multi-projection contract): MISSING** -- the public serializer and snapshot path don't exist (Phase 5).
- **D14 (wiki feed): MISSING** -- contract doc absent (Phase 5).
- **D16 (showcase-first upstream): DELIVERED-DIFFERENT** -- KTX showcase yes, MVDSV no, upstream engagement via bug PRs instead.
- **D18 (game-mode L3 arc runs after this arc, gated at this review): DELIVERED-DIFFERENT.** The game-mode L3 concept-note arc already **shipped** 2026-05-30 (`arc-ktx-game-modes-shipped`) -- i.e. it ran in parallel and completed *before* this post-arc review, not after it. D18 itself blesses this ("parallel is technically safe via typed-anchor auto-flag"), so it is a sanctioned deviation, but the "this arc's post-arc review is the greenlight checkpoint" sequencing is now moot. Follow-up implication under Arc N+1 #6.

---

## Shipped beyond spec

- **Workflow chunk-runner as the MVDSV execution vehicle.** `describe-fill-chunk-runner.js` + `describe-fill-emit-ledgers.cjs` -- a durable, reusable programmatic fan-out the spec never anticipated. **Recommend promoting to a documented pattern**; it is the template for any future engine's fill (FTE/QWCL).
- **Two-pass synthesis + cold verification with planted canaries (HG1).** Independent Opus-MAX V-pass per knob caught real defects with zero false positives across the campaign (e.g. two workers independently fabricating a CIDR syntax -> strongest C-FIX signal). This is the quality methodology that makes the over-delivery trustworthy. **Recommend baking into the describe-fill-synthesis skill / the spec for future fills.**
- **Rigor-catchup pass (56 knobs).** A cold spot-check disproved the "serviceable early hand-fills" label (1/14 factually wrong: `floodprot` had copied `gamedir`'s banner). Re-synthesized 22 commands + 34 cvars to the verified bar. Lesson worth a memory: "counted as covered" != "synthesized to bar."
- **Cross-engine info_key methodology (83 keys) + KTX info_key extractor bug-fix.** Discovered info_keys are a cross-engine protocol surface (borrow-vs-author, world-read=>serverinfo), and found two real KTX extractor defects (scope hardcoded; `infokey()` unrecognized) -- fixed at source + re-extracted. KTX info_key floor re-baselined 7->56.
- **74-finding harvest -> 5 upstream MVDSV PRs.** 2 merged (#205 `penfilters[]` overflow, #206 wrong-mutex), 3 filed (#207 `setmaster` OOB, #208 `SV_LoadAccounts` fscanf, #209 `rm`/`rmdir` path-escape). Two are memory-safety. 68 findings remain open in `mvdsv-describe-fill-findings.md` -- the harvest backlog.
- **Sibling arcs that closed the KTX side:** D20 format-unify (`arc-ktx-format-unify-shipped`) + KTX categorize (`arc-ktx-categorize-shipped`) + the published KTX catalog -- these are why KTX is at 100% on the user-doc template.
- **Platform-capacity discovery:** Workflow V-pass fails at ~38 concurrent agents; cap is ~26. Folded into the chunk-runner brief; worth a tooling memory.

---

## Open YELLOWs at sign-off

1. **Phase 5 projection layer not shipped (HIGH).** Descriptions don't reach the Slipgate snapshot, the wiki, or the MCP public-projection contract. Re-docketed as the MCP-realignment arc (0/55). Investigation status: root cause known (phase never executed; arc stopped after data was complete). Disposition: this IS the next arc -- see Arc N+1 #4.
2. **MVDSV has zero provenance + zero `shipped_doc` (MEDIUM).** The D9/D11 evidence trail that D13/D16 designated as the upstream-pitch material does not exist for MVDSV. If the MVDSV upstream showcase is ever to carry the cross-referenced shipped-config grounding, that trail must be built (the `mvdsv.6` + shipped-config parsers). Known; accept-or-build is an operator call.
3. **94 synthesized info_keys lack the D7 verdict/provenance trail (MEDIUM).** 49 KTX + 45 MVDSV info_keys carry a description + anchor but no verdict/confidence/reasoning -- filled via the lighter cross-engine path, not the full skill. They pass `synthesized_requires_anchor` but no probe catches the missing trail. Either backfill the trail or formally accept the lighter path as sufficient for info_keys (and add a probe that encodes that decision).
4. **Embeddings stale (MEDIUM).** 648 KTX + 347 MVDSV in-bucket rows flagged `description_embedding_stale=true`; no re-embed has run since the describe-fill writes. **MCP semantic search returns pre-describe-fill text** for these until re-embed runs. Mechanical fix, just needs running.
5. **`synthesized_requires_source_ref` probe never shipped (LOW).** Claimed Phase 3 deliverable; absent. Ship it or formally drop it.
6. **`shipped_doc` origin tag is unused (LOW / by-evolution).** Introduced by D11, 0 rows in final state (folded to `synthesized` by format-unify). Not a bug -- an honest evolution -- but the vocabulary now carries a tag nothing writes. Decide: keep as a hook for a future real mechanical tier, or retire from the vocabulary + probe.
7. **2 MVDSV cvars undescribed (TRACKED).** `sv_antilag` + `sv_antilag_projectiles` -- expected, D10 dusty-fork deferral. Resolves when the dusty-antilag fork arc runs.
8. **D5 amendment lacks a dated block (LOW, doc-hygiene).** The "evaluate every entity / no presumptively-covered bucket" amendment is folded into D5's prose with no dated/attributed block, violating decisions.md's own amendment protocol. All other amendments are dated. Add the block retroactively.

---

## Recommendations for Arc N+1 prep (increasing scope)

1. **Re-embed the stale rows (small, mechanical).** 648 KTX + 347 MVDSV. Restores MCP semantic-search fidelity. Source: YELLOW #4. No dependencies.
2. **Close the probe gaps (small).** Ship `synthesized_requires_source_ref` (or drop it); add a `synthesized_requires_verdict` probe (would flag the 94 info_keys); add the dated block to D5; decide the `shipped_doc` tag's fate. Source: YELLOWs #3/#5/#6/#8.
3. **Decide the 94 info_keys' trail (small-medium).** Backfill the D7 verdict/provenance trail, or ratify the lighter path as the info_key standard and encode it in a probe. Operator judgment call. Source: YELLOW #3.
4. **Ship Phase 5 -- the MCP-realignment / projection arc (LARGE -- this is the real Arc N+1).** `serialize-public.ts`, `build-snapshot` ktx+mvdsv cases, the F-D13a MCP public-field delta, the D14 wiki-feed contract, the D4 staleness-walk report. **Until this ships, the arc's central value proposition -- one source of truth that MCP/snapshot/wiki render from -- is not realized.** A 0/55 plan already exists at `docs/superpowers/plans/2026-05-31-mcp-ktx-serving-realignment.md`. Recommend this be the next arc, and that completing it is what earns the `arc-ktx-mvdsv-l1-describe-fill-shipped` tag (or split: tag the data arc now as data-complete, and treat projections as a clean standalone arc -- operator's call; see "Completion decision" below).
5. **MVDSV provenance / mechanical tier (medium-large, conditional).** Only if the MVDSV upstream showcase needs the cross-referenced shipped-config grounding. Build `_handler_mvdsv6_cmdline.py` + MVDSV `_handler_shipped_config.py` + loaders. Otherwise formally accept synthesis-only MVDSV as the final shape and note D9/D11 as KTX-only-realized. Source: YELLOW #2.
6. **Reconcile D18 (small).** The game-mode L3 arc already shipped, so the greenlight checkpoint is moot. The forward action is the inverse: now that the L1 descriptions are filled (and embeddings stale), verify the game-mode notes' `ktx:cvar:*` anchors against the now-current descriptions (the D4 auto-flag-on-drift this arc was supposed to enable). Folds naturally into #1/#4.
7. **Findings harvest backlog (separate track).** 68 open findings in `mvdsv-describe-fill-findings.md`, incl. flagged security items (`script` path-traversal #23, `localcommand` `system()` scaffolding #30, `vip_addip 0` everyone-VIP #14). Already a tracked backlog; surface the security-tagged ones for triage priority.

---

## Findings during review (cross-checks)

- **Decisions.md amendments:** 10 of 21 decisions carry dated amendment/clarification blocks; all are dated + attributed + followable **except D5** (amendment folded into prose, no dated block -- protocol gap, YELLOW #8).
- **Review-findings.md:** all 22 findings resolved, dissolved, or explicitly routed -- **zero silent findings.** Clean.
- **Arc-history vs live state:** the arc-history chronicle is **stale** -- the newest entry (2026-06-02) predates the cross-engine info_key fill, the rigor-catchup, and the KTX info_key extractor fix (all 2026-06-03/04), and still reads "Not yet arc-tagged ... findings harvest remain." A reviewer trusting arc-history alone would have the wrong shipped-state. Recommend a fresh arc-history entry capturing the true end state (data-complete, Phase 5 deferred) whenever the completion decision is made.
- **Executor prompts / in-flight learning:** preserved durably in the scaffold (campaign brief + dated handoffs + the chunk-runner script itself). Good -- future-arc onboarding has the real execution record, not just the plan.

---

## Completion decision (surfaced for the operator)

The arc is at a genuine fork, which is why it has no tag:

- **Option A -- finish as specified.** Ship Phase 5 (Arc N+1 #4) so the data actually reaches consumers, then tag `arc-ktx-mvdsv-l1-describe-fill-shipped`. Honors D17's "complete at end of Phase 5."
- **Option B -- redefine completion.** Accept "data-complete" as the ship (the descriptions exist + are honestly labeled + reachable via `lookup_entity`), tag the arc now, and treat projections as a clean standalone arc (the MCP-realignment plan already scopes it). Faster closure; the spec's completion criterion is formally amended rather than met.

Either is defensible. The reviewer's read: the *purpose* is met and the *plumbing* is not -- so the honest label today is "data-complete, projections pending," and the tag should wait on whichever option the operator picks. This is a disposition call, not a verdict call.

**The arc shipped its data foundation with 1 MISSING phase (projections, re-docketed) and significant verified-quality over-delivery. Not yet at its own completion bar; correctly untagged.**
