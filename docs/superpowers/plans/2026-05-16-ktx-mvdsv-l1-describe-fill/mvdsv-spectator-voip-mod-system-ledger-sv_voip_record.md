# describe-fill-synthesis ledger -- mvdsv `sv_voip_record`

- **project:** mvdsv
- **knob:** `sv_voip_record` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_voip_record: synthesized -- records voice into the MVD demo; 0=none,1=everyone,2=spectators-only (enum verified at enforcing line, not comment) -- origin=synthesized ref=src/sv_user.c:2931 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether players' voice chat is recorded into the server's MVD demo (only while a demo is being recorded).
>
> 0 = record no one's voice.
> 1 = record everyone's voice.
> 2 = record spectators' voice only (players' voice is left out of the demo).
>
> Default: 0.
> Set by: server config / rcon. Available only on builds with FTE voice-chat support; clients must support voice for their voice to exist at all.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| record gate requires a demo in progress | src/sv_user.c:2931 | `if (sv.mvdrecording && sv_voip_record.ival && ...)` | MATCH |
| 0 = record no one | src/sv_user.c:2931 | `sv_voip_record.ival` (0 => false => skip MVD write) | MATCH |
| 1 = record everyone | src/sv_user.c:2931 | `1 && !(1==2 && !spec)` => `1 && true` => write | MATCH |
| 2 = spectators only (player voice excluded) | src/sv_user.c:2931 | `!(sv_voip_record.ival == 2 && !host_client->spectator)` => non-spec sender excluded when ==2 | MATCH |
| writes svc_fte_voicechat into the MVD | src/sv_user.c:2954 | `MVD_MSG_WriteByte( svc_fte_voicechat);` | MATCH |
| .ival is .value | src/sv_user.c:2844 | `#define ival value` | MATCH |
| Default 0 | src/sv_user.c:52 | `cvar_t sv_voip_record = {"sv_voip_record", "0"};` | MATCH |
| compile-gated on FTE voice support | src/sv_user.c:48 | `#ifdef FTE_PEXT2_VOICECHAT` | MATCH |
| no KTX override | ktx/src (grep) | grep "sv_voip" empty | MATCH (cross-mod) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|------------------|---------|
| 1 | Controls whether players' voice chat is recorded into the server's MVD demo | sv_user.c:2931 + 2954-2959 | `if (sv.mvdrecording && sv_voip_record.ival && ...) { ... MVD_MSG_WriteByte( svc_fte_voicechat); ... MVD_SZ_Write( ring->data, ring->datalen); }` | MATCH |
| 2 | only while a demo is being recorded | sv_user.c:2931 (`sv.mvdrecording` term) | `if (sv.mvdrecording && sv_voip_record.ival && ...)` — gate set true at sv_demo.c:1205 (`sv.mvdrecording = true;`), false at sv_demo.c:952/989 | MATCH |
| 3 | 0 = record no one's voice | sv_user.c:2931 (`sv_voip_record.ival` term) | `... && sv_voip_record.ival && ...` — ival 0 fails the gate, block never entered | MATCH |
| 4 | 1 = record everyone's voice | sv_user.c:2931 (`!(ival==2 && !spectator)` term) | `!(sv_voip_record.ival == 2 && !host_client->spectator)` — at ival==1 the inner `ival==2` is false, so term is always true; everyone passes | MATCH |
| 5 | 2 = record spectators' voice only; players' voice left out | sv_user.c:2931 | `!(sv_voip_record.ival == 2 && !host_client->spectator)` — blocks exactly when ival==2 AND not-spectator (i.e. a player); spectators pass, players excluded | MATCH |
| 6 | Default: 0 | sv_user.c:52 (registration) | `cvar_t sv_voip_record = {"sv_voip_record", "0"};` — registered default string "0", ival 0 (WI-2 verified against RegisterCvar site, not a cfg value) | MATCH |
| 7 | Set by: server config / rcon (normal writable cvar) | sv_user.c:52 vs cvar.h:60-64 | 2-field initializer `{"sv_voip_record", "0"}` => flags=0 (CVAR_NONE); no CVAR_ROM, no CVAR_SERVERINFO; ordinary settable cvar | MATCH |
| 8 | Available only on builds with FTE voice-chat support | sv_user.c:48-55 + 4917-4921 | declaration and `Cvar_Register (&sv_voip_record);` both inside `#ifdef FTE_PEXT2_VOICECHAT` — cvar absent on builds without the macro | MATCH |
| 9 | clients must support voice for their voice to exist at all | sv_user.c:4791-4795 (ingress) + 2982 (egress) | voice only enters via `case clc_voicechat: SV_VoiceReadPacket();` (FTE-gated); `if (!(client->fteprotocolextensions2 & FTE_PEXT2_VOICECHAT)) return;` — non-voice clients never produce voice packets, so nothing to record | MATCH |

**V-pass notes:** All 9 material clauses map to a located, verified enforcing line with no contradictions and no name/enum/string-only inferences. The single enforcing branch is sv_user.c:2931 inside SV_VoiceReadPacket: `if (sv.mvdrecording && sv_voip_record.ival && !(sv_voip_record.ival == 2 && !host_client->spectator))`. Truth-table walk confirms all three documented values exactly: ival 0 -> second term false -> no one; ival 1 -> third term always true -> everyone; ival 2 -> third term false only for `!host_client->spectator` (players), so spectators recorded / players excluded. The polarity of the value-2 case (the only non-obvious clause) is correct: `!(...&& !spectator)` excludes players, matching "spectators only". WI-1: exhaustive grep returned exactly 3 use-sites (decl :52, enforce :2931, register :4920) plus the adjacent declaration comment (:51 "0=noone, 1=everyone, 2=spectators only") which independently corroborates the traced code; no callee chain to follow (the gate logic lives entirely in this caller, not in MVDWrite_Begin). WI-2: default verified against the RegisterCvar-equivalent 2-field initializer (default "0"/ival 0), not a shipped cfg; access-class is plain writable (flags=0). No mod/progs override path (pr_cmds.c/pr2_cmds.c carry no sv_voip references). The supporting "clients must support voice" statement is correct and properly hedged as a precondition rather than an enforcement claim — voice ingress is FTE-extension-gated at the clc_voicechat dispatch. Description is accurate and would itself classify TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] value==2 polarity is a flavour-C trap that this row navigated correctly: the gate is `!(sv_voip_record.ival == 2 && !host_client->spectator)`, where the double-negative (`!(... && !spectator)`) means players are EXCLUDED and spectators recorded. A naive read of the enum name '2=spectators only' could just as easily have been written backwards; the proposed text matches the actual boolean. Noting only because it is the one clause where a wrong synthesis would have been invisible at output-inspection.
- [fyi/runtime-dead-suspect/vpass] The dead-code block at sv_user.c:3004-3009 (`#if 0 // qqshka: I am turned it off.`) disables the 'spectator hears tracked player's voice' relay on the OUTBOUND send path (SV_VoiceSendPacket). This is unrelated to sv_voip_record (it affects live client delivery, not demo recording) and does not touch any clause in this description, but is an off-scope disabled-feature observation worth a flag while tracing the voice subsystem.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_voip_record",
  "type": "cvar",
  "description": "Controls whether players' voice chat is recorded into the server's MVD demo (only while a demo is being recorded).\n\n0 = record no one's voice.\n1 = record everyone's voice.\n2 = record spectators' voice only (players' voice is left out of the demo).\n\nDefault: 0.\nSet by: server config / rcon. Available only on builds with FTE voice-chat support; clients must support voice for their voice to exist at all.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:2931. Registered src/sv_user.c:52 default \"0\", inside `#ifdef FTE_PEXT2_VOICECHAT` (src/sv_user.c:48). Read via .ival (=.value, shim src/sv_user.c:2844). Enforcing read-site: src/sv_user.c:2931 `if (sv.mvdrecording && sv_voip_record.ival && !(sv_voip_record.ival == 2 && !host_client->spectator))` gating the MVDWrite of svc_fte_voicechat (src/sv_user.c:2954-2959). Enum verified against the enforcing boolean rather than the registration comment (TRAP 1): ival=0 => `&& 0` false => not recorded (no one); ival=1 => `1 && !(1==2 && ...)` = `1 && !(false)` true => recorded for everyone; ival=2 with a non-spectator sender => `2 && !(2==2 && !false)` = `2 && !(true)` false => that player's voice excluded; ival=2 with a spectator sender => `2 && !(2==2 && !true)` = `2 && !(false)` true => recorded. Hence 2 = spectators-only. Also requires sv.mvdrecording (a demo actually in progress) -- captured as the \"only while recording\" clause. The dem_all-vs-dem_multiple branch (src/sv_user.c:2934) decides broadcast vs targeted within the demo and additionally consults sv_spectalk; not part of this enum. CROSS-MOD: no KTX read of sv_voip_record (engine-owned). The registration comment src/sv_user.c:51 (\"0=noone,1=everyone,2=spectators only\") is a dev-WHY locator only; enum affirmed at the enforcing line.",
  "description_proposed": null
}
```
