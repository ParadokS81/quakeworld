# describe-fill-synthesis ledger -- mvdsv `sv_allowlastscores`

- **project:** mvdsv
- **knob:** `sv_allowlastscores` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_allowlastscores: synthesized -- gates connectionless lastscores/laststats server queries (0=refuse), in-game /lastscores is a separate ungated path -- origin=synthesized ref=src/sv_main.c:700 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server answers remote "lastscores" and "laststats" requests -- connectionless network queries (the same kind as a server-browser status ping) that let an outside program or player retrieve the server's recent recorded-demo scores and stats without joining the game.
>
> 0 = refuse both queries.
> non-zero = answer them, returning a list of recent demo results.
>
> Default: 1.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read site gates lastscores query | src/sv_main.c:700 | `if(!(int)sv_allowlastscores.value) return;` (in SVC_LastScores) | yes |
| read site gates laststats query | src/sv_main.c:716 | `if(!(int)sv_allowlastscores.value) return;` (in SVC_LastStats) | yes |
| reached via connectionless dispatch | src/sv_main.c:1944,1946 | `else if (!strcmp(c,"lastscores")) SVC_LastScores();` / `..."laststats") SVC_LastStats();` | yes |
| connectionless = network query, no join | src/sv_main.c:1907-1910 | comment: "A connectionless packet has four leading 0xff characters..." | yes |
| answer returned to requester | src/sv_main.c:703 | `SV_BeginRedirect (RD_PACKET);` | yes |
| payload is recent demo scores list | src/sv_demo_misc.c:988 | `dir = Sys_listdir(... sv_demoDir.string, ..., SORT_BY_DATE);` (in SV_LastScores_f) | yes |
| polarity 0=refuse non-zero=answer | src/sv_main.c:700 | `if(!(int)...value) return;` (negated guard) | yes |
| default 1 | src/sv_main.c:126 | `cvar_t sv_allowlastscores = {"sv_allowlastscores", "1"};` | yes |
| settable plain cvar (no cmd) | src/sv_main.c:3557 | `Cvar_Register (&sv_allowlastscores);` | yes |
| in-game /lastscores NOT gated (scope) | src/sv_user.c:3344 | `{"lastscores", SV_LastScores_f, false}` (separate path, no cvar guard) | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | file:line | snippet | Verdict |
|---|--------|-----------|---------|---------|
| 1 | Controls whether server answers BOTH "lastscores" AND "laststats" requests | src/sv_main.c:700 and :716 | `if(!(int)sv_allowlastscores.value)` / `return;` -- present identically inside SVC_LastScores (700) and SVC_LastStats (716) | MATCH |
| 2 | Connectionless network queries (same kind as a server-browser status ping) | src/sv_main.c:1907-1910 (header comment) + :1932-1933 (status) + :1944-1947 (lastscores/laststats) | `A connectionless packet has four leading 0xff characters to distinguish it from a game channel.` ; `else if (!strcmp(c,"status")) SVC_Status();` ; `else if (!strcmp(c,"lastscores")) SVC_LastScores();` ; `else if (!strcmp(c,"laststats")) SVC_LastStats();` -- all in the same SV_ConnectionlessPacket dispatch switch | MATCH |
| 3 | Lets an outside program/player retrieve recent recorded-demo scores and stats without joining | src/sv_main.c:1909-1910 + src/sv_demo_misc.c:988 (scores) / :1067 (stats) | `Clients that are in the game can still send connectionless packets.` ; `dir = Sys_listdir(va("%s/%s", fs_gamedir, sv_demoDir.string), sv_demoRegexp.string, SORT_BY_DATE);` -- both handlers enumerate the recorded-demo directory | MATCH |
| 4 | 0 = refuse both queries | src/sv_main.c:700-701 and :716-717 | `if(!(int)sv_allowlastscores.value)` `return;` -- value 0 -> !0 true -> early return, handler produces nothing, for both SVC paths | MATCH |
| 5 | non-zero = answer them, returning a list of recent demo results | src/sv_main.c:703-704 / :719-720 + src/sv_demo_misc.c:1007 | `SV_BeginRedirect (RD_PACKET);` `SV_LastScores_f ();` ; handler prints `Con_Printf("List of %d last demos:\n", demos);` redirected back to net_from | MATCH |
| 6 | Default: 1 | src/sv_main.c:126 | `cvar_t sv_allowlastscores = {"sv_allowlastscores", "1"};` -- registered default string "1" (verified at registration, not from a shipped cfg) | MATCH |
| 7 | Set by: server config | src/sv_main.c:126, :3557 | positional init `{name,"1"}` leaves flags=0 (no CVAR_ROM/CVAR_SERVERINFO); `Cvar_Register (&sv_allowlastscores);` in SV_InitLocal -- plain read/write server cvar | MATCH |

**V-pass notes:** COLD V-pass on mvdsv @ 1.11-53-g18d0362 (tag confirmed). Wide-grep found exactly 4 use-sites of sv_allowlastscores: registration (sv_main.c:126), two enforcing reads (sv_main.c:700, :716), and Cvar_Register (sv_main.c:3557). No string-form reads (Cvar_Value/Cvar_String/cvar()) anywhere. No C2/C3 cross-mod override.

Both enforcing reads gate connectionless service handlers SVC_LastScores (sv_main.c:698-706) and SVC_LastStats (sv_main.c:714-722), each doing `if(!(int)sv_allowlastscores.value) return;` then SV_BeginRedirect(RD_PACKET) + handler + SV_EndRedirect. Dispatch is from SV_ConnectionlessPacket (sv_main.c:1944-1947), whose header comment literally defines the four-0xff connectionless framing -- the "connectionless query, same kind as a status ping" framing is borne out by `status`->SVC_Status sitting in the very same switch (line 1932). Handlers SV_LastScores_f (sv_demo_misc.c:969) and SV_LastStats_f (sv_demo_misc.c:1037) enumerate the recorded-demo directory (fs_gamedir/sv_demoDir) sorted by date and print a list -- confirming "recent recorded-demo scores/stats" and "list of recent demo results". Default "1" verified at the registration line itself (WI-2 satisfied). No flags on the cvar -> plain server-config-settable.

SCOPE PRECISION (the trap this row could have fallen into, and didn't): SV_LastScores_f is reachable via THREE paths -- the connectionless SVC path (gated by the cvar), a client command `lastscores` (sv_user.c:3344), and a console command `sv_lastscores` (sv_demo.c:1943). The latter two call SV_LastScores_f directly and are NOT gated by sv_allowlastscores. The description correctly scopes its claim to "remote ... connectionless" requests, so it does not over-claim that the cvar disables the local/console invocation. This is the difference between TRACED-CLEAN and a C-FIX scope inversion; the proposed text is on the correct side.

Every material clause (polarity, both-queries, default, scope, OFF-state, return-payload) maps to a located+verified enforcing line incl. adjacent comments. No flavour-C name/string/enum inference detected. Classification: TRACED-CLEAN.

## flags_for_review

- [review/cross-mod-override/synthesis] sv_allowlastscores gates ONLY the connectionless network query path (SVC_LastScores/SVC_LastStats, sv_main.c:700/716). The in-game `/lastscores` console command is a separate path that is NOT gated by this cvar -- it exists both in MVDSV (sv_user.c:3344) and as a KTX mod command (commands.c:899, plus lastscoresktx and laststats). An admin who sets sv_allowlastscores 0 to 'turn off lastscores' will still have a working in-game /lastscores; the cvar only stops outside programs/spectators from pulling scores via a connectionless packet. Worth a human note in case the cvar name implies broader scope than it has.
- [fyi/other/vpass] laststats / SVC_LastStats is effectively connectionless-only: SV_LastStats_f (src/sv_demo_misc.c:1047-1050) opens with `if (sv_redirected != RD_PACKET) { return; }`, and laststats is registered NOWHERE as a console or client command (only the connectionless dispatch at sv_main.c:1946 reaches it). lastscores, by contrast, is additionally a client command (sv_user.c:3344) and a console command sv_lastscores (sv_demo.c:1943). This asymmetry does not contradict any clause in the proposed description (which speaks only of the remote/connectionless behavior the cvar gates), but is a latent detail: the cvar is the ONLY gate that exists for laststats output, whereas for lastscores it gates just one of three entry points. FYI for the synthesis record, not a defect.
- [fyi/other/vpass] Connectionless lastscores/laststats self-limit their result count when sv_redirected==RD_PACKET: SV_LastScores_f caps demos to MAXDEMOS_RD_PACKET (src/sv_demo_misc.c:1003-1005) and SV_LastStats_f caps to STATS_LIMIT_MAX=50 (src/sv_demo_misc.c:1035-1064). Not relevant to any sv_allowlastscores clause; noted only because it bounds the 'list of recent demo results' payload size for the remote path.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_allowlastscores",
  "type": "cvar",
  "description": "Controls whether the server answers remote \"lastscores\" and \"laststats\" requests -- connectionless network queries (the same kind as a server-browser status ping) that let an outside program or player retrieve the server's recent recorded-demo scores and stats without joining the game.\n\n0 = refuse both queries.\nnon-zero = answer them, returning a list of recent demo results.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:700. Read use-sites: sv_main.c:700 `if(!(int)sv_allowlastscores.value) return;` short-circuits SVC_LastScores before its RD_PACKET redirect; sv_main.c:716 identical guard short-circuits SVC_LastStats. Both SVC_ handlers are reached only from the connectionless-packet dispatcher SV_ConnectionlessPacket -- sv_main.c:1944 `else if (!strcmp(c,\"lastscores\")) SVC_LastScores();` and :1946 `SVC_LastStats()` -- which (sv_main.c:1907 comment) handles packets with the four-0xff connectionless marker, same family as status/ping/dlist; hence \"remote/connectionless query, no game join required\" and the RD_PACKET (sv_main.c:703/719) means the answer is sent back to the requesting address. The answered payload is SV_LastScores_f / SV_LastStats_f (sv_demo_misc.c:969 / :1037), which list recent recorded demos from the demo dir (Sys_listdir of sv_demoDir, SORT_BY_DATE, sv_demo_misc.c:988) -- hence \"recent recorded-demo scores and stats.\" Polarity: guard is `!value -> return`, so 0 refuses, non-zero answers. Default: registered literal `cvar_t sv_allowlastscores = {\"sv_allowlastscores\", \"1\"}` (sv_main.c:126), registered sv_main.c:3557 -> default 1. Set by: plain server cvar, no command/dispatch handler, so server config / rcon. SCOPE NOTE (kept out of user doc, see flags): this gates ONLY the connectionless query path; the in-game `/lastscores` console command is a different code path NOT gated by this cvar (MVDSV sv_user.c:3344 `{\"lastscores\", SV_LastScores_f, false}`, and KTX commands.c:899 `{ \"lastscores\", lastscores, ... }` is its own mod command entirely). No KTX override of the CVAR itself (F-MV1: grep of ktx/src finds no sv_allowlastscores).",
  "description_proposed": null
}
```
