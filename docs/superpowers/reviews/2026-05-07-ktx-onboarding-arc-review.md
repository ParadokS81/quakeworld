# KTX Layer 1 Onboarding -- post-arc review (2026-05-07)

**Reviewer:** post-arc fresh terminal (did not execute any phase; cold read).
**Sources read:**
- `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (spec, 1477 lines, 5 passes)
- `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md` (sibling spec, Pass 2)
- `docs/superpowers/plans/2026-05-04-ktx-onboarding/{README.md, decisions.md, review-findings.md}`
- 9 per-phase MDs (Phases 0/1/2/3/4/5/6/7/8 plus the in-arc Phase 5.5 retrofit)
- `apps/qw-oracle/docs/arc-history.md` top section (per-phase shipped record)
- `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md` (Phase 7 5-engine audit)
- `docs/superpowers/parking/2026-05-07-ktx-onboarding-postarc-handoff.md` (this terminal's brief)
- Live source verification: handler files, migration files, loader files, quality-grid probes, EXTRACTOR-PLAYBOOK additions, F19/F22 doctrine survival across 4 named sites

## Verdict

**The arc shipped clean.** Every Pass 1-5 commitment in the design spec landed. No MISSING items. The DELIVERED-DIFFERENT count is 7 (all documented in `decisions.md` amendments or `review-findings.md` amendments dated 2026-05-05/06; none silent). One spec deviation -- the original `008/009/010` migration filename slots renumbered to `009/010/011` because qwiki's parallel arc claimed slot 008 -- was captured as D5 amendment 2026-05-05 with content unchanged. Two functional commits per phase happened in Phase 1 (D16 deviation, advisory), and one fixture-correction follow-on landed in Phase 7 (housekeeping); both housekeeping asterisks are documented in arc-history. Working-tree fence (23 uncommitted MCP-API + qwiki side-tracks) honored across all 9 phases. F19 + F22 doctrine fix survives across all 5 reference sites at session-close. Five YELLOW items at sign-off, one of which already has a sized fix path; the rest are pre-existing or strictly stat-only. Arc N+1 prep is well-formed (6 ranked recommendations below).

## Spec section walkthrough

### Spec preamble -- doctrine fixes deferred to end-of-arc

Status: **DELIVERED**.
Evidence: F19 (4 named sites) + F22 (5th site, VALIDATION-RUNBOOK.md, discovered at Phase 0 drafting) shipped together as joint Phase 0 scope. Live grep `tree-sitter` across all 4 named files confirms zero KTX-canonical-tree-sitter framing remains; all 4 hits frame tree-sitter explicitly as reserved for the `dusty-ktx` fork's `qcsrc/`. Phase 8 re-verified at end-of-arc; no recursion of the wrong claim into new docs added during the arc. One pre-existing tree-sitter slip in `apps/qw-oracle/scripts/extractors/ezquake/diagnostics/extraction-comparison-report.md` (excluded-path artifact predating D2) was drained inline with a superseded-by-D2 note.
Notes: SCHEMA.md slim-doc Arc 1 refresh sweep absorbed by Phase 8 per F20 sequencing rationale (don't run before KTX adds the 5th channel value). Sweep landed across `apps/qw-oracle/{README,SCHEMA,OVERVIEW}.md`.

### Pass 1 -- Methodology + 4 first-class entity types

Status (1.1 -- 1.7): **DELIVERED-DIFFERENT** at the row-count anchor level; **DELIVERED** at the design level.
Evidence:
- 1.1 (cvars): Approach A shipped; `entities.project` CHECK already admitted `'ktx'` pre-arc (no widening needed); 260 cvar rows in dev DB. F1 amendment 2026-05-05: API split inverted from 4:1 (Pass 1 framing) to 1.6:1 at canonical-1.46 (181 RegisterCvar / 114 RegisterCvarEx). Spec's "192 unique k_-prefixed" headline anchor stands; live total includes ~68 non-k_ literal names per Exhaustive Mapping Rule.
- 1.2 (handler shape): cross-codebase port from `Visitor` only (D3); single-variant TU parse (only one platform-guard `#ifdef` in KTX source); Pattern 5 + Pattern 6 reuse confirmed.
- 1.3 (source-citation): call-site location is canonical; first-seen-wins on duplicates; verified across all 4 entity handlers.
- 1.4 (regex extractor disposition): `apps/qw-oracle/scripts/extractors/ktx/commands.ts` deleted in Phase 0 commit `860aaf0d` (F18).
- 1.5 (commands): single `_handler_commands.py`; three target tables (cmd_t cmds[] / std_commands / editor_commands); Pattern 14 suffix scheme shipped. F2 amendment 2026-05-05: std_commands count drift 39 -> 14 + std-vs-editor collisions 25 -> 0 at canonical-1.46. Pattern 14 rationale REFRAMES from collision-prevention to defensive API-surface marker per D7 (suffixes still applied unconditionally; future-proof). Live: 358 commands (319 cmds[] + 14 std + 25 editor).
- 1.6 (info_keys): producer-only emission; F3 amendment 2026-05-05: count 5-6 -> 7 unique star-keys at canonical-1.46. Live: 7 rows, all `:userinfo`-suffixed.
- 1.7 (log_templates): printf-shaped surface; new `'logfile'` channel via 009 migration; F4 amendment 2026-05-05: per-API counts drift modestly within accepted tolerance (G_bprint 655 -> 681; total 1794 -> 1823); unique-format-string anchor (1500-2000) stands but live count 1195 sits below the spec's bottom estimate -- threshold-style probe `>= 1000` accommodates and PASSes.
Notes: All four amendments are dated and reasoned in `review-findings.md`. The "DELIVERED-DIFFERENT" verdict applies to the count anchors specifically; the underlying handler shapes + emission rules are exactly as Pass 1 specified. F4's drift below the spec's 1500-2000 estimate is the most substantive count delta; underlying handler emits all printf-shaped sites the spec promised.

### Pass 2 -- sibling spec (prod-MCP update lifecycle)

Status (2.1 -- 2.6 + DEPLOYMENT.md hygiene): **DEFERRED** for end-to-end execution; **DELIVERED** for the schema-side commitments that intersect KTX onboarding.
Evidence: Pass 2 is the canonical Layer 1 update procedure; this arc's scope was explicitly the KTX-side schema deltas (CHECK widenings + new tables) and the migration ordering. Phase 1 of the KTX arc applied 009/010/011 to dev DB; pg_dump-restore to prod is operator-driven and out-of-arc per the lifecycle spec's own "operator UX" section. DEPLOYMENT.md hygiene edits (Tier 2 dump archival, single-transaction restore switch, runbook expansions) were NOT scoped into KTX phases -- the lifecycle spec ships them as sibling work, not arc-coupled.
Notes: This DEFERRED is the right kind -- explicitly captured as a non-goal by `decisions.md` (D20 "main tree, no PR"; lifecycle spec ships independently of any single arc). The KTX-relevant Pass 2 work (one CHECK widening on `log_template_versions.channel`) shipped as part of migration 009. Operator should run the prod dump-restore at their discretion now that all 9 phases shipped. Captured as Arc N+1 prep recommendation 1 below.

### Pass 3 -- Schema impact for first-class types

Status (3.1 + 3.2): **DELIVERED-DIFFERENT** (filename renumber per D5 amendment 2026-05-05).
Evidence: Migration `008_ktx_log_template_logfile_channel.sql` renamed to `009_ktx_log_template_logfile_channel.sql` because slot 008 was claimed by qwiki's `008_community_schema.sql` mid-planning. Content (DROP + ADD CONSTRAINT widening to 5 channel values) is byte-identical to the spec's locked SQL. SCHEMA.md sweep deferred to Phase 8 per the spec's own sequencing rationale (don't sweep before KTX migrations land); shipped in Phase 8 commit `83288501`.
Notes: D5 amendment is the canonical pattern -- filename slot collision is content-stable. Phase 8's slim-doc sweep additionally landed an explicit filename-renumbering note at `SCHEMA.md:807` so future readers don't get confused by the spec's `008/009/010` framing.

### Pass 4 -- Gameplay-content scope + shape decision

Status (4.1 -- 4.5): **DELIVERED-DIFFERENT** (catalog count corrections; XSD complexType count correction).
Evidence:
- 4.1 (group disposition): Group A enums + Group B struct-arrays in qw-namespace; Group C XSD events as new `match_event` entity type. All shipped exactly as Pass 4.1 framed. 1 new `gameplay_sources` row for `'ktx'` seeded in Phase 1.
- 4.2 (mode taxonomy spine): catalog row count corrected at Pass 5 close from "17 um_list peers" to "27 total" via 5.1 amendment (race + bloodfest + 8 mutators after wiki cross-check). F5 anchor reproduced exactly in dev DB (game_mode=27 with the locked discriminator distribution: 17 um_init_string|standalone + 1 cvar_toggle_with_init_string|standalone + 1 cvar_toggle_only|standalone + 8 cvar_toggle_only|mutator).
- 4.3 (remaining Group A enums): lsType_t SKIP (OUT_OF_SCOPE.md), gameType_t SKIP-with-props_json-bucket, electType_t IN as `kind='election_type'` (5 rows; etNone skipped), deathType_t IN as `kind='death_rule'` (27 rows; F8 amendment corrected breakdown 30/28/2 -> 29/27/2 + `related_weapon` underscored canonical form per D9). All four dispositions shipped as specified.
- 4.4 (Group B): 5 IN + 4 OUT. All five new `gameplay_mechanics`/`gameplay_entity_defs` kinds emitted (monster=13, score_system=3, drop_item=31 per F11 +1 amendment, loc_macro=15 per F12, teamplay_message=21 per F13). All four OUT items documented in OUT_OF_SCOPE.md (lsType_t, gameType_t, fb_spawn_t x2, stats_format_t, fixed_maps_list).
- 4.5 (`match_event` table shape): `match_event_versions` table created with PK + 2 indexes per spec; 7 entity rows + 7 versions rows; 13 emission call sites populating `emission_call_sites_json`. F14 amendments dated 2026-05-05 + 2026-05-06: simpleType count 5 -> 4; "7 complexTypes" prose mislabel -> 7 EVENTS sharing 5 named complexTypes (damagetype + deathtype + backpacktype shared + poweruptype shared + mapitemtype). Spec's regex pattern at 5.6.b matches the legacy commented-out emission shape; live source uses multi-line wrapper concat -- handler ships live-source-faithful regex producing the locked 13-site count.
Notes: All count corrections are dated F-amendments; the underlying schema shape is unchanged. F11 amendment 2026-05-05 added a +1 row (`sp_sp` info_player_start added between Pass 5.4 source-walk and Phase 5 drafting -- a true upstream change captured in the audit trail). The dual-row design (D10) holds: 16 KTX channel='logfile' log_template rows + 7 match_event rows; 9 of the 16 logfile rows carry XML-shape content per Phase 6 boundary verification; D14 JSONB shape clean (jsonb_typeof='array' for both attributes_json and emission_call_sites_json).

### Pass 5 -- Per-category gameplay-content design

Status (5.1 -- 5.6): **DELIVERED-DIFFERENT** (catalog count grew 19 -> 23 -> 24 -> 27 across the spec's own amendments; field-name corrections in F9; macro depth correction in F11).
Evidence:
- 5.1 (race + bloodfest + mutators): catalog landed at 27 rows after the 5.1 amendment surfaced 8 mutators via wiki cross-check (LGC + instagib + midair + berzerk + yawnmode + killquad + freshteams + nosweep). F5 grid reproduced exactly in dev DB.
- 5.2 (per-_um_init extraction): one row per cvar-set line shipped as F6 (~309 expected; live 317; baseline 52 from `common_um_init` apply_order=1 + 265 per-mode overlays apply_order=2; F6 band [280, 360] PASSes). Pattern 6 cross-header lift (D4) consumed by `_handler_modes.py`; F15 anchors `LGCMODE_VARIABLE` -> `"k_lgcmode"` and `TOT_MODE_VARIABLE` -> `"k_tot_mode"` resolve at `commands.c:4178/4179` post-lift. 5.2.c new kind `'mode_default'` shipped via migration 011.
- 5.3 (handler architecture): four handlers grouped by walking strategy as Pass 5.3 specified. All four registered in `extract.py` and dispatched per their walking pattern. EXTRACTOR-PLAYBOOK Handler-grouping rationale section (Phase 8 obligation) shipped at line 149 capturing the Option-A/B/C reasoning.
- 5.4 (per-kind props_json finalization): all 9 kinds' field sets shipped as locked. F9 double-amendment (`count_modifier` -> `armor_for_kill` -> `hp_for_kill`) -- soft-watch flag noted in F9 for any third re-walk; live `bloodfest_monster_t` struct field name is `hp_for_kill` per `sp_monsters.c:48-52`.
- 5.5 (migration files): three semantically split files shipped (009/010/011 post-renumber). Per-migration content unchanged from D5 spec.
- 5.6 (match_event handler implementation): 5.6.a stdlib `xml.etree.ElementTree` confirmed; 5.6.b regex over fixed 4-file glob (live regex shape adapted to multi-line wrapper concat per F14 amendment 2026-05-05); 5.6.c project-private Tier 3 placement; XSD-driven; `_handler_match_events.py` does NOT inherit from Visitor (D3 amendment 2026-05-05 explicit carve-out). Handler implements 7 lifecycle stubs + setup + finalize per F28 inline drain.
Notes: Pass 5's own self-amendments (catalog count growth, field-name corrections, macro depth correction) are part of the spec at this point (the spec is locked but documents its own sketch corrections). All four DELIVERED-DIFFERENT facets are reasoned + dated in `review-findings.md` amendments. F25 (modes handler not parallel-safe) was discovered Phase 3, worked-around with serial guard, then closed in-arc via Phase 5.5 Pattern 13 emission retrofit -- shipped beyond the original 9-phase plan; documented as a positive-shape deviation (see Shipped beyond spec section below).

### Decision invariant cross-check (D-rules from `decisions.md`)

Status: **DELIVERED**.
Evidence: D1 (spec is truth) + D2 (KTX is libclang) + D3 (Visitor only with documented match_event carve-out) + D4 (Pattern 6 depth-1 lift) + D5 (three migration files) + D6 (handler grouping by walking strategy) + D7 (Pattern 14 canonical-name suffix) + D8 (single-key gate convention) + D9 (source-fidelity for canonical tokens) + D10 (dual-row log_template + match_event design) + D11 (two-axis catalog discriminator) + D12 (per-line mode_default granularity) + D13 (OUT_OF_SCOPE.md as canonical disposition record) + D14 (JSONB direct-bind, no pre-stringify) + D15 (idempotent loaders + regression guards stay armed) + D16 (single-commit-per-phase) + D17 (operator review at every boundary) + D18 (subagent matrix) + D19 (ASCII output discipline) + D20 (main tree default, no PR ceremony) all verified at every phase boundary in arc-history. D16 has two documented housekeeping asterisks (Phase 1 perf follow-on `864fdf7c` + Phase 7 fixture follow-on `9019d2d8`) -- 8-for-8 functional streak with explicit deviation rationale captured.

### Findings closure

Status: every F-number in `review-findings.md` is closed or routed.
Evidence:
- F1-F22: original spec-callout findings; all phase-owned and verified at boundaries.
- F23 (Phase 2 probe 5 tab-depth) + F24 (validCommand gap) + F26 (Pattern 6 string-literal-only) + F27 (Pattern 9 banner-coverage variability) + F29 (Phase 7 anchor probe drift): inline-resolved with PLAYBOOK note candidates owned by Phase 8; all PLAYBOOK additions shipped.
- F25 (modes handler parallel-safety): closed in-arc via Phase 5.5 Pattern 13 retrofit; cross-arc invariant captured in EXTRACTOR-PLAYBOOK at line 545. Disposition-closure amendment dated 2026-05-06 explicitly REJECTS the proposed `Visitor.parallel_safe: bool` opt-out path.
- F28 (non-Visitor handler infrastructure gaps): drained inline at Phase 6; PLAYBOOK addition shipped at line 598 with full 7-method lifecycle stub list + transition-scan exclusion convention.

### Cross-checks

- **Decisions.md amendments fully captured.** D3, D4, D5 each have dated amendment blocks with reasoning. D4's amendment includes "do not revert this amendment" commentary. PASS.
- **Review-findings.md fully resolved or routed.** Every F1-F29 is resolved by phase, dissolved with reasoning, or has phase ownership in the table at line 532. PASS.
- **Arc-history entries match phase outputs.** Top section of arc-history.md has one paragraph per phase + Phase 5.5 + Phase 1 perf follow-on. Each describes shipped state matching live source verification. PASS.
- **Executor prompt augmentations preserved.** Per-phase drafter prompts present at `phase-N-drafter-prompt.md` (1.5KB-9KB each). Per-session orchestrator resume docs at `docs/superpowers/parking/2026-05-06-ktx-onboarding-orchestrator-resume{,-session-3,-session-4}.md`. The Phase 6/7/8 executor briefings are documented as ephemeral (`/tmp/`) per the post-arc handoff -- captured as Arc N+1 prep recommendation 5 below if the operator wants them durable.
- **Spec promises NOT addressed by any phase MD.** Walked the spec end-to-end. Every promise maps to a phase MD or is explicitly captured as a non-goal in the spec preamble's "Out of scope" or `decisions.md` D5/D8 carve-outs. No silent drops.

## Shipped beyond spec

1. **Phase 5.5 (Pattern 13 emission retrofit on modes handler).** Not in original 9-phase plan; surfaced mid-arc as F25 disposition-closure decision 2026-05-06 after Phase 5's tables handler shipped Pattern 13 first-attempt-clean. Closed F25 in-arc rather than parking. Pattern 13 is now a three-consumer arc-pattern (Phase 2 commands + Phase 5 tables + Phase 5.5 modes); cross-arc invariant captured in EXTRACTOR-PLAYBOOK. Single commit `44f5b894`; pytest 7/7 PASS cold; 3.3x parallel speedup (16.9s -> 5.1s on `--workers 4`). **Recommendation: promote to spec amendments for any future engine port.** The "any future libclang handler with cross-file refs MUST use Pattern 13 emission" rule is now load-bearing infrastructure, not a KTX-only lesson; the EXTRACTOR-PLAYBOOK addition at line 545 documents it as such.

2. **Phase 1 perf follow-on (`864fdf7c`).** Diagnostic-only commit testing F16 hypothesised optimisation; falsified empirically; `_source.py` reverted; F16 amendment 2026-05-06 captures the cost-driver finding so a future arc doesn't repeat the experiment. Cost driver is `cursor.location` access on ~9,137 `MACRO_DEFINITION` cursors, NOT `get_tokens()` on the 901 in-closure hits. **Recommendation: when D4 depth-N revisit lands as its own arc, the cost-driver finding belongs in the spec preamble so the planner doesn't re-litigate filter relocation.** The F16 amendment already captures it; promotion to a future depth-N arc spec is a copy-paste at planning time.

3. **Phase 7 housekeeping follow-on (`9019d2d8`).** Runbook fixture NOT-NULL columns + DO-block transaction-termination correction caught at boundary verification Probe 5. Same probe-spec drift class as F23 / F27 / F29; structurally clean follow-on caught at boundary review. Joint Phase 8 PLAYBOOK addition for the discipline gap shipped at line 581. **Recommendation: accept as the documented anchor probe live-data verification rule.** The PLAYBOOK addition is the canonical capture; no further work needed.

4. **EXTRACTOR-PLAYBOOK additions (Phase 8) -- 11+ instead of 4.** Spec called for 4 originals (Pre-Port Discovery Sweep, Pre-Commit Discovery Cross-Check, Handler-grouping rationale, Pattern 15 STRING_LITERAL-array). Arc shipped 7 additional sections: Pattern 10 ENUM_DECL widening (Phase 4), Pattern 16 X-macro file-parse introduction (Phase 4 wholly new pattern), Dual-row design note (D10/F17), F25 cross-arc invariant section, F26 Pattern 6 string-literal-scope note, F27 Pattern 9 banner-coverage variability note, F28 Non-Visitor handler infrastructure section (full 7-method lifecycle stub list + transition-scan exclusion convention), F29 anchor probe live-data discipline. **Recommendation: accept as the canonical reference for the next engine port.** Operator's HANDOVER item "retroactive extractor-rationale audit" (4 already-shipped engines) becomes lighter once ezQuake / FTE / QWCL / MVDSV get the Phase 8 PLAYBOOK additions retro-applied as one-paragraph rationale-captures each.

5. **F11 +1 row drift captured as upstream-change audit trail.** Pass 5.4 source-walk produced 30 drop_item rows; Phase 5 source-walk produced 31 (`sp_sp` info_player_start added in the period between Pass 5.4 and Phase 5 drafting). Captured in F11 amendment 2026-05-05; phase-boundary probe asserts count = 31. **Recommendation: keep the per-walk dating discipline.** Two source-walks producing two different counts is a feature, not a bug; the audit trail matters more than the spec-vs-shipped point delta.

## Open YELLOWs from sign-off

1. **YELLOW: KTX `gameplay_taxonomies._stats.election_type.source_total` parallel-aggregator-naive** (D.3.1 / D.6.1 of Phase 7 cross-project audit; surfaced 2026-05-06).
   Issue: under `--workers > 1`, the stat reports 4x the correct value (5 election rows x 4 workers because `progs.h` is included by every TU); row data is correct, only the pre-dedup `_stats.source_total` field differs. Breaks Section-1.1 byte-reproducibility under default `--workers 12`; does NOT affect emitted rows.
   Evidence: cross-project audit Section D.6 (`docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md:114-123`); sized as <30-line fix per Phase 5.5 Pattern 13 emission precedent.
   Investigation status: root cause known (`_handler_gameplay_taxonomies.py:385` computes `len(raw_election_rows)` over pre-dedup data; should aggregate via Pattern 13 typed pseudo-rows).
   Recommendation: drain in next QW Oracle arc as a small followup. HANDOVER captured (Recently opened section).

2. **YELLOW: KTX handler class-name shape inconsistent** (D.2.1 of Phase 7 audit). 4 use `<Type>KtxHandler` (cvars/commands/info_keys/log_templates -- Phase 2 Pass-1 set), 4 use `Ktx<Type>Handler` (modes/gameplay_taxonomies/gameplay_tables/match_events -- Phase 3-6 Pass-5 set). Cosmetic only; no behavioral consequence. Investigation status: drift surfaced at audit, root cause is two different drafter terminals over the arc's two-pass shape. Recommendation: defer indefinitely OR fold into a future cosmetic-cleanup pass alongside the 2026-04-28 D.5.1/D.5.2 FTE class-name nits.

3. **YELLOW: 5 ezquake F1 FAILs** (`F1.ezquake.floor.{cmdline_param,command,cvar,hud_element}_source_state` + `F1.ezquake.anchor.doc_only_count`). Pre-existing classification drift since 2026-04-28 (HANDOVER:26); D.1.1 of Phase 7 audit captures one entry-point (`expected=194` vs live 183). Investigation status: probe expected values are stale baselines; the underlying entities exist correctly in the DB. NOT a KTX onboarding regression. Recommendation: re-anchor probes to current counts OR investigate the 11-row delta -- operator's call. Lightweight; can drain as small followup OR fold into a future ezquake refresh arc.

4. **YELLOW: Phase 7 idempotency probe not run live.** `apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh` ships syntax-clean and executable (3265 bytes); not run in Phase 7 executor terminal because host lacks psql. D15 invariant enforced by Phase 2-6 loaders' boundary checks (load-twice produces identical row counts at each phase boundary); the audit gate is durable but unverified end-to-end at Phase 7 boundary. Recommendation: future operator-driven smoke run when the prod dump-restore happens. Captured as Arc N+1 prep recommendation 1 below.

5. **YELLOW: F16 walk-time overhead 66-163%** above the original <10% gate (KTX `commands.c` +40ms / 66%; ezQuake `vid_sdl2.c` +130ms / 163%). Accepted as inherent to the libclang per-cursor attribute model under `PARSE_DETAILED_PROCESSING_RECORD`; the offline pipeline budget absorbs the per-tag drag. Investigation status: root cause known + falsified hypothesis documented in F16 amendment 2026-05-06. Recommendation: accept-and-document. F16 amendment captures the cost-driver finding for any future depth-N lift attempt; no further action.

## Recommendations for Arc N+1 prep

Listed in increasing scope.

1. **Run KTX prod deploy.** Pure operator-driven dump-restore per the prod-update-lifecycle spec: pg_dump from dev container -> scp to Unraid -> psql -1 restore. Tier 2 dump archival (rolling N=5) recommended one-time setup if not already in place. Effort: ~30 min including idempotency-ktx.sh smoke. Source: handoff post-arc cleanup item; lifecycle spec subsections 2.1, 2.5. Dependencies: none (all 9 phases shipped).

2. **Drain KTX gameplay_taxonomies parallel-stat fix** (YELLOW 1). Inline patch sized at <30 lines (move `source_total` to Pattern 13 typed pseudo-row aggregation per Phase 5.5 / F25 precedent). Effort: ~30-60 min. Source: cross-project audit D.3.1/D.6.1; HANDOVER (Recently opened). Dependencies: none. Could fold into recommendation 4 if a broader sweep happens.

3. **Re-anchor or investigate 5 pre-existing ezquake F1 FAILs** (YELLOW 3). Lightweight if just re-anchoring probe expected values; medium if investigating the 11-row delta on `doc_only_count`. Effort: ~30 min (re-anchor) or ~2 hours (investigate). Source: HANDOVER:26 since 2026-04-28; D.1.1 of Phase 7 audit. Dependencies: none.

4. **Delete two HANDOVER bullets** per the post-arc handoff: "qw-oracle slim-doc Arc 1 refresh sweep" (per F20; absorbed by Phase 8) and one operator-judgment item (likely "Cron-based upstream-drift detector for Layer 1 codebases" or "Dev DB backup hygiene"). Effort: ~5 min. Source: post-arc handoff cleanup section. Dependencies: operator picks the second item.

5. **Capture per-phase executor briefings durably** if they're load-bearing for future-arc onboarding patterns. Per the cross-checks above, Phase 6/7/8 executor briefings exist only in `/tmp/`; sessions #2/#3/#4 entry briefings are committed at `docs/superpowers/parking/`. If the briefings carry reusable shape lessons (e.g., "how the operator drove orchestrator-to-executor handoffs across three sessions"), capture them in the arc scaffold or HANDOVER routes. Effort: ~30-60 min if the operator wants them; can skip if the arc-history paragraphs already capture the load-bearing parts. Source: cross-check during this review.

6. **Layer 3 concept-note authoring for KTX content** -- the rich Layer 1 anchors from this arc unblock the parking doc at `docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md`. 8 mutator-shaped concept-note candidates (LGC, instagib, midair, berzerk, yawnmode, killquad, freshteams, nosweep) each with strong "no good documentation exists" framing per the spec's own Pass 5.1 amendment. Effort: this is its own Layer 3 arc, not a small followup -- estimated 1-2 days per concept note depending on community-research depth. Source: Pass 4 / Pass 5 carry-forwards to Layer 3 workstream. Dependencies: KTX onboarding shipped (now true).

The arc shipped clean. Five YELLOWs at sign-off, none blocking; all have evidence + recommended dispositions. D16 8-for-8 functional with documented housekeeping asterisks. F19/F22 doctrine survival verified across all 5 reference sites at session-close. EXTRACTOR-PLAYBOOK ratchets up cross-arc value with 11+ additions vs the spec's 4 originals. KTX is the 5th codebase in QW Oracle Layer 1 and the qw-event-log validation harness is now schema-unblocked. Arc N+1 picks from the 6 ranked recommendations above; operator's call which fit the next arc's energy.
