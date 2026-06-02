# describe-fill-synthesis ledger -- mvdsv `sv_voip`

- **project:** mvdsv
- **knob:** `sv_voip` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_voip: synthesized -- master voice-chat gate; 0 drops incoming voice at ingest, 1 relays; engine-owned, FTE-pext compile-gated -- origin=synthesized ref=src/sv_user.c:2873 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Master switch for in-game voice chat on the server. When off, the server ignores all incoming voice packets so no voice is relayed between clients.
>
> 1 = voice chat enabled (incoming voice is buffered and forwarded to the intended recipients).
> 0 = voice chat disabled (incoming voice packets are dropped).
>
> Default: 1.
> Set by: server config / rcon. Available only on builds compiled with FTE voice-chat support, and clients must also support voice for it to work.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 = incoming voice packet dropped (no relay) | src/sv_user.c:2873 | `if (bytes > sizeof(ring->data) \|\| curtime < host_client->lockedtill \|\| !sv_voip.ival) { MSG_ReadSkip(bytes); return; }` | MATCH |
| 1 = packet buffered then forwarded | src/sv_user.c:2878 | else branch `voice.write++; MSG_ReadData(ring->data, bytes);` (only reached when ival nonzero) | MATCH |
| .ival reads the same value field | src/sv_user.c:2844 | `#define ival value // for cvars compatibility` | MATCH |
| Default 1 | src/sv_user.c:50 | `cvar_t sv_voip = {"sv_voip", "1"};` | MATCH |
| compile-gated on FTE voice support | src/sv_user.c:48 | `#ifdef FTE_PEXT2_VOICECHAT` | MATCH |
| recipient must support voice pext | src/sv_user.c:2982 | `if (!(client->fteprotocolextensions2 & FTE_PEXT2_VOICECHAT)) return;` | MATCH |
| no KTX override | ktx/src (grep) | grep "sv_voip" empty | MATCH (cross-mod) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | "Master switch for in-game voice chat on the server" (scope/role) | sv_user.c:50 + sv_user.c:2873 | `cvar_t sv_voip = {"sv_voip", "1"};` // decl comment :49 `// Enable reception of voice packets.` ; gate `... \|\| !sv_voip.ival) { MSG_ReadSkip(bytes); return; }` | MATCH |
| 2 | OFF "server ignores all incoming voice packets" | sv_user.c:2873-2876 | `if (bytes > sizeof(ring->data) \|\| curtime < host_client->lockedtill \|\| !sv_voip.ival) { MSG_ReadSkip(bytes); return; }` | MATCH (when ival==0 the OR is unconditionally true -> every incoming packet is skip-and-return; "all" is exact) |
| 3 | OFF "no voice is relayed between clients" (side-effect) | sv_user.c:2878 (writer) + 2990 (forward loop reads voice.write) | only ring writer is `voice.write++;` inside the else-branch at :2877-2880; when dropped, ring never advances, so `SV_VoiceSendPacket` while-loop `while(client->voice_read < voice.write)` has nothing new to forward | MATCH (forward path is starved at the source; no alternate ring writer exists in tree) |
| 4 | "1 = ... incoming voice is buffered" | sv_user.c:2877-2885 | `else { voice.write++; MSG_ReadData(ring->data, bytes); } ring->datalen = bytes; ring->sender = ...` | MATCH (ON-path writes the packet into the ring buffer) |
| 5 | "1 = ... forwarded to the intended recipients" | sv_user.c:2887-2929 (receiver mask) + 2971-3034 (SV_VoiceSendPacket) | receiver mask built per `voice_target` (team/all/nonmuted/slot); send path `if (ring->receiver[clno>>3] & (1<<(clno&3))) send = true;` | MATCH ("intended recipients" = voice_target-derived receiver mask) |
| 6 | "0 = ... incoming voice packets are dropped" | sv_user.c:2873-2875 | `if (... \|\| !sv_voip.ival) { MSG_ReadSkip(bytes); return; }` | MATCH (MSG_ReadSkip consumes+discards the payload, returns before ring write) |
| 7 | "Default: 1" | sv_user.c:50 + cvar.c:155,267-269 | `{"sv_voip", "1"}`; Cvar_Register -> `Cvar_SetROM(variable, "1")` -> `var->value = Q_atof(var->string)` = 1.0; `#define ival value` (:2844) | MATCH (registered default = "1" -> ival 1) |
| 8 | "Set by: server config / rcon" (settability) | sv_user.c:50 (no flag field) | `cvar_t sv_voip = {"sv_voip", "1"};` -- name+string only, flags=0; no CVAR_ROM/SERVERINFO; standard console/config/rcon-settable cvar | MATCH |
| 9 | "Available only on builds compiled with FTE voice-chat support" (scope) | sv_user.c:48,55 / :2828,3105 / :4917,4921 | decl, function block, dispatch case, and `Cvar_Register(&sv_voip)` all inside `#ifdef FTE_PEXT2_VOICECHAT` | MATCH |
| 10 | "clients must also support voice for it to work" | sv_user.c:2982-2983 | `if (!(client->fteprotocolextensions2 & FTE_PEXT2_VOICECHAT)) return;` | MATCH (recipient must have negotiated the FTE voicechat pext, else SendPacket returns early) |

**V-pass notes:** All 10 material clauses trace to located, verified enforcing lines (incl. adjacent comments and the Cvar_Register/Cvar_SetROM default-parse chain). Verdict: TRACED-CLEAN.

Wide-read: sv_voip has exactly ONE enforcing read-site -- sv_user.c:2873 (`!sv_voip.ival`). Siblings sv_voip_record (:2931) and sv_voip_echo (:3014) are distinct cvars and out of scope; I confirmed they are NOT the sv_voip gate. The only ring-buffer writer is voice.write++ at :2878, so the OFF-state "nothing relayed" claim is structurally sound (no alternate path feeds the forward loop). Registration is one of three Cvar_Register calls, all under #ifdef FTE_PEXT2_VOICECHAT.

Mechanism nuance (does NOT lower the grade, all hedged correctly in the text): the master switch enforces at the READ stage (SV_VoiceReadPacket -> clc_voicechat dispatch, sv_user.c:4792). When off, the incoming packet is consumed via MSG_ReadSkip and dropped before the ring advances; the description's "incoming voice packets are dropped" and "ignores all incoming voice packets" both match this read-stage drop precisely. The forward suppression is a consequence of the ring never advancing, not a separate gate -- the text's "so no voice is relayed between clients" correctly frames it as a consequence ("so ..."), not an independent mechanism.

The FTE-compat shim is worth recording for any future trace: at sv_user.c:2842-2844 the file `#define`s host_client->sv_client and crucially `#define ival value`, so `sv_voip.ival` IS `sv_voip.value` (the float parsed from the default string "1"). A reader unaware of this shim might think `.ival` is a separate int field; it is not.

"Default on non-team games is to broadcast" in the block header comment (:2836) refers to per-client voice_target behavior (VT_TEAM auto-promoted to VT_ALL when !teamplay.ival at :2888), NOT to sv_voip -- correctly absent from the description.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_voip",
  "type": "cvar",
  "description": "Master switch for in-game voice chat on the server. When off, the server ignores all incoming voice packets so no voice is relayed between clients.\n\n1 = voice chat enabled (incoming voice is buffered and forwarded to the intended recipients).\n0 = voice chat disabled (incoming voice packets are dropped).\n\nDefault: 1.\nSet by: server config / rcon. Available only on builds compiled with FTE voice-chat support, and clients must also support voice for it to work.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:2873. Registered src/sv_user.c:50 default \"1\", inside `#ifdef FTE_PEXT2_VOICECHAT` (src/sv_user.c:48) -- hence the compile-gate note. Read via .ival (=.value; the `#define ival value` compat shim is at src/sv_user.c:2844). Enforcing read-site: SV_VoiceReadPacket src/sv_user.c:2873 `if (bytes > sizeof(ring->data) || curtime < host_client->lockedtill || !sv_voip.ival) { MSG_ReadSkip(bytes); return; }` -- when ival is 0 the incoming voice packet is skipped and the function returns before the packet is written into the voice ring buffer (src/sv_user.c:2878-2880 `voice.write++; MSG_ReadData(...)` is the else branch), so nothing is relayed. When nonzero, the packet is buffered and the recipient-set computed (src/sv_user.c:2892-2929), then sent by SV_VoiceSendPacket. OFF-state = packets dropped at ingest; ON-state = relayed. \"clients must support voice\" is enforced downstream at src/sv_user.c:2982 `if (!(client->fteprotocolextensions2 & FTE_PEXT2_VOICECHAT)) return;` (a per-recipient gate), kept as a one-clause user-relevant caveat. CROSS-MOD: zero KTX reads of sv_voip (grep of ktx/src empty) -- pure engine knob. No recommended value (mechanism only).",
  "description_proposed": null
}
```
