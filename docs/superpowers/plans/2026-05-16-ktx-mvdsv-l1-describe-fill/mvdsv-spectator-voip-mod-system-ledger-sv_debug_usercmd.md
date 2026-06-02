# describe-fill-synthesis ledger -- mvdsv `sv_debug_usercmd`

- **project:** mvdsv
- **knob:** `sv_debug_usercmd` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_debug_usercmd: synthesized -- diagnostic toggle, writes each client's raw usercmd (angles/moves/buttons/impulse) into the MVD demo (>=1=on); also force-enabled per-client by mvd_write_usercmds -- origin=synthesized ref=src/sv_user.c:4936 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Diagnostic toggle for movement debugging. When on, the server writes each client's raw movement commands -- view angles, forward/side/up movement, buttons and impulse -- into the recorded MVD demo, so player input can be inspected afterwards in a compatible tool.
>
> 0 = the global toggle is off (but a specific client can still be traced with the sv_usercmdtrace command, independent of this cvar).
> 1 = on (record every client movement command).
>
> Default: 0.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read site fires the demo write | src/sv_user.c:4936 | `if (sv_debug_usercmd.value >= 1 || svs.clients[playernum].mvd_write_usercmds) {` | yes |
| writes raw movement command fields | src/sv_user.c:4949-4957 | `MVD_SZ_Write(&usercmd->msec...angles[0..2]...forwardmove...sidemove...upmove...buttons...impulse...)` | yes |
| data goes into MVD demo (hidden block) | src/sv_user.c:4940,4943 | `header.type_id = mvdhidden_usercmd;` ... `if (MVDWrite_HiddenBlockBegin(...))` | yes |
| threshold >=1 (0=off) | src/sv_user.c:4936 | `sv_debug_usercmd.value >= 1` | yes |
| second enabler: per-client flag | src/sv_demo.c:1912 | `svs.clients[i].mvd_write_usercmds = option;` (sets the OR-ed flag) | yes |
| default 0 | src/sv_user.c:79 | `cvar_t sv_debug_usercmd = { "sv_debug_usercmd", "0" };` | yes |
| settable plain cvar (no cmd) | src/sv_user.c:4927 | `Cvar_Register(&sv_debug_usercmd);` | yes |
| no init pext toggle keyed on it | src/sv_init.c:439-462 | only sv_debug_antilag (:443) and sv_debug_weapons (:455) toggle pext bits; sv_debug_usercmd absent | yes |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Diagnostic toggle for movement debugging" | src/sv_user.c:79 (reg) + :4936 (read) | `cvar_t sv_debug_usercmd = { "sv_debug_usercmd", "0" };` / gate at 4936 writes movement-cmd block | MATCH |
| 2 | "When on, the server writes each client's raw movement commands ... into the recorded MVD demo" | src/sv_user.c:4936 gate; called from SV_ExecuteClientMove :4264/4270/4274/4277; MVD gate src/sv_demo.c:469-470 | `if (sv_debug_usercmd.value >= 1 || svs.clients[playernum].mvd_write_usercmds)` ; `MVDWrite_Begin`: `if (!sv.mvdrecording) return false;` | MATCH |
| 3 | Field list: "view angles, forward/side/up movement, buttons and impulse" | src/sv_user.c:4950-4957; confirmed src/qwprot/src/protocol.h:561 | `MVD_SZ_Write(&usercmd->angles[0..2]...forwardmove...sidemove...upmove...buttons...impulse)` ; proto comment `<byte:msec, vec3_t:angles, short[3]:forward side up> <byte:buttons> <byte:impulse>` | MATCH (illustrative; omits msec/playernum/dropnum but text uses "--...--", not exhaustive) |
| 4 | Polarity / threshold: "1 = on (record every client movement command)" | src/sv_user.c:4936 | `sv_debug_usercmd.value >= 1` | MATCH (threshold is >=1; any value >=1 enables) |
| 5 | OFF-state: "0 = off (no usercmd debug data recorded)" | src/sv_user.c:4936 ; OR-path setter src/sv_demo.c:1912 + cmd reg :1956 | gate is `... >= 1 \|\| svs.clients[playernum].mvd_write_usercmds` ; `sv_usercmdtrace <userid> on` sets `svs.clients[i].mvd_write_usercmds = option;` | MISMATCH (minor) -- per-client OR-path via `sv_usercmdtrace` records usercmds for a targeted client even when cvar=0; "no usercmd debug data recorded" overstates |
| 6 | "Default: 0" | src/sv_user.c:79 (Cvar_Register :4927) | `{ "sv_debug_usercmd", "0" }` | MATCH (registered default) |
| 7 | "Set by: server config" | src/sv_user.c:4927 + :78 comment | `Cvar_Register(&sv_debug_usercmd);` ; no CVAR_ROM/flags ; line 78 "These don't need any protocol extensions" (server-side, no client exposure) | MATCH |

**V-pass notes:** Oracle confirmed 1.11-53-g18d0362. Three use-sites, all sv_user.c: registration :79, Cvar_Register :4927, enforcing read :4936 (function SV_DebugClientCommand). Positive-path of the description is fully traced and correct: SV_ExecuteClientMove (the run-client-move path) calls SV_DebugClientCommand for the newest usercmd (always) plus dropped/redundant ones (:4264-4277); when the gate passes it writes an mvdhidden_usercmd block (type 0x0001) with the exact fields the description lists; data only reaches the file when sv.mvdrecording is true (MVDWrite_Begin early-out sv_demo.c:469-470). Default "0" and "server config" both verified at the registration (plain cvar_t, no ROM/flags, comment line 78 confirms no protocol/client exposure).

The one defect is the OFF-state clause (clause 5). The enforcing gate at :4936 is an OR: `sv_debug_usercmd.value >= 1 || svs.clients[playernum].mvd_write_usercmds`. The second operand is a per-client flag set independently by the `sv_usercmdtrace <userid> on` command (SV_UserCmdTrace_f, sv_demo.c:1881-1919, registered :1956, sets svs.clients[i].mvd_write_usercmds = true). So usercmd debug blocks ARE recorded for a targeted client even when sv_debug_usercmd is 0. The parenthetical "0 = off (no usercmd debug data recorded)" is therefore overstated -- it correctly describes the cvar's own contribution (0 contributes nothing) but ignores the independent OR-path. This is the k_teamoverlay-class flavour-C near-miss: an OFF-state clause that reads correctly but whose real enforcing condition is more conditional than implied. Not a C-FIX because the cvar's positive behavior and the cvar=0 contribution are both genuinely as described; the imprecision is the implicit "fully suppressed" framing. Suggested fix: qualify as "0 = off (this global switch records nothing; note the per-client sv_usercmdtrace command can still record usercmds for a specific player)".

Secondary minor (did not change classification): clause 3 omits msec (the usercmd frame-time, a genuine field written at :4949) plus playernum/dropnum framing bytes; acceptable because the text frames the list as illustrative ("-- view angles ... impulse --"), not exhaustive, and "raw movement commands" is a fair user-level summary.

## flags_for_review

- [fyi/other/synthesis] sv_debug_usercmd is not the only enabler of usercmd recording: the OR-clause at sv_user.c:4936 also fires when the per-client `mvd_write_usercmds` flag is set (server.h:391, assigned at sv_demo.c:1912). So usercmd debug blocks can appear in a demo for a specific client even with the cvar at 0. FYI for anyone reasoning about 'is usercmd debug data present <=> cvar on' -- it is not a strict iff. Also note this debug cvar, unlike sv_debug_antilag/sv_debug_weapons, has no corresponding MVD_PEXT1 init-time toggle in sv_init.c.
- [review/hidden-family/vpass] sv_usercmdtrace is an undocumented sibling control: SV_UserCmdTrace_f (sv_demo.c:1881, registered :1956) toggles per-client mvd_write_usercmds, which is the OR-branch at sv_user.c:4936 that records usercmd debug blocks for one targeted userid independently of the sv_debug_usercmd cvar. Worth its own L1 entry as a command, and the two should cross-reference (the cvar = all-clients global switch; the command = single-client switch). This is the root cause of the clause-5 near-miss.
- [fyi/other/vpass] mvdhidden_usercmd block also records msec (usercmd frame-time, sv_user.c:4949) and the playernum/dropnum framing bytes (per protocol.h:561 and sizeof macro :574). If the L1 description aims to enumerate recorded fields, msec is a real omission; surfaced as fyi since the proposed text is illustrative not exhaustive.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_debug_usercmd",
  "type": "cvar",
  "description": "Diagnostic toggle for movement debugging. When on, the server writes each client's raw movement commands -- view angles, forward/side/up movement, buttons and impulse -- into the recorded MVD demo, so player input can be inspected afterwards in a compatible tool.\n\n0 = the global toggle is off (but a specific client can still be traced with the sv_usercmdtrace command, independent of this cvar).\n1 = on (record every client movement command).\n\nDefault: 0.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:4936. Read use-site: sv_user.c:4936 `if (sv_debug_usercmd.value >= 1 || svs.clients[playernum].mvd_write_usercmds)` in SV_DebugClientCommand (sv_user.c:4930) -- when true it emits an mvdhidden_usercmd block (header.type_id = mvdhidden_usercmd, sv_user.c:4940) into the MVD via MVDWrite_HiddenBlockBegin, writing playernum, dropnum, then usercmd->msec, angles[0..2], forwardmove, sidemove, upmove, buttons, impulse (sv_user.c:4949-4957) -- hence \"raw movement commands: angles, moves, buttons, impulse, into the recorded MVD demo.\" Threshold: literal `>= 1`, so 0 = off and any value >=1 = on (for a normal 0/1 toggle these coincide). Default: registered literal `cvar_t sv_debug_usercmd = { \"sv_debug_usercmd\", \"0\" }` (sv_user.c:79), registered sv_user.c:4927 -> default 0. Set by: plain server cvar, no command handler -> server config / rcon. SECOND ENABLER (kept out of user doc, see flags): the same gate is also satisfied by the per-client `mvd_write_usercmds` flag (server.h:391), set at sv_demo.c:1912 independently of this cvar -- so usercmd blocks can be written for a specific client even when the cvar is 0. Unlike sv_debug_antilag / sv_debug_weapons, this cvar has NO init-time MVD pext-bit toggle in sv_init.c (no MVD_PEXT1 gate keyed on it). No KTX override (F-MV1: grep of ktx/src finds no sv_debug_usercmd).",
  "description_proposed": null
}
```
