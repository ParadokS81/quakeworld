# MVDSV Pass 1 Inventory (2026-04-27)

Source tree: `research/repos/mvdsv/src/` -- 60,152 lines across 88 .c/.h files.

---

## Registration APIs

### Cvar registration

- **Static (Bucket 1, extractable):** `Cvar_Register` -- 194 call sites.
  - Defined at `src/cvar.c:240`: `void Cvar_Register(cvar_t *variable)`
  - Called with a pointer to a statically-declared `cvar_t` struct. The struct fields
    `name`, `string`, and `flags` are set at declaration site (same TU or header).
  - `cvar_t` struct (src/cvar.h:66): `name`, `string`, `flags`, `OnChange`, `value`.
    Flags: `CVAR_NONE`, `CVAR_SERVERINFO` (1<<0), `CVAR_ROM` (1<<1), `CVAR_USER_CREATED` (1<<2).
    No `CVAR_ARCHIVE` -- MVDSV is a dedicated server, no config save.
  - `Cvar_SetCurrentGroup` / `Cvar_ResetCurrentGroup` are no-op macros
    (src/cvar.h:77-78, ezquake compatibility shims). The extractor can ignore them.

- **Dynamic (Bucket 2, out of static reach):** `Cvar_Create` (6 sites), `Cvar_Find` (19 sites).
  Both take string arguments at runtime and cannot be resolved by a static AST walk.
  `Cvar_FindOrCreate` was not found in the source tree.

### Command registration

- `Cmd_AddCommand` only -- 114 call sites. Confirmed: no `Cmd_AddCommandD`,
  no `Cmd_AddLegacyCommand`.

### Log / print channels (relevant to Task 11 log-templates handler)

The following are the print functions whose format-string arguments are candidate
log templates. Note: `SV_BroadcastTPrintf` and `SV_ClientTPrintf` do NOT exist
in MVDSV -- the plan spec assumed them from ezQuake; they are absent here.

| Function | Count | Sig | Channel |
|---|---|---|---|
| `SV_ClientPrintf` | 102 | `(client_t *cl, int level, char *fmt, ...)` | per-client |
| `SV_BroadcastPrintf` | 35 | `(int level, char *fmt, ...)` | all clients |
| `SV_BroadcastPrintfEx` | 3 | `(int level, int flags, char *fmt, ...)` | all clients + flags |
| `SV_BroadcastCommand` | 4 | `(char *fmt, ...)` | stuffcmd to all clients |
| `Con_Printf` | 717 | `(char *fmt, ...)` | server console |
| `Sys_Printf` | 75 | `(char *fmt, ...)` | system/OS stdout |

The following are master-server broadcast infrastructure (not log templates):
`SV_BroadcastSend`, `SV_BroadcastQueryMaster`, `SV_BroadcastQueryMasters`,
`SV_BroadcastInit`, `SV_BroadcastUpdateServerList`, `SV_BroadcastAddLog`,
`SV_BroadcastAddCache`, `SV_BroadcastPrintLog`, `SV_BroadcastPrintCache`,
`SV_BroadcastEnabledOnChange`.

### Info APIs

| Function | Count | Role |
|---|---|---|
| `Info_Get` | 62 | MVDSV custom -- appears to wrap ValueForKey |
| `Info_ValueForKey` | 31 | standard QW info key lookup |
| `Info_SetValueForStarKey` | 25 | set key including star-prefixed keys |
| `Info_SetStar` | 21 | set star-prefixed (serverinfo) keys |
| `Info_f` | 16 | console command handler |
| `Info_Set` | 15 | set arbitrary key |
| `Info_RemoveAll` | 11 | clear all keys |
| `Info_ReverseConvert` | 10 | conversion helper |
| `Info_RemoveKey` | 8 | remove single key |
| `Info_Remove` | 8 | alias of RemoveKey |
| `Info_Print` | 8 | debug dump |
| `Info_SetValueForKey` | 7 | set key (non-star) |
| `Info_Changed` | 7 | change-notification hook |
| `Info_RemovePrefixedKeys` | 4 | remove keys by prefix |
| `Info_HashKey` | 4 | internal hash helper |
| `Info_CopyStar` | 4 | copy star keys |
| `Info_Convert` | 4 | conversion helper |
| `Info_Free` | 3 | free info string |
| `Info_PrintList` | 2 | dump list |
| `Info_KeyNameForKeyNum` | 2 | reverse lookup |
| `Info_CopyStarKeys` | 2 | copy star keys (variant) |

MVDSV adds `Info_Get` (62 sites) which is not in the QW protocol spec -- it is a
project-local wrapper. The Task 10 info-keys handler should treat
`Info_ValueForKey` and `Info_Get` as equivalent read operations and
`Info_SetValueForKey` / `Info_SetValueForStarKey` / `Info_SetStar` / `Info_Set`
as write operations.

---

## Preprocessor flags (decisions)

Flags established by `CMakeLists.txt` `target_compile_definitions` (lines 169-186):

| Flag | CMakeLists.txt | Decision | Rationale |
|---|---|---|---|
| `SERVERONLY` | YES (line 169) | **ON** | MVDSV is server-only; guards client code |
| `USE_PR2` | YES (line 170) | **ON** | PR2 VM support is production; needed for QVM progs |
| `MVD_PEXT1_SERVERSIDEWEAPON` | YES (line 171) | **ON** | Production SSW extension |
| `MVD_PEXT1_SERVERSIDEWEAPON2` | YES (line 172) | **ON** | Production SSW2 extension |
| `FTE_PEXT2_VOICECHAT` | YES (line 173) | **ON** | Production voice extension |
| `WWW_INTEGRATION` | conditional (line 186, curl) | **ON** | curl present on Linux production builds |
| `_WIN32` / `_MSC_VER` / `_WIN64` | compiler-set | **Windows variant** | do not define in Linux clang_args |
| `__linux__` / `__GNUC__` | compiler-set | **Linux default** | clang on Linux sets these automatically |
| `__BIG_ENDIAN__Q__` | conditional (endian test) | **OFF** | Linux x86-64 is little-endian |
| `WITH_NQPROGS` | NOT in CMakeLists.txt | **OFF** | Verified absent; production binary excludes NQ |
| `DEBUG_VM` | NOT in CMakeLists.txt | **OFF** | Developer-only |
| `PARANOID` | NOT in CMakeLists.txt | **OFF** | Commented out in qwsvdef.h line 38 |
| `MVD_PEXT1_DEBUG` | NOT in CMakeLists.txt | **OFF** | Debug flag |
| `MVD_PEXT1_DEBUG_ANTILAG` | NOT in CMakeLists.txt | **OFF** | Debug flag |
| `MVD_PEXT1_DEBUG_WEAPON` | NOT in CMakeLists.txt | **OFF** | Debug flag |
| `VM_LOG_SYSCALLS` | NOT in CMakeLists.txt | **OFF** | Debug flag |
| `JUMP_OPTIMIZE` | NOT in CMakeLists.txt | **OFF** | Not in production build |
| `EXPERIMENTAL_SHOW_ACCELERATION` | NOT in CMakeLists.txt | **OFF** | Experimental flag |
| `CHAT_ICON_EXPERIMENTAL` | NOT in CMakeLists.txt | **OFF** | Experimental flag |
| `WEBSITE_LOGIN_SUPPORT` | NOT in CMakeLists.txt | **OFF** | Not in production build |
| `_CONSOLE` | NOT in CMakeLists.txt | **OFF** | Windows console-mode flag |

---

## Confirmed PEXT inventory -- flags from qwprot submodule (SURPRISE -- see below)

The following high-frequency guards appear in MVDSV source but are defined in
the `src/qwprot` git submodule (`https://github.com/QW-Group/qwprot.git`),
which is not checked out in this repo clone (submodule commit `07a72852`, directory empty).
They are NOT in CMakeLists.txt.

Affected flags (by frequency in preprocessor guard scan):
- `FTE_PEXT_CSQC` (21 sites)
- `FTE_PEXT_FLOATCOORDS` (17 sites)
- `PROTOCOL_VERSION_FTE` (14 sites)
- `FTE_PEXT_TRANS` (12 sites)
- `FTE_PEXT2_VOICECHAT` (11 sites) -- BUT this one IS in CMakeLists.txt line 173
- `FTE_PEXT_CHUNKEDDOWNLOADS` (10 sites)
- `PROTOCOL_VERSION_MVD1` (9 sites)
- `PROTOCOL_VERSION_FTE2` (9 sites)
- `FTE_PEXT_COLOURMOD` (6 sites)
- `MVD_PEXT1_HIGHLAGTELEPORT` (5 sites)
- `FTE_PEXT_MODELDBL` (4 sites)
- `FTE_PEXT_ENTITYDBL` (4 sites)
- `FTE_PEXT_SPAWNSTATIC2` (2 sites)
- `FTE_PEXT_ENTITYDBL2` (2 sites)
- `FTE_PEXT_ACCURATETIMINGS` (2 sites)
- `FTE_PEXT_256PACKETENTITIES` (2 sites)

**Decision for clang_args (Task 4):** The extractor must provide these as
`-D` defines, because the qwprot submodule is not checked out. The values are
bit-shift constants (from FTE codebase reference). The following should be
treated as production-ON (they gate wire-protocol code that runs on production
MVDSV 1.20):

- `FTE_PEXT_CSQC` -- define with a non-zero value; gates CSQC entity handling
- `FTE_PEXT_FLOATCOORDS` -- gates float coordinate wire encoding
- `PROTOCOL_VERSION_FTE` -- gates FTE1 extension handshake
- `FTE_PEXT_TRANS` -- gates entity transparency support
- `FTE_PEXT_CHUNKEDDOWNLOADS` -- gates chunked file transfer
- `PROTOCOL_VERSION_MVD1` -- gates MVD1 extension handshake (ezquake/mvdsv)
- `PROTOCOL_VERSION_FTE2` -- gates FTE2 extension handshake
- `FTE_PEXT_COLOURMOD` -- gates colour modulation
- `MVD_PEXT1_HIGHLAGTELEPORT` -- gates high-lag teleport antilag extension

Task 4 must either: (a) check out the submodule and include `src/qwprot/src` in
`clang_args` include paths (preferred -- gets actual values), or (b) supply
hard-coded `-D` values for all of the above.

---

## QC builtin tables

### QuakeC (QW progs) builtins -- `pr_builtins`

Declared at `src/pr_cmds.c:2818` as `builtin_t *pr_builtins = NULL` (dynamic pointer,
allocated at init from `std_builtins` + `ext_builtins`).

`std_builtins[]` defined at `src/pr_cmds.c:2682`. Static array, 83 entries (#0-#82).
Comment format: `// void(entity e) makevectors = #1;` -- function prototype style.
`PF_Fixme` fills unused slots; those have no comment or `// [reserved]`.

`ext_builtins[]` defined at `src/pr_cmds.c:2779`. Sparse array of `{int num, func}` pairs.
24 entries at non-contiguous numbers: #60-#62, #84-#86, #90-#91, #93-#97, #99,
#103, #114-#116, #118-#119, #231, #448, #531-#532.
Comment format same as std_builtins.

Extraction approach: walk `std_builtins` by index position (index = builtin number),
skip `PF_Fixme` entries; then walk `ext_builtins` by the `.num` field.
Total extractable entries: ~45 (non-Fixme std) + 24 ext = ~69.

### PR2 / QVM syscall table -- `ext_syscalls`

Defined at `src/pr2_cmds.c:70` as a static struct array (not `pr2_builtins`).
Structure: `{ char *extname; ext_syscall_t fun; }`.
3 unconditional entries: `MapExtFieldPtr`, `SetExtFieldPtr`, `GetExtFieldPtr`.
1 conditional entry: `setsendneeded` (guarded by `#ifdef FTE_PEXT_CSQC`).

The PR2 table uses string-keyed extensible dispatch (`ext_syscall_tbl[256]`),
not a flat numbered array. There is no `pr2_builtins` symbol; the spec's assumption
of a `pr2_builtin[]` table at `src/pr2_cmds.c` is incorrect. The Task 12
QC-builtins handler should target `std_builtins` + `ext_builtins` in `pr_cmds.c`
and optionally the `ext_syscalls` table in `pr2_cmds.c` for the PR2 extension names.

### Protocol message constants -- `svc_` / `clc_`

`svc_` and `clc_` constants are NOT defined in the MVDSV `src/` tree. They are
defined in the qwprot submodule's `protocol.h` (rooted at `src/qwprot/src/`,
included via `CMakeLists.txt:target_include_directories`). With the submodule
not checked out, the constants are resolved from the QW-original protocol
(`PROTOCOL_VERSION 28`, svc_bad=0 through svc_updatepl=53 + FTE extensions).
For static extraction, the extractor should include `src/qwprot/src` once the
submodule is initialised, or supply the constants as `-D` defines from the
qwcl-original reference (`research/repos/qwcl-original/QW/client/protocol.h`
defines svc_bad=0 through svc_updatepl=53).

---

## Surprises / open questions

1. **No `SV_BroadcastTPrintf` or `SV_ClientTPrintf`.** The spec listed these as
   expected channels. They do not exist anywhere in MVDSV. The log-templates handler
   (Task 11) should target only `SV_ClientPrintf`, `SV_BroadcastPrintf`,
   `SV_BroadcastPrintfEx`, `SV_BroadcastCommand`, `Con_Printf`, `Sys_Printf`.

2. **qwprot submodule not checked out.** `src/qwprot/` is empty (submodule at
   commit `07a72852`, not initialised). This blocks: (a) `protocol.h` include
   for `svc_`/`clc_` constants; (b) definitions for all `FTE_PEXT_*` and
   `PROTOCOL_VERSION_FTE*`/`PROTOCOL_VERSION_MVD1` flags used as `#ifdef` guards
   in 14+ source files. Task 4 (clang_config) must either initialise the submodule
   or supply these as explicit `-D` values. The clang parse will fail to resolve
   these symbols otherwise, producing a large number of unknown-type errors that
   degrade extraction quality.

3. **No `pr2_builtin[]` table.** The spec expected one at `src/pr2_cmds.c`. The PR2
   system uses a different extensible dispatch model (`ext_syscalls[]` + `ext_syscall_tbl[256]`).
   The QC-builtins handler (Task 12) needs to target `pr_cmds.c` for the main
   builtin tables and optionally `pr2_cmds.c:ext_syscalls` for the 3-4 PR2
   extension names -- these are qualitatively different (string-keyed, not numbered).

4. **`Info_Get` is a MVDSV-local function (62 sites).** Not in QW protocol spec.
   It is the dominant info-key read pattern. The info-keys handler (Task 10) must
   recognise it alongside `Info_ValueForKey`.

5. **`CVAR_ARCHIVE` flag absent.** ezQuake/QWCL have `CVAR_ARCHIVE` for persistent
   cvars. MVDSV's `cvar.h` does not define it -- only `CVAR_NONE`, `CVAR_SERVERINFO`,
   `CVAR_ROM`, `CVAR_USER_CREATED`. The cvars handler (Task 6) must not expect an
   archive flag in the flags field.
