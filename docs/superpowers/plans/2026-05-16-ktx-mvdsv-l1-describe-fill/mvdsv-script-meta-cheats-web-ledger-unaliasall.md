# describe-fill-synthesis ledger -- mvdsv `unaliasall`

- **project:** mvdsv
- **knob:** `unaliasall` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:unaliasall: synthesized -- removes the entire command-alias list + clears the alias hash; no args; admin-only (not in ucmds[], not on master-rcon blocklist) -- origin=synthesized ref=src/cmd.c:536 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Removes every command alias that has been defined on the server (the whole alias list at once), leaving no aliases in place. Takes no arguments. To remove a single alias instead, use 'unalias <name>'.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| removes ALL aliases (whole list) | src/cmd.c:541-547 | `for (a=cmd_alias; a; a=next){ next=a->next; Q_free(a->value); Q_free(a);} cmd_alias = NULL;` | MATCH |
| clears alias hash (leaves none) | src/cmd.c:550-553 | `for (i=0;i<32;i++){ cmd_alias_hash[i]=NULL; }` | MATCH |
| takes no arguments | src/cmd.c:536-554 | handler body references no Cmd_Argc/Cmd_Argv | MATCH |
| companion 'unalias <name>' for single | src/cmd.c:514-520 | `void Cmd_UnAlias_f... Con_Printf("unalias <alias>: erase an existing alias")` | MATCH |
| Set-by server console / rcon (admin-only) | src/cmd.c:1073 + src/sv_user.c:3299-3368 | `Cmd_AddCommand("unaliasall",...)`; not present in ucmds[] | MATCH |
| not master-rcon-gated | src/sv_main.c:1754-1764 | blocklist lists rm/rmdir/ls/chmod/if/localcommand/log*... -- 'unaliasall' absent | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Removes every command alias defined on the server (whole list at once) | cmd.c:541-547 | `for (a=cmd_alias ; a ; a=next){ next=a->next; Q_free(a->value); Q_free(a); } cmd_alias = NULL;` | MATCH -- unconditional walk of full cmd_alias list freeing every node; "command alias" terminology confirmed by Cmd_Alias_f header comment cmd.c:389 "Creates a new command that executes a command string" |
| 2 | Leaves no aliases in place (OFF-state / empty after) | cmd.c:547, 550-553 | `cmd_alias = NULL;` then `for (i=0;i<32;i++){ cmd_alias_hash[i] = NULL; }` | MATCH -- both list head and all 32 hash buckets zeroed; alias resolution in Cmd_ExecuteString (cmd.c:949 `for (a=cmd_alias_hash[key]...`) walks the hash, so cleared buckets = nothing resolvable |
| 3 | Takes no arguments | cmd.c:536-554 (whole handler) | handler body contains no Cmd_Argc()/Cmd_Argv() reads -- unconditional clear | MATCH -- args ignored entirely; contrast sibling Cmd_UnAlias_f cmd.c:518 `if (Cmd_Argc() != 2)` which DOES gate on argc |
| 4 | To remove a single alias instead, use 'unalias <name>' | cmd.c:514-532; registration cmd.c:1074 | `Con_Printf ("unalias <alias>: erase an existing alias\n");` ... `s = Cmd_Argv(1); ... if (!Cmd_DeleteAlias(s)) ...` | MATCH -- `unalias` is a real registered command that deletes the single named alias via Cmd_DeleteAlias |
| 5 | Set by: server console / rcon | console: sv_main.c:3166-3170 + 3323 -> cmd.c:240; rcon: sv_main.c:1701-1828; client EXCLUDED: sv_user.c:3299-3424 | console: `cmd=Sys_ConsoleInput(); Cbuf_AddText(cmd)` -> `Cbuf_Execute()` -> `Cmd_ExecuteString(line)`. rcon: `SVC_RemoteCommand` validates password then `Cmd_ExecuteString(str)` (cmd.c:1828); unaliasall absent from normal-rcon blocklist sv_main.c:1754-1765. client: SV_ExecuteUserCommand dispatches only the ucmds[] whitelist (cmd.c... sv_user.c:3408) which has no unaliasall/unalias/alias | MATCH -- both named source paths reach Cmd_UnAliasAll_f via Cmd_ExecuteString (which dispatches commands by hashed name with NO per-command access flag); connected clients are structurally excluded (whitelist + optional QC PR_ClientCmd override only) |

**V-pass notes:** Oracle pin confirmed: git describe == 1.11-53-g18d0362. Trace discipline doc read and applied.

VERDICT: TRACED-CLEAN. All 5 material clauses map to located, verified enforcing lines (incl. adjacent comments). No clause is name/enum/string inference.

Mechanism: unaliasall registered as a plain console command via Cmd_AddCommand("unaliasall", Cmd_UnAliasAll_f) at cmd.c:1073. Cmd_AddCommand signature (cmd.c:706) is (name, function) -- NO access-class flag at registration, so access is governed entirely by which dispatch entry points can reach Cmd_ExecuteString for this name, not by any CF_ flag on the command itself. The handler (cmd.c:536-554) unconditionally walks the entire cmd_alias linked list freeing each node + value, sets cmd_alias=NULL, and zeroes all 32 cmd_alias_hash[] buckets. No argc/argv reads -> takes no args (clause 3 confirmed by absence-of-gate, contrasted against the sibling Cmd_UnAlias_f which DOES gate on argc).

Access claim (the flavour-C risk, per WI-2) was traced on all three potential entry surfaces:
- Server console: Sys_ConsoleInput -> Cbuf_AddText -> Cbuf_Execute -> Cmd_ExecuteString (sv_main.c:3166-3323 / cmd.c:240). REACHES handler. CONFIRMED.
- Rcon: SVC_RemoteCommand (sv_main.c:1687) validates master_rcon_password (full, no blocklist) or rcon_password (normal, blocklist at 1754-1765), then Cmd_ExecuteString(str) at 1828. unaliasall is NOT in the normal-rcon blocklist, so BOTH master and normal rcon can run it. REACHES handler. CONFIRMED. Description's bare "rcon" is accurate without needing the master/normal distinction.
- Connected client: SV_ExecuteUserCommand (sv_user.c:3399) dispatches ONLY the ucmds[] whitelist (sv_user.c:3299-3385) plus an optional mod QC handler (PR_ClientCmd). unaliasall / unalias / alias are NOT in ucmds[] -> "Bad user command". Clients are structurally EXCLUDED. This means the scope "server console / rcon" is COMPLETE, not under-scoped -- a key flavour-C check that passed.

The "command alias" terminology in clause 1 is precise: Cmd_Alias_f's own header comment (cmd.c:389) describes an alias as "a new command that executes a command string". The OFF-state (clause 2) is genuinely complete because resolution reads the hash buckets, which are all cleared.

## flags_for_review

- [fyi/other/vpass] Normal rcon (via rcon_password) CAN run unaliasall -- it is absent from the normal-rcon blocklist at sv_main.c:1754-1765 (rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line). This is consistent with the description (rcon listed) and is NOT a defect, but flagging because the sibling chunk-4 server-control work surfaced blocklist-related findings; confirms unaliasall is intentionally not treated as a privileged-only command.
- [fyi/other/vpass] unaliasall is dispatched as a generic console command with no CF_ access flag (Cmd_AddCommand takes only name+function in mvdsv, cmd.c:706). Access scope is therefore emergent from dispatch-path reachability (console + rcon yes, client ucmds[] whitelist no), not declared at the registration site. Any future describe-fill for sibling cmd.c console commands (exec/echo/alias/wait/cmdlist/if) shares this same access shape and should be scoped the same way rather than inferred from a flag.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "unaliasall",
  "type": "command",
  "description": "Removes every command alias that has been defined on the server (the whole alias list at once), leaving no aliases in place. Takes no arguments. To remove a single alias instead, use 'unalias <name>'.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmd.c:536. Registered Cmd_AddCommand(\"unaliasall\", Cmd_UnAliasAll_f) at src/cmd.c:1073. Enforcing handler Cmd_UnAliasAll_f at src/cmd.c:536-554: walks the entire cmd_alias linked list freeing every node's value and the node (src/cmd.c:541-546), sets cmd_alias = NULL (src/cmd.c:547), and zeroes all 32 hash buckets cmd_alias_hash[i]=NULL (src/cmd.c:550-553) -- so 'all aliases' is enforced literally, not a subset. Takes no arguments (handler ignores Cmd_Argc/Argv). Companion single-alias remover Cmd_UnAlias_f at src/cmd.c:514-533 ('unalias <alias>') confirms the 'to remove one, use unalias' clause. Access-class: registered via Cmd_AddCommand only and ABSENT from the ucmds[] client-stringcmd table (src/sv_user.c:3299-3368, full names list checked) -- client stringcmds dispatch only through ucmds[] (no console fall-through), so admin-only = server console / rcon. NOT on the normal-rcon blocklist (src/sv_main.c:1754-1764), so bare 'server console / rcon' is correct (not master-rcon-only). No KTX override (grep ktx/src for \"unaliasall\" = none); alias system is engine-side.",
  "description_proposed": null
}
```
