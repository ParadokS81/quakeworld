# Player State Simulator - Design Spec

**Date:** 2026-04-17
**Status:** Design approved, ready for planning phase.
**Related prior work:** `docs/superpowers/specs/2026-04-16-alias-chain-pretty-view-design.md` (integration contract, RuntimeResolver interface at section 3.5), `packages/qw-config/src/data/ezquake-macros.json` (runtime macro descriptions and related-cvars metadata), `src-tauri/src/commands/weapon_classifier.rs` (convention for QW-domain parsing, not modified).

---

## 1. Purpose

ConfigViewer users inspecting a teamsay-heavy config see `if/then/else` chains, runtime placeholders like `%health` and `%bestweapon`, and nested alias calls whose actual output depends entirely on game state. The existing Pretty view (separate parallel workstream) improves readability but cannot answer the user's real question: "given I'm at 30 HP with LG and quad, which teamsay do I actually send when I press this bind?"

This spec introduces a **Player State Simulator**: a `PlayerState` data model, a condition evaluator compatible with ezQuake's `if` command, and a `SimulatorResolver` that plugs into the Pretty view's `RuntimeResolver` contract. Users toggle simulated health, weapons, powerups, location, and match state in a right-side editor panel; the ConfigViewer resolves `%tokens` to real values and walks `if/then/else` chains to show which branch fires for the current state. An issue-flagging trace surfaces broken links in the user's alias chains (unresolved variables, missing alias targets, unsupported constructs) so the panel doubles as a sanity check on the user's own config.

The simulator is self-contained. It does not modify the Pretty view's tokenizer, span tree, or any existing ConfigViewer component. It integrates only through the `RuntimeResolver` interface and lands on `main` ready to slot in when the Pretty view's `runtimeResolver.ts` file exists.

## 2. Goals and non-goals

**Goals:**

- Provide a typed `PlayerState` that exhaustively covers engine-originated runtime tokens referenced by real teamsay configs.
- Expose a `RuntimeResolver` implementation (`createSimulatorResolver`) that the Pretty view can inject when its mode toggle is set to "Simulator".
- Evaluate ezQuake `if` conditions using the same grammar as `Cmd_If_Old` and `Cmd_If_New` (see section 5.1), so simulator output matches engine behavior within the supported operator subset.
- Walk nested `if/then/else` chains against a PlayerState and return both the flat output the game would emit and a per-step trace for UI inspection and testing.
- Surface issues in the user's config (unresolved variables, missing alias targets, unsupported regex, cyclic aliases) without crashing the walker.
- Compute derived tokens (`$bestweapon`, `$weapons`, `$powerups`, `$armortype`, `$colored_armor`, ...) from raw PlayerState + the user's cvars, using the same rules ezQuake uses.
- Ship a text-based state editor panel in the ConfigViewer's right-side slot behind a `Keyboard | State` toggle. Persist the working copy across sessions. Support named snapshot templates with save/load/delete.
- Cover the evaluator with unit tests plus fixture-driven flip-case tests against `bps.cfg`, `hangtime.cfg`, and `locktar.cfg`.

**Non-goals:**

- No modifications to `AliasChainResolver.tsx`, `ConfigViewer`, or any existing ConfigViewer component. (Integration of the mode toggle is a separate follow-up session, scoped to the Pretty view workstream.)
- No Pretty view rendering. This workstream is fully decoupled.
- No outcome enumerator. Enumerating "all possible chat lines this bind can emit" is a future layer on top of both the simulator and the Pretty view.
- No regex condition support (`=~`, `!~`). Flagged as "not simulated" when encountered. Fixtures do not use regex inside `if`.
- No simulation of side effects (`set`, `set_tp`, `inc`, `wait`, `alias` redefinitions). These are skipped with a trace note; the simulator is a query, not a mini ezQuake.
- No typo suggestions or fuzzy-match hints on unresolved identifiers. Flag what is unresolved; reader infers intent.
- No automated UI snapshot tests. Manual verification per this repo's testing philosophy.
- No preset library, tagging, or template import/export beyond local save/load/delete in v1.

## 3. Architecture

Five pure-data / pure-function modules plus one UI component and two store edits. All TypeScript, all in the frontend (Tauri webview). No Rust-side counterpart.

Rationale for TS-only: the app is Tauri v2. Every ConfigViewer component and its supporting library (`configMerger.ts`, `AliasChainResolver.tsx`, the Pretty view's span-tree builder) already lives in TS. IPC overhead for state-slider interactions would strictly worsen UX, and the evaluator's workload is microseconds per condition. Rust port is a future option if profiling or a cross-consumer need ever appears.

The five core pieces:

1. **PlayerState (`types.ts`, `defaults.ts`)** - data shape covering 27 raw fields (vitals, weapons owned, ammo, powerups, location, match context, LEDs, recent events) plus ~12 derived-only tokens. Defaults describe a fresh spawn on an unknown map with no pickup history.

2. **Derivations (`derivations.ts`)** - pure functions that compute `$bestweapon`, `$weapons`, `$powerups`, `$armortype`, `$colored_armor`, `$tp_powerups`, `$weaponnum`, `$ammo`, `$bestammo` from raw PlayerState + the user's cvar map.

3. **Expander (`expander.ts`)** - substitutes `$var` references in any string with their resolved value (recursive, depth-capped at 8, matches `AliasChainResolver`'s cap). Resolves `$qt` to `"`, handles positional args `%1`/`%2` when present, collects issues for unresolved references.

4. **Evaluator (`evaluator.ts`)** - tokenizer + recursive-descent parser + evaluator for ezQuake's `if` expression grammar (see section 5). Dispatches old-form vs new-form condition by detecting whether the first argument starts with `(`, matching `Cmd_If_f` at `cmd.c:2237-2244`.

5. **Resolver (`resolver.ts`)** - three public entry points:
   - `createSimulatorResolver(state, cvars)` returns a `RuntimeResolver`-shaped object per Pretty view spec section 3.5. Each `resolve(token)` call returns `{ display, tooltip, origin: "runtime" }` with the live value for engine tokens, using derivations for derived tokens.
   - `evaluateCondition(conditionText, state, cvars)` returns `{ result: boolean, issues: Issue[] }`. Runs expand -> parse -> eval.
   - `evaluateTeamsay(rawText, state, cvars)` is the top-level entry point. Walks `if/then/else` chains in the text, returns `{ output: string, trace: TraceStep[], issues: Issue[] }`.

Plus:

6. **StatePanel component (`src/components/StatePanel.tsx`)** - SolidJS component that reads and writes PlayerState via a global signal, grouped by the PlayerState sections. See section 6.

7. **Store edits (`src/store.ts`, `src/types.ts`)** - `ProfilePrefs` gains a `simulator` block (see section 7 for persistence shape).

The simulator module has no imports from or into any existing slipgate-app component. Its sole integration surface is the `RuntimeResolver` interface the Pretty view defines. Until the Pretty view's `runtimeResolver.ts` exists on main, the simulator is reachable only from the StatePanel (which uses it internally for derived-value readouts) and from its test suite.

## 4. PlayerState shape

Raw fields (user toggles in the panel) and derived tokens (computed, never user-set), grouped by panel section.

### 4.1 Raw fields

**Vitals**
- `health: number` - integer 0-250. Default 100.
- `armor: number` - integer 0-200. Default 0.
- `armorClass: "ga" | "ya" | "ra" | "none"` - default `none`.

**Weapons**
- `ownedWeapons: Set<Weapon>` - any subset of `axe | sg | ssg | ng | sng | gl | rl | lg`. Default `{axe, sg}` (spawn equipment).
- `currentWeapon: Weapon` - default `sg`.

**Ammo**
- `shells: number`, `nails: number`, `rockets: number`, `cells: number` - integers, default 0.

**Powerups**
- `activePowerups: Set<Powerup>` - any subset of `quad | pent | ring | biosuit`. Default empty.
- `powerupTimers: Partial<Record<Powerup, number>>` - optional remaining seconds. Default empty.

**Location and map**
- `location: string` - free-form location token (e.g. `ra`, `quad`, `water`). Default `""`.
- `mapname: string` - e.g. `dm3`, `aerowalk`. Default `""`.
- `lastloc: string` - default `""`.
- `deathloc: string` - default `""`.

**Match context**
- `matchname: string` - default `""`.
- `matchstatus: "standby" | "countdown" | "live" | "overtime" | "ended"` - default `live`.
- `matchtype: string` - e.g. `1on1`, `2on2`, `4on4`, `ffa`. Default `""`.

**LEDs and pointing**
- `ledpoint: "none" | "green" | "red" | "yellow"` - default `none`.
- `ledstatus: "none" | "green" | "red" | "yellow"` - default `none`.
- `point: string` - player name token. Default `""`.
- `pointloc: string`, `pointatloc: string` - default `""`.

**Recent events**
- `took: string` - item name token. Default `""`.
- `tookloc: string`, `tookatloc: string` - default `""`.
- `droploc: string` - default `""`.
- `droptime: number` - seconds since last drop. Default 0.
- `lastpowerup: string` - default `""`.

### 4.2 Derived tokens

Computed from raw fields and the user's cvar map. Never user-set.

- `$weapons` - space-joined `tp_name_*` tokens for each owned weapon, e.g. `"sg ssg rl lg"` using the user's values of `tp_name_sg`/`_ssg`/`_rl`/`_lg`.
- `$bestweapon` - ezQuake's algorithm: walk `tp_weapon_order` tokens (impulse digits in priority order), return the first that is owned AND has ammo. Fall back to `tp_name_sg` default if none qualify. Resolves to a `tp_name_*` string.
- `$weaponnum` - impulse number 1-8 for `currentWeapon`.
- `$ammo` - ammo count for the ammo type of `currentWeapon`.
- `$bestammo` - ammo count for the ammo type of `$bestweapon`.
- `$armortype` - `tp_name_armortype_ga` / `_ya` / `_ra` / `_none` per `armorClass`.
- `$colored_armor` - `$armor` value wrapped in `&cRGB...&r` per the health-band rules ezQuake bakes in (red under 25, yellow 25-50, green 50-100, white above 100).
- `$powerups` - space-joined `tp_name_quad` / `tp_name_pent` / `tp_name_ring` per `activePowerups`.
- `$tp_powerups` - routes to `$colored_powerups` or `$colored_short_powerups` based on `tp_poweruptextstyle`.
- `$colored_powerups`, `$colored_short_powerups` - powerups list with per-powerup color codes.

### 4.3 Explicitly excluded

These tokens look like state but belong elsewhere:

- `$need`, `$mytook`, `$mytookloc`, `$lasttook`, `$tvs_*`, `$h_*`, `$_report_*` - written by the user's own aliases via `set_tp` / `set`. Resolved from the cvar map, not PlayerState.
- `$ping`, `$latency`, `$demotime`, `$cam_pos_*`, `$cam_angles_*`, `$lastip`, `$serverip`, `$triggermatch`, `$team1` / `$team2`, `$tf_skin` - teamplay-restricted per `ezquake-macros.json` and not referenced in teamsay conditions in practice.
- `$time`, `$date`, `$dateiso`, `$timestamp` - clock/calendar values. Not meaningful for state simulation.

## 5. Condition evaluator

### 5.1 Grammar (ground truth)

Authoritative grammar from `QW-Group/ezquake-source/src/cmd.c` and `src/parser.h`:

- `Cmd_If_f` at `cmd.c:2237` dispatches to `Cmd_If_New` when `Cmd_Argv(1)` starts with `(`, otherwise to `Cmd_If_Old`.
- **Old form** (`Cmd_If_Old` at `cmd.c:2138`): `if <e1> <op> <e2> [then] <cmd> [else <cmd>]`. One binary comparison only, no boolean chaining. Operators: `==`, `=`, `!=`, `<>`, `<`, `<=`, `>`, `>=`, `isin`, `!isin`, `=~`, `!~`. Numeric comparison when both operands parse as numbers (`is_numeric` + `Q_atof`), else string comparison via `strcmp`. `then` is optional but recognized and skipped.
- **New form** (`Cmd_If_New` at `cmd.c:2039`): `if (<expr>) then <cmd> [else <cmd>]`. Expression passed to `Expr_Eval_Bool`. Grammar per `parser.h:18-37`:
  - Parens `(`, `)`
  - Arithmetic binary: `+`, `-`, `*`, `/` (plus `+` for string concat)
  - Comparison: `<`, `<=`, `=`, `==`, `!=`, `<>`, `>=`, `>`, `=~`, `!~`, `isin`, `!isin`
  - Logical: `and` / `AND` / `&&`, `or` / `OR` / `||`
  - Unary: `-`
  - Types: double, integer, bool, string (quoted with `"..."` or `'...'`, or bare tokens delimited by whitespace)
  - Variables: optionally preceded with `%` (but `var2val_fnc` is NULL in `Cmd_If_New` at `cmd.c:2056` - the parser does not resolve variables itself).

Critical consequence: `$var` references in conditions are resolved by ezQuake's command-buffer macro expander BEFORE the condition string reaches the expression parser. So `if ($bestweapon isin '$tp_name_lg $tp_name_rl') then ...` becomes something like `if (lg isin 'lg rl') then ...` by the time `Expr_Eval` runs. This drives the simulator's two-stage pipeline.

### 5.2 Pipeline

Two stages, in order:

1. **Expand** (`expander.ts`) - walk the condition string, substitute every `$name` token. Resolution order: PlayerState derivations -> PlayerState raw fields -> cvar map. Recursive: if a cvar value contains more `$var` references, re-expand. Depth cap 8. `$qt` resolves to `"`. Positional args `%1`/`%2` substitute from call-site args if the condition is inside an alias body being invoked with arguments. Unresolved references surface as issues with the raw token preserved.

2. **Evaluate** (`evaluator.ts`) - parse the expanded string using ezQuake's grammar. Precedence standard C-like: parens > unary > `*`/`/` > `+`/`-` > comparison and `isin` > `&&`/`and` > `||`/`or`. Short-circuit `&&` and `||`. Old-form vs new-form detected by the leading-`(` rule. Regex operators (`=~`, `!~`) return a `{ kind: "unsupported-regex" }` issue without crashing; the branch walker treats the result as "cannot determine" (see 5.4).

### 5.3 Top-level walker: `evaluateTeamsay`

Given a raw teamsay body (typically the fully-resolved press or release body of a bind's alias chain), the walker:

1. Scans the body for the pattern `if <cond...> then <then-body> [else <else-body>]`. Recognizes both old-form and new-form. Nested `if` inside then/else bodies (extremely common in fixtures, see `hangtime.cfg:3030 __kill_me`) is handled by recursion.
2. Evaluates the condition via `evaluateCondition`.
3. Picks the active branch. Recurses into its body if it contains further control flow.
4. Appends the active branch's terminal text to the accumulated output.
5. Records each decision as a `TraceStep`.

For alias references inside branches (e.g. `then _report2` where `_report2` is another alias), the walker recurses into that alias's body from the cvar map. Depth cap 8 matches the expander's.

Return value: `{ output: string, trace: TraceStep[], issues: Issue[] }`.

```ts
interface TraceStep {
  kind: "condition" | "alias-follow" | "skip-side-effect" | "leaf";
  text: string;              // the raw text of this step (the condition, alias name, or leaf output)
  detail?: string;           // additional context (expanded condition, alias body, side-effect command)
  result?: boolean;          // for "condition" steps, the evaluated result
  activeBranch?: "then" | "else";  // for "condition" steps
  issues?: Issue[];          // issues encountered at this step
}

interface Issue {
  kind:
    | "unresolved-var"
    | "missing-alias"
    | "malformed-condition"
    | "unknown-operator"
    | "unsupported-regex"
    | "depth-cap-reached"
    | "side-effect-skipped";
  detail: string;            // human-readable, includes raw token/name
  location?: string;         // alias name or line context
}
```

### 5.4 Error and issue handling

The walker never throws. Every failure mode produces an issue and a safe fallthrough:

- **Unresolved `$var`** - expander collects the issue, substitutes with the literal raw token (preserving the `$`). Evaluator may then compare against a weird token; the condition result is usually false. Issue surfaces so the user sees the cause.
- **Missing alias target** - walker tries to recurse into `_foo` but `aliases["_foo"]` is undefined. Emits `missing-alias` issue at the trace step. No recursion.
- **Malformed condition** (missing `then`, truncated expression, mismatched parens) - parser emits `malformed-condition` issue, the walker treats the whole `if` as "cannot determine", proceeds past it without emitting output from either branch.
- **Unknown operator** - parser emits `unknown-operator` issue, same treatment as malformed.
- **Regex** (`=~`, `!~`) - `unsupported-regex` issue, treated as "cannot determine".
- **Depth cap** - walker hits 8 levels of recursion, emits `depth-cap-reached` issue once, stops. Prevents cyclic-alias stack overflow.
- **Side-effect commands** (`set`, `set_tp`, `inc`, `wait`, `alias`, `bind`) - walker emits `side-effect-skipped` informational trace step (not a warning) and proceeds. Not treated as an error.

Empty then-branches (a legitimate ezQuake idiom, e.g. `if X then else _bar`) are not treated as issues; they are a valid no-op.

## 6. State editor panel (UX)

### 6.1 Placement and toggle

Right-side panel in the ConfigViewer. A new segmented control `Keyboard | State` at the top of the panel swaps the rendered body. Default: Keyboard. Toggling to State hides the keyboard and shows the editor.

The toggle state itself is session-local (does not persist in `ProfilePrefs`). It does not collide with the existing "Hide keyboard" viewer option, which governs the full-keyboard tab elsewhere.

### 6.2 Panel header

One row above the sections:

```
[ Templates v ] [ Save as... ] [ Reset ]
```

- **Templates dropdown** - lists saved template names, last-used first. Disabled when no templates exist. Selecting a name loads its snapshot into the working copy (overwrites silently; user who cares about unsaved working-copy state saves first). Each entry has an `x` delete affordance, with a small "Delete X?" inline confirm (no modal).
- **Save as...** - prompt for a name (inline input, not modal). Stores the current working copy as a named snapshot. If the name already exists, overwrites silently.
- **Reset** - working copy back to spawn defaults. Does not touch saved templates.

No rename in v1. To rename, save-as with a new name, then delete the old.

### 6.3 Section layout

One vertically scrollable column. Sections in PlayerState's order (Vitals, Weapons, Ammo, Powerups, Location and map, Match, LEDs and pointing, Recent events). Each section is a collapsible block, expanded by default.

Per section, three stacked row groups:

1. **Raw inputs** - native HTML controls mapped from types:
   - Integers: `<input type="number">` with `min` and `max` matching the field range.
   - Enums: `<select>` dropdown.
   - Sets (owned weapons, active powerups): checkbox row, one box per member.
   - Strings: `<input type="text">`.

2. **Derived values** - read-only, auto-updating, monospace. Dim styling to read as "computed." One row per derived token:
   ```
   $weapons     "sg ssg rl lg"
   $bestweapon  "{&c2aalg&cfff}"
   $weaponnum   8
   ```

3. **Influencing cvars** - two-column table (default value | your-config value). Rows sourced from the `related-cvars` list in `ezquake-macros.json` for each derived token. Rows where your-config matches default are dimmed; divergent rows are bright. Pattern matches the existing macro-dependencies block in `AliasChainResolver.tsx`.

### 6.4 Styling

DaisyUI semantic classes per this app's CLAUDE.md no-hardcoded-colors rule. OKLCH tokens for any custom styling. New CSS classes live alongside the existing `sg-*` blocks.

## 7. Persistence

### 7.1 Shape

`ProfilePrefs` gains:

```ts
simulator: {
  version: 1;
  currentState: PlayerState;
  templates: Array<{
    id: string;           // stable opaque id (uuid-like)
    name: string;         // user-chosen
    createdAt: number;    // ms since epoch, drives last-used-first ordering
    state: PlayerState;
  }>;
}
```

### 7.2 Rules

- `currentState` writes debounced (e.g. 300 ms) on every change from the panel.
- `currentState` reads on store hydration; if absent, defaults to spawn defaults.
- Templates list writes immediately on Save-as / Delete.
- Migration: when PlayerState shape changes in a future version, bump `version`. Migration routine fills missing fields with defaults, drops removed fields. Follows the same pattern the Pretty view spec uses for its `alias_chain_mode` field.

### 7.3 Template operations

- **Save as "X"** - takes a deep copy of `currentState`, generates an id, appends to `templates`. If "X" already exists, replaces the existing entry silently (preserves id so any future references remain stable).
- **Load "X"** - deep-copies `templates[id].state` into `currentState`. Updates template's `createdAt` on load to drive last-used-first ordering (or a separate `lastUsedAt` field - implementation decision during planning).
- **Delete "X"** - removes the entry. No undo.
- **Reset** - `currentState` replaced with spawn defaults. Does not touch templates.

## 8. Integration contract

Pretty view spec section 3.5 defines the `RuntimeResolver` interface:

```ts
interface RuntimeResolver {
  resolve(token: string): RuntimeResolution | null;
}

interface RuntimeResolution {
  display: string;
  tooltip: string;
  origin: "runtime";
  active?: boolean;
}
```

This module's `createSimulatorResolver(state, cvars)` returns an object matching this shape. For each known token it produces the current value from PlayerState or a derivation; tooltip describes the source (e.g. `"engine state: health = 87"` or `"derived: tp_weapon_order + owned weapons + ammo"`). Returns `null` for unknown tokens, which the Pretty view renders as `unresolved`.

When the Pretty view's `src/lib/runtimeResolver.ts` file exists on main, its author imports `createSimulatorResolver` from `@/lib/simulator` and wires the `Label | Simulator` mode toggle. The pretty-render tokenizer does not change. The span tree does not change.

If the simulator needs a shape addition during implementation (e.g. carrying active-branch metadata on the resolver return, though this is not currently expected), the interface is still flexible since the Pretty view's runtime-resolver consumer has not yet shipped. Raise such needs during the implementation plan review.

The simulator does not depend on any Pretty view file. It can be developed, tested, and merged to main before the Pretty view's runtime-resolver file exists.

## 9. Testing

Four layers, per this repo's testing philosophy (compile and build first, manual verification second, automated tests for the core algorithm).

### 9.1 Unit tests (`bun test`)

- **Expander** - happy path for PlayerState tokens; recursive cvar expansion; `$qt` -> `"`; depth-cap halts cycles; unresolved `$xxxx` surfaces issue with raw token preserved; positional args `%1`/`%2`.
- **Evaluator** - every operator from section 5.1; numeric vs string coercion rule (`"5" == 5` true, `"5" == "5a"` false); precedence (`a and b or c` -> `(a and b) or c`); short-circuit; parens override; unknown operator -> issue; regex -> `unsupported-regex` issue.
- **Derivations** - `$bestweapon` table against multiple (owned, ammo, `tp_weapon_order`) combos including the engine-default order `"8 7 5 3 4 6 2 1"`; `$weapons` and `$powerups` joining; `$armortype` selection; `$colored_armor` threshold bands.

### 9.2 Fixture flip-case tests

For each of `bps.cfg`, `hangtime.cfg`, `locktar.cfg`:
- Parse via `qw-config`'s existing config parser.
- Select a concrete set of `if`-containing aliases (minimum 6-8 per fixture, ~20 total flip-cases).
- For each alias and state combo, assert both the flat output and the key trace-step results.

Confirmed starter flip-cases:
- `locktar.cfg:2332 _report` - `health < 1` flip.
- `locktar.cfg:2334 _report2` - `bestweapon isin tp_name_sg|tp_name_ng` and `tp_name_lg isin weapons` flips.
- `hangtime.cfg:2998 __check_armor` - nested AND on bestweapon + need (need comes from cvar map, not PlayerState).
- `hangtime.cfg:3030 __kill_me` - three-way nested if on bestweapon + cells.
- Plus additional picks from each fixture to reach the ~20 target during implementation.

### 9.3 Issue-flagging tests

Synthetic mini-configs that assert each issue kind:
- Unresolved `$var`
- Missing alias target in a branch
- Malformed condition (missing `then`, truncated expression)
- Unknown operator
- Regex condition
- Cyclic alias (`alias a b; alias b a`) hits depth cap

### 9.4 Manual verification

- `bunx tsc --noEmit` green.
- Launch in Windows, toggle to State panel, flip weapon checkboxes, verify `$bestweapon` updates live.
- Open a teamsay-heavy config in ConfigViewer. Next to a bind with conditional output, display `evaluateTeamsay` result in a temporary debug strip (removable once Pretty view integration lands).

## 10. Performance

Not a concern at v1 scale. Bind bodies are under a kilobyte, condition depth is under 10, alias chains cap at 8. A full `evaluateTeamsay` walk is tens of microseconds. A state-slider change may trigger re-evaluation of every visible bind's teamsay output; at ~50 binds per config this is still well under a millisecond. No memoization needed in v1. Profile and add if the ConfigViewer grows to thousands of visible simulated binds simultaneously.

## 11. File layout

New files:

- `apps/slipgate-app/src/lib/simulator/types.ts`
- `apps/slipgate-app/src/lib/simulator/defaults.ts`
- `apps/slipgate-app/src/lib/simulator/derivations.ts`
- `apps/slipgate-app/src/lib/simulator/expander.ts`
- `apps/slipgate-app/src/lib/simulator/evaluator.ts`
- `apps/slipgate-app/src/lib/simulator/resolver.ts`
- `apps/slipgate-app/src/lib/simulator/index.ts`
- `apps/slipgate-app/src/lib/simulator/expander.test.ts`
- `apps/slipgate-app/src/lib/simulator/evaluator.test.ts`
- `apps/slipgate-app/src/lib/simulator/derivations.test.ts`
- `apps/slipgate-app/src/lib/simulator/fixtures.test.ts`
- `apps/slipgate-app/src/lib/simulator/issues.test.ts`
- `apps/slipgate-app/src/components/StatePanel.tsx`

Edits (minimal, bounded):

- `apps/slipgate-app/src/store.ts` - add `simulator` block to `ProfilePrefs` with migration.
- `apps/slipgate-app/src/types.ts` - extend `ProfilePrefs` type.
- Existing right-side panel component (exact path pinned during planning) - add `Keyboard | State` toggle and render `StatePanel` when toggled to State.

Not touched:

- `src/components/AliasChainResolver.tsx`
- Any `src/components/Config*` file beyond the right-panel toggle wiring
- `src-tauri/` (no Rust changes)
- `packages/qw-config/` (read-only consumption of `ezquake-macros.json`)

## 12. Iteration tiers

Single-tier ship. All of sections 3-9 ship together in v1. Rationale: the simulator's value is end-to-end. Shipping just the evaluator without the panel gives the user nothing to interact with; shipping just the panel without the evaluator is a fancy checkbox grid. The tier split in the Pretty view spec exists because its tiers have independent visual value; this workstream does not.

A future v2 session adds:
- Visual polish of the State panel per user's sketch (avatar figure, weapon circles, powerup stack, color-coded HP, timer rings).
- Preset templates / preset library if save-your-own-templates usage patterns reveal what presets should contain.
- Mode toggle (`Label | Simulator`) integration on the Pretty view side - executed in the Pretty view workstream when both this spec and the Pretty view's tier 2 have landed.

## 13. Future directions

- **Outcome enumeration** - given a bind body and a set of PlayerStates to iterate over, emit every possible chat line the bind can produce and the conditions that produce each. Shares the evaluator from this spec.
- **Time-advancing simulation** - drop a simulated clock and resolve `$droptime`, powerup timers, and `$time` dynamically. Probably unnecessary; current pickup-timer values in state are sufficient for the teamsay use case.
- **Side-effect simulation** - actually run `set_tp` to track `$need` / `$took` cvar mutations. Would let the simulator walk chains that depend on a config's own state. Nontrivial (order-of-evaluation matters, `wait` semantics differ under script execution). Out of scope for v1 and likely v2.
- **Rust port** - if the simulator ever becomes a Rust-side consumer's dependency (e.g. a future Rust-side outcome enumerator), port the grammar to a Rust module and expose via Tauri command. Not needed in the TS-only architecture v1 ships.

## 14. Open questions

- Some fixtures use `%1` / `%2` positional args inside conditions (e.g. `hangtime.cfg:2988 __alive`). The expander needs a call-site arg context. During planning, confirm how `evaluateTeamsay` receives positional args - either as an optional parameter on the public API, or inferred from the walker's alias-invocation trace step. Implementation-detail, not a design-blocker.
- `tp_weapon_order` default value and exact format: sourced from ezQuake defaults (`"8 7 6 5 3 4 2"` or similar). Confirm the exact default-list tokenization during implementation by checking `tp_weapon_order`'s definition in `ezquake-source`.
- `$colored_armor` threshold bands: ezQuake's thresholds (25, 50, 100) are documented behavior but the exact color codes used (`&cf00` red, `&cff0` yellow, etc.) should be verified against `ezquake-source` during derivation implementation to match the runtime exactly.
- Storage and migration of the `simulator` block in `ProfilePrefs`: follow the existing Pretty view migration pattern; resolve any specifics during planning once the `ProfilePrefs` shape is walked end-to-end.
