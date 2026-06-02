# describe-fill-synthesis ledger -- mvdsv `sv_voip_echo`

- **project:** mvdsv
- **knob:** `sv_voip_echo` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_voip_echo: synthesized -- echoes a sender's own voice back to them; 1=echo,0=no self-echo; engine-owned, FTE-pext compile-gated -- origin=synthesized ref=src/sv_user.c:3014 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether a player's own voice is sent back to them. Normally a speaker does not hear themselves; turning this on echoes each sender's voice back to that sender, which is mainly useful for testing that voice chat works.
>
> 1 = echo a sender's voice back to themselves.
> 0 = do not echo voice back to the sender.
>
> Default: 0.
> Set by: server config / rcon. Available only on builds with FTE voice-chat support.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 = sender does NOT receive own voice | src/sv_user.c:3014 | `if (ring->sender == clno && !sv_voip_echo.ival) send = false;` | MATCH |
| 1 = sender DOES receive own voice (no self-suppress) | src/sv_user.c:3014 | nonzero ival => condition false => `send` not cleared here | MATCH |
| clno is the recipient | src/sv_user.c:2980 | `clno = client - svs.clients;` | MATCH |
| ring->sender is the speaker | src/sv_user.c:2883 | `ring->sender = host_client - svs.clients;` | MATCH |
| .ival is .value | src/sv_user.c:2844 | `#define ival value` | MATCH |
| Default 0 | src/sv_user.c:54 | `cvar_t sv_voip_echo = {"sv_voip_echo", "0"};` | MATCH |
| compile-gated on FTE voice support | src/sv_user.c:48 | `#ifdef FTE_PEXT2_VOICECHAT` | MATCH |
| no KTX override | ktx/src (grep) | grep "sv_voip" empty | MATCH (cross-mod) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Feature identity: "whether a player's own voice is sent back to them" | src/sv_user.c:3014 (+ comment :53) | `if (ring->sender == clno && !sv_voip_echo.ival)  send = false;`  /// :53 `// Echo voice packets back to their sender, a debug/test setting.` | MATCH |
| 2 | OFF/default: "Normally a speaker does not hear themselves" | src/sv_user.c:3014 (guard fires when ival==0) + receiver loop :2894-2929 | At default 0, `!sv_voip_echo.ival` is TRUE so the sender's own queued packet is dropped (`send=false`). The receiver-bitmask loop sets the sender's own slot bit (`ring->receiver[j>>3] |= 1<<(j&3)`), so the sender WOULD otherwise be a recipient; this guard is what removes them. | MATCH |
| 3 | ON polarity: "turning this on echoes each sender's voice back to that sender" | src/sv_user.c:3014 | When echo set (ival nonzero), `!sv_voip_echo.ival` is FALSE, the `send=false` self-suppression is skipped, and the already-set receiver bit delivers the packet back to the sender. | MATCH |
| 4 | Purpose: "mainly useful for testing that voice chat works" | src/sv_user.c:53 | `// Echo voice packets back to their sender, a debug/test setting.` | MATCH |
| 5 | "1 = echo a sender's voice back to themselves" | src/sv_user.c:3014 | Test is `!sv_voip_echo.ival`; `#define ival value` (:2844) and `value` is `float` (cvar.h:72) -> truthy test, any nonzero enables echo. 1 is the canonical enable; standard binary-cvar presentation. | MATCH |
| 6 | "0 = do not echo voice back to the sender" | src/sv_user.c:3014 | `ival==0` -> `!ival` TRUE -> `send=false` for self-packet. | MATCH |
| 7 | "Default: 0" | src/sv_user.c:54 (+ register :4919) | `cvar_t sv_voip_echo = {"sv_voip_echo", "0"};` registered via plain `Cvar_Register(&sv_voip_echo)` (no flags arg). Registered default = "0". | MATCH |
| 8 | "Set by: server config / rcon" (runtime-settable) | src/sv_user.c:54 + src/cvar.c:240-270 | Plain `cvar_t` initializer leaves `flags=0` (no `CVAR_ROM`); `Cvar_Register` uses `Cvar_SetROM` only to seed the initial value, does not set the ROM flag. Normal read/write cvar -> settable via config/console/rcon. | MATCH |
| 9 | "Available only on builds with FTE voice-chat support" | src/sv_user.c:48-55, 2828 / 3105, 4917-4921, 4791-4795 | Cvar decl+register, the enforcing function `SV_VoiceSendPacket` (containing :3014), and the `SV_VoiceReadPacket` dispatch are ALL inside `#ifdef FTE_PEXT2_VOICECHAT`. Absent that define, the cvar does not exist and no echo path compiles. | MATCH |

**V-pass notes:** TRACED-CLEAN. Every material clause (feature identity, OFF/default behavior, ON polarity, purpose, both value lines, default, settability, build-scope) maps to a located, verified enforcing line, corroborated by adjacent registration comment src/sv_user.c:53 ("Echo voice packets back to their sender, a debug/test setting.").

Single enforcing site: src/sv_user.c:3014 inside SV_VoiceSendPacket -- `if (ring->sender == clno && !sv_voip_echo.ival) send = false;`. Polarity verified end-to-end: the receiver-bitmask construction loop (:2894-2929) does NOT exclude the sender, so a sender is by default a recipient of their own broadcast/team packet; the :3014 guard is exactly what suppresses that self-delivery when echo is OFF (default 0). ON (nonzero) skips the guard -> self-echo. No inversion.

Default verified at the REGISTERED site (WI-2): src/sv_user.c:54 `{"sv_voip_echo", "0"}` via plain Cvar_Register (no flags) = default 0. Settability verified: zero-initialized flags, no CVAR_ROM; Cvar_Register's internal Cvar_SetROM (cvar.c:269) only seeds the value and does not set the ROM flag. Build-scope verified: the entire VOIP subsystem (decl, register, enforce fn, read-packet dispatch) is wrapped in #ifdef FTE_PEXT2_VOICECHAT.

Minor (acceptable, not flagged): the test is truthy (`!ival`, float-backed) rather than strict ==1, so any nonzero value enables echo; the description's "1 = ..." binary framing is the conventional and accurate presentation for a boolean cvar. No flavour-C clause: the purpose/identity language is backed by the registration comment, not name-only inference.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_voip_echo",
  "type": "cvar",
  "description": "Controls whether a player's own voice is sent back to them. Normally a speaker does not hear themselves; turning this on echoes each sender's voice back to that sender, which is mainly useful for testing that voice chat works.\n\n1 = echo a sender's voice back to themselves.\n0 = do not echo voice back to the sender.\n\nDefault: 0.\nSet by: server config / rcon. Available only on builds with FTE voice-chat support.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:3014. Registered src/sv_user.c:54 default \"0\", inside `#ifdef FTE_PEXT2_VOICECHAT` (src/sv_user.c:48). Read via .ival (=.value, shim src/sv_user.c:2844). Enforcing read-site: SV_VoiceSendPacket src/sv_user.c:3014 `if (ring->sender == clno && !sv_voip_echo.ival) send = false;` -- clno is the recipient being filled (src/sv_user.c:2980 `clno = client - svs.clients;`), ring->sender is who spoke; so when the recipient IS the sender and echo is OFF, the packet is not sent back. When echo is ON (ival nonzero), the `send = false` is skipped and the sender receives their own voice (subject to the other block-conditions: voice_mute src/sv_user.c:3011, download src/sv_user.c:3018, recipient-set membership src/sv_user.c:3000). Polarity confirmed both directions at the single enforcing line. The registration comment src/sv_user.c:53 calls it \"a debug/test setting\" -- I keep the user-facing 'mainly useful for testing' framing (observable purpose) but not as a hard claim; it is dev-WHY corroboration. CROSS-MOD: no KTX read (engine-owned). No recommended value.",
  "description_proposed": null
}
```
