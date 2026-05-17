# Phase 1 -- Track A: call-graph reachability passenger

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` IN FULL (D1-D22 + the D11 amendment + X1-X10 +
>    non-goals). The brainstorm is closed -- do NOT re-open a D; if a D looks
>    wrong, surface a deviation block and STOP. -- DONE (deviation below).
> 2. Read `review-findings.md`; identify the F/R/W rows whose owning phase
>    role is this phase. Phase 1 = role "A": F2, F3, W2, W3, W4. -- DONE.
> 3. Recon the LIVE source before inlining anything. -- DONE; see "Recon
>    facts (verified)".
> 4. After drafting, dispatch the verification sub-agent. -- DONE; findings
>    applied, see "Open questions".

> **DEVIATION -- RESOLVED 2026-05-17 (operator-ratified; orchestrator
> overseer-re-verified the refuted premise against live source before
> routing). Option (a) ratified: minimal standalone textual scanner. The
> dated amendment is landed at `decisions.md` D7 AMENDMENT 2026-05-17; this
> phase is CLEARED to execute. Narrative below preserved as the record of
> the path (decisions.md D7.1 factual premise refuted by live recon;
> D11-shaped).**
>
> decisions.md D7 implication states: "The mechanism phase does not build the
> commented-register detector from scratch (the extractor already runs
> textual passes) but must surface feeder-tagged output." The drafter prompt
> repeats: "Phase 1 does NOT build the commented-register detector from
> scratch (the extractor already runs textual passes -- surface its output
> feeder-tagged per D7.1)."
>
> **Live recon refutes the premise.** There is NO commented-register textual
> detector anywhere in the live extractor. A repo-wide grep of
> `scripts/extractors/**/*.py` for commented-out-registration detection
> returns exactly one hit -- `ezquake/_legacy/extract-ezquake-cvars-clang.py:862`
> "Phase 2b: textual trailing-comment pass" -- which is the *trailing
> help-desc comment* pass (a different concern: it harvests `// description`
> after a live registration), it lives in the retired `_legacy/` archive,
> and it does NOT detect a commented-OUT `// Cvar_Register(...)`. The
> `gl_outline_scale_world` Class-2 classification in the shipped
> `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md` was
> produced by manual operator source-grep plus the runtime dump (the file
> says so: "re-verified by direct source grep"), NOT by an automated feeder.
>
> So "surface the extractor's existing commented-register textual-pass
> output" is not executable as written -- there is no such pass. This is the
> same `feedback_parking_verified_state_is_hypothesis` failure mode a locked
> decision caught at Pass 5 for D11 (the cvar half). It is surfaced here, not
> silently resolved.
>
> **Default this phase MD adopts pending operator ratification:** feeder (a)
> (call-graph "unreachable everywhere compiled") is fully built (Tasks 1-2).
> Feeder (b) (commented-register) is shipped as a *minimal standalone textual
> scanner* inside the same module file but architecturally separate from the
> call-graph (no AST, no edges, no BFS contact -- it reads raw source text;
> D1 no-blend preserved). This is the 80/20 that satisfies D7.1's *intent* (a
> separate textual feeder distinct from the call-graph, required for Gate 2:
> `gl_outline_scale_world` must surface via feeder b) without blending into
> the call-graph. It is a ~15-line regex scan, not a "detector built from
> scratch" in the sense the prompt forbids (that phrase assumed a banked pass
> to wrap; none exists).
>
> **Operator decision (OQ-1) -- RESOLVED 2026-05-17:** option (a) ratified
> -- ship feeder (b) as the minimal standalone textual scanner in
> `_callgraph.py`, architecturally separate from the call-graph (D1 no-blend
> preserved). D7.1's two-feeder structural split STANDS; Phase-4 Gate-2 and
> Phase-5 R4 unchanged. Authoritative record: `decisions.md` D7 AMENDMENT
> 2026-05-17 (+ review-findings F4/F5). This phase is no longer blocked.

## Goal

This phase delivers Track A's mechanism: a self-contained Tier-1 shared
module (`extractor_lib/_callgraph.py`, beside `_visitor.py` /
`clang_config.py`) that OBSERVES the existing single per-variant ezQuake walk
read-only -- collecting caller->callee edges, address-taken facts, and
entity->registrar bindings into its own private store -- then runs the
per-variant BFS post-walk (D3 root set = program-entry cascade UNION
address-taken closure; D4 full-subtree propagation; D5 three-valued
reachable / unreachable / not-compiled per the 4 ezQuake build variants with
conservative combination) and exposes ONE downstream contract:
`reachable(entity) -> {conclusion, per-variant evidence, feeder tag}`. The
commented-register concern is shipped as a SEPARATE textual scanner in the
same file, never built into the call-graph (D7.1; libclang strips comments).
Integration is a single subscription seam plus a single orchestration boolean
(D6/X4), fail-safe-off, default-on for ezQuake only. The phase is verified
ENTIRELY on the mechanism's own output: the 3-gate known-answer probes
(`sb_qtvlist_url` unreachable-everywhere via the call-graph feeder /
`gl_outline_scale_world` via the commented-register feeder / `cl_bobhead`
reachable through `V_Init`) run against the `reachable()` query and the
feeder output, NOT against any L1 column (no schema yet -- Phase 3) and NOT
against the combined harness (Phase 4). **Runnable, verifiable state at the
phase boundary:** the ezQuake extractor runs end-to-end with the passenger
toggled on; `reachable()` answers for the banked pool; the 3 known-answer
probes are GREEN against the mechanism's own output; and the existing entity
JSON is byte-identical to the toggle-off / prior-HEAD output, proven by the
actual diff command emitting an empty result (X3).

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

- **4 build variants (F3 CONFIRMED).** `extractor_lib/clang_config.py`
  defines exactly four ezQuake variants: `clang_args_for` (client),
  `clang_args_server_for` (= client + `-DSERVERONLY -DSERVER_ONLY`),
  `clang_args_win_for` (= client + `-DWIN32 -D_WIN32 -U__linux__` + Windows
  SDK stubs), `clang_args_apple_for` (= client + `-D__APPLE__ -U__linux__`).
  NOT the parking doc's "dual client/server, 27 macros" -- that prose is
  stale (also stale in `ezquake/CLAUDE.md` "Dual client/server parse").
  D5's per-config union MUST cover all 4.
- **The existing walk collapses win/apple to label "client" (LOAD-BEARING).**
  `ezquake/extract.py:134-137` dispatches the four TUs as
  `walk_tu_dispatch(tu_client,...,"client")`, `(tu_server,...,"server")`,
  `(tu_win,...,"client")`, `(tu_apple,...,"client")` -- win and apple ride
  the "client" label so existing handlers' dedup logic stays uniform
  (extract.py:119-126 comment). The call-graph passenger needs the TRUE
  4-way variant (D3/D5/F3) -- it cannot consume the collapsed label. The
  seam (Task 2) must convey the true variant to the observer ONLY, leaving
  every existing handler's "client"-collapsed label byte-unchanged (X3). See
  OQ-2.
- **Subscription seam shape (D6/X4).** `extract.py` builds `ALL_HANDLERS`
  (lines 72-83), `_split_handlers` partitions Visitor instances (lines
  97-102), `walk_tu_dispatch` delivers every cursor to every visitor.
  Parallel path: workers walk file-chunks, `end_file()` returns rows, the
  parent merges `rows_by_handler` (lines 257-265) then calls each handler's
  `finalize()`. The passenger fits this exactly: a Visitor that accumulates
  per-file edge/address-taken/registration rows, merged in the parent, with
  a post-walk BFS replacing the finalize step (it exposes `reachable()`, it
  does NOT write an entity JSON file -- D6 zero contact / X3).
- **Extractor walks only top-level `src/*.c` (extract.py:312,
  `iterdir()` non-recursive).** All entry/init functions are directly under
  `src/` (verified): the entire entry cascade is observable by the existing
  walk; no recursion gap.
- **Client entry cascade (D3 root set; Explore-verified, file:line):**
  `main` @ `src/sys_posix.c:318` -> `Host_Init(...)` @ `sys_posix.c:347`;
  `Host_Init` @ `src/host.c:633` runs the subsystem cascade `host.c:656-710`
  (`Cbuf_Init` 656, `Cmd_Init` 657, `Cvar_Init` 658, ... `SV_Init` 707
  `#ifndef CLIENTONLY`, `CL_Init` 709 unconditional); `CL_Init` @
  `src/cl_main.c:2094`, called at `host.c:709`; `V_Init` @ `src/cl_view.c:1127`,
  called from `CL_Init` at `src/cl_main.c:2121`; `Cvar_Init` @
  `src/cvar.c:1572`. So a cvar registered in `V_Init` IS reachable in the
  client cascade (Gate 3 ground truth).
- **Server entry cascade (D3, distinct):** `main` @ `src/sv_sys_unix.c:165`
  (and `src/sv_sys_win.c:731` for win-server) -> `Host_Init(...)` @
  `sv_sys_unix.c:169`; the SERVERONLY `Host_Init` @ `src/sv_main.c:3869`
  inside `#ifdef SERVERONLY` (`sv_main.c:3825-3954`); the client `Host_Init`
  @ `host.c:633` is unguarded. The server `Host_Init` never calls
  `CL_Init`/`V_Init`; `src/cl_view.c` is client-only (quakedef.h, not
  qwsvdef.h) -> NOT compiled in the SERVERONLY build. So in the server
  variant `cl_bobhead`'s registrar is **not-compiled** (D5's load-bearing
  third state), NOT "unreachable".
  > **F9 DATED CORRECTION 2026-05-17 (Phase-1 execution; narrative above
  > preserved as the record of the path -- decisions.md D5 AMENDMENT
  > 2026-05-17, operator-ratified; review-findings F9).** The sentence
  > "`src/cl_view.c` ... NOT compiled in the SERVERONLY build -> ...
  > **not-compiled** ... NOT 'unreachable'" is REFUTED at primary source.
  > It imported the historical `qwsv` dedicated-server model; ezQuake-
  > source has ONE `add_executable(ezquake)` over ONE 309-file source list
  > (all `cl_*.c` included), CMake never sets `SERVERONLY`, and `cl_view.c`
  > has no `SERVERONLY` preprocessor guard -> it parses non-empty under
  > `-DSERVERONLY`. Per the D5 AMENDMENT, not-compiled is preprocessor-
  > derivable ONLY; `cl_view.c`'s server-variant state is `reachable`
  > (BFS/D4) -- NEVER `not-compiled`. The conclusion `build-excluded`
  > (cl_bobhead is a live client cvar) is UNCHANGED and is the load-bearing
  > assertion (D3 intact; D19 level-3 safety unaffected).
- **Address-taken root shapes exist (D3.2/D4; one cite each):** command
  handler callback `Cmd_AddCommand("show", HUD_Show_f)` @ `src/hud.c:813`;
  cvar on_change function pointer in the 4th initializer field
  `cvar_t allow_scripts = {"allow_scripts","2",0,Rulesets_OnChange_allow_scripts}`
  @ `src/cl_main.c:98`; function-pointer table `log_t logs[MAX_LOG]` @
  `src/sv_ccmds.c:217-226` registered via loop
  `Cmd_AddCommand(logs[i].command, logs[i].function)` @ `sv_ccmds.c:1829`.
- **Registrar-derivation asymmetry commands vs cvars (LOAD-BEARING; D7.2
  imprecise as written).** Commands: `_handler_commands.py` maintains a
  `_func_stack` (`enter_function`/`exit_function`, lines 188/195-199) and
  records `enclosing_function = self._func_stack[-1]` at the
  `Cmd_AddCommand`/`Cmd_AddLegacyCommand` CALL_EXPR (line 248);
  `source_line` IS the registration call. The registrar is already captured
  for commands. Cvars: `_handler_cvars.py._extract_cvar_decl` records
  `source_file/source_line` from the `cvar_t X = {...}` VAR_DECL (lines
  124-126) -- the **struct declaration at file scope, NO enclosing
  function**; the `Cvar_Register(&X)` call is a SEPARATE site the existing
  handler does not bind to a registrar. VERIFIED: `cl_bobhead` decl @
  `cl_view.c:49` (file scope) vs `Cvar_Register(&cl_bobhead)` @
  `cl_view.c:1160` inside `V_Init` (`cl_view.c:1127`). So D7.2's "registrar
  is the enclosing function of the already-recorded registration site" holds
  literally only for commands; for cvars the passenger must itself detect
  `Cvar_Register`-family CALL_EXPRs during its read-only walk and bind the
  `&cvar` argument back to the cvar -> enclosing FUNCTION_DECL. This is
  inherent to D6 ("collecting caller->callee edges + address-taken facts
  read-only") and not a new mechanism, but the phrase "already-recorded" in
  D7.2 must be read as "the registration call exists in the AST the walk
  already traverses", NOT "lives in `cvar_versions.source_line`". Recorded
  in this MD so the executor is not misled.
- **Registration API surface (verified live).** Commands:
  `Cmd_AddCommand`, `Cmd_AddLegacyCommand` (`_handler_commands.py:184`
  `REGISTRATION_APIS`), plus the struct-table loop form
  (`_COMMAND_TABLE_TYPES`, e.g. `log_t`). Cvars: `Cvar_Register` (verified
  call shape `Cvar_Register(&X)` at all three probe sites), plus the
  nested-table loop form (`_handler_cvars.py._NESTED_CVAR_TABLE_TYPES`,
  `custom_model_color_t`, registered via
  `for (...) Cvar_Register(&custom_model_colors[i]...)`).
- **3-gate probe ground truth (verified live HEAD `3f9e724f`):**
  - `sb_qtvlist_url` -- `entities` type `cvar`, `cvar_versions` decl
    `EX_browser_qtvlist.c:30`; real (uncommented) `Cvar_Register(&sb_qtvlist_url)`
    @ `EX_browser_qtvlist.c:583`; enclosing fn `QTVList_Init(void)` @
    `EX_browser_qtvlist.c:579` which (shipped artifact, operator-verified)
    "appears exactly once in the entire src/ tree -- its own definition. No
    prototype, no call site anywhere." => feeder (a), MUST be
    unreachable-in-every-compiled-variant => genuine-dead core.
  - `gl_outline_scale_world` -- type `cvar`, decl `r_rmain.c:237`; the SOLE
    `Cvar_Register` is `// Cvar_Register(&gl_outline_scale_world);` @
    `r_rmain.c:730` (commented out). libclang strips it => INVISIBLE to the
    call-graph feeder => MUST surface via feeder (b) the textual scanner.
    This is the structural proof D7.1's two-feeder split is real.
  - `cl_bobhead` -- type `cvar`, decl `cl_view.c:49`;
    `Cvar_Register(&cl_bobhead)` @ `cl_view.c:1160` inside `V_Init`
    (`cl_view.c:1127`), reachable client/win/apple, **reachable** server
    [F9 DATED CORRECTION 2026-05-17: was "**not-compiled** server" --
    refuted premise, see the server-cascade bullet's F9 note +
    decisions.md D5 AMENDMENT; not-compiled is preprocessor-derivable
    only, `cl_view.c` is unguarded so the server cell is `reachable`].
    => reachable in >=1 variant => build-excluded (cleared, never accused
    -- the conclusion is UNCHANGED by F9 and is the load-bearing answer).
- **Pin + environment (prerequisites 1-3).** `research/repos/ezquake-source`
  HEAD = `3f9e724fa608e516040f02b9557808ff3efda53e` ("Merge pull request
  #1120 ... help-json-drift") == `oracle_meta` `ezquake:source_repo_commit`
  (L1 extracted at the same commit; version pin holds). `qw-oracle-postgres-dev`
  up 13 days healthy. `entities` has no `source_file` column -- registration
  cites live in `cvar_versions` / `command_versions` (`source_file`,
  `source_line`, `source_column`; `command_versions` also `handler_fn`,
  `registration_file`).
- **Pool numbers (F2/X7 -- banked, NOT re-derived here).** Use **74
  commands / 92 cvars** banked HEAD pool; Track-B reverse-diff **~129**.
  These are the spec's SHIPPED-section re-measure after mini-arc `8093e42f`
  and are F2-authoritative. NEVER the parking 77/97/166/132. NOTE: the
  shipped `ezquake-runtime-dead-entities.md` says "97 cvars / 74 commands"
  -- the **97 is the stale pre-mini-arc figure** (97 -> 92 reprune not
  reflected in that file); the artifact is the Phase-5 R4 *shape* reference
  ONLY, not a pool-count source. The 74/92 candidate pool is the runtime-vs-L1
  diff product; the diff needs the pinned runtime dump
  (`prerequisites.md` item 4) which is the ACCEPTANCE phase's answer key and
  is explicitly NOT a Phase-1 precondition. **Phase 1 does NOT re-run the
  runtime diff and does NOT re-derive 74/92** (X7). Its self-validation
  rests on the 3 probes' verified live-source ground truth above (X2/X8),
  which this drafting re-checked directly -- the honest X8 posture is: the
  runtime-diff pool is unverifiable in this phase by design; the 3 probes
  are verified.
- **W1 note (not Phase-1 blocking).** `/tmp/front1-diff.sh` +
  `/tmp/cmdline-liveness.sh` still present but `/tmp`-volatile; the pinned
  runtime dump location is unconfirmed. This is the acceptance phase's
  concern (`prerequisites.md` item 4); recorded only so the executor does
  not assume the dump is at hand for Phase 1 (it is not needed -- X2).

## Inputs from previous phase

This is the first phase. Inputs are the checked items in `prerequisites.md`:

- Item 1 (libclang extractor toolchain) -- SATISFIED; confirm at execution
  start that `ezquake/extract.py` runs end-to-end and emits its current
  entity JSON. That emitted JSON is the X3 zero-diff baseline.
- Item 2 (`research/repos/ezquake-source` pinned at `3f9e724f`) -- SATISFIED
  and re-verified during drafting; confirm again at execution start (a moved
  pin invalidates every line cite -- X8/W2; STOP if moved).
- Item 3 (Postgres dev container) -- NOT required by this phase (the 3-gate
  probes read the extractor's `reachable()` output, not the DB; the DB is
  only consulted at drafting time to confirm the 3 probe entities exist).
- Item 4 (durable pinned runtime dump) -- explicitly NOT a Phase-1
  precondition (X2 self-containment; the passenger self-validates on its own
  output). The orchestrator gates item 4 before the ACCEPTANCE phase, not
  here.

## Files touched

### Created

```
apps/qw-oracle/scripts/extractors/extractor_lib/_callgraph.py
    # Tier-1 shared, internal (underscore-prefix convention). Contains:
    #  (1) CallGraphObserver(Visitor): read-only edge / address-taken /
    #      entity->registrar collection over the existing walk.
    #  (2) post-walk per-variant root-set + BFS + 3-valued combination.
    #  (3) reachable(entity) -> {conclusion, per-variant evidence, feeder}.
    #  (4) scan_commented_registrations(text): SEPARATE textual feeder (b),
    #      no AST/edge/BFS contact (D1 no-blend; D7.1; see DEVIATION/OQ-1).
apps/qw-oracle/scripts/extractors/ezquake/verify-callgraph-probes.py
    # ezQuake-instantiated 3-gate known-answer probe harness. Imports
    # _callgraph, runs reachable()+feeder(b) for the 3 entities, asserts
    # the known answers. Probe LOGIC only (X2); Phase 4 composes it into
    # the combined one-time-per-fork harness (it does NOT wire that here).
    # Sibling of the existing ezquake/verify-unified-output.py.
```

### Modified

```
apps/qw-oracle/scripts/extractors/ezquake/extract.py
    # The SINGLE subscription seam + the SINGLE orchestration boolean
    # (D6/X4). Additive only: when the boolean is on (default on for
    # ezQuake, off otherwise), the CallGraphObserver is added to the
    # visitor pipeline AND fed the TRUE 4-way variant (client/server/win/
    # apple); the post-walk BFS runs in the parent after the existing
    # rows_by_handler merge. Existing handlers' "client"-collapsed variant
    # label and all existing entity JSON output stay byte-unchanged (X3).
    # Off => observer not subscribed => zero edges/BFS => today's pipeline
    # byte-for-byte (X4 fail-safe-off).
```

### Deleted

```
n/a -- this phase is purely additive (D6). A deletion that touched existing
handler output would violate X3.
```

## Tasks

### Task 1 -- build the Tier-1 call-graph module `_callgraph.py` (feeder a + feeder b)

- **Goal:** A self-contained shared module implementing the read-only
  observer, the per-variant root-set + full-subtree BFS + three-valued
  conservative combination, the `reachable()` contract, and the
  architecturally-separate commented-register textual scanner.
- **Files:** `extractor_lib/_callgraph.py` (created).
- **Steps:**
  - [ ] `CallGraphObserver(Visitor)`: in `enter_function`/`exit_function`
    maintain a function-name stack (mirror `_handler_commands.py:188/195-199`
    -- the proven pattern). In `visit_cursor`, for every `CALL_EXPR` record
    a `(caller=stack[-1], callee=cursor.spelling)` edge into a per-file list
    (caller is the enclosing FUNCTION_DECL; callee by name -- D6 edges are
    by spelling, stitched cross-file in the post-walk BFS).
  - [ ] Address-taken collection (D3.2): in `visit_cursor`, when a function
    identifier appears as a non-called reference -- a `DECL_REF_EXPR` whose
    referenced cursor is a `FUNCTION_DECL` and whose parent is NOT the callee
    position of a `CALL_EXPR` (covers: `Cmd_AddCommand("x", Foo_f)` arg,
    cvar 4th-field on_change `{"x","0",0,On_Change}`, struct-table `.function`
    fields, any callback assignment) -- record `Foo` as address-taken for
    this variant. Use the `_handler_cvars._resolve_var_ref` / `resolve_fn_ref`
    shapes already in `extractor_lib` for argument resolution; do not
    reinvent.
  - [ ] Entity->registrar binding. Commands: on `Cmd_AddCommand` /
    `Cmd_AddLegacyCommand` CALL_EXPR, bind literal arg-0 (and the macro/
    struct-table forms `_handler_commands.py` already handles) to
    `registrar = stack[-1]`. Cvars: on `Cvar_Register` /
    `Cvar_RegisterVariable` CALL_EXPR, resolve the `&cvar` argument to the
    cvar's C identifier -> cvar name (the existing `cvar_t` decl gives the
    name; reuse `_handler_cvars` resolution), bind to `registrar = stack[-1]`;
    also handle the nested-table loop form (`_NESTED_CVAR_TABLE_TYPES`). The
    registrar is the enclosing function of the registration CALL, NOT of the
    cvar struct declaration (see Recon: asymmetry).
  - [ ] `end_file()` returns the per-file edges + address-taken set +
    registrar bindings tagged with the TRUE variant (Task 2 feeds the true
    variant; the observer stores whatever it is given).
  - [ ] Post-walk (parent-side, after the existing `rows_by_handler` merge):
    for EACH of the 4 variants independently, build the directed call graph
    from merged edges; compute the root set = (program-entry cascade for
    that variant) UNION (address-taken closure for that variant). Seed the
    client/win/apple cascade from `main` (`sys_posix.c:318`) -> `Host_Init`
    (`host.c:633`); seed the server cascade from `main`
    (`sv_sys_unix.c:165` / `sv_sys_win.c:731`) -> SERVERONLY `Host_Init`
    (`sv_main.c:3869`). Roots are seeded by FUNCTION NAME (the BFS is
    name-based; the entry function names are the seed set, not file:line --
    cites are recorded for auditability/D15 evidence only).
  - [ ] Full-subtree BFS (D4): from every root, mark every transitively
    reachable callee reachable. Address-taken roots are FULLY traversed
    (not dead-end markers) -- their entire downstream subtree is reachable.
    Do NOT add any "tighten" / shrink heuristic (D4 implication).
  - [ ] Three-valued per-variant state (D5): for an entity's registrar
    function, per variant resolve to **reachable** (registrar in the BFS
    reachable set), **unreachable** (registrar present in this variant's
    compiled TU set but not reached), or **not-compiled** (registrar's
    function not in this variant's compiled TU set at all -- physically
    distinct from unreachable; this is the load-bearing third state, e.g.
    `cl_view.c` functions in the SERVERONLY variant). not-compiled MUST be
    a distinct enum value, never collapsed into unreachable.
  - [ ] Conservative combination (D3/D5): reachable in >=1 compiled variant
    -> conclusion **build-excluded** (cleared; never accused). unreachable
    in EVERY compiled variant AND compiled in >=1 -> conclusion
    **genuine-dead**. D3/D4 residue (a genuinely-dead but address-taken
    function marked reachable) lands in build-excluded (human-gated), never
    genuine-dead. Any failure to resolve biases to **build-excluded** /
    reachable (X4 fail-safe; D3 safe direction) -- never to genuine-dead.
  - [ ] `reachable(entity) -> dict` contract: `{ "conclusion":
    "genuine-dead" | "build-excluded", "feeder": "callgraph" |
    "commented-register", "evidence": <feeder-tagged> }` where the
    callgraph-feeder evidence is the per-variant breakdown
    `{client: state, server: state, win: state, apple: state}` plus an
    address-taken-residue flag, and the commented-register-feeder evidence
    is the textual register-site cite (file:line). This is D15's
    feeder-tagged evidence shape at the mechanism layer; representation in
    L1 is Phase 3, not here.
  - [ ] `scan_commented_registrations(source_text, file_name) -> list[(name,
    file:line)]`: a standalone function (NOT a method of the Visitor; no
    AST, no edges, no BFS) that regex-scans raw source text for
    `^\s*//\s*(Cvar_Register|Cvar_RegisterVariable|Cmd_AddCommand)\s*\(\s*&?\s*(\w+)`
    and yields the disabled-registration name + cite. `reachable()` consults
    this for an entity the call-graph feeder found to have NO registration
    call at all (e.g. `gl_outline_scale_world`): if a commented registration
    exists, conclusion = genuine-dead, feeder = commented-register, evidence
    = the cite. Architecturally separate per D1/D7.1 (see DEVIATION/OQ-1).
- **Verification:** `python3 -c "import sys;
  sys.path.insert(0,'apps/qw-oracle/scripts/extractors');
  import extractor_lib._callgraph as cg;
  print(hasattr(cg,'CallGraphObserver'),
  hasattr(cg,'scan_commented_registrations'))"` prints `True True`. Full
  behavioural verification is Task 4's 3-gate probes (X2 -- this phase's own
  output).
- **Execution mode:** `subagent (Opus MAX)` -- this is THE call-graph
  mechanism design+synthesis: root-set theory, conservative-combination
  correctness (a wrong rule false-accuses a live entity -> a wrong upstream
  delete PR), the cross-variant BFS model, the cvar-registrar asymmetry.
  Architecturally load-bearing and correctness-critical per X6.

### Task 2 -- single subscription seam + single orchestration boolean in `extract.py`

- **Goal:** Wire the observer into the pipeline through exactly one
  subscription point and one boolean, feeding it the TRUE 4-way variant,
  default-on for ezQuake / off otherwise, fail-safe-off, byte-identical
  existing output.
- **Files:** `ezquake/extract.py` (modified).
- **Steps:**
  - [ ] Add one module-level boolean (e.g. `ENABLE_CALLGRAPH_PASSENGER =
    True`) with a one-line WHY comment (D6/X4: this on/off seam IS D2's
    per-fork gate; on for ezQuake only). One boolean, one place.
  - [ ] One subscription point: when the boolean is on, instantiate
    `CallGraphObserver` and include it in the visitor list. When off, it is
    never constructed and never subscribed (zero edges/BFS/cost -- X4).
  - [ ] Feed the TRUE variant. The existing four `walk_tu_dispatch` calls
    (extract.py:134-137) pass `"client"/"server"/"client"/"client"`; do NOT
    change those args (existing handlers depend on the collapsed label --
    X3). Convey the true variant (`client`/`server`/`win`/`apple`) to the
    observer ONLY -- e.g. set an attribute on the observer instance before
    each of the four dispatch calls, or a thin observer-only wrapper. The
    exact minimal mechanism is the subagent's call within these constraints:
    single seam, observer-only, existing labels untouched.
  - [ ] After the existing `rows_by_handler` merge (parent side, lines
    ~257-265 parallel / end of `_run_serial`), run the observer's post-walk
    BFS so `reachable()` is queryable. This replaces a `finalize()` write
    for this observer -- it writes NO entity JSON file (D6 zero contact;
    X3).
  - [ ] Fail-safe: wrap observer construction/post-walk so ANY exception
    disables the passenger (logs loudly, `reachable()` then yields
    build-excluded/reachable for all -- D3 safe direction) and never aborts
    or alters the existing pipeline (X4/D6).
- **Verification (X3, the actual command -- not prose):**
  ```
  # baseline: passenger OFF
  cd apps/qw-oracle && python3 scripts/extractors/ezquake/extract.py \
    --output-dir /tmp/cg-off --workers 12   # with ENABLE flag forced off
  # passenger ON (default)
  python3 scripts/extractors/ezquake/extract.py \
    --output-dir /tmp/cg-on  --workers 12
  # every existing entity JSON must be byte-identical:
  # [ORCHESTRATOR CORRECTION 2026-05-17] cvars/cmdline stems fixed to the
  # LIVE output_filename values (verified `grep output_filename _handler_*.py`):
  # was ezquake-cvars-ast.json / ezquake-cmdline-ast.json -- those files do
  # NOT exist; the loop would have skipped X3 on the two most load-bearing
  # types (cvars = 92 of the pool). Surfaced by the Phase-2 drafter's
  # cross-check; the Phase-1 review missed it (review-findings F6).
  for f in ezquake-commands-ast.json ezquake-variables-ast.json \
           ezquake-macros-ast.json ezquake-cmdline-params-ast.json \
           ezquake-hud-elements-ast.json ezquake-keynames-ast.json \
           ezquake-asset-cvar-bindings-ast.json \
           ezquake-asset-loader-sites-ast.json ; do
    diff -q /tmp/cg-off/$f /tmp/cg-on/$f || echo "X3 FAIL: $f"; done
  ```
  PASS condition: the loop prints nothing (every existing handler JSON
  byte-identical off vs on). FAIL condition: any "X3 FAIL" line, or any diff
  output -- the observer is not a pure read-only passenger; consult Recovery.
- **Execution mode:** `subagent (Sonnet medium)` -- bounded integration
  against a locked seam design; reasoning required (the true-variant
  side-channel) but not architectural. Sonnet-medium floor per X6.

### Task 3 -- ezQuake 3-gate known-answer probe harness `verify-callgraph-probes.py`

- **Goal:** Ship the Track-A self-validation probe LOGIC (X2): the three
  known answers asserted against the mechanism's OWN output, not any later
  phase's artifact.
- **Files:** `ezquake/verify-callgraph-probes.py` (created).
- **Steps:**
  - [ ] Import `_callgraph`, run the ezQuake extractor (or reuse a cached
    run) so `reachable()` is populated for the pinned `3f9e724f` source.
  - [ ] Gate 1 (feeder a, genuine-dead): assert
    `reachable(cvar "sb_qtvlist_url")` -> conclusion `genuine-dead`, feeder
    `callgraph`, evidence per-variant = unreachable in every compiled
    variant (registrar `QTVList_Init` has no caller). RED if conclusion is
    build-excluded or feeder is commented-register.
  - [ ] Gate 2 (feeder b, commented-register): assert
    `reachable(cvar "gl_outline_scale_world")` -> conclusion `genuine-dead`,
    feeder `commented-register`, evidence = textual cite at
    `r_rmain.c:730`. RED if the call-graph feeder claims it (it must be
    invisible to feeder a -- comment-stripped) or if no commented-register
    cite is found.
  - [ ] Gate 3 (reachable / build-explained): assert
    `reachable(cvar "cl_bobhead")` -> conclusion `build-excluded`, feeder
    `callgraph`, evidence per-variant = reachable in client/win/apple AND
    `reachable` in server. RED if conclusion is genuine-dead, or if server
    is reported `not-compiled`.
    > **F9 DATED CORRECTION 2026-05-17 (decisions.md D5 AMENDMENT,
    > operator-ratified; review-findings F9).** Original Gate 3 expected
    > `not-compiled` server and RED-on-"unreachable" -- that rested on the
    > refuted historical-qwsv premise. Per the D5 AMENDMENT not-compiled is
    > preprocessor-derivable ONLY; `cl_view.c` is unguarded so the
    > mechanism correctly resolves `cl_bobhead` server -> `reachable`
    > (harness-confirmed actual + primary-source-explained). The
    > LOAD-BEARING assertion is conclusion `build-excluded` (UNCHANGED --
    > a live client cvar; D3 intact). The executor implements
    > `verify-callgraph-probes.py` Gate 3 to this corrected expectation
    > (server `reachable`, RED iff conclusion != build-excluded OR server
    > == not-compiled) and re-runs the 3-gate GREEN.
  - [ ] Exit non-zero with a LOUD per-gate report on any RED (D18 shape;
    this is the probe LOGIC -- Phase 4 composes it into the combined
    one-time-per-fork gate, this script does NOT wire that).
- **Verification:** `python3 scripts/extractors/ezquake/verify-callgraph-probes.py`
  exits 0 and prints `GATE 1 GREEN / GATE 2 GREEN / GATE 3 GREEN`.
  PASS condition: exit 0, all three GREEN. FAIL condition: non-zero exit or
  any RED gate.
- **Execution mode:** `subagent (Sonnet medium)` -- test authoring against
  a locked contract + verified known answers; reasoning, not architecture.

## Verification (phase boundary)

Operator runs, YES/NO:

1. **Module importable:**
   `python3 -c "import sys; sys.path.insert(0,'apps/qw-oracle/scripts/extractors'); import extractor_lib._callgraph as cg; print(hasattr(cg,'CallGraphObserver') and hasattr(cg,'reachable') and hasattr(cg,'scan_commented_registrations'))"`
   PASS condition: prints `True`.
2. **X3 zero-diff non-corruption (the actual command, empty result):** run
   the Task-2 Verification block. PASS condition: the `diff -q` loop over
   all 8 existing handler JSONs prints NOTHING (byte-identical passenger
   off vs on). Additionally diff the passenger-ON output against the prior
   committed HEAD entity JSON -- also empty.
   FAIL condition: any non-empty diff or any "X3 FAIL" line (asserted-in-prose
   is itself a FAIL -- the empty command output is the evidence).
3. **Mechanism self-validation (3-gate, on the mechanism's OWN output):**
   `python3 scripts/extractors/ezquake/verify-callgraph-probes.py`
   PASS condition: exit 0, `GATE 1 GREEN`, `GATE 2 GREEN`, `GATE 3 GREEN`
   (sb_qtvlist_url genuine-dead/callgraph-feeder/unreachable-everywhere;
   gl_outline_scale_world genuine-dead/commented-register-feeder;
   cl_bobhead build-excluded/reachable-client+win+apple/reachable-server
   [F9 DATED CORRECTION 2026-05-17: was "not-compiled-server" -- refuted
   premise; decisions.md D5 AMENDMENT, review-findings F9. The load-bearing
   answer is conclusion build-excluded, UNCHANGED]).
   FAIL condition: non-zero exit or any RED gate.
4. **Toggle-off parity (X4):** with the boolean forced off, the extractor
   output equals today's pipeline byte-for-byte (covered by check 2's
   baseline leg) AND `verify-callgraph-probes.py` is not run (no signal
   exists when off -- that is correct, not a failure).

If all PASS, operator proceeds to Phase 2. If any FAIL, consult Recovery.
NOTE: Phase 1 verification reads ONLY the `reachable()` query, the feeder
output, and the extractor JSON diff -- never an L1 column (no schema until
Phase 3) and never the combined harness (Phase 4). That is X2 by
construction (W4 guarded).

## Outputs to next phase

State now true that was not before:

- `extractor_lib/_callgraph.py` exists: a read-only Tier-1 passenger that,
  with the single boolean on, answers `reachable(entity) ->
  {conclusion, feeder-tagged evidence}` for the banked pool at any version
  it walks, with the two structurally-separate feeders (callgraph;
  commented-register).
- The single subscription seam + single boolean live in `ezquake/extract.py`;
  off == today's pipeline byte-for-byte (X4); on == today's pipeline PLUS
  the queryable signal, existing entity JSON byte-identical (X3 proven by
  empty diff).
- `ezquake/verify-callgraph-probes.py` exists: the Track-A 3-gate probe
  LOGIC, GREEN, ready for Phase 4 to COMPOSE (not rebuild) into the combined
  one-time-per-fork harness.
- Runnable state: the ezQuake extractor runs end-to-end with the passenger
  on; the pipeline is committable at a working, byte-identical state (X1).
- Phase 2 (Track B, `ezquake/_handler_hud.py`) starts cold against this; it
  shares NO code, NO schema discriminator, NO gate with this module (D1).
  Phase 3 (schema/loader) consumes the `reachable()` contract shape (D15
  feeder-tagged per-variant evidence) as its input -- but Phase 1 ships NO
  schema and writes NO L1 column (D7.3 representation boundary held).

## Open questions / deferred items

- **OQ-1 (DEVIATION -- RESOLVED 2026-05-17, operator-ratified).**
  - **Question:** decisions.md D7.1 / the drafter prompt assert "the
    extractor already runs textual passes [for commented-register] --
    surface its output feeder-tagged"; live recon proves no such pass
    exists (only a retired `_legacy/` trailing-help-comment pass, a
    different concern). "Surface existing output" is not executable.
  - **Resolution (operator-ratified 2026-05-17; orchestrator
    overseer-re-verified the refuted premise against live source before
    routing):** option (a) -- ship feeder (b) as a minimal standalone
    textual scanner in `_callgraph.py`, architecturally separate from the
    call-graph (no AST/edge/BFS contact -- D1 no-blend), satisfying D7.1's
    INTENT and Gate 2. This was NOT a sub-agent finding overridden by a
    decision -- it was a decision whose factual premise live verification
    refuted (the `feedback_parking_verified_state_is_hypothesis` /
    D11-strike shape), surfaced and routed, not silently resolved.
  - **Recorded by:** `decisions.md` D7 AMENDMENT 2026-05-17 (authoritative)
    + review-findings F4/F5 + the resolved deviation block at the top of
    this MD. D7.1's two-feeder structural split STANDS; Phase-4 Gate-2 and
    Phase-5 R4 are unchanged. Phase 1 is CLEARED to execute.
- **OQ-2.**
  - **Question:** the existing walk collapses win/apple to label "client"
    (extract.py:134-137). The passenger needs the true 4-way variant. The
    exact minimal side-channel (per-dispatch observer attribute vs an
    observer-only wrapper) is left to the Task-2 subagent within hard
    constraints (single seam, observer-only, existing labels untouched --
    X3).
  - **Default chosen for now:** Task-2 subagent picks the minimal mechanism
    honoring the constraints; the X3 zero-diff probe is the objective gate
    that the choice did not perturb existing output.
  - **Who can resolve:** Phase 1 executor (Task 2), bounded by the X3 probe;
    escalate to operator only if no side-channel satisfies X3.
- **OQ-3 (drafter-chosen Gate-3 tightening -- NOT a sub-agent finding).**
  - **Question:** should Gate 3 also assert the address-taken-residue flag
    is absent for `cl_bobhead` (it is a normal reachable cvar, no residue)?
  - **Default chosen for now:** yes -- Task 3 Gate 3 additionally asserts
    `evidence.address_taken_residue == false` for `cl_bobhead`, tightening
    the known answer at no cost. Recorded honestly as a drafter decision,
    not attributed to the verifier.
  - **Who can resolve:** resolved in-phase (folded into Task 3).
- **Verification sub-agent outcome (Explore, run after drafting).**
  CRITICAL: none. SUBSTANTIVE: none. ADVISORY: 11 items, ALL confirmations
  that the draft is correct (no change requested) -- it independently
  grep-verified the OQ-1 deviation is factually correct (zero live
  commented-register detectors outside `_legacy/`), spot-checked the
  registrar-asymmetry claim, the 3 probe ground truths, and the
  entry-cascade cites against live source, and confirmed F2/F3/X2/X3/D1/X10
  compliance. No sub-agent finding contradicted `decisions.md`; no finding
  was rejected. The one decision-shaped issue (OQ-1) is a refuted premise
  surfaced as a deviation, not a rejected finding. Phase scope is otherwise
  fully resolved.

## Recovery (if verification fails)

Per failure mode (X9: recovery is re-run the corrected extract pipeline
end-to-end, NEVER an in-place SQL/data patch -- this phase writes no DB rows
at all, so any "fix the output" instinct is automatically wrong):

- **X3 zero-diff non-empty (check 2 FAIL):** the observer is not a pure
  read-only passenger -- it wrote into shared handler state or perturbed
  walk order. Find the write (it must only append to its OWN private store;
  it must never mutate `cursor`, `source_bytes`, `file_macros`, another
  handler's rows, or the visitor list). Make it read-only, re-run the
  extractor, re-diff. Do NOT patch the diff or post-process the JSON.
- **Gate 1 RED (sb_qtvlist_url not genuine-dead):** the BFS over-reached --
  most likely an address-taken false positive made `QTVList_Init`
  spuriously a root, or a name-collision edge. Inspect the per-variant
  evidence; fix the edge/address-taken rule in `_callgraph.py`; re-run.
  Never lower the probe. (Conservative bias means the safe failure is the
  OTHER direction -- Gate 1 RED means the mechanism is too aggressive,
  which is the dangerous direction D3 forbids: treat as a hard stop.)
- **Gate 2 RED (gl_outline_scale_world via call-graph feeder, or not found):**
  either the comment was not stripped (impossible with libclang -- check the
  scanner regex / file read) or feeder (b) did not run. Fix
  `scan_commented_registrations`; re-run. If the issue is that OQ-1 was not
  resolved, this gate is BLOCKED on the operator deviation decision, not a
  code bug.
- **Gate 3 RED (cl_bobhead genuine-dead, or server "unreachable" not
  "not-compiled"):** the third state collapsed -- the variant TU-membership
  check is treating "function absent from the SERVERONLY compiled set" as
  "unreachable". not-compiled MUST be physically distinct (D5). Fix the
  state resolution; re-run. Never lower the probe.
- **Module not importable / extractor aborts with the boolean on:** the
  fail-safe wrapper (Task 2) is missing or wrong -- any passenger exception
  must disable the passenger and fall back to today's pipeline LOUDLY, never
  abort the extractor (X4/D6). Restore fail-safe; re-run.
- **Unanticipated failure:** route to operator with the exact command,
  output, and the per-variant evidence dump -- do not improvise a fix that
  touches existing handler output.
