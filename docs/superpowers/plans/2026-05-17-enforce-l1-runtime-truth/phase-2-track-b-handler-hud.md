# Phase 2 -- Track B: `ezquake/_handler_hud.py` (commands-only)

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` IN FULL (D1-D22 + the D11 amendment + X1-X10 +
>    non-goals). The brainstorm is closed -- do NOT re-open a D; if a D looks
>    wrong, surface a deviation block and STOP. -- DONE; no D looks wrong;
>    all Phase-2 premises (D8/D9/D10/D11-amended/D16) re-verified TRUE
>    against live source (see "No deviation" below + "Recon facts").
> 2. Read `review-findings.md`; identify the F/R/W rows whose owning phase
>    role is this phase. Phase 2 = role "B": F1 (awareness only), F2, R1,
>    R3 (emit), R7, W2, W3, W4. -- DONE.
> 3. Recon the LIVE source before inlining anything. -- DONE; see "Recon
>    facts (verified)".
> 4. After drafting, dispatch the verification sub-agent. -- DONE; findings
>    applied, see "Open questions".

> **No deviation -- all Phase-2 premises re-verified TRUE 2026-05-17.**
> The prior-phase (Phase 1) note instructed: apply the
> refuted-premise -> deviation-block -> STOP discipline identically if any
> D8/D9/D11-amended premise fails live recon, R1 the prime candidate. It was
> checked and does NOT fire here:
> - **D8 (literal contract) premise holds.** `HUD_Register` arg #1 is the
>   bare-command literal; arg #3 `flags` and arg #7 `show` are
>   compile-time-constant / literal at every recon'd call site (radar
>   verified live). R1's "AST-confirm 0 non-literal first args" is, BY D8's
>   own text, a *designed in-phase implementation gate* ("implementation must
>   confirm 0 non-literal first args via the extractor's actual AST before
>   the literal-only assumption is load-bearing in code"), NOT a draft-time
>   refutation. The textual evidence (spec D8: 83 sites / 0 non-literal;
>   this drafting's independent textual grep: 84 `HUD_Register(` lines = 83
>   calls + the 1 definition line, 0 non-literal first arg by inspection)
>   holds; the AST confirm is the executor's Task-1/Task-3 gate with a
>   wired STOP default (R1). This is the correct handling, not a deviation.
> - **D9 (existing handler blind) premise holds and is now stronger.** The
>   literal command handler emits nothing for `Cmd_AddCommand(name, ...)`
>   (non-literal first arg) AND `Cmd_AddRemCommand` is in ZERO live handlers
>   (grep, `_legacy/` excluded) -- the `+/-` pair is doubly hidden.
> - **D11-amended (cvar half struck / commands only) premise holds.**
>   `_handler_cvars.py:288-351 _synthesize_hud_cvars` (wired
>   `:380-385/:413/:481-482`) already emits the full `hud_<name>_<subvar>`
>   cvar family. The new handler is COMMANDS ONLY (R7).
> If any premise had been refuted this block would be a DEVIATION and the
> phase would STOP for an operator amendment (the D7/D11 precedent). It is
> not; the phase is internally clear to draft. R1 remains a hard in-phase
> gate (Task 3): a non-literal first arg found by the AST STOPS the phase
> and surfaces to the operator -- do NOT constant-propagate (that blends
> toward Track A, violating D1).

## Goal

This phase delivers Track B's mechanism: a NEW project-private ezQuake
handler `ezquake/_handler_hud.py` that models the `HUD_Register` COMMAND
contract end to end by literal/constant reading only (D8; zero call-graph,
zero Track-A blend -- D1). For every `HUD_Register` call site it emits the
bare `<name>` command unconditionally (the live `Cmd_AddCommand(name,
HUD_Func_f)` at `hud.c:1232`), and emits `+hud_<name>` / `-hud_<name>` only
when the call site's `flags` arg literally contains `HUD_PLUSMINUS` AND its
`show` arg is a non-NULL literal (the live double-gated `Cmd_AddRemCommand`
pair at `hud.c:1273-1278`). Each recovered command carries its HUD element
key -- the literal `HUD_Register` arg #1 (D16; R3-emit) -- so Phase 3 can
store `radar`/`+hud_radar`/`-hud_radar` as one element group. The handler
emits ZERO `type='cvar'` entities (D11-amended / R7): a duplicate cvar
emitter would collide with `_handler_cvars.py:288-351` on
`entities UNIQUE(project,type,name)`. It is purely additive (introduces
currently-absent commands; modifies/suppresses no existing emission --
D9), inherits D6's non-invasive bar through one subscription seam + one
orchestration boolean in `extract.py`, fail-safe-off, default-on for
ezQuake only (X4; the per-fork gate is structural -- this is an
ezquake/-private Tier-3 handler). The literal-only assumption is
AST-confirmed before it is load-bearing: the handler records every
`HUD_Register` site whose first arg does NOT resolve via the libclang AST
(`literal_string` + the macro fallback), and the R1 probe asserts that
count is 0 -- a non-zero count STOPS the phase (R1). The phase is verified
ENTIRELY on the mechanism's own output: the 3 HUD known-answer anchors
(`radar` bare; `+hud_radar`+`-hud_radar`; `togglehud` present-and-NOT-
emitted) plus the R7 zero-`type=cvar` probe plus the R1 AST-confirm probe
run against the handler's OWN emitted JSON -- NOT against any L1 column (no
schema until Phase 3), NOT against the combined harness (Phase 4), NOT
against the runtime dump (Phase 4's answer key; prerequisites item 4 is
explicitly NOT a Phase-2 precondition). **Runnable, verifiable state at the
phase boundary:** the ezQuake extractor runs end-to-end with the handler
toggled on; `ezquake-hud-commands-ast.json` is emitted with the bare/`+`/`-`
commands element-keyed; the 3 anchors + R7 + R1 probes are GREEN against the
handler's own JSON; and every one of the 8 existing handler JSONs is
byte-identical to the toggle-off / prior-HEAD output, proven by the actual
diff command emitting an empty result (X3).

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

All cites verified this drafting against `research/repos/ezquake-source`
HEAD `3f9e724fa608e516040f02b9557808ff3efda53e` ("Merge pull request #1120
... help-json-drift") -- the L1-extracted commit (`prerequisites.md` item 2;
version pin holds). Trust live code over spec prose (X8/W2).

- **The `HUD_Register` COMMAND contract (live `hud.c`, VERIFIED line-exact).**
  - Signature `hud_t * HUD_Register(char *name, char *var_alias, char
    *description, int flags, cactive_t min_state, int draw_order,
    hud_func_type draw_func, char *show, char *place, char *align_x, char
    *align_y, char *pos_x, char *pos_y, char *frame, char *frame_color,
    char *item_opacity, char *params, ...)` @ `hud.c:1182-1188` (prototype
    `hud.h:133`). Arg index map: **arg0 = `name`** (bare command + the D16
    element key), **arg3 = `flags`**, **arg7 = `show`**.
  - **(a) Bare `<name>` -- unconditional.** `Cmd_AddCommand(name,
    HUD_Func_f);` @ `hud.c:1232`, executed for every `HUD_Register` call.
    `HUD_Func_f` defined @ `hud.c:153`.
  - **(b) `+hud_<name>` / `-hud_<name>` -- double-gated.** Outer
    `if (show)` @ `hud.c:1265`; inner `if (flags & HUD_PLUSMINUS)` @
    `hud.c:1269`. Inside: `char cmdname[128]; strlcpy(cmdname, "+hud_",
    ...); strlcat(cmdname, name, ...);` (`hud.c:1271-1274`) ->
    `Cmd_AddRemCommand(cmdname, HUD_Plus_f);` @ `hud.c:1275`; then
    `cmdname[0] = '-';` -> `Cmd_AddRemCommand(cmdname, HUD_Minus_f);` @
    `hud.c:1277-1278`. So the literal names are exactly `+hud_<name>` and
    `-hud_<name>`. `HUD_Plus_f` @ `hud.c:90`, `HUD_Minus_f` @ `hud.c:121`.
  - **`HUD_PLUSMINUS = (1 << 10)`** @ `hud.h:37` (`// auto add +/- commands`).
    `flags` at call sites is a compile-time constant expression (e.g.
    `HUD_PLUSMINUS`, or `HUD_PLUSMINUS | HUD_ON_SCORES`) -- read the token
    text statically and test for the `HUD_PLUSMINUS` identifier; no dataflow
    (D8; zero Track-A mechanism).
- **TRAP -- the superseded commented duplicate at `hud.c:1281-1282`.**
  Immediately after the live `Cmd_AddRemCommand` pair sit
  `//Cmd_AddCommand(Q_strdup(va("+hud_%s", name)), HUD_Plus_f);` and the
  `-hud_` twin (commented out). These produce the **same** `+hud_<name>` /
  `-hud_<name>` names the live `Cmd_AddRemCommand` path already produces --
  a stale superseded form, NOT a second source. The handler models the LIVE
  `Cmd_AddRemCommand` path ONLY; it must NOT also emit from these comments
  (double-count) and they are **NOT** a Track-A commented-register feeder-b
  concern (feeder-b targets entities whose ONLY registration is commented,
  e.g. `gl_outline_scale_world`; here the registration is LIVE). Recorded so
  the executor is not misled (D1 no-blend: commented-register is Track A's
  domain and is moot here -- the live path exists).
- **`togglehud` is a plain literal command, NOT `HUD_Register`** --
  `Cmd_AddCommand ("togglehud", HUD_Toggle_f);` @ `hud.c:819` (inside
  `HUD_Init`, alongside `show`/`hide`/`move`/`place`/`order`/`align`/
  `hud_recalculate`). It is a literal first arg, so `_handler_commands.py`
  already emits it into `ezquake-commands-ast.json`. The new handler visits
  ONLY `HUD_Register` CALL_EXPRs, so it structurally cannot emit
  `togglehud` -- anchor 3 asserts this explicitly (the additivity gate;
  the analogue of Track A's `cl_bobhead` over-reach gate -- D10).
- **radar anchor ground truth (D10 anchors 1+2; VERIFIED live).**
  `HUD_Register("radar", NULL, "Plots the players ...", HUD_PLUSMINUS,
  ca_active, 0, SCR_HUD_DrawRadar, "0", "top", ...)` @ `hud_radar.c:1422`
  (in `Radar_HudInit(void)`, under `#ifdef WITH_PNG`). arg0 = `"radar"`
  (literal), arg3 = `HUD_PLUSMINUS` (the flags token, literal), arg7
  (`show`) = `"0"` (non-NULL string literal). Both `+/-` gates pass =>
  the handler MUST emit bare `radar` + `+hud_radar` + `-hud_radar`, all
  carrying element key `radar`. (The `#ifdef WITH_PNG` is irrelevant to
  literal modeling -- Track B reads the call site from the AST; it is NOT
  a call-graph -- D8.)
- **D9 premise re-verified (existing handlers are blind).**
  `_handler_commands.py` REGISTRATION_APIS = `("Cmd_AddCommand",
  "Cmd_AddLegacyCommand")` (`:184`); name resolution is
  `literal_string(args[0])` with an all-caps `_MACRO_IDENT_RE` +
  `file_macros` fallback (`:221-229`). For `Cmd_AddCommand(name,
  HUD_Func_f)` arg0 `name` is the `char *name` parameter -- not a string
  literal (`literal_string` -> None) and `name` is lowercase so
  `_MACRO_IDENT_RE` (`^[A-Z_][A-Z0-9_]+$`) does not match -> the handler
  emits NOTHING for `hud.c:1232`. `Cmd_AddRemCommand` appears in ZERO live
  handlers (`grep -rn Cmd_AddRemCommand scripts/extractors/ --include=*.py`,
  `_legacy/` excluded -> 0 hits) -- the `+/-` pair is doubly hidden. This
  is exactly why the ~129 are hidden (banked, F2; NOT re-derived here).
- **The handler pattern to mirror (`_handler_commands.py`, the sibling).**
  `class CommandsEzquakeHandler(Visitor)`, `name = "commands"`,
  `output_filename = "ezquake-commands-ast.json"` (`:180-181`). Per-file:
  `start_file` inits `_func_stack`/`_seen_in_file`/`_rows`;
  `enter_function`/`exit_function` push/pop `_func_stack`
  (`:195-199`); `visit_cursor` filters `CursorKind.CALL_EXPR` against
  `REGISTRATION_APIS`; `end_file` returns rows; `finalize(*, all_rows,
  repo_root)` dedups + merges `help_commands.json` + assigns groups +
  returns `{"groups": [...], "commands": {<name>: {"group-id", "ast":
  {...}}}, "_stats": {...}}`. Row shape: `{name, handler_fn, source_file,
  source_line, source_column, enclosing_function, build_variant}`. Imports
  `extractor_lib._visitor.Visitor`, `extractor_lib._resolve.resolve_fn_ref`,
  `extractor_lib._source.literal_string`. The new handler is a Tier-3
  ezQuake-private sibling of this file (NOT a subclass -- different
  contract).
- **`_handler_hud.py` does NOT exist (Phase 2 creates it).**
  `_handler_hud_elements.py` DOES exist and is **DISTINCT** -- it emits
  `hud_element` aggregates + an `owned_cvars` name-list as nested metadata
  (audit doc section 2a), NOT command entities and NOT cvar entities. The
  new `_handler_hud.py` is a SEPARATE, new handler owning the COMMAND half
  only. Do not conflate the two (the audit doc explicitly flagged this
  confusion risk).
- **The R1 AST instrument is `literal_string`.** `extractor_lib/_source.py`
  `literal_string(arg_cursor, source_bytes)` (`:46-80`) reads
  `arg_cursor.extent` from the libclang AST cursor (`read_extent` over the
  cursor's source extent) and parses the C string literal (handles
  adjacent-literal concat + `L"..."`). Operating on `args[0]` from
  `cursor.get_arguments()` on the `HUD_Register` CALL_EXPR is the *actual
  libclang AST instrument* R1 demands (NOT the spec's textual tokenizing
  probe). The handler's own walk IS the AST confirmation: if
  `literal_string(args[0])` returns None AND the `_MACRO_IDENT_RE` +
  `file_macros` fallback (mirroring `_handler_commands.py:221-229`) also
  fails, that site has a non-literal first arg -> R1 trip.
- **The D9/X4 single seam in `extract.py` (for a NEW handler).**
  `ALL_HANDLERS` is a name->instance dict built from a list of 8 handler
  instances (`extract.py:72-83`); imports at `:60-67`; `_split_handlers`
  routes any `isinstance(h, Visitor)` through the shared walk (`:97-102`);
  `_process_one_file` runs the visitor walk + `end_file` (`:130-145`);
  `finalize` is called per handler and written to
  `output_dir/f"{h.output_filename}{suffix}"` (`:366-370`); default
  `output_dir = HERE/output` (`:299`). The single seam = one
  `from _handler_hud import HudCommandsEzquakeHandler` + one module-level
  boolean gating whether `HudCommandsEzquakeHandler()` is appended to the
  `ALL_HANDLERS` list. Off => handler never constructed => never subscribed
  => zero emission, no new file => today's pipeline byte-for-byte (X4
  fail-safe-off). This is structurally ezQuake-only (a `ezquake/`-private
  handler in `ezquake/extract.py`); FTE/QWCL/MVDSV have their own
  `extract.py` and never see it (D2/D22 per-fork gate is the directory).
- **8 existing handler output files = the X3 zero-diff baseline set**
  (`grep output_filename _handler_*.py`, verified live):
  `ezquake-commands-ast.json`, `ezquake-variables-ast.json` (cvars; the
  filename stem is `variables`), `ezquake-macros-ast.json`,
  `ezquake-cmdline-params-ast.json` (stem `cmdline-params`),
  `ezquake-hud-elements-ast.json`, `ezquake-asset-cvar-bindings-ast.json`,
  `ezquake-asset-loader-sites-ast.json`, `ezquake-keynames-ast.json`. The
  new handler writes a NEW 9th file (`ezquake-hud-commands-ast.json`) --
  additive; X3 requires the 8 existing files byte-identical off-vs-on, and
  the 9th file simply does not exist when off. (NOTE: Phase 1's Task-2
  block lists `ezquake-cvars-ast.json` and `ezquake-cmdline-ast.json` --
  both stale stems; the live stems are `variables` and `cmdline-params`.
  Phase 2 uses the verified names. Flagged to the orchestrator -- not
  silently editing an approved phase.)
- **The cvar collision surface (R7), do-NOT-replicate.**
  `_handler_cvars.py:288-351 _synthesize_hud_cvars` reads
  `literal_string(args[0])` then builds `hud_{name}_{suffix}` cvar records
  via `mk()` (`:306-324`: `cvar_name`/`c_ident`, `default_value`,
  `storage_class:"generated"`, `group_name`), wired from `GROUP_CALL_NAMES`
  containing `"HUD_Register"` (`:380-385`), `visit_cursor` dispatch
  (`:413`), `end_file` `elif nm == "HUD_Register": hud_cvars.extend(
  _synthesize_hud_cvars(...))` (`:481-482`), into `ezquake-variables-ast
  .json` (`:377`). The new handler reads the SAME `HUD_Register` call site
  (two visitors both see every cursor -- harmless; `_visitor.py:110-167`)
  but emits ONLY bare/`+`/`-` COMMAND rows; it MUST NOT call any
  `mk()`-shaped cvar synthesis. R7 probe asserts zero cvar-shaped output.
- **Visitor protocol (`extractor_lib/_visitor.py`).** `class Visitor`
  (`:24`); hooks `start_file(*, source_path, source_bytes)` (`:44`),
  `enter_function`/`exit_function(cursor, variant)` (`:49/:54`),
  `visit_cursor(cursor, variant)` (`:68`, fires for EVERY cursor in the
  target file), `end_file() -> list[dict]` (`:74`), `finalize(*, all_rows,
  repo_root) -> dict` (`:78`, must override). `walk_tu_dispatch` (`:88`)
  delivers every cursor of all 4 TUs to every visitor; the win/apple TUs
  dispatch as `variant="client"` (`extract.py:134-137`). Track B does NOT
  need the true 4-way variant (it is literal modeling, not a per-variant
  call-graph -- D8); the `build_variant` field mirrors
  `_handler_commands.py`'s `"client"`/`"server-build"` collapse exactly,
  for output-shape parity only.
- **Pool numbers are banked context, NOT re-derived here (F2/X7/X8).**
  Use **74 commands / 92 cvars** banked HEAD pool; Track-B reverse-diff
  **~129** genuine hidden commands. NEVER the parking 77/97/166/132.
  Honest X8 posture (mirrors Phase 1): the runtime-vs-L1 diff that produced
  ~129 needs the pinned runtime dump (`prerequisites.md` item 4 = the
  ACCEPTANCE phase's answer key, explicitly NOT a Phase-2 precondition);
  it is **unverifiable in this phase by design**. Phase 2 does NOT re-run
  the runtime diff and does NOT re-derive 74/92/129 (X7). Its
  self-validation rests on the 3-anchor ground truth + R1/R7, all verified
  live this drafting against the handler's own output (X2). The textual
  `grep "HUD_Register(" src/*.c` = 84 lines (= 83 calls + the 1 definition
  line at `hud.c:1182`); this is an honesty anchor only, NOT load-bearing
  and NOT reconciled in-phase -- R1's in-phase libclang-AST pass (0
  non-literal first args) is the authority, not the site count (X7/X8).
- **F1 (awareness only -- no Phase-2 code impact).** Spec D11 body labels
  the cvar subvar `order` as "(gated)"; live `hud.c:1241-1246` shows
  `order` is UNCONDITIONAL (a bare block scoping a local buffer, not an
  `if`) and `show` @ `hud.c:1265` is the gated one. This is a CVAR-half
  mislabel; the cvar half is STRUCK (D11-amended) so it drives no Phase-2
  code. Recorded so the executor is NOT misled into assuming an analogous
  command-half mislabel: the command `+/-` gating (`if (show)` 1265 +
  `if (flags & HUD_PLUSMINUS)` 1269) is independently re-verified correct
  in D8 and above.
- **Pin + environment (prerequisites 1-2).** ezquake-source HEAD =
  `3f9e724fa608e516040f02b9557808ff3efda53e` (re-verified this drafting).
  The Postgres dev container (item 3) is NOT required by Phase 2 -- the
  probes read the handler's emitted JSON, never the DB. Item 4 (durable
  pinned runtime dump) is explicitly NOT a Phase-2 precondition (X2
  self-containment; the dump cross-check is Phase 4's stage-2 / D19).

## Inputs from previous phase

Phase 1 (Track A) is approved and shipped before this phase starts, but
Phase 2 shares NO code, NO schema discriminator, NO gate with it (D1; D12).
The only hard inputs are the checked items in `prerequisites.md`:

- Item 1 (libclang extractor toolchain) -- SATISFIED; confirm at execution
  start that `ezquake/extract.py` runs end-to-end and emits its current 8
  entity JSONs. That emitted set is the X3 zero-diff baseline.
- Item 2 (`research/repos/ezquake-source` pinned at `3f9e724f`) -- SATISFIED
  and re-verified during drafting; confirm again at execution start (a moved
  pin invalidates every line cite -- X8/W2; STOP if moved).
- Item 3 (Postgres dev container) -- NOT required by this phase (probes
  read the handler JSON, not the DB).
- Item 4 (durable pinned runtime dump) -- explicitly NOT a Phase-2
  precondition (X2; the dump cross-check is Phase 4 / D19). The handler
  emits the statically modeled names; Phase 4 owns the runtime-dump safety
  net (D8's "only dump-confirmed names ship" is correctly scoped to Phase
  4's stage-2, NOT Phase 2 -- D19/D21).
- From Phase 1: nothing consumed. Phase 1's `reachable()` contract and the
  call-graph module are NOT touched here (D1 hard no-blend).

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/ezquake/_handler_hud.py
    # NEW Tier-3 ezQuake-private Visitor handler (underscore-prefix =
    # internal, per extractor_lib convention). Sibling of
    # _handler_commands.py (mirrors its Visitor/finalize idiom); NOT a
    # subclass and NOT _handler_hud_elements.py. Models the HUD_Register
    # COMMAND contract ONLY:
    #  - bare <name> (unconditional; hud.c:1232)
    #  - +hud_<name> / -hud_<name> (gated: flags has HUD_PLUSMINUS AND
    #    show is a non-NULL literal; hud.c:1265/1269/1275/1278)
    #  - each row carries hud_element = literal HUD_Register arg0 (D16/R3-emit)
    #  - R1: records every site whose arg0 does NOT resolve via the
    #    libclang AST (literal_string + macro fallback) for the R1 probe
    #  - R7: emits ZERO cvar-shaped rows (commands only)
    # output_filename = "ezquake-hud-commands-ast.json" (the NEW 9th file).
apps/qw-oracle/scripts/extractors/ezquake/verify-hud-probes.py
    # ezQuake-instantiated Track-B self-validation harness. Sibling of the
    # existing ezquake/verify-unified-output.py and the Phase-1
    # ezquake/verify-callgraph-probes.py (same exit-nonzero-on-RED shape).
    # Runs the 3 HUD anchors + the R7 zero-cvar probe + the R1 AST-confirm
    # probe against the handler's OWN emitted JSON (X2). Probe LOGIC only;
    # Phase 4 COMPOSES it into the combined one-time-per-fork harness (it
    # does NOT wire that here).
```

### Modified

```
apps/qw-oracle/scripts/extractors/ezquake/extract.py
    # The SINGLE subscription seam + SINGLE orchestration boolean (D9/X4).
    # Additive only: one `from _handler_hud import HudCommandsEzquakeHandler`
    # import + one module-level boolean (default True for ezQuake) gating
    # whether HudCommandsEzquakeHandler() is appended to the ALL_HANDLERS
    # list. Off => handler never constructed => never subscribed => zero
    # emission, no 9th file => today's 8-file pipeline byte-for-byte (X4).
    # No existing handler instance, import, or wiring line changes (X3).
```

### Deleted

```
n/a -- this phase is purely additive (D9). A deletion touching existing
handler output would violate X3.
```

## Tasks

### Task 1 -- build the Tier-3 handler `_handler_hud.py` (the HUD_Register COMMAND contract)

- **Goal:** A self-contained new Visitor handler that, for every
  `HUD_Register` CALL_EXPR, emits the bare `<name>` command unconditionally
  and the `+hud_<name>`/`-hud_<name>` pair under the verified double gate,
  each row element-keyed (D16), emitting zero cvar-shaped output (R7), and
  records every non-literal-first-arg site for the R1 gate.
- **Files:** `ezquake/_handler_hud.py` (created).
- **Steps:**
  - [ ] `class HudCommandsEzquakeHandler(Visitor)` with `name =
    "hud-commands"`, `output_filename = "ezquake-hud-commands-ast.json"`.
    Import `Visitor` from `extractor_lib._visitor`, `literal_string` from
    `extractor_lib._source`, `resolve_fn_ref` from
    `extractor_lib._resolve`. Mirror `_handler_commands.py`'s module/sys.path
    header and the `_MACRO_IDENT_RE = re.compile(r'^[A-Z_][A-Z0-9_]+$')`
    macro-fallback idiom exactly (consistency -- do not invent a new shape).
  - [ ] `start_file`: call `super().start_file(...)`, then init
    `self._func_stack: list[str] = []`, `self._seen_in_file: set = set()`
    (per-file first-wins, mirroring `_handler_commands.py`), `self._rows:
    list[dict] = []`, and `self._nonliteral_sites: list[dict] = []` (R1).
  - [ ] `enter_function`/`exit_function`: push/pop
    `cursor.spelling or "?"` on `_func_stack` (verbatim mirror of
    `_handler_commands.py:195-199`).
  - [ ] `visit_cursor(cursor, variant)`: return unless
    `cursor.kind == CursorKind.CALL_EXPR and cursor.spelling ==
    "HUD_Register"`. `args = list(cursor.get_arguments())`. If
    `len(args) < 8` (need arg7 `show`), record an R1/shape anomaly into
    `_nonliteral_sites` (a malformed `HUD_Register` is itself a
    literal-model violation -- do NOT silently skip) and return.
  - [ ] **Resolve arg0 `name` via the libclang AST (R1 instrument).**
    `name = literal_string(args[0], self.source_bytes)`. If falsy, apply
    the macro fallback exactly as `_handler_commands.py:223-229` (read the
    arg0 extent; if `_MACRO_IDENT_RE` matches, `name =
    self.file_macros.get(raw)`). If STILL falsy, this is a **non-literal
    first arg**: append `{site: file:line, raw: <arg0 extent text>}` to
    `self._nonliteral_sites` and return WITHOUT emitting (do NOT
    constant-propagate, do NOT guess -- R1; that would blend toward Track
    A, violating D1). Continue only with a resolved literal `name`.
  - [ ] **Bare command (unconditional -- D8a).** Append a row
    `{"name": name, "hud_family": "bare", "hud_element": name,
    "handler_fn": "HUD_Func_f", "registration_api": "Cmd_AddCommand",
    "source_file": Path(loc.file.name).name, "source_line": loc.line,
    "source_column": loc.column, "enclosing_function": self._func_stack[-1]
    if self._func_stack else None, "build_variant": "client" if variant ==
    "client" else "server-build"}` (loc = `cursor.location`; the
    `HUD_Register` call site, mirroring `_handler_commands.py`'s loc/
    build_variant idiom). Skip if `name in self._seen_in_file`; else add.
  - [ ] **`+/-` pair (gated -- D8b).** Read arg3 (`flags`) raw extent text
    via `read_extent(self.source_bytes, args[3].extent)` (from
    `extractor_lib._source`); the gate is the literal token test
    `"HUD_PLUSMINUS" in <arg3 raw text>` (a whole-identifier match -- split
    on non-word chars; `flags` is a compile-time constant expr, no
    dataflow -- D8). Read arg7 (`show`): `show_lit = literal_string(args[7],
    self.source_bytes)`; the `if (show)` gate is satisfied iff `show_lit is
    not None` (a non-NULL string literal; `NULL`/non-literal => not gated --
    matches `hud.c:1265`). When BOTH gates pass, append two rows
    `+hud_<name>` (`hud_family":"plus"`, `handler_fn":"HUD_Plus_f"`,
    `registration_api":"Cmd_AddRemCommand"`) and `-hud_<name>`
    (`hud_family":"minus"`, `handler_fn":"HUD_Minus_f"`,
    `registration_api":"Cmd_AddRemCommand"`), each with `hud_element =
    name` and the same source cite/enclosing/build_variant as the bare
    row. Do NOT emit from the commented `hud.c:1281-1282` duplicate (the
    handler only reads AST CALL_EXPRs; comments are stripped by libclang --
    structurally safe, but recorded so the executor does not "helpfully"
    add a textual pass: that would be a Track-A-shaped blend, D1).
  - [ ] **R7 -- commands only.** The handler has no cvar code path at all:
    it never builds a `hud_<name>_<subvar>` string, never calls anything
    `mk()`-shaped, never imports `_handler_cvars`. Every emitted row is a
    command. (Structural R7 compliance; the Task-3 probe asserts it.)
  - [ ] `end_file() -> list[dict]`: return `self._rows`; reset
    `_rows`/`_func_stack`/`_seen_in_file`/`_nonliteral_sites` (mirror
    `_handler_commands.py:256-261`). The per-file `_nonliteral_sites` must
    survive into `finalize` -- accumulate them onto returned rows is wrong
    (they are not commands); instead carry them as a sentinel row
    `{"_nonliteral_site": {...}}` appended to the returned list and split
    out in `finalize` (keeps the Visitor contract: `end_file` returns a
    flat list; do not add a new protocol hook).
  - [ ] `finalize(*, all_rows, repo_root) -> dict`: split sentinel
    `_nonliteral_site` rows from command rows. Dedup command rows
    first-wins by `name` (mirror `_handler_commands.py:268-272`). Emit
    `{"hud_commands": {<name>: {"hud_family", "hud_element", "ast":
    {handler_fn, source_file, source_line, source_column,
    enclosing_function, build_variant, registration_api}}}, "r1":
    {"nonliteral_first_arg_sites": [...], "nonliteral_count": N},
    "_stats": {"source_total", "bare", "plus", "minus", "elements"}}`.
    Sorted by key like `_handler_commands.py:331`. The `hud_commands`
    container + `hud_element`/`hud_family` are the Phase-3 input contract
    (R3-emit; Phase 3 R3-store owns the L1 mapping -- this phase does NOT
    design schema). The `r1` block is the R1 evidence the Task-3 probe
    reads. NO help-JSON merge (that is the doc-gap sibling arc, non-goal --
    the HUD command family is absent from `help_commands.json` by design;
    `help.c:967-970` skips it -- spec "Out of scope").
- **Verification:** `python3 -c "import sys;
  sys.path.insert(0,'apps/qw-oracle/scripts/extractors/ezquake');
  sys.path.insert(0,'apps/qw-oracle/scripts/extractors');
  import _handler_hud as h;
  print(hasattr(h,'HudCommandsEzquakeHandler'))"` prints `True`. Full
  behavioural verification is Task 3's anchors+R1+R7 on the handler's own
  emitted JSON (X2 -- this phase's own output, never an L1 column).
- **Execution mode:** `subagent (Opus medium)` -- single-file synthesis
  against a fully-recon'd, locked literal contract, but correctness-critical
  (a false-emitted name ships a phantom command into L1 -- a dishonest KB)
  and judgment-dense (the R1 non-literal STOP path, the R7 collision
  avoidance, the D16 element-key + family modeling, the `hud.c:1281-1282`
  comment trap, the sentinel-row carry of R1 evidence without adding a
  protocol hook). Knowledge-breadth over the recon facts matters more than
  raw speed here; not the architecturally-open Opus-MAX shape Phase 1's
  call-graph was (one locked contract, a precedent handler to mirror) --
  Opus medium per X6 ("Opus medium when knowledge breadth matters more").

### Task 2 -- single subscription seam + single orchestration boolean in `extract.py`

- **Goal:** Wire the new handler into the pipeline through exactly one
  import + one boolean, default-on for ezQuake, fail-safe-off,
  byte-identical existing 8-file output.
- **Files:** `ezquake/extract.py` (modified).
- **Steps:**
  - [ ] Add one import line beside the existing handler imports
    (`extract.py:60-67`): `from _handler_hud import
    HudCommandsEzquakeHandler  # noqa: E402`.
  - [ ] Add one module-level boolean above `ALL_HANDLERS` (e.g.
    `ENABLE_HUD_COMMANDS_HANDLER = True`) with a one-line WHY comment
    (D9/X4: this on/off seam IS D2's per-fork gate; default on for ezQuake;
    FTE/QWCL/MVDSV never import it -- their own extract.py). One boolean,
    one place.
  - [ ] In the `ALL_HANDLERS` construction (`:72-83`), append
    `HudCommandsEzquakeHandler()` to the handler list ONLY when the boolean
    is True (e.g. build the list, then `if
    ENABLE_HUD_COMMANDS_HANDLER: handlers.append(HudCommandsEzquakeHandler())`
    before the `{h.name: h ...}` comprehension -- the minimal single-seam
    shape; the subagent picks the least-invasive concrete form that does
    not perturb the existing 8 instances/imports/order -- X3). When False,
    the handler is never constructed, never in `ALL_HANDLERS`, never
    subscribed: zero edges, no 9th file (X4 fail-safe-off).
  - [ ] No fail-safe try/wrap is needed at the seam beyond what the
    handler already does (a Visitor exception is already isolated by
    `_process_one_file`'s per-handler try/except, `extract.py:138-145`) --
    do NOT add new exception machinery (consistency; the existing isolation
    already biases to "emit nothing" = the safe direction). Confirm this in
    the recon, do not assume.
- **Verification (X3, the actual command -- not prose):**
  ```
  cd apps/qw-oracle
  # baseline: handler OFF (ENABLE_HUD_COMMANDS_HANDLER forced False)
  python3 scripts/extractors/ezquake/extract.py \
    --output-dir /tmp/hud-off --workers 12
  # handler ON (default True)
  python3 scripts/extractors/ezquake/extract.py \
    --output-dir /tmp/hud-on  --workers 12
  # every EXISTING handler JSON must be byte-identical off vs on:
  for f in ezquake-commands-ast.json ezquake-variables-ast.json \
           ezquake-macros-ast.json ezquake-cmdline-params-ast.json \
           ezquake-hud-elements-ast.json ezquake-keynames-ast.json \
           ezquake-asset-cvar-bindings-ast.json \
           ezquake-asset-loader-sites-ast.json ; do
    diff -q /tmp/hud-off/$f /tmp/hud-on/$f || echo "X3 FAIL: $f"; done
  # the 9th file exists ONLY in the ON run:
  test ! -e /tmp/hud-off/ezquake-hud-commands-ast.json \
    && test -s /tmp/hud-on/ezquake-hud-commands-ast.json \
    && echo "ADDITIVE OK" || echo "X3 FAIL: 9th-file additivity"
  ```
  PASS condition: the `diff -q` loop prints nothing (8 existing JSONs
  byte-identical off vs on) AND `ADDITIVE OK` prints. Additionally diff the
  handler-ON 8 files against the prior committed HEAD entity JSON -- also
  empty. FAIL condition: any `X3 FAIL` line or any diff output -- the
  handler perturbed existing output or its seam is not isolated; consult
  Recovery.
- **Execution mode:** `subagent (Sonnet medium)` -- bounded integration
  against a locked single-seam design (mirrors the operator-approved Phase-1
  Task-2 shape); reasoning required (minimal non-perturbing list edit) but
  not architectural. Sonnet-medium floor per X6.

### Task 3 -- Track-B self-validation harness `verify-hud-probes.py` (3 anchors + R7 + R1)

- **Goal:** Ship the Track-B self-validation probe LOGIC (X2): the 3 HUD
  known answers + the R7 zero-cvar guard + the R1 AST-confirm, all asserted
  against the handler's OWN emitted JSON -- never a later phase's artifact.
- **Files:** `ezquake/verify-hud-probes.py` (created).
- **Steps:**
  - [ ] Run the ezQuake extractor (or reuse a cached ON run) so
    `ezquake-hud-commands-ast.json` exists for the pinned `3f9e724f`
    source; load it. Sibling shape of `ezquake/verify-callgraph-probes.py`
    (Phase 1): a standalone script, exit non-zero with a LOUD per-probe
    report on any RED (D18 shape; probe LOGIC only -- Phase 4 composes it,
    this script does NOT wire the combined harness).
  - [ ] **Anchor 1 (bare-name positive).** Assert `hud_commands["radar"]`
    exists, `hud_family == "bare"`, `hud_element == "radar"`, `ast
    .handler_fn == "HUD_Func_f"`, `ast.registration_api == "Cmd_AddCommand"`,
    `ast.source_file == "hud_radar.c"`. RED if absent or any field wrong.
    (Dump cross-check is Phase 4 / D19 -- NOT asserted here; X2.)
  - [ ] **Anchor 2 (`+/-` positive).** Assert BOTH `hud_commands
    ["+hud_radar"]` and `hud_commands["-hud_radar"]` exist with
    `hud_element == "radar"`, families `plus`/`minus`, `handler_fn`
    `HUD_Plus_f`/`HUD_Minus_f`, `registration_api == "Cmd_AddRemCommand"`.
    RED if either missing or mis-keyed (radar's live gate is verified:
    arg3 == `HUD_PLUSMINUS`, arg7 `show` == `"0"` non-NULL -- both gates
    MUST pass).
  - [ ] **Anchor 3 (additivity / literal-control gate).** Assert
    `"togglehud" not in hud_commands` AND no key starts with `+hud_`/
    `-hud_` whose stem is not also a bare key (no orphan `+/-` without its
    element). `togglehud` is a plain `Cmd_AddCommand` (`hud.c:819`), NOT
    `HUD_Register` -- the handler must not over-reach into literal commands
    `_handler_commands.py` owns (the analogue of Track A's `cl_bobhead`
    gate). RED if `togglehud` present in the handler output.
  - [ ] **R7 probe (zero cvar emission).** Assert the emitted JSON contains
    NO cvar-shaped output: no top-level cvar container, and no
    `hud_commands` value carries `cvar_name`/`c_ident`/`storage_class`/
    `default_value` keys (the `_synthesize_hud_cvars mk()` shape). Assert
    every `hud_commands` key is a command name (bare `<stem>` or
    `[+-]hud_<stem>`), none matches `hud_<name>_<subvar>` cvar shape. RED
    if any cvar-shaped key/field appears (collision with
    `_handler_cvars.py:288-351`).
  - [ ] **R1 probe (AST-confirm 0 non-literal first args).** Assert
    `r1.nonliteral_count == 0` and `r1.nonliteral_first_arg_sites == []`.
    If non-zero: print the offending `file:line` + raw arg0 text and exit
    non-zero with a LOUD `R1 RED -- non-literal HUD_Register first arg(s)
    found; STOP. Do NOT constant-propagate (D1). Surface to operator: D8's
    literal-only premise is refuted at the AST level; this needs an
    operator amendment, not a code workaround.` This is the wired STOP
    default for R1 (the prime refuted-premise candidate the prior-phase
    note named).
  - [ ] Exit 0 only when all 3 anchors GREEN + R7 GREEN + R1 GREEN; print
    `ANCHOR 1/2/3 GREEN / R7 GREEN / R1 GREEN`. Any RED -> non-zero +
    per-probe report.
- **Verification:** `python3 scripts/extractors/ezquake/verify-hud-probes.py`
  exits 0 and prints `ANCHOR 1 GREEN`, `ANCHOR 2 GREEN`, `ANCHOR 3 GREEN`,
  `R7 GREEN`, `R1 GREEN`. PASS condition: exit 0, all GREEN. FAIL
  condition: non-zero exit or any RED probe.
- **Execution mode:** `subagent (Sonnet medium)` -- test authoring against
  a locked contract + live-verified known answers; reasoning, not
  architecture. Sonnet-medium per X6 (mirrors the approved Phase-1 Task-3).

## Verification (phase boundary)

Operator runs, YES/NO:

1. **Handler importable:**
   `python3 -c "import sys; sys.path.insert(0,'apps/qw-oracle/scripts/extractors/ezquake'); sys.path.insert(0,'apps/qw-oracle/scripts/extractors'); import _handler_hud as h; print(hasattr(h,'HudCommandsEzquakeHandler'))"`
   PASS condition: prints `True`.
2. **X3 zero-diff non-corruption (the actual command, empty result):** run
   the Task-2 Verification block. PASS condition: the `diff -q` loop over
   all 8 EXISTING handler JSONs prints NOTHING (byte-identical off vs on),
   `ADDITIVE OK` prints, and the handler-ON 8 files also diff-empty against
   the prior committed HEAD entity JSON. FAIL condition: any non-empty diff
   or any `X3 FAIL` line (asserted-in-prose is itself a FAIL -- the empty
   command output is the evidence; W3).
3. **Mechanism self-validation (3 anchors + R7 + R1, on the handler's OWN
   output):** `python3 scripts/extractors/ezquake/verify-hud-probes.py`
   PASS condition: exit 0, `ANCHOR 1 GREEN`, `ANCHOR 2 GREEN`, `ANCHOR 3
   GREEN`, `R7 GREEN`, `R1 GREEN` (radar bare emitted/element=radar;
   `+hud_radar`+`-hud_radar` emitted/element=radar; `togglehud` NOT
   emitted; zero cvar-shaped output; zero non-literal first args via the
   libclang AST). FAIL condition: non-zero exit or any RED probe.
4. **Toggle-off parity (X4):** with `ENABLE_HUD_COMMANDS_HANDLER` forced
   False, the extractor emits exactly the 8-file pipeline byte-for-byte and
   no 9th file (covered by check 2's baseline leg); `verify-hud-probes.py`
   is then not run (no signal exists when off -- correct, not a failure).

If all PASS, operator proceeds to Phase 3. If any FAIL, consult Recovery.
NOTE: Phase 2 verification reads ONLY the handler's emitted JSON and the
8-existing-file diff -- never an L1 column (no schema until Phase 3), never
the combined harness (Phase 4), never the runtime dump (Phase 4 answer key,
prerequisites item 4). That is X2 by construction (W4 guarded).

## Outputs to next phase

State now true that was not before:

- `ezquake/_handler_hud.py` exists: a Tier-3 ezQuake-private Visitor that,
  with the single boolean on, emits `ezquake-hud-commands-ast.json` --
  every `HUD_Register` site's bare `<name>` plus the gated
  `+hud_<name>`/`-hud_<name>`, each row carrying `hud_element` (the literal
  arg0 -- D16/R3-emit) and `hud_family` (bare|plus|minus), with an `r1`
  AST-confirm evidence block. Commands only; zero cvar output (R7).
- The single subscription seam + single boolean live in `ezquake/extract.py`;
  off == today's 8-file pipeline byte-for-byte (X4); on == that PLUS the 9th
  file, the 8 existing JSONs byte-identical (X3 proven by empty diff).
- `ezquake/verify-hud-probes.py` exists: the Track-B 3-anchor + R7 + R1
  probe LOGIC, GREEN, ready for Phase 4 to COMPOSE (not rebuild) into the
  combined one-time-per-fork harness beside Track A's 3-gate (D18/R5).
- Runnable state: the ezQuake extractor runs end-to-end with the handler
  on; the pipeline is committable at a working, byte-identical state (X1).
- Phase 3 (schema/loader) consumes the `hud_commands` JSON contract --
  `hud_element` + `hud_family` per recovered command -- as its Track-B
  input (D16/R3-store; D21 first-class `command` entities). Phase 2 ships
  NO schema and writes NO L1 column (D7.3 / D14 slot-3 representation
  boundary held). Phase 3 also reconciles the field names it consumes (see
  OQ-2). Phase 4 owns the runtime-dump cross-check (D19) and composes this
  phase's probes (D18) -- NOT done here (X2/W4).

## Open questions / deferred items

- **OQ-1 (R1 -- the wired STOP default; the prior-phase prime candidate).**
  - **Question:** D8/R1 require AST-confirming 0 non-literal `HUD_Register`
    first args before literal-only is load-bearing. The textual evidence
    (83 sites / 0 non-literal) holds, but the AST is the instrument; if the
    in-phase libclang pass finds a non-literal first arg, what happens?
  - **Default chosen for now:** the handler RECORDS it (Task 1
    `_nonliteral_sites` -> `finalize` `r1` block) and EMITS nothing for
    that site (no guess, no constant-propagation -- that would blend toward
    Track A, violating D1); the Task-3 R1 probe goes RED, the phase exits
    non-zero LOUD and STOPS for an operator amendment (the D7/D11 refuted-
    premise precedent). This is a designed in-phase gate, not a draft-time
    deviation -- D8's own text scopes the AST-confirm as the implementation
    gate. Recorded as the load-bearing R1 handling per the prior-phase
    note's explicit instruction.
  - **Who can resolve:** operator (if RED at execution -- it is an
    amendment, not a code workaround); otherwise resolved in-phase (the
    probe is the gate; expected GREEN per the verified evidence).
- **OQ-2 (R3 emit-vs-store boundary -- exact consumed field names).**
  - **Question:** Phase 2 emits `hud_commands[name] = {hud_family,
    hud_element, ast:{...}}`; Phase 3 (S) stores the D16 element link +
    D21 first-class command entity. The exact field names Phase 3 consumes
    (and whether `hud_element`/`hud_family` map to the D14 three-slot
    provenance spine verbatim) are Phase-3 (schema) scope (R3-store; R2
    field-shape).
  - **Default chosen for now:** emit the commands-handler `ast`-block
    idiom + `hud_element` + `hud_family` (the minimal element-keyed
    contract D16 needs); Phase 3 owns the L1 mapping. Phase 2 does NOT
    design schema (drift -- non-goal).
  - **Who can resolve:** Phase 3 (schema/loader). Flagged so the Phase-3
    drafter knows the exact JSON keys to consume.
- **OQ-3 (handler count vs D9 "8-handler architecture").**
  - **Question:** D9 says "matching the established 8-handler
    architecture"; this handler is the 9th.
  - **Default chosen for now:** D9's "8-handler architecture" names the
    established Visitor pattern/tier (sibling of `_handler_commands.py`),
    not a numeric cap; the new handler follows that exact pattern. No
    decision conflict (verified -- the new file is a Tier-3 sibling, not a
    structural change). Recorded for transparency, resolved in-phase.
  - **Who can resolve:** resolved in-phase (no `decisions.md` conflict).
- **Stale-filename observation (advisory; NOT a Phase-2 change).** Phase
  1's approved Task-2 X3 block lists `ezquake-cvars-ast.json` and
  `ezquake-cmdline-ast.json`; the live `output_filename` stems are
  `variables` and `cmdline-params`. Phase 2 uses the verified names.
  Surfaced to the orchestrator (not silently editing an approved phase --
  operator-not-technical-gate); harmless to Phase 1's mechanism, relevant
  only if Phase 1's literal X3 command is ever copy-run.
- **Verification sub-agent outcome (Explore, run after drafting).**
  CRITICAL: none. SUBSTANTIVE: none. ADVISORY: see the status report --
  the sub-agent independently grep-verified the HUD_Register contract
  cites, the `_handler_cvars.py` collision surface, the D9 hidden-ness
  (zero `Cmd_AddRemCommand` handlers), the radar anchor args, and X1-X10/
  D1/D8/D9/D11-amended/D16/R1/R3/R7 compliance against live source. No
  sub-agent finding contradicted `decisions.md`; no finding was rejected.
  No decision looked wrong; no deviation surfaced. Phase scope is fully
  resolved (the open items above are emit/store-boundary + the designed R1
  gate, not unresolved scope).

## Recovery (if verification fails)

Per failure mode (X9: recovery is re-run the corrected extract pipeline
end-to-end, NEVER an in-place SQL/data patch -- this phase writes no DB rows
at all, so any "fix the output" instinct is automatically wrong):

- **X3 zero-diff non-empty (check 2 FAIL):** the handler perturbed existing
  output -- it mutated shared state or the seam touched an existing handler.
  A Visitor must only append to its OWN `_rows`; it must never mutate
  `cursor`, `source_bytes`, `file_macros`, another handler's rows, or the
  `ALL_HANDLERS` order/instances. Find the write, make it append-only to
  the handler's own store, re-run the extractor, re-diff. Do NOT patch the
  diff or post-process the JSON.
- **Anchor 1/2 RED (radar bare or `+/-` missing/mis-keyed):** the literal
  model is wrong -- arg-index off-by-one, the `flags`/`show` gate logic
  inverted, or `hud_element` not set. Inspect the emitted row for `radar`
  vs the verified live `hud_radar.c:1422` args; fix the gate/index in
  `_handler_hud.py`; re-run. Never lower the anchor.
- **Anchor 3 RED (`togglehud` emitted, or orphan `+/-`):** the handler
  over-reached -- it is matching more than `HUD_Register` CALL_EXPRs, or
  emitting a `+/-` without its bare element. Restrict the `visit_cursor`
  filter to `cursor.spelling == "HUD_Register"` exactly; re-run. This is
  the additivity failure D10 anchor 3 exists to catch -- a hard stop.
- **R7 RED (cvar-shaped output):** the handler grew a cvar code path --
  delete it entirely (commands only; `_handler_cvars.py:288-351` owns
  `hud_<name>_<subvar>`). Re-run. A duplicate cvar emitter is a hard
  collision on `entities UNIQUE(project,type,name)` -- never "dedup
  around" it.
- **R1 RED (non-literal `HUD_Register` first arg via the AST):** the
  literal-only premise is refuted at the AST level. This is NOT a code
  bug to patch -- STOP, surface to the operator with the offending
  `file:line` + raw arg0 text. Do NOT constant-propagate / interprocedural-
  resolve (that blends toward Track A, violating D1). It needs an operator
  `decisions.md` amendment (the D7/D11 refuted-premise precedent), not a
  workaround.
- **Handler not importable / extractor aborts with the boolean on:** the
  per-handler isolation in `_process_one_file` (`extract.py:138-145`)
  should already contain a Visitor exception to "emit nothing" (the safe
  direction) without aborting the pipeline. If the extractor aborts, the
  seam added new un-isolated machinery -- remove it; the existing
  try/except is the fail-safe (X4/D9). Re-run.
- **Unanticipated failure:** route to operator with the exact command,
  output, and the emitted `ezquake-hud-commands-ast.json` -- do not
  improvise a fix that touches existing handler output.
