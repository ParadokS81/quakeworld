# Review findings -- evidence trail and locked anchors for KTX onboarding

This arc has no prior plan attempt; the five-pass arc-brainstormer (`docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md`) closed cleanly with operator sign-off at each pass close. Findings here are NOT plan-bug fixes; they are:

1. **Locked source-counts and field-names** that phase drafters must reproduce verbatim (Pass 4 sketches drifted from source on several counts; Pass 5 source-walked and corrected).
2. **Spec-callouts** that influence one or more phase drafts and don't fit cleanly into a single decision.
3. **Caveats** the brainstorm surfaced as worth flagging for execution-time vigilance.

The fixes (where applicable) are encoded as decisions in `decisions.md`. This file is the audit trail: per-finding evidence + which phase resolves it.

New findings discovered during phase drafting append to this file with sequential F-numbers.

---

## How to use this doc

While drafting each phase MD:
1. Identify which findings touch the phase you're drafting (see "Phase ownership of findings" table at bottom).
2. Verify the relevant decision in `decisions.md` resolves the issue, OR confirm the finding is a count / field-name anchor your phase must reproduce exactly.
3. If the phase doesn't naturally resolve a finding that touches it, surface that in the phase's "Open questions" section.
4. Phase 1 (Foundation) and Phase 2 (Pass 1 entity handlers) and Phase 3 (Pass 5 modes) carry the highest finding density.

---

## Locked count anchors (phase drafters must reproduce these exactly)

### F1 -- KTX cvar bucket counts

**Resolved by:** D1 (spec is locked) + Phase 2 reproduces.

**Anchors:**
- Source-registered (RegisterCvar / RegisterCvarEx call sites): **192 unique k_-prefixed cvars**.
- Bucket-3 indexed-family (k_motd1-9 + k_ml_0-5): **15 entries**, NOT extracted.
- Truly orphaned: **4 entries** (k_666, k_dm2mod, k_no_vote_break, k_specktalk), NOT extracted.
- API split: ~205 `RegisterCvarEx` (with default), ~50 `RegisterCvar` (no default -> default_value NULL).

**Phase ownership:** Phase 2.

### F2 -- KTX command counts across three target tables

**Resolved by:** D1 + D7 (Pattern 14 suffix) + Phase 2 reproduces.

**Anchors:**

| Table | Source | Unique entries | Canonical-name shape |
|---|---|---|---|
| `cmd_t cmds[]` | `src/commands.c:693` | 317 | `<name>` (bare) |
| `frogbot_cmd_t std_commands[]` | `src/bot_commands.c:2315` | 39 | `<name>:frogbot:std` |
| `frogbot_cmd_t editor_commands[]` | `src/bot_commands.c:2332` | 25 | `<name>:frogbot:editor` |

**Cross-table collision counts (drives Pattern 14 necessity):**
- main vs std: 1 collision (`info`).
- main vs editor: 1 collision (`info`).
- std vs editor: 25 collisions (every editor entry overlaps a std entry).

**Phase ownership:** Phase 2.

### F3 -- KTX info_key producer-emitted counts

**Resolved by:** D1 + Phase 2 reproduces.

**Anchors:**
- Producer (SetUserInfo with `*` prefix and `SETUSERINFO_STAR` flag): ~5-6 unique keys (`*is`, `*mm`, `*mu`, `*ml`, `*mp`, possibly others). 38 write sites total.
- Consumer (`ezinfokey` / `infokey`): 91 + 20 read sites; NOT extracted (producer-only emission per Pass 1.6).
- Canonical shape: `<bare>:userinfo` (Pattern 14).

**Phase ownership:** Phase 2.

### F4 -- KTX log_template printf-shape counts

**Resolved by:** D1 + D5 (008 widening) + Phase 2 reproduces.

**Anchors:**

| KTX API | Call sites | Channel | Format-arg index |
|---|---|---|---|
| `G_bprint(level, fmt, ...)` | 655 | `broadcast` | 1 |
| `G_sprint(ent, level, fmt, ...)` | 1068 | `client` | 2 |
| `G_cprint(fmt, ...)` | 43 | `console` | 0 |
| `log_printf(fmt, ...)` | 28 | `logfile` (NEW value via 008) | 0 |

**Total emission sites:** 1794. Estimated unique format strings after per-file dedup: 1500-2000. 

**Phase ownership:** Phase 1 (008 migration), Phase 2 (handler).

### F5 -- game_mode catalog row count = 27

**Resolved by:** D11 (two-axis discriminator) + Phase 3 reproduces.

**Final inventory:**

| Row(s) | mode_class | init_mechanism | auto_reset_on_match | game_type |
|---|---|---|---|---|
| 1on1, 2on2, 3on3, 4on4, 10on10, hoonymode, blitz2v2, blitz4v4, 2on2on2, 3on3on3, 4on4on4, XonX, wipeout, ca | standalone | um_init_string | false | Duel\|Team |
| ffa, tot | standalone | um_init_string | false | FFA |
| ctf | standalone | um_init_string | false | CTF |
| race | standalone | cvar_toggle_with_init_string | false | Race |
| bloodfest | standalone | cvar_toggle_only | false | Survival |
| lgc | mutator | cvar_toggle_only | true | Mutator |
| instagib | mutator | cvar_toggle_only | true | Mutator |
| midair | mutator | cvar_toggle_only | true | Mutator |
| berzerk | mutator | cvar_toggle_only | false | Mutator |
| yawnmode | mutator | cvar_toggle_only | false | Mutator |
| killquad | mutator | cvar_toggle_only | false | Mutator |
| freshteams | mutator | cvar_toggle_only | false | Mutator |
| nosweep | mutator | cvar_toggle_only | false | Mutator |

**Total:** 17 um_list peers + race + bloodfest + 8 mutators = 27.

**Phase ownership:** Phase 3.

### F6 -- mode_default row count ~309

**Resolved by:** D12 (per-line granularity) + Phase 3 reproduces.

**Anchors:**
- `common_um_init` (`commands.c:4152-4205`): 54 cvar-set lines (baseline). Apply order = 1.
- 17 per-mode initstrings: ~15 lines avg = ~255 overlay lines. Apply order = 2.
- Mutators (8): ZERO mode_default rows (no init strings).
- Total: ~309 rows.

Per-row schema: `kind='mode_default'`, `name=<cvar_name>`, `value_text=<literal_value>`, `value_numeric=<int|null>`, `source_ref=<commands.c:exact_line>`, `ruleset_gate_json={"mode":"<token>"}`, `props_json={comment, apply_order, initstring_array, is_baseline}`.

**Phase ownership:** Phase 3.

### F7 -- election_type row count = 5 (skip etNone sentinel)

**Resolved by:** D1 + Phase 4 reproduces.

**Anchors:**
- Source: `progs.h:217-225`. `electType_t` enum has 6 values: etNone, etCaptain, etCoach, etAdmin, etSuggestColor, etLateJoin.
- Skip etNone sentinel. 5 useful rows: captain, coach, admin, suggest_color, late_join.
- Per-row: `kind='election_type'`, `ruleset_gate_json={}` (subsystem-level, not mode-gated).

**Phase ownership:** Phase 4.

### F8 -- death_rule row count = 27 (skip dtNONE + dtUNKNOWN sentinels)

**Resolved by:** D1 + Phase 4 reproduces.

**Anchors:**
- Source: `include/deathtype.h` X-macro file. Pass 4.3 said 28 values; Pass 5.4 corrected to 30 entries (28 substantive + dtNONE + dtUNKNOWN sentinels).
- Skip both sentinels. 27 useful rows. Keep `dtCHANGELEVEL` as `category='structural'` (qw-event-log harness needs it).
- Per-row: `kind='death_rule'`, `ruleset_gate_json={}` (universal across modes), `props_json={category, id1_baseline, ktx_extension, related_weapon}`.

**Phase ownership:** Phase 4.

### F9 -- monster row count = 13; field 2 is `armor_for_kill`, not `count_modifier`

**Resolved by:** D1 + Phase 5 reproduces (Pass 4.4 sketch corrected during Pass 5.4).

**Anchors:**
- Source: `bloodfest_monster_array[]` at `sp_monsters.c:60-76`. 13 entries.
- Pass 4.4 mis-named the second struct field as `count_modifier`; the actual struct definition (`sp_monsters.c:48-52`) carries `armor_for_kill`. Lock the source-name in `props_json.armor_for_kill`.
- `props_json` shape: `{count_per_wave, armor_for_kill, boss_able, array_position, is_first_required}`.
- `array_position` preserves source-order significance (FISH _MUST_ BE _FIRST_ per `maps.c:62` comment).
- Default gate: `{"mode":"bloodfest"}`.

**Phase ownership:** Phase 5.

### F10 -- score_system row count = 3; positions array length = 10 invariant

**Resolved by:** D1 + Phase 5 reproduces; loader-side validation gate.

**Anchors:**
- Source: `race.c:5148-5160`. 3 entries: "Win Only", "Scaled", "Formula1".
- Each row's `positions` array has exactly 10 elements (per-position points payouts).
- Loader-side assertion: every score_system row has `len(positions) == 10`.
- Default gate: `{"mode":"race"}`.

**Phase ownership:** Phase 5.

### F11 -- drop_item row count = 30 (Pass 4.4 estimate ~20 was wrong)

**Resolved by:** D1 + Phase 5 reproduces (Pass 4.4 sketch corrected during Pass 5.4).

**Anchors:**
- Source: `commands.c:9075-9108` (array of 30 entries; struct at `commands.c:9044-9051`).
- `dropitem_spawn_t` has 5 fields: name, classname, spawnflags, angle, spawn (function pointer). Pass 4.4 sketch had 3 fields; corrected to 5.
- Two new `props_json` fields locked at Pass 5.4: `angle_set` (boolean derivation of field 4) and `spawn_function` (function-pointer slot).
- Macros to resolve via Pattern 6 + #include walk (D4): `H_ROTTEN`, `H_MEGA`, `WEAPON_BIG2` (defined in `g_local.h` and `commands.c:9053`).
- Default gate: `{}` (universal across modes).
- Per-row: `kind='drop_item'`, `props_json={drop_token, spawned_classname, spawnflags_raw, spawnflags_value, angle_set, spawn_function, related_entity_canonical_id}`.

**Phase ownership:** Phase 5.

### F12 -- loc_macro row count = 15 (Pass 4.4 estimate 16 was wrong)

**Resolved by:** D1 + Phase 5 reproduces (direct count from source).

**Anchors:**
- Source: `teamplay.c:1491-1508`. 15 entries.
- Notable identities: `mh -> mega` (non-identity), `separator -> -` (non-identity); rest are identity.
- Default gate: `{}` (universal).

**Phase ownership:** Phase 5.

### F13 -- teamplay_message row count = 21 (Pass 4.4 estimate ~30 was wrong)

**Resolved by:** D1 + Phase 5 reproduces; Pattern 9 banner-comment harvest.

**Anchors:**
- Source: `teamplay.c:1645-1668`. 21 entries.
- Each entry has a handler function (e.g., `TeamplayYesOk`); Pattern 9 harvests the function-banner comment as `props_json.harvested_description`.
- Default gate: `{}` (universal).
- Per-row: `kind='teamplay_message'`, `props_json={description, handler_function, source_ref_handler, harvested_description}`.

**Phase ownership:** Phase 5.

### F14 -- match_event row count = 7 entity rows + 13 emission sites

**Resolved by:** D5 (009 migration) + D10 (dual-row design) + Phase 6 reproduces.

**Anchors:**
- XSD source: `resources/extralog/ktxlog_0.1.xsd`. 7 complexTypes (pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup, damage, death) sharing 5 distinct simpleTypes.
- 13 emission call sites total (6 pick_mapitem, 1 each for pick_powerup / drop_powerup / pick_backpack / drop_backpack, 2 damage, 1 death) across `items.c` / `combat.c` / `client.c` / `logs.c`.
- Per-event attribute counts: pick_mapitem=4, backpack-events=7, powerup-events=4, damage=8, death=8.
- Named simpleType constraints: `maxed_integer` (0-200), `iptype` (IP-pattern), `modetype` (FFA|duel|team), `porttype` (0-65535).
- Per-version table: `match_event_versions` (PK on (entity_id, version), 2 indexes on complex_type and xsd_version).
- Gating cvars: `k_extralog`, `k_extralog_xsd_uri`, `extralogname` -- already extracted as cvar entities in Phase 2; no additional Phase 6 work.

**Phase ownership:** Phase 6.

---

## Spec callouts requiring execution-time vigilance

### F15 -- Cross-header macros LGCMODE_VARIABLE / TOT_MODE_VARIABLE

**Resolved by:** D4 (Pattern 6 lift to depth-1 #include walk).

**Evidence:**
- `common_um_init` at `commands.c:4152-4205` contains exactly 2 macro-prefixed lines: `LGCMODE_VARIABLE " 0\n"` and `TOT_MODE_VARIABLE " 0\n"`.
- Macros defined in `g_local.h` (cross-header). Today's same-file Pattern 6 silently drops them.
- Without the lift: 2 lines silently disappear from `mode_default` extraction; future tags adding more cross-header macros silently rot.

**Action for Phase 1 drafter:** the Pattern 6 lift in `extractor_lib._source.py` is the prerequisite for `_handler_modes.py` (Phase 3). Lands BEFORE Phase 3 ships. Verify post-lift that the 2 macros resolve correctly.

**Phase ownership:** Phase 1 (lift); Phase 3 (consumes).

### F16 -- Pattern 6 lift parse-time impact

**Resolved by:** D4 (acceptable cost).

**Evidence:**
- `PARSE_DETAILED_PROCESSING_RECORD` flag adds <5% on file-parse time per ezQuake measurement.
- Not a new cost class (the flag is already used in some pipelines).
- API change for callers: transparent (no signature changes; `_file_macros` cache widens internally).

**Action for Phase 1 drafter:** include a sanity-check probe (parse one ezQuake TU pre-lift and post-lift; confirm parse-time delta within projection). Flag if >10% (would warrant operator decision).

**Phase ownership:** Phase 1.

### F17 -- Pass 1.7 printf-handler intentionally catches XML-shaped log_printfs

**Resolved by:** D10 (dual-row design).

**Evidence:**
- 13 emission sites across `items.c` / `combat.c` / `client.c` / `logs.c` use `log_printf("\\t\\t\\t<event_name>\\n...")`. Pass 1.7's printf-handler captures these as `log_template_versions` rows with channel='logfile'.
- Pass 4.5's match_event handler ALSO emits rows for the same 13 sites (in `match_event_versions.emission_call_sites_json`).
- A future maintainer is likely to look at the dual rows and try to "deduplicate." The duplicate IS the design.

**Action for Phase 2 drafter:** do NOT add a filter to Pass 1.7's printf-handler to skip XML-shaped log_printfs. The dual rows are intentional.

**Action for Phase 8 drafter:** EXTRACTOR-PLAYBOOK addition includes a "Dual-row design for log_template + match_event" note explaining why future maintainers should not deduplicate.

**Phase ownership:** Phase 2 (preserves), Phase 6 (also emits), Phase 8 (documents).

### F18 -- Obsolete TS regex extractor at scripts/extractors/ktx/commands.ts

**Resolved by:** Phase 0 deletion.

**Evidence:**
- File at `apps/qw-oracle/scripts/extractors/ktx/commands.ts` (verified exists at scaffold time).
- Wrong language for the canonical pipeline (all 4 shipped extractors are Python + libclang).
- Wrong output path (`packages/qw-config/src/data/` retired in 2026-04-25 qw-config dissolution).
- Wrong methodology (regex is brittle for `cmd_t cmds[]` multi-line struct-literal arrays).
- Not imported anywhere; safe to delete (Phase 0 task).
- Pass 1.5's `_handler_commands.py` (Phase 2) supersedes it via libclang Pattern 4.

**Action for Phase 0 drafter:** `git rm apps/qw-oracle/scripts/extractors/ktx/commands.ts` as a phase task. Verify no imports.

**Phase ownership:** Phase 0.

### F19 -- Doctrine references stating KTX uses tree-sitter

**Resolved by:** D2 (KTX is libclang) + Phase 0 corrects all references.

**Evidence -- four reference sites (verified at scaffold time):**
- `apps/qw-oracle/OVERVIEW.md` -- mentions KTX in extractor lineup.
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- discusses KTX in fork-vs-port section.
- `apps/qw-oracle/scripts/extractors/CLAUDE.md` -- per-engine notes.
- User memory `project_extraction_pipeline_vision.md` -- the pre-onboarding architectural snapshot.

**Action for Phase 0 drafter:** grep all four files for `tree-sitter` references in KTX context; replace with libclang per the spec preamble. Land literal before/after edits inline in Phase 0 MD. Phase 8 verifies the corrections survived (no recursion).

**Phase ownership:** Phase 0 (fix), Phase 8 (verify).

### F20 -- HANDOVER backlog item "qw-oracle slim-doc Arc 1 refresh sweep" sequenced as Phase 8

**Resolved by:** Phase 8 absorbs the existing backlog item.

**Evidence:**
- `HANDOVER.md` "Small followups" section names "qw-oracle slim-doc Arc 1 refresh sweep" with explicit trigger: "KTX onboarding arc end-of-arc."
- The sweep covers `apps/qw-oracle/{README,SCHEMA,OVERVIEW}.md` -- references to deleted SQLite artifacts, retired `schema.ts`, stale tool counts (10 -> 12 post-Phase-6), stale runtime claim (Node + Bun -> Bun-only), "Schema v18" framing.
- Sequencing rationale: KTX adds the 5th `log_template_versions.channel` value (`'logfile'`); doing the sweep BEFORE KTX migrations land would document 4 channels and re-stale immediately.

**Action for Phase 8 drafter:**
- Phase 8 absorbs the HANDOVER item. After Phase 8 lands, the operator deletes the HANDOVER bullet (per the docket "delete BOTH the index line AND destination" convention).
- Sweep covers all three slim docs in one pass: README.md / SCHEMA.md / OVERVIEW.md. Verify nothing else has accreted post-Arc-1 that needs catching up.

**Phase ownership:** Phase 8.

### F21 -- Validation runbook obligation per KTX onboarding

**Resolved by:** Phase 7 ships it.

**Evidence:**
- VALIDATION-RUNBOOK.md exists at `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` (verified at scaffold time).
- Every per-tag landing must include cvarlist diff + cmdlist diff + per-kind row-count probes + JSONB-binding regression gate (D14). KTX is the 5th codebase; mirrors the 4 prior engines' validation pattern.
- F1 quality-grid probes are the regression gates in `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`.

**Action for Phase 7 drafter:**
- Add F1 probes for all KTX kinds (cvars / commands / info_keys / log_templates / game_mode / mode_default / election_type / death_rule / monster / score_system / drop_item / loc_macro / teamplay_message / match_event).
- Add JSONB-binding regression probe per D14 (extension of F1.jsonb_columns_not_strings to KTX rows).
- Cross-project audit: confirm KTX's onboarding doesn't break any prior-engine probe.

**Phase ownership:** Phase 7.

### F22 -- VALIDATION-RUNBOOK.md is a 5th doctrine reference site (discovered during Phase 0 drafting)

**Resolved by:** D2 (KTX is libclang) + Phase 0 corrects all references.

**Evidence -- two additional reference lines beyond the four named in F19 (verified during Phase 0 drafting, 2026-05-05):**
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md:5` -- "Tree-sitter extractors (KTX) get a separate runbook when KTX ships." Asserts canonical KTX is tree-sitter-based; wrong per D2.
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md:373` -- "**KTX (tree-sitter).** Different methodology. When KTX ships, write a parallel runbook (`VALIDATION-RUNBOOK-KTX.md`) covering tree-sitter-specific concerns." Wrong attribution; canonical KTX uses this runbook.

**Why discovered late:** F19's evidence section enumerated four reference sites by sweeping `OVERVIEW.md`, `EXTRACTOR-PLAYBOOK.md`, `extractors/CLAUDE.md`, and the user-memory file. VALIDATION-RUNBOOK.md was named in `prerequisites.md` (item: "EXTRACTOR-PLAYBOOK.md and VALIDATION-RUNBOOK.md exist") but not grep-swept for tree-sitter claims. Phase 0 drafter ran the broader grep and surfaced the two lines.

**Action for Phase 0 drafter:** Phase 0 task scope expands to include VALIDATION-RUNBOOK.md edits with the same before/after surgery pattern as the other four sites. F19's "four reference sites" wording is now stale; consider F19 + F22 as the joint doctrine-fix scope. Phase 8 verifies BOTH F19 sites and the F22 site survive the arc.

**Phase ownership:** Phase 0 (fix), Phase 8 (verify).

---

## Phase ownership of findings

| Phase | Findings to verify before sign-off |
|---|---|
| Phase 0 | F18 (delete TS regex extractor), F19 (doctrine fixes -- four reference sites), F22 (VALIDATION-RUNBOOK.md as 5th doctrine site, discovered during Phase 0 drafting) |
| Phase 1 | F4 (008 migration adds `'logfile'` channel), F15 (cross-header lift before Phase 3 runs), F16 (parse-time impact projection) |
| Phase 2 | F1 (cvar bucket counts), F2 (command counts + Pattern 14 collisions), F3 (info_key producer-only), F4 (log_template printf counts), F17 (do NOT filter XML-shaped log_printfs) |
| Phase 3 | F5 (27 catalog rows), F6 (~309 mode_default rows), F15 (Pattern 6 lift dependency confirmed working) |
| Phase 4 | F7 (5 election_type rows; skip etNone), F8 (27 death_rule rows; skip dtNONE/dtUNKNOWN; keep dtCHANGELEVEL) |
| Phase 5 | F9 (13 monsters; armor_for_kill name), F10 (3 score_systems; positions length=10 invariant), F11 (30 drop_items; 5-field struct), F12 (15 loc_macros), F13 (21 teamplay_messages; Pattern 9 harvest) |
| Phase 6 | F14 (7 match_events + 13 emission sites), F17 (also emits emission_call_sites_json; intentional) |
| Phase 7 | F21 (validation runbook + F1 probes + JSONB regression gate + cross-project audit) |
| Phase 8 | F19 (doctrine fixes survived; no recursion), F20 (HANDOVER backlog item absorbed), F17 (PLAYBOOK addition for dual-row design), F22 (VALIDATION-RUNBOOK.md doctrine fix survived) |

---

## Findings the spec got right (commendations)

For balance -- these were good calls and should carry forward:

- Three-leg discovery sweep methodology (Pass 1) prevented the ezQuake-style scope balloon. Worth landing as `Pre-Port Discovery Sweep` section in EXTRACTOR-PLAYBOOK.md (Phase 8 obligation).
- Cross-validation of mutator candidates against community wiki rip (Pass 5.4) discriminates correctly: 4 candidates -> 1 promotion (berzerk). Worth landing as `Pre-Commit Discovery Cross-Check` section (Phase 8).
- Single-kind two-axis discriminator for `game_mode` (D11) preserves community framing while keeping the architectural distinction queryable.
- Three migration files split semantically (D5) instead of one mega-migration -- easier to read, revert, and reason about.
- Handler grouping by walking strategy (D6) keeps per-handler unit-of-work clear and slicing trivial.
- Source-fidelity for canonical tokens (D9) prevents translation tax across source / commands / concept notes.
- Pass 5 source-spike caught Pass 4 sketch errors on multiple counts (drop_item 20 -> 30, teamplay_message 30 -> 21, loc_macro 16 -> 15, deathtype 28 -> 30) and field names (count_modifier -> armor_for_kill, missing angle_set + spawn_function). The spike discipline pays off; phase MD drafters MUST source-walk during draft, not paraphrase the spec.

These are not findings; they're commendations. They explain why the spec is recoverable and why phase-MD drafting can build directly without re-litigating shape.

---

*End of review findings. New findings discovered during phase drafting append to this file with sequential F-numbers. The audit trail is the value -- preserve evidence, even when the fix lives in decisions.md.*
