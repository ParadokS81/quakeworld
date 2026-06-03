# describe-fill-synthesis ledger -- mvdsv `qtv_sayenabled`

- **project:** mvdsv
- **knob:** `qtv_sayenabled` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qtv_sayenabled: synthesized -- 0 limits QTV-proxy chat to specs during a live game, 1 broadcasts to all; mod-overridable -- origin=synthesized ref=src/sv_demo_qtv.c:732 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether chat sent through a connected QTV proxy reaches all players, or only spectators, during a live game. While a game is in progress, with this off, QTV chat is restricted to spectators; with it on, QTV chat is broadcast to everyone. Outside a live game (standby or countdown) QTV chat is public regardless. Game mods commonly drive this automatically, so a manual setting may be overridden during a match.
>
> 0 = QTV chat limited to spectators during a live game (broadcast to all otherwise).
> 1 = QTV chat broadcast to all players, even during a live game.
>
> Default: 0.
> Set by: server config / rcon (and by the game mod).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 | src/sv_demo_qtv.c:29 | `static cvar_t qtv_sayenabled = {"qtv_sayenabled", "0"};` | MATCH |
| read gates the gameStarted decision for QTV-proxy chat | src/sv_demo_qtv.c:732 | `if (qtv_sayenabled.value || ...status=="Countdown") gameStarted = false; else gameStarted = GameStarted();` | MATCH |
| gameStarted true -> spectators only | src/sv_demo_qtv.c:759-760 | `if (gameStarted) cmd = "say_team"; // we can accept only this command, since we will send to specs only` | MATCH |
| gameStarted false -> public say to all | src/sv_demo_qtv.c:763,767+ | cmd stays 'say'; broadcast loop over svs.clients | MATCH |
| 'live game' = non-Standby / active demo dest | src/sv_main.c:218-227 | `return (d || strncasecmp(Info_ValueForKey(svs.info,"status"),"Standby",8));` | MATCH |
| 1 forces always-public (overrides GameStarted) | src/sv_demo_qtv.c:732 | `qtv_sayenabled.value || ...` short-circuits gameStarted=false | MATCH |
| settable (not read-only) | src/sv_demo_qtv.c:1517 | `Cvar_Register (&qtv_sayenabled);` (no ROM flag) | MATCH |
| KTX overrides at match/mode transitions | ktx/src/match.c:1373; race.c:314,321 | `cvar_fset("qtv_sayenabled", 0)`; `"qtv_sayenabled 1\n"`; `"qtv_sayenabled 0\n"` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Cvar governs whether QTV-proxy chat reaches all clients vs spectators-only during a live game | src/sv_demo_qtv.c:732-779 (QTVcmd_Say_f) | `if (qtv_sayenabled.value || !strcasecmp(...,"Countdown")) gameStarted=false; else gameStarted=GameStarted();` ... `if (gameStarted && !client->spectator) continue;` | MATCH |
| 2 | 0 (off) + live game -> QTV chat limited to spectators | src/sv_demo_qtv.c:732 else-branch -> 735 -> 772-773 | `gameStarted = GameStarted();` then `if (gameStarted && !client->spectator) continue; // game started, don't send QTV chat to players, specs still get QTV chat` | MATCH |
| 3 | 1 (on) -> broadcast to everyone even during a live game | src/sv_demo_qtv.c:732-733 | `if (qtv_sayenabled.value || ...) gameStarted = false;` -> loop never skips non-spectators (772 guard false) -> SV_ClientPrintf2 to all spawned clients | MATCH |
| 4 | Live-game definition (the gate) = status not Standby (or a non-stream demo dest exists) | src/sv_main.c:226 (GameStarted) | `return (d || strncasecmp(Info_ValueForKey(svs.info, "status"), "Standby", 8));` | MATCH |
| 5 | Outside live game = Standby OR Countdown -> chat public regardless of cvar | src/sv_demo_qtv.c:732-733 (Countdown OR) + sv_main.c:226 (Standby) | `... || !strcasecmp(Info_ValueForKey(svs.info,"status"),"Countdown")) gameStarted = false; // if status is "Countdown" then game is not started yet` | MATCH |
| 6 | Default = 0 | src/sv_demo_qtv.c:29 (decl) + :1517 (register) | `static cvar_t qtv_sayenabled = {"qtv_sayenabled", "0"};` ... `Cvar_Register (&qtv_sayenabled);` -- plain struct, no CVAR_ flags | MATCH |
| 7 | Set by server config / rcon AND by the game mod | no C-side write in mvdsv (grep clean); KTX match.c:1373, race.c:314/321, commands.c:4212; decl comment | `// allow mod to override GameStarted() logic` (sv_demo_qtv.c:29); `cvar_fset("qtv_sayenabled", 0);` (ktx match.c:1373) | MATCH |
| 8 | Game mods commonly drive it automatically; manual setting may be overridden during a match | ktx/src/match.c:1373 (match_start tail) | `cvar_fset("qtv_sayenabled", 0);` forced at every KTX match start | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv describe --tags == 1.11-53-g18d0362.

Single enforcing site for the whole mechanism: QTVcmd_Say_f in src/sv_demo_qtv.c (lines 720-795). Cvar declared line 29, registered line 1517. The entire polarity/scope logic lives at lines 732-779; I read it in full and followed the callee GameStarted() (sv_main.c:218-227). All three use-sites grepped (decl 29, read 732, register 1517) -- nothing in a different file gates the cvar; the mod-side writes live in the KTX sibling repo, which I traced to confirm clauses 7-8.

Polarity trace (the core risk): qtv_sayenabled.value truthy => gameStarted=false => the loop guard `if (gameStarted && !client->spectator) continue;` (772-773) is never taken => message goes to ALL spawned clients (players + specs). qtv_sayenabled=0 with a live (non-Standby/Countdown) status => GameStarted() true => gameStarted=true => non-spectators are skipped, specs still receive. This is the inverse-of-name shape (sayENABLED=1 means MORE open, =0 means restricted to specs during play) and the description has the polarity correct in both the prose and the numbered 0/1 lines. The comment at 773 directly affirms the OFF-state behavior ("specs still get QTV chat"), so no adjacent-comment inversion risk.

Default verified against the REGISTERED default per WI-2: declaration `{"qtv_sayenabled","0"}` + bare Cvar_Register, no CVAR_ flags => default 0. KTX's `qtv_sayenabled 0` in commands.c:4212 is a mod-cfg value that happens to match the engine default; it is not the source of truth and was not used as such.

Minor still-true vagueness (acceptable, fully traceable, NOT a defect): the opening sentence frames it as "reaches all players, or only spectators." In the ON case the broadcast reaches players AND spectators (the loop iterates all clients), not players exclusively. The body's numbered lines state it exactly ("broadcast to all players, even during a live game" / "limited to spectators"), so the precise behavior is documented; the one-line summary is a harmless compression. Did not downgrade for this -- it maps to verified code and the precise statement is present.

PROC-1: residual reduces to checkable facts confirmed at the enforcing line; no affirm-vs-synthesize or framing-judgment residue. Classified TRACED-CLEAN.

## flags_for_review

- [review/cross-mod-override/synthesis] F-MV1 live cross-mod override: KTX (the standard competitive mod) programmatically writes qtv_sayenabled, so an admin's manual value does not persist across match/mode changes. ktx/src/match.c:1373 cvar_fset("qtv_sayenabled", 0) on every match start; ktx/src/race.c:314 sets it 1 inside race_settings[] and race.c:321 sets 0 inside norace_settings[]; ktx/src/commands.c:4212 ships 'qtv_sayenabled 0' as the documented default block ('default blocking of qtv chat'). Documented the MVDSV engine-stored meaning + kept a short action-changing inline note that mods drive it; the per-mode KTX matrix is a candidate L3 cross-mod note.
- [fyi/off-scope-entity/vpass] say_team issued through QTV is forced specs-only regardless of qtv_sayenabled (sv_demo_qtv.c:756-760: `if (!strcmp(cmd, "say_team")) gameStarted = true; // send to specs only`). This is a command-level distinction, NOT governed by the cvar, so its omission from the qtv_sayenabled description is correct scoping rather than a missing clause. Noting only so a future reader does not assume qtv_sayenabled=1 opens say_team to players -- it does not.
- [fyi/cross-mod-override/vpass] Cross-mod override confirmed and worth surfacing for the description's downstream consumers: KTX forces qtv_sayenabled to 0 at the end of every match_start (ktx/src/match.c:1373, `cvar_fset("qtv_sayenabled", 0)`), and race mode toggles it (ktx/src/race.c:314 sets 1, :321 sets 0). On a standard KTX server an operator's manual `qtv_sayenabled 1` will be reset to 0 when the next match starts. The description's 'may be overridden during a match' clause already captures this; flagging the exact KTX sites for traceability.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qtv_sayenabled",
  "type": "cvar",
  "description": "Controls whether chat sent through a connected QTV proxy reaches all players, or only spectators, during a live game. While a game is in progress, with this off, QTV chat is restricted to spectators; with it on, QTV chat is broadcast to everyone. Outside a live game (standby or countdown) QTV chat is public regardless. Game mods commonly drive this automatically, so a manual setting may be overridden during a match.\n\n0 = QTV chat limited to spectators during a live game (broadcast to all otherwise).\n1 = QTV chat broadcast to all players, even during a live game.\n\nDefault: 0.\nSet by: server config / rcon (and by the game mod).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo_qtv.c:732. Registered {\"qtv_sayenabled\",\"0\"} at src/sv_demo_qtv.c:29 -- default 0; registration comment 'allow mod to override GameStarted() logic'. Single read at src/sv_demo_qtv.c:732 inside QTVcmd_Say_f (handles say/say_team/say_game arriving FROM a connected QTV proxy): `if (qtv_sayenabled.value || !strcasecmp(Info_ValueForKey(svs.info,\"status\"),\"Countdown\")) gameStarted = false; else gameStarted = GameStarted();`. Polarity: when gameStarted resolves true, src/sv_demo_qtv.c:759-760 forces `cmd = \"say_team\"` ('we can accept only this command, since we will send to specs only') -> spectators only; when false, cmd stays 'say' -> public to all (broadcast loop src/sv_demo_qtv.c:767+). GameStarted() (src/sv_main.c:218-227) returns true when a non-stream demo dest exists OR serverinfo status != 'Standby' (i.e. a real match is live), so default 0 means: live game -> spectators only; standby/countdown -> public. Setting 1 forces gameStarted=false unconditionally -> always public. OFF-state (=0) is the default-restrictive branch. No read-only flag; settable via config/rcon. F-MV1: KTX actively drives this -- ktx/src/match.c:1373 `cvar_fset(\"qtv_sayenabled\", 0)` at match start; ktx/src/race.c:314 sets 1 in race settings, race.c:321 sets 0 in non-race; ktx/src/commands.c:4212 ships 'qtv_sayenabled 0' as the default-block -- hence the inline 'mods commonly drive this automatically' clause (action-changing: a manual admin value is reverted by KTX at match/mode transitions).",
  "description_proposed": null
}
```
