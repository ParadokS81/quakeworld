# describe-fill-synthesis ledger -- mvdsv `sv_maxrate`

- **project:** mvdsv
- **knob:** `sv_maxrate` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_maxrate: synthesized -- per-client send-rate ceiling in bytes/sec (download yields to sv_maxdownloadrate when set), 0=off; KTX re-clamps the value 0..500000 -- origin=synthesized ref=src/sv_main.c:3193 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Caps the maximum network send rate, in bytes per second, the server will use for any single client, regardless of the rate that client requested. A client asking for a higher rate is clamped down to this limit. During a file download the limit still applies unless a separate download-rate cap (sv_maxdownloadrate) is set, in which case that one takes over for the download.
>
> Unit: bytes per second.
> 0 = no server-imposed cap (each client's own requested rate is used).
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| caps per-client send rate (general traffic) | src/sv_main.c:3193-3194 | `if ((int)sv_maxrate.value && rate > (int) sv_maxrate.value) rate = (int)sv_maxrate.value;` | MATCH |
| during download applies only if sv_maxdownloadrate unset | src/sv_main.c:3186-3187 | `if (!(int)sv_maxdownloadrate.value && (int)sv_maxrate.value && rate > ...) rate = ...` | MATCH |
| 0 = no cap | src/sv_main.c:3193 | `(int)sv_maxrate.value &&` short-circuit | MATCH |
| unit bytes/sec (floor/ceiling context) | src/sv_main.c:3196-3200 | `if (rate < 500) rate = 500; ... rate > 100000 * MAX_DUPLICATE_PACKETS` | MATCH |
| default 0 | src/sv_main.c:139 | `cvar_t sv_maxrate = {"sv_maxrate", "0"}` | MATCH |
| re-applied to clients on change | src/sv_main.c:3248-3256 | `// check sv_maxrate` ... `old_maxrate = (int)sv_maxrate.value;` | MATCH |
| KTX writes/clamps the value (not the enforcement) | ktx/src/world.c:1560,1749-1751 | `bound(0, cvar("sv_maxrate"), 500000)` ; `cvar_fset("sv_maxrate", k_maxr)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Caps the MAXIMUM send rate the server uses for a single client (polarity = upper cap, clamps DOWN) | sv_main.c:3193-3194 | `if ((int)sv_maxrate.value && rate > (int) sv_maxrate.value)` / `rate = (int)sv_maxrate.value;` | MATCH |
| 2 | Per single client (each client's netchan.rate) | sv_main.c:3258-3264 | `for (i=0, cl = svs.clients ; i<MAX_CLIENTS ; ...)` / `cl->netchan.rate = 1.0 / SV_BoundRate (...)` | MATCH |
| 3 | "regardless of the rate that client requested" / "A client asking for a higher rate is clamped down" -- requested rate is the `rate` arg from userinfo "rate"/"drate" or `rate` cmd; clamped to sv_maxrate | sv_main.c:3193-3194 + callers sv_user.c:2185, sv_main.c:3264/3838, sv_user.c:4972 | `rate > (int) sv_maxrate.value) rate = (int)sv_maxrate.value;` ; caller `SV_BoundRate (... Q_atoi(*val ? val : "99999"))` | MATCH |
| 4 | Unit = bytes per second | net_chan.c:316 (consumer) + sv_main.c:3264 (1/rate stored) | `chan->cleartime = curtime + send.cursize * i * chan->rate;` (cursize=bytes, chan->rate=1/rate_value => rate_value is bytes/sec) | MATCH |
| 5 | During download the cap STILL applies UNLESS sv_maxdownloadrate is set | sv_main.c:3186-3187 | `if (!(int)sv_maxdownloadrate.value && (int)sv_maxrate.value && rate > (int)sv_maxrate.value)` / `rate = (int)sv_maxrate.value;` | MATCH |
| 6 | When sv_maxdownloadrate IS set, it "takes over for the download" (sv_maxrate skipped) | sv_main.c:3189-3190 (+ guard at 3186 `!sv_maxdownloadrate.value`) | `if (sv_maxdownloadrate.value && rate > sv_maxdownloadrate.value)` / `rate = (int)sv_maxdownloadrate.value;` | MATCH |
| 7 | OFF-state: 0 = no server-imposed cap, client's own requested rate used | sv_main.c:3193 (condition gated on nonzero) | `if ((int)sv_maxrate.value && ...)` -- when .value==0 the && short-circuits, no sv_maxrate clamp | MATCH |
| 8 | Default: 0 | sv_main.c:139 (struct literal) -> cvar.c:267-269 (Cvar_Register seeds from .string) | `cvar_t sv_maxrate = {"sv_maxrate", "0"};` ; `value = variable->string; ... Cvar_SetROM (variable, value);` | MATCH |
| 9 | Set by: server config / rcon (normal settable, not read-only) | sv_main.c:139 (flags field absent => 0, no CVAR_ROM) + cvar.c (Cvar_SetROM restores saved_flags=0) | `{"sv_maxrate", "0"}` (no CVAR_ROM); `var->flags = saved_flags;` | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. All sv_maxrate use-sites live in sv_main.c (registration line 139 + Cvar_Register line 3561; enforcing logic in SV_BoundRate lines 3180-3203; periodic re-clamp in SV_CheckVars lines 3248-3266). The single enforcing function is SV_BoundRate(qbool dl, int rate); I followed the call chain into it from every one of its 5 call-sites (sv_main.c:3264, 3838; sv_user.c:1570, 2185, 4972) -- EVERY netchan.rate assignment routes through it, no bypass path, and there is no competing rate-clamp cvar (no sv_minrate / sv_clientrate). All 9 clauses map to located, verified enforcing lines including adjacent code; none is name/string/comment inference. Polarity, per-client scope, requested-rate clamp, bytes/sec unit, download interaction (both directions), OFF-state, registered default 0 (WI-2: struct literal "0", no shipped-cfg override, no OnChange), and settability (no CVAR_ROM -- Cvar_SetROM restores saved_flags=0) all confirmed. Classification TRACED-CLEAN. One non-defect completeness nuance recorded in flags (universal 500-floor / 300000-ceiling / 0->2500 substitution apply regardless of sv_maxrate); it does not contradict any clause because the description scopes its OFF-state to "server-imposed cap" via this specific cvar.

## flags_for_review

- [fyi/cross-mod-override/synthesis] KTX writes sv_maxrate back every world-rules refresh: ktx/src/world.c:1560 clamps it to bound(0, cvar("sv_maxrate"), 500000) and world.c:1749-1751 does cvar_fset("sv_maxrate", k_maxr) when the value differs. On a KTX server an admin's sv_maxrate above 500000 is silently lowered, and the cvar is owned/echoed by the mod. The engine enforcement (per-client bytes/sec cap) is unchanged; this is value-management, not behavior override. Worth a human note for the cross-engine L3 (server bandwidth) since it changes what value an admin actually ends up with under KTX.
- [fyi/other/vpass] SV_BoundRate (sv_main.c:3196-3200, 3182-3183) applies THREE universal bounds independent of sv_maxrate, on EVERY client and even when sv_maxrate=0: a 500 bytes/sec hard floor (line 3197), a ceiling of 100000*MAX_DUPLICATE_PACKETS = 300000 bytes/sec (line 3200, MAX_DUPLICATE_PACKETS=3 per net.h:29), and a substitution of 2500 when the requested rate is 0 (line 3183). The description's OFF-state phrase '0 = no server-imposed cap (each client's own requested rate is used)' is true with respect to THIS cvar but omits that these universal bounds still apply, so a client requesting e.g. 50 bytes/sec is silently floored to 500 and one requesting 0 becomes 2500. Not a contradiction of any asserted clause -- FYI completeness nuance only; row stays TRACED-CLEAN.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_maxrate",
  "type": "cvar",
  "description": "Caps the maximum network send rate, in bytes per second, the server will use for any single client, regardless of the rate that client requested. A client asking for a higher rate is clamped down to this limit. During a file download the limit still applies unless a separate download-rate cap (sv_maxdownloadrate) is set, in which case that one takes over for the download.\n\nUnit: bytes per second.\n0 = no server-imposed cap (each client's own requested rate is used).\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3193. Enforcing read-site src/sv_main.c:3180-3203 (SV_BoundRate(qbool dl, int rate)). Non-download branch (else): `if ((int)sv_maxrate.value && rate > (int)sv_maxrate.value) rate = (int)sv_maxrate.value;` (src/sv_main.c:3193-3194) -> clamps a client's rate down to the cap. Download branch: `if (!(int)sv_maxdownloadrate.value && (int)sv_maxrate.value && rate > (int)sv_maxrate.value) rate = (int)sv_maxrate.value;` (src/sv_main.c:3186-3187) -> sv_maxrate caps downloads ONLY when sv_maxdownloadrate is unset; otherwise the following `if (sv_maxdownloadrate.value ...)` (src/sv_main.c:3189-3190) takes over. Units bytes/sec: input `rate` is the client's rate value; surrounding floor `if (rate < 500) rate = 500` (src/sv_main.c:3196-3197) and ceiling `100000 * MAX_DUPLICATE_PACKETS` (src/sv_main.c:3199-3200) confirm a bytes/sec scale. OFF-state: `(int)sv_maxrate.value &&` short-circuits when 0 -> no cap from this cvar. Default 0 from registration `cvar_t sv_maxrate = {\"sv_maxrate\", \"0\"}` (src/sv_main.c:139); Cvar_Register src/sv_main.c:3561. Re-application to live clients on change handled in SV_CheckVars src/sv_main.c:3248-3256. Set-by: server cvar. KTX cross-check (FLAGGED): ktx/src actively WRITES sv_maxrate -- world.c:1560 `int k_maxr = bound(0, cvar(\"sv_maxrate\"), 500000);` and world.c:1749-1751 `if (k_maxr != cvar(\"sv_maxrate\")) cvar_fset(\"sv_maxrate\", k_maxr);` -- i.e. under KTX the value is re-clamped to 0..500000 and written back. This does not change the engine's enforcement meaning (still the per-client bytes/sec cap) so the L1 description stays engine-scoped; the KTX management of the value is noted as a flag, not inlined.",
  "description_proposed": null
}
```
