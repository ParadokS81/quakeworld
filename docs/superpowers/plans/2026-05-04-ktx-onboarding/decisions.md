# KTX Onboarding -- locked cross-cutting decisions

These choices apply to every phase. Each phase MD must respect them. If any phase needs to deviate, surface a "deviation" section at the top of that phase MD and stop for operator review -- do not silently override.

The decisions here pin the commitments closed across the five-pass arc-brainstormer (`docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` + sibling `2026-05-04-oracle-prod-update-lifecycle.md`). They are NOT open questions; they are commitments. Most are direct lifts from the design spec; a few are arc-shape conventions paired with operator memory that phase drafters need to consume up-front.

Mid-arc amendments land here as dated amendment blocks under the original decision; never silently override in a phase MD.

---

## D1. The design spec is the source of truth -- do not relitigate

**Decision:** Pass 1-5 commitments at `docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md` are LOCKED. Phase MDs implement those commitments; they do not revisit shape questions ("should we extract bucket-3 family cvars?", "should match_event be a new entity type?", etc.).

**Why:** Five-pass arc-brainstormer closed cleanly with operator sign-off at each pass close. The spec is dense (~1480 lines) and load-bearing for downstream work (qw-event-log validation harness, Layer 3 concept-note candidates, future engine ports). Re-opening shape questions in a phase MD risks fragmenting the commitments and shipping a half-aligned product.

**Implication:** When a phase MD's drafter encounters something the spec doesn't cover, they list it under "Open questions" with a documented best-guess default and proceed -- they do NOT reach back for a brainstorm pass. If the question turns out to be brainstorm-shaped (a NEW shape question, not implementation-shaped), surface explicitly: "this is a shape question, not a planning question. Want to re-open arc-brainstormer for one more pass?" and halt for operator decision.

If a phase reveals that a `decisions.md` decision is wrong (rare but possible), land the amendment as a dated block under the original decision -- the qw-oracle Arc 1 D8 input_type asymmetry amendment is the canonical pattern. Strong "do not revert" commentary in the code AND in the decision text. If the amendment changes the shape of later phases, those phases need re-drafting.

---

## D2. KTX is libclang, not tree-sitter -- doctrine fixes ride the arc

**Decision:** Canonical KTX (https://github.com/QW-Group/ktx) is pure C; the libclang + python3-clang toolchain is the right extraction stack. Tree-sitter is reserved for the dusty-ktx fork's `qcsrc/` (QuakeC), which is OUT OF SCOPE for this arc.

**Why:** Multiple existing repo docs assert KTX uses tree-sitter (OVERVIEW.md, EXTRACTOR-PLAYBOOK.md, `scripts/extractors/CLAUDE.md`, the user's `project_extraction_pipeline_vision.md` memory). Verified false by reading `apps/qw-oracle/scripts/extractors/ktx/commands.ts` shape (TS regex parser, not tree-sitter; also wrong language for the canonical pipeline) and by the Pass 1 spike against `research/repos/ktx/src/world.c`. The doctrine error has been dormant because no one has built KTX extraction yet; landing KTX without correcting it would entrench the wrong story.

**Implication:** Phase 0 sweeps the doctrine fixes across all four references in one commit. Phase 8 (end-of-arc) re-verifies the corrections survived (no recursion of the wrong claim into new docs added during the arc). The corrections are mechanical text edits with the literal before/after lines shipped inline in the Phase 0 MD.

---

## D3. Cross-codebase port handler shape -- inherit from Visitor only

**Decision:** All KTX handlers (Pass 1 first-class entity handlers + Pass 5 gameplay-content handlers) inherit from `extractor_lib._visitor.Visitor` ONLY. They do NOT subclass any parent-project handler (ezQuake / FTE / MVDSV / QWCL). Per the cross-codebase port pattern documented in `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`.

**Why:** KTX is a cross-codebase port (different codebase, different APIs), not a fork (same codebase, same APIs with deltas). Subclassing a parent handler would tie KTX's extraction shape to the parent's, which is wrong: KTX's `RegisterCvar*` API differs from ezQuake's `cvar_t foo = {...}` declaration shape; the right relationship is "port, not extend."

**Implication:** Each KTX handler is its own file under `apps/qw-oracle/scripts/extractors/ktx/_handler_*.py`, importing only `from extractor_lib._visitor import Visitor` and the per-handler helpers (e.g., `_literal_string`, `_file_macros`, etc.). Read MVDSV's analogous handlers as templates when drafting (they are the closest cross-codebase port in the lineup); do NOT subclass them.

---

## D4. Cross-header Pattern 6 lift to extractor_lib (depth-1 #include walk)

**Decision:** Phase 1 lifts Pattern 6 (`#define` resolution) from same-file-only to depth-1 #include walk. Implementation lives in `apps/qw-oracle/scripts/extractors/extractor_lib/_source.py`; the `_file_macros` cache widens from `dict[str,str]` (same-file only) to `dict[str,str]` keyed across the TU's depth-1 include closure. Available to all engines after the lift.

**Why:** KTX's `common_um_init` (`commands.c:4152-4205`) contains 2 macro-prefixed lines (`LGCMODE_VARIABLE`, `TOT_MODE_VARIABLE`) defined in `g_local.h`. Today's same-file-only Pattern 6 silently drops them. An ad-hoc allowlist (2 entries today) silently rots when a future tag adds a 3rd. EXTRACTOR-PLAYBOOK Pattern 6 explicitly flags this as the deferred pressure point ("if this becomes pressure on another engine, extend `_file_macros` to walk #include'd headers"). KTX is the first surfaced pressure; the lift pays off across all current and future engines.

**Implication:**
- Lift lands BEFORE any KTX gameplay handler runs (Phase 1 prerequisite for Phase 3).
- Scope is depth-1 only (walk direct #includes of the TU; not transitive). Sufficient for KTX. Revisit if a multi-hop case surfaces in a future engine.
- Adds `PARSE_DETAILED_PROCESSING_RECORD` flag on the libclang TU. Estimated impact <5% on file-parse time per ezQuake measurement; not a new cost class.
- The lift is shared infrastructure, not KTX-specific. No KTX-named branches in `extractor_lib`.

### Amendment 2026-05-05 (Phase 1 drafter source-walk)

The original "adds `PARSE_DETAILED_PROCESSING_RECORD` flag" framing is incorrect. The flag is already in `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py:172` (`PARSE_OPTS`) and has been since the existing Pattern 6 same-file resolver shipped. Today's pipelines already pay for the parse-detail records.

The lift's actual mechanism: add a post-parse walk over the depth-1 `#include` closure that collects macros from already-recorded preprocessor cursors, widening the `_file_macros` cache. The flag stays unchanged; PARSE_OPTS is not modified by Phase 1.

Cost class shifts from "added parse-time flag impact" to "post-parse macro-walk impact" -- strictly cheaper than the original projection. F16's <10% gate stays in place as a sanity check on the macro-walk delta; the parse-time component is now zero by definition (flag already on).

Do not revert this amendment: Phase 1's lift implementation is correct as drafted; the amendment exists so D4's prose matches what shipped. F16 carries the matching amendment.

---

## D5. Three migration files split semantically -- 008 / 009 / 010

**Decision:** Three separate migration files land in chronological order during Phase 1. All pure-additive. ALTER TABLE DROP CONSTRAINT + ADD CONSTRAINT pattern; idempotent re-run.

| File | Concern | Schema delta |
|---|---|---|
| `008_ktx_log_template_logfile_channel.sql` | log_template channel widening | `log_template_versions.channel` CHECK admits `'logfile'` |
| `009_ktx_match_event_type.sql` | new entity type + per-version table | `entities.type` CHECK admits `'match_event'`; CREATE TABLE `match_event_versions` (PK + 2 indexes) |
| `010_ktx_gameplay_kinds.sql` | gameplay-kind widenings | `gameplay_entity_defs.kind` += `'monster'`; `gameplay_mechanics.kind` += `'game_mode'`, `'election_type'`, `'score_system'`, `'drop_item'`, `'loc_macro'`, `'teamplay_message'`, `'mode_default'` |

**Why:** Three files are easier to read, revert, and reason about than one mega-migration. 008 is independent of gameplay work (Pass 1 territory); 009 atomically introduces the new entity type with its per-version table; 010 widens the gameplay kinds (atomic group). They're independent at the data level (could land in any order without breaking constraints) but chronological numbering preserves audit traceability and matches Pass-3 / Pass-4 / Pass-5 work attribution.

**Implication:**
- Phase 1 ships all three migrations in one commit (single foundation phase). Per-migration validation probes (insert/delete stub rows for each new value) gate the phase boundary.
- Pass 3 already drafted 008's content; verify against the spec at execution time. 009 + 010 are first drafted in Phase 1.
- Standard PostgreSQL `ALTER TABLE ... DROP CONSTRAINT ... + ADD CONSTRAINT ...` per the Pass-3 / Phase-2 / Phase-7 precedent. CHECK constraints don't require table rewrite for additive value-set changes.

---

## D6. Handler grouping by walking strategy, not source file or row kind

**Decision:** Four KTX gameplay handlers, grouped by libclang traversal pattern:

| Handler | Output filename | Row kinds emitted | Walking strategy |
|---|---|---|---|
| `_handler_modes.py` | `ktx-modes-ast.json` | `game_mode` (catalog) + `mode_default` (overlays) | STRING_LITERAL-array walker on `const char[]` initstring declarations in `commands.c` (uses extended Pattern 6 from D4) |
| `_handler_gameplay_taxonomies.py` | `ktx-gameplay-taxonomies-ast.json` | `election_type` + `death_rule` | Enum-decl walker (Pattern 10) on `electType_t` (`progs.h`) and `deathType_t` X-macro (`deathtype.h`) |
| `_handler_gameplay_tables.py` | `ktx-gameplay-tables-ast.json` | `monster` + `score_system` + `drop_item` + `loc_macro` + `teamplay_message` | INIT_LIST_EXPR walker (Pattern 4) on struct-array literals + Pattern 9 banner-comment harvest for teamplay_message handler-function descriptions |
| `_handler_match_events.py` | `ktx-match-events-ast.json` | `match_event` | XSD parse (Python `xml.etree.ElementTree`) + emission-site grep (NOT a libclang handler) |

**Why:** Two row kinds that share a walker belong together; two row kinds in the same source file using different walkers do NOT. Tested against Option A (one mega-handler) and Option B (one handler per row kind, 10 total) at brainstorm time; both rejected. Option C (group by walking strategy) makes per-handler unit-of-work clear, source-file scope per handler small, slicing trivial, and pattern documentation reusable.

**Implication:**
- Each handler is its own file under `apps/qw-oracle/scripts/extractors/ktx/`.
- Each handler has a one-output-filename mapping (`ktx-<group>-ast.json`).
- Phase 8 lands a new "Handler-grouping rationale" section in EXTRACTOR-PLAYBOOK.md capturing this principle for future engine ports.
- The match_event handler is the lone XSD-driven handler; placement is project-private (Tier 3 in EXTRACTOR-PLAYBOOK three-tier model). If a second engine surfaces XSD-defined event types, lift to `extractor_lib._xsd_match_events.py` per Rule of Second Consumer; until then, stays project-private.

---

## D7. Pattern 14 canonical-name suffix -- KTX commands and info_keys

**Decision:** KTX commands use Pattern 14 canonical-name suffixes for sub-namespaces; KTX info_keys use Pattern 14 with scope `userinfo`.

| Source | Canonical-name shape |
|---|---|
| `cmd_t cmds[]` (main, 317 entries) | `<name>` (bare) |
| `frogbot_cmd_t std_commands[]` (39 entries) | `<name>:frogbot:std` |
| `frogbot_cmd_t editor_commands[]` (25 entries) | `<name>:frogbot:editor` |
| KTX SetUserInfo writes (~5-6 keys) | `<bare>:userinfo` (e.g., `*is:userinfo`) |

**Why:** The spike found 25 collisions between std and editor commands (every editor entry overlaps a std entry: addmarker, addpath, goto, info, move, save, summary, ...). Without subscope disambiguation, first-seen-wins dedup would silently drop 25 editor entries. Pattern 14 keeps schema clean (no new column); existing `lookup_entity` MCP prefix-fallback handles bare-name queries.

**Implication:**
- Per-file dedup `_seen_in_file` keyed on the FULL canonical name (post-suffix), not the bare name.
- Source dispatch confirmed at `commands.c:1047` (`cmd_t` row `{ "botcmd", FrogbotsCommand, ... }` selects between std_commands and editor_commands). Bot subcommands are reached as `botcmd <name>` from the player console.
- Operator queries via the user-facing token (`/lookup_entity ezquake addmarker` returns the bare match if it exists, falls back to suffixed matches via prefix-fallback).

---

## D8. Single-key gate convention everywhere -- {"mode":"<token>"}

**Decision:** All gameplay rows (mode_default overlays, mutator-gated rules, mode-restricted death types) gate on `{"mode":"<token>"}` -- the user-facing token, not the internal `UM_*` axis. Catalog rows themselves use `ruleset_gate_json = {}` (catalog rows DEFINE modes; they aren't gated by them).

**Why:** Operator memory `feedback_mcp_answer_shape.md` + Pass 4.2 reasoning: the user-facing token (`ca`, `2on2`, `wipeout`) is what server admins, players, and concept notes will reference. Internal axes (UM_4ON4 backing wipeout / ca / 4on4) are queryable via `props_json.team_structure` but not load-bearing in the gate.

**Implication:**
- Cross-mode rules use array-valued gates `{"mode":["wipeout","ca","4on4"]}` OR duplicate rows -- decided per-rule based on source shape, not globally. Pass 5 picks case-by-case during phase 3-5 drafting.
- The 17 um_list peers + race + bloodfest + 8 mutators all generate gates with their canonical token in the catalog row's `name` field.

---

## D9. Source-fidelity for canonical tokens

**Decision:** Mode names match the user-facing command spelling exactly. `ca`, not `clan_arena`. `2on2`, not `two_on_two`. `lgc`, not `LGC Mode`. The source enum spelling (`umCA`, `um2on2`, `umLGCMODE`) lives in `value_text` for traceability.

**Why:** Tokens flow into `ruleset_gate_json` across hundreds of rows AND into MCP query examples AND into concept notes. Source-fidelity lets a server admin reading source / typing commands / writing a concept note all use the same identifier without translation.

**Implication:**
- No aliases (canonical-token-only). If discoverability collides with source-fidelity in a future case (e.g., `tot` is opaque), Layer 3 concept notes carry the human-readable label; Layer 1 stays source-fidelity.
- Display labels live in `props_json.user_facing_label` (e.g., `"Wipeout"`, `"Clan Arena"`) and `props_json.community_name` (informal player nicknames if any). The DB row's `name` column stays source-faithful.

---

## D10. Dual-row design for log_template + match_event -- intentional, do not deduplicate

**Decision:** Pass 1.7's printf-handler (`_handler_log_templates.py`) keeps catching XML-shaped log_printf emissions as `log_template_versions` rows (channel='logfile', format_string=`"\t\t\t<event_name>...`). Pass 4.5's match_event handler (`_handler_match_events.py`) ALSO emits `match_event_versions` rows for the same emission sites. Different facets:

- log_template captures *where the emission happens in source* (per call site, ~13 rows for the XML emissions).
- match_event captures *what the event-type schema is* (per type, 7 rows from the XSD).

**Why:** A future maintainer is likely to look at the dual rows and try to "deduplicate." The duplicate IS the design: per-site truth (printf format string, file/line, channel) vs per-type truth (XSD attribute schema, XSD version, all emission sites). Either alone would lose information.

**Implication:**
- Pass 1.7's printf-handler is NOT modified to skip XML-shaped log_printfs.
- Phase 8 lands an EXTRACTOR-PLAYBOOK note documenting the dual-row design so future maintainers don't try to remove one side.

---

## D11. Two-axis catalog discriminator for game_mode rows

**Decision:** Single `kind='game_mode'` for all 27 catalog rows. Two orthogonal axes in `props_json` discriminate:

```
props_json.init_mechanism in {
  "um_init_string"                  -- 17 um_list[] peers
  "cvar_toggle_with_init_string"    -- race (literal char[] race_settings[])
  "cvar_toggle_only"                -- bloodfest + all 8 mutators
}

props_json.mode_class in {
  "standalone"                      -- replaces active mode; persists across match
  "mutator"                         -- stacks on top of active mode
}

props_json.auto_reset_on_match: bool  -- true iff some mutators auto-clear at match start
```

**Why:** From a normal player's POV everything is a mode -- they all come with their own specific rules. The "is this standalone or stacked" distinction is implementation detail the player doesn't think about. The community framing wins for catalog identity; the architectural distinction lives in sub-classifier fields. Splitting along `kind='game_mode'` vs `kind='cvar_toggle_mode'` would force UNION across kinds for the natural "what modes does KTX support" query.

**Implication:**
- Final catalog inventory: 17 um_list peers + race + bloodfest + 8 mutators (LGC + instagib + midair + berzerk + yawnmode + killquad + freshteams + nosweep) = **27 rows**.
- Phase 3 (modes handler) emits all 27 catalog rows with the two-axis discriminators populated.
- Mutators have NO mode_default overlay rows (they don't carry init strings); they live as catalog rows only.

---

## D12. Per-line mode_default extraction granularity -- one row per cvar-set line

**Decision:** Phase 3's modes handler emits ONE `gameplay_mechanics` row per cvar-set line in each initstring (not composite-per-mode JSON-blob rows).

**Why:** Composite rows would compress to ~18 rows but every consumer query would need a JSON walk; defeats the structured-data shape; per-line trailing-comment-as-docstring buried in a blob; per-line `source_ref` impossible.

**Implication:**
- Row count: ~309 mode_default rows = 54 baseline (`common_um_init`) + ~255 overlays (17 per-mode initstrings × ~15 lines avg).
- Each row carries `props_json.apply_order in {1, 2}` (1=common baseline, 2=per-mode overlay), `props_json.is_baseline: bool` (mirrors apply_order==1 for fast filter), `props_json.initstring_array` (e.g., `"common_um_init"`, `"_2on2_um_init"`), and `props_json.comment` (harvested trailing `// text`).
- Trailing-comment harvest is load-bearing -- those comments ARE the only documentation that exists. Don't drop them.

---

## D13. OUT_OF_SCOPE.md as canonical disposition record

**Decision:** Phase 0 creates `apps/qw-oracle/scripts/extractors/ktx/OUT_OF_SCOPE.md` documenting all SKIP decisions with one-line rationale per item. Subsequent phases append to it as their handlers run.

**Items to capture (final):**

- **Bucket-3 indexed-family cvars** (Pass 1.1): k_motd1-9 (9 entries), k_ml_0-5 (6 entries). Operator-defined via configs; iterate by index. No registration site by design.
- **Truly orphaned drift cvars** (Pass 1.1): k_666, k_dm2mod, k_no_vote_break, k_specktalk. Zero source matches; upstream config drift candidates.
- **lsType_t** (Pass 4.3): post-match scoreboard formatting classifier; derived from active mode + cvar state at scoreboard-display time.
- **gameType_t** (Pass 4.3): subsumed into catalog `props_json.game_type` field; no standalone Layer 1 rows.
- **fb_spawn_t stdSpawnFunctions[]** + **itemSpawnFunctions[]** (Pass 4.4): bot-subsystem dispatch tables; pure path-finding-init registration.
- **stats_format_t file_formats[]** (Pass 4.4): xml + json formatter dispatcher; pure infrastructure.
- **fixed_maps_list[]** (Pass 4.4): MVDSV-engine-compat workaround; all 38 names already exist as `qw.maps` rows.

**Why:** Future maintainers + arc-reviewer + cross-project audits all look here when a "missing entity" question surfaces. Without a canonical disposition record, the SKIP decisions get re-relitigated every time someone notices a missing row.

**Implication:**
- Phase 0 lands the file with all 7 entries. Subsequent phases verify their handlers don't accidentally extract any SKIP-listed item.
- The file is markdown; format mirrors prior engines' OUT_OF_SCOPE.md if one exists, else: title + per-item section with `## <token>`, `**Why skip:**`, `**Source:**` (file:line for the consumer/declaration), `**Related (if any):**` (Layer 3 concept-note candidate or sibling row).

---

## D14. JSONB binding discipline -- pass JS values directly, NEVER pre-stringify

**Decision:** Per `feedback_postgres_js_jsonb_binding.md`. Every loader writing a JSONB column passes the JS value (array, object, primitive) directly to postgres-js or wraps with `tx.json(...)` for explicit type tagging. NEVER `JSON.stringify(...)` then bind as TEXT -- that creates a JSONB string scalar instead of the structured value.

**Per-handler JSONB columns to watch:**

| Table | Column | Handler |
|---|---|---|
| `match_event_versions` | `attributes_json` | `_handler_match_events.py` -> `load-match-events.ts` |
| `match_event_versions` | `emission_call_sites_json` | same |
| `gameplay_mechanics` | `props_json` | all 4 Pass 5 handlers / loaders |
| `gameplay_mechanics` | `ruleset_gate_json` | same |
| `gameplay_entity_defs` | `props_json` | tables handler / loader |
| `log_template_versions` | `all_call_sites_json` | Pass 1 log_template handler / loader (already exists; reuse) |

**Why:** The qw-oracle Arc 1 Phase 2 surfaced this exact bug -- counts matched but JSONB columns held string scalars instead of objects. F1.jsonb_columns_not_strings is the regression gate; do NOT bypass.

**Implication:**
- Every loader added in Phase 2-6 implements the convention from the start.
- Phase 7 includes JSONB-binding regression-gate probes per kind in the validation runbook (extension of F1.jsonb_columns_not_strings to KTX rows).
- The convention is not loader-specific; it's a postgres-js-binding rule that applies anywhere JSONB is written.

---

## D15. Idempotent loaders + regression guards stay armed

**Decision:** Every KTX loader (Pass 1 wirings + Pass 5 new files) is idempotent by construction. Re-run on already-loaded data produces identical state (no new rows, no count drift, no JSONB mutation). The existing `load-version` regression guard (aborts when entity counts drop >50% without `--force`) is NOT bypassed.

**Why:** Operator memory `feedback_idempotency_before_staleness.md` + the qw-oracle CLAUDE.md "always-on rules" establish this as a project-wide invariant. Loader bugs that violate idempotency manifest as count-inflation false positives (re-run doubles rows) or as silent data corruption (JSONB columns get stringified on second load). The regression guard catches the first; F1 probes catch the second.

**Implication:**
- Loader patterns: natural-key UPSERT (ON CONFLICT DO UPDATE) keyed on (canonical_id, version) for `*_versions` tables; (gameplay_source_id, name, kind) for `gameplay_*` tables; etc. Mirror existing Arc 1 patterns; do not invent new shapes.
- Phase 7 includes idempotency probes per loader (run twice, assert row count and content hash unchanged on second run).
- Migrations are also idempotent (D5 covers this; same convention).

---

## D16. Phase atomicity + boundary verification -- each phase commits a working state

**Decision:** Each phase ends with a single commit that leaves the system runnable. Phase MD's "Outputs to next phase" section names the runnable state. Phase MD's "Verification (phase boundary)" section lists copy-paste YES/NO probes the operator runs to confirm the phase landed correctly.

**Why:** Identical to qw-oracle Arc 1 D14. If a phase mid-task leaves the system in a broken state, that's a phase-internal concern; phase boundaries must be green so the operator can pause / resume / hand off without inheriting partial state.

**Implication:**
- Verification probes return YES/NO answers, not interpretive prose. SQL queries with expected row counts; CLI invocations with expected pass count; `\d+ <table>` against Postgres compared to a snapshot.
- Operator review at every phase boundary (D17). Drafter terminal does NOT auto-proceed.
- If verification FAILs, phase MD's "Recovery" section is consulted.

---

## D17. Operator review at every phase boundary

**Decision:** Each phase ships only after operator review. The drafter terminal does NOT auto-proceed. README.md's status column (`drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`) is the source of truth for "what's approved vs in-flight."

**Why:** Operator memory `feedback_fresh_context_for_execution.md` + arc-planner skill structural step. Auto-proceeding loses the operator's check on phase-MD shape and execution outputs; defeats the per-phase fresh-terminal discipline.

**Implication:**
- After draft: drafter halts, replies with phase MD path + sub-agent finding count + open questions + recommendation ("ready for review" or "needs another pass").
- After execution: executor halts with structured status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) per `arc-executor` skill.
- Operator can revise mid-phase by returning the phase MD to the same drafter terminal with feedback. If the phase MD is fundamentally wrong (drafter context polluted), open a new fresh terminal for redraft.

---

## D18. Subagent-vs-inline default + model + effort matrix

**Decision:** Per-task execution mode declared in each phase MD's task table. Decision rule (sharpened version of `feedback_no_subagents_for_mechanical_edits.md`):

- **Inline** when: the task is purely textual edits AND the plan ships full file content / per-file diffs inline AND the change has no logic. Markdown, doc edits, config files with no logic. Edit/Write/Bash directly.
- **Subagent (default for everything else)** when: the task involves code synthesis, multi-file integration, exploratory implementation, schema/migration writing, test authoring.

Model + effort selection per task shape (per `feedback_model_effort_range.md`):

| Task shape | Recommended model + effort |
|---|---|
| Architecture / design / cross-cutting review / post-arc analysis | Opus MAX |
| Multi-file integration, judgment-dense, plan drafting | Sonnet MAX or Opus medium |
| Mechanical implementation requiring reasoning (clear spec, 1-2 files, code synthesis) | Sonnet medium |
| Plan verification (read code, compare, report against decisions/findings) | Sonnet medium, Explore-shape sub-agent |
| Pure text shuffling (deletions, renames, doc edits with full content shipped inline) | Haiku, or skip subagent entirely and direct-edit |

**Why:** Operator's MAX x20 subscription means compute is not a billing concern; constraints are quality fit and "wrong tool for the job" effect of overshooting. Sonnet medium for architectural decisions under-resources; Opus MAX for pure text shuffling over-resources. Calibration matters per task shape.

**Implication:**
- Phase 0 + Phase 8 are markdown-heavy; default to inline execution for most tasks.
- Phase 1-6 are code-synthesis-heavy; default to subagent dispatch with Sonnet medium floor; bump to Sonnet MAX or Opus medium when judgment density warrants.
- Phase 7 is mixed (F1 probes are code; runbook is markdown; cross-project audit is research).
- Honest test for picking model size: would a Stack Overflow answer suffice? Yes -> Haiku. Synthesis from 4+ files or non-obvious judgment? Sonnet medium minimum. Architectural? Opus MAX.

---

## D19. ASCII output discipline + plain-English at decision points

**Decision:** ASCII only in code, commits, and shared docs. No emoji. No em-dashes / en-dashes / smart quotes -- use ASCII hyphen-minus. Plain-English first at sub-decision sign-offs; SQL DDL / JSON schemas / full column lists go to the spec or phase MD body, not into the conversation when asking the operator for approval.

**Why:** Operator memory `feedback_output_discipline_sentiment.md` + `feedback_plain_english_at_decision_points.md`. The operator runs `docs-check` validation that pattern-matches em-dashes; ASCII discipline keeps the noise channel clean. Plain-English-first calibrates to where decisions actually live (design intent, not field names).

**Implication:**
- Every phase MD respects ASCII. Verification probes' inline SQL respects ASCII.
- When asking operator to approve a sub-decision, structure: (1) plain-English what-it-means; (2) recommendation; (3) load-bearing trade-off; (4) one or two field-level details ONLY if they affect the decision; (5) "drain to spec" where the full DDL / JSON / regex lives.

---

## D20. Git workflow -- main tree default, no PR ceremony

**Decision:** All KTX execution happens in the main tree (`/home/paradoks/projects/quakeworld/`, branch `main`). No worktrees. No PRs. No 4-option merge menus. Each phase commits directly to main; push to origin at natural checkpoints.

**Why:** Project CLAUDE.md "Git workflow" section + operator memory `feedback_minimize_branch_ceremony.md` + `feedback_worktree_per_terminal.md`. The operator does not touch git; Claude runs all git operations silently. Worktrees only for parallelism (none active for KTX onboarding).

**Implication:**
- Each phase commits a working state with a one-line message naming the phase + change.
- `superpowers:finishing-a-development-branch` overridden -- no menus.
- `superpowers:using-git-worktrees` overridden -- no fresh worktree per phase.
- Verification of clean tree at phase start; commit at phase end; push at phase boundary OR at session-wrap (whichever comes first).

---

*End of decisions. If a future phase needs to override one of these, that override goes here as an amendment with date + reason -- not silently in the phase MD.*
