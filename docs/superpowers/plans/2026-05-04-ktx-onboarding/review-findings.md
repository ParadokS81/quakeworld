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

**Amendment 2026-05-05 (Phase 2 drafter source-walk):** The "API split: ~205 RegisterCvarEx / ~50 RegisterCvar" sub-anchor is INVERTED relative to canonical-1.46 (master HEAD). Live source shows 181 RegisterCvar (no-default) + 114 RegisterCvarEx (with-default) = 295 raw call sites; ratio 1.6:1, not 4:1. The "192 unique k_-prefixed cvars" sub-anchor stands. Implication: `default_value IS NULL` is the COMMON case in KTX cvars (~61%), not the rare diagnostic the original framing suggested -- Layer 3 concept-note authors and consumers reading the column should treat NULL as the default, not the exception. Phase 2's verification probe asserts cvar count >= 192; the API split itself is captured in `_stats.by_api` for the audit trail.

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

**Amendment 2026-05-05 (Phase 2 drafter source-walk):** Two anchors require correction at canonical-1.46 (master HEAD): `std_commands` count 39 -> 14, std-vs-editor collisions 25 -> 0. The main `cmd_t cmds[]` 317-unique-entry sub-anchor stands -- live shows ~371 raw `{ "..." }` lines with conditional-compilation duplicates; dedup at handler time produces 317 unique. Pattern 14 RATIONALE REFRAMES: with 0 live collisions, the `:frogbot:std` and `:frogbot:editor` suffixes are no longer collision-prevention; they are defensive API-surface markers per D7. D7 stays locked: the suffix scheme is applied unconditionally to make sub-namespaces queryable and to future-proof against any tag introducing collisions. Phase 2's verification probe 4 asserts frogbot_count >= 39 (= 14 std + 25 editor live).

### F3 -- KTX info_key producer-emitted counts

**Resolved by:** D1 + Phase 2 reproduces.

**Anchors:**
- Producer (SetUserInfo with `*` prefix and `SETUSERINFO_STAR` flag): ~5-6 unique keys (`*is`, `*mm`, `*mu`, `*ml`, `*mp`, possibly others). 38 write sites total.
- Consumer (`ezinfokey` / `infokey`): 91 + 20 read sites; NOT extracted (producer-only emission per Pass 1.6).
- Canonical shape: `<bare>:userinfo` (Pattern 14).

**Phase ownership:** Phase 2.

**Amendment 2026-05-05 (Phase 2 drafter source-walk):** Star-key count corrected at canonical-1.46 (master HEAD): unique star-keys 5-6 -> 7 (`*at`, `*is`, `*ml`, `*mm`, `*mp`, `*mt`, `*mu`); write sites 38 -> 36. The producer-only emission rule and the `:userinfo` Pattern 14 suffix per D7 are unchanged. Phase 2's verification probe asserts info_key count >= 5; both 7 and any future growth satisfy.

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

**Amendment 2026-05-05 (Phase 2 drafter source-walk):** Per-API call-site counts drift modestly at canonical-1.46 (master HEAD); within accepted tolerance: G_bprint 655 -> 681, G_sprint 1068 -> 1071, G_cprint 43 unchanged, log_printf 28 unchanged. Total 1794 -> 1823. The unique-format-string-after-dedup metric (1500-2000) is the load-bearing anchor and is unaffected by per-API drift. Phase 2 verification asserts log_template count >= 1000; threshold semantics hold across both number sets. No reframe needed; recorded for audit-trail accuracy.

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

**Amendment 2026-05-05 (Phase 4 drafter source-walk):** The explanation "30 entries (28 substantive + dtNONE + dtUNKNOWN sentinels)" is off by one against canonical-1.46 (master HEAD). Live `include/deathtype.h` contains 29 `DEATHTYPE_X(...)` X-macro lines: 27 substantive + 2 sentinels (dtNONE, dtUNKNOWN). The headline "27 useful rows" anchor stands and is reproduced live; the underlying breakdown corrects from 30 / 28 / 2 to 29 / 27 / 2. The original prose was also internally inconsistent (28 substantive minus 2 sentinels yields 28, not 27); the live progression 27 substantive minus 0 further filters yields 27 useful and is now self-consistent. Phase 4's verification probe 1 asserts death_rule row count = 27. Separately, `related_weapon` canonical names use the underscored id1-baseline form (`rocket_launcher`, `super_shotgun`, `lightning_gun`) per `apps/qw-oracle/seeds/id1-gameplay.yaml`, not the drafter-prompt shorthand -- FK joins target the canonical id, not display labels.

### F9 -- monster row count = 13; field 2 is `armor_for_kill`, not `count_modifier`

**Resolved by:** D1 + Phase 5 reproduces (Pass 4.4 sketch corrected during Pass 5.4).

**Anchors:**
- Source: `bloodfest_monster_array[]` at `sp_monsters.c:60-76`. 13 entries.
- Pass 4.4 mis-named the second struct field as `count_modifier`; the actual struct definition (`sp_monsters.c:48-52`) carries `armor_for_kill`. Lock the source-name in `props_json.armor_for_kill`.
- `props_json` shape: `{count_per_wave, armor_for_kill, boss_able, array_position, is_first_required}`.
- `array_position` preserves source-order significance (FISH _MUST_ BE _FIRST_ per `maps.c:62` comment).
- Default gate: `{"mode":"bloodfest"}`.

**Phase ownership:** Phase 5.

**Amendment 2026-05-05 (Phase 5 drafter source-walk):** F9's `armor_for_kill` field name is itself an off-by-one against canonical-1.46 (master HEAD). Live `bloodfest_monster_t` struct (`sp_monsters.c:48-52`) carries `hp_for_kill` (per-kill HP bonus to player), not `armor_for_kill`. F9 was already amended once during Pass 5.4 (`count_modifier` -> `armor_for_kill`); this second amendment lands the source-faithful name per D9. `props_json.hp_for_kill` is the locked field; semantic is "HP awarded to player per kill," not armor -- Layer 3 concept-note authors documenting bloodfest mechanics should reference HP rewards. Phase 5's verification probe asserts `props_json -> 'hp_for_kill'` is non-null for all 13 rows. Soft watch: two source-walks have produced two different field names for the same struct; if Phase 7 validation surfaces a THIRD name, that's a corruption signal worth spot-checking the source-walk discipline.

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

**Amendment 2026-05-05 (Phase 5 drafter source-walk):** Two corrections at canonical-1.46 (master HEAD):

1. **Count drift 30 -> 31.** Live source has 31 entries (was 30 at Pass 5.4 source-walk). New entry `{ "sp_sp", "info_player_start", ... }` added in the period between Pass 5.4 and Phase 5 drafting. Phase 5's verification probe asserts drop_item count = 31; tests reproduce the 31-row inventory.

2. **Macro depth correction.** `H_ROTTEN` and `H_MEGA` are defined in `include/g_consts.h:241-242`, NOT in `g_local.h` as F11 originally claimed. Resolution path for the consumer (`commands.c:9075-9108`) is depth-2: `commands.c` includes `g_local.h`, which includes `g_consts.h`. Phase 1's D4 lift walks depth-1 only, so `H_ROTTEN` / `H_MEGA` do NOT auto-resolve at extraction time. `WEAPON_BIG2` at `commands.c:9053` is depth-0 (same-file) and resolves via the pre-lift Pattern 6.

Phase 5 ships a handler-private `_DROPITEM_MACRO_FALLBACK = {"H_ROTTEN": 1, "H_MEGA": 2}` as the tactical workaround -- frozen-keyed dict (raises KeyError if a future macro is referenced but missing) preserves failure-loud-not-silent. The principled long-term fix is a D4 depth-N amendment (lift the lift); parked as a future-arc revisit per D4's own "Revisit if a multi-hop case surfaces" caveat. KTX is the first surfaced multi-hop case.

**Amendment 2026-05-06 (Phase 5 executor source-walk):** The 2026-05-05 amendment claim that `WEAPON_BIG2` at `commands.c:9053` "resolves via the pre-lift Pattern 6" is incorrect. `extractor_lib._source.collect_file_macros` (Phase 1's depth-1 lift, the only Pattern 6 implementation in the tree) explicitly filters non-string-literal macro bodies (lines 167-171 of `_source.py` state "Excludes function-like macros, integer/hex constants, and any macro whose body is not exactly one string-literal token"). KTX modes' string-bodied macros (`LGCMODE_VARIABLE " 0\n"`) still resolve through the lift; KTX integer constants do not. Runtime probe against `commands.c` TU confirms: `'WEAPON_BIG2' in self.file_macros` is False (alongside `H_ROTTEN`, `H_MEGA`); only string-bodied macros like `LGCMODE_VARIABLE` are present.

Disposition shipped: `_DROPITEM_MACRO_FALLBACK` extends to 3 entries `{"H_ROTTEN": 1, "H_MEGA": 2, "WEAPON_BIG2": 1}` -- WEAPON_BIG2 added inline during Phase 5 execution. Frozen-dict semantics preserved. Phase 5 verification probes (test 12, phase-boundary probe 11) assert `sh40 -> 1`. The broader finding (`collect_file_macros` is string-literal-only by design) is captured as F26 below; it has implications beyond Phase 5 for future handlers wanting integer-macro resolution.

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

**Amendment 2026-05-05 (Phase 6 drafter source-walk):** Two corrections at canonical-1.46 (master HEAD):

1. **Named simpleType count corrected from 5 to 4.** Live `resources/extralog/ktxlog_0.1.xsd` defines 4 named simpleTypes: `maxed_integer` (0-200), `iptype` (IP-pattern), `modetype` (FFA|duel|team), `porttype` (0-65535). F14's anchor description text said "5 distinct simpleTypes" while the body listed 4 explicitly -- internal inconsistency; the 4-count is correct per live source.

2. **Spec 5.6.b regex literal mismatches live source.** Spec's pattern (`log_printf("\t\t\t<EVENT>...` -- single-line literal with 3 \t pairs) matches the LEGACY commented-out emission shape. Live source's 13 active emissions use the multi-line wrapper shape across two concatenated literals (`log_printf("\t\t<event>\n" "\t\t\t<EVENT>...` -- 2 + 3 \t pairs). Phase 6 ships a live-source-faithful multi-line regex that produces F14's locked count of 13 emission sites exactly. The spec 5.6.b regex remains as-written; arc-reviewer's spec-vs-shipped walk will mark this DELIVERED-DIFFERENT-AS-DOCUMENTED. The phase MD documents the deviation rationale with the corrected regex inline; the dual-row design (D10) is unaffected.

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

**Evidence (original framing):**
- `PARSE_DETAILED_PROCESSING_RECORD` flag adds <5% on file-parse time per ezQuake measurement.
- Not a new cost class (the flag is already used in some pipelines).
- API change for callers: transparent (no signature changes; `_file_macros` cache widens internally).

**Action for Phase 1 drafter:** include a sanity-check probe (parse one ezQuake TU pre-lift and post-lift; confirm parse-time delta within projection). Flag if >10% (would warrant operator decision).

**Amendment 2026-05-05 (Phase 1 drafter source-walk):** The flag is already in `clang_config.PARSE_OPTS` (line 172) and has been since the existing Pattern 6 shipped. Phase 1 does NOT modify PARSE_OPTS. The probe target reframes accordingly: measure only the additional `collect_file_macros` walk-time delta (post-parse work over depth-1 #include closure). Parse-time component stays at baseline by definition. The <10% gate still applies, applied to the macro-walk delta. Pairs with the D4 amendment of the same date.

**Amendment 2026-05-06 (Phase 1 perf follow-on -- diagnostic, no code change):** Phase 1 closed DONE_WITH_CONCERNS with walk-time overhead 66-163% above the <10% gate (KTX `commands.c` +40ms / 66%; ezQuake `vid_sdl2.c` +130ms / 163%). Operator chose option (b) -- in-arc scope-narrowing follow-on commit before Phase 2 starts. The follow-on hypothesised the cost driver was `cursor.get_tokens()` paid for all ~901 depth-1 `MACRO_DEFINITION` cursors on `vid_sdl2.c`, and proposed an iteration-time string-literal filter (peek `cursor.extent` source bytes; only call `get_tokens()` for macros whose body starts with `"`).

Diagnostic results: **the hypothesis was wrong.** Source-extent peek implementation passed all 4 pytest tests but produced no measurable speedup (vid_sdl2.c median 123ms baseline -> 133ms with peek; within noise / slightly worse). Stage decomposition (5 runs each, median) on `vid_sdl2.c`:

| Stage | Median | Delta | What |
|---|---|---|---|
| iterate top-level cursors + access `.kind` | 50.7ms | -- | 23,706 top cursors |
| + filter to `MACRO_DEFINITION` (9,563 hits) | 48.4ms | -2.3 | kind filter is cheap |
| + access `cursor.location` (9,137 macros with file) | 99.7ms | +51.3 | **dominant cost** |
| + access `cursor.spelling` | 110.4ms | +10.7 | secondary cost |
| + extent + byte-find peek (901 depth-1 macros) | 125.7ms | +15.3 | peek overhead |
| + `get_tokens()` for the 5 string-bodied macros | 133.0ms | +7.3 | get_tokens on the 5 hits |

The cost driver is libclang's per-cursor metadata access (`cursor.location`, `cursor.spelling`) over the ~9,137 `MACRO_DEFINITION` cursors the depth-1 filter must inspect to identify the 901 in-closure cursors. `get_tokens()` for the original 901 cursors costs ~10-15ms total; eliminating it entirely would save at most that much. The peek-then-tokens shape adds equivalent overhead in spelling+extent+byte-find, netting zero. Post-revert measurement (2026-05-06): vid_sdl2.c median 121.7ms / 5 macros, commands.c median 37.9ms / 279 macros -- back at Phase 1 baseline.

**Disposition:** revert the follow-on optimisation (no benefit, added complexity); _source.py unchanged from Phase 1's shipped state. Accept the depth-1 walk-time overhead as inherent to the libclang per-cursor attribute model under `PARSE_DETAILED_PROCESSING_RECORD`. Engineering rationale for acceptance: extractor pipeline is offline (per-tag drag is the cost class, not interactive latency); 130ms / 40ms per TU multiplied across the per-codebase TU count is order-of-seconds total per tag, well inside the operator's offline budget. The <10% gate in F16's original framing was over-tight given the actual cost model.

**Carry-forward for any future depth-N lift attempt:** the savings opportunity is NOT in `get_tokens()` filter relocation; it is in reducing the count of `cursor.location` accesses (e.g., narrower `tu.cursor.get_children()` traversal scope; alternative libclang APIs that pre-filter by file). D4's "Revisit if a multi-hop case surfaces in a future engine" caveat already parks the depth-N revisit; this amendment adds the cost-driver finding so a future arc doesn't repeat the filter-relocation experiment.

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

**Amendment 2026-05-05 (Phase 2 drafter source-walk):** The "13 XML-shaped log_printf emission sites" anchor doesn't match canonical-1.46 (master HEAD) under any single regex. Live source produces 7 sites under the tight innermost-event pattern (`log_printf("\t\t\t<EVENT_NAME>...`) and 24 sites under a broader XML-emission pattern (any indented `<...` payload, including wrappers). F14's "13 emission call sites" anchor (Phase 6 territory) reflects per-XSD-complexType emission groupings (6 pick_mapitem + 1 each for pick_powerup / drop_powerup / pick_backpack / drop_backpack + 2 damage + 1 death), not raw printf call sites; the two facets are distinct. The dual-row design holds regardless: every XML-shaped log_printf call site lands as a `log_template_versions` row with channel='logfile' (D10). Phase 2's "do NOT filter XML-shaped log_printfs" rule stands; verification probe 5 asserts >= 7 channel='logfile' rows whose format string starts with `\t\t\t<`.

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

### F23 -- Phase MD probe 5 tab-depth calibration off (discovered during Phase 2 execution)

**Resolved by:** Corrected probe used during execution; handler behavior confirmed correct.

**Evidence (2026-05-06):** Phase MD probe 5 used `startswith("\t\t\t<")` (three tabs) to identify XML-shaped log_printf rows. Live KTX XML emissions concatenate multi-line strings where the first part is `\t\t<event>\n` (two tabs), so the three-tab form never matches -- but this is a probe calibration error, NOT a handler bug. The handler correctly captures all `log_printf` calls per D10/F17. Corrected probe: `jq '[.log_templates[] | select(.ast.channel == "logfile") | select(.ast.format_string | contains("<"))] | length'` returns 15 (>= 7 required). Phase MD probe 5 wording is stale but the underlying design is sound.

**Phase ownership:** Phase 2 (discovered and resolved; note for Phase 8 PLAYBOOK: update probe 5 wording if re-used).

---

### F24 -- `validCommand` gap in `load-version.ts` blocked Pattern 14 KTX command suffixes (discovered during Phase 2 execution)

**Resolved by:** Added `validCommand` predicate to `load-version.ts` during Phase 2 execution. Fixed file committed with Phase 2.

**Evidence (2026-05-06):** Running `extract-tag --project ktx --version head` produced 39 warnings: `[load-version] skipping entity with invalid name: addbot:frogbot:std` (and similar). Root cause: `validIdentifier = /^[a-z0-9_.+\-]+$/` does not allow colons; Pattern 14's D7 suffixes (`<name>:frogbot:std`, `<name>:frogbot:editor`) have two colons. The `validQcBuiltin` regex (`/^[a-z0-9_.+\-]+:(std_builtins|ext_builtins|ext_syscalls)$/`) showed the fix pattern. Added: `const validCommand = options.type === 'command' && /^[a-z0-9_.+\-]+:(frogbot:std|frogbot:editor)$/.test(name);` and extended the rejection condition. Post-fix: command count = 358 (319 bare + 39 frogbot). Note: `:userinfo` suffix for info_keys was NOT blocked because `INFO_KEY_NAME_RE` already allows `*name:scope` patterns; only commands needed the fix.

**Phase ownership:** Phase 2 (discovered and resolved during execution; `load-version.ts` included in the Phase 2 commit).

---

### F25 -- Modes handler keeps cross-file refs on instance state; not parallel-safe (discovered during Phase 3 execution)

**Resolved by:** Forced serial execution in `extractors/ktx/extract.py` when modes handler is selected; documented as a future-arc refactor opportunity.

**Evidence (2026-05-06):** Phase 3's `_handler_modes.py` accumulates cross-file refs (commands.c references world.c activation-cvar registrations + race.c function decls; finalize() joins them into catalog rows) on instance state (`self._activation_cvar_refs`, `self._race_toggle_ref`, `self._mode_default_rows`, etc.). Under `multiprocessing.Pool` fork-pool execution (`_run_parallel` in `extract.py`), each worker process gets its own copy of the handler instance via fork, populates state in the worker, and returns rows via `end_file()`. The parent's instance state is NEVER populated. Parent's `finalize()` then runs against an empty instance and emits 27 catalog rows from module-level constants but 0 mode_default rows. Verified: parallel run with `--workers 4` produces `mode_defaults count: 0`; serial run with `--workers 1` produces `mode_defaults count: 317` (F6 anchor).

The handler design (state-on-self + `end_file()` returns []) is functional in single-process flows (smoke tests, pytest fixture, the extract.py `_run_serial` path) but not in `_run_parallel`. Phase 2's KTX handlers (cvars, commands, info_keys, log_templates) are parallel-safe because they have no cross-file refs -- they emit per-file rows from `end_file()` and rely on `finalize()` for cross-file dedup only.

**Workaround in Phase 3:** Added a guard in `apps/qw-oracle/scripts/extractors/ktx/extract.py` immediately after `workers` resolution: `if any(h.name == "modes" for h in handlers) and workers != 1: workers = 1`. Logs a one-liner "[ktx] modes handler keeps cross-file state -- forcing --workers 1 (F25)". Default workers stays 12 for other handler combinations; only modes-inclusive runs go serial. Per-tag KTX extraction takes ~16s serial vs ~5s parallel -- acceptable for the offline pipeline.

**Architectural concern carried forward:** Phase 4's `_handler_gameplay_taxonomies.py` and Phase 5's `_handler_gameplay_tables.py` may surface similar cross-file ref needs (death_rule's `related_weapon` joins; teamplay_message's per-handler banner-comment harvest). If they ship with state-on-self design, they will hit the same parallel-safety gap. Future arc may revisit by:
1. Refactoring per-handler `end_file()` to emit refs as typed pseudo-rows (e.g. `{"_kind": "_meta_activation_ref", "cvar": ..., "ref": ...}`); finalize separates by `_kind` and joins.
2. Or adding a `Visitor.parallel_safe: bool = True` attribute that `extract.py` reads to gate the serial fallback.

Phase 3 ships option (a-prime): the workaround. The principled refactor is parked.

**Amendment 2026-05-06 (Phase 5.5 disposition closure):** Disposition resolved via Option (a) Pattern 13 emission retrofit, shipped as Phase 5.5. The principled fix landed in-arc rather than parked, on the back of Phase 5's evidence: gameplay_tables handler shipped Pattern 13 emission (`_kind="_fn_def"` typed pseudo-rows from `end_file()`) first-attempt with no shape resistance, parallel-safe by structure under `--workers 12`. With Pattern 13 now demonstrated as a clean two-consumer arc-pattern (Phase 2 commands handler + Phase 5 tables handler), modes was the architectural outlier; orchestrator session #3 + operator agreed (2026-05-06) to retrofit while the precedent context was freshest.

**Pre-fix state (re-anchoring the Phase 3 evidence):** parallel `--workers 4` produced `mode_defaults count: 0`; serial `--workers 1` produced `mode_defaults count: 317`. Catalog rows (27) survived because they were built in `finalize()` from module-level constants, masking the bug at the handler-output level.

**Post-fix state:** `_handler_modes.py` refactored so all 11 cross-file accumulators (`_mode_default_rows`, `_activation_cvar_refs`, `_toggle_cmd_refs`, `_auto_reset_call_sites`, `_um_list_row_refs`, `_um_list_label_raw`, `_um_init_decl_lines`, `_race_toggle_ref` / `_race_apply_ref` / `_race_settings_decl_ref`, `_stats` sub-keys) emit as typed pseudo-rows from `end_file()` (`_kind` in `{_mode_default, _meta_activation_cvar, _meta_toggle_cmd, _meta_auto_reset, _meta_um_list_row, _meta_um_list_label_raw, _meta_um_init_decl, _meta_race_ref, _meta_unresolved_macro_line, _meta_skipped_line, _meta_by_array_stat}`); `finalize(all_rows=...)` partitions by `_kind`, re-assembles cross-file ref dicts from the meta rows, builds catalog rows from module constants + re-assembled refs, drops meta rows from output. The F25 serial guard in `extract.py` lines ~302-310 was removed; `--workers 12` now applies uniformly to modes-inclusive runs. Parallel-vs-serial regression gate (`test_parallel_serial_equivalence` in `tests/test_handler_modes.py`) asserts identical output across `--workers 1` and `--workers 4` runs and PASSes; the test self-skips while the F25 guard is present (defensive against partial rollback).

**Verification (2026-05-06 post-fix):**
- pytest 7/7 PASS (6 existing + 1 new parallel-vs-serial equivalence gate).
- End-to-end `extract.py --handlers modes --workers 12`: 2.3s on 108 .c files; output JSON has `game_modes_count=27`, `mode_defaults_count=317`, `unresolved_macros=[]`, `by_array=18`. Identical to serial baseline.
- Dev DB post-load: `gameplay_mechanics` rows for `gameplay_source_id='ktx'`: game_mode=27 + mode_default=317 (UNCHANGED; D15 idempotency holds).
- F1 JSONB gate: `ruleset_gate_json` and `props_json` both `jsonb_typeof = 'object'` for all 344 modes rows; 0 violations (D14 holds).

**Phase 5.5 commit:** to be filled in by orchestrator session post-commit (chicken-and-egg: the executor cannot reference its own commit hash from inside the same commit; the orchestrator's housekeeping commit backfills, mirroring the Phase 4 pattern at `cb46fd85` and Phase 5 at `c0cb89a3`).

**Carry-forward:** any future libclang handler with cross-file refs MUST use Pattern 13 emission per Phase 2 + Phase 5 + Phase 5.5 precedent. No per-handler instance-state aggregation in fork-pool architectures. Phase 8 EXTRACTOR-PLAYBOOK addition will document this as the canonical convention; the alternative `Visitor.parallel_safe: bool = True` attribute path proposed in the original F25 future-arc options is REJECTED -- gating opt-out as a per-handler bool would normalise the broken state-on-self design and recreate the divergence between handlers that this Phase 5.5 retrofit eliminates.

**Phase ownership:** Phase 3 (discovered and worked-around during execution); Phase 5.5 (principled fix shipped via Pattern 13 retrofit).

---

### F26 -- collect_file_macros is string-literal-only by design (discovered during Phase 5 execution)

**Resolved by:** Inline handler fix (extended `_DROPITEM_MACRO_FALLBACK` to include WEAPON_BIG2); EXTRACTOR-PLAYBOOK note candidate for Phase 8.

**Evidence (2026-05-06):** Phase 5's `_handler_gameplay_tables.py` initially trusted the phase MD's claim that `WEAPON_BIG2` (commands.c:9053, integer body `1`) would resolve via `self.file_macros` (Phase 1's depth-1 lift). Pytest `test_drop_item_sh40_weapon_big2` failed with `spawnflags_value=None`. Root cause: `extractor_lib._source.collect_file_macros` (lines 167-171) explicitly states "Excludes function-like macros, integer/hex constants, and any macro whose body is not exactly one string-literal token." Token-kind filter at line 225-229 enforces this: `if body_tok.kind != TokenKind.LITERAL: continue` followed by `if not spelling.startswith('"'): continue`. Runtime probe against `commands.c` TU confirms: `len(file_macros)=279`, `'WEAPON_BIG2' in file_macros: False`, `'LGCMODE_VARIABLE' in file_macros: True`.

The string-literal filter is an intentional Phase 1 design decision -- KTX modes' `LGCMODE_VARIABLE " 0\n"` macros (used in `common_um_init` initstring concatenation) need string-body resolution; integer constants like `WEAPON_BIG2 1` were not the target use-case. Phase 1 shipped against modes' need; the design discussion did not anticipate Phase 5's need for integer-macro resolution.

**Disposition:** Phase 5 ships the tactical fix (`_DROPITEM_MACRO_FALLBACK` extended to 3 entries including WEAPON_BIG2). The principled fix has multiple options:
- (a) Extend `collect_file_macros` to also collect integer-bodied macros into a separate dict (e.g. `file_int_macros`); handlers consult both. Cost: re-touches Phase 1 infrastructure; affects all engines.
- (b) Land a sibling helper `collect_file_int_macros(tu, target_file_path)` returning `dict[str, int]`; opt-in for handlers that need it. Cost: minimal infrastructure change; explicit handler opt-in.
- (c) Accept fallback dicts as the per-handler convention for integer constants; document in EXTRACTOR-PLAYBOOK.

Phase 8 EXTRACTOR-PLAYBOOK addition candidate: "Pattern 6 scope is string-literal macros only; integer/hex constants are handler-private resolution. If a future engine surfaces a third consumer needing integer-macro resolution, evaluate Rule of Second Consumer + Option (b) sibling helper."

**Phase ownership:** Phase 5 (discovered and worked-around during execution); Phase 8 (PLAYBOOK note candidate); future arc (principled lift if a third consumer emerges).

---

### F27 -- Pattern 9 banner-coverage probe assumes /* === */ blocks that KTX teamplay.c doesn't have (discovered during Phase 5 execution)

**Resolved by:** Phase 5 ships handler with Pattern 9 implementation correct; probe 14 wording stale; PLAYBOOK note candidate for Phase 8.

**Evidence (2026-05-06):** Phase 5 phase-boundary probe 14 ("teamplay_message Pattern 9 banner-coverage") asserts `total = 21 AND with_banner > 0` with FAIL condition "with_banner == 0 (Pattern 9 broken)". Live source-walk against `research/repos/ktx/src/teamplay.c` shows ZERO `/* === */` banner blocks anywhere in the file (`grep -cE "^/\* =====" teamplay.c` returns 0). The 21 message handlers split:
- 8 macro-expanded via `TEAMPLAY_BASIC(FunctionName, Text)` macro at teamplay.c:1450 (yesok / nocancel / soon / waiting / slipped / replace / trick / coming). After preprocessor expansion these are real FUNCTION_DECL definitions; the handler correctly extracts `handler_function="TeamplayYesOk"` etc. (verified by `test_teamplay_yesok_handler_and_banner` PASS). Macro-expanded handlers have no banner block by construction.
- 13 real `static void Teamplay*` definitions scattered through the file. Source inspection: each is preceded by a `// Cmd_AddCommand ("tp_msgkillme", TP_Msg_KillMe_f);` line comment style, NOT a `/* === Title === */` Doom-style banner block.

Live result: `with_harvested_description: 0` of 21. The Pattern 9 implementation is correct (port from MVDSV's `_handler_commands.py`); the source file simply has no banner blocks to harvest. MVDSV's coverage was 26-28% because MVDSV's sv_ccmds.c uses Doom-style banners; KTX's teamplay.c does not.

**Disposition:** Probe 14's PASS condition `with_banner > 0` is impossible to satisfy against KTX's actual teamplay.c. The handler design is correct; the probe wording assumed source content that doesn't exist. Direct precedent: F23 (Phase MD probe 5 tab-depth calibration off; corrected probe used during execution; handler behavior confirmed correct).

Probe 14 reframe (for arc-history + Phase 8 PLAYBOOK): "report `with_harvested_description` count and surface as Layer 3 concept-note signal -- if low, the source's preferred docstring style is not Doom-style banner; harvest a different shape (line-comment-above-function) for that file." `test_teamplay_yesok_handler_and_banner` was already lenient ("harvested_description may be None") and passed; the test design is sound.

Phase 8 EXTRACTOR-PLAYBOOK addition candidate: "Pattern 9 (banner harvest) coverage varies per source-file commenting convention. MVDSV sv_ccmds.c: ~28% coverage (Doom-style banners common). KTX teamplay.c: 0% coverage (line-comment style). Future engine consumers should not assume banner blocks exist; design tests + probes for best-effort harvest."

**Phase ownership:** Phase 5 (discovered and surfaced during execution); Phase 8 (PLAYBOOK note candidate).

---

## Phase ownership of findings

| Phase | Findings to verify before sign-off |
|---|---|
| Phase 0 | F18 (delete TS regex extractor), F19 (doctrine fixes -- four reference sites), F22 (VALIDATION-RUNBOOK.md as 5th doctrine site, discovered during Phase 0 drafting) |
| Phase 1 | F4 (008 migration adds `'logfile'` channel), F15 (cross-header lift before Phase 3 runs), F16 (parse-time impact projection) |
| Phase 2 | F1 (cvar bucket counts), F2 (command counts + Pattern 14 collisions), F3 (info_key producer-only), F4 (log_template printf counts), F17 (do NOT filter XML-shaped log_printfs), F23 (probe 5 tab-depth -- corrected inline), F24 (validCommand gap -- fixed inline) |
| Phase 3 | F5 (27 catalog rows), F6 (~309 mode_default rows), F15 (Pattern 6 lift dependency confirmed working), F25 (modes handler not parallel-safe -- worked around with serial-mode guard in extract.py) |
| Phase 4 | F7 (5 election_type rows; skip etNone), F8 (27 death_rule rows; skip dtNONE/dtUNKNOWN; keep dtCHANGELEVEL) |
| Phase 5 | F9 (13 monsters; hp_for_kill amendment), F10 (3 score_systems; positions length=10 invariant), F11 (31 drop_items amended; H_ROTTEN/H_MEGA/WEAPON_BIG2 fallback per F26 second amendment), F12 (15 loc_macros), F13 (21 teamplay_messages; Pattern 9 harvest with 0% coverage per F27), F26 (collect_file_macros string-literal-only -- inline fix), F27 (Pattern 9 banner-coverage probe calibration -- inline rationale) |
| Phase 6 | F14 (7 match_events + 13 emission sites), F17 (also emits emission_call_sites_json; intentional) |
| Phase 7 | F21 (validation runbook + F1 probes + JSONB regression gate + cross-project audit) |
| Phase 8 | F19 (doctrine fixes survived; no recursion), F20 (HANDOVER backlog item absorbed), F17 (PLAYBOOK addition for dual-row design), F22 (VALIDATION-RUNBOOK.md doctrine fix survived), F26 (PLAYBOOK note candidate for Pattern 6 string-literal scope), F27 (PLAYBOOK note candidate for Pattern 9 coverage variability) |

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
