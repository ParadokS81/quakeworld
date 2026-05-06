# Post-arc handoff -- KTX Layer 1 Onboarding (arc-reviewer pass)

**Use as the literal first message in a fresh `claude` terminal.** All 9 phases (0 / 1 / 2 / 3 / 4 / 5 / 5.5 / 6 / 7 / 8) shipped 2026-05-05 -> 2026-05-07. arc-orchestrator session #4 wrapped at the post-Phase-8 boundary; the fresh-terminal requirement for arc-reviewer is structural per the skill description ("a terminal that ran any phase has anchored expectations and cannot deliver an honest spec-vs-shipped read"). This handoff is the cold input arc-reviewer's pre-flight reads.

---

## Skill to invoke

`arc-reviewer`. Read spec + decisions + arc-history + per-phase MDs + cross-phase memory captures + executor halt reports + this handoff -- ALL COLD; did NOT execute any phase. Walk every spec section to verdict (DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING). Surface shipped-beyond-spec items. Report YELLOW (open issues at sign-off). Produce Arc N+1 prep recommendations.

---

## Arc summary

**Arc slug:** `2026-05-04-ktx-onboarding`

**Goal:** Onboard canonical KTX (https://github.com/QW-Group/ktx) -- the C-language QuakeWorld server modification -- into QW Oracle Layer 1. KTX is the 5th codebase after ezQuake / FTE / QWCL / MVDSV. Includes Pass 1 first-class entity surface (cvar / command / info_key / log_template) + Pass 5 gameplay-content surface (5 enum taxonomies + 5 struct-array tables + 7 XSD-defined match-event types) + 3 pure-additive migrations + cross-header Pattern 6 lift that all future engines benefit from.

**Outcome:** Arc shipped end-to-end. KTX Layer 1 queryable via MCP. qw-event-log validation harness unblocked at schema level. Layer 3 concept-note candidates eligible. All 9 phases produced runnable boundary states; D-rules respected throughout.

**Phase commit chain (in commit order):**

| Phase | Commit(s) | Date | Status |
|---|---|---|---|
| 0 | `860aaf0d` | 2026-05-05 | DONE |
| 1 | `ecf0151d` + `44b289ed` + perf follow-on `864fdf7c` (2026-05-06) | 2026-05-05 | DONE_WITH_CONCERNS (D16 deviation: 2 commits) |
| 2 | `063bae80` | 2026-05-06 | DONE (F23 + F24 inline drains) |
| 3 | `573d8b8e` | 2026-05-06 | DONE_WITH_CONCERNS (F25 architectural; clean workaround in scope) |
| 4 | `03a5b366` | 2026-05-06 | DONE |
| 5 | `377f8549` | 2026-05-06 | DONE_WITH_CONCERNS (F26 + F27 inline-resolved) |
| 5.5 | `44f5b894` | 2026-05-06 | DONE; F25 closed |
| 6 | `e0133248` | 2026-05-06 | DONE_WITH_CONCERNS (3 phase-MD gaps drained inline; F28 captured) |
| 7 | `6fabeecd` + housekeeping `9019d2d8` | 2026-05-06 | DONE_WITH_CONCERNS (F29 inline drains; housekeeping follow-on for runbook fixtures) |
| 8 | `83288501` | 2026-05-07 | DONE; arc closed |

**D16 single-commit-per-phase:** 8-for-8 functional streak with two housekeeping asterisks (Phase 1 ship-split + Phase 7 fixture follow-on). The asterisks are documented; no silent deviations.

**Working-tree fence held throughout:** 23 uncommitted (operator's MCP-API WIP under `apps/qw-oracle/serve/mcp/*` + `apps/qw-oracle/CLAUDE.md` + untracked `apps/qw-oracle/API_CONTRACTS.md`, plus QWiki plan-doc edits under `docs/superpowers/plans/2026-05-04-qwiki-community-reference/*`) untouched across all phases. Verified at every phase boundary by orchestrator.

---

## Required reads (in order)

**Primary inputs (read in full before walking the spec):**

1. **Spec:** `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` (~1480 lines). The five-pass arc-brainstormer design that closed cleanly with operator sign-off at each pass close. This is the source of truth for spec-vs-shipped verdicts.
2. **Sibling spec:** `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md` (Pass 2 of brainstorm; generalised to all codebases). Reference for any deploy-shape callouts.
3. **Arc plan scaffold:** `docs/superpowers/plans/2026-05-04-ktx-onboarding/`
   - `README.md` -- phase index + final "Where we are right now" + slicing rationale + dependency map.
   - `decisions.md` -- 20 commitments + 3 dated 2026-05-05 amendments (D3 / D4 / D5).
   - `review-findings.md` -- 29 findings (F1-F29). Phase ownership table at the bottom anchors reviewer's verdict-per-finding walk.
   - `prerequisites.md`, `phase-template.md`, `handoff-prompt.md` -- planning-time scaffolding; reference only.
   - 9 per-phase MDs: `phase-0-doctrine-fixes.md` through `phase-8-end-of-arc-docs.md`. Phase 5.5 has no separate MD (in-arc retrofit; documented in arc-history + F25 amendment).
4. **Arc history (cross-phase memory):** `apps/qw-oracle/docs/arc-history.md` -- top KTX section. The single most load-bearing input. Per-phase retrospective entries capture what shipped, what was caught, F-amendments, decision amendments, D-rule compliance, working-tree-fence verification. Reviewer reads this end-to-end to anchor on shipped state.
5. **Phase 7 cross-project audit:** `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md` (204 lines; 5-engine F1+F2 grid; 4 effective findings). Reviewer's reference for cross-project sibling-handler analysis.

**Per-phase executor briefings (operator-pasted prompts; reference only):**

6. Session #1 wrap-out: in commit `9e89186f` (Phase 1 wrap; pre-orchestrator-skill).
7. Session #2 entry: `docs/superpowers/parking/2026-05-06-ktx-onboarding-orchestrator-resume.md`.
8. Session #3 entry: `docs/superpowers/parking/2026-05-06-ktx-onboarding-orchestrator-resume-session-3.md`.
9. Session #4 entry: `docs/superpowers/parking/2026-05-06-ktx-onboarding-orchestrator-resume-session-4.md`.
10. Phase 6 / 7 / 8 executor briefings drafted by orchestrator session #4 (under `/tmp/ktx-phase-{6,7,8}-executor-prompt.md`; ephemeral; not in repo).

**Operator memory (read on-demand if a verdict question hinges on operator preference):**

`feedback_orchestrator_terminal_pattern.md`, `feedback_no_subagents_for_mechanical_edits.md`, `feedback_model_effort_range.md`, `feedback_audit_predictions_not_contracts.md`, `feedback_verification_layer_catches_lift_residuals.md`, `feedback_idempotency_before_staleness.md`, `feedback_every_finding_gets_a_track.md`, `feedback_be_decisive.md`, `feedback_trust_operator_pace_estimates.md`, `feedback_repair_by_reextract_not_sql_update.md`, `feedback_narrow_arc_before_broad.md`.

---

## Cross-phase memory captures (decision amendments + new findings)

### Decision amendments (3 dated 2026-05-05)

| Decision | Amendment date | Summary |
|---|---|---|
| **D3** | 2026-05-05 | match_event handler is the documented carve-out from Visitor-only inheritance (Phase 6 drafter source-walk). XSD-driven, standalone with duck-typed lifecycle stubs. Spec 5.6.c reconciliation. |
| **D4** | 2026-05-05 | Pattern 6 lift mechanism corrected: `PARSE_DETAILED_PROCESSING_RECORD` flag was already in `PARSE_OPTS` pre-arc (Phase 1 drafter source-walk); Phase 1 adds post-parse macro-walk only. F16 amendment paired. |
| **D5** | 2026-05-05 | Migration filenames renumbered from `008 / 009 / 010` to `009 / 010 / 011` due to qwiki arc's `008_community_schema.sql` slot collision. Content unchanged. Phase 1 + Phase 8 absorbed the renumbering. |

### New findings during execution (F23-F29; 7 findings)

| Finding | Phase discovered | Disposition |
|---|---|---|
| **F23** | Phase 2 | Probe 5 tab-depth calibration off; corrected probe used during execution; handler behavior correct. |
| **F24** | Phase 2 | `validCommand` gap in `load-version.ts` blocked Pattern 14 colon suffixes; fixed inline. |
| **F25** | Phase 3 | Modes handler keeps cross-file refs on instance state; not parallel-safe. Closed in-arc via Phase 5.5 Pattern 13 emission retrofit. |
| **F26** | Phase 5 | `collect_file_macros` is string-literal-only by design; integer/hex constants need handler-private fallback. Tactical fix shipped (`_DROPITEM_MACRO_FALLBACK` extended); Phase 8 PLAYBOOK addition documents. |
| **F27** | Phase 5 | Pattern 9 banner-coverage probe assumed `/* === */` blocks; KTX teamplay.c uses line-comment style. Probe wording stale; handler design correct. Phase 8 PLAYBOOK addition documents source-file-style variability. |
| **F28** | Phase 6 | Non-Visitor handler infrastructure gaps: load-version transition-scan source_file assumption + 5-vs-7 lifecycle stub list. Both drained inline; Phase 8 PLAYBOOK addition documents. |
| **F29** | Phase 7 | Anchor probe live-data verification discipline; three Phase 7 MD anchors had stale predicates (monster name `fish` -> `monster_fish`; attributes_json typeof object -> array; format_string LIKE three-tab -> XML-content). All corrected inline; underlying invariants hold. Phase 8 PLAYBOOK addition documents. |

### F-amendments to existing findings

- **F4 (log_template counts):** 2026-05-05 amendment captured per-API drift at canonical-1.46.
- **F8 (death_rule):** 2026-05-05 amendment corrected breakdown 30/28/2 -> 29/27/2 + `related_weapon` underscored canonical-name form.
- **F9 (monster):** 2026-05-05 amendment corrected `count_modifier` -> `armor_for_kill` -> `hp_for_kill` (double-amended; soft-watch flag for any third re-walk).
- **F11 (drop_item):** 2026-05-05 amendment corrected count 30 -> 31 + macro depth correction (H_ROTTEN / H_MEGA at depth-2). 2026-05-06 amendment corrected `WEAPON_BIG2` resolution claim per F26 evidence.
- **F14 (match_event):** 2026-05-05 amendment corrected simpleType count 5 -> 4 + spec 5.6.b regex multi-line wrapper shape. 2026-05-06 amendment corrected anchor body's "7 complexTypes" prose mislabel (those are 7 EVENT names sharing 5 named complexTypes).
- **F16 (Pattern 6 perf):** 2026-05-05 amendment paired with D4. 2026-05-06 amendment captured perf follow-on diagnostic results (hypothesised optimisation falsified empirically; cost driver is `cursor.location` access, not `get_tokens()`; `_source.py` reverted; <10% gate accepted as over-tight given offline cost model).
- **F17 (dual-row design):** 2026-05-05 amendment captured live source produces 7 sites under tight pattern + 24 sites under broader pattern; F14's 13-site anchor reflects per-XSD-complexType emission groupings.
- **F25 (modes parallel-safety):** 2026-05-06 disposition-closure amendment after Phase 5.5 retrofit. Pattern 13 emission is now a three-consumer arc-pattern; `Visitor.parallel_safe` opt-out path REJECTED.

---

## Phase ownership of findings (final)

(Reproduced from `review-findings.md` for reviewer's verdict-walk anchor.)

| Phase | Findings to verify before sign-off |
|---|---|
| Phase 0 | F18 (delete TS regex extractor), F19 (doctrine fixes), F22 (5th doctrine site) |
| Phase 1 | F4, F15 (cross-header lift), F16 (parse-time impact) |
| Phase 2 | F1, F2, F3, F4, F17, F23, F24 |
| Phase 3 | F5, F6, F15, F25 |
| Phase 4 | F7, F8 |
| Phase 5 | F9, F10, F11, F12, F13, F26, F27 |
| Phase 5.5 | F25 disposition closure (Pattern 13 retrofit) |
| Phase 6 | F14 (third 2026-05-06 amendment), F17, F28 |
| Phase 7 | F21, F28 (cross-project audit probe), F29 |
| Phase 8 | F19 (survival), F20 (HANDOVER absorbed), F17 (PLAYBOOK), F22 (survival), F26 / F27 / F28 / F29 (PLAYBOOK additions) |

---

## YELLOW (open issues at sign-off)

Items that landed in HANDOVER's "Recently opened" section during the arc; reviewer flags as YELLOW for Arc N+1 prep prioritization:

1. **KTX gameplay_taxonomies `_stats.election_type.source_total` parallel-aggregator-naive** (D.3.1 / D.6.1 of Phase 7 cross-project audit; surfaced 2026-05-06). Stat-only under `--workers >1`; row data correct. Sized <30 lines via Phase 5.5 Pattern 13 retrofit precedent. Defer-to-future-arc per HANDOVER bullet (Recently opened).

2. **KTX handler class-name shape inconsistent** (D.2.1 of Phase 7 audit). 4 use `<Type>KtxHandler` vs 4 use `Ktx<Type>Handler`. Cosmetic only; no behavioral consequence. Defer indefinitely.

3. **5 ezquake F1 FAILs** (`F1.ezquake.floor.{cmdline_param,command,cvar,hud_element}_source_state` + `F1.ezquake.anchor.doc_only_count`). Pre-existing classification drift since 2026-04-28 (HANDOVER:26); D.1.1 of Phase 7 audit captures one entry-point. NOT a KTX onboarding regression. Refresh probe expected values OR investigate underlying classification drift -- operator's call.

4. **Phase 7 idempotency probe not run live** (`idempotency-ktx.sh` ships syntax-clean and executable; not run in Phase 7 executor terminal because host lacks psql). D15 invariant enforced by Phase 2-6 loaders' boundary checks; the audit gate is durable but unverified end-to-end at Phase 7 boundary. Future operator-driven smoke run recommended.

5. **F16 walk-time overhead 66-163%** above the original <10% gate. Accepted as inherent to the libclang per-cursor attribute model under `PARSE_DETAILED_PROCESSING_RECORD`; the offline pipeline budget absorbs the per-tag drag. F16 amendment 2026-05-06 captures the cost-driver finding for any future depth-N lift attempt.

---

## Shipped beyond spec (reviewer surfaces these)

- **Phase 5.5 (in-arc Pattern 13 retrofit on modes handler):** not in original 9-phase plan; surfaced mid-arc as F25 disposition-closure decision (orchestrator session #3 + operator agreed 2026-05-06). Closed F25 in-arc rather than parking. Pattern 13 is now a three-consumer arc-pattern (Phase 2 commands + Phase 5 tables + Phase 5.5 modes); cross-arc invariant.

- **Phase 1 perf follow-on (`864fdf7c`):** diagnostic-only commit testing F16 hypothesised optimisation; falsified empirically; `_source.py` reverted; F16 amendment captures the cost-driver finding so a future arc doesn't repeat the experiment.

- **Phase 7 housekeeping follow-on (`9019d2d8`):** runbook fixture NOT-NULL columns + DO-block transaction-termination correction caught at boundary verification Probe 5. Same probe-spec drift class as F23 / F27 / F29 (joint Phase 8 PLAYBOOK addition).

- **EXTRACTOR-PLAYBOOK additions (Phase 8):** spec called for 4 originals (Pre-Port Discovery, Pre-Commit Discovery Cross-Check, Handler-grouping rationale, Pattern 15 STRING_LITERAL-array); arc shipped 7 additional (Pattern 10 widening, Pattern 16 introduction, dual-row design note, F25 cross-arc invariant, F26 Pattern 6 string-literal scope, F27 Pattern 9 banner-coverage variability, F28 non-Visitor handler infrastructure, F29 anchor probe live-data discipline). Total 11+ PLAYBOOK additions; cross-arc value ratchets up.

---

## Counts in dev DB at arc close

- **entities:** cvar=260, command=358, info_key=7, log_template=1195, match_event=7. Total 1827 KTX rows.
- **gameplay_entity_defs:** monster=13.
- **gameplay_mechanics:** game_mode=27, mode_default=317, election_type=5, death_rule=27, score_system=3, drop_item=31, loc_macro=15, teamplay_message=21 = 446 total.
- **match_event_versions:** 7 rows; both JSONB columns `jsonb_typeof = 'array'` (D14 holds).
- **log_template_versions channel='logfile' XML rows:** 9 (D10/F17 dual-row holds; Phase 2 printf-handler git-clean since session #3 wrap; verified at every subsequent phase boundary).

**24 KTX F1 probes all PASS at exact equality.** **JSONB regression gate clean across 17 cross-project columns (0 string scalars).** **Prior-engine F1 grid clean post-KTX:** FTE / QWCL / MVDSV all 123/123/123 PASS; ezquake has 5 pre-existing FAILs (HANDOVER:26).

---

## D-rule compliance summary (final)

| D | Compliance |
|---|---|
| D1 (spec is source of truth) | ✓ |
| D2 (KTX is libclang) | ✓ doctrine survival verified Phase 8 |
| D3 (Visitor only inheritance) | ✓ with documented match_event carve-out (D3 amendment 2026-05-05) |
| D4 (Pattern 6 depth-1 lift) | ✓ Phase 1 ship + 2 amendments (F15 + F16) |
| D5 (three migration files) | ✓ renumbered 009/010/011 per amendment |
| D6 (handler grouping by walking strategy) | ✓ all 4 KTX gameplay handlers + match_event |
| D7 (Pattern 14 canonical-name suffix) | ✓ commands + info_keys |
| D8 (single-key gate convention) | ✓ all gameplay rows |
| D9 (source-fidelity for canonical tokens) | ✓ |
| D10 (dual-row design) | ✓ verified at Phase 6 boundary + Phase 7 audit |
| D11 (two-axis catalog discriminator) | ✓ 27 game_mode rows |
| D12 (per-line mode_default granularity) | ✓ 317 rows |
| D13 (OUT_OF_SCOPE.md) | ✓ Phase 0 + per-phase appends |
| D14 (JSONB direct-bind) | ✓ F1.jsonb_columns_not_strings clean across all KTX columns |
| D15 (idempotent loaders) | ✓ verified at every phase boundary |
| D16 (single-commit-per-phase) | ✓ 8-for-8 functional with P1 + P7 housekeeping asterisks |
| D17 (operator review at boundary) | ✓ every phase |
| D18 (subagent matrix) | ✓ honored per phase MD |
| D19 (ASCII output discipline) | ✓ |
| D20 (main tree, no PR) | ✓ |

---

## Post-arc cleanup (operator-driven; not arc-reviewer territory)

After arc-reviewer completes the spec-vs-shipped walkthrough:

1. **Delete two HANDOVER bullets:**
   - "qw-oracle slim-doc Arc 1 refresh sweep" (per F20; absorbed by Phase 8).
   - Second TBD per operator judgment (likely the "Cron-based upstream-drift detector for Layer 1 codebases" or "Dev DB backup hygiene" entries that surfaced during KTX onboarding Pass 2; operator picks).
2. **Unblock qw-event-log validation harness parking doc** at `docs/superpowers/parking/2026-04-XX-qw-event-log-cross-validation.md` (gated on KTX cvars + KTX gameplay overrides; both shipped).
3. **Layer 3 concept-note candidates** at `docs/superpowers/parking/2026-05-04-ktx-layer3-concept-note-candidates.md` become eligible.

---

## Reviewer's task

Walk every spec section against shipped state. Verdict-per-section:

- **DELIVERED** -- shipped exactly as spec'd.
- **DELIVERED-DIFFERENT** -- shipped with a documented deviation (decision amendment OR F-amendment OR phase-MD Open Questions resolution).
- **DEFERRED** -- spec'd but parked to future arc with explicit rationale.
- **MISSING** -- spec'd but not shipped and no documented deferral.

Surface shipped-beyond-spec items (the 4 enumerated above are the obvious ones; reviewer's cold read may find more). Flag YELLOW issues from the section above. Produce Arc N+1 prep recommendations: which deferred items are now ripe, which open YELLOWs warrant follow-on arcs, which patterns earned PLAYBOOK status are reusable across future engine ports.

Output: a review document under `docs/superpowers/reviews/2026-05-07-ktx-onboarding-arc-review.md` with the verdict walk, YELLOW summary, shipped-beyond-spec list, and Arc N+1 prep recommendations.

---

End of post-arc handoff. Fresh terminal: invoke `arc-reviewer` skill, read the inputs above cold, walk the spec, write the review.
