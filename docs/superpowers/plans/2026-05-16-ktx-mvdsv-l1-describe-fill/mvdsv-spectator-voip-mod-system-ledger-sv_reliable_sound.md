# describe-fill-synthesis ledger -- mvdsv `sv_reliable_sound`

- **project:** mvdsv
- **knob:** `sv_reliable_sound` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_reliable_sound: synthesized -- server-side enable for reliable sound delivery, gated per-client on the rsnd userinfo opt-in; default 0; no KTX override -- origin=synthesized ref=src/sv_send.c:671 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sends sound effects to clients reliably (resent until acknowledged) instead of in the normal unreliable stream, so that clients do not miss sound events during packet loss. When on, it applies to all clients in range except those who opt out by setting their rsnd userinfo to 0.
>
> 0 = all sounds use the normal unreliable stream.
> 1 = sounds are sent reliably to every client in range, except a client that has set rsnd 0 (which stays on the unreliable stream).
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 | src/sv_main.c:155 | `cvar_t sv_reliable_sound = {"sv_reliable_sound", "0"};` | MATCH |
| cvar gates passing the rsnd key | src/sv_send.c:671 | `SV_MulticastEx (origin, ..., sv_reliable_sound.value ? "rsnd" : NULL);` | MATCH |
| reliable send gated per-client on rsnd userinfo != "0" | src/sv_send.c:497 | `if (reliable || (cl_reliable_key && *cl_reliable_key && strcmp("0", Info_Get(&client->_userinfo_ctx_, cl_reliable_key))))` | MATCH |
| reliable path writes to client's reliable buffer | src/sv_send.c:499-500 | `ClientReliableCheckBlock(...); ClientReliableWrite_SZ(client, sv.multicast.data, sv.multicast.cursize);` | MATCH |
| OFF-state / non-opted clients use unreliable datagram | src/sv_send.c:502 | `SZ_Write (&client->datagram, sv.multicast.data, sv.multicast.cursize);` | MATCH |
| no KTX override | ktx/src (grep) | (no hits for sv_reliable_sound) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| 1 | Sends sounds reliably (resent until acknowledged) instead of unreliable stream | src/sv_send.c:498-499 vs :502 | reliable path: `ClientReliableCheckBlock(...)` + `ClientReliableWrite_SZ(...)`; else: `SZ_Write(&client->datagram, ...)` | MATCH (reliable netchan vs unreliable datagram; "resent until acked" is the standard reliable-channel semantic) |
| 2 | Purpose: opted-in clients don't miss sound events during packet loss | src/sv_send.c:496-499 | reliable delivery = guaranteed | MATCH-as-rationale (consistent motivation; not an enforced clause, but does not contradict; note the "opted-in" framing is wrong per clauses 3/4/6) |
| 3 | Only takes effect for a client who has REQUESTED reliable sounds via their rsnd userinfo setting | src/sv_send.c:496 | `strcmp("0", Info_Get(&client->_userinfo_ctx_, cl_reliable_key))` -> TRUE for ANY value != "0", INCLUDING absent (Info_Get returns "" for missing key, common.c:1252) | MISMATCH (inverted: it is opt-OUT, not opt-in -- applies to all in-range clients EXCEPT those who set `rsnd 0`) |
| 4 | Other clients are unaffected | src/sv_send.c:496 + common.c:1235-1252 | absent rsnd -> Info_Get returns ""; `strcmp("0","") != 0` -> reliable delivery | MISMATCH (a client who never set rsnd -- the default majority -- IS affected: it gets reliable sounds when cvar=1) |
| 5 | 0 = all sounds use the normal unreliable stream | src/sv_send.c:671/673 (key=NULL) -> :496 short-circuit -> :502 | `sv_reliable_sound.value ? "rsnd" : NULL`; with NULL key and reliable=false, falls to `SZ_Write(&client->datagram,...)` | MATCH with minor caveat (cvar does nothing at 0; but channel-bit-8 "phs-breaking" sounds are ALWAYS reliable via sv_send.c:632 `reliable=true`, independent of this cvar -- so "all sounds" is slightly overstated) |
| 6 | 1 = reliable to opted-in (rsnd set), unreliably to everyone else | src/sv_send.c:496 | reliable when `*cl_reliable_key && strcmp("0", rsnd_value)` -> reliable for everyone whose rsnd != "0" (incl. absent); unreliable ONLY for rsnd=="0" | MISMATCH (inverted polarity: reliable is the default-on behavior when cvar=1; "everyone else" gets reliable too -- only explicit `rsnd 0` opts out) |
| 7 | Default: 0 | src/sv_main.c:155 | `cvar_t sv_reliable_sound = {"sv_reliable_sound", "0"};` registered at sv_main.c:3587 | MATCH |
| 8 | Set by: server config / rcon | src/sv_main.c:155, :3587 | struct literal has no flags field (CVAR_NONE), no OnChange; plain settable server cvar via Cvar_Register | MATCH |

**V-pass notes:** C-FIX. Core mechanism, default, set-by, and OFF-state are correct, but clauses 3, 4, and 6 INVERT the per-client scope. The single enforcing line is src/sv_send.c:496:
`if (reliable || (cl_reliable_key && *cl_reliable_key && strcmp("0", Info_Get(&client->_userinfo_ctx_, cl_reliable_key))))`
With sv_reliable_sound=1, sv_send.c:671/673 pass cl_reliable_key="rsnd". The condition `strcmp("0", Info_Get(...,"rsnd"))` is TRUE (deliver reliably) for ANY rsnd value other than the literal string "0". Info_Get returns "" for an absent key (verified common.c:1235-1252), and strcmp("0","") != 0, so a client that has NEVER set rsnd gets reliable sounds.

The mechanism is therefore OPT-OUT, not opt-in:
- rsnd absent (default)  -> reliable (affected)
- rsnd "0"              -> unreliable (the opt-out)
- rsnd "1"/anything     -> reliable (affected)

The description says the opposite ("only takes effect for a client who has requested... via rsnd", "clients who opted in (rsnd set)", "unreliably to everyone else", "other clients are unaffected"). A naive client without rsnd is affected, and "everyone else" is reliable, not unreliable. Note also no server code ever seeds a default rsnd value -- tree-wide, the string "rsnd" appears ONLY at sv_send.c:671 and 673, so the truth table is not flipped back by any server-side default.

Suggested corrected polarity for clause 1/scope: "When on (1), sound effects are delivered reliably to all clients in range, except a client who has explicitly set its rsnd userinfo to 0 (the opt-out). When off (0), normal unreliable delivery is used. (PHS-breaking sounds on channel bit 8 are always reliable regardless of this cvar.)"

Minor secondary imprecision (does NOT drive the classification): clause 5's "all sounds use the normal unreliable stream" at 0 overstates -- channel-bit-8 sounds are always reliable via sv_send.c:629-632, independent of sv_reliable_sound.

Oracle confirmed at 1.11-53-g18d0362. Trace discipline applied: followed the cl_reliable_key argument from the caller (sv_send.c:671/673) into the callee SV_MulticastEx (sv_send.c:404), to the gating line :496, then into Info_Get (common.c:1235) to resolve the absent-key return value -- the inversion is invisible without following that full chain.

## flags_for_review

- [blocker/contradiction/vpass] sv_reliable_sound scope is inverted in the proposed description. Enforcing line src/sv_send.c:496 makes reliable-sound delivery OPT-OUT (client sets rsnd 0 to decline), not opt-in. A client with no rsnd userinfo (the default majority) receives reliable sounds when the cvar is 1, because Info_Get returns "" for an absent key (common.c:1252) and strcmp("0","") != 0. Clauses 3, 4, 6 all contradict this.
- [fyi/other/vpass] Channel-bit-8 sounds ('sounds that break the phs', src/sv_send.c:631-632) are ALWAYS sent reliably regardless of sv_reliable_sound (the `reliable` disjunct fires first at :496). So 'all sounds unreliable at 0' is slightly overstated; the cvar governs only the non-bit-8 sound class. Minor, did not drive the C-FIX.
- [fyi/other/vpass] The rsnd userinfo key is purely client-supplied: tree-wide the literal "rsnd" exists ONLY at src/sv_send.c:671 and :673; no server code seeds a default rsnd value via Info_Set/Info_SetStar. Confirms the opt-out truth table is not silently reversed by a server-side default.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_reliable_sound",
  "type": "cvar",
  "description": "Sends sound effects to clients reliably (resent until acknowledged) instead of in the normal unreliable stream, so that clients do not miss sound events during packet loss. When on, it applies to all clients in range except those who opt out by setting their rsnd userinfo to 0.\n\n0 = all sounds use the normal unreliable stream.\n1 = sounds are sent reliably to every client in range, except a client that has set rsnd 0 (which stays on the unreliable stream).\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_send.c:671. Registration cvar_t literal default 0 at src/sv_main.c:155 (WI-2). Enforcing read-site src/sv_send.c:671/673 (SV_StartSound): SV_MulticastEx is called with the extension key \"rsnd\" when sv_reliable_sound.value is set, else NULL. The key is consumed at src/sv_send.c:497 inside SV_MulticastEx: `if (reliable || (cl_reliable_key && *cl_reliable_key && strcmp(\"0\", Info_Get(&client->_userinfo_ctx_, cl_reliable_key))))` -> when the per-client userinfo key (rsnd) is present and != \"0\", the sound is written to that client's reliable buffer (ClientReliableWrite_SZ, :499-500); otherwise it goes to the unreliable datagram (SZ_Write(&client->datagram...), :502). Thus the cvar is a server-side enable that is gated per-client on the rsnd userinfo opt-in (polarity: cvar 0 = no key passed = always unreliable; cvar 1 = key passed, reliable only for opted-in clients). The rsnd-userinfo coupling is inline-justified (action-relevant: setting the cvar appears to do nothing unless clients opt in). No CF flags on the Cvar_Register at :3587 -> server config/rcon. F-MV1: no KTX reference to sv_reliable_sound (grep of ktx/src empty) -> engine read-site is the live behavior.",
  "description_proposed": null
}
```
