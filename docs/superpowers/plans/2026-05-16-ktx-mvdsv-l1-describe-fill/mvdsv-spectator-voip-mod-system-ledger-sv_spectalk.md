# describe-fill-synthesis ledger -- mvdsv `sv_spectalk`

- **project:** mvdsv
- **knob:** `sv_spectalk` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_spectalk: synthesized -- engine voice+print spec-visibility gate (1=all,0=specs-only); text-say mod-owned, KTX drives via k_spectalk -- origin=synthesized ref=src/sv_user.c:2899 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether spectators' chat and voice can be heard by players, or only by other spectators.
>
> 1 = spectators can talk to everyone (players and spectators).
> 0 = spectators are restricted to spectators only; players neither see their chat nor hear their voice.
>
> Default: 1.
> Set by: server config / rcon. On a KTX server the mod manages this setting (driven by k_spectalk) and overwrites it at match start, so set k_spectalk rather than sv_spectalk directly.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 = spectator voice only to spectators | src/sv_user.c:2899 | `if (host_client->spectator && !sv_spectalk.ival)` then `if (!cl->spectator) continue;` | MATCH |
| 0 = spectator say not seen by players | src/sv_user.c:1916 | `if (!client->spectator && !(int)sv_spectalk.value) continue; // off - specs can't talk to players.` | MATCH |
| 1 = spectator reaches everyone (broadcast record) | src/sv_user.c:1929 | `if (!team && ((sv_client->spectator && (int)sv_spectalk.value) || !sv_client->spectator))` -> dem_all | MATCH |
| [SPEC] prefix when off/team | src/sv_user.c:1839 | `if (sv_client->spectator && (!(int)sv_spectalk.value \|\| team))` | MATCH |
| Default 1 | src/sv_user.c:32 | `cvar_t sv_spectalk = {"sv_spectalk", "1"};` | MATCH |
| text say is mod-owned (engine path is fallback) | src/sv_user.c:1832,1836 | `j = PR_ClientSay(team, p);` / `if (j) return; // say was handled by mod.` | MATCH |
| KTX owns spec text gate via same cvar | ktx g_cmd.c:500 | `if ((self->ct == ctSpec) && !sv_spectalk) { if (client->ct != ctSpec) continue; }` | MATCH (cross-mod) |
| KTX writes sv_spectalk from k_spectalk | ktx match.c:1304 | `cvar_fset("sv_spectalk", k_spectalk);` | MATCH (cross-mod) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Polarity "1 = spectators can talk to everyone (players and spectators)" -- CHAT | src/sv_user.c:1916-1917 | `if (!client->spectator && !(int)sv_spectalk.value) continue; // off - specs can't talk to players.` (block only fires when sv_spectalk==0; at ==1 the gate is false so spec msg reaches players; specs always receive it) | MATCH |
| 2 | OFF-state "0 = spectators restricted to spectators only; players don't see chat" -- CHAT | src/sv_user.c:1913-1917 | `if (sv_client->spectator) { // check for spectalk off. if (!client->spectator && !(int)sv_spectalk.value) continue;` adjacent comment "off - specs can't talk to players." Other specs still receive (guard is `!client->spectator`). | MATCH |
| 3 | Spec [SPEC] prefix + MVD routing consistent with polarity | src/sv_user.c:1839, 1929 | `if (sv_client->spectator && (!(int)sv_spectalk.value || team))` -> `[SPEC]` prefix; `if (!team && ((sv_client->spectator && (int)sv_spectalk.value) || !sv_client->spectator))` writes dem_all when spectalk on | MATCH (supporting) |
| 4 | OFF-state "players ... neither hear their voice" + polarity -- VOICE | src/sv_user.c:2898-2901 | `/*spectators may only talk to spectators*/ if (host_client->spectator && !sv_spectalk.ival) if (!cl->spectator) continue;` (`#define ival value` at :2844, same float field) | MATCH |
| 4b | Voice path is actually compiled (not dead) | src/CMakeLists.txt:173; guard src/sv_user.c:2828 `#ifdef FTE_PEXT2_VOICECHAT` | `target_compile_definitions(${PROJECT_NAME} PRIVATE FTE_PEXT2_VOICECHAT)` | MATCH (live in dev-head build) |
| 5 | "Default: 1." | src/sv_user.c:32 + src/cvar.c:267-269 | `cvar_t sv_spectalk = {"sv_spectalk", "1"};` ; `value = variable->string; ... Cvar_SetROM (variable, value);` (struct "1" preserved as registered default) | MATCH |
| 6 | "Set by: server config / rcon" (runtime-settable, no ROM) | src/sv_user.c:32 (flags omitted => CVAR_NONE, no CVAR_ROM); no MVDSV-internal write found | `{"sv_spectalk", "1"}` -- 2-field init, no CVAR_ROM; grep: zero `Cvar_Set*("sv_spectalk")` in mvdsv/src | MATCH |
| 7 | KTX "mod manages this (driven by k_spectalk) and overwrites it at match start" | ktx/src/match.c:1303-1304 (match-start "spec silence" block, just after "The match has begun!" :1296) | `int k_spectalk = (coop ? 1 : bound(0, cvar("k_spectalk"), 1)); cvar_fset("sv_spectalk", k_spectalk);` | MATCH |
| 7b | KTX restores sv_spectalk at match end (corroborates "mod manages") | ktx/src/match.c:316; also admin toggle ktx/src/commands.c:3268 | `cvar_fset("sv_spectalk", 1);` (end) ; `cvar_fset("sv_spectalk", k_spectalk);` (spectalk cmd) | MATCH |
| 8 | KTX engine reads k_spectalk DIRECTLY for an UNRELATED broadcast feature (not sv_spectalk) | src/sv_broadcast.c:620-626 | `spectalk = strstr(Cvar_String("qwm_name"), "KTX") && Cvar_Value("k_spectalk");` ... `if (client->state != cs_spawned || (started && !client->spectator && !spectalk)) continue;` | MATCH (does not contradict desc; desc does not claim this) |

**V-pass notes:** VERDICT: TRACED-CLEAN. Every material clause maps to a located, verified enforcing line incl. adjacent comments. No flavour-C defect, no metadata error, no contradiction.

Two-channel structure verified independently:
- CHAT gate lives in SV_Say (sv_user.c), read as `sv_spectalk.value`. Non-team spec->player message is dropped when sv_spectalk==0 (sv_user.c:1916-1917, comment "off - specs can't talk to players"); reaches everyone when ==1; other spectators always receive. Polarity and OFF-state both correct.
- VOICE gate lives in SV_VoiceReadPacket (sv_user.c, FTE VoIP), read as `sv_spectalk.ival`. `#define ival value` (sv_user.c:2844) makes .ival == the same float field -- NOT a separate cvar, NOT a bug. Spec voice withheld from non-spectators when sv_spectalk==0 (sv_user.c:2899-2901, comment "spectators may only talk to spectators"). The description tying chat AND voice together is substantiated by TWO distinct enforcing read-sites.

Dead-code check on the voice clause (the one real risk for a WI2/over-claim): the voice path is `#ifdef FTE_PEXT2_VOICECHAT`, and that macro is NEVER `#define`d in source -- but CMakeLists.txt:173 compiles it in unconditionally for the default build. So the voice gating is live in dev-head 1.11-53-g18d0362, and the description's voice claim is not asserting dead behavior. (A non-FTE-voice client simply can't send/receive engine VoIP at all, so "voice can be heard by players" is correctly scoped to engine VoIP, the only voice MVDSV mediates.)

Default: struct init `{"sv_spectalk","1"}` (sv_user.c:32); Cvar_Register (cvar.c:240-270) preserves variable->string and sets via Cvar_SetROM, so registered default == "1". WI-2 satisfied: the default is the registered struct value, not a shipped-cfg artifact.

Settability ("Set by: server config / rcon"): flags field omitted in the 2-field struct init => CVAR_NONE (no CVAR_ROM), and an exhaustive grep finds ZERO `Cvar_Set*("sv_spectalk")` inside mvdsv/src -- MVDSV only READS it. Runtime-settable claim holds.

KTX cross-mod claim (the load-bearing external assertion) verified directly against ktx/src @ HEAD: match.c:1303-1304 is the match-START "spec silence" block (textually adjacent to the "The match has begun!" broadcast) that writes `cvar_fset("sv_spectalk", k_spectalk)`; match.c:316 restores it to 1 at match end; commands.c:3268 is the admin `spectalk` toggle. So "the mod manages this setting (driven by k_spectalk) and overwrites it at match start" is accurate, and the operator guidance "set k_spectalk rather than sv_spectalk directly" is correct -- a direct sv_spectalk write would be clobbered at the next match start.

Disambiguation that did NOT bite the description: sv_broadcast.c:622 reads `k_spectalk` DIRECTLY (Cvar_Value("k_spectalk")), gated on `qwm_name` containing "KTX" -- this is a SEPARATE feature (lets SVC_Broadcast connectionless prac-messages reach players after game start) and does NOT touch sv_spectalk. The description does not mention or conflate it, so no error; noted as context only.

## flags_for_review

- [review/cross-mod-override/synthesis] sv_spectalk is cross-mod coupled with KTX in two ways the L1 row cannot fully express: (1) KTX's ClientSay (g_cmd.c:287, returns true) owns the TEXT say path and re-enforces the spec->player gate itself (g_cmd.c:455,500), so the engine's own text-say enforcement (sv_user.c:1839/1916/1929) is a fallback only on a non-KTX server; (2) KTX overwrites sv_spectalk from k_spectalk at match start (match.c:1304, commands.c:3268) -- the admin-facing knob on a KTX server is k_spectalk, not sv_spectalk. The engine-owned voice relay (sv_user.c:2899) and voice MVD-record (sv_user.c:2934) paths are unaffected by KTX. This is a candidate for an L3 concept note tying sv_spectalk <-> k_spectalk <-> k_keepspectalkindemos.
- [fyi/hidden-family/synthesis] Hidden sibling not in this set: sv_sayteam_to_spec (registered sv_user.c:33, default 1) is read at the enforcing site sv_user.c:1896 in the same chat dispatch and governs whether players' say_team reaches spectators (with spec_track / team checks). It pairs tightly with sv_spectalk and KTX also reads it (g_cmd.c:297). Flagging in case it is bucketed elsewhere so the pair is documented consistently.
- [fyi/runtime-dead-suspect/vpass] Voice-chat gating (sv_user.c SV_VoiceReadPacket, incl. the sv_spectalk read at :2899) is guarded by `#ifdef FTE_PEXT2_VOICECHAT`, but that macro has NO `#define` anywhere in src/ -- it is supplied ONLY by CMakeLists.txt:173 (`target_compile_definitions(... PRIVATE FTE_PEXT2_VOICECHAT)`). The default CMake build compiles it, so the voice path is LIVE in dev-head. Flagging because liveness here depends entirely on the build system, not source: any alternate/legacy build path (e.g. a hand Makefile) that omits this -D would silently drop ALL engine VoIP and the sv_spectalk voice gate with it. Not a defect in this description; a build-conditionality fact worth knowing for any future 'is this voice code reachable' question.
- [fyi/cross-mod-override/vpass] sv_broadcast.c:620-626 (SVC_Broadcast) reads KTX's `k_spectalk` DIRECTLY from the engine -- `spectalk = strstr(Cvar_String("qwm_name"), "KTX") && Cvar_Value("k_spectalk")` -- to let connectionless broadcast messages reach players after game start. This is a second, independent consumer of the k_spectalk *value* (string-gated on the mod being KTX), distinct from the sv_spectalk machinery. The sv_spectalk description correctly does not conflate the two; flagging for whole-fleet awareness because k_spectalk now has BOTH a KTX-side meaning (drives sv_spectalk) and an MVDSV-engine-side meaning (broadcast visibility) -- a k_spectalk knob description must cover both surfaces.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_spectalk",
  "type": "cvar",
  "description": "Controls whether spectators' chat and voice can be heard by players, or only by other spectators.\n\n1 = spectators can talk to everyone (players and spectators).\n0 = spectators are restricted to spectators only; players neither see their chat nor hear their voice.\n\nDefault: 1.\nSet by: server config / rcon. On a KTX server the mod manages this setting (driven by k_spectalk) and overwrites it at match start, so set k_spectalk rather than sv_spectalk directly.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:2899. Registered src/sv_user.c:32 default \"1\". Enforcing read-sites: VOICE relay src/sv_user.c:2899 `if (host_client->spectator && !sv_spectalk.ival) if (!cl->spectator) continue;` -- when OFF a spectator's voice packet is only delivered to other spectators (this path is the engine's own, no KTX involvement). PRINT/text gate src/sv_user.c:1916 `if (!client->spectator && !(int)sv_spectalk.value) continue;` -- when OFF, a spectator's say message is not sent to non-spectator clients; src/sv_user.c:1839 prefixes [SPEC] when off-or-team; src/sv_user.c:1929 / 2934 select dem_all (broadcast) vs dem_multiple for the MVD record stream when a spectator talks AND spectalk is on. Polarity confirmed both directions at each line: ival nonzero => spectators reach players; ival 0 => spectators reach only spectators. CROSS-MOD (F-MV1, distinguish engine-own from mod-owned per the say short-circuit): the engine's TEXT say path is a FALLBACK -- src/sv_user.c:1832 `j = PR_ClientSay(team, p);` then src/sv_user.c:1836-1837 `if (j) return; // say was handled by mod`. KTX's ClientSay (ktx g_cmd.c:287) returns true for handled messages and re-implements the spectator-to-player text gate itself reading the same cvar (ktx g_cmd.c:296 `int sv_spectalk = cvar(\"sv_spectalk\");`, enforced ktx g_cmd.c:455 and ktx g_cmd.c:500 `if ((self->ct == ctSpec) && !sv_spectalk) { if (client->ct != ctSpec) continue; }`). KTX also WRITES sv_spectalk from its own k_spectalk cvar at match start (ktx match.c:1304 `cvar_fset(\"sv_spectalk\", k_spectalk);`, also ktx commands.c:3268), so on a live KTX server the admin-controlled knob is k_spectalk and the MVDSV default of 1 is overwritten. The VOICE and MVD-record paths remain engine-owned (KTX has zero sv_voip/voice-relay reads). Description states the engine-observable behavior (voice + print) and notes the KTX management because it changes the admin's action (set k_spectalk). All cites engine-side per source-truth dichotomy; KTX cites are the cross-mod corroboration.",
  "description_proposed": null
}
```
