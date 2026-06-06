# describe-fill-synthesis ledger -- qwfwd `writeip`

- **Project:** qwfwd
- **Knob:** `writeip` (command)
- **Handler / registration:** handler `SV_WriteIP_f` (`src/ban.c:263-307`); registered `Cmd_AddCommand("writeip", SV_WriteIP_f)` at `src/ban.c:513` (inside `Ban_Init`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- the file-top block comment `src/ban.c:23-24` describes `writeip` but is an upstream HINT, NOT a register-site comment and NOT a seed; it is also STALE on the filename -- see finding).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=command).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:writeip: synthesized -- cold-synth; saves the current packet-filter list to qwfwd_listip.cfg as a series of addip lines (safe entries first, then bans), overwriting that file; the file is auto-exec'd at startup so the list survives a restart; no args; Set by server config / command line (no rcon, no access check); also auto-invoked by banip/banremove -- origin=synthesized ref=src/ban.c:274 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Saves the proxy's current packet-filter list to a file so it survives a restart. The list normally lives only in memory; this command writes it out as a series of `addip` commands. That file is automatically run when the proxy starts, so a saved list is reloaded on the next launch. Running this overwrites the file with the current list, and it takes no arguments.
>
> Set by: server config / command line.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`writeip` / `SV_WriteIP_f` / `LISTIP_NAME` / `ipfilters` / `Cbuf_AddText("writeip")`) confirms `writeip` is referenced only in `src/ban.c`. The auto-invocations are `Cbuf_AddText("writeip\n")` from `banip` (`:452`) and `banremove` (`:485`); the file it writes (`LISTIP_NAME = "qwfwd_listip.cfg"`) is auto-exec'd by `Ban_Init` (`:520`). All sites below at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `src/ban.c:513` | `Cmd_AddCommand("writeip", SV_WriteIP_f)` -- binds the command name to the handler |
| Handler body | `src/ban.c:263-307` | the whole save operation |
| Target filename | `src/ban.c:36` + `:270` | `#define LISTIP_NAME "qwfwd_listip.cfg"`; `snprintf(name, sizeof(name), "%s", LISTIP_NAME)` |
| Open (truncate/overwrite) | `src/ban.c:274` | `f = fopen (name, "wb");` -- "wb" truncates -> overwrites any existing file; on failure prints "Couldn't open" and returns (`:275-279`) |
| Write `safe` entries first | `src/ban.c:282-289` | loop 1: skip non-safe; `fprintf(f, "addip %i.%i.%i.%i safe %.0f\n", ...)` |
| Write `ban` (and other) entries second | `src/ban.c:291-304` | loop 2: skip safe; `fprintf(f, "addip %i.%i.%i.%i %s %.0f\n", ...)` with type word " ban"/"safe"/"unkn" |
| Output format = `addip` lines | `src/ban.c:288,303` | each line is a valid `addip <ip> <type> <time>` command -> re-exec rebuilds the list |
| Close | `src/ban.c:306` | `fclose (f);` |
| No args | whole handler `src/ban.c:263-307` | no `Cmd_Argv` read -> any args ignored; always writes the full list to the fixed filename |
| Auto-exec at startup (round trip) | `src/ban.c:520` (`Ban_Init`) | `Cbuf_InsertText ("exec " LISTIP_NAME "\n");` -> the saved file is run at startup, so the list is restored |
| Auto-invoked by `banip` | `src/ban.c:452` | `Cbuf_AddText("writeip\n");` after adding a ban |
| Auto-invoked by `banremove` | `src/ban.c:485` | `Cbuf_AddText("writeip\n");` after removing a ban |

## D5 rubric check (Step 3)

Cold-synth: no trailing comment at register site `src/ban.c:513`; the file-top comment is an upstream HINT and is STALE on the filename (says "listip.cfg"; code uses "qwfwd_listip.cfg") -> nothing to affirm, evaluate anyway and SYNTHESIZE. Rubric: (1) admin-observable WHAT (saves the filter list so it survives a restart); (2) not a name restatement (spells the persist-via-addip-lines mechanism, the auto-exec-at-startup round trip, the overwrite behavior); (3) no enum/args to spell (no-arg command) -- the relevant "values" are the behavior (overwrite, auto-reload), which are stated; (4) mechanism only; (5) self-contained. All five hold. COMMAND with no args -> "Default:" omitted.

## Per-clause enforce-trace table (B1)

All sites in `src/ban.c` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: saves the current filter list to a file | `src/ban.c:274` + `:282-304` (+ reg `:513`) | `f = fopen (name, "wb");` then the two `fprintf(f, "addip ...")` loops | MATCH |
| Scope: it is the list managed by `addip` | `src/ban.c:282,291` (`ipfilters`/`numipfilters`) | both loops iterate the same static `ipfilters[]` (`:56-57`) `SV_AddIP_f` writes | MATCH |
| Mechanism: written as `addip` commands | `src/ban.c:288,303` | `fprintf (f, "addip %i.%i.%i.%i safe %.0f\n", ...)` ; `fprintf (f, "addip %i.%i.%i.%i %s %.0f\n", ...)` | MATCH |
| The list normally lives only in memory | corroborated by absence of any save in `addip`/`removeip` paths + the existence of THIS dedicated save command | `SV_AddIP_f`/`SV_RemoveIP_f` perform no file write; only `writeip` persists | MATCH (absence-of-save elsewhere + dedicated writer) |
| Round trip: the file is auto-run at startup so the list reloads | `src/ban.c:520` (`Ban_Init`) | `Cbuf_InsertText ("exec " LISTIP_NAME "\n");` -- exec'd during init (called `src/main.c:147`) | MATCH |
| Overwrites the existing file | `src/ban.c:274` | `fopen (name, "wb")` -- write-binary mode truncates the file to zero length | MATCH |
| Takes no arguments | whole handler `src/ban.c:263-307` | no `Cmd_Argv(...)` read in the handler -> any args ignored | MATCH (absence of arg read) |
| (reasoning-only) target file is `qwfwd_listip.cfg` | `src/ban.c:36` + `:270` | `#define LISTIP_NAME "qwfwd_listip.cfg"` ; `snprintf(name, sizeof(name), "%s", LISTIP_NAME)` | MATCH |
| (reasoning-only) safe entries written before bans | `src/ban.c:281-304` | comment `:281` "write safe filters first"; loop 1 writes safe (`:282-289`), loop 2 writes the rest (`:291-304`) | MATCH |
| (reasoning-only) also auto-invoked by `banip`/`banremove` | `src/ban.c:452,485` | `Cbuf_AddText("writeip\n");` in both `SV_Cmd_Banip_f` and `SV_Cmd_Banremove_f` | MATCH |
| Set by: server config / command line (no rcon, no access check) | `src/cmd.c:869-912` + `src/main.c:142,147,155,520` | `Cmd_ExecuteString` dispatch with no `CF_`/permission check; entry only via cfg-`exec` and `Cmd_StuffCmds` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user doc per D20: every file:line cite; the C identifiers (`SV_WriteIP_f`, `LISTIP_NAME`, `ipfilters`, `numipfilters`, `fopen`/`fprintf`/`fclose`, `Cbuf_AddText`, `Ban_Init`, `Cmd_ExecuteString`); the `"wb"` truncate detail; the exact filename string; the safe-first write order; the `banip`/`banremove` auto-invocation. The user doc states only the admin-observable WHAT (saves the list so it survives a restart; written as `addip` commands; auto-run at startup; overwrites; no args) and Set-by.

Filename / write-order / auto-invocation decision (D20): I deliberately kept the literal filename `qwfwd_listip.cfg`, the safe-before-ban ordering, and the `banip`/`banremove` auto-write OUT of the `description`. Reasoning: none of the three changes how an admin uses `writeip` (they run `writeip`, or run `banip`/`banremove` which call it for them; they do not pick the filename, which is fixed, and the in-file ordering is invisible to normal use). They are recorded here in reasoning for completeness. This is the D20 "state the admin-observable consequence, not the internals" call -- "it survives a restart because the file is auto-loaded" is the consequence; the filename and ordering are internals.

## Stale-comment finding (file-top block comment vs code)

The upstream block comment `src/ban.c:23-24` is an admissible HINT but is STALE -- NOT used as a citation:

1. It says writeip "Dumps `addip <ip>` commands to **listip.cfg**". The actual target is **`qwfwd_listip.cfg`** (`#define LISTIP_NAME "qwfwd_listip.cfg"` `:36`, used at `:270`). The description avoids the stale name by describing the round trip ("that file is automatically run when the proxy starts") rather than naming the file in the user doc; the correct literal name is recorded here in reasoning.
2. The comment says "The filter lists are not saved and restored by default ... I beleive it would cause too much confusion." That is the upstream-mvdsv stance; in qwfwd the file IS auto-exec'd at startup (`Ban_Init` `:520`), so a written list IS restored automatically on the next launch. The description reflects the LIVE qwfwd behavior (auto-reload), traced to `:520`, not the stale comment.

No clause in the description rests on the stale comment.

## Rationale

Cold-synth from fully-legible use-sites. `writeip` persists the in-memory `ipfilters[]` list (`src/ban.c:56-57`) to disk. The handler `SV_WriteIP_f` (`:263-307`) opens `LISTIP_NAME` (`= "qwfwd_listip.cfg"`, `:36,:270`) in `"wb"` mode (`:274`) -- which truncates, so the write OVERWRITES any existing file -- then emits the entries as `addip` command lines in two passes: safe entries first (`:282-289`, "write safe filters first" `:281`) then ban/other entries (`:291-304`). Each line is `addip <ip> <type> <time>` (`:288,:303`), i.e. a valid command, so re-running the file reconstructs the exact list. The handler reads no `Cmd_Argv`, so it ignores arguments and always writes the full list to the fixed filename.

The round trip is closed by `Ban_Init` (`:520`), which `exec`s `LISTIP_NAME` during startup (`Ban_Init` is called from `src/main.c:147`): a list saved with `writeip` is therefore reloaded automatically on the next launch. This is the admin-observable point of the command -- "it survives a restart" -- and is the LIVE qwfwd behavior, in contrast to the stale file comment that claims filters are not restored (documented above). `writeip` is also auto-invoked by the newer `banip` (`:452`) and `banremove` (`:485`) commands via `Cbuf_AddText("writeip\n")`, so bans added/removed through those commands are persisted without an explicit `writeip` -- recorded in reasoning as it does not change how an admin uses `writeip` itself.

WI-2 access trace: identical to the sibling IP-filter ledgers -- qwfwd has no `CF_` command-access flags and no rcon; `Cmd_ExecuteString` (`src/cmd.c:869-912`) dispatches with no permission check; commands enter only from `exec` of the config files and from the command line (`Cmd_StuffCmds` `src/main.c:155`). Hence Set-by "server config / command line", traced to the dispatch (WI-2), not inferred from the name. (The internal `Cbuf_AddText("writeip")` auto-invocations are a fourth, program-internal trigger, noted in reasoning; they are not an operator-facing "Set by" path.)

`description_provenance` stays `null` (cold-synth; operator 2026-05-30). No C2 conflict (no mechanical candidate; the file comment is a HINT whose stale parts are documented and not relied on). No SR-5 breadcrumb (IP-filter not among the three concept-note candidates).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing fopen/fprintf/exec/branch line (or, for "normally lives only in memory" / "no args", the verifiable absence of a save in the other handlers / any `Cmd_Argv` read here); no clause rests on the command name, an enum name, a printed string, or the stale file comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "writeip",
  "type": "command",
  "description": "Saves the proxy's current packet-filter list to a file so it survives a restart. The list normally lives only in memory; this command writes it out as a series of `addip` commands. That file is automatically run when the proxy starts, so a saved list is reloaded on the next launch. Running this overwrites the file with the current list, and it takes no arguments.\n\nSet by: server config / command line.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/ban.c:513 (Cmd_AddCommand(\"writeip\", SV_WriteIP_f); handler SV_WriteIP_f src/ban.c:263-307); file-top block comment :23-24 is an upstream HINT and STALE (see below) -> nothing to affirm, synthesize. Tree-wide grep: writeip only in src/ban.c (auto-invoked by banip :452 + banremove :485; the file it writes is auto-exec'd by Ban_Init :520). Clauses->cites: saves the current filter list to a file -> fopen :274 + fprintf loops :282-304 + reg :513; same list addip manages -> both loops iterate static ipfilters[] :282,291 (the :56-57 array); written as addip commands -> fprintf 'addip ...' :288,303; normally in memory only -> no file write in SV_AddIP_f/SV_RemoveIP_f, only writeip persists; round trip / auto-run at startup so list reloads -> Ban_Init :520 Cbuf_InsertText('exec ' LISTIP_NAME) (called main.c:147); overwrites existing file -> fopen(name,'wb') :274 (wb truncates); no args -> no Cmd_Argv read in :263-307. Reasoning-only (D20, kept OUT of description): target file is qwfwd_listip.cfg -> #define LISTIP_NAME 'qwfwd_listip.cfg' :36 used :270; safe entries written before bans -> 'write safe filters first' :281, loop1 safe :282-289 then loop2 rest :291-304; also auto-invoked by banip :452 + banremove :485 (Cbuf_AddText('writeip')). Kept filename/order/auto-invoke out of description because none changes how an admin uses writeip (fixed filename, invisible ordering); stated the admin-observable consequence (survives restart via auto-load) instead. WI-2 Set-by: qwfwd has no CF_ access flags, no rcon; Cmd_ExecuteString src/cmd.c:869-912 dispatches with no permission check; entry only via cfg exec (main.c:142, ban.c:520) + command line (Cmd_StuffCmds main.c:155); no interactive stdin loop (main.c:160-174) -> Set by: server config / command line (traced to dispatch, not name); the internal Cbuf_AddText('writeip') auto-invocations are a program-internal trigger, not an operator Set-by path. COMMAND, no args -> Default omitted. STALE-COMMENT finding (HINT not relied on): comment :23-24 says writeip dumps to 'listip.cfg' but actual is 'qwfwd_listip.cfg' (:36,:270) -> description avoids the stale name via the round-trip phrasing, correct name recorded here; comment says filters are NOT saved/restored by default (upstream-mvdsv stance) but in qwfwd the file IS auto-exec'd at startup (:520) so a written list IS restored -> description reflects LIVE qwfwd auto-reload behavior, traced to :520, not the stale comment. provenance=null (cold-synth, operator 2026-05-30). No C2 conflict. No SR-5 breadcrumb. Grading: synthesized, high confidence, every clause TRACED-CLEAN.",
  "description_proposed": null
}
```
