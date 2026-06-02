# describe-fill-synthesis ledger -- mvdsv `sv_serveme_fix`

- **project:** mvdsv
- **knob:** `sv_serveme_fix` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_serveme_fix: synthesized -- read-only (CVAR_ROM) ServeMe-bot compat fix, always on; suppresses world stream to a [ServeMe] spectator; traced to SV_SkipCommsBotMessage + 4 callers; no KTX override -- origin=synthesized ref=src/sv_ents.c:1124 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Compatibility fix for the ServeMe match/stats bot. When on, the server stops sending the normal world stream -- broadcast messages, entity updates and player data -- to a spectator whose name is exactly "[ServeMe]", and lets that spectator skip the usual pre-spawn and outdated-client checks.
>
> This setting is read-only and is always on; it cannot be changed from server config or rcon.
>
> Default: 1 (on).
> Set by: engine (read-only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| gate: on AND spectator AND name exactly [ServeMe] | src/sv_ents.c:1124 | `return sv_serveme_fix.value && client->spectator && !strcmp(client->name, "[ServeMe]");` | MATCH |
| skips broadcast/multicast messages to it | src/sv_send.c:452-453 | `if (SV_SkipCommsBotMessage(client)) continue;` | MATCH |
| skips client data + PVS entity/player stream | src/sv_send.c:924-926 | `if (!SV_SkipCommsBotMessage(client)) { SV_WriteClientdataToMessage(client, &msg); // send over all the objects that are in the PVS` | MATCH |
| skips pre-spawning | src/sv_user.c:717-721 | `if (SV_SkipCommsBotMessage(sv_client)) { // skip pre-spawning ... return; }` | MATCH |
| exempts it from outdated-client drop | src/sv_user.c:348-350 | `if (!SV_SkipCommsBotMessage(sv_client)) { return; }` | MATCH |
| read-only (CVAR_ROM) | src/sv_main.c:192 | `cvar_t sv_serveme_fix = { "sv_serveme_fix", "1", CVAR_ROM };` | MATCH |
| CVAR_ROM blocks Cvar_Set | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM) return;` | MATCH |
| default 1, no write path -> always on | src/sv_main.c:192,3572 | `{..."1", CVAR_ROM}` + only `Cvar_Register (&sv_serveme_fix);` (no Set anywhere) | MATCH |
| no KTX override | ktx/src (grep) | (zero hits for sv_serveme_fix) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Compatibility fix for the ServeMe bot (purpose/identity) | sv_main.c:191 (registration comment) + sv_ents.c:1124 | `// If set, don't send broadcast messages, entities or player info to ServeMe bot`  /  `!strcmp(client->name, "[ServeMe]")` | MATCH |
| 2 | Targets a SPECTATOR whose name is EXACTLY "[ServeMe]" | sv_ents.c:1124 (SV_SkipCommsBotMessage) | `return sv_serveme_fix.value && client->spectator && !strcmp(client->name, "[ServeMe]");` | MATCH |
| 3 | "When on" -- behavior gated on cvar value | sv_ents.c:1124 | `sv_serveme_fix.value && ...` (leading conjunct) | MATCH |
| 4 | Stops sending BROADCAST MESSAGES | sv_send.c:452 (SV_Multicast loop) | `if (SV_SkipCommsBotMessage(client)) continue;` | MATCH |
| 5 | Stops sending ENTITY UPDATES + PLAYER DATA | sv_send.c:924-931 (SV_SendClientDatagram) | `if (!SV_SkipCommsBotMessage(client)) { SV_WriteClientdataToMessage(client,&msg); ... SV_WriteEntitiesToClient(client,&msg,false); }` | MATCH |
| 6 | Lets the bot SKIP the usual PRE-SPAWN | sv_user.c:717-722 (Cmd_PreSpawn_f) | `if (SV_SkipCommsBotMessage(sv_client)) { // skip pre-spawning  MSG_WriteByte(...svc_stufftext); MSG_WriteString(...va("cmd spawn %i 0\n",svs.spawncount)); return; }` | MATCH |
| 7 | Lets the bot SKIP the OUTDATED-CLIENT check | sv_user.c:344-351 (Cmd_New_f, FTE_PEXT_FLOATCOORDS block) | `if (!sv_client->spectator) { SV_DropClient(sv_client); return; }  if (!SV_SkipCommsBotMessage(sv_client)) { return; }` -- the bot is the only spectator that does NOT return, so it continues past the floatcoords/outdated check | MATCH |
| 8 | Read-only; cannot be changed from config or rcon | sv_main.c:192 (flag) + cvar.c:134-135 (Cvar_Set) | `cvar_t sv_serveme_fix = { "sv_serveme_fix", "1", CVAR_ROM };`  /  `if (var->flags & CVAR_ROM) return;` (cvar.h:63 `CVAR_ROM (1<<1) // read only`) | MATCH |
| 9 | Always on (no runtime write flips it) | wide grep over /src (only 4 use-sites; the two reads at sv_ents.c:1122/1124, registration at sv_main.c:192/3572) -- NO Cvar_SetROM/Cvar_SetByName/OnChange on this cvar; no .cfg/.rc override in tree | (absence of any write site) | MATCH |
| 10 | Default: 1 (on) | sv_main.c:192 | `{ "sv_serveme_fix", "1", CVAR_ROM }` -- registered default "1" | MATCH |
| 11 | Set by: engine (read-only) | cvar.c:168-178 (Cvar_SetROM escape hatch) | `Cvar_SetROM` temporarily clears `CVAR_ROM`, sets, restores -- engine-internal only; no user path | MATCH |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed at 1.11-53-g18d0362. Every material clause (purpose, gating conditions, the three suppressed world-stream items, the two skipped client checks, read-only/settability, always-on, default, set-by) maps to a located + verified enforcing line, including adjacent comments.

Trace path: registration sv_main.c:192 (CVAR_ROM, default "1") -> helper SV_SkipCommsBotMessage sv_ents.c:1120-1125 (the real gate: cvar.value AND spectator AND exact name "[ServeMe]") -> 4 callers across 3 files. sv_send.c:452 enforces "broadcast messages" (continue past multicast). sv_send.c:924 enforces "entity updates + player data" (skips SV_WriteClientdataToMessage + SV_WriteEntitiesToClient). sv_user.c:717 (Cmd_PreSpawn_f) enforces "skip pre-spawn" -- the in-code comment literally reads "// skip pre-spawning". sv_user.c:348 (Cmd_New_f, FLOATCOORDS block) enforces "skip outdated-client check" -- the bot is the lone spectator allowed to continue past the floatcoords/outdated-protocol gate instead of returning. CVAR_ROM enforcement verified at the actual set path cvar.c:134-135 (Cvar_Set early-returns on ROM), not merely inferred from the flag name; Cvar_SetROM (cvar.c:168) is the engine-internal-only escape hatch, consistent with "Set by: engine (read-only)". "Always on" verified by absence: a full /src grep found zero write sites and no .cfg/.rc override, so the registered "1" persists at runtime for this build.

The settability/always-on axis here is the same axis flagged on sv_paused in chunk 7 -- but unlike sv_paused (which the engine DOES write via Cvar_SetROM to mirror sv.paused, making "always on" wrong there), sv_serveme_fix has NO engine write site at all, so "always on" is genuinely correct. The two are real opposites on this axis; this row is the clean case.

Single sub-CLEAN nuance (non-defect, NOT a demote): sv_send.c:933-935 also suppresses SV_VoiceSendPacket (FTE voice) for the bot, behind the same gate. The description does not enumerate voice but folds it under the general phrase "the normal world stream", so it is a faithful (if non-exhaustive) summary, not a contradiction or an unenforced claim. Acceptable still-true vagueness per the TRACED-CLEAN bar.

No flavour-C clause found: no clause rests on name/enum/string/comment inference alone -- the registration comment's wording is independently corroborated by the three enforcing call-sites.

## flags_for_review

- [fyi/other/synthesis] sv_serveme_fix is declared CVAR_ROM (read-only) with registered default "1", and a tree-wide grep finds NO write site (no Cvar_Set/SetValue/SetROM) anywhere -- only the registration. Its sole consumer (sv_ents.c:1124) gates on `.value` being truthy. So it behaves as a hardcoded always-on constant: an admin cannot disable the ServeMe fix via config or rcon. Either the read-only flag is intentional (the fix should never be turned off) or the cvar was meant to be admin-toggleable and CVAR_ROM is an oversight. Worth an operator/upstream confirm.
- [fyi/runtime-dead-suspect/vpass] sv_serveme_fix is registered CVAR_ROM with default "1" and has NO engine write site anywhere in /src (unlike sv_paused, which IS written via Cvar_SetROM). It is effectively a permanently-on compile-time constant exposed as a read-only cvar. The 'cvar' surface is vestigial -- it can never be 0 at runtime in this build. FYI for the synthesis owner: the 'Default: 1 / read-only / always on' framing is correct, but a reader could reasonably ask why it is a cvar at all rather than a #define. Not a defect; just the design reality.
- [fyi/other/vpass] Voice packets (SV_VoiceSendPacket, sv_send.c:933-935, behind FTE_PEXT2_VOICECHAT) are also suppressed to the ServeMe bot under the same gate but are not enumerated in the description (which lists only broadcast messages, entity updates, player data). Covered by the general phrase 'the normal world stream' so it is not a defect, but if a future edit makes the enumeration authoritative-looking, voice should be added.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_serveme_fix",
  "type": "cvar",
  "description": "Compatibility fix for the ServeMe match/stats bot. When on, the server stops sending the normal world stream -- broadcast messages, entity updates and player data -- to a spectator whose name is exactly \"[ServeMe]\", and lets that spectator skip the usual pre-spawn and outdated-client checks.\n\nThis setting is read-only and is always on; it cannot be changed from server config or rcon.\n\nDefault: 1 (on).\nSet by: engine (read-only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ents.c:1124. Enforcing read-site: sv_ents.c:1124 `return sv_serveme_fix.value && client->spectator && !strcmp(client->name, \"[ServeMe]\")` inside SV_SkipCommsBotMessage -- the predicate is true only when the cvar value is nonzero AND the client is a spectator AND the client name is exactly \"[ServeMe]\". Observable effect traced to the four callers: sv_send.c:452-453 (`if (SV_SkipCommsBotMessage(client)) continue;`) skips that client when broadcasting multicast messages; sv_send.c:924-926 (`if (!SV_SkipCommsBotMessage(client)) { SV_WriteClientdataToMessage... PVS objects }`) skips writing client-specific data + the PVS entity/player stream; sv_user.c:717-722 skips pre-spawning (just stuffs `cmd spawn`); sv_user.c:348-350 exempts the [ServeMe] spectator from the outdated-client SV_DropClient path. The 'broadcast messages, entities and player info' phrasing matches the declaration comment sv_main.c:191 'If set, don't send broadcast messages, entities or player info to ServeMe bot' AND the enforcing callers. Read-only / always-on: declared CVAR_ROM at sv_main.c:192 `cvar_t sv_serveme_fix = { \"sv_serveme_fix\", \"1\", CVAR_ROM }`; Cvar_Set returns early on CVAR_ROM (cvar.c:134-135 `if (var->flags & CVAR_ROM) return;`), and a tree-wide grep finds NO Cvar_Set/Cvar_SetValue/Cvar_SetROM write to sv_serveme_fix anywhere (only the registration at sv_main.c:3572), so the value is permanently the registered default 1 -- an admin cannot set it to 0. For that reason the OFF (0) state is not documented as a settable option (it is unreachable through normal admin means). No KTX override (grep of ktx/src for sv_serveme_fix: zero hits). See flags: the read-only-with-no-write-path shape (effectively a hardcoded constant) is recorded for review.",
  "description_proposed": null
}
```
