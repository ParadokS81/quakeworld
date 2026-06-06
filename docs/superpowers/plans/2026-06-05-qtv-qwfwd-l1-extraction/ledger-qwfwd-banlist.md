# describe-fill-synthesis ledger -- qwfwd `banlist`

- **Project:** qwfwd
- **Knob:** `banlist` (command)
- **Handler / registration:** handler `SV_BanList_f` (`src/ban.c:357-375`); registered `Cmd_AddCommand("banlist", SV_BanList_f)` at `src/ban.c:517` inside `Ban_Init` (`src/ban.c:506`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth). The file header block (`src/ban.c:5-34`) documents the OLD `listip` command, NOT `banlist`; the two differ (see Rationale).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=command).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:banlist: synthesized -- cold-synth; prints the proxy's filter list as a numbered table (ID, IP/mask, type ban/safe, time-until-expiry or "permanent"), safe entries first then bans; "Ban list: empty" when none; the ID column is what banremove consumes -- origin=synthesized ref=src/ban.c:357 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Prints the proxy's connection filter list as a numbered table: each entry's ID, the IP or IP range it matches, its type ("ban" or "safe"), and how long until it expires (or "permanent" for entries with no expiry). Safe entries are listed first, then bans. If the list is empty it prints "Ban list: empty". Takes no arguments. The ID shown here is the number you pass to `banremove` to clear an entry.
>
> Set by: proxy server console (the operator at the running proxy). The proxy has no rcon command of its own, so this cannot be issued remotely.

## Read use-sites (WI-1 wide read -- whole src/ tree)

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `src/ban.c:517` | binds the name `banlist` to handler `SV_BanList_f` |
| Handler | `src/ban.c:357-375` | empty-check, prints header, then dumps safe then ban entries |
| Empty branch | `src/ban.c:361-365` | `numipfilters < 1` -> prints "Ban list: empty" and returns |
| Header row | `src/ban.c:367-371` | prints column titles `id \| ip mask \| type \| expire` |
| Body (safe then ban) | `src/ban.c:373-374` -> `Do_BanList` `src/ban.c:309-355` | `Do_BanList(ipft_safe)` then `Do_BanList(ipft_ban)` -- ordering, and per-entry formatting |
| Per-entry row format | `Do_BanList` `src/ban.c:315-354` | ID (`i`), dotted IP, type label, and time-left as `d/h/m/s` or "permanent" |
| Also reused as a sub-call | `SV_Cmd_Banremove_f` `src/ban.c:463` | `banremove` with no arg calls this same handler |
| Shared store | `ipfilters[]`/`numipfilters` `src/ban.c:56-57` | same array as `addip`/`removeip`/`listip`/`banip`/`banremove` |
| Command dispatch | `Cmd_ExecuteString` `src/cmd.c:869-913` fed by stdin `src/sys.c:268` | flat table, no access-class check; local console only |

## D5 rubric check (Step 3)

Cold-synth: no comment/candidate for `banlist` (header documents `listip`, a different command). Handler fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT -- it prints the filter list as a numbered table; (2) not a name restatement -- spells out the columns, the safe-before-ban ordering, the empty-list text, and the load-bearing link to `banremove`'s ID, none of which the name conveys; (3) the column meanings + the "permanent" expiry case are spelled out (no opaque "the list"); (4) mechanism only, no opinion; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

Sites span the whole `src/` tree at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Prints a numbered table with columns id / ip mask / type / expire | `src/ban.c:367-371` (header) + `Do_BanList` `src/ban.c:321-353` (rows) | header `"%3.3s\|%15.15s\|%4.4s\|%9.9s\n", blist, id, ipmask, type, expire` where the literals are "id","ip mask","type","expire" (`src/ban.c:359`); rows `Sys_Printf("%3i\|%3i.%3i.%3i.%3i", i, b[0]...)` then type then time | MATCH |
| Each entry shows its ID | `Do_BanList` `src/ban.c:321` | `Sys_Printf("%3i\|%3i.%3i.%3i.%3i", i, b[0], b[1], b[2], b[3]);` (the leading `i`) | MATCH |
| Type is "ban" or "safe" | `Do_BanList` `src/ban.c:322-327` | `switch(...){ case ipft_ban: Sys_Printf("\| ban"); break; case ipft_safe: Sys_Printf("\|safe"); break; default: ... "\|unkn"; }` | MATCH |
| Shows time until expiry, or "permanent" when none | `Do_BanList` `src/ban.c:329-351` | `if (ipfilters[i].time) { ... d/h/m/s formatting ... } else { Sys_Printf("\|permanent"); }` | MATCH |
| Safe entries listed first, then bans | `src/ban.c:373-374` | `Do_BanList(ipft_safe);` then `Do_BanList(ipft_ban);` and `Do_BanList` skips non-matching types (`if (ipfilters[i].type != ipft) continue;` `src/ban.c:317`) | MATCH |
| Empty list prints "Ban list: empty" | `src/ban.c:361-365` | `if (numipfilters < 1) { Sys_Printf("Ban list: empty\n"); return; }` | MATCH |
| Takes no arguments | `src/ban.c:357-375` (handler reads no `Cmd_Argv`) | handler body references no `Cmd_Argc()`/`Cmd_Argv()` -- it ignores any args | MATCH |
| The ID shown is the one `banremove` consumes | `Do_BanList` `src/ban.c:321` (`i`) vs `SV_Cmd_Banremove_f` `src/ban.c:467,484` | banlist prints index `i`; `banremove` does `id=atoi(arg)` then `SV_RemoveBansIPFilter(id)` indexing the same `ipfilters[]` | MATCH |
| Set by: proxy console only; no remote/rcon path | dispatch `src/cmd.c:869-913` fed by stdin `src/sys.c:263-332`; rcon absent `src/cmd.c:1008-1023` (commented out), `src/svc.c:464-465` | `Cmd_ExecuteString` no access check; `Sys_ReadSTDIN` gated `if (!isatty(STDIN)...) return;`; `Cmd_RconCommand` commented out; svc.c "we do not have own rcon command" | MATCH |

## D20 split note

Routed to reasoning / this ledger, kept OUT of `description`: every file:line, the C identifiers (`SV_BanList_f`, `Do_BanList`, `ipfilters`, `ipft_ban`/`ipft_safe`, `numipfilters`, `Sys_Printf`), the `printf` format strings, and the console-charset box-drawing bytes in the header (`\235\236...\237`, `src/ban.c:368-369`) -- those render as a horizontal rule in the QW console font and are a display artifact, not user-doc content. The user doc names the columns and behaviors in plain terms. The banlist<->banremove ID link is stated inline because it is action-changing (the operator reads the ID here to feed `banremove`), meeting the D20 bar; the index mechanism stays in reasoning. No cross-engine `See also:` warranted.

## Rationale

Cold-synth from a fully-legible handler. `banlist` (`SV_BanList_f` `src/ban.c:357-375`) prints the shared `ipfilters[]` list (`src/ban.c:56`) as a numbered table. On an empty list (`numipfilters < 1`) it prints "Ban list: empty" and returns (`src/ban.c:361-365`); otherwise it prints a header naming the columns "id", "ip mask", "type", "expire" (the literal strings at `src/ban.c:359`, formatted `src/ban.c:367-371`) and then calls `Do_BanList(ipft_safe)` followed by `Do_BanList(ipft_ban)` (`src/ban.c:373-374`) -- so safe entries print first, then bans, because `Do_BanList` skips entries whose type does not match its argument (`src/ban.c:317`). `Do_BanList` (`src/ban.c:309-355`) prints per entry: the array index `i` as the ID (`src/ban.c:321`), the dotted IP from `compare`, the type label ban/safe/unkn (`src/ban.c:322-327`), and -- if the entry has a non-zero `time` -- the remaining duration broken into days/hours/minutes/seconds (`src/ban.c:329-347`), else the literal "permanent" (`src/ban.c:350`). The handler reads no arguments, so it is argument-ignoring (I confirmed by absence: no `Cmd_Argv`/`Cmd_Argc` in the body). The printed ID column is exactly what `banremove` consumes -- `banremove` does `atoi(arg)` then `SV_RemoveBansIPFilter(id)` indexing the same array (`src/ban.c:467,484`) -- which is why I assert the inline link; traced to both print and index sites, not inferred. This differs from the older `listip` (`SV_ListIP_f` `src/ban.c:234-256`), which prints ALL entries in a single pass with a different per-line format and NO ID column; `banlist` is the ban-aware view (typed sections + IDs + human-readable expiry) and is the one paired with `banremove`. The header line embeds console-font box-drawing bytes (`src/ban.c:368-369`) that render as a separator rule in the QW charset -- a display artifact, kept out of the user doc. Access is identical to the rest of the family: `Cmd_ExecuteString` (`src/cmd.c:869`) has no access-class system and is fed only by the TTY-gated `Sys_ReadSTDIN` (`src/sys.c:268`); `Cmd_RconCommand` is commented out (`src/cmd.c:1008-1023`) and the proxy forwards `rcon` rather than running it (`svc.c:464-465`) -- so `Set by: proxy server console`. No C2 conflict. `description_provenance` stays `null` (cold-synth). SR-5: no concept-note breadcrumb. Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/print/call incl. the callee-follow into `Do_BanList` and the cross-check against `SV_Cmd_Banremove_f` for the ID linkage.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "banlist",
  "type": "command",
  "description": "Prints the proxy's connection filter list as a numbered table: each entry's ID, the IP or IP range it matches, its type (\"ban\" or \"safe\"), and how long until it expires (or \"permanent\" for entries with no expiry). Safe entries are listed first, then bans. If the list is empty it prints \"Ban list: empty\". Takes no arguments. The ID shown here is the number you pass to `banremove` to clear an entry.\n\nSet by: proxy server console (the operator at the running proxy). The proxy has no rcon command of its own, so this cannot be issued remotely.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no comment/candidate for banlist (ban.c:5-34 header documents listip, a DIFFERENT command) -> synthesize. Handler SV_BanList_f src/ban.c:357-375. Clauses->cites: numbered table with columns id/ip mask/type/expire -> header literals 'id','ip mask','type','expire' ban.c:359 formatted ban.c:367-371, rows in Do_BanList ban.c:321-353; per-entry ID -> Do_BanList ban.c:321 Sys_Printf('%3i|...', i, ...) (leading index i); type ban/safe -> ban.c:322-327 switch; time-until-expiry or 'permanent' -> ban.c:329-351 if(ipfilters[i].time){d/h/m/s} else Sys_Printf('|permanent'); safe-first-then-ban -> ban.c:373-374 Do_BanList(ipft_safe) then Do_BanList(ipft_ban), Do_BanList skips non-matching type ban.c:317; empty -> ban.c:361-365 if(numipfilters<1) 'Ban list: empty'; takes no args -> handler body has no Cmd_Argv/Cmd_Argc (arg-ignoring, confirmed by absence); ID == banremove's arg -> banlist prints index i ban.c:321, banremove does atoi(arg)+SV_RemoveBansIPFilter(id) ban.c:467,484 indexing the same ipfilters[] (traced to both sites, not inferred). Differs from older listip SV_ListIP_f ban.c:234-256 (single pass, no ID column) -- banlist is the ban-aware view paired with banremove. Header box-drawing bytes ban.c:368-369 are a console-font display artifact, kept out of user doc (D20). Shared store ipfilters[] ban.c:56. Set-by proxy console only: Cmd_ExecuteString cmd.c:869-913 no access flags, fed by TTY-gated Sys_ReadSTDIN sys.c:268; Cmd_RconCommand cmd.c:1008-1023 commented out; svc.c:464-465 forwards rcon. No C2 conflict. provenance=null (cold-synth). No SR-5 breadcrumb. Self-classify: TRACED-CLEAN, every clause maps to an enforcing branch/print/call incl. callee-follow into Do_BanList and cross-check of SV_Cmd_Banremove_f for the ID linkage.",
  "description_proposed": null
}
```
