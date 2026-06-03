# describe-fill-synthesis ledger -- mvdsv `developer`

- **project:** mvdsv
- **knob:** `developer` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:developer: synthesized -- console developer/debug verbosity; Con_DPrintf early-returns when 0 -- origin=synthesized ref=src/sv_send.c:179 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls how much extra diagnostic output the server prints to its console. When off, the server logs only normal messages. When on, it also prints developer/debug detail (for example, notices about bad QTV commands or extended user-info dumps) that is otherwise suppressed.
>
> 0 = normal output only.
> non-zero = also show developer/debug messages.
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| central gate; OFF-state = output suppressed | src/sv_send.c:179 | `if (!(int)developer.value) return;` (inside Con_DPrintf) | MATCH |
| non-zero shows extra user-info detail | src/sv_user.c:2343 | `if (developer.value)` then prints 'User info settings short:' | MATCH |
| non-zero shows QTV debug notices | src/sv_demo_qtv.c:1191 | `if (developer.value) Sys_Printf("Bad QTV command: %s\n", arg0);` | MATCH |
| widens net error reporting | src/net_chan.c:246 | `if (last_error_time - curtime > 5 || developer.value)` | MATCH |
| Default 0 (registered) | src/sv_main.c:62 | `cvar_t developer = {"developer", "0"};` | MATCH |
| settable, not rcon-blocked | src/sv_main.c:1754-1764 | blocklist tokens do not include 'developer' | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| C1 | Scope = server-side console diagnostic output control | src/sv_main.c:60-64 (`#ifdef SERVERONLY`) + src/sv_send.c:179-186 | `cvar_t developer = {"developer", "0"};` declared inside `#ifdef SERVERONLY`; Con_DPrintf gate routes suppressed msgs to server console via Con_Printf | MATCH |
| C2 | OFF-state (0) = only normal messages logged | src/sv_send.c:179 | `if (!(int)developer.value) return;` -- Con_DPrintf returns early when value==0, suppressing the dev message | MATCH |
| C3 | ON-state (non-zero) = also prints developer/debug detail otherwise suppressed | src/sv_send.c:179-186 (Con_DPrintf falls through to Con_Printf); also sv_demo_qtv.c:1191, sv_user.c:2343 | non-zero value skips the early return / passes the `if (developer.value)` branch -> message printed | MATCH |
| C4 | Example: notices about bad QTV commands | src/sv_demo_qtv.c:1191-1192 | `if (developer.value)\n\tSys_Printf("Bad QTV command: %s\n", arg0);` -- exact "Bad QTV command" notice, gated directly on developer.value | MATCH |
| C5 | Example: extended user-info dumps | src/sv_user.c:2343-2349 | `if (developer.value) { Con_Printf("User info settings short:\n"); Info_ReverseConvert(&sv_client->_userinfoshort_ctx_,...); Info_Print(info); ... }` -- extra short-userinfo dump gated on developer.value | MATCH |
| C6 | Threshold: binary 0 vs non-zero | src/sv_send.c:179 | `!(int)developer.value` -- 0 suppresses, any non-zero (int) prints; raw-float at sv_demo_qtv/sv_user sites also non-zero polarity | MATCH |
| C7 | Default: 0 | src/sv_main.c:62 (registered via Cvar_Register at sv_main.c:3911) | `cvar_t developer = {"developer", "0"};` -- registered default "0", no shipped-cfg override | MATCH |
| C8 | Set by: server config / rcon | src/sv_main.c:62 | `{"developer", "0"}` carries NO flags (no CVAR_ROM/CVAR_USERINFO/access flags) -> plain settable server cvar via console/config/rcon | MATCH |

**V-pass notes:** Oracle confirmed at mvdsv 1.11-53-g18d0362. Full WI-1 wide grep: `developer` appears at 6 real use-sites in src/ -- declaration (qwsvdef.h:97), registration (sv_main.c:62 + Cvar_Register sv_main.c:3911), and three enforcing reads (sv_send.c:179 central Con_DPrintf gate, net_chan.c:246, sv_user.c:2343, sv_demo_qtv.c:1191). The two non-real hits are excluded: cmodel.c:1523 is a code comment ("map developer"), and vm.c:447-448 is a COMMENTED-OUT `com_developer->integer` reference (a different, client-side cvar, dead in this build).

Central mechanism traced: Con_DPrintf (sv_send.c:174-187) is called 81 times across the tree and is gated entirely at sv_send.c:179 `if (!(int)developer.value) return;`, with adjacent header comment qwsvdef.h / sv_send.c:171 "A Con_Printf that only shows up if the 'developer' cvar is set" -- comment AGREES with code (no inversion). Registration default "0" verified at the cvar struct literal (WI-2 satisfied -- registered default, not a shipped-cfg value). No access-class flags on the cvar (WI-2 satisfied -- plain settable cvar, so "server config / rcon" is correct, not inferred from name).

Both cited examples (C4 bad-QTV-command, C5 extended user-info dump) are REAL, specifically named in the description, and each gated DIRECTLY on `developer.value` at the cited line -- not name/enum/string inference. Every material clause (polarity, OFF-state, ON-state, threshold, default, scope, set-by, both side-effect examples) maps to a located+verified enforcing line including adjacent comments. No flavour-C clause. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] Engine-internal threshold inconsistency: the central Con_DPrintf gate (sv_send.c:179) casts to (int) before testing -- `!(int)developer.value` -- so a fractional value like 0.5 truncates to 0 and is SUPPRESSED. But the two example sites test the raw float: sv_demo_qtv.c:1191 and sv_user.c:2343 both use bare `if (developer.value)`, so 0.5 would PRINT there. The description's '0 / non-zero' framing is correct for all integer values (the realistic case) and the polarity is right at every site, so this is not a description defect -- it is an off-scope engine quirk. FYI only.
- [fyi/other/vpass] net_chan.c:246 uses `developer` differently from the description's model: `if (last_error_time - curtime > 5 || developer.value)` gates the 'Outgoing message overflow' message. Here `developer` acts as a RATE-LIMIT BYPASS (forces the message every call) rather than a pure on/off -- when developer is OFF the message still prints, just throttled to a 5s window. The description does not claim this site as one of its examples, so no contradiction; noting because it shows `developer` is occasionally a 'verbosity/bypass' flag, not strictly suppress-vs-show. FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "developer",
  "type": "cvar",
  "description": "Controls how much extra diagnostic output the server prints to its console. When off, the server logs only normal messages. When on, it also prints developer/debug detail (for example, notices about bad QTV commands or extended user-info dumps) that is otherwise suppressed.\n\n0 = normal output only.\nnon-zero = also show developer/debug messages.\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_send.c:179. Pre-existing one-liner 'show extra messages' (sv_main.c:62) is a dev-aside that fails rubric clause 1/3 (no observable effect, no value meanings) -> synthesized. Central enforcing gate is Con_DPrintf at src/sv_send.c:179 `if (!(int)developer.value) return;` -- the whole developer-print mechanism: when developer.value is 0 every Con_DPrintf call returns early (OFF-state = suppressed); non-zero lets them through to the console. Polarity/threshold (zero vs non-zero) verified at that line. Individual consumer read-sites that gate extra output directly on developer.value: src/sv_user.c:2343 `if (developer.value)` (prints the short user-info block) and src/sv_demo_qtv.c:1191 `if (developer.value)` (prints 'Bad QTV command'); src/net_chan.c:246 also widens net error reporting `developer.value`. Default 0 from the registered cvar_t literal at src/sv_main.c:62 (WI-2). Settability: no flag on the registration (settable) and NOT on the rcon blocklist at src/sv_main.c:1754-1764 (which lists rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line) -> server config / rcon. F-MV1: KTX also reads cvar(\"developer\") for its own debug branches (ktx/src/g_syscalls_extra.c:32/54/75, race.c:1342, clan_arena.c:1780, hoonymode.c:452) -- consistent debug-verbosity consumer, not action-changing for this description.",
  "description_proposed": null
}
```
