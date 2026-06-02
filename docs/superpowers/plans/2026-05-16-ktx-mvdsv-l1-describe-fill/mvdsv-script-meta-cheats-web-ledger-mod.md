# describe-fill-synthesis ledger -- mvdsv `mod`

- **project:** mvdsv
- **knob:** `mod` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:mod: synthesized -- passthrough that dispatches a console command to the loaded game mod's GAME_CONSOLE_COMMAND handler (no-op if no mod / under stock KTX); admin-only -- origin=synthesized ref=src/pr2_exec.c:442 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Forwards a console command to the server's currently loaded game mod, letting the mod handle it. The command and any arguments are passed through to the mod, which decides what (if anything) to do. If the command's source address matches a connected player (in practice, rcon issued from that player's machine), the server also tells the mod which player it came from; a connected client cannot invoke 'mod' from its own console. If no mod that accepts console commands is loaded (for example a plain QuakeC mod), nothing happens. What 'mod <args>' actually does therefore depends entirely on the game mod running.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| forwards to the loaded mod's console handler | src/pr2_exec.c:468 | `VM_Call(sv_vm, 0, GAME_CONSOLE_COMMAND, 0,0,0,0,0,0,0,0,0,0,0,0);` | MATCH |
| GAME_CONSOLE_COMMAND is the mod entry point | src/g_public.h:213 | `GAME_CONSOLE_COMMAND, // ( void );` | MATCH |
| no-op when no mod VM loaded | src/pr2_exec.c:448 | `if( sv_vm ) { ... }` (entire body guarded; else nothing) | MATCH |
| tells mod which player typed it (self = caller) | src/pr2_exec.c:455-466 | `for(...cl=svs.clients...) if (NET_CompareAdr(cl->netchan.remote_address, net_from)){ pr_global_struct->self = EDICT_TO_PROG(cl->edict); break; }` | MATCH |
| engine passes through, mod interprets args | src/pr2_exec.c:468 | VM_Call carries no parsed args (all zeros); mod reads argv itself | MATCH |
| KTX-loaded => no-op (handler commented out) | ktx/src/g_main.c:404-409 | `case GAME_CONSOLE_COMMAND: ... ClearGlobals(); return 0; //ConsoleCommand();` | MATCH |
| Set-by admin-only console/rcon | src/pr2_exec.c:71 + src/sv_user.c:3299-3368 | `Cmd_AddCommand("mod", PR2_GameConsoleCommand)`; not in ucmds[] | MATCH |
| not master-rcon-gated | src/sv_main.c:1754-1764 | blocklist does not include 'mod' | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| C1 | Forwards a console command to the server's currently loaded game mod | src/pr2_exec.c:448,468 | `if( sv_vm ) { ... VM_Call(sv_vm, 0, GAME_CONSOLE_COMMAND, 0,0,...); }` | MATCH (mod = VM-backed mod; see C5/C6) |
| C2 | The command and any arguments are passed through to the mod | src/g_public.h:218-220 ; src/pr2_cmds.c:2745-2749 | `// The game can issue trap_argc()/trap_argv() commands to get the command // and parameters.` ; `case G_CMD_ARGC: return Cmd_Argc(); case G_CMD_ARGV: ... strlcpy(VMA(2), Cmd_Argv(args[1]), args[3]);` | MATCH |
| C3 | The mod decides what (if anything) to do | src/g_public.h:218,220 ; src/pr2_exec.c:468 | `// ConsoleCommand will be called when a command ... // Return qfalse if the game doesn't recognize it as a command.` ; bare `VM_Call` with no server-side handling of result | MATCH |
| C4 | Server tells the mod which connected player typed it when issued at a client | src/pr2_exec.c:455-467 (mechanism) ; src/sv_user.c:3408-3424 + 4769-4772 (clients can't issue) ; src/sv_main.c:1787,1828 (rcon = the real trigger) | `if (NET_CompareAdr(cl->netchan.remote_address, net_from)) { pr_global_struct->self = EDICT_TO_PROG(cl->edict); break; }` ; client path: `if (SV_ExecutePRCommand()) goto out; ... else Con_Printf("Bad user command...")` (no fall-through to Cmd_ExecuteString) | MISMATCH (imprecise framing) -- mechanism real & traced, but "when issued at a client" implies a client-initiated `mod`, which the dispatch does NOT allow; real trigger is source-address match (rcon from a connected player's machine) |
| C5 | If no mod that accepts console commands is loaded, nothing happens | src/pr2_exec.c:448 ; src/pr2_exec.c:425-436 | `if( sv_vm )` with NO else branch (cf. PR2_GameShutDown/UnLoadProgs which DO have `else PR1_...`) ; `sv_vm = VM_Create(...); if (sv_vm) {;} else { PR1_LoadProgs(); }` (PR1/qwprogs leaves sv_vm NULL) | MATCH |
| C6 | What 'mod <args>' does depends entirely on the game mod running | src/pr2_exec.c:468 | bare `VM_Call(sv_vm, 0, GAME_CONSOLE_COMMAND, ...)` -- no server-side semantics, result unused | MATCH |
| C7 | Set by: server console / rcon | src/cmd.c:706 ; src/sv_user.c:3399-3424 ; src/sv_main.c:1687,1828 ; src/cmd.c:240 | `void Cmd_AddCommand (const char *cmd_name, xcommand_t function)` (no CF_ access flags) ; client dispatch never reaches global Cmd table ; rcon `SVC_RemoteCommand -> Cmd_ExecuteString(str)` ; console `Cbuf_ExecuteEx -> Cmd_ExecuteString(line)` | MATCH |

**V-pass notes:** Registered at src/pr2_exec.c:71 -- `Cmd_AddCommand("mod", PR2_GameConsoleCommand)`. The whole-command enforcing body is PR2_GameConsoleCommand (src/pr2_exec.c:442-472). One registration, one definition, no other dispatch path.

WIDE-READ RESULT: `GAME_CONSOLE_COMMAND` appears at exactly two sites -- the enum decl (g_public.h:213) and the single call (pr2_exec.c:468). `PR2_GameConsoleCommand` has exactly one registration (mod) and one definition. No PR1 fallback for this command (unlike PR2_GameShutDown/UnLoadProgs/LoadProgs which DO branch to PR1_*), so a PR1/qwprogs mod (sv_progtype 0, sv_vm NULL) makes `mod` a no-op -- C5/C6 capture this correctly and the text never over-claims PR1 support.

WHY C-NEAR-MISS (not CLEAN, not C-FIX): C1/C2/C3/C5/C6/C7 each map to a located enforcing line that matches the clause AND adjacent comments. C4's asserted BEHAVIOR (server identifies which connected player the command is associated with and tells the mod via `self`) is real and enforced at pr2_exec.c:462-465. But the FRAMING "when issued at a client" implies a client-initiated `mod` invocation. Traced the client stringcmd path (clc_stringcmd -> SV_ExecuteUserCommand, sv_user.c:4769-4772 / 3399-3424): unrecognized client commands hit ucmds[] -> SV_ExecutePRCommand (the SEPARATE GAME_CLIENT_COMMAND entrypoint, pr2_exec.c:295) -> "Bad user command"; they NEVER fall through to Cmd_ExecuteString, and `mod` is NOT in ucmds[]. So a connected client cannot run `mod` directly. The `self`-attribution loop fires only when `net_from` (packet sender) equals a connected player's remote_address -- i.e. rcon issued from a player's machine (rcon path sv_main.c:1828 Cmd_ExecuteString, with net_from = rcon sender used identically at sv_main.c:1787 to resolve the player name). This is the structural sibling of the k_teamoverlay precedent: a scope/trigger clause that is essentially true and traceable, but whose wording implies a path the code does not support. Imprecision, not contradiction -> C-NEAR-MISS.

SUGGESTED RE-FRAME for C4 (for the seeded re-synth): the player attribution fires when the command's source address matches a connected player -- in practice when issued via rcon from that player's machine -- not when a client runs `mod` in its own console (clients have no path to this command). When typed at the local server console, net_from does not match any client, so no player is attributed.

VERSION: oracle confirmed git describe == 1.11-53-g18d0362.

## flags_for_review

- [review/cross-mod-override/synthesis] The 'mod' command is a generic passthrough to the loaded game mod's GAME_CONSOLE_COMMAND entry point (src/pr2_exec.c:468). Under the dominant KTX deployment it is currently a NO-OP: ktx/src/g_main.c:404-409 handles GAME_CONSOLE_COMMAND with only ClearGlobals() and `return 0; //ConsoleCommand();` -- the real console-command dispatch is commented out in KTX source at this commit. So although MVDSV wires 'mod' fully, an operator running stock KTX sees no effect from any 'mod <args>'. Possible dead/disabled feature on the KTX side worth a human look (is ConsoleCommand() intended to be re-enabled, or is 'mod' effectively retired for KTX?).
- [review/contradiction/vpass] C4 framing 'when issued at a client' implies a client-initiated `mod` command, but the client stringcmd dispatcher (src/sv_user.c:3399-3424, 4769-4772) has no fall-through to the global Cmd table and `mod` is not in ucmds[], so clients cannot invoke `mod`. The self-attribution loop (src/pr2_exec.c:462-465) only matches when net_from equals a connected player's address -- i.e. rcon from that player's machine. Behavior is enforced; the phrasing of the trigger is imprecise.
- [fyi/other/vpass] mvdsv commands carry NO CF_ access flags -- Cmd_AddCommand(const char*, xcommand_t) at src/cmd.c:706 has no flag parameter (unlike KTX's CF_-flagged command table). Access class for `mod` is purely structural: global Cmd table is reachable from local console (Cbuf) and rcon, never from client stringcmds. The WI2 'access-class via CF_ flag' check in enforce-trace-discipline.md does not apply to mvdsv server commands; C7 was verified via the dispatch paths instead.
- [fyi/other/vpass] `mod` is a no-op for PR1/qwprogs mods. PR2_GameConsoleCommand (src/pr2_exec.c:442) gates the entire body on `if(sv_vm)` with no PR1 else-branch, and PR2_LoadProgs (src/pr2_exec.c:425-436) leaves sv_vm NULL when falling back to PR1_LoadProgs (sv_progtype 0). So 'currently loaded game mod' in the description effectively means 'currently loaded VM-backed mod (native .so/.dll or .qvm)'. The text's C5/C6 hedge ('no mod that accepts console commands') keeps this honest, but it is a latent narrowing worth noting for any downstream wiki copy.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "mod",
  "type": "command",
  "description": "Forwards a console command to the server's currently loaded game mod, letting the mod handle it. The command and any arguments are passed through to the mod, which decides what (if anything) to do. If the command's source address matches a connected player (in practice, rcon issued from that player's machine), the server also tells the mod which player it came from; a connected client cannot invoke 'mod' from its own console. If no mod that accepts console commands is loaded (for example a plain QuakeC mod), nothing happens. What 'mod <args>' actually does therefore depends entirely on the game mod running.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr2_exec.c:442. Registered Cmd_AddCommand(\"mod\", PR2_GameConsoleCommand) at src/pr2_exec.c:71. Enforcing handler PR2_GameConsoleCommand at src/pr2_exec.c:442-472. Gate: the whole body is inside `if (sv_vm)` (src/pr2_exec.c:448) -- when no mod VM is loaded (sv_vm NULL) the function does nothing ('if no mod ... nothing happens'). When a mod is loaded it saves/zeros pr_global_struct->self/other (src/pr2_exec.c:450-453), then loops connected non-bot clients matching net_from to the client's netchan address and sets self to that client's edict (src/pr2_exec.c:455-467 -> 'tells the mod which connected player typed it'), then VM_Call(sv_vm, 0, GAME_CONSOLE_COMMAND, ...) hands control to the mod (src/pr2_exec.c:468), restoring self/other after (src/pr2_exec.c:469-470). The engine does NOT itself interpret the arguments -- it dispatches the GAME_CONSOLE_COMMAND entry point (enum src/g_public.h:213) and the mod reads argv via its own syscalls. Hence the description states the engine-side passthrough (fully source-legible) and attributes the actual behavior to the loaded mod -- this is the mod's domain, NOT L1 residue. F-MV1: with KTX loaded (the dominant deployment), KTX's GAME_CONSOLE_COMMAND case is a no-op -- ktx/src/g_main.c:404-409 only ClearGlobals() and `return 0; //ConsoleCommand();` (the real handler is commented out), so 'mod' produces no observable effect under stock KTX; flagged. Access-class: Cmd_AddCommand-only, ABSENT from ucmds[] (src/sv_user.c:3299-3368) -> admin-only server console / rcon (the net_from match inside the handler is just so a mod can attribute a console command to whoever's address last sent a packet; it is not a client-stringcmd entry). Not on the master-rcon blocklist (src/sv_main.c:1754-1764). No recommended-value/opinion (mechanism only). [MAIN-HG2 edit: reframed player-attribution -- fires on source-address match (rcon from a player's machine), not a client-run 'mod' (not in ucmds[], no fall-through).]",
  "description_proposed": null
}
```
