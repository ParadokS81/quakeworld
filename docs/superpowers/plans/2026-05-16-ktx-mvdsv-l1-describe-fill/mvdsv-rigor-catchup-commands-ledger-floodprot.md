# describe-fill-synthesis ledger -- mvdsv `floodprot`

- **project:** mvdsv
- **knob:** `floodprot` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:floodprot: synthesized -- admin chat-flood config; enforcement at sv_user.c:1848 ring-buffer/lockout, default 4/4/10 ON, KTX no override -- origin=synthesized ref=src/sv_user.c:1848 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Configures server-side chat flood protection: a player who sends too many chat messages too quickly is silenced for a set time. With no arguments it prints the current settings.
>
> floodprot <messages> <seconds> <silence> = silence a player who sends more than <messages> chat lines within <seconds>, for <silence> seconds. <messages> must be 1-10; all three values must be positive.
>
> Default: 4 messages per 4 seconds, silence for 10 seconds.
> Set by: server console / rcon.
> See also: floodprotmsg (sets the message shown to a silenced player).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered as admin command (not client-issuable) | src/sv_ccmds.c:1898 | `Cmd_AddCommand ("floodprot", SV_Floodprot_f);` | MATCH (absent from ucmds[] sv_user.c:3315-3380) |
| not on normal-rcon blocklist -> console/rcon | src/sv_main.c:1754-1764 | blocklist tokens rm/rmdir/ls/chmod/.../sys_command_line; floodprot absent | MATCH |
| no-arg prints current / 'No floodprots enabled' | src/sv_ccmds.c:1601-1607 | `if (fp_messages){Con_Printf("Current floodprot settings...")} else Con_Printf("No floodprots enabled.")` | MATCH |
| requires 3 args (argc==4) | src/sv_ccmds.c:1611-1614 | `if (Cmd_Argc()!=4){Con_Printf("Usage: floodprot <# of messages> <per # of seconds> <seconds to silence>")...}` | MATCH |
| all values must be positive | src/sv_ccmds.c:1620 | `if (arg1<=0 || arg2<=0 || arg3<=0){Con_Printf("All values must be positive numbers")...}` | MATCH |
| <messages> max 10 | src/sv_ccmds.c:1625 | `if (arg1>10){Con_Printf("Can only track up to 10 messages.")...}` | MATCH |
| sets the three globals | src/sv_ccmds.c:1633-1635 | `fp_messages=arg1; fp_persecond=arg2; fp_secondsdead=arg3;` | MATCH |
| feature gated on fp_messages; 0 disables | src/sv_user.c:1848 | `if (fp_messages) {` | MATCH |
| silenced player blocked + told remaining time | src/sv_user.c:1849-1851 | `if (curtime < sv_client->lockedtill){SV_ClientPrintf(..."You can't talk for %d more seconds"...); return;}` | MATCH |
| flood -> lock for fp_secondsdead, drop msg | src/sv_user.c:1856-1866 | `if (sv_client->whensaid[tmp] && (curtime-...<fp_persecond)){sv_client->lockedtill=curtime+fp_secondsdead; ...; return;}` | MATCH |
| default 4/4/10 (registered initializer) | src/sv_ccmds.c:28 | `int fp_messages=4, fp_persecond=4, fp_secondsdead=10;` | MATCH |
| floodprotmsg is the see-also message setter | src/sv_ccmds.c:1647 | `Con_Printf("Usage: floodprotmsg \"<message>\"")` / sets fp_msg | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Server-side chat flood protection; too many messages too quickly -> player silenced for a set time | src/sv_user.c:1848-1864 | `if (fp_messages) { ... if (sv_client->whensaid[tmp] && (curtime - sv_client->whensaid[tmp] < fp_persecond)) { sv_client->lockedtill = curtime + fp_secondsdead; ... return; } }` (inside SV_Say path; blocked msg returns before broadcast) | MATCH |
| 2 | No arguments -> prints current settings | src/sv_ccmds.c:1598-1604 | `if (Cmd_Argc() == 1) { if (fp_messages) { Con_Printf ("Current floodprot settings: \nAfter %d msgs per %d seconds, silence for %d seconds\n", fp_messages, fp_persecond, fp_secondsdead); return; }` | MATCH (nuance: if fp_messages==0 it prints "No floodprots enabled." + usage instead; default ships enabled so current-settings is the live no-args behavior) |
| 3a | Syntax `<messages> <seconds> <silence>` maps to the three values | src/sv_ccmds.c:1617-1619, 1633-1635 | `arg1=Q_atoi(Cmd_Argv(1)); arg2=Q_atoi(Cmd_Argv(2)); arg3=Q_atoi(Cmd_Argv(3));` ... `fp_messages=arg1; fp_persecond=arg2; fp_secondsdead=arg3;` (usage string line 1612 confirms order: `<# of messages> <per # of seconds> <seconds to silence>`) | MATCH |
| 3b | Silence a player who sends MORE THAN `<messages>` lines within `<seconds>` | src/sv_user.c:1853-1857 | `tmp = sv_client->whensaidhead - fp_messages + 1; if (tmp<0) tmp=10+tmp; if (sv_client->whensaid[tmp] && (curtime - sv_client->whensaid[tmp] < fp_persecond)) { sv_client->lockedtill = curtime + fp_secondsdead; ... }` -- ring-buffer trace (default 4): msgs 1-4 record without lock; 5th attempt checks slot of msg 1; if msg1 within fp_persecond -> lock. So fp_messages msgs tolerated, the next one trips = "more than <messages>". Engine usage string says "After %d msgs". | MATCH |
| 3c | Silence lasts `<silence>` seconds | src/sv_user.c:1857 | `sv_client->lockedtill = curtime + fp_secondsdead;` then enforced at 1849 `if (curtime < sv_client->lockedtill)` | MATCH |
| 4 | `<messages>` must be 1-10 | src/sv_ccmds.c:1621, 1627-1631 | `if (arg1<=0 ...) { Con_Printf("All values must be positive numbers\n"); return; }` (lower bound 1) + `if (arg1 > 10) { Con_Printf("Can only track up to 10 messages.\n"); return; }` (upper bound 10; ring buffer is whensaid[10]) | MATCH |
| 5 | All three values must be positive | src/sv_ccmds.c:1621-1625 | `if (arg1<=0 || arg2 <= 0 || arg3<=0) { Con_Printf ("All values must be positive numbers\n"); return; }` | MATCH |
| 6 | Default: 4 msgs / 4 seconds / silence 10 seconds | src/sv_ccmds.c:28 | `int fp_messages=4, fp_persecond=4, fp_secondsdead=10;` (C global initializer = backing state of a command, not a Cvar; WI-2 RegisterCvar rule N/A) | MATCH |
| 7 | Set by: server console / rcon | src/sv_ccmds.c:1897-1900 | `#ifdef SERVERONLY\n Cmd_AddCommand ("floodprot", SV_Floodprot_f);` -- legacy console-command table, dedicated-server build only; NO client ucmd named floodprot in sv_user.c, so not client-issuable; console-table cmds reach via console + rcon (Cmd_ExecuteString) | MATCH |
| 8 | See also: floodprotmsg (sets the message shown to a silenced player) | src/sv_ccmds.c:1650 + src/sv_user.c:1858-1859 | `snprintf(fp_msg, sizeof(fp_msg), "%s", Cmd_Argv(1));` (floodprotmsg sets fp_msg) ; `if (fp_msg[0]) { SV_ClientPrintf(sv_client, PRINT_CHAT, "FloodProt: %s\n", fp_msg); }` (fp_msg printed to the locked/flooding client) | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362.

Every material clause maps to a located, verified enforcing line. The description is a deep, accurate user-doc.

Trace summary:
- Registration + arg validation + defaults: src/sv_ccmds.c. Command handler SV_Floodprot_f is sv_ccmds.c:1594-1636; backing globals declared/initialized at sv_ccmds.c:28 (fp_messages=4, fp_persecond=4, fp_secondsdead=10).
- ENFORCEMENT lives in a DIFFERENT file: src/sv_user.c:1848-1870, inside the say-handling path. fp_messages/fp_persecond/fp_secondsdead are pulled in via extern (sv_user.c:87) and drive a 10-slot ring buffer (whensaid[10] / whensaidhead, defined server.h:286-287). I followed the read-site, not just registration.

Threshold-clause rigor (the subtle one, 3b): the proposed wording "more than <messages>" was checked against the actual ring-buffer arithmetic, not the knob name. Trace (default fp_messages=4): messages 1-4 each evaluate an empty/old ring slot and record without locking; the 5th say attempt evaluates the slot holding message-1's timestamp, and if (curtime - whensaid[that slot] < fp_persecond) the client is locked and the 5th message is dropped (return before broadcast). So fp_messages messages are tolerated within the window and the message exceeding that count trips the lock -- "more than <messages> within <seconds>" is faithful. The engine's own usage string ("After %d msgs per %d seconds") agrees. Not a name-inferred clause.

Defaults clause (6) note: these are C global variable initializers backing a COMMAND's state, not a Cvar registration, so WI-2's RegisterCvar default-verification rule does not apply; the registered default IS the initializer. Verified directly at sv_ccmds.c:28.

Access-class clause (7) note: floodprot uses the legacy Cmd_AddCommand console table (no CF_ flags) and is #ifdef SERVERONLY. I verified there is no client ucmd named "floodprot" in sv_user.c, so it cannot be issued by a connected client -- it is a server-console command, also reachable via rcon. "Set by: server console / rcon" is correct.

Minor non-defect nuance on clause 2 (no-args): the handler only prints "Current floodprot settings" when fp_messages != 0; if floodprot were disabled (fp_messages==0) the no-args path instead prints "No floodprots enabled." and falls through to print the usage line. The default ships enabled (fp_messages=4), so "prints the current settings" describes the live default no-args behavior accurately. This is a still-true minor omission, not a contradiction -- consistent with TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] floodprot ring-buffer index math: tmp = whensaidhead - fp_messages + 1 with negative-wrap `if (tmp < 0) tmp = 10 + tmp;`. The wrap modulus is the hardcoded literal 10 (sv_user.c:1855) and the head wrap is hardcoded 9/0 (sv_user.c:1867-1868), matching the fixed array whensaid[10] (server.h:286). fp_messages is clamped to <=10 (sv_ccmds.c:1627) so the index stays in range -- the literal 10 and the array size and the arg ceiling are three independent constants that happen to agree. Not a bug at the current value; flagged only as a fragile-coupling FYI (if the whensaid[] size ever changed, the bare `10`/`9` literals would silently desync).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "floodprot",
  "type": "command",
  "description": "Configures server-side chat flood protection: a player who sends too many chat messages too quickly is silenced for a set time. With no arguments it prints the current settings.\n\nfloodprot <messages> <seconds> <silence> = silence a player who sends more than <messages> chat lines within <seconds>, for <silence> seconds. <messages> must be 1-10; all three values must be positive.\n\nDefault: 4 messages per 4 seconds, silence for 10 seconds.\nSet by: server console / rcon.\nSee also: floodprotmsg (sets the message shown to a silenced player).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1848. Registration: Cmd_AddCommand(\"floodprot\", SV_Floodprot_f) at sv_ccmds.c:1898 -- Cmd_AddCommand only, NOT present in ucmds[] (sv_user.c:3315-3380), so admin-only (no client stringcmd path). Not on the normal-rcon blocklist (sv_main.c:1754-1764 lists rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- floodprot absent), so Set-by = server console / rcon. Handler SV_Floodprot_f (sv_ccmds.c:1597-1635): no-arg path prints current settings if fp_messages set, else 'No floodprots enabled' (sv_ccmds.c:1601-1607); requires exactly 4 args else usage (sv_ccmds.c:1611-1614); arg parse Q_atoi (sv_ccmds.c:1616-1618); 'All values must be positive' if any <=0 (sv_ccmds.c:1620); 'Can only track up to 10 messages' if arg1>10 (sv_ccmds.c:1625) -> the 1-10 <messages> bound; assigns fp_messages/fp_persecond/fp_secondsdead (sv_ccmds.c:1633-1635). ENFORCEMENT read-site sv_user.c:1848-1870: 'if (fp_messages)' gates the whole feature (sv_user.c:1848) -- fp_messages=0 disables it; if curtime<lockedtill the message is dropped and 'You can't talk for N more seconds' shown (sv_user.c:1849-1851); the ring-buffer check (whensaid[], head wraps at 9, tmp=10+tmp) compares the message fp_messages-ago against fp_persecond and on flood sets lockedtill=curtime+fp_secondsdead and drops the line (sv_user.c:1853-1866) -- this fixed 10-slot ring (sv_user.c:1853-1855,1867-1869) is exactly why arg1 caps at 10. Defaults from the C initializer 'int fp_messages=4, fp_persecond=4, fp_secondsdead=10;' (sv_ccmds.c:28) -- WI-2 verified at the definition, so floodprot is ON by default. See-also floodprotmsg registered at sv_ccmds.c:1899, sets fp_msg (sv_ccmds.c:1647). F-MV1: KTX grep clean -- g_cmd.c:215 is KTX's own per-player floodprot announce bprint label, not an override of this command.",
  "description_proposed": null
}
```
