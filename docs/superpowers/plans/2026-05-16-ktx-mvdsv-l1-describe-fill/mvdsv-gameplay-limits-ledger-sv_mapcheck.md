# describe-fill-synthesis ledger -- mvdsv `sv_mapcheck`

- **project:** mvdsv
- **knob:** `sv_mapcheck` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_mapcheck: synthesized -- on/off prespawn map-checksum gate that drops mismatching clients, traced to SV_PreSpawn_f -- origin=synthesized ref=src/sv_user.c:704 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server verifies that each connecting client has the same map file as the server before letting them spawn.
>
> 0 = off; do not verify the client's map file.
> 1 (or any non-zero value) = on; if the client's map does not match the server's, the client is shown a message that their map file differs and is dropped.
>
> Default: 1.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 = off (check skipped) | src/sv_user.c:704 | `if ((int)sv_mapcheck.value && ...)` -> false short-circuits | MATCH |
| non-zero = on | src/sv_user.c:704 | truthiness gate, no value>1 branch | MATCH |
| match against both server checksums | src/sv_user.c:704-705 | `check != sv.map_checksum && check != sv.map_checksum2` | MATCH |
| client checksum source | src/sv_user.c:700 | `check = Q_atoi(Cmd_Argv(3));` | MATCH |
| on mismatch: message shown + dropped | src/sv_user.c:707-712 | `SV_ClientPrintf(... "Map model file does not match ...")` + `SV_DropClient` + `return` | MATCH |
| on pass: prespawn continues | src/sv_user.c:714 | `sv_client->checksum = check;` | MATCH |
| default = 1 | src/sv_user.c:34 | `cvar_t sv_mapcheck = {"sv_mapcheck", "1"}` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Server verifies connecting client has same map file as server before spawn | src/sv_user.c:704-705 (in Cmd_PreSpawn_f, the "prespawn" handler registered at :3304, which precedes "spawn" Cmd_Spawn_f at :3305) | `if ((int)sv_mapcheck.value && check != sv.map_checksum && check != sv.map_checksum2)` -- `check` = client's checksum from Cmd_Argv(3); sv.map_checksum/2 set by CM_LoadMap from sv.modelname (sv_init.c:499) | MATCH |
| 2 | 0 = off; do not verify | src/sv_user.c:704 + fall-through :714 | First conjunct `(int)sv_mapcheck.value &&` short-circuits to false when 0 -> drop branch skipped -> execution falls through to `sv_client->checksum = check;` (no comparison, no drop) | MATCH |
| 3 | 1 / any non-zero = on | src/sv_user.c:704 | `(int)sv_mapcheck.value` is truthy for any non-zero int (not `== 1`); "(or any non-zero value)" qualifier is precise | MATCH |
| 4 | On mismatch: client shown a message that map differs, then dropped | src/sv_user.c:707-712 | `SV_ClientPrintf (sv_client, PRINT_HIGH, "Map model file does not match (%s), %i != %i/%i.\n" "You may need a new version of the map, or the proper install files.\n", ...); SV_DropClient (sv_client); return;` | MATCH |
| 5 | Default: 1 | src/sv_user.c:34 (decl), :4906 (register) | `cvar_t sv_mapcheck = {"sv_mapcheck", "1"};` registered via plain `Cvar_Register (&sv_mapcheck);` (no Ex/override) -> registered default "1" | MATCH |
| 6 | Set by: server config | src/sv_user.c:4906 | Plain server-side cvar, no access-flag gating; settable from console/config. Generic provenance line, not contradicted | MATCH |

**V-pass notes:** All 6 material clauses (polarity, threshold, OFF-state, side-effect, default, scope) trace to located, verified enforcing lines. The single enforcing branch is sv_user.c:704-705 inside Cmd_PreSpawn_f -- a DIFFERENT function from registration but in the same file. Polarity is correct: `(int)sv_mapcheck.value &&` as the first conjunct means value=0 short-circuits the entire drop condition, and execution falls through to record `sv_client->checksum = check` without dropping (correct OFF-state). Threshold "(or any non-zero value)" is precise -- the code is `(int)value` truthiness, NOT `== 1`. Default "1" is the REGISTERED default (decl at :34, plain Cvar_Register at :4906, no Ex/override), not a shipped-cfg value. Side-effect (message + SV_DropClient) verified verbatim at :707-712. Lifecycle claim "before letting them spawn" is accurate: the check lives in the "prespawn" command handler (:3304), which precedes the "spawn" command handler (:3305); a failed check calls SV_DropClient + return, so the client never reaches spawn. "Map file" is a faithful user-doc paraphrase of the BSP world-model checksum (sv.map_checksum/2 populated by CM_LoadMap from sv.modelname per sv_init.c:499); the engine message itself says "Map model file" but "map file" is correct at the user-doc altitude and not worth a near-miss. No cross-mod override exists (cvar is read directly in the engine prespawn path). No flavour-C inference detected -- every clause maps to enforcing code, not to the knob name or the message string.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_mapcheck",
  "type": "cvar",
  "description": "Controls whether the server verifies that each connecting client has the same map file as the server before letting them spawn.\n\n0 = off; do not verify the client's map file.\n1 (or any non-zero value) = on; if the client's map does not match the server's, the client is shown a message that their map file differs and is dropped.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:704. Single enforcing read-site src/sv_user.c:704-713 in SV_PreSpawn_f: `if ((int)sv_mapcheck.value && check != sv.map_checksum && check != sv.map_checksum2) { SV_ClientPrintf(... \"Map model file does not match (%s), %i != %i/%i.\\n\" \"You may need a new version of the map ...\"); SV_DropClient(sv_client); return; }`. POLARITY/THRESHOLD: gated on `(int)sv_mapcheck.value` truthiness -> 0 disables the check entirely; any non-zero enables it (no special handling for values >1). MATCH CONDITION: the client-supplied checksum `check` (from Cmd_Argv(3), src/sv_user.c:700, only evaluated on the buf==0 prespawn step src/sv_user.c:697) must equal sv.map_checksum OR sv.map_checksum2; mismatch on BOTH -> drop. EFFECT on fail: prints the 'Map model file does not match' message to the client then SV_DropClient + return (connection terminated). EFFECT on pass / when off: src/sv_user.c:714 `sv_client->checksum = check;` and prespawn continues. SCOPE: enforced at prespawn time (pre-entry), per-connecting-client. DEFAULT '1' at registration src/sv_user.c:34 `cvar_t sv_mapcheck = {\"sv_mapcheck\", \"1\"}`. Set-by: plain cvar -> server config.",
  "description_proposed": null
}
```
