# Memory system consolidation

**Added:** 2026-04-29.
**Status:** Pass 1 done 2026-09-29 (158 -> 69 files, 606KB -> 194KB); pass 2 (move 45 queued memories into repo docs) queued, worklist at the end of this file.
**Verification first:** `M=/home/dev/.claude/projects/-home-dev-projects-quakeworld/memory; wc -c -l $M/MEMORY.md; ls $M/*.md | wc -l; cat $M/*.md | wc -c` — compare against the docs-check Phase 1 Step 5 signals (index ~5KB, single memory ~4KB, corpus ~60KB). Original baseline: 13.4KB / 126 lines / 78 files (2026-04-29).

## Why we're not designing now

The 2026-04-29 brainstorm closed without a design because the felt pain (root-cause: over-eager memory ingest + no proper homes for arc-receipt content, everything piling into HANDOVER + memory) appears already addressed by **upstream doc-system work that landed the same day**:

- Plan 3 of the docs-redesign established `arc-history.md` per project as the canonical destination for shipped retrospectives — closes the arc-receipt-into-memory leak at the source.
- The new HANDOVER docket shape adds 5-category routing (drained inline / small followup / sidequest / ongoing arc / future arc / shipped retrospective) — closes the "everything goes to HANDOVER in one pile" leak.
- The new docs-check Phase 1 Step 5 flags MEMORY.md size drift and recommends scheduling consolidation; Phase 2 Step 4 runs forward-going memory updates per session.
- A manual /dream pass had already happened earlier 2026-04-29, slimming MEMORY.md from 25.3KB → 12.3KB and deleting 7 arc-receipt files.

If the new structure works, the next consolidation pass will be small or unnecessary. Designing a heavier mechanism today would be premature — wait for evidence.

## Re-evaluation trigger

Reopen this entry (and queue an actual brainstorm) when **any** of these fire:

1. docs-check Phase 1 Step 5 flags MEMORY.md ≥ 20KB / ≥ 150 lines / ≥ 30 project memories AND the operator notices the pile growing without an obvious leak source.
2. The operator notices arc-receipt content still slipping into `project_*` memories despite arc-history.md existing.
3. Calendar check: ~3-4 weeks from 2026-04-29 (around 2026-05-20), open this file and re-run the Verification-first command. If thresholds still healthy AND no friction surfaced, close this parking file outright. If thresholds drifted OR friction surfaced, brainstorm.

## 2026-05-22 check-in (trigger #3 fired)

Re-ran the verification command. Thresholds DRIFTED on all three trigger axes:

- Size: 28.1 KB (cap: 20 KB trigger / 24.4 KB load) — index entries individually exceeded ~200 chars, causing session-load truncation.
- Lines: 193 (cap: 150).
- Project memories: 36 (cap: 30).

**Mechanical fix applied this session:** bulk hook-compression across all 138 entries (no memory files touched, only the `MEMORY.md` index). Result: 28.1 KB → 24.0 KB, headroom 0.3 KB under load cap. Lines unchanged at 193; project count unchanged at 36.

**What the mechanical fix did NOT address:**
1. File count drift (138 total, 36 project_*; was 78/?? at 2026-04-29 post-trim baseline).
2. Lines unchanged — would need entry merging/draining, not just compression.
3. Reason the pile grew so fast (~60 files in ~3 weeks) — leak-source diagnosis is the brainstorm question.

**Disposition:** trigger #3's brainstorm condition is now real; schedule a dedicated brainstorm pass for the file-count + leak-source question separately. Mechanical compression bought ~1 month of operational headroom; the structural redesign question is parked for that brainstorm.

Pushed calendar entry to 2026-06-22 (~1 month) for the next check.

## Pressure

Medium. Mechanical headroom secured; structural brainstorm still owed.

## Related

- Spec out-of-scope clause: `docs/superpowers/specs/2026-04-29-docs-system-redesign-design.md` (around line 372).
- Drop-from-Plan-4 commit: `62ea036`.
- Forward-going drift catcher: `~/.claude/skills/docs-check/SKILL.md` Phase 1 Step 5.
- Reference memory: `reference_dream_feature.md` (broken `/dream` + four-phase manual fallback).
- Sibling structural shifts that may have closed the leaks: docs-redesign Plans 3, 4, 5 (HANDOVER docket, docs-check rewrite, OVERVIEW directive).

## Addendum (2026-08-11, chunk-6 migration repair): drain candidates

Extracted from quakeworld HANDOVER.md (pre-migration) at the chunk-6 W17 migration --
the concrete drain-candidate list behind the "Memory system consolidation" future-arc
row, which only carried a file-count/corpus-size summary.

Drain candidates = the three largest memory files, verified via
`ls -laS /home/dev/.claude/projects/-home-dev-projects-quakeworld/memory/ | head -4`
on 2026-08-11:

1. `reference_ktx_cvar_command_pairing.md` -- 35647 bytes (~34.8 KB)
2. `project_slipgate_managed_mode_passes.md` -- 28278 bytes (~27.6 KB)
3. `project_doc_philosophy.md` -- 26158 bytes (~25.5 KB)

## 2026-09-29: triage and pass 1

**Leak source, answered.** The pile was written April to July 2026, before the harness-lab
doctrine existed: design notes, catalogs and status trackers went into memory, then moved into
skills, specs and DOCTRINE (born 2026-08-11) without the memory copy being drained. The count
stopped growing only because QW work paused after early August (operator, 2026-09-29), not
because the leak was fixed. The structural fix is already in place: the docs-check Phase 2 Step 6
two-way gate plus the admission test. Watch the first QW sessions after re-entry for project
truth creeping back.

**Triage.** Seven read-only reviewers judged all 158 files against the doctrine (DOCTRINE
principle 9, the docs-check two-way gate). Verdicts: 85 delete (already in DOCTRINE, a skill, a
repo doc or the code, or obsolete), 41 move-then-delete, 6 merge, 3 pointer, 22 keep (most
trimmed), 1 for the operator (a router admin password in plain text; moved to the ops secret
store by ops, commit `80a5095` in the unRAID repo). Full reports, not committed:
`~/.claude/projects/-home-dev-projects-quakeworld/memory-triage-2026-09-29/`.

**Pass 1 (done).** 90 files removed (deletes plus merge sources), 24 rewritten as short
preference or environment memories, index rewritten as one-line hooks, 18 live repo citations of
removed memories repointed. Store: 158 files / 606KB -> 69 files / 194KB, of which the 24 keepers
are 29.5KB. Snapshot of the pre-cleanup store (router file removed):
`~/.claude/projects/-home-dev-projects-quakeworld/memory-snapshot-2026-09-29-clean.tar.gz`.

## Pass 2 worklist (45 memories to move into repo docs, then delete)

Targets and content come from the triage reviewers and are unverified: check each claim against
the live file before writing. Memory files are in
`~/.claude/projects/-home-dev-projects-quakeworld/memory/`. After each move: delete the memory,
drop its index link, commit per app.

**Do first:** `reference_mvdsv_demo_start_timestamp` corrects a wrong committed spec
(`research/assets/PARSER-SPEC.md` says block `0x0009`, `uint64_le`; mvdsv source encodes ULEB128
in `sv_demo_misc.c`; verify the type id before writing).

| Memory | Target | What moves |
|---|---|---|
| reference_mvdsv_demo_start_timestamp | `research/assets/PARSER-SPEC.md`; `apps/quad/docs/voice-sync-proposal.md` | wire-format fix + malformed-`0x000A` note (mvdsv PR #210); the upgrade ladder `hub ms ?? extractDemoStartMs ?? second-epoch` |
| reference_asset_loader_extractor_capabilities | `extractors/ezquake/_handler_asset_loader_sites.py` header or `EXTRACTOR-PLAYBOOK.md` | functions confirmed absent in ezquake head; lockstep rule with `_handler_asset_cvar_bindings.py`; regeneration + fixture-test commands; path_source taxonomy. Repoint the PLAYBOOK citation |
| reference_c3_cmdlist_blind_ktx_commands | `apps/qw-oracle/data/detection/README.md` | cvarlist is a valid oracle for KTX cvars; cmdlist is blind to KTX `cmds[]`; never dead-stamp on cmdlist absence |
| reference_libclang_compiled_means_parsed_not_linked | `EXTRACTOR-PLAYBOOK.md` known limits | "compiled in variant V" = parsed under V's flags; not-compiled is preprocessor-derivable only; re-derive per fork |
| reference_libclang_ezquake_extraction | `extractors/extractor_lib/clang_config.py` comment | one-liner to discover new `#ifdef` macros; why SERVER_ONLY is server-variant only. Repoint the PLAYBOOK citation |
| reference_qw_oracle_extraction_liveness_gap | `data/detection/README.md`; `SCHEMA.md` (source_state) | detection = runtime-list diff at the same commit (CRLF, `LC_ALL=C`, case-fold); classification needs the call-graph, never a grep counter; cmdline = consumer presence; source_backed != runtime-live |
| reference_track_a_relight_bootstrap | `data/detection/README.md` | the 4-step extract-tag / `accept-runtime-truth.py --stage 2` sequence; only extract-tag applies the overlay; 0 genuine-dead is expected. Re-verify commands |
| feedback_exhaustive_mapping | `apps/qw-oracle/CLAUDE.md` | map exhaustively; false positives mean extraction is incomplete; `source_retired` / `doc_only` exception |
| feedback_lift_candidates_closure_equivalence | `EXTRACTOR-PLAYBOOK.md`, one "Lifting a helper to extractor_lib" checklist | body-diff, closure-diff, then parameterise / hoist / leave private |
| feedback_lift_consumer_adoption_sweep | same checklist | the 4-step adoption sweep |
| feedback_validation_fixtures_not_live_dead_cvars | `VALIDATION-RUNBOOK.md` | never pin canaries to live-source dead cvars; use a frozen synthetic tree or a structural check. Also fix `data/detection/README.md` SANITY GATE pinned on `sb_qtvlist_url` (same anti-pattern) |
| project_qw_dev_head_not_releases | `apps/qw-oracle/CLAUDE.md` | servers run dev-head (KTX 1.47-dev, MVDSV 1.20-dev), so describe/liveness arcs anchor to dev-head; pointer to the 2026-05-15 describe-fill spec |
| reference_qw_oracle_loader_persistence_model | `natural-keys.ts` header or `DEVELOPMENT.md` | enrichment columns absent from upsert SET lists persist; `*_versions` source columns regenerate each load; COALESCE for multi-writer columns; check the SET list before a manual UPDATE |
| reference_loader_adapter_must_reassert_source_state | same place | `upsertEntity` writes source_state on INSERT only; overlay adapters re-assert on the existing-row path; fix the adapter, not shared code |
| reference_qw_oracle_floor_vs_clean_reload | `quality-grid.ts` header near the equality assertions | 3-step check: source_backed unchanged; dropped names have a source_backed twin; second reload nets zero |
| reference_qw_oracle_transition_log_artifact | `SCHEMA.md` under source_state_transitions | from/to are branch literals; verify provenance via `<type>_versions.source_file` (SCHEMA calls it "the receipt layer" with no caveat) |
| reference_l1_snapshot_data_flow | `SCHEMA.md` near the description-provenance family | two surfaces: `entities.description` (MCP) vs `*_versions.help_desc` (snapshot) |
| reference_postgres_js_jsonb_binding | `DEVELOPMENT.md` or `SCHEMA.md` | why `JSON.stringify` breaks JSONB + the `jsonb_typeof` detection query (rule already at VALIDATION-RUNBOOK) |
| reference_ezquake_dual_doc_model | `SCHEMA.md` near `description_origin` | comment = coder WHY, help-JSON = user WHAT; never promote a comment into help-JSON; `description_origin='help_json'` only for genuine help-JSON; `sv_*` routes to MVDSV upstream |
| project_qw_oracle_source_truth | `apps/qw-oracle/OVERVIEW.md` (the line that cites this memory) | source registration at V = active at V; help-JSON without source = breadcrumb; transition log holds history |
| feedback_repair_by_reextract_not_sql_update | `apps/qw-oracle/CLAUDE.md` always-on rules | repair by re-extract, not SQL UPDATE; if the unique key includes the broken column, delete the corrupt rows afterwards and check totals |
| feedback_source_comments_are_hypotheses | `.claude/skills/describe-fill-synthesis/SKILL.md` | for bitmask/enum/table entities, grep each value's consumers; document only live values |
| project_qw_oracle_product_vision | `apps/qw-oracle/VISION.md` answer-shape section; `curated/concept-notes/README.md` | informational vs constructive queries; grounding value (verification, completeness, citation, honest failure, version awareness); L3 priority = patterns and community nuance over what an LLM already knows |
| feedback_mcp_answer_shape | the MCP server instructions source (locate it first) or `apps/qw-oracle/CLAUDE.md` | 2-4 sentence default; opt-in follow-up doors; no injected flavour; no invented frequency claims |
| reference_oracle_multimodal_ceiling | `apps/qw-oracle/VISION.md` | L3 notes are text-only; image-heavy content cites a downstream surface (assets.quake.world) |
| project_l1_seed_l3_layering | `curated/asset-notes/OPERATIONS.md` (its Related line points here) | atomic vs mechanism entities; `path_template=null` is two different unknowns; extractor priority |
| project_asset_concept_partner_pattern | `curated/concept-notes/OPERATIONS.md` | symmetric-domain rule (the Summary names both cvar sets); optional player_skin split example |
| project_qw_oracle_corpus_cross_engine | `apps/qw-oracle/eval/README.md` vague-query bullet, or delete | one example: "fps drops when minimized" returns `sys_inactivesleep` and `cl_idlefps` |
| cockpit-oracle-dev-state | HANDOVER; root `OVERVIEW.md` | a HANDOVER row for the red test `test_class3_block_carried_verbatim`; fix root OVERVIEW's "tree-sitter for KTX" (it is libclang). The rest is stale |
| reference_qw_event_log_parser | HANDOVER qw_event_log row | origin (vikpe/slipgate `.bak/` at `2c584b4`); protocol model: kills via MVDSV DamageDone `0x000C`, legacy demos fall back to PRINT obits, environmental attacker = world |
| project_slipgate_bind_parser | `apps/slipgate-app/docs/CFG-PARSER.md` | the `extract_inline_rebinds` unquoted-`;` limitation and the alias workaround |
| project_slipgate_screenshot_automation | `docs/superpowers/parking/2026-04-27-screenshot-profile-picture.md` | ezQuake can't run headless or minimized; mailslot 1024-byte limit, blocked in matches, Linux FIFO equivalent; automapshot-fte prior art; no MVD cutter exists |
| reference_slipgate_tauri_windows | `apps/slipgate-app/docs/SYSTEM-SPECS.md` | WQL quirks: no `TOP N`, no `NOT LIKE`, backslash escaping |
| reference_slipgate_devtools_invoke | `apps/slipgate-app/docs/DEVELOPMENT.md` | devtools console has no `window.__TAURI__`; one-shot `invoke().then(console.log)` and revert; don't flip `withGlobalTauri` |
| reference_three_tier_identity_model | `apps/slipgate-app/docs/QUAKE-DIR-CONTROL.md`, new "Client identification" section | family, then matched-to-official (skipped for FTE), then unrecognized with an upgrade path; the operator's mission line |
| reference_behavioral_probing_escalation | same section | the manual `cl_predict_buffer` console probe |
| project_helper_panel_vision | `apps/slipgate-app/VISION.md` | info-button docs panel beside each config section; provenance field (defined by / dispatched by / configured via) |
| project_slipgate_chatbot_plugin_vision | `apps/slipgate-app/VISION.md` | typed config builder and a chatbot plugin over the qw-oracle MCP as peer surfaces, and why |
| project_fte_plugin_bridge | `apps/slipgate-app/VISION.md` drawing board, or delete | FTE's ezhud plugin registers ~800 `hud_*` cvars through the plugin API; ask nano |
| feedback_verify_typescript | `apps/slipgate-app/CLAUDE.md` | vite build doesn't type-check; run `bunx tsc --noEmit` |
| reference_qw_teamsay_system | `packages/qw-knowledge/teamsays/README.md` | `tp_msg*` command table, default binds, LED colour semantics, the 10 message categories |
| reference_nquake_distribution_ecosystem | a concept note (`engine-internal-vs-player-facing-files.md` or `kmap-legacy-keymap-system.md`) | nQuake org and repos, the mirror, the "why is this file here? check the nQuake bundle" framing |
| reference_qwstats_phoenix_postgres_coupling | `apps/qw-stats/CLAUDE.md` | the DB lives in phoenix-postgres; never stop it; the shared phoenix role password; rotate `.env` and container env together |
| feedback_substring_not_regex_fingerprinting | `packages/qw-version-resolution/CLAUDE.md` | match the durable substring (e.g. `antilag`), not a version-scheme regex; the unezquake example |
| feedback_no_amend_shared_main | root `CLAUDE.md` Git workflow | never `--amend` on shared main; revise with a follow-up commit; reflog + `reset --soft` recovery |
