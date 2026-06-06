# describe-fill-synthesis ledger -- qwfwd `listip`

- **Project:** qwfwd
- **Knob:** `listip` (command)
- **Handler / registration:** handler `SV_ListIP_f` (`src/ban.c:234-256`); registered `Cmd_AddCommand("listip", SV_ListIP_f)` at `src/ban.c:512` (inside `Ban_Init`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- the file-top block comment `src/ban.c:5-34` mentions `listip` at `:20-21` ["Prints the current list of filters."] but is an upstream HINT, NOT a register-site comment and NOT a seed).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=command).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:listip: synthesized -- cold-synth; prints the current packet-filter list (one line per entry: IP, type ban/safe, and remaining seconds for timed entries); read-only, takes no args; Set by server config / command line (no rcon, no access check) -- origin=synthesized ref=src/ban.c:241 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Prints the proxy's current packet-filter list (the entries created with `addip`). Each entry is shown on its own line with its address, its type (`ban` or `safe`), and, for an entry that was given an expiry, how many seconds it has left. This command only reports the list; it does not change it and takes no arguments.
>
> Set by: server config / command line.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`listip` / `SV_ListIP_f` / `ipfilters` / `numipfilters`) confirms `listip` is referenced only in `src/ban.c` (registration `:512`, handler `:234-256`, and the file-top comment `:20-21`). All sites below at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `src/ban.c:512` | `Cmd_AddCommand("listip", SV_ListIP_f)` -- binds the command name to the handler |
| Handler body | `src/ban.c:234-256` | the whole list-print operation |
| Header line | `src/ban.c:240` | `Sys_Printf("Filter list:\n");` |
| Per-entry loop | `src/ban.c:241-255` | iterate all `numipfilters` entries; print one line each |
| Address print | `src/ban.c:243-244` | `*(unsigned *)b = ipfilters[i].compare;` then prints the four octets `%3i.%3i.%3i.%3i` |
| Type print | `src/ban.c:245-250` | switch on `ipfilters[i].type`: `ipft_ban` -> " ban", `ipft_safe` -> "safe", else "unkn" |
| Remaining-time print | `src/ban.c:251-252` | `if (ipfilters[i].time) Sys_Printf(" | %i s", (int)(ipfilters[i].time-long_time));` -- seconds remaining; omitted for permanent (time==0) |
| Read-only / no args | whole handler `src/ban.c:234-256` | no `Cmd_Argv` read, no write to `ipfilters`/`numipfilters` -- pure print |
| Contrast: richer ban-only list | `src/ban.c:357-375` (`SV_BanList_f`) | the separate `banlist` command prints a formatted table with list-IDs and human-readable durations; `listip` is the simpler raw dump of ALL entries |

## D5 rubric check (Step 3)

Cold-synth: no trailing comment at register site `src/ban.c:512`; the file-top comment ("Prints the current list of filters.") is an upstream HINT and, while accurate at a high level, is a name-level restatement that omits what each line shows -> nothing to affirm, evaluate anyway and SYNTHESIZE. Rubric: (1) admin-observable WHAT (prints the filter list); (2) not a name restatement (spells the per-line fields: address, type, remaining time); (3) the enum values shown (`ban`/`safe`) and the remaining-seconds field spelled out; (4) mechanism only; (5) self-contained. All five hold. COMMAND with no args -> "Default:" omitted (it ignores any args and always prints the full list).

## Per-clause enforce-trace table (B1)

All sites in `src/ban.c` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: prints the current packet-filter list | `src/ban.c:240-241` (+ reg `:512`) | `Sys_Printf("Filter list:\n"); for (i=0 ; i<numipfilters ; i++)` | MATCH |
| Scope: it is the list created by `addip` | `src/ban.c:241` (`ipfilters`/`numipfilters`) | loop over the same static `ipfilters[]` (`:56-57`) `SV_AddIP_f` writes | MATCH |
| Each entry on its own line | `src/ban.c:254` | `Sys_Printf("\n");` at the end of each loop iteration | MATCH |
| Shows the address | `src/ban.c:243-244` | `*(unsigned *)b = ipfilters[i].compare; Sys_Printf("%3i.%3i.%3i.%3i | ", b[0], b[1], b[2], b[3]);` | MATCH |
| Shows the type (`ban`/`safe`) | `src/ban.c:245-250` | `switch((int)ipfilters[i].type) { case ipft_ban: Sys_Printf(" ban"); break; case ipft_safe: Sys_Printf("safe"); break; default: Sys_Printf("unkn"); break; }` | MATCH |
| Shows remaining seconds for timed entries (omitted for permanent) | `src/ban.c:251-252` | `if (ipfilters[i].time) Sys_Printf(" | %i s", (int)(ipfilters[i].time-long_time));` -- printed only when time != 0 | MATCH |
| Read-only: does not change the list | whole handler `src/ban.c:234-256` | no assignment to `ipfilters`/`numipfilters`, no `fopen`/write -- only `Sys_Printf` calls | MATCH (absence of any mutation) |
| Takes no arguments | whole handler `src/ban.c:234-256` | no `Cmd_Argv(...)` read anywhere in the handler -> any args are ignored | MATCH (absence of arg read) |
| Set by: server config / command line (no rcon, no access check) | `src/cmd.c:869-912` + `src/main.c:142,147,155,520` | `Cmd_ExecuteString` dispatch with no `CF_`/permission check; entry only via cfg-`exec` and `Cmd_StuffCmds` | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user doc per D20: every file:line cite; the C identifiers (`SV_ListIP_f`, `ipfilters`, `numipfilters`, `ipft_ban`/`ipft_safe`, `SV_BanList_f`, `Cmd_ExecuteString`); the `%3i.%3i.%3i.%3i` format mechanics; the `compare`->octet byte cast. The user doc states only the admin-observable WHAT (prints the list; per-line fields address/type/remaining-time; read-only; no args) and Set-by.

No `See also:` to the sibling `banlist`: it is a separate qwfwd command (formatted ban-only table with list-IDs), not an L1 See-also anchor in this arc; the contrast is recorded here in reasoning only.

## Rationale

Cold-synth from fully-legible use-sites. `listip` is the read-only reporter for the in-memory `ipfilters[]` list (`src/ban.c:56-57`). The handler `SV_ListIP_f` (`:234-256`) prints a "Filter list:" header (`:240`) then one line per entry (`:241-255`): the four-octet address from `compare` (`:243-244`), the type as " ban"/"safe"/"unkn" (`:245-250`), and -- only when the entry has a non-zero expiry -- the seconds remaining (`ipfilters[i].time - long_time`, `:251-252`); permanent entries (time==0) print no time field. The handler reads no `Cmd_Argv` and writes nothing to the list, so it is purely informational and ignores any arguments. The file comment's one-liner ("Prints the current list of filters.") is accurate but omits the per-line content; the description spells the fields from code.

Honest contrast recorded in reasoning (not the user doc): qwfwd also has a separate `banlist` command (`SV_BanList_f` `:357-375`) that prints a formatted table with numeric list-IDs and human-readable durations (days/hours/minutes). `listip` is the simpler raw dump of ALL entries (both safe and ban) without IDs; `banlist` is the IDs-and-durations view used together with `banremove`. They are distinct commands; the description does not conflate them.

WI-2 access trace: identical to the `addip`/`removeip` ledgers -- qwfwd has no `CF_` command-access flags and no rcon; `Cmd_ExecuteString` (`src/cmd.c:869-912`) dispatches with no permission check; commands enter only from `exec` of the config files and from the command line (`Cmd_StuffCmds` `src/main.c:155`). Hence Set-by "server config / command line", traced to the dispatch (WI-2), not inferred from the name. (Being a read-only report, `listip` would in practice be run at the console, but the source path that runs it is config/command-line; no separate console path exists to claim.)

`description_provenance` stays `null` (cold-synth; operator 2026-05-30). No C2 conflict (no mechanical candidate). No SR-5 breadcrumb (IP-filter not among the three concept-note candidates).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing print/branch line (or, for "read-only" / "no args", the verifiable absence of any list mutation / any `Cmd_Argv` read in the handler); no clause rests on the command name, an enum name, a printed string, or the file comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "listip",
  "type": "command",
  "description": "Prints the proxy's current packet-filter list (the entries created with `addip`). Each entry is shown on its own line with its address, its type (`ban` or `safe`), and, for an entry that was given an expiry, how many seconds it has left. This command only reports the list; it does not change it and takes no arguments.\n\nSet by: server config / command line.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/ban.c:512 (Cmd_AddCommand(\"listip\", SV_ListIP_f); handler SV_ListIP_f src/ban.c:234-256); file-top block comment :20-21 ('Prints the current list of filters.') is an upstream HINT and a name-level restatement omitting per-line content -> nothing to affirm, synthesize. Tree-wide grep: listip only in src/ban.c. Clauses->cites: prints the current filter list -> src/ban.c:240-241 ('Filter list:' header + loop) + reg :512; same list addip creates -> iterates static ipfilters[] :241 (the :56-57 array); each entry on its own line -> trailing Sys_Printf('\\n') :254; shows address -> :243-244 (compare cast to 4 octets, %3i.%3i.%3i.%3i); shows type ban/safe -> switch :245-250 (ipft_ban->' ban', ipft_safe->'safe', default 'unkn'); shows remaining seconds for timed entries, omitted for permanent -> :251-252 (if (ipfilters[i].time) prints (time-long_time) seconds; time==0 prints nothing); read-only -> whole handler has no assignment to ipfilters/numipfilters and no fopen/write, only Sys_Printf; takes no args -> no Cmd_Argv read anywhere in :234-256. WI-2 Set-by: qwfwd has no CF_ access flags, no rcon; Cmd_ExecuteString src/cmd.c:869-912 dispatches with no permission check; entry only via cfg exec (main.c:142, ban.c:520) + command line (Cmd_StuffCmds main.c:155); no interactive stdin loop (main.c:160-174) -> Set by: server config / command line (traced to dispatch, not name). COMMAND, no args -> Default omitted (ignores any args, always prints full list). Contrast recorded in reasoning, not user doc: separate banlist command (SV_BanList_f :357-375) prints a formatted table with numeric list-IDs + human-readable durations; listip is the simpler raw dump of ALL entries without IDs; distinct commands, no See-also (banlist not an arc anchor). provenance=null (cold-synth, operator 2026-05-30). No C2 conflict. No SR-5 breadcrumb. Grading: synthesized, high confidence, every clause TRACED-CLEAN.",
  "description_proposed": null
}
```
