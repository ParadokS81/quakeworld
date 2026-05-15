# Probe report: P2 -- MVDSV in-repo

> Fixed schema. Every field is mandatory. One block per (source, domain) pair.
> Coverage denominators come from `probe-0-l1-baseline.md` -- read it first.

## Source: research/repos/mvdsv/docs/man/man6/mvdsv.6

### Domain: cmdline

- **Coverage count:** 9 of 11 mvdsv cmdline params carry an admin-facing description here (82%). Denominator M source: probe-0 (`mvdsv` `cmdline_param` registered set = 11). All 11 L1 entries have NULL description today.
- **Format:** man page (.6 roff format, authored 2023-01-24 by Lee Garrett for Debian). The OPTIONS section documents each flag as a `.TP` block with prose description.
- **Structure quality:** free prose only for most flags; `-progtype` enumerates 4 enum values inline (0=pr1, 1=native, 2=q3vm, 3=q3vm+JIT). `-cheats` enumerates `give` item codes inline. Parseable for descriptions but enum extraction is manual.
- **Overlap / conflict:** The man page documents 17 flags total; 8 are NOT in L1 because the extractor skips macro-wrapped COM_CheckParm sites (defined in `src/server.h:1106-1112` as `SV_CommandLineEnableCheats()` etc.). Those 8 flags are: `-cheats`, `-enablelocalcommand`, `-democache`, `-progtype`, `-minmemory`, `-heapsize`, `-mem`, `+exec`. They are real operational flags not yet in L1. The 2 L1 params NOT in the man page are `-noerrormsgbox` and `-nopriority` (Windows-only, Debian man page omits them). No conflicts between man page prose and source semantics observed.
- **Extractability for a future L1 spine:** LLM-assisted -- roff `.TP` blocks are structurally regular; an LLM or simple parser can extract flag name + prose body. The 8 macro-wrapped flags need a Pattern-2 extractor extension (`server.h` macro expansion) to enter L1 first.

### Domain: cvars

- **Coverage count:** 0 of 183 mvdsv cvars carry a dedicated admin-facing description here (0%). Denominator M source: probe-0 (`mvdsv` `cvars` registered set = 183). The man page mentions `sv_cheats` once in the `-cheats` flag description prose ("Equivalent to setting `sv_cheats 1` in the config") but this is incidental cross-reference, not a cvar documentation entry.
- **Format:** incidental prose mention only; no cvar section in this man page.
- **Structure quality:** n/a -- no structured cvar content.
- **Overlap / conflict:** none observed.
- **Extractability for a future L1 spine:** hand-curate -- only 1 incidental mention, not worth automating.

---

## Source: research/repos/mvdsv/README.md

### Domain: cmdline

- **Coverage count:** 0 of 11 mvdsv cmdline params carry an admin-facing description here (0%). Denominator M source: probe-0 (`mvdsv` `cmdline_param` registered set = 11). README is build/install instructions only (architecture list, cmake build steps, versioning); no flags or configuration documented.
- **Format:** freeform_prose (GitHub README, build/install focus).
- **Structure quality:** n/a -- no cmdline content.
- **Overlap / conflict:** none observed.
- **Extractability for a future L1 spine:** hand-curate -- no extractable content.

### Domain: cvars

- **Coverage count:** 0 of 183 mvdsv cvars carry an admin-facing description here (0%). Denominator M source: probe-0 (`mvdsv` `cvars` registered set = 183). README contains no cvar documentation.
- **Format:** freeform_prose (build/install only).
- **Structure quality:** n/a.
- **Overlap / conflict:** none observed.
- **Extractability for a future L1 spine:** hand-curate -- nothing to extract.

---

## Source: research/repos/mvdsv (source inline -- trailing comments in .c files)

This is the primary existing coverage surface for MVDSV cvars and commands. The AST extractor harvests these at extraction time; they are already partially loaded into L1.

### Domain: cvars

- **Coverage count (current L1):** 35 of 183 mvdsv cvars already have description via `source_inline` provenance (19%). 148 remain NULL. Denominator M source: probe-0 (`mvdsv` `cvars` registered set = 183, `source_inline` = 35, NULL = 148).
- **Coverage count (delta available from source):** The 35 `source_inline` rows correspond 1:1 to the 35 trailing `//` comments harvested by the AST extractor (`mvdsv-variables-ast.json` `_stats.with_trailing_comment = 35`, verified against live AST output). The remaining 148 have no trailing comment in source and no other prose source in this repo. Net new from this source: **0** (already fully loaded).
- **Format:** source_inline -- trailing `// ...` and `/* ... */` comments on the `cvar_t` declaration line, harvested by `_handler_cvars.py`. Multi-line continuations (subsequent `//` lines) are joined. Examples: `maxfps // It actually should be called maxpps`, `sv_crypt_rcon // use SHA1 for encryption`, `sv_login_web // 0=local files, 1=auth via website`.
- **Structure quality:** free prose; some entries include enum values inline (e.g. `sv_forcenick // 0 - don't force; 1 - as login`). Enum range is extractable with LLM parsing from the comment text. Default value is always available from the `cvar_t` struct initializer.
- **Overlap / conflict:** The 35 described cvars are a mix of `sv_*` (14) and non-prefixed (21, e.g. `hostname`, `password`, `timeout`). The 148 undescribed cvars include 87 `sv_*` entries -- the core admin-configuration surface -- with no inline comment in source and no man page coverage.
- **Extractability for a future L1 spine:** mechanical -- already done; the extractor and loader handle this. No gap to close here.

### Domain: commands

- **Coverage count (current L1):** 0 of 108 mvdsv commands carry a description in L1 (0%). 108 remain NULL. Denominator M source: probe-0 (`mvdsv` `commands` registered set = 108, all NULL).
- **Coverage count (delta available from source, loader gap):** The AST extractor harvests Doom-style function-banner descriptions for 28 of 108 commands (26%) via `_handler_commands.py` (banner-walk pattern: `/* === FunctionName === description text === */` preceding the handler function definition). These 28 descriptions are present in `mvdsv-commands-ast.json` as `ast.description` but are **NOT loaded into L1**. Root cause: `load-commands.ts:buildCommandVersionRow()` maps `entry.desc` (top-level JSON field) and `entry.remarks` to `command_versions.help_desc / help_remarks`, but the command AST emits description inside `ast.description` (nested), not as a top-level `desc` field. `derive-entity-description.ts:deriveCommand()` then reads only `command_versions.help_desc/help_remarks`, so the banner text never reaches `entities.description`. Net new delta if loader gap fixed: **28 of 108 (26%)**.
- **Format:** source_inline -- Doom-style block comments (`/* === / ================== / FunctionName / description text / ================== */`) immediately preceding the handler function definition. The banner-walk parser strips decoration lines and bare-identifier lines (the function-name row), joining remaining text lines with spaces.
- **Structure quality:** free prose; no enum/range structure. Descriptions are typically 1-3 sentences ("Kick a user off of the server", "Creates a new command that executes a command string (possibly ; separated)").
- **Overlap / conflict:** no conflict; this is the only prose source for MVDSV commands in-repo. The 80 commands without banner descriptions have no prose source found in this investigation scope.
- **Extractability for a future L1 spine:** mechanical -- already extracted into AST; fix is a loader mapping change in `load-commands.ts` (map `entry.ast?.description` to `help_desc` in `buildCommandVersionRow`).

---

## Probe notes

### Loader gap is actionable (commands, 28/108 = 26%)

The gap between AST-extracted banner descriptions (28) and L1 loaded descriptions (0) for MVDSV commands is a loader mapping bug, not a missing source. Fix path: in `apps/qw-oracle/scripts/load-knowledge/load-commands.ts`, change `buildCommandVersionRow` to include `help_desc: entry.ast?.description ?? entry.desc ?? null` (or equivalent). `derive-entity-description.ts` already has the right pipeline once the value reaches `command_versions.help_desc`. No re-extraction needed; the AST output is already correct.

### Man page covers 8 real flags not yet in L1 (cmdline extraction gap)

The 8 macro-wrapped flags (`-cheats`, `-enablelocalcommand`, `-democache`, `-progtype`, `-minmemory`, `-heapsize`, `-mem`, `+exec`) are operationally significant (memory sizing, cheat gate, demo cache, progs type). They are excluded from L1 because the extractor only detects literal-string `COM_CheckParm` call sites (`_handler_cmdline.py` Pattern 1). These flags are defined via `#define SV_CommandLine*() (COM_CheckParm("-cheats"))` macros in `src/server.h:1106-1112`. Pattern-2 extension (macro-expansion harvest from `server.h`) or manual L1 injection would capture them. The man page descriptions for these 8 are extractable (roff `.TP` blocks).

### Protocol: already well-described at source level

83 of 105 protocol messages (79%) carry trailing comments in `src/qwprot/src/protocol.h`. These are already loaded as `source_inline` (probe-0: 105/105 described). No gap here; the in-repo source is complete and loaded.

### qc_builtins: QC signature is the doc

97 qc_builtins carry a QC type signature (`float(float f) sin = #60;`) as the trailing comment. No substantive English-prose description exists beyond the signature in source. The signature IS the doc for this domain. All 93 L1 entries are described (`source_inline`, probe-0). The 4-item discrepancy between AST count (97) and L1 (93) likely reflects deduplication at load time (the AST `_stats` reports `source_total: 97, count: 97` before cross-file dedup).

### log_templates: AST count 692 vs L1 M=691

One entry was deduped at load time (AST `_stats.count = 692`, probe-0 M = 691). This is expected: cross-file first-wins dedup in the extractor runs before load, but the load-side natural-key upsert may collapse one additional duplicate. Not a gap.

### README and docs/ contain no config documentation

`research/repos/mvdsv/README.md` is build/install focused only (110 lines). `docs/` contains only `man/man6/mvdsv.6`. No wiki tab, no additional config docs, no `docs/changelog`, no nQuake-style example configs. The repo is thin on prose documentation by design; configuration documentation lives in community resources (nQuake distfiles, QWiki), not in the repo itself.

### Biggest gap by domain after in-repo investigation

**MVDSV cvars: 148/183 NULL (81%) with no in-repo prose source.** The 148 undescribed cvars have no trailing comment in source and no man page coverage. They include 87 `sv_*` cvars -- the core admin configuration surface. This gap requires out-of-repo sources (probe-3 nQuake distfiles, probe-4 wiki) to close.
