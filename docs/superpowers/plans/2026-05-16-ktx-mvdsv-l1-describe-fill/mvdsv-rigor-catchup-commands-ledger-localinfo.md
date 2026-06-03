# describe-fill-synthesis ledger -- mvdsv `localinfo`

- **project:** mvdsv
- **knob:** `localinfo` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:localinfo: synthesized -- shows/sets the server-side-only localinfo key/value store (not sent to clients, read by the mod); admin console/rcon -- origin=synthesized ref=src/sv_ccmds.c:1522 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Examines or changes the server's localinfo string -- a server-side-only set of key/value pairs the server keeps for itself and its mod (game logic). Unlike serverinfo, localinfo is not sent to connected clients. With no arguments it lists every localinfo key and value; with one argument it prints that single key's value; with two arguments it sets a key to a value. Keys beginning with '*' are reserved and cannot be changed.
>
> localinfo                  = show all localinfo keys and values.
> localinfo <key>            = show the value of one key.
> localinfo <key> <value>    = set <key> to <value>.
>
> Example: localinfo maxteams 4  ->  stores maxteams=4 in localinfo for the running mod to read.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| no-arg lists all localinfo keys/values | src/sv_ccmds.c:1486-1495 | `if (Cmd_Argc() == 1) { ... Info_ReverseConvert(&_localinfo_, info, sizeof(info)); Info_Print(info); }` | MATCH |
| one-arg shows a single key's value | src/sv_ccmds.c:1498-1507 | `if (Cmd_Argc()==2) { char *s = Info_Get(&_localinfo_, Cmd_Argv(1)); ... }` | MATCH |
| two-arg sets `<key> <value>` | src/sv_ccmds.c:1522; src/sv_ccmds.c:1464 | `SV_Localinfo_Set(Cmd_Argv(1), Cmd_Argv(2));` ... `Info_Set (&_localinfo_, name, value);` | MATCH |
| '*' keys cannot be changed | src/sv_ccmds.c:1515-1519 | `if (Cmd_Argv(1)[0] == '*') { Con_Printf ("Star variables cannot be changed.\n"); return; }` | MATCH |
| server-side-only store, distinct from serverinfo (not broadcast) | src/sv_init.c:37 | `ctxinfo_t _localinfo_;` (separate from `svs.info`); no serverinfo broadcast of `_localinfo_` | MATCH |
| read by mod via localinfoChanged QC hook | src/sv_ccmds.c:1466-1473 | `if (mod_localinfoChanged) { ... PR_ExecuteProgram (mod_localinfoChanged); }` | MATCH |
| admin-only (not in client ucmds[]) | src/sv_user.c:3299-3375 | `static ucmd_t ucmds[] = {...}` -- no `localinfo` entry | MATCH |
| NOT on normal-rcon blocklist | src/sv_main.c:1758-1764 | blocklist tokens list -- `localinfo` absent | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | "Examines or changes the server's localinfo string" (command purpose) | sv_ccmds.c:1484 + 1481 | `void SV_Localinfo_f (void)` / comment `Examine or change the localinfo string` | MATCH |
| 2 | "server-side-only set of key/value pairs the server keeps for itself and its mod (game logic)" -- mod-readable | pr_cmds.c:2367; pr2_cmds.c:1604; sv_ccmds.c:1466-1473 | `value = Info_Get(&_localinfo_, key);` (PF_infokey world entity); `value = Info_Get(&_localinfo_, key);` (PR2 GetInfokey world entity); `if (mod_localinfoChanged) { ... PR_ExecuteProgram (mod_localinfoChanged); }` | MATCH |
| 3 | "Unlike serverinfo, localinfo is not sent to connected clients" | sv_ccmds.c:1453-1475 (setter, NO client write) vs sv_ccmds.c:1379->1368-1376 (serverinfo DOES) | localinfo setter: only `Info_Set(&_localinfo_, name, value)` + optional QuakeC callback, no `svc_*`. serverinfo: `SV_ServerinfoChanged` -> `SV_SendServerInfoChange` -> `MSG_WriteByte (&sv.reliable_datagram, svc_serverinfo);` | MATCH |
| 4 | "With no arguments it lists every localinfo key and value" | sv_ccmds.c:1486-1494; common.c:1497-1513 (ReverseConvert iterates whole list); common.c:1133-1164 (Info_Print prints all pairs) | `if (Cmd_Argc() == 1) { ... Info_ReverseConvert(&_localinfo_, info, sizeof(info)); Info_Print (info); ...}`; `for (a = ctx->info_list; a; a = a->next) { ... snprintf(str, size, "\\%s\\%s", a->name, a->value); ...}` | MATCH |
| 5 | "with one argument it prints that single key's value" | sv_ccmds.c:1498-1507 | `if (Cmd_Argc() == 2) { char *s = Info_Get(&_localinfo_, Cmd_Argv(1)); if (*s) Con_Printf ("Localinfo %s: \"%s\"\n", ...); else Con_Printf ("No such key %s\n", ...); }` | MATCH (minor: empty/absent value prints "No such key", not an empty value) |
| 6 | "with two arguments it sets a key to a value" | sv_ccmds.c:1510-1522 -> 1453-1464 | `if (Cmd_Argc() != 3) { ... usage ... } ... SV_Localinfo_Set(Cmd_Argv(1), Cmd_Argv(2));` then `Info_Set (&_localinfo_, name, value);` | MATCH |
| 7 | "Keys beginning with '*' are reserved and cannot be changed" | sv_ccmds.c:1516-1520 | `if (Cmd_Argv(1)[0] == '*') { Con_Printf ("Star variables cannot be changed.\n"); return; }` | MATCH |
| 8 | "Set by: server console / rcon" (access class) | sv_ccmds.c:1886 (no CF flag); sv_main.c:1828 (rcon -> Cmd_ExecuteString); sv_user.c:3299-3385 (NOT in client ucmds[]) | `Cmd_AddCommand ("localinfo", SV_Localinfo_f);` (flat signature, no access flag); rcon path `Cmd_ExecuteString(str);`; `localinfo` absent from `ucmds[]` (client table) | MATCH |
| 9 | Example "localinfo maxteams 4 -> stores maxteams=4 in localinfo for the running mod to read" | sv_ccmds.c:1522->1464 (mechanism); grep: no `maxteams` in mvdsv src | Mechanism (arbitrary key stored via `Info_Set`, read by mod via infokey) holds; `maxteams` is NOT an engine-recognized key -- purely illustrative, correctly framed as "for the running mod to read" | MATCH (mechanism); key is mod-defined, not engine-defined |

**V-pass notes:** Every material clause enforcement-traced to a located line in mvdsv @ 1.11-53-g18d0362. Handler SV_Localinfo_f at sv_ccmds.c:1484-1523; setter SV_Localinfo_Set at 1453-1475; registration at sv_ccmds.c:1886.

Strong points: (a) The serverinfo contrast (clause 3) is the load-bearing claim and it is firmly enforced -- serverinfo changes broadcast svc_serverinfo to sv.reliable_datagram (SV_SendServerInfoChange, sv_ccmds.c:1368-1376), while SV_Localinfo_Set has no client-facing MSG_Write at all. (b) Mod-readability (clause 2) is double-confirmed across BOTH mod interfaces: native infokey builtin PF_infokey (pr_cmds.c:2367) and the PR2/QVM bot path (pr2_cmds.c:1604), both reading _localinfo_ for the world entity (e1==0), plus the mod_localinfoChanged QuakeC callback fired on every set. (c) The '*'-reserved guard (clause 7) and the arg-count branching (clauses 4-6) are all exactly as described. (d) Access class (clause 8): mvdsv server console commands use a flat Cmd_AddCommand with NO CF_-style flag mechanism, so access is structural -- localinfo is absent from the client-reachable ucmds[] table and is reachable only via the console / rcon Cmd_ExecuteString path. "server console / rcon" is correct.

Two minor, non-defect nuances (both still-true and traceable, do not move the row off TRACED-CLEAN):
- Clause 5: for an existing key whose stored value is empty, the one-arg branch prints "No such key" (gated on `if (*s)`) rather than an empty value. "prints that single key's value" is accurate for the normal (non-empty) case. Tightening optional, not required.
- Clause 9: the example key `maxteams` does not exist anywhere in mvdsv source -- it is not an engine-defined localinfo key. The description frames it correctly as a value "for the running mod to read," which matches the mechanism (engine stores arbitrary keys; only a mod gives them meaning). The example's accuracy rests entirely on it being a generic illustration. See fyi flag re: whether to pick a key the dominant mod (KTX) actually consumes for sharper illustration -- but KTX is off-oracle (separate repo), so I did not verify maxteams there.

No clause contradicts code (no C-FIX); no clause asserts behavior lacking an enforcing read-site (no WI2-FIX/C-NEAR-MISS).

## flags_for_review

- [fyi/off-scope-entity/vpass] Example key 'maxteams' (clause 9) does not appear anywhere in mvdsv src -- it is not an engine-recognized localinfo key, only a hypothetical mod-defined one. The description frames it correctly as 'for the running mod to read,' so it is not wrong, but its illustrative value depends on the reader understanding localinfo holds arbitrary mod keys. Whether the dominant mod (KTX) actually reads a key named 'maxteams' is off-oracle (KTX is a separate repo) and was not verified. Optional sharpening: pick an example key KTX actually consumes.
- [fyi/other/vpass] PF_infokey (pr_cmds.c:2364-2368) and PR2 GetInfokey (pr2_cmds.c:1603-1604): for the world entity, mod code reads serverinfo FIRST (Info_ValueForKey svs.info) and only falls back to _localinfo_ when the serverinfo value is NULL/empty. The proposed description does not mention this serverinfo-shadows-localinfo precedence for the mod-read path. Not a defect in any stated clause (the description's claims about what localinfo IS and how the command behaves are all correct), but a downstream concept note about mod data access may want this nuance.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "localinfo",
  "type": "command",
  "description": "Examines or changes the server's localinfo string -- a server-side-only set of key/value pairs the server keeps for itself and its mod (game logic). Unlike serverinfo, localinfo is not sent to connected clients. With no arguments it lists every localinfo key and value; with one argument it prints that single key's value; with two arguments it sets a key to a value. Keys beginning with '*' are reserved and cannot be changed.\n\nlocalinfo                  = show all localinfo keys and values.\nlocalinfo <key>            = show the value of one key.\nlocalinfo <key> <value>    = set <key> to <value>.\n\nExample: localinfo maxteams 4  ->  stores maxteams=4 in localinfo for the running mod to read.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1522. Handler SV_Localinfo_f (src/sv_ccmds.c:1484), registered src/sv_ccmds.c:1886. Clause traces: (1) no-arg lists all -- `if (Cmd_Argc()==1) { ... Info_ReverseConvert(&_localinfo_, info,...); Info_Print(info); }` sv_ccmds.c:1486-1495. (2) one-arg shows one key -- `if (Cmd_Argc()==2) { char *s = Info_Get(&_localinfo_, Cmd_Argv(1)); ... }` sv_ccmds.c:1498-1507. (3) two-arg sets -- `SV_Localinfo_Set(Cmd_Argv(1), Cmd_Argv(2))` sv_ccmds.c:1522, which does `Info_Set(&_localinfo_, name, value)` sv_ccmds.c:1464. (4) '*' keys rejected -- `if (Cmd_Argv(1)[0]=='*') { Con_Printf(\"Star variables cannot be changed.\\n\"); return; }` sv_ccmds.c:1515-1519. (5) server-side-only / not sent to clients: the store is `_localinfo_`, a ctxinfo_t declared in sv_init.c:37, DISTINCT from serverinfo's `svs.info`; there is no SV_FullClientUpdate/serverinfo broadcast of `_localinfo_` -- it is read by QC progs via the optional mod hook (SV_Localinfo_Set calls mod_localinfoChanged / PR_ExecuteProgram at sv_ccmds.c:1466-1473) and internally (e.g. SV_ListFiles-style demo-index keys set at sv_ccmds.c:1294/1312/1317). Access class: 'localinfo' is Cmd_AddCommand-only and NOT in client ucmds[] (sv_user.c:3299-3375) -> admin-only. NOT on the normal-rcon blocklist token list (sv_main.c:1754-1764; confirmed -- tokens are rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line, localinfo absent) -> normal 'server console / rcon'. F-MV1: no KTX 'localinfo' command found in ktx/src. Default omitted (no-arg shows state, not a settable default). The mod-hook / which-keys-mean-what cross-stack detail is L3, not action-changing for the set/show UX.",
  "description_proposed": null
}
```
