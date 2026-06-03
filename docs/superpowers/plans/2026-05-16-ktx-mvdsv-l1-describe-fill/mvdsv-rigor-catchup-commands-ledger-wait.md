# describe-fill-synthesis ledger -- mvdsv `wait`

- **project:** mvdsv
- **knob:** `wait` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:wait: synthesized -- delays the remainder of the command buffer until the next server frame (script primitive); server console / rcon, not in ucmds[]; no KTX override -- origin=synthesized ref=src/cmd.c:242 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Pauses execution of the rest of the current command line or script until the next server frame; any commands after the 'wait' run on the following frame instead of immediately. Used inside aliases and config scripts to spread a sequence of commands across consecutive frames.
>
> Set by: server console / rcon (also usable inside aliases and exec'd config scripts).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| command sets the current buffer's wait flag | src/cmd.c:41-42 | `if (cbuf_current) cbuf_current->wait = true;` | MATCH |
| flag halts the loop, leaving remaining text for next frame | src/cmd.c:242-247 | `if (cbuf->wait) { // skip out while text still remains in buffer, leaving it // for next frame; cbuf->wait = false; break; }` | MATCH |
| no-arg command | src/cmd.c:39-43 | `void Cmd_Wait_f (void) { if (cbuf_current) cbuf_current->wait = true; }` (no Cmd_Argc/Argv use) | MATCH |
| console/rcon, not client-issuable | src/cmd.c:1071 + src/sv_user.c (ucmds[]) | `Cmd_AddCommand ("wait", Cmd_Wait_f);`; grep `"wait"` in client-stringcmd table = no match | MATCH |
| no KTX override (F-MV1) | ktx/src/commands.c, g_cmd.c | grep `"wait"` cmd_t entry = no match | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Pauses execution of the rest of the current command line/script until the next server frame | src/cmd.c:39-43 (handler sets flag); src/cmd.c:242-247 (enforces break); src/sv_main.c:3323 ("next server frame" = per-host-frame Cbuf_Execute) | `void Cmd_Wait_f (void){ if (cbuf_current) cbuf_current->wait = true; }` / `if (cbuf->wait){ // skip out while text still remains in buffer, leaving it // for next frame; cbuf->wait = false; break; }` / `Cbuf_Execute ();` | MATCH |
| 2 | Any commands after 'wait' run on the following frame instead of immediately | src/cmd.c:242-247 (break leaves text_start/text_end unchanged so remaining cmds persist); src/cmd.c:165 (next-frame loop resumes from remaining text) | `// skip out while text still remains in buffer, leaving it // for next frame ... break;` / `while (cbuf->text_end > cbuf->text_start)` | MATCH |
| 3 | Used inside aliases and config scripts to spread a sequence of commands across consecutive frames | src/cmd.c:34-36 (in-code canonical example); mechanism via clauses 1-2; alias dispatch src/cmd.c:949-954 (alias body buffered); exec src/cmd.c:353 (exec'd file buffered) | `bind g "impulse 5 ; +attack ; wait ; -attack ; impulse 2"` / `Cbuf_InsertText ("\n"); Cbuf_InsertText (a->value);` / `Cbuf_InsertText (f);` | MATCH |
| 4 | Set by: server console / rcon (also usable inside aliases and exec'd config scripts) | src/cmd.c:1071 (plain console-command registration, no client/CF flag); src/sv_main.c:3160-3171 + 3320-3323 (console path buffers then Cbuf_Execute); src/sv_main.c:1828 (rcon -> Cmd_ExecuteString -> alias body buffered at cmd.c:949-954) | `Cmd_AddCommand ("wait", Cmd_Wait_f);` / `Cbuf_AddText (cmd); Cbuf_AddText ("\n");` ... `Cbuf_Execute ();` / `Cmd_ExecuteString(str);` | MATCH (see FYI on bare top-level no-op) |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. enforce-trace-discipline.md read and applied per-clause.

Mechanism is fully self-contained in src/cmd.c. wait is a plain console command (Cmd_AddCommand "wait", Cmd_Wait_f, cmd.c:1071). Handler Cmd_Wait_f (cmd.c:39-43) sets cbuf_current->wait=true, guarded by `if (cbuf_current)`. Enforcement is in the command-buffer executor Cbuf_ExecuteEx: after each Cmd_ExecuteString, `if (cbuf->wait){ cbuf->wait=false; break; }` (cmd.c:242-247) breaks out of the `while (text_end > text_start)` loop WITHOUT resetting text_start/text_end, so the remaining buffered commands persist and resume on the next Cbuf_Execute call. The adjacent comment (cmd.c:243-244 "skip out while text still remains in buffer, leaving it for next frame") and the handler doc comment (cmd.c:34-35 "delayed until next frame") both corroborate the polarity and timing. No comment inversion.

"next SERVER frame" framing verified for this SERVERONLY build: the per-host-frame execution is Cbuf_Execute() at sv_main.c:3323 (inside #ifdef SERVERONLY host frame). cbuf_server collapses to cbuf_main under SERVERONLY via macros at pr2_cmds.c:36-37 (Cbuf_ExecuteEx(x)->Cbuf_Execute(); Cbuf_AddTextEx(x,y)->Cbuf_AddText(y)). cbuf_main is the only real buffer (cmd.h:49, cmd.c:25). cbuf_current is set ONLY inside Cbuf_ExecuteEx (cmd.c:163) and reset to NULL at its end (cmd.c:250) -- verified the only assignment sites tree-wide.

Scope (clause 4, WI-2): wait registered with plain Cmd_AddCommand -- no CF_ flag, no client-command table, so it is a console command. Console path: Sys_ConsoleInput -> Cbuf_AddText (sv_main.c:3169) -> Cbuf_Execute (sv_main.c:3323) -- buffered, so cbuf_current is set and a multi-command `;`-joined console line honors wait. rcon path: SVC_RemoteCommand (sv_main.c:1687) dispatched at sv_main.c:1936 -> executes via Cmd_ExecuteString(str) at sv_main.c:1828. Alias bodies and exec'd cfgs go through Cbuf_InsertText (cmd.c:949-954 for alias, cmd.c:353 for exec) so wait inside them is honored at frame time. Description's "also usable inside aliases and exec'd config scripts" matches exactly.

PROC-1: the one residual is a checkable FACT, not a judgment, and the description does not assert the contradicted edge -- see FYI flag. Classified TRACED-CLEAN: every material clause maps to a located, verified enforcing line incl. adjacent comments.

## flags_for_review

- [fyi/other/vpass] Bare top-level `rcon wait` (and a standalone `wait` typed at the server console as its own command) is a SILENT NO-OP. SVC_RemoteCommand runs the command via Cmd_ExecuteString (sv_main.c:1828) OUTSIDE any Cbuf_ExecuteEx loop, and a standalone console `wait` is likewise the first/only token of its line; in both cases cbuf_current is NULL at handler time (set non-NULL only inside Cbuf_ExecuteEx, cmd.c:163, and reset to NULL at cmd.c:250). Cmd_Wait_f's `if (cbuf_current)` guard (cmd.c:41) then does nothing. wait only has an effect when it appears INSIDE a buffered sequence -- an alias body, an exec'd cfg, or a multi-command `;`-joined console line -- all of which run through Cbuf_ExecuteEx where cbuf_current is set. The proposed description does NOT claim a bare `rcon wait` does anything (its main body correctly scopes use to 'inside aliases and config scripts to spread a sequence'), so this is not a contradiction. Flagging only because a reader could over-read the 'Set by: server console / rcon' line as implying a bare `rcon wait` is meaningful; an optional one-clause tightening ('has effect only within a buffered command sequence -- alias, exec, or multi-command line') would remove that ambiguity. Not a defect; does not change the TRACED-CLEAN classification.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "wait",
  "type": "command",
  "description": "Pauses execution of the rest of the current command line or script until the next server frame; any commands after the 'wait' run on the following frame instead of immediately. Used inside aliases and config scripts to spread a sequence of commands across consecutive frames.\n\nSet by: server console / rcon (also usable inside aliases and exec'd config scripts).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/cmd.c:242. Handler Cmd_Wait_f (src/cmd.c:39-43), registered src/cmd.c:1071 via Cmd_AddCommand. The shipped block-comment (src/cmd.c:34-36 'Causes execution of the remainder of the command buffer to be delayed until next frame') is dev-prose using engine-buffer jargon, not the D20 user-doc shape -> synthesize. Clause traces: (1) the command sets the current buffer's wait flag: src/cmd.c:41-42 'if (cbuf_current) cbuf_current->wait = true;'. (2) the flag delays the remainder to the next frame: the ENFORCING site is the buffer-execute loop at src/cmd.c:242-247 (= source_ref) 'if (cbuf->wait) { // skip out while text still remains in buffer, leaving it // for next frame; cbuf->wait = false; break; }' -- it breaks out of the per-line execution loop with text still buffered and clears the flag, so the rest runs on the next Cbuf_Execute (next frame). No args (no-arg command -> no worked example per chunk rule). Access-class: registered via Cmd_AddCommand (src/cmd.c:1071), NOT in ucmds[] (grep of src/sv_user.c for \"wait\" = empty) -> server console / rcon; it is one of the generic command-script primitives in cmd.c shared with the engine console, so it is also usable inside aliases / exec'd scripts (its purpose). F-MV1: no KTX override (ktx/src commands.c + g_cmd.c carry no \"wait\" cmd_t entry).",
  "description_proposed": null
}
```
