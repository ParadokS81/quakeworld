# describe-fill-synthesis ledger -- mvdsv `set`

- **project:** mvdsv
- **knob:** `set` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:set: synthesized -- assigns/creates a cvar via Cvar_Set; console/rcon, no client path, no KTX override -- origin=synthesized ref=src/cvar.c:497 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Assigns a value to a server cvar. If the named cvar does not exist, it is created as a new user variable holding that value (unless the name is already a command, which is rejected).
>
> set <cvar> <value> = set <cvar> to <value>, creating it if it does not already exist.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| assigns value to existing cvar | src/cvar.c:497 | `Cvar_Set (var, Cmd_Argv(2));` | MATCH |
| usage form / 3-arg gate | src/cvar.c:486-488 | `if (Cmd_Argc() != 3) { Con_Printf ("usage: set <cvar> <value>\n");` | MATCH |
| creates new user cvar if absent | src/cvar.c:512 | `var = Cvar_Create (var_name, Cmd_Argv(2), CVAR_USER_CREATED);` | MATCH |
| CVAR_USER_CREATED = set-created | src/cvar.h:64 | `#define CVAR_USER_CREATED (1<<2) // created by a set command` | MATCH |
| rejects when name is a command | src/cvar.c:501-503 | `if (Cmd_Exists(var_name)) { Con_Printf ("\"%s\" is a command\n", var_name); return; }` | MATCH |
| not client-issuable (ucmds absent) | src/sv_user.c | grep `"set"` in ucmds region empty | MATCH |
| not on normal-rcon blocklist | src/sv_main.c:1750-1767 | blocklist tokens listed; 'set' absent | MATCH |
| no KTX override | ktx/src | grep AddCommand "set" empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | "Assigns a value to a server cvar" (existing cvar path) | src/cvar.c:497 -> callee src/cvar.c:150-155 | `Cvar_Set (var, Cmd_Argv(2));` ; callee: `tmp = Q_strdup(value); Q_free(var->string); var->string = tmp; var->value = Q_atof(var->string);` | MATCH |
| 2 | "If the named cvar does not exist, it is created" | src/cvar.c:493, 499-500, 512 -> callee src/cvar.c:404-422 | `var = Cvar_Find(var_name);` ... `else { ... var = Cvar_Create(var_name, Cmd_Argv(2), CVAR_USER_CREATED); }` ; Cvar_Create: `v = Cvar_Find(name); if (v) return v; v = Q_malloc(...); ... v->flags = cvarflags;` | MATCH |
| 3 | "as a new user variable" (terminology for the flag) | src/cvar.h:64 | `#define\tCVAR_USER_CREATED\t(1<<2)\t// created by a set command` | MATCH |
| 4 | "holding that value" (created cvar gets the supplied value) | src/cvar.c:512 -> callee src/cvar.c:417,419 | `Cvar_Create(var_name, Cmd_Argv(2), ...)` ; callee: `v->string = Q_strdup(string); ... v->value = Q_atof(v->string);` | MATCH |
| 5 | "unless the name is already a command, which is rejected" | src/cvar.c:501-505 -> callee src/cmd.c:748-761 | `if (Cmd_Exists(var_name)) { Con_Printf("\"%s\" is a command\n", var_name); return; }` ; Cmd_Exists: scans cmd_hash_array, `if (!strcasecmp(cmd_name, cmd->name)) return true;` | MATCH |
| 6 | Syntax `set <cvar> <value>` (exactly 3 argc) | src/cvar.c:486-490 | `if (Cmd_Argc() != 3) { Con_Printf("usage: set <cvar> <value>\n"); return; }` | MATCH |
| 7 | "Set by: server console" (registered as console command, not client cmd) | src/cvar.c:567 ; absent from src/sv_user.c:3299-3385 ucmds[] | `Cmd_AddCommand ("set", Cvar_Set_f); //DP_CON_SET` ; ucmds[] table contains no "set" entry | MATCH |
| 8 | "Set by: rcon" (reachable via rcon dispatch, not blocklisted) | src/sv_main.c:1828 ; blocklist src/sv_main.c:1754-1765 | `Cmd_ExecuteString(str);` (rcon -> console dispatch reaches Cmd_AddCommand handlers) ; normal-rcon blocklist lists rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- "set" NOT among them | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. Every material clause maps to a located, verified enforcing line (incl. adjacent comments).

WIDE READ (WI-1): `set` has exactly ONE use-site in the tree -- registration at src/cvar.c:567 (`Cmd_AddCommand("set", Cvar_Set_f)`) and handler `Cvar_Set_f` at src/cvar.c:481. No client-command (`ucmds[]`) entry, no alias, no second handler. Wide grep filtered the offset/setinfo/setting/preset/reset false positives.

CORE BEHAVIOR (clauses 1-5): The handler logic at cvar.c:481-514 splits exactly as the description states: Cvar_Find hit -> Cvar_Set (assign); miss + Cmd_Exists -> reject "is a command"; miss + not-a-command -> Cvar_Create with CVAR_USER_CREATED. All three callees (Cvar_Set, Cvar_Create, Cmd_Exists) were read in full and enforce their respective clauses. The "user variable" terminology (clause 3) is NOT name-inference: it is grounded in the live flag definition comment at cvar.h:64, "created by a set command". (Note: the cmd.c:421 reference to CVAR_USER_CREATED is inside an `#if 0` dead block and was NOT used as a liveness signal; the flag DEFINITION at cvar.h:64 is the live, authoritative source.)

ACCESS/SCOPE (clauses 7-8, WI-2): `set` registers via plain `Cmd_AddCommand` (no CF_-flag table -- MVDSV's console commands are not the KTX-style CF_ command-table; this is the engine console-command model). Server-console access is direct. Rcon access traced through SVC_RemoteCommand (sv_main.c:1687): rcon validates against master_rcon_password OR rcon_password, then dispatches via Cmd_ExecuteString (line 1828) which reaches Cmd_AddCommand handlers. The normal-rcon blocklist (lines 1754-1765) was checked token-by-token: `set` is NOT in it, so `set` is usable from BOTH master rcon and normal (admin) rcon. The "server console / rcon" scope claim is exact and complete.

EDGE BEHAVIORS NOT ASSERTED (no contradiction): Cvar_Set carries (a) serverinfo "0"->"" coercion (cvar.c:131-132), (b) CVAR_ROM early-return (cvar.c:134-135), (c) OnChange-with-cancel gate (cvar.c:137-147). None of these are claimed by the description, and none contradict it. Critically, the serverinfo-zero coercion lives ONLY in the existing-cvar (Cvar_Set) path -- it never touches the Cvar_Create path -- so the description's "holding that value" (clause 4) for newly-created cvars is precisely correct (a freshly set-created cvar is not serverinfo, so the coercion is moot regardless). The description's omission of these edges is appropriate user-doc altitude, not a flavour-C gap.

PROC-1: No residual judgment. Every clause reduces to a checkable fact confirmed at its enforcing line.

## flags_for_review

- [fyi/cross-mod-override/vpass] Normal (admin) rcon CANNOT run a curated blocklist of filesystem/scripting commands (rm, rmdir, ls, chmod, sv_admininfo, if, localcommand, sv_crypt_rcon, sv_timestamplen, log*, sys_command_line) -- only master rcon can (SVC_RemoteCommand, src/sv_main.c:1754-1765). This is a recurring cross-knob access nuance for any MVDSV server-control command: 'set by rcon' is true for `set` here, but the blocklist must be checked per-knob. For `set` specifically it is correctly NOT blocklisted. FYI for sibling describe-fill rows touching these listed commands -- their rcon-scope claims need the master-vs-normal distinction.
- [fyi/runtime-dead-suspect/vpass] The alias-vs-set collision handling (Cmd_DeleteAlias on name clash) at src/cvar.c:507-510 is inside `#if 0` and is dead. The description correctly omits any alias-collision behavior. If a future description of `set` or `alias` asserts alias/cvar name-collision handling, note this path is compiled out in this build.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "set",
  "type": "command",
  "description": "Assigns a value to a server cvar. If the named cvar does not exist, it is created as a new user variable holding that value (unless the name is already a command, which is rejected).\n\nset <cvar> <value> = set <cvar> to <value>, creating it if it does not already exist.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cvar.c:497. Cvar_Set_f (src/cvar.c:481-514) is the handler (registered cvar.c:567). Arg-count gate: Cmd_Argc() != 3 -> usage 'set <cvar> <value>' (cvar.c:486-489). Existing cvar -> Cvar_Set(var, Cmd_Argv(2)) (cvar.c:495-497), the assign primitive at cvar.c:122-161. Not-found-but-is-a-command -> rejected, 'is a command' (cvar.c:501-504). Otherwise creates via Cvar_Create(var_name, Cmd_Argv(2), CVAR_USER_CREATED) (cvar.c:512); CVAR_USER_CREATED flag = 'created by a set command' (src/cvar.h:64). Set-by: registered via Cmd_AddCommand only (cvar.c:567), NOT present in ucmds[] (grep of src/sv_user.c for the name is empty) so not client-issuable; NOT on the normal-rcon blocklist (src/sv_main.c:1750-1767 lists rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- 'set' absent) so regular rcon reaches it -> 'server console / rcon'. F-MV1: KTX registers no 'set' command (grep of ktx/src empty) -- engine command is live.",
  "description_proposed": null
}
```
