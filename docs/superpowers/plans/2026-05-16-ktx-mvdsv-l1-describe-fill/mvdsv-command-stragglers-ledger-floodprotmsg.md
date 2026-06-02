# describe-fill-synthesis ledger -- mvdsv `floodprotmsg`

- **project:** mvdsv
- **knob:** `floodprotmsg` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `command-stragglers` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:floodprotmsg: synthesized -- sets fp_msg, the custom silence notice shown by the flood-prot consumer at sv_user.c:1858; empty=built-in notice -- origin=synthesized ref=src/sv_user.c:1858 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the custom message a player sees when flood protection silences them for chatting too quickly. While set, a silenced player is shown "FloodProt: <message>"; if left empty, they instead see the built-in "FloodProt: You can't talk for N seconds" notice. Issued with no argument, it prints the message currently in effect.
>
> floodprotmsg "<message>" = set the silence notice to <message>.
>
> Default: empty (built-in notice is used).
> Set by: server console / rcon.
> See also: floodprot (sets how many messages in how many seconds trigger the silence and for how long).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| compiled in mvdsv build | CMakeLists.txt:169 | `target_compile_definitions(${PROJECT_NAME} PRIVATE SERVERONLY)` | MATCH |
| registration (locator) | src/sv_ccmds.c:1899 | `Cmd_AddCommand ("floodprotmsg", SV_Floodprotmsg_f);` (in #ifdef SERVERONLY) | MATCH |
| command sets fp_msg | src/sv_ccmds.c:1650 | `snprintf(fp_msg, sizeof(fp_msg), "%s", Cmd_Argv(1));` | MATCH |
| silenced player shown custom message | src/sv_user.c:1858-1860 | `if (fp_msg[0]) { SV_ClientPrintf(sv_client, PRINT_CHAT, "FloodProt: %s\n", fp_msg); }` | MATCH |
| silence triggered by flood rate + lock set | src/sv_user.c:1848-1857 | `if (fp_messages) { ... if (sv_client->whensaid[tmp] && (curtime - sv_client->whensaid[tmp] < fp_persecond)) { sv_client->lockedtill = curtime + fp_secondsdead;` | MATCH |
| empty -> built-in notice (default) | src/sv_user.c:1861-1863 | `else { SV_ClientPrintf(sv_client, PRINT_CHAT, "FloodProt: You can't talk for %d seconds.\n", fp_secondsdead); }` | MATCH |
| default empty | src/sv_ccmds.c:29 | `char fp_msg[255] = { 0 };` | MATCH |
| no-arg prints current message | src/sv_ccmds.c:1640-1644 | `if (Cmd_Argc() == 1) { Con_Printf("Current msg: %s\n", fp_msg); return; }` | MATCH |
| usage shape | src/sv_ccmds.c:1645-1649 | `else if (Cmd_Argc() != 2) { Con_Printf("Usage: floodprotmsg \"<message>\"\n"); return; }` | MATCH |
| admin-only (not in client ucmds) | src/sv_user.c:3299-3358 | ucmds[] table has no "floodprotmsg" entry | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1754-1764 | 'floodprotmsg' absent from blocklist | MATCH |
| no KTX override | research/repos/ktx/src | no `Cmd_AddCommand("floodprotmsg"...)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | clause | enforcing file:line | snippet | verdict |
|---|--------|---------------------|---------|---------|
| C1 | Sets the custom message shown when flood protection silences a player for chatting too fast (scope: flood-silence path only) | src/sv_user.c:1858-1859 (inside `if (fp_messages)` ... threshold-trip branch) | `if (fp_msg[0]) { SV_ClientPrintf(sv_client, PRINT_CHAT, "FloodProt: %s\n", fp_msg); }` | MATCH |
| C2 | While set, silenced player is shown `"FloodProt: <message>"` | src/sv_user.c:1858-1859 | `if (fp_msg[0]) { ... "FloodProt: %s\n", fp_msg ... }` (non-empty first char -> custom) | MATCH |
| C3 | If empty, built-in `"FloodProt: You can't talk for N seconds"` shown; N = silence seconds | src/sv_user.c:1861-1862 (the `else` of `fp_msg[0]`) | `else { SV_ClientPrintf(sv_client, PRINT_CHAT, "FloodProt: You can't talk for %d seconds.\n", fp_secondsdead); }` (fp_secondsdead = "seconds to silence", set in SV_Floodprot_f) | MATCH (faithful paraphrase; drops literal trailing period only) |
| C4 | No-arg invocation prints the current message | src/sv_ccmds.c:1640-1643 | `if (Cmd_Argc() == 1) { Con_Printf("Current msg: %s\n", fp_msg); return; }` | MATCH |
| C5 | Usage `floodprotmsg "<message>"` sets the message | src/sv_ccmds.c:1645-1650 | `else if (Cmd_Argc() != 2) { Con_Printf("Usage: floodprotmsg \"<message>\"\n"); return; } snprintf(fp_msg, sizeof(fp_msg), "%s", Cmd_Argv(1));` | MATCH |
| C6 | Default: empty (built-in used) | src/sv_ccmds.c:29 | `char fp_msg[255] = { 0 };` -- only writer in tree is SV_Floodprotmsg_f; no init/reset writer | MATCH |
| C7 | Set by: server console / rcon (no special access class) | src/sv_ccmds.c:1899 (registration, plain `Cmd_AddCommand`, no CF_ flag); src/sv_main.c:1828 (rcon -> `Cmd_ExecuteString(str)`); blocklist sv_main.c:1754-1765 does NOT list floodprotmsg | `Cmd_AddCommand ("floodprotmsg", SV_Floodprotmsg_f);` + `Cmd_ExecuteString(str);` | MATCH |
| C8 | See also: floodprot sets #msgs / per #seconds / silence duration | src/sv_ccmds.c:1633-1635 (SV_Floodprot_f) | `fp_messages = arg1; fp_persecond = arg2; fp_secondsdead = arg3;` (usage: `<# of messages> <per # of seconds> <seconds to silence>`) | MATCH |

**V-pass notes:** floodprotmsg is a COMMAND (Cmd_AddCommand), not a cvar -- registration src/sv_ccmds.c:1899, handler SV_Floodprotmsg_f at sv_ccmds.c:1638-1651, backing storage `char fp_msg[255]={0}` at sv_ccmds.c:28-29. The ENFORCING display site for the message lives in a DIFFERENT file: src/sv_user.c:1856-1864 (SV_Pings/say path), where the flood threshold trips: lockedtill is set, then `if (fp_msg[0])` selects the custom "FloodProt: %s" branch (1859) vs the built-in "FloodProt: You can't talk for %d seconds." else-branch (1862, %d = fp_secondsdead = the third floodprot arg "seconds to silence"). All 8 clauses map to located enforcing lines and match the code + adjacent context. Default verified at the C-array initializer (the only writer in-tree is the command handler -- no .cfg/init reset). Access scope verified by tracing the rcon path to Cmd_ExecuteString (sv_main.c:1828) and confirming floodprotmsg is absent from the rcon blocklist (sv_main.c:1754-1765) and that MVDSV's Cmd_AddCommand (cmd.h:95) has no access-flag parameter -- so "server console / rcon" with no special class is correct. C3's paraphrase ("You can't talk for N seconds") drops the source string's literal trailing period and renders the count as N, but is semantically faithful (N is fp_secondsdead, the silence duration). Verdict: every material clause is enforcement-traced and matches -> TRACED-CLEAN.

## flags_for_review

- [fyi/runtime-dead-suspect/vpass] floodprotmsg (and floodprot) are registered only inside #ifdef SERVERONLY (src/sv_ccmds.c:1897-1900), with the developer aside comment at :1896 'I wonder why it registered in host.c in ezquake...'. MVDSV's dedicated-server build defines SERVERONLY, so both commands ARE present in the shipped runtime; this is not a liveness concern, just noting the conditional-registration boundary in case a future non-SERVERONLY build variant is ever considered.
- [fyi/other/vpass] A flood-silenced player sees the FloodProt message ONLY on the say attempt that trips the threshold (sv_user.c:1856-1864). Subsequent say attempts during the active lockout print a different, unprefixed notice 'You can't talk for %d more seconds' (sv_user.c:1850) that does NOT use fp_msg and has no 'FloodProt:' prefix. The proposed description correctly scopes its claim to the silencing event ('when flood protection silences them'), so this is not a defect -- recorded only so the distinction between the trip-message and the lockout-repeat-message is on file.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, quit=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "floodprotmsg",
  "type": "command",
  "description": "Sets the custom message a player sees when flood protection silences them for chatting too quickly. While set, a silenced player is shown \"FloodProt: <message>\"; if left empty, they instead see the built-in \"FloodProt: You can't talk for N seconds\" notice. Issued with no argument, it prints the message currently in effect.\n\nfloodprotmsg \"<message>\" = set the silence notice to <message>.\n\nDefault: empty (built-in notice is used).\nSet by: server console / rcon.\nSee also: floodprot (sets how many messages in how many seconds trigger the silence and for how long).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1858. Registered Cmd_AddCommand(\"floodprotmsg\", SV_Floodprotmsg_f) at sv_ccmds.c:1899 inside #ifdef SERVERONLY (compiled; SERVERONLY defined at CMakeLists.txt:169). Handler SV_Floodprotmsg_f at sv_ccmds.c:1638. WRITE clause: snprintf(fp_msg, sizeof(fp_msg), \"%s\", Cmd_Argv(1)) (sv_ccmds.c:1650) -- the command's only effect is to set the global fp_msg string. EFFECT/ENFORCING clause: the authoritative consumer is sv_user.c:1858-1860 -- inside the flood-protection branch (gated on fp_messages), when a player exceeds the rate and is locked (lockedtill set at 1857), `if (fp_msg[0]) SV_ClientPrintf(sv_client, PRINT_CHAT, \"FloodProt: %s\\n\", fp_msg);` shows the custom message; this is the line that makes the description's 'silenced player sees FloodProt: <message>' true, so source_ref points here. OFF-STATE/DEFAULT clause: fp_msg defined `char fp_msg[255] = { 0 }` at sv_ccmds.c:29 (default empty); the else branch sv_user.c:1861-1863 prints the built-in `\"FloodProt: You can't talk for %d seconds.\\n\", fp_secondsdead` when fp_msg is empty -- enforces the 'if empty, built-in notice' clause. NO-ARG clause: Cmd_Argc()==1 prints `Current msg: %s` of fp_msg and returns (sv_ccmds.c:1640-1644); usage error on >2 args (1645-1649). The 'fp_persecond/fp_secondsdead thresholds' belong to floodprot, hence routed to See also, not asserted here. ACCESS clause: registered only via Cmd_AddCommand, NOT in ucmds[] (verified absent from sv_user.c:3299-3358 client table), NOT on the normal-rcon blocklist (sv_main.c:1754-1764) -> admin-only, reachable from console and both rcon tiers. F-MV1: KTX does not override 'floodprotmsg'. All clauses TRACED-CLEAN. D20: cites kept out of description; worked example invocation included per v2 'show usage'.",
  "description_proposed": null
}
```
