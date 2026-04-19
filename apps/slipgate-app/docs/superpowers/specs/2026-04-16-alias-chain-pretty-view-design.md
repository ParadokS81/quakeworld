# Alias Chain Pretty View - Design Spec

**Date:** 2026-04-16
**Status:** Design approved, ready for planning phase.
**Related prior work:** `HANDOVER.md` item "Alias chain pretty view" (the trigger), `apps/slipgate-app/src/components/AliasChainResolver.tsx` (today's raw renderer + macroRefs extraction), `apps/slipgate-app/src-tauri/src/commands/ezquake.rs:419-605` (existing QW name expander), `packages/qw-config/src/data/ezquake-macros.json` (runtime macro descriptions).

---

## 1. Purpose

The ConfigViewer's alias chain expansion today renders raw ezQuake config text. For teamsay-heavy configs this produces a wall of code that mixes color codes (`&cf13`, `&r`), brace scopes (`{...}`), variable refs (`$tp_name_rl`), runtime tokens (`%a`, `%h`, `%l`), special char codes (`$]`, `$,`), and `if/then/else` branching. The signal-to-noise ratio for a non-coder inspecting their own or a teammate's teamsay setup is very low.

This spec introduces a **Pretty view** rendering mode for expanded alias chains. Pretty mode parses each teamsay-shaped string into a structured span tree, resolves what can be resolved statically, labels what resolves at runtime, and renders with faithful chat-style colors plus hover affordances that reveal the raw source. A per-row toggle lets users flip back to Raw (today's behavior) for any chain; a global default sets which mode new expansions open in.

This work is also the foundation for a future teamsay/config creator: the same span tree IR that powers pretty rendering becomes the document model for a rich-text editor that can emit valid ezQuake cfg syntax.

## 2. Goals and non-goals

**Goals:**

- Render color codes (`&cRGB` / `&r`) and brace scopes (`{...}`) as actual colored text using the same approach as hub.quakeworld.nu scoreboards - real characters with CSS color classes and inline hex color spans.
- Substitute `$variable` references inline with their resolved value from the current config's cvars, recursing through nested variables so colors defined in `$tp_name_rl` render correctly when embedded in a say_team body.
- Label runtime `%` tokens (`%a`, `%h`, `%location`, `%bestweapon`, ...) with human-readable placeholders pulled from `ezquake-macros.json`.
- Render `$X` single-char codes (`$.`, `$]`, `$,`, LEDs, digits) as the correct glyph in the correct QW color class using the existing byte-to-char logic from `ezquake.rs`.
- Provide a per-row Pretty/Raw toggle plus a persisted global default.
- Hover on any resolved / labeled span reveals the raw source, origin, and description (for cvars and runtime tokens).
- Keep Raw mode byte-for-byte identical to today's output.
- Build on a span tree IR that later tiers (runtime labels, conditional collapsing, outcome enumeration, creator) can extend without reparsing.

**Non-goals:**

- No editing. Pretty view is read-only.
- No conditional-path outcome enumeration (parked under Future directions).
- No creator UI (parked).
- No rendering changes to Raw mode.
- No changes to the alias chain discovery logic in `resolveAliasChain()` - this spec adds a render layer on top, it does not touch chain traversal.
- No cross-config diff of pretty-rendered output beyond what the existing side-by-side compare already does.
- No persistence of per-row toggle overrides. Global default persists in `ProfilePrefs`; per-row state is transient within the session.
- No SVG sprite sheet for true pixel-perfect conchars. Unicode + CSS color classes is the target fidelity.

## 3. Resolution model

### 3.1 Span tree IR

Every pretty-rendered string becomes a flat sequence of styled spans. Each span carries:

```ts
interface PrettySpan {
  text: string;               // rendered text for this span
  color: SpanColor;           // resolved color frame
  origin: SpanOrigin;         // drives visual treatment + hover
  rawToken?: string;          // the source slice, for hover tooltip
  tooltip?: string;           // human description (macros, cvars)
}

type SpanColor =
  | { kind: "qw"; class: "qw-w" | "qw-g" | "qw-b" }  // native QW color classes
  | { kind: "hex"; value: string }                   // "#ff1133" from &cRGB
  | { kind: "default" };                             // say_team default (brown/tan)

type SpanOrigin =
  | "literal"      // plain text typed in the config
  | "variable"     // $var substituted inline
  | "runtime"      // %token labeled placeholder
  | "charcode"     // $] $, $. etc rendered as glyph
  | "unresolved";  // $unknown / %unknown / malformed
```

The span tree is the shared IR. Pretty mode renders it with full visual treatment; future tiers add new origins and render rules without modifying the tokenizer.

For `if/then/else` branches we wrap the two arms as sibling spans under a `conditional` group marker (tier 3 makes this a first-class origin; tier 1 keeps the branches rendered as linear siblings with the keyword as `literal`).

### 3.2 Color stack semantics

The color model is a stack of frames. Each frame has a `default` color and a `current` color:

- **Initial frame:** `default = brown/tan` (say_team default), `current = default`.
- **`{`** - push a new frame with `default = qw-w` (white), `current = default`. Text inside braces is white unless overridden.
- **`}`** - pop the current frame, restoring the parent's `current`.
- **`&cRGB`** - set the current frame's `current` to the parsed hex color (12-bit nibble-doubled to 24-bit: `&cf13` -> `#ff1133`).
- **`&r`** - reset the current frame's `current` to its `default`.

Outside any brace, `&r` resets to brown/tan. Inside `{...}`, `&r` resets to white. This matches observed behavior in fixture configs.

Braces are NOT literal - they render nothing, only affect the color stack.

### 3.3 Builder stages

The span tree builder runs four nested passes over the input string:

1. **Scope/color state machine.** Walks the string once, maintains the color stack, emits colored text ranges. Brace pairs consumed (produce no output). `&cRGB` and `&r` tokens consumed (update stack, produce no output).

2. **`$variable` substitution.** Delegated to the shipped simulator module. Each emitted range is passed through `expandVars(text, state, cvars, args)` from `@/lib/simulator` (see `src/lib/simulator/expander.js`). The simulator handles resolution priority (derived tokens > raw state fields > cvars), `$qt` -> `"` escape, `%1`..`%9` positional args, recursion with depth cap 8, and emits `Issue` records for unresolved refs. Nested colors in substituted values flow back through stage 1 on the next recursion pass so they render correctly. Pretty view walks the input token-by-token and correlates each `$(\w+)` match to its simulator resolution so it can tag the resulting span with `origin: variable` (or `unresolved` when `expandVars` leaves the ref literal). In Label mode, `state` is `createDefaultPlayerState()`; in Simulator mode, it is the live `PlayerState` signal from the store.

3. **`%runtime` token resolution.** Scans each range for `%(\w+)` patterns. Each match is passed to a `RuntimeResolver` (see 3.5 below) which returns `{ display, tooltip, origin }`. If the resolver returns `null` (token unknown), the span is emitted as `unresolved`.

4. **`$X` char-code expansion.** Any remaining `$X` sequences (not caught by stage 2 because `X` is a single non-word char like `]`, `,`, `.`, `<`, `>`) are expanded via the single-char dollar code table ported from `ezquake.rs:432-467` (`expand_dollar_code`). Output is a glyph + QW color class via `qw_byte_to_char` + `qw_byte_color` (also ported).

Stages 2-4 operate on each output span from stage 1 independently, preserving the stage-1 color state.

### 3.5 RuntimeResolver interface

Stage 3 delegates `%token` resolution to a pluggable resolver. This is the extension point that lets a future player-state simulator produce real values without changes to the pretty-view internals.

```ts
interface RuntimeResolver {
  resolve(token: string): RuntimeResolution | null;
}

interface RuntimeResolution {
  display: string;     // what pretty view renders in the span
  tooltip: string;     // what hover shows
  origin: "runtime";   // pretty view's origin tag for the span
  active?: boolean;    // reserved: simulator sets true if this token contributes to an active branch
}
```

Two implementations coexist in tier 2:

- **`LabelResolver`** (authored here) - maps each known token to its human label (`%a` -> `armor`) with a short description as the tooltip. Static, state-independent, the default mode.
- **`SimulatorResolver`** (imported from `@/lib/simulator` via `createSimulatorResolver(state, cvars)`) - returns the live value for each token given the current `PlayerState`. Already shipped and matches this interface exactly. Pretty view consumes it as-is, no adaptation.

A `Label | Simulator` mode toggle in the pretty-view header swaps which resolver is injected. Nothing in the tokenizer or span tree changes. The mode toggle is independent of the right-rail `Keyboard | State` toggle (a user may inspect state without switching pretty to Simulator, or vice versa).

### 3.6 Parser location

Parser lives in the TS frontend (`src/lib/prettyRender.ts` or similar; final filenames resolved during planning). Rationale:

- Hot-reload iteration during development.
- Strings are short; re-parse on toggle is cheap.
- Rust port available later if profiling shows it matters.
- Keeps the Rust side of the config pipeline focused on extraction, not rendering.

The existing Rust expander in `ezquake.rs` stays as-is for player name / team name rendering. The TS renderer ports the byte-to-char and dollar-code tables (they are small, static, well-tested). Future: extract a shared `packages/qw-knowledge/char-codes` package if a third consumer appears.

## 4. Scope - what gets pretty-rendered

Three classes of text in an alias chain; each is treated differently:

- **Output command arguments** - the quoted string after `say`, `say_team`, `say_me`, `tp_msg_*`. **Pretty-rendered.**
- **Teamsay-shaped `set` bodies** - the value-string for `set tp_name_*`, `set tp_msg_*`, `set _report_*`, and any `set` where the value contains `&c`, `$`, `%`, or `{}` patterns. **Pretty-rendered.** The presence of any teamsay-vocabulary token is the heuristic - it filters out filenames, IPs, integers, etc.
- **Everything else** - alias names, command keywords (`say_team`, `set`, `if`, `then`, `else`, `wait`, `echo`, `;`), cvar names in non-teamsay `set`s, operators, numbers. **Rendered as plain monospace code** with slightly muted styling, so the chain skeleton still reads as code.

### 4.1 Corner cases

- **`say_team $somevar`** - when the whole argument is a single variable ref, we still pretty-render the resolved value. Stage-1 sees `$somevar`, stage-2 resolves and re-parses.
- **`if %health < 30 then A else B`** - tier 1: the keyword tokens (`if`, `then`, `else`) render as literal/skeleton, the condition renders as `%health < 30` with `%health` as a runtime-labeled span, the bodies `A` and `B` render normally. Tier 3 wraps in a `conditional` group for collapsible display.
- **`echo "..."`** - treated as an output command; echo bodies have the same color code syntax as say_team.
- **`bind key "..."`** - the bound command body is NOT pretty-rendered at the bind level; it enters the alias chain expansion like any other command and gets decomposed into its constituent commands (some of which may be pretty-render targets).
- **Non-teamsay strings** - `exec "autoexec.cfg"`, `connect "1.2.3.4"`, numeric `set` values. Skipped by the heuristic, rendered as plain code.

## 5. UX

### 5.1 Toggle placement

- **Per-row toggle.** A small "Pretty / Raw" segmented control in the header of each expanded alias chain block. Aligned right of the row's existing label. Local and immediate.
- **Global default.** New entry in the viewer options panel (same location as "Hide defaults" / "Hide keyboard"): `Alias chains: Pretty | Raw`. Persisted in `ProfilePrefs`. Drives the initial mode for newly expanded rows.
- Per-row overrides the global for that row, for the current session. Not persisted.
- First-launch default: **Pretty**.

### 5.2 Hover

All spans with `origin !== "literal"` are hover targets with 200ms delay (matches existing cvar tooltip convention).

- **variable:** `$tpname -> para` + source file/line if available.
- **runtime:** `%a - current armor value` (label + `desc` from `ezquake-macros.json`).
- **charcode:** `$] - gold right bracket`.
- **unresolved:** `$unknown_var - not found in this config` (or equivalent for `%unknown`).

### 5.3 Visual language

Using existing OKLCH tokens and DaisyUI semantic classes (per `CLAUDE.md` no-hardcoded-colors rule):

- **literal (code skeleton):** default text color, monospace, slightly dimmer than the active chain name. Muted enough that the eye jumps past it to the content.
- **variable (substituted inline):** rendered in its resolved color per the color stack, with a subtle dotted-underline to signal hoverable/was-a-variable.
- **runtime (labeled placeholder):** italicized, rendered in its scope color, dotted-underline. Italic distinguishes "fills in at runtime" from "already resolved."
- **charcode:** glyph in its scope color, no underline. Hover still works.
- **unresolved:** dim gray, a preceding warning dot (`●` or equivalent neutral glyph in the design system), bold rawToken text. Visible on scan so the user knows what didn't resolve.

Color + origin indicators combine: a `$variable` resolved inside `{&cf13...&r}` renders red AND carries the dotted-underline. Color wins for fill, underline stays for the hover affordance.

### 5.4 Raw mode

Raw mode output is byte-for-byte identical to today's `sg-alias-chain-cmd` rendering. No changes. Raw is the safety valve.

## 6. Iteration tiers

Shipped in order. Each tier is a standalone win and doesn't require the next.

### Tier 1 - foundation (first PR)

- Span-tree IR types.
- Color-stack state machine (builder stage 1).
- `$variable` substitution (builder stage 2) - **consumes `expandVars` from `@/lib/simulator`**, does not reimplement. Correlates matches against the simulator's resolution to tag spans as `variable` / `unresolved`.
- `$X` single-char code expansion (builder stage 4), TS port of `expand_dollar_code` + `qw_byte_to_char` + `qw_byte_color` from `ezquake.rs:432-523`.
- Per-row Pretty/Raw toggle + global default in `ProfilePrefs`.
- Visual treatment for origins: literal, variable, charcode, unresolved.
- Hover tooltips for variables and charcodes.
- Heuristic-gated scope: only teamsay-vocabulary strings get pretty-rendered.

Tier 1 defaults `state` to `createDefaultPlayerState()`; the resolver pipeline is in place but Simulator mode is dormant until tier 2 wires the mode toggle and live signal.

After tier 1: most of the visual noise from the screenshot in the HANDOVER item is gone. Colors render. `{...}` scopes apply. `$tpname` resolves to `para`. Gold brackets look right. `%a` still displays as literal `%a` but sits inside correctly white-scoped braces.

### Tier 2 - runtime tokens + resolver modes

- `%token` resolution in builder stage 3 via a `RuntimeResolver` injected at the pretty-view root.
- **`LabelResolver`** (authored here) - static table mapping each known token to a human label + short description for tooltip. Seeded from `ezquake-macros.json` desc fields plus a curated short-form table (`%a` -> `armor`, `%h` -> `health`, etc.) matching the simulator's `SHORT_FORM_ALIASES`.
- **`SimulatorResolver`** - imported as `createSimulatorResolver(state, cvars)` from `@/lib/simulator`. No adaptation layer.
- **Pretty-view `Label | Simulator` mode toggle** in the viewer options panel. Independent of the right-rail `Keyboard | State` toggle. Persisted in `ProfilePrefs` alongside the existing Pretty/Raw default.
- **Live PlayerState subscription** - Simulator-mode pretty rendering reacts to the same signal that `StatePanel` edits, so changing state in the right rail updates pretty output immediately.
- Italic treatment for runtime origin. Tooltips.

After tier 2: `{%a}/{%h}` reads as "*armor / health*" in Label mode, or "*100 / 100*" (or whatever the current state is) in Simulator mode.

### Tier 3 - active-branch highlighting

With the simulator's `evaluateTeamsay` shipped, conditional handling reduces to a correlation pass:

- Call `evaluateTeamsay(chainBody, state, cvars, aliases)` once per expanded chain in Simulator mode.
- Walk the returned `trace`; for each `TraceStep` with `kind === "condition"` and `activeBranch`, locate the matching condition span in our tree by expression text (fallback: traversal ordinal for duplicates).
- Dim the inactive branch's subtree; highlight the active branch's path.
- Surface `issues[]` inline: attach each issue to its originating span (unresolved-var on the variable span, missing-alias on the alias-follow, etc.).
- Label mode: conditionals render with both branches at equal weight (no evaluation).

**Spec coverage:** tiers 1, 2, and 3 are all specified at implementation fidelity. The correlation question in 11 Open questions is the only item that may require a minor simulator-side extension (stable trace-step id) if text-based matching proves fragile in real fixtures.

## 7. Component touch points

The following components and modules are affected. No file renames or moves. Each bullet is tagged with the tier it lands in.

**Imported from the shipped simulator module** (`@/lib/simulator`), not re-implemented:
- `expandVars` - `$var` substitution (consumed in stage 2).
- `createSimulatorResolver` - `%token` resolution in Simulator mode (consumed in stage 3).
- `createDefaultPlayerState` - default state for Label mode + tier 1.
- `evaluateTeamsay` + `TraceStep` - active-branch correlation (consumed in tier 3).

**Authored in this feature:**

- **[tier 1]** `src/components/AliasChainResolver.tsx` - adds Pretty rendering path alongside existing raw output. `AliasChainView` gets a `mode: "pretty" | "raw"` prop with a per-row override toggle in the header. Existing `sg-alias-chain-cmd` spans gain an alternative Pretty render branch.
- **[tier 1]** `src/lib/prettyRender.ts` (new) - span tree builder, color-stack state machine, charcode expander. Calls into `@/lib/simulator` for `$var` substitution. Pure functions, no solid-js imports.
- **[tier 1]** `src/lib/charCodeTable.ts` (new) - TS port of `expand_dollar_code` + `qw_byte_to_char` + `qw_byte_color` from `ezquake.rs:432-523`. Kept small and static.
- **[tier 2]** `src/lib/runtimeResolver.ts` (new) - exports the `LabelResolver` implementation only. `SimulatorResolver` is imported from `@/lib/simulator`. The `RuntimeResolver` interface type is re-exported from `@/lib/simulator` (where it is already defined).
- **[tier 1]** `src/store.ts` + `src/types.ts` - `ProfilePrefs` gains `alias_chain_mode: "pretty" | "raw"` (tier 1) and `alias_chain_resolver: "label" | "simulator"` (tier 2), migrated with defaults `"pretty"` / `"label"`.
- **[tier 1]** CSS (existing `sg-alias-chain-*` block) - new classes for origin treatments: `sg-span-literal`, `sg-span-variable`, `sg-span-charcode`, `sg-span-unresolved`, plus color helpers `qw-default`, reused `qw-w` / `qw-g` / `qw-b`. **[tier 2]** adds `sg-span-runtime`. **[tier 3]** adds `sg-span-branch-inactive`.

`configMerger.ts` is not touched. `weapon_classifier.rs` is not touched. `ezquake.rs` is not touched. The Rust QW name expander at `ezquake.rs:419-605` stays as-is for name-rendering use cases; the TS renderer duplicates the byte tables intentionally to keep the frontend self-contained. If a third consumer appears later, extract to `packages/qw-knowledge/char-codes`.

## 8. Testing

Unit tests for the builder, at minimum:

- Empty string and plain ASCII round-trip unchanged.
- `&cRGB text &r` produces a hex-colored span then a default-colored span.
- `{text}` produces a white span.
- `{&cf13red&r}` produces a red span, no bleed after `}`.
- Nested braces stack correctly.
- `$tpname` substitutes recursively, and the resolved value's colors render.
- Missing `$var` emits `unresolved` with the raw token preserved.
- `%a` emits `runtime` origin (tier 2).
- `$]` emits `charcode` origin with gold class.
- Depth-capped recursion doesn't stack-overflow on cyclic `$a -> $b -> $a`.

Fixture tests against the existing `apps/slipgate-app/assets/teamsays/*.cfg` set (bps, hangtime, locktar, phrenic, raket, sae, tiba, xantom). Visual review in the running app is the primary verification; automated snapshot tests optional.

No tests are added to `ezquake.rs` for this feature. Rust-side tests remain scoped to the weapon classifier and archive modules.

## 9. Performance

Strings are short (teamsay bodies rarely exceed a few hundred characters). Alias chains have a hard depth cap of 8. Per-toggle re-parse is the simplest implementation and is cheap enough not to need memoization in tier 1. If profiling shows a bottleneck during large-config expansion, memoize span trees per `(rawString, modeVersion)` key.

## 10. Future directions (not in scope for this spec)

These are captured so the design does not accidentally foreclose them. None are implemented in tiers 1-3.

- **Outcome enumeration.** A teamsay bind is a branching program; the interesting question for a user examining a bind is "what are all the possible chat lines this can emit, and what conditions produce each?" Because the span-tree IR keeps conditional branches as siblings (not pre-resolved), an outcome enumerator becomes a tree walker over the span tree. Each root-to-leaf path yields one possible pretty-rendered chat line. The simulator's `evaluateExpression` gives us the condition evaluator this needs; outcome enumeration is a UI pass plus a tree walker on top.
- **Teamsay creator.** The span tree IR is also a document model. A rich-text editor that emits spans can serialize back to valid ezQuake cfg syntax (colors to `&c` codes, white scopes to `{...}`, runtime placeholders to `%tokens`). Pretty view and creator share the same primitives.
- **True conchars fidelity.** For screenshot export or WYSIWYG chat preview, swap Unicode glyphs for an SVG sprite sheet driven by the conchars.png layout. The span tree doesn't change - only the glyph rendering helper.
- **Cross-config pretty diff.** Render both sides of compare mode in pretty; visual diff by span comparison rather than string comparison.

## 11. Open questions

- **Trace-to-span correlation in tier 3.** `evaluateTeamsay` returns trace steps identified by their condition `text` (the raw expression string). Pretty view needs to map each trace step to the corresponding condition span in its tree to render the active branch. Proposed matching: by expression text first, with traversal-order fallback when the same expression appears twice in a chain. If this proves fragile on real fixtures, the fix is a minor simulator-side extension to add a stable id to each `TraceStep`. Evaluate once tier 3 is in-flight.
- **Color rendering of substituted variables.** When `$tp_name_rl = "{&cfffrl&cfff}"` is embedded in a red parent scope `&cf00 $tp_name_rl &r`, does ezQuake's runtime honor the inner `&cfff` (white) or fall back to the parent's `&cf00` (red)? This affects whether stage 1 re-enters the stack fresh on the substituted value or inherits the outer color frame. Default assumption: inner colors win (variables are self-contained). Verify against fixtures during tier 1 implementation.
- **Raw-mode default color outside braces.** Observationally "brown/tan" (say_team default). Confirm against ezQuake's color handling when running pretty view against bps/hangtime fixtures. If it turns out to be theme-dependent or engine-setting-dependent, the color-stack initial-frame default becomes a pretty-view setting rather than a constant.
