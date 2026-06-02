# describe-fill-synthesis ledger -- mvdsv `sv_lastscores`

- **project:** mvdsv
- **knob:** `sv_lastscores` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_lastscores: synthesized -- prints newest-first score summaries from recent demos' .txt; count arg (0=all, def 10), live-match cap 10; client 'lastscores' shares handler and engine shadows KTX's QC lastscores (non-overrideable) -- origin=synthesized ref=src/sv_demo_misc.c:988 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints the saved score summary for the most recent recorded demos -- the first line of each demo's companion text file, listing the match result. It lists the most recent demos, printed oldest-first (the newest demo is the last line).
>
> sv_lastscores [<count>] = list the last <count> demos; omitting <count>, or giving 0 or less, lists the last 10. The count is reduced to 10 while a match is in progress.
>
> The identical listing is available to any connected player via the client command 'lastscores'.
>
> Default: 10 demos.
> Set by: server console / rcon (the player-issued form is 'lastscores').

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| lists recent demos' saved score summary (first line of .txt) | src/sv_demo_misc.c:1009-1026 | loop over dir.files, fopen companion .txt, truncate at first '\n', Con_Printf | MATCH |
| newest first | src/sv_demo_misc.c:988-989 | `Sys_listdir(..., sv_demoRegexp.string, SORT_BY_DATE)` | MATCH |
| count arg; 0 = all; default 10 | src/sv_demo_misc.c:980,984-986,967 | usage '0' for all; `(demos = Q_atoi(Cmd_Argv(1))) <= 0 -> MAXDEMOS`; `#define MAXDEMOS 10` | MATCH |
| capped to 10 during live match | src/sv_demo_misc.c:999-1001 | `if (demos > MAXDEMOS && GameStarted()) ... demos = MAXDEMOS` | MATCH |
| client form 'lastscores' = same effect | src/sv_user.c:3344 | `{"lastscores", SV_LastScores_f, false}` | MATCH |
| client form non-overrideable -> engine wins (shadows KTX QC) | src/sv_user.c:3408-3416 | `if (!u->overrideable) { u->func(); goto out; }` (false -> taken) | MATCH |
| KTX defines competing lastscores QC cmd (shadowed) | ktx/src/commands.c:899-900,6981 | `{ "lastscores", lastscores, 0, CF_BOTH|CF_MATCHLESS|CF_PARAMS, CD_LASTSCORES }` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Prints saved score summary for recent recorded demos | sv_demo_misc.c:1007-1032 | `Con_Printf("List of %d last demos:\n", demos);` ... loop reads each demo's companion file | MATCH |
| 2 | Reads the FIRST LINE of each demo's companion text file | sv_demo_misc.c:1023-1026 | `buf[fread(...)]=0; if((nl=strchr(buf,'\n'))) nl[0]=0; Con_Printf("%s\n", Q_yelltext(...buf));` (truncates at first `\n`) | MATCH |
| 3 | The first line lists the match result | sv_demo_misc.c:283-331 (writer SV_PrintTeams) | `snprintf(lastscores,...,"duel: %s vs %s @ %s - %i:%i\n",...)` then `strlcat(lastscores, buf, ...)` — summary is line 1, detail follows | MATCH |
| 4 | Companion text file = demo name with .txt | sv_demo_misc.c:546-550 (SV_MVDName2Txt) + sv_demo.c:860-876 (writer) | `s[len++]='.';s[len++]='t';s[len++]='x';s[len++]='t';` ; writer `fwrite(SV_PrintTeams(),...)` gated on `sv_demotxt` | MATCH |
| 5 | **The newest demos are shown FIRST** | sv_main.c:4190-4193 + sv_demo_misc.c:1009-1014 | comparator `return a->time - b->time` (ascending qsort = oldest-first/newest-LAST); loop `for(i=numfiles-demos; i<numfiles;)` prints ascending i | **MISMATCH** — newest demo is printed LAST, not first |
| 6 | `sv_lastscores [<count>]` lists the last `<count>` demos | sv_demo_misc.c:984-986 | `if(Cmd_Argc()==2) if((demos=Q_atoi(Cmd_Argv(1)))<=0) demos=MAXDEMOS;` | MATCH (for count > 0) |
| 7 | **`<count>` of 0 lists ALL** | sv_demo_misc.c:985-986 (+ Q_atoi bothtools.c:54) | `if((demos=Q_atoi(Cmd_Argv(1)))<=0) demos=MAXDEMOS;` — Q_atoi("0")=0, 0<=0 → demos=MAXDEMOS(10); no list-all branch exists | **MISMATCH** — 0 lists 10 (the MAXDEMOS fallback), never "all" |
| 8 | Omitting it lists the last 10 | sv_demo_misc.c:971 + 984 | `int demos = MAXDEMOS` init; `Cmd_Argc()==2` guard skipped when omitted → demos stays MAXDEMOS=10 | MATCH |
| 9 | Count reduced to 10 while a match is in progress | sv_demo_misc.c:999-1001 | `if(demos>MAXDEMOS && GameStarted()) ... demos=MAXDEMOS;` (MAXDEMOS=10, line 967) | MATCH |
| 10 | Identical listing available to any connected player via client command `lastscores` | sv_user.c:3344 + 3399-3416 | `{"lastscores", SV_LastScores_f, false}` ; SV_ExecuteUserCommand dispatches same fn for any clc_stringcmd; no spectator/admin gate | MATCH (same fn; "any connected client" incl. spectators) |
| 11 | Default: 10 demos | sv_demo_misc.c:967,971 | `#define MAXDEMOS 10` ; `int demos = MAXDEMOS` — NOTE: command (Cmd_AddCommand), no cvar default; "10" is the no-arg fallback, correctly stated | MATCH |
| 12 | Set by: server console / rcon; player form is `lastscores` | sv_demo.c:1943 + sv_user.c:3344 | `Cmd_AddCommand("sv_lastscores", SV_LastScores_f);` (server console cmd, rcon-reachable) ; ucmd `lastscores` for players | MATCH |

**V-pass notes:** C-FIX: two clauses contradict the enforcing code.

(1) "The newest demos are shown first" is INVERTED. Sys_compare_by_date (sv_main.c:4192) returns `a->time - b->time`, so qsort produces ascending-by-time order (oldest first, newest last). SV_LastScores_f (sv_demo_misc.c:1009) iterates the tail slice `i = numfiles-demos .. numfiles` in ASCENDING i and prints in that order, so the printed list runs oldest-of-slice -> newest, i.e. the single newest demo is the LAST line, not the first. Verified identical comparator on both platforms (sv_sys_unix.c:193, sv_sys_win.c:247). Correct statement: oldest shown first / newest shown last (the newest demos are the ones INCLUDED, but displayed at the bottom).

(2) "<count> of 0 lists all" is WRONG. sv_demo_misc.c:985-986 maps any `Q_atoi(arg) <= 0` to `demos = MAXDEMOS` (=10). Q_atoi("0")=0 (bothtools.c:54), 0 satisfies `<=0`, so passing 0 lists 10 (capped at numfiles), NOT all. There is no list-all branch anywhere; the max is bounded by dir.numfiles (line 996). This is a textbook flavour-C trap: the clause matches the engine's OWN usage string at line 980 ("'0' for all demos") which is itself stale/buggy, but contradicts the enforcing branch. Inference from the printed usage text, not the gating code.

Everything else traced clean. Core mechanism (reads first line of each demo's .txt companion = match-result summary written by SV_PrintTeams; gated on sv_demotxt!=0 for the file to exist), the omitted=10 default, the match-in-progress 10-cap, the player `lastscores` ucmd sharing SV_LastScores_f, and the console/rcon registration are all verified at their enforcing lines.

Two omissions that are NOT defects (correct to leave out for the documented paths): (a) MAXDEMOS_RD_PACKET=100 cap (sv_demo_misc.c:1003) applies only to the connectionless SVC path (sv_redirected==RD_PACKET), gated additionally by sv_allowlastscores (sv_main.c:700) — neither the server console nor the in-game `lastscores` ucmd (RD_CLIENT) hits it. (b) The .txt file existence/content depends on sv_demotxt (default "1"); with sv_demotxt==2 only an empty file is made -> entries print "(empty)". The description's "companion text file" framing presumes the standard sv_demotxt=1 case, which is fine.

WI-2: "Default: 10 demos" is NOT a cvar-default claim — sv_lastscores is a command (Cmd_AddCommand, sv_demo.c:1943), not a cvar. The "10" correctly describes the no-argument fallback (MAXDEMOS), so no WI-2 metadata error; the word "Default" is acceptable shorthand for the omitted-arg behavior.

## flags_for_review

- [review/cross-mod-override/synthesis] Cross-mod shadow: KTX registers its OWN 'lastscores' and 'lastscoresktx' QC commands (ktx/src/commands.c:899-900, handler commands.c:6981) showing KTX's in-mod match history. But the engine's ucmds[] entry {"lastscores", SV_LastScores_f, false} is overrideable=FALSE, so SV_ExecuteUserCommand (src/sv_user.c:3410-3412) dispatches the ENGINE handler and 'goto out' before the QC progs path runs. Net effect: a connected client typing 'lastscores' gets the engine's demo-file listing, NOT KTX's QC version, even when KTX is the running mod. KTX's QC 'lastscores'/'lastscoresktx' appear reachable only via server-side QC invocation, not the client stringcmd path. Worth a human confirm that this shadowing is intended (it overrides a mod feature with engine behaviour).
- [review/suspected-bug/vpass] Upstream MVDSV self-inconsistency: SV_LastScores_f's own usage string (sv_demo_misc.c:980) advertises "<numlastdemos> = '0' for all demos", but the enforcing branch (lines 985-986) maps any value <=0 to MAXDEMOS(10). Passing 0 lists 10, not all. The proposed description inherited the wrong behavior verbatim from this stale usage text. Either the code or the usage string is a bug; the help/doc layer should track the ACTUAL behavior (0 -> 10), and this is a candidate upstream-PR note (usage string says all, code does 10).
- [blocker/contradiction/vpass] "Newest demos shown first" is inverted vs the display order. qsort ascending-by-time + ascending print loop => newest demo prints LAST. This is the highest-impact fix for the row: a user told 'newest first' will misread the numbered list (line 1 is the oldest of the shown slice).
- [fyi/off-scope-entity/vpass] Connectionless SVC path (SVC_LastScores, sv_main.c:698-706) and the player/console paths are ALL gated/shaped by sibling cvar sv_allowlastscores (default "1", sv_main.c:126). The connectionless path additionally caps at MAXDEMOS_RD_PACKET=100. Not in scope for this knob's description but relevant if sv_allowlastscores is documented as the access toggle for the lastscores family.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_lastscores",
  "type": "command",
  "description": "Prints the saved score summary for the most recent recorded demos -- the first line of each demo's companion text file, listing the match result. It lists the most recent demos, printed oldest-first (the newest demo is the last line).\n\nsv_lastscores [<count>] = list the last <count> demos; omitting <count>, or giving 0 or less, lists the last 10. The count is reduced to 10 while a match is in progress.\n\nThe identical listing is available to any connected player via the client command 'lastscores'.\n\nDefault: 10 demos.\nSet by: server console / rcon (the player-issued form is 'lastscores').",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo_misc.c:988. Shared handler SV_LastScores_f (src/sv_demo_misc.c:969). Newest-first / source-of-rows (enforcing): src/sv_demo_misc.c:988-989 `Sys_listdir(va(\"%s/%s\", fs_gamedir, sv_demoDir.string), sv_demoRegexp.string, SORT_BY_DATE)` -- SORT_BY_DATE is the 'newest first' trap line. The loop src/sv_demo_misc.c:1009-1032 opens each demo's companion .txt (SV_MVDName2Txt) and prints only its first line (strchr '\\n' truncates at 1024) -> the score summary. Count arg: src/sv_demo_misc.c:984-986 reads Cmd_Argv(1); '<=0' resets to MAXDEMOS; usage at :980 documents '0' = all and '' = last MAXDEMOS. Default MAXDEMOS=10 (#define src/sv_demo_misc.c:967). Live-match cap: src/sv_demo_misc.c:999-1001 `if (demos > MAXDEMOS && GameStarted()) demos = MAXDEMOS`. Packet cap (RD_PACKET only, not the console/rcon path): src/sv_demo_misc.c:1003-1005 caps to MAXDEMOS_RD_PACKET=100 -- omitted from user doc as it does not apply to a console/rcon admin. Dual registration: console `sv_lastscores` registered Cmd_AddCommand (src/sv_demo.c:1943) AND client `lastscores` in ucmds[] (src/sv_user.c:3344) sharing SV_LastScores_f. The ucmds[] entry is overrideable=FALSE -> dispatch loop src/sv_user.c:3408-3416 calls the ENGINE handler and goto out BEFORE SV_ExecutePRCommand, so the engine handler ALWAYS wins for a client typing 'lastscores'. F-MV1: KTX DOES define its own `lastscores`/`lastscoresktx` QC commands (ktx/src/commands.c:899-900, handler lastscores() at commands.c:6981) showing KTX's own match history -- but because the engine ucmds[] entry is non-overrideable, the KTX QC command is SHADOWED for the client-stuffed path; the engine demo-file listing is what a connected client gets. Flagged for human review (cross-mod shadow). [MAIN-HG2 edit: 'newest first' -> oldest-first/newest-last (Sys_compare_by_date ascending sv_main.c:4192 + ascending print loop sv_demo_misc.c:1009); '0 lists all' -> '0/<=0 maps to the last 10' (sv_demo_misc.c:985-986); the engine usage string :980 claiming '0=all' is itself wrong.]",
  "description_proposed": null
}
```
