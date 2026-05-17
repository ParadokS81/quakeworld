# HUD cvar coverage audit -- does the pipeline already extract the `hud_<name>_<subvar>` family?

**Audit date:** 2026-05-17
**Scope:** the `hud_<name>_<subvar>` SETTINGS CVAR family only (D11 part (c)). NOT the bare `<name>` / `+hud_` / `-hud_` command half (D8 (a)/(b), D9 -- confirmed-hidden, out of scope).
**ezquake-source HEAD:** `3f9e724fa608e516040f02b9557808ff3efda53e` (matches the L1 pin -- audit valid).
**Mode:** cold, read-only. No edits, no DB rebuild, no extractor run.

---

## 1. VERDICT

**COMPLETE -- D11's settings-cvar scope is REDUNDANT.**

The `hud_<name>_<subvar>` cvar family (structural set + variadic tail) is ALREADY
extracted as first-class `type='cvar'`, `source_backed` L1 entities -- not by the
audited `_handler_hud_elements.py`, but by a dedicated, wired HUD_Register->cvar
synthesis inside the **cvar handler** `_handler_cvars.py`. This generalizes across
all 83 HUD elements (verified on radar AND clock, the latter having no pointer
block), so it is not a radar coincidence. D11's LOCKED PREMISE -- that these cvars
are "the SAME hidden-name class as the bare / `+-` commands (literal AST
extraction never sees it)" -- is **REFUTED for the cvar half**.

The command half (bare / `+-`) is untouched by this audit and remains
hidden per D9's separately-verified premise.

---

## 2. WHAT THE HANDLER(S) EMIT

### 2a. `_handler_hud_elements.py` (the audited handler) -- does NOT emit cvar entities

- `_synthesize_owned_cvar_names(name, args, source_bytes)`
  (`_handler_hud_elements.py:80-123`) builds a NAME LIST: `order`,`draw`
  unconditional (`:84-85`); `place`/`show`/`pos_x`+`align_x`/`pos_y`+`align_y`/
  `frame`+`frame_color` gated on arg-presence (`:93-105`); `item_opacity`
  unconditional (`:106`); variadic tail loop from `i=16` reading (suffix,default)
  literal pairs (`:107-116`).
- Called at `:207` (`owned = _synthesize_owned_cvar_names(...)`), attached as a
  nested string array `owned_cvars` on the hud_element row (`:217`), surfaced in
  `finalize` as `{"hud_elements": {<name>: {"ast": {"owned_cvars": [...]}}}, "_stats": ...}`
  (`:256, :269`). **It returns hud_element aggregates, never `cvar` entities.**
- Loader: `load-hud-elements.ts:39` stores `ast.owned_cvars` ->
  `owned_cvars_json`, a **JSONB column on `hud_element_versions`**
  (`natural-keys.ts:466-488`; column def `db/migrations/002_layer1_schema.sql:226`).
  `grep -rn owned_cvars scripts/ db/` -> the ONLY sinks are that JSONB column,
  `diff-versions.ts:135`, `quality-grid.ts:234`, `types.ts:201/622`. **No code
  path anywhere explodes `owned_cvars` into `entities` rows.** For the audited
  handler in isolation, the answer to "does it emit a cvar-type entity" is NO --
  it produces nested metadata on the parent hud_element.

### 2b. `_handler_cvars.py` (the cvar handler) -- DOES emit the full cvar contract

This is the real producer of the `hud_<name>_<subvar>` cvar entities:

- `output_filename = "ezquake-variables-ast.json"` (`_handler_cvars.py:377`).
- `GROUP_CALL_NAMES` includes `"HUD_Register"` (`:380-385`); `visit_cursor`
  dispatches on it (`:413`).
- `end_file` (`:463`) at `:481-482`:
  `elif nm == "HUD_Register": hud_cvars.extend(_synthesize_hud_cvars(call_cursor, args, ...))`.
- `_synthesize_hud_cvars(...)` (`:288-351`) builds a FULL cvar record per subvar
  via `mk(suffix, default)` (`:306-324`): `cvar_name`/`c_ident` = `hud_{name}_{suffix}`,
  `default_value`, `source_file`, `source_line` (the HUD_Register call-site line),
  `storage_class:"generated"`, `group_name = _HUD_GROUP_NAME` ("MQWCL HUD", `:50`).
  Subvar coverage (`:326-350`): `order`,`draw` unconditional; place/show/
  pos_x+align_x/pos_y+align_y/frame+frame_color gated on arg-presence;
  `item_opacity` unconditional; variadic loop from `i=16`. **Structurally
  identical synthesis to `_handler_hud_elements.py`, but emitting cvar records.**
- `finalize` (`:492`) assembles `ezquake-variables-ast.json`; a quality stat
  `"bucket3_runtime_synthesized"` (`:515`) tracks the synthesized class.
- Loader: `load-cvars.ts:60` records `storage_class` and applies **no
  generated/source_state filter** -- generated HUD cvars load as normal
  `type='cvar'` entities.

---

## 3. GROUND-TRUTH CONTRACT (verified live, HEAD 3f9e724f)

### HUD_Register signature (`hud.c:1182-1188`, VERIFIED)
`name(0) var_alias(1) description(2) flags(3) min_state(4) draw_order(5)
draw_func(6) show(7) place(8) align_x(9) align_y(10) pos_x(11) pos_y(12)
frame(13) frame_color(14) item_opacity(15) params(16) ...`
Both handlers' arg-index maps match this exactly.

### Structural subvar set (HUD_CreateVar calls in the HUD_Register body)
| subvar | hud.c line | gating (VERIFIED) |
|---|---|---|
| `order` | 1244 | **UNCONDITIONAL** (bare block 1241-1246 scoping a local buffer, NOT an `if`) |
| `place` | 1251 | UNCONDITIONAL |
| `show` | 1267 | GATED `if (show)` (1265) |
| `pos_x`,`align_x` | 1295-1296 | GATED `if (pos_x && align_x)` (1293) |
| `pos_y`,`align_y` | 1308-1309 | GATED `if (pos_y && align_y)` (1306) |
| `frame`,`frame_color` | 1321,1324 | GATED `if (frame)` (1319) -- creates BOTH |
| `item_opacity` | 1337 | UNCONDITIONAL (block 1336-1340) |
| `draw` | 1343 | UNCONDITIONAL |
| variadic | 1357 | loop over `...` (subvar,value) pairs until NULL (1348-1360) |

**Doc-error surfaced:** D11 (`:329-330`) and this audit's own prompt label
`order` as "(gated)". Live source shows `order` is UNCONDITIONAL; `show` is the
gated one. Both handlers emit `order` unconditionally (CORRECT) and `show` on
arg-presence (correct proxy for `if(show)`). Code is right; the D11 prose
annotation is wrong -- worth a one-line spec fix, not a mechanism change.

### Worked anchor: radar (`hud_radar.c:1422-1446`, VERIFIED)
Call args: show="0" place="top" align_x="left" align_y="bottom" pos_x="0"
pos_y="0" frame="0" frame_color="0 0 0" item_opacity=NULL, then 21 literal
(subvar,value) variadic pairs (opacity..proportional). All gates pass on these
non-NULL literals.

Expected `hud_radar_*` set = **32**:
- structural (11): order, draw, place, show, pos_x, align_x, pos_y, align_y,
  frame, frame_color, item_opacity
- variadic (21): opacity, width, height, autosize, show_powerups, show_names,
  highlight_color, highlight, player_size, show_height, show_stats,
  fade_players, show_hold, weaponfilter, itemfilter, otherfilter, onlytp,
  scale, simpleitems, colornames, proportional

(The `static cvar_t *hud_radar_*` pointer block at `hud_radar.c:1210-1231` is a
runtime FindVar alias set, NOT the synthesis source -- synthesis keys on the
call site at line 1422, confirmed below.)

---

## 4. CROSS-CHECK (backup DB -- corroborating; stale-caveated)

Backup `apps/qw-oracle/data/knowledge.db.bak-pre-rebuild` (Apr 23 11:41,
SQLite-era, PRE-Track-B). Stale for exact HEAD counts; valid as a structural
"is this class present at all" probe.

- `SELECT name FROM entities WHERE type='cvar' AND name LIKE 'hud_radar_%'`
  -> **32 rows, EXACT match to the 32-name ground truth above. ZERO missing.**
- `hud_radar_opacity`: `source_state='source_backed'` (NOT doc_only),
  first/last_seen `3.6.9`.
- Provenance proof in **current** `ezquake-variables-ast.json` (non-versioned,
  HEAD output): `hud_radar_opacity` -> `c_ident:"hud_radar_opacity"`,
  `source_file:"hud_radar.c"`, `source_line:1422` (the HUD_Register call site,
  NOT the pointer block ~1211), `storage_class:"generated"`,
  `group_name_in_source:"MQWCL HUD"`, `desc:"The opacity of the radar."`
  (help-JSON merged). This is the `_handler_cvars.py` synthesis path, proven
  live -- not pointer-decl coincidence.
- **Generalization (decisive):** `hud_clock_*` cvar entities = 18; clock's
  `hud_element_versions.owned_cvars_json` = exactly 18 names
  (order..content). Clock has NO `static cvar_t *` pointer block -> the
  coverage comes from HUD_Register synthesis, not C-identifier coincidence.
  `hud_frags_*`=36, `hud_ping_*`=20, `hud_net_*`=14. Total `hud_*` cvar
  entities in backup = **1429** across the 83 hud_element entities.
  (`hud_speed_meter_*`/`hud_teamfortress_skin_*`/`hud_guns_weapon_*`=0 are
  wrong-name guesses, not gaps -- real element names differ.)

No expected radar name is missing. No class-level gap found. The single
caveat: the LOAD-side count (1429) is from the stale SQLite backup; the
EXTRACTOR-side and LOADER-side proofs are current-HEAD code (see Section 5),
so the conclusion does not rest on the stale DB.

---

## 5. EVIDENCE LOG

| Claim | Evidence | Status |
|---|---|---|
| HEAD = 3f9e724f | `git -C research/repos/ezquake-source log -1` | VERIFIED |
| `_handler_hud_elements.py` emits name-list, not cvar entities | `:80-123, :207, :217, :256, :269` | VERIFIED |
| owned_cvars only sink = `hud_element_versions.owned_cvars_json` JSONB | `grep -rn owned_cvars scripts/ db/`; `load-hud-elements.ts:39`; `natural-keys.ts:466-488`; `002_layer1_schema.sql:226` | VERIFIED |
| `_handler_cvars.py` synthesizes full HUD cvar records | `:288-351` (`_synthesize_hud_cvars`/`mk`) | VERIFIED |
| HUD synth is WIRED | `GROUP_CALL_NAMES` `:384`; `visit_cursor` `:413`; `end_file` `:481-482`; `finalize` `:492` | VERIFIED |
| `load-cvars.ts` does NOT filter generated HUD cvars | `:60` records storage_class; no source_state/generated filter (grep) | VERIFIED |
| HUD_Register signature / arg map | `hud.c:1182-1188` | VERIFIED |
| Structural gating (order UNCONDITIONAL, show GATED, etc.) | `hud.c:1241-1360` per Section 3 table | VERIFIED |
| Radar variadic tail = 21 literal pairs | `hud_radar.c:1422-1446` | VERIFIED |
| Backup radar set = 32, exact match | sqlite `SELECT ... LIKE 'hud_radar_%'` | VERIFIED |
| hud_radar_opacity source_backed, synth provenance, source_line 1422 | sqlite + `ezquake-variables-ast.json` record | VERIFIED |
| Clock generalization: 18 entities == 18 owned_cvars, no pointer block | sqlite count + `hud_element_versions.owned_cvars_json` | VERIFIED |
| D11 premise text + "order (gated)" doc-error | spec `:316-364`, esp `:321-325, :329-330` | VERIFIED |
| D9 plans a NEW `_handler_hud.py`; only `_handler_hud_elements.py` exists | spec `:242-255`; `ls _handler_hud*.py` | VERIFIED |
| Current postgres-js loader executes a fresh HEAD load preserving these | NOT run (constraint: no rebuild) | INFERRED (strong: 3 current-code links verified; only the load+count not executed) |

---

## 6. BOTTOM LINE FOR D11

D11's settings-cvar recovery is **REDUNDANT and should be struck**. The cvar
handler `_handler_cvars.py` already implements exactly D11's proposed mechanism --
literal modeling of the HUD_Register contract (literal `name` + literal
structural subvars + literal variadic (subvar,value) pairs, same per-arg gating)
-- and already ships the full `hud_<name>_<subvar>` family as first-class
`source_backed` `type='cvar'` L1 entities, generally (radar, clock, frags, ...,
1429 total), tagged `storage_class:"generated"`, group "MQWCL HUD", with the
HUD_Register call-site as `source_line`. D11's locked premise that these are
"the SAME hidden-name class as the bare / `+-` commands" is false: the commands
ARE hidden (D9-verified: `Cmd_AddCommand(name,...)` has a non-literal `name`),
but the cvars are NOT (a dedicated synthesis already reconstructs them). D11/D9
should narrow to the COMMAND half only.

**Confidence: HIGH.** Three independent current-HEAD code links are each
verified (handler synth wired -> `ezquake-variables-ast.json` output present
with synth provenance -> `load-cvars.ts` ingests without a generated-filter);
the stale backup only corroborates.

**Single biggest residual risk:** if D9/D11 proceed to build the planned new
`_handler_hud.py` and have it ALSO synthesize cvars, it will collide with
`_handler_cvars.py`'s output on `entities UNIQUE(project,type,name)` (or require
dedup arbitration). Actionable consequence: the new handler must own the COMMAND
half ONLY; cvar synthesis is already owned by `_handler_cvars.py`. Secondary
(lower) risk: the load+count proof is from the Apr-23 SQLite backup; a fresh
HEAD load+count is the liveness oracle and was not run here per the no-rebuild
constraint -- but all three extractor/loader code links are current-HEAD
verified, so this does not move the verdict.

---

### VERDICT: COMPLETE (D11 settings-cvar scope redundant -- `hud_<name>_<subvar>` cvars already fully extracted as source_backed L1 cvar entities by `_handler_cvars.py`, structural + variadic, generalized beyond radar).

### BOTTOM LINE: Strike the cvar half of D11; narrow D11/D9 to the command half (bare / `+hud_` / `-hud_`), which remains genuinely hidden per D9's premise. The new `_handler_hud.py` must NOT re-synthesize cvars -- `_handler_cvars.py:288-351` (wired via `:384/:413/:481-482`) already owns them; a duplicate emitter would collide on `entities UNIQUE(project,type,name)`. Confidence HIGH (three current-HEAD code links verified; stale backup only corroborates).
