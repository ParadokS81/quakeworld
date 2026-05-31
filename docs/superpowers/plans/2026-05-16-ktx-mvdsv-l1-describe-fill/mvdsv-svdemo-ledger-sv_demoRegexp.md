# describe-fill-synthesis ledger -- mvdsv `sv_demoRegexp`

- **project:** mvdsv
- **knob:** `sv_demoRegexp` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE verified: `git -C research/repos/mvdsv describe --tags` == `1.11-53-g18d0362`)
- **registered name string:** `"sv_demoRegexp"` (matches L1 entity name exactly, including letter-case; verified `src/sv_demo.c:52`. NOTE: the L1 canonical id lowercases to `mvdsv:cvar:sv_demoregexp`, but the registered NAME string and the C `cvar_t` identifier are both the mixed-case `sv_demoRegexp`.)
- **registered default:** `"\.mvd(\.(gz|bz2|rar|zip))?$"` (C source literal `"\\.mvd(\\.(gz|bz2|rar|zip))?$"` with the C-string `\\` un-escaped to a single backslash; matches extractor-recorded default exactly)
- **mechanical_candidate:** none -- cold-synth (no trailing comment on the declaration line, no shipped-config candidate)
- **suspect_pool_member:** FALSE (not runtime-dead; verified vs Phase-0 C3 pool by the brief)
- **verdict:** `synthesized` -- fully source-legible; every clause enforce-traced TRACED-CLEAN; high confidence

## Halt verdict

```
mvdsv:sv_demoRegexp: synthesized -- cold-synth, value is a PCRE pattern matched (PCRE_CASELESS) against each demo-dir filename in Sys_listdir; match=listed, no-match=skipped; controls which files every server demo command (demolist/lastscores/laststats/rmdemo, record free-name probe, .txt sidecar) treats as demos; every clause enforce-traced TRACED-CLEAN; not suspect-pool -- origin=synthesized ref=src/sv_sys_unix.c:153 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the pattern the server uses to decide which files in the demo
> directory count as demos. The value is a regular expression matched
> against each filename: files whose name matches are treated as demos,
> and files that do not match are ignored. Matching is case-insensitive.
> This affects the server-side demo commands -- listing demos, showing the
> last scores or stats, and removing demos -- as well as how the server
> picks an unused filename when it starts recording.
>
> Default: \.mvd(\.(gz|bz2|rar|zip))?$ -- matches files ending in .mvd,
> optionally followed by .gz, .bz2, .rar, or .zip (i.e. .mvd recordings and
> their compressed forms).
> Set by: server config.

## Per-clause enforce-trace table

| Clause asserted in `description` | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|
| The value is a regular expression (PCRE), not a literal extension -- it is compiled as a regex pattern | `src/sv_sys_unix.c:133` (and `src/sv_sys_win.c:183`) | `if (!(preg = pcre_compile(ext, PCRE_CASELESS, &errbuf, &r, NULL)))` | MATCH -- `ext` is the `Sys_listdir` filter argument; every demo-listing call passes `sv_demoRegexp.string` as `ext`. It is handed to `pcre_compile`, i.e. interpreted as a PCRE regular expression. Both the unix and win backends are identical. |
| It is matched against each filename in the demo directory | `src/sv_sys_unix.c:147,153` (and `src/sv_sys_win.c:199,205`) | `while ((oneentry = readdir(d)))` ... `switch (r = pcre_exec(preg, NULL, oneentry->d_name, strlen(oneentry->d_name), 0, 0, NULL, 0))` | MATCH -- the loop iterates directory entries (`readdir`); each entry's name `oneentry->d_name` is the subject string passed to `pcre_exec`. |
| Polarity: a file is treated as a demo (kept/listed) only if its name matches; non-matching files are ignored | `src/sv_sys_unix.c:156-157` (and `src/sv_sys_win.c:208-209`) | `case 0: break;` / `case PCRE_ERROR_NOMATCH: continue;` | MATCH -- `pcre_exec` returning `0` (matched, with `ovecsize`=0) falls through `break` and the entry is added to the list below (`strlcpy(list[dir.numfiles].name, ...)`); `PCRE_ERROR_NOMATCH` `continue`s, skipping the entry. So match => included, no-match => excluded. Confirms the asserted direction. |
| Matching is case-insensitive | `src/sv_sys_unix.c:133` (and `src/sv_sys_win.c:183`) | `pcre_compile(ext, PCRE_CASELESS, ...)` | MATCH -- the `PCRE_CASELESS` compile flag makes the pattern case-insensitive. Same flag on both backends. (Corroborated at the `.txt`-sidecar compile `src/sv_demo_misc.c:518`, also `PCRE_CASELESS`.) |
| Affects the demo-listing commands (list demos, last scores, last stats) and demo removal | `src/sv_demo_misc.c:351` ; `src/sv_demo_misc.c:988` ; `src/sv_demo_misc.c:1067` ; `src/sv_demo_misc.c:583` | `dir = Sys_listdir(va("%s/%s", fs_gamedir, sv_demoDir.string), sv_demoRegexp.string, SORT_BY_DATE);` (demolist) ; same call shape at `:988` (lastscores) and `:1067` (laststats) ; `:583` (rmdemo `*<token>` enumerates matching demos) | MATCH -- each of these server commands enumerates the demo directory through `Sys_listdir` with `sv_demoRegexp.string` as the filter, so the pattern decides which files each command operates on. |
| Affects how the server picks an unused filename when recording starts | `src/sv_demo.c:1812-1813,1820-1821` | `dir = Sys_listdir(va("%s/%s", fs_gamedir, sv_demoDir.string), va("^%s%s", name3, sv_demoRegexp.string), SORT_NO);` | MATCH -- at record-start the engine builds `^<quoted-name><regexp>` and probes the directory; if any file matches it appends `_NN` and re-probes until none match, i.e. the regexp participates in the unused-filename search. (The `^%s` prefix is appended by the call site, not by the cvar.) |
| Default: `\.mvd(\.(gz|bz2|rar|zip))?$` -- matches `.mvd` and its `.gz`/`.bz2`/`.rar`/`.zip` compressed forms | `src/sv_demo.c:52` | `cvar_t	sv_demoRegexp		= {"sv_demoRegexp",		"\\.mvd(\\.(gz|bz2|rar|zip))?$"};` | MATCH -- WI-2: the registered literal default (second `cvar_t` field) is the C string `"\\.mvd(\\.(gz|bz2|rar|zip))?$"`, which is the regex `\.mvd(\.(gz|bz2|rar|zip))?$`. Read as a regex: literal `.mvd`, an OPTIONAL group `(\.(gz|bz2|rar|zip))?` (a dot then one of gz/bz2/rar/zip), anchored to end-of-string `$`. Not a shipped-cfg value -- the registration literal itself. |
| Set by: server config | `src/sv_demo.c:52` + `src/sv_demo.c:1857` | declaration is the 2-field form `{"sv_demoRegexp", "\\.mvd..."}` (no flags field, no OnChange) ; `Cvar_Register (&sv_demoRegexp);` | MATCH -- the `cvar_t` initializer supplies only `{name, string}`; the remaining fields (flags, OnChange) default to `0`/NULL, so the cvar is CVAR_NONE: not `CVAR_SERVERINFO`, not `CVAR_ROM`, no OnChange validator, and there is no command/vote dispatch path. It is a plain server-side cvar set via server config / console / rcon. |

## Use-site inventory (WI-1 wide read)

Whole-tree grep for `sv_demoRegexp` / `sv_demoregexp` over `src/`:

Declaration / registration (NOT the citation per the brief):
- `src/server.h:1003` -- `extern cvar_t sv_demoRegexp;`
- `src/sv_demo.c:52` -- registration literal (default `\.mvd(\.(gz|bz2|rar|zip))?$`; 2-field form => flags `0`, no OnChange)
- `src/sv_demo.c:1857` -- `Cvar_Register (&sv_demoRegexp);`

Read use-sites (`sv_demoRegexp.string`) -- the authoritative behavior:
- LISTING filter (value passed as the `ext`/regex arg to `Sys_listdir`):
  - `src/sv_demo_misc.c:351` -- demolist / demolistr listing (`SV_DemoList_f` family); preceded by a `Con_Printf` at `:350` echoing the pattern in the "Listing content of ..." banner.
  - `src/sv_demo_misc.c:474` -- demolistr-regex variant listing.
  - `src/sv_demo_misc.c:583` -- `rmdemo *<token>`: enumerate matching demos before removal.
  - `src/sv_demo_misc.c:988` -- `lastscores`: enumerate demos to print stored score lines.
  - `src/sv_demo_misc.c:1067` -- `laststats`: enumerate demos for the stats packet.
- RECORD free-name probe (value appended to a `^<name>` anchor, passed as the regex arg):
  - `src/sv_demo.c:1813` and `src/sv_demo.c:1821` -- the unused-filename search at record start.
- TXT sidecar name derivation (value compiled directly, PCRE_CASELESS, to strip the matched extension and append `.txt`):
  - `src/sv_demo_misc.c:518` -- `SV_MVDName2Txt`: `pcre_compile(sv_demoRegexp.string, PCRE_CASELESS, ...)` then `pcre_exec`; on match, truncates at the match offset (`ovector[0]`) and writes `.txt`. Error paths at `:521,:535`.
- The other `sv_demoRegexp.string` occurrences in this list (`:456,:461,:466`) are within the same demolistr/removal block that drives the `:474` listing; they are diagnostic `Con_Printf` echoes of the pattern, not independent semantics.

The `Sys_listdir` filter primitive (`src/sv_sys_unix.c:113-201`, win mirror `src/sv_sys_win.c:164-...`) is THE enforcing site for the include/exclude semantics and the case-insensitivity: the `ext` argument is `pcre_compile`d with `PCRE_CASELESS` (line 133/183) and each entry tested with `pcre_exec` (line 153/205). The special-case `all = !strncmp(ext, ".*", 3)` short-circuit (line 131/181) means a value of exactly `.*` would list every file without compiling -- this is a property of the filter primitive for that one value, NOT the default behavior, and is recorded here in reasoning rather than padded into the lean user-doc (the default is not `.*`).

No name-only inference: the "regex filter that decides which files are demos" behavior is read directly off the `pcre_compile`/`pcre_exec` enforcement in `Sys_listdir` and the `sv_demoRegexp.string`-as-filter call sites, not from the cvar name.

## Rubric grading (D5, all five clauses)

1. WHAT in admin-observable terms -- yes: "the pattern that decides which files in the demo directory count as demos," and the observable surfaces (which demos appear in listing / lastscores / laststats / rmdemo and the recording free-name search). Not WHY the code does it.
2. Not a name restatement -- the name is `sv_demoRegexp` ("demo regexp"); the description spells out that it is a regular expression matched against filenames, the match/no-match polarity, case-insensitivity, and exactly which server surfaces it governs -- not merely "the demo regexp."
3. Units/enums spelled out -- this is a free-form regex string, not an enum or numeric unit; the meaningful behavior (regex semantics, match=include polarity, case-insensitive) is stated, and the default pattern's meaning is decoded in plain English (`.mvd` plus compressed forms).
4. Mechanism only, no opinion / recommended value -- yes: no "set this to X" advice; only what the knob does and what the default matches.
5. Self-contained without source -- yes: an admin understands it is a regex filename filter, that matching files are the demos, that it is case-insensitive, and what the default matches, without reading C.

## D20 QA self-check

1. Admin who never saw C code understands it? YES.
2. Zero file:line / function names / engine jargon in `description`? YES -- no `pcre_compile`, no `Sys_listdir`, no `PCRE_CASELESS`, no `ext`, no file:line. ("regular expression" / "case-insensitive" / "demo directory" are plain-English admin terms; "regular expression" is the literal subject of the setting, not engine internals.)
3. Values/units spelled out, Default + Set-by present? YES -- free-form regex (no enum); Default stated verbatim AND decoded into plain English; Set-by server config.
4. Cross-engine detail routed to `See also:` unless action-changing? N/A -- the cvar is read only by the MVDSV server's own demo subsystem; no client/proxy reads it, so there is no cross-codebase consequence to route. No `See also:` slug needed.
5. Every clause enforce-traced (B1), cites in reasoning? YES (table above; cites carried in `description_reasoning`).

## Notes / conflicts

- No C2 conflict (no mechanical candidate, no trailing comment to differ from).
- `description_provenance` = `null`: cold-synth; per operator clarification 2026-05-30, provenance holds retained shipped-doc DATA only. This row's grounding is `source_ref` + anchor + the reasoning cites.
- Primary `source_ref` chosen as `src/sv_sys_unix.c:153` -- the `pcre_exec`-against-filename line that ENFORCES the core include/exclude semantics (per evidence-and-citation.md: the authoritative read use-site that exhibits the behavior, not the registration site). The unix backend is the canonical citation; `src/sv_sys_win.c:205` is the identical Windows mirror, noted in reasoning. The cvar-specific filter call sites (`src/sv_demo_misc.c:351` et al.) and the registration (`src/sv_demo.c:52`) are cited in reasoning.
- Confidence `high`: behavior is read off the unambiguous `pcre_compile`/`pcre_exec` enforcement in `Sys_listdir` (both platform backends identical) plus seven `sv_demoRegexp.string`-as-filter call sites that all share one shape; default + set-by verified at the registration literal and the 2-field `cvar_t` layout. No hedged clause.
- Edge note (kept OUT of lean user-doc): a value of exactly `.*` short-circuits the filter (`all` branch) and lists every file; this is filter-primitive behavior for one specific value, not the default, and not action-relevant to documenting the knob's default purpose. Recorded in the use-site inventory for completeness.
- Platform note: the description is platform-agnostic because `Sys_listdir` enforces identical regex/case-insensitive filtering on both the unix (`src/sv_sys_unix.c`) and Windows (`src/sv_sys_win.c`) backends.

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_demoRegexp",
  "type": "cvar",
  "description": "Sets the pattern the server uses to decide which files in the demo directory count as demos. The value is a regular expression matched against each filename: files whose name matches are treated as demos, and files that do not match are ignored. Matching is case-insensitive. This affects the server-side demo commands -- listing demos, showing the last scores or stats, and removing demos -- as well as how the server picks an unused filename when it starts recording.\n\nDefault: \\.mvd(\\.(gz|bz2|rar|zip))?$ -- matches files ending in .mvd, optionally followed by .gz, .bz2, .rar, or .zip (i.e. .mvd recordings and their compressed forms).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth from the sv_demoRegexp.string read use-sites; primary source_ref src/sv_sys_unix.c:153 (pcre_exec against each readdir entry name in Sys_listdir). Enforce-trace per clause: value-is-PCRE-regex -> src/sv_sys_unix.c:133 / src/sv_sys_win.c:183 (pcre_compile(ext, PCRE_CASELESS) where ext = sv_demoRegexp.string) ; matched-against-each-filename -> src/sv_sys_unix.c:147,153 (readdir loop, pcre_exec on oneentry->d_name) ; polarity match=listed/no-match=skipped -> src/sv_sys_unix.c:156-157 (case 0: break => entry added; PCRE_ERROR_NOMATCH: continue => skipped) ; case-insensitive -> src/sv_sys_unix.c:133 PCRE_CASELESS flag (corroborated src/sv_demo_misc.c:518 sidecar compile, also PCRE_CASELESS) ; affects demolist/lastscores/laststats/rmdemo -> src/sv_demo_misc.c:351 (demolist), :988 (lastscores), :1067 (laststats), :583 (rmdemo *<token>) all call Sys_listdir(..., sv_demoRegexp.string, ...) ; affects record free-name probe -> src/sv_demo.c:1813,1821 (Sys_listdir with va(\"^%s%s\", name3, sv_demoRegexp.string), loops _NN until no match) ; Default regex \\.mvd(\\.(gz|bz2|rar|zip))?$ -> registration literal src/sv_demo.c:52 (WI-2: C string \"\\\\.mvd(\\\\.(gz|bz2|rar|zip))?$\" un-escaped = regex matching literal .mvd + optional group (\\.(gz|bz2|rar|zip))? anchored at $; not shipped-cfg) ; Set-by server config -> src/sv_demo.c:52 2-field cvar_t {name,string} => flags 0 = CVAR_NONE, no OnChange, no CVAR_SERVERINFO/CVAR_ROM, no command/vote path + Cvar_Register src/sv_demo.c:1857. All clauses MATCH (TRACED-CLEAN). Windows backend src/sv_sys_win.c:181-209 is byte-identical in logic to unix (same .* short-circuit, PCRE_CASELESS compile, pcre_exec include/skip) -> description is platform-agnostic. Edge note kept OUT of lean user-doc: ext == \".*\" short-circuits the filter (all branch, src/sv_sys_unix.c:131) listing every file; property of one value, not the default. suspect_pool_member FALSE. No mechanical candidate / trailing comment -> no C2 conflict. Verdict synthesized, confidence high.",
  "description_proposed": null
}
```
