# MVDSV Extractor Out-of-Scope Findings

After Phase 2e ship + runtime validation against Ciscon's 1.20-dev dump
(2026-04-27), residual gaps in the runtime diff fall into the following
buckets. Post Task 21 iteration, the diff harness reports zero
"I don't know what this is" entries: the only remaining residual entries
(`sys_sleep` DB-only, `localcommand` DB-only) are categorized below.

Final diff state (after allowlist refinement, 2026-04-27):

```
=== type=cvar ===
Runtime (pre-KTX-filter):  758
Runtime (post-KTX-filter): 182
DB (source_backed):        183
Intersect:                 182
Runtime-only: (none)
DB-only:      sys_sleep              -- platform-specific, see below

=== type=command ===
Runtime (pre-KTX-filter):  107
Runtime (post-KTX-filter): 107
DB (source_backed):        108
Intersect:                 107
Runtime-only: (none)
DB-only:      localcommand           -- runtime-conditional, see below
```

---

## Bucket 1 (Out-of-scope by design)

(Empty -- MVDSV's seven entity types all extract via Pattern 1 derivatives:
`Cvar_Register` on statically-declared `cvar_t` structs, `Cmd_AddCommand`
literal-string args, `cmdline_param_*` macro family, `svc_*`/`clc_*` defines,
info-key string literals, log-template format-string args, QC builtin
registration table.)

---

## Bucket 2: Dynamic Cvar_Create registrations

These cvars are created at runtime via `Cvar_Create("name", ...)` where the
name argument is a runtime-resolved value (loop variable, function argument,
QC string parameter). Static AST extraction cannot enumerate runtime string
contents.

| Site | Pattern | Runtime population |
|---|---|---|
| `src/sv_init.c:592-595` | NQ-progs compatibility loop iterating `nqcvars[] = {"gamecfg", "scratch1", "scratch2", "scratch3", "scratch4", "saved1", "saved2", "saved3", "saved4", "savedgamecfg", "temp1", NULL}` | Only registered when `pr_nqprogs` is set (NetQuake progs loaded). KTX uses standard QW progs; these eleven cvars never register on Ciscon's server. |
| `src/cvar.c:512` | `Cvar_Create(var_name, Cmd_Argv(2), CVAR_USER_CREATED)` inside `Cvar_Set_f` | User-created cvars via console `set <name> <value>`. Names entirely operator-driven; cannot be statically enumerated. |
| `src/pr_cmds.c:2613` | `Cvar_Create(name, value, 0)` inside `PF_registercvar` | QC builtin `#27 registercvar`. KTX progs may or may not call this; what gets registered depends on which mod is loaded. |

None of these surface in Ciscon's 1.20-dev runtime dump on top of what the
extractor already captures (NQ-progs path is unreached, no user-created
cvars appear in `cvarlist`, KTX doesn't appear to invoke `registercvar` for
any name lacking the `k_*`/`_k_*` prefixes already filtered).

The Bucket 2 surface is small enough that a future enhancement could
hard-code the eleven NQ-progs names if NQ-progs servers come into scope.
For now the extractor leaves them out and the diff harness shows zero
runtime-only residual.

## Bucket 3: Sprintf-built cvar names

(Empty -- no `Cvar_FindOrCreate` exists in MVDSV source; no `va()` /
`sprintf()` / `snprintf()` call sites observed building cvar names. The
extractor's static literal-string capture is sufficient.)

---

## KTX-progs registrations (filtered by prefix or allowlist)

The diff harness filters cvars/commands registered by KTX QuakeC out of the
runtime dump before comparing against the MVDSV C-source DB. Two filter
mechanisms:

**Prefix file** (`validation-fixtures/ktx-progs-prefixes.txt`): covers the
standard `k_`, `_k_`, `__k_`, `add_q_`, `dmm4_` prefixes. Most KTX cvars
registered via `RegisterCvar`/`RegisterCvarEx` in `ktx/src/world.c` use
these.

**Allowlist file** (`validation-fixtures/ktx-progs-allowlist.txt`): carries
KTX registrations without standard prefixes. After Task 21 investigation
the allowlist contains exactly the 13 names below; each was confirmed
KTX-only (zero hits in `research/repos/mvdsv/src/`) and located in
`research/repos/ktx/src/`:

| Name | KTX registration site | Rationale |
|---|---|---|
| `allow_spec_wizard` | `ktx/src/world.c:820` (RegisterCvar) | Spectator wizard mode flag. Consumed by `ktx/src/spectate.c:46`. |
| `allow_timing` | `ktx/src/world.c:849` (RegisterCvar) | Timing-overlay enable flag. Consumed by `ktx/src/client.c:135`. |
| `allow_toggle_practice` | `ktx/src/world.c:876` (RegisterCvar) | Practice-mode toggle flag. Consumed by `ktx/src/commands.c:4905`. |
| `demo_scoreslength` | `ktx/src/world.c:850` (RegisterCvarEx, default `"10"`) | Post-match score-display duration. Consumed by `ktx/src/client.c:690`. |
| `demo_skip_ktffa_record` | `ktx/src/world.c:937` (RegisterCvar) | Suppress demo recording in FFA mode. Consumed by `ktx/src/match.c:2358`. |
| `demo_tmp_record` | `ktx/src/world.c:936` (RegisterCvarEx, default `"0"`) | Temp-demo recording flag. Consumed by `ktx/src/match.c:2346`. |
| `dp` / `dq` / `dr` | `ktx/src/world.c:866-868` (RegisterCvar) | Powerup drop flags (P/Q/R). Consumed by `ktx/src/sp_monsters.c:665-680` via `k_pow_*` macros. |
| `lock_practice` | KTX consume-only at `ktx/src/g_main.c:521`, `ktx/src/client.c:3024` | Practice-mode lock. Registration site not a `RegisterCvar` call but evidently created on-demand by KTX progs. |
| `srv_practice_mode` | KTX consume-only at `ktx/src/world.c:549-551` | Server practice-mode flag. Registered dynamically. |
| `timing_players_action` | `ktx/src/world.c:848` (RegisterCvar) | Timing-action category. Consumed by `ktx/src/client.c:132`. |
| `timing_players_time` | `ktx/src/world.c:847` (RegisterCvar) | Timing-display duration. Consumed by `ktx/src/client.c:131`. |

Note: the previous allowlist contained seven false-positive entries
(`download_map_url`, `extralogname`, `frag_log_type`, `password`,
`pausable`, `vip_password`, `vip_values`) that are MVDSV-source cvars
genuinely visible in both DB and runtime. Removing them from the allowlist
let those rows intersect cleanly. KTX consumes `extralogname` and
`pausable` via `cvar()`/`cvar_set()` calls but does not register them; the
registration sites are in MVDSV `sv_main.c`/`sv_demo.c`.

---

## Platform-specific (DB but not on this runtime's platform)

| Name | Type | DB source | Why absent from Ciscon's runtime |
|---|---|---|---|
| `sys_sleep` | cvar | `src/sv_sys_win.c:29` (`cvar_t sys_sleep = {"sys_sleep", "8"}`) | Defined only in the Windows path. Ciscon's server is Linux ARM64; `sv_sys_unix.c` is compiled instead and exposes `sys_extrasleep` (which DOES appear in the runtime). Validation against a Windows MVDSV server would surface `sys_sleep`. |

The extractor parses `sv_sys_win.c` and `sv_sys_unix.c` together (libclang
walks both translation units), so the DB carries the union of platform
cvars. This is intentional -- the knowledge DB documents what MVDSV CAN
expose, not just what one specific build produced.

---

## Runtime-conditional (DB but not exposed without the right cmdline flag)

| Name | Type | DB source | Gating mechanism |
|---|---|---|---|
| `localcommand` | command | `src/sv_ccmds.c:1857` (`Cmd_AddCommand("localcommand", SV_LocalCommand_f)`) | Wrapped in `if (SV_CommandLineEnableLocalCommand())` -- `server.h:1107/1115` defines this as `COM_CheckParm("-enablelocalcommand")` (or its enum equivalent). Ciscon's server does not pass `-enablelocalcommand`, so registration is skipped. |

The static AST extraction correctly captures the registration site (the
`Cmd_AddCommand` call exists in source); runtime simply omits it when the
operator does not enable the feature. A server passing `-enablelocalcommand`
would expose `localcommand` in `cmdlist`.

---

## Head-delta (post-1.20-dev additions)

(Empty after this iteration. The extractor was run against MVDSV `head`,
and the only DB-vs-runtime asymmetry that initially looked head-delta-like
turned out to be the platform-specific `sys_sleep` entry above.)

---

## Genuine extractor gaps

(None found in Task 21. All residual entries categorize cleanly into the
buckets above.)
