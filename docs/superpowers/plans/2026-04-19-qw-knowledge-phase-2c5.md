# QW Knowledge Phase 2c.5 Implementation Plan

> **Predecessor:** Phase 2c plan at `docs/superpowers/plans/2026-04-19-qw-knowledge-phase-2c.md`.
> **Schema:** `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` — requires a v1 → v2 bump.
> **Execution:** main tree, commit per task.

**Goal:** extend ezQuake extraction from the 4 core entity types (cvar, command, macro, cmdline_param) to the full engine-feature surface. Adds keynames, HUD elements, rulesets, and $-code token primitives. After Phase 2c.5 the ezQuake representation in `knowledge.db` is complete for the head snapshot and can serve as a reference template for future client ports (FTE, MVDSV, KTX).

**Rationale** (per user, 2026-04-19): "better too much data than too little. it costs nothing to have some extra in database as long as its structured well." Slipgate's ConfigViewer will consume `knowledge.db` eventually; these four entity types are ones it will benefit from having at query time (keynames for bind rendering, HUD elements for HUD editor tooling, rulesets for config-legality checks, token primitives for teamsay parsing).

**Out of scope (unchanged):**
- Built-in aliases. Verified that ezQuake has only 2 (`_cs`, `_y` in `cl_parse.c:3189-3192`) and they're defensive rewrites of server-injected aliases, not real client-owned aliases. Not entity-worthy.
- MVDSV / KTX / FTE — Phase 2d/2e.
- Historical backfill — Phase 2f.
- Trigger / formatted-comms whitelists (`cmd.c:1762,1781`). These are **policy tags** on existing command entities (which commands are safe in message-trigger context), not new entities. Add as tag-style columns during a later schema refinement if consumers need them; Phase 2c.5 doesn't tackle.

---

## Verified inputs (grep + read, 2026-04-19)

### Keynames — `keys.c`
- `keyname_t` struct typedef at line 120.
- `keyname_t keynames[] = { ... };` array at line 122.
- Entries of shape `{"F1", K_F1}`, `{"MOUSE1", K_MOUSE1}`, etc.
- Array-init pattern identical to the `cvar_t xs[]` case already handled by the cvar extractor.

### HUD elements — `hud_*.c` files
- 60 `HUD_Register(...)` call sites across 20 files.
- Signature captured in `extract-ezquake-cvars-clang.py:490-508`:
  ```
  HUD_Register(name, alias, desc, flags, min_state, draw_order, func,
               "show", "place", "align_x", "align_y", "pos_x", "pos_y",
               "frame", "frame_color", "item_opacity",
               "custom1", "default1", ... NULL)
  ```
- Cvar extractor already harvests the synthesized `hud_<name>_order` / `_draw` / `_show` / `_place` / etc. cvars. What's **missing**: the parent HUD element (its description, draw function, flags, min_state) as a first-class entity. Phase 2c.5 promotes this.

### Rulesets — `rulesets.c`
- 6 rulesets, enum values confirmed at `rulesets.h:42-47`:
  `rs_default`, `rs_smackdown`, `rs_thunderdome`, `rs_qcon`, `rs_mtfl`, `rs_smackdrive`.
- Each has a loader function: `Rulesets_Default` (line 607), `Rulesets_Smackdown` (277), `Rulesets_Qcon` (345), `Rulesets_Thunderdome` (410), `Rulesets_MTFL` (473), `Rulesets_Smackdrive` (541).
- Each loader mutates `rulesetDef_t` (12 fields: `ruleset`, `maxfps`, `restrictTriggers`, `restrictPacket`, `restrictParticles`, `restrictSound`, `restrictLogging`, `restrictRollAngle`, `restrictIPC`, `restrictExec`, `restrictSetCalc`, `restrictSetEval`, `restrictSetEx`, `restrictPlay` -- struct shape at `rulesets.c:31-44`).
- Each loader declares a `locked_cvar_t disabled_cvars[] = { {&cvar_ref, "value"}, ... };` list of cvars locked to specific values when the ruleset is active.

### Token primitives ($-codes) — `teamplay.c:1701-1735`
- Switch statement mapping `$` + single-char suffix to a byte value. Verified ~25 cases:
  - `$\` → 0x0D (CR, used as message-separator in teamsay)
  - `$:` → 0x0A (LF)
  - `$[`, `$]` → 0x10, 0x11 (bracket glyphs)
  - `$G`/`$R`/`$Y`/`$B`/`$W` → 0x86/0x87/0x88/0x89/0x84 (LED colors)
  - `$(`, `$=`, `$)` → 0x80/0x81/0x82 (powerup-state indicators)
  - `$a`, `$<`, `$-`, `$>`, `$,`, `$.`, `$b`, `$c`/`$d` → various special bytes
  - `$$` → literal `$`
  - `$^` → literal `^`
  - `$0`–`$9` → 0x12–0x1B (digit font forms)
- Separate handler in `TP_ParseMacroString` at lines 1685-1699 handles 4-digit hex charcode form `$\xHHHH` (different path, not the single-char switch).

---

## Schema bump (v1 → v2)

New tables and expanded CHECK constraints. Migration script runs at load-time (the loader already handles schema version check per `schema.ts:179`).

### New entity types in `entities.type` CHECK
Add `keyname`, `hud_element`, `ruleset`, `token_primitive` to the existing `('cvar','command','macro','cmdline_param')` list.

### New per-type version tables

```sql
CREATE TABLE IF NOT EXISTS keyname_versions (
  entity_id         INTEGER NOT NULL REFERENCES entities(id),
  version           TEXT NOT NULL,
  key_code          INTEGER NOT NULL,       -- K_F1 etc, numeric value
  key_code_ident    TEXT NOT NULL,          -- "K_F1" symbolic form
  source_file       TEXT,
  source_line       INTEGER,
  source_column     INTEGER,
  raw_ast_hash      TEXT,
  extracted_at      TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS hud_element_versions (
  entity_id         INTEGER NOT NULL REFERENCES entities(id),
  version           TEXT NOT NULL,
  hud_alias         TEXT,                   -- HUD_Register arg 1 (alternate name)
  help_desc         TEXT,                   -- HUD_Register arg 2 (description string)
  flags_raw         TEXT,                   -- HUD_Register arg 3
  min_state         TEXT,                   -- HUD_Register arg 4
  draw_order_raw    TEXT,                   -- HUD_Register arg 5
  draw_fn           TEXT,                   -- HUD_Register arg 6 (resolved function name)
  source_file       TEXT,
  source_line       INTEGER,
  source_column     INTEGER,
  owned_cvars_json  TEXT,                   -- JSON array of synthesized hud_<name>_* cvar names
  raw_ast_hash      TEXT,
  extracted_at      TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS ruleset_versions (
  entity_id             INTEGER NOT NULL REFERENCES entities(id),
  version               TEXT NOT NULL,
  enum_ident            TEXT NOT NULL,          -- "rs_smackdown"
  loader_fn             TEXT,                   -- "Rulesets_Smackdown"
  maxfps                REAL,
  restrict_triggers     INTEGER,
  restrict_packet       INTEGER,
  restrict_particles    INTEGER,
  restrict_sound        INTEGER,
  restrict_logging      INTEGER,
  restrict_rollangle    INTEGER,
  restrict_ipc          INTEGER,
  restrict_exec         INTEGER,
  restrict_setcalc      INTEGER,
  restrict_seteval      INTEGER,
  restrict_setex        INTEGER,
  restrict_play         INTEGER,
  locked_cvars_json     TEXT,                   -- JSON [{name,value}, ...]
  source_file           TEXT,
  source_line           INTEGER,
  source_column         INTEGER,
  raw_ast_hash          TEXT,
  extracted_at          TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

CREATE TABLE IF NOT EXISTS token_primitive_versions (
  entity_id      INTEGER NOT NULL REFERENCES entities(id),
  version        TEXT NOT NULL,
  form           TEXT NOT NULL,         -- "$\\", "$:", "$G", ..., "$$", "$^", "$0"-"$9"
  byte_value     INTEGER,               -- the expanded byte (e.g. 0x0D for $\)
  category       TEXT,                  -- "separator" | "led" | "powerup_indicator" | "bracket" | "digit_font" | "literal_escape" | "other"
  help_desc      TEXT,                  -- hand-supplied in an enrichment pass if useful (later)
  source_file    TEXT,
  source_line    INTEGER,
  raw_ast_hash   TEXT,
  extracted_at   TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);
```

### Schema version bump logic

`schema.ts`:
- `SCHEMA_VERSION = 2`.
- `applySchema` runs the v2 SQL (new tables + replace the CHECK constraint on `entities.type`).
- Replacing a CHECK constraint requires table rebuild: `ALTER TABLE entities RENAME ...; CREATE TABLE entities ...; INSERT INTO entities SELECT ...;`. Wrap in a migration block `if (existingSchemaVersion === 1) { ... }` so existing databases upgrade cleanly.

---

## Task 1: Keyname extractor

**Intent:** full keyname table into `knowledge.db`.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-keynames-clang.py`.
- [ ] Parse the single `keyname_t keynames[] = { {"name", K_CODE}, ... };` array in `keys.c`. Reuse the array-init pattern already implemented in the cvar extractor (`_extract_cvar_array`).
- [ ] For each element: extract name (string literal), key_code_ident (DeclRefExpr to enum constant), resolve key_code numeric value (via the ENUM_CONSTANT_DECL's `.enum_value`).
- [ ] Output: `packages/qw-config/src/data/ezquake-keynames-ast.json` of shape `{ keynames: { "F1": { ast: {key_code: 282, key_code_ident: "K_F1", ...} }, ... } }`.
- [ ] Verify: expected ~200 entries. Spot-check `F1`, `MOUSE1`, `ENTER`, `SPACE`, `JOY_AXIS_X` (if present).

---

## Task 2: HUD element extractor

**Intent:** promote HUD elements from "implicitly referenced via synthesized cvars" to first-class entities with owned-cvars linkage.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-hud-elements-clang.py`.
- [ ] Walk `HUD_Register(...)` CALL_EXPRs across all `.c` files. Extract args per the signature:
  - arg 0: name (string literal)
  - arg 1: alias (string literal or NULL)
  - arg 2: description (string literal)
  - arg 3: flags (raw source token, e.g. `HUD_PLUSMINUS`)
  - arg 4: min_state (raw source token)
  - arg 5: draw_order (raw source token)
  - arg 6: draw function (DeclRefExpr to FUNCTION_DECL → resolve spelling)
  - args 7-15: the 9 default strings already captured in the cvar extractor's `_synthesize_hud_cvars`
  - args 16+: variadic custom-cvar pairs, NULL-terminated
- [ ] For each element, also emit the list of owned synthesized cvar names (`hud_<name>_order`, `_draw`, `_show`, etc., plus any custom pairs) into `owned_cvars_json`.
- [ ] Output: `packages/qw-config/src/data/ezquake-hud-elements-ast.json` of shape `{ hud_elements: { "fps": { ast: {...}, desc: "...", owned_cvars: [...] } } }`.
- [ ] Verify: expected ~60 entries. Spot-check `fps`, `clock`, `health`, `armor` (if registered as HUD elements), `radar`.

---

## Task 3: Ruleset extractor

**Intent:** full ruleset policy bundles into `knowledge.db`, one entity per ruleset with its policy flags and locked-cvar list.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-rulesets-clang.py`.
- [ ] Parse `rulesets.h` for the ruleset enum → list of `(enum_ident, public_name)` pairs (already known: `rs_default → "default"`, etc. — strip `rs_` prefix and lowercase).
- [ ] For each ruleset, locate the loader function `Rulesets_<PascalName>` in `rulesets.c`. Walk its body for:
  - `locked_cvar_t disabled_cvars[] = { {&cvar_ref, "value"}, ... };` array — resolve each `&cvar_ref` back to its cvar name via the cvar extractor's output (or re-parse the referenced cvar_t declaration).
  - Field assignments on `rulesetDef`: `rulesetDef.maxfps = 77;`, `rulesetDef.restrictTriggers = true;`, etc. Inside the `if (enable) { ... }` branch.
- [ ] Output: `packages/qw-config/src/data/ezquake-rulesets-ast.json` of shape `{ rulesets: { "smackdown": { ast: { enum_ident, loader_fn, maxfps, restrict_*, locked_cvars: [...] } } } }`.
- [ ] Verify: expected 6 entries. Spot-check `smackdown` (maxfps=77, restrictTriggers=true, allow_scripts locked to "0") against `rulesets.c:277-343`.

---

## Task 4: Token primitive extractor

**Intent:** the `$X` single-character primitives, AST-extracted from `teamplay.c`.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-token-primitives-clang.py`.
- [ ] Walk `TP_ParseMacroString` function body. Find the switch statement on `s[1]` (the character after `$`). Extract each `case 'X': c = 0xHH; break;` pair → `(form="$X", byte_value=0xHH)`.
- [ ] Also extract the digit branch at line 1728: `if (isdigit(s[1])) c = s[1] - '0' + 0x12;` → emit entries for `$0`…`$9` with computed byte values `0x12`..`0x1B`.
- [ ] Categorise via hard-coded lookup (since category is editorial, not source-derivable):
  - `$\`, `$:` → `separator`
  - `$[`, `$]` → `bracket`
  - `$G`, `$R`, `$Y`, `$B`, `$W` → `led`
  - `$(`, `$=`, `$)`, `$a` → `powerup_indicator`
  - `$0`–`$9` → `digit_font`
  - `$$`, `$^` → `literal_escape`
  - everything else → `other`
- [ ] Output: `packages/qw-config/src/data/ezquake-token-primitives-ast.json` of shape `{ token_primitives: { "$\\": { ast: {...}, byte_value: 13, category: "separator" } } }`.
- [ ] Verify: expected ~25 entries, all with `byte_value != null` and `category` set.

---

## Task 5: Schema migration v1 → v2

- [ ] Update `apps/qw-oracle/scripts/load-knowledge/schema.ts`:
  - `SCHEMA_VERSION = 2`.
  - Extend the `entities.type` CHECK constraint (requires table rebuild).
  - Add new per-type version tables.
  - Add a v1 → v2 migration block: `if (existingSchemaVersion === 1) { ALTER / migrate / update schema_meta; }`.
- [ ] `bunx tsc --noEmit` passes.
- [ ] Verify: existing `knowledge.db` with 3562 entities upgrades cleanly, all existing rows preserved, `schema_meta.schema_version = '2'`.

---

## Task 6: Loader support for 4 new types

- [ ] Extend `apps/qw-oracle/scripts/load-knowledge/types.ts` with per-type entry + row interfaces (parallel to the Phase 2c pattern).
- [ ] Add per-type upsert helpers in `natural-keys.ts`: `upsertKeynameVersion`, `upsertHudElementVersion`, `upsertRulesetVersion`, `upsertTokenPrimitiveVersion`.
- [ ] Create per-type adapter modules mirroring `load-cvars.ts` / `load-commands.ts`:
  - `load-knowledge/load-keynames.ts`
  - `load-knowledge/load-hud-elements.ts`
  - `load-knowledge/load-rulesets.ts`
  - `load-knowledge/load-token-primitives.ts`
- [ ] Register new adapters in `load-version.ts`'s `ADAPTERS` map.
- [ ] Widen name regex if needed (token primitive names are `$X` — include `$` in the allowed charset; HUD element names are lowercase identifiers; ruleset names are lowercase identifiers; keynames can contain digits and underscores).
- [ ] Update CLI usage text in `index.ts`.

---

## Task 7: End-to-end run + verification

- [ ] Run the 4 new extractors against ezQuake head.
- [ ] Load each via `npm run load-knowledge -- load-version --type <T> ...`.
- [ ] Verify counts:
  ```sql
  SELECT project, type, COUNT(*) FROM entities GROUP BY project, type;
  ```
  Expected totals at head:
  - ezquake / cvar: 2901
  - ezquake / command: 522
  - ezquake / macro: 68
  - ezquake / cmdline_param: 71
  - ezquake / keyname: ~200
  - ezquake / hud_element: ~60
  - ezquake / ruleset: 6
  - ezquake / token_primitive: ~25
  - **Total: ~3853 ezQuake entities**
- [ ] Spot-check via direct SQL:
  - `K_F1` keyname resolves with correct numeric code
  - `fps` HUD element resolves with draw_fn populated and non-empty owned_cvars_json
  - `smackdown` ruleset resolves with maxfps=77 and ≥5 locked cvars
  - `$\` token primitive resolves with byte_value=13 and category="separator"
- [ ] Update `e2e-verify.md` with the Phase 2c.5 section.

---

## Commit plan

Commit per task (7 commits total). Push main at the end.
