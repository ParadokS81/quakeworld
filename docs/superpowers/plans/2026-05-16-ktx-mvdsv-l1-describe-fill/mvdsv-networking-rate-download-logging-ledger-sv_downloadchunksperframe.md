# describe-fill-synthesis ledger -- mvdsv `sv_downloadchunksperframe`

- **project:** mvdsv
- **knob:** `sv_downloadchunksperframe` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_downloadchunksperframe: synthesized -- per-client per-frame cap on chunked-download chunks, bound 1..30, default 30; higher=faster/more data per frame -- origin=synthesized ref=src/sv_user.c:1148 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Caps how many download data chunks the server will send to a single client per server frame during chunked file downloads (the fast multi-chunk download path). Raising it lets a client pull a file in fewer frames (faster downloads) at the cost of more outgoing data per frame; lowering it spreads a download over more frames.
>
> The value is clamped to the range 1-30; values above 30 are treated as 30 and values below 1 as 1.
>
> Default: 30.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Default 30 | src/sv_user.c:45 | `cvar_t sv_downloadchunksperframe = {"sv_downloadchunksperframe", "30"}` | MATCH |
| clamped to 1..30 (>30->30, <1->1) | src/sv_user.c:1148 | `int maxchunks = bound(1, (int)sv_downloadchunksperframe.value, 30)` | MATCH |
| caps chunks served to a client per frame | src/sv_user.c:1159 | `if (sv_client->download_chunks_perframe >= maxchunks \|\| chunked_download_number < 1) return;` | MATCH |
| per-client per-frame counter (scope) | src/sv_user.c:1203 | `sv_client->download_chunks_perframe++;` | MATCH |
| applies to FTE chunked-download path | src/sv_user.c:1139 | `#ifdef FTE_PEXT_CHUNKEDDOWNLOADS` enclosing SV_NextChunkedDownload | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | clause | enforcing file:line | snippet | verdict |
|---|--------|---------------------|---------|---------|
| 1 | Caps how many download chunks the server sends to a single client per server frame | src/sv_user.c:1148, :1159, :1203, :4492 (+ server.h:272) | `int maxchunks = bound(1,(int)sv_downloadchunksperframe.value,30);` / `if (sv_client->download_chunks_perframe >= maxchunks ...) return;` / `sv_client->download_chunks_perframe++;` / `cl->download_chunks_perframe = 0;` (in SV_ExecuteClientMessage) | MATCH |
| 2 | the fast multi-chunk download path (chunked file downloads) | src/qwprot/src/protocol.h:46-47 + src/sv_user.c:1220 | `# define FTE_PEXT_CHUNKEDDOWNLOADS 0x20000000 // alternate file download method. Hopefully it'll give quadroupled download speed` / `if (sv_client->fteprotocolextensions & FTE_PEXT_CHUNKEDDOWNLOADS)` | MATCH |
| 3 | Raising = fewer frames / faster, more data per frame; lowering = spreads over more frames | src/sv_user.c:1159, :1203 | gate `>= maxchunks` with per-frame increment -> higher cap allows more chunk-sends before cutoff; mechanical consequence, not name inference | MATCH |
| 4 | clamped to 1-30; >30 treated as 30, <1 as 1 | src/sv_user.c:1148 + src/bothdefs.h:151 | `bound(1,...,30)` ; `#define bound(a,b,c) ((a) >= (c) ? (a) : (b) < (a) ? (a) : (b) > (c) ? (c) : (b))` -> a=1 low-clamp, c=30 high-clamp (verified arithmetic) | MATCH |
| 5 | Default: 30 | src/sv_user.c:45 (registered :4914) | `cvar_t sv_downloadchunksperframe = {"sv_downloadchunksperframe", "30"};` plain `Cvar_Register(&sv_downloadchunksperframe);` | MATCH |
| 6 | Set by: server config / rcon | src/sv_user.c:45 | bare `cvar_t` initializer, no CVAR_ROM/CVAR_SERVERINFO flag -> normal settable cvar (config/rcon) | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv git describe == "1.11-53-g18d0362". Trace-discipline ref read and applied per-clause (enforcing-line, callee-follow, adjacent-comment).

Three use-sites total (wide grep clean): registration src/sv_user.c:45, the lone enforcing read src/sv_user.c:1148, and Cvar_Register src/sv_user.c:4914. All three sit inside `#ifdef FTE_PEXT_CHUNKEDDOWNLOADS`.

Enforcement trace is fully closed. The clamp clause is the load-bearing one and I verified the `bound` macro arithmetic by hand rather than trusting its look: `bound(1,value,30)` returns 1 when value<1 and 30 when value>30 (low-clamp to 1, high-clamp to 30) -- exactly as the description states. The per-frame scope clause traces to a per-`client_t` counter (`download_chunks_perframe`, server.h:272) reset to 0 in SV_ExecuteClientMessage (each processed client packet) and gated/incremented in SV_NextChunkedDownload; the codebase itself names the concept "per frame" (field name + comment at :1162 "ignore 'rate' if not first packet per frame"), so the description's "per server frame" framing is the source's own vocabulary, not synth invention. The "fast multi-chunk / faster downloads" flavour is corroborated by the FTE protocol-extension comment (protocol.h:46-47, "quadroupled download speed, especially on higher pings"), not inferred from the knob name.

Liveness check (runtime-dead suspicion ruled out): FTE_PEXT_CHUNKEDDOWNLOADS is defined as 0x20000000 in qwprot/src/protocol.h:46 under the standard `#ifdef PROTOCOL_VERSION_FTE`, so the cvar and its enforcing read ARE compiled in. The value is only consumed when a client negotiated this FTE extension (gate at sv_user.c:1220); the description scopes this correctly with "during chunked file downloads," so it is not a defect.

Default verified at the REGISTERED initializer (WI-2): "30" at sv_user.c:45, plain Cvar_Register -- not a shipped-cfg value. Set-by is consistent with a bare cvar_t carrying no CVAR_ROM/serverinfo flag. Every material clause = MATCH against its enforcing line + adjacent comments. No flavour-C inference present -> TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] The cvar's effect is fully gated behind a per-client negotiated FTE protocol extension (sv_user.c:1220, `fteprotocolextensions & FTE_PEXT_CHUNKEDDOWNLOADS`). For clients that did NOT negotiate FTE chunked downloads, sv_downloadchunksperframe is never read (the legacy rate-limited path at Cmd_NextDownload_f:1227+ runs instead). Not a description defect -- 'during chunked file downloads' scopes it correctly -- but the per-client-protocol conditionality is a scope nuance a reader may not infer.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_downloadchunksperframe",
  "type": "cvar",
  "description": "Caps how many download data chunks the server will send to a single client per server frame during chunked file downloads (the fast multi-chunk download path). Raising it lets a client pull a file in fewer frames (faster downloads) at the cost of more outgoing data per frame; lowering it spreads a download over more frames.\n\nThe value is clamped to the range 1-30; values above 30 are treated as 30 and values below 1 as 1.\n\nDefault: 30.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1148. Registered sv_user.c:45 `cvar_t sv_downloadchunksperframe = {\"sv_downloadchunksperframe\", \"30\"}` -> Default 30 (WI-2: two-field literal). Enforcing read-site sv_user.c:1148 in SV_NextChunkedDownload (guarded by `#ifdef FTE_PEXT_CHUNKEDDOWNLOADS`, the FTE chunked-download path): `int maxchunks = bound(1, (int)sv_downloadchunksperframe.value, 30)` -> clauses: clamp range 1..30 (bound(lo,x,hi)), so >30 -> 30 and <1 -> 1. The cap is consumed at sv_user.c:1159 `if (sv_client->download_chunks_perframe >= maxchunks || ...) return;` which stops serving further chunks to that client once the per-frame count reaches maxchunks; `sv_client->download_chunks_perframe++` at :1203 increments per chunk and resets per frame (the per-client perframe counter) -> 'per client per server frame' scope and 'higher = fewer frames / faster, lower = more frames' direction. Units: count of CHUNKSIZE (1024-byte) chunks. No OFF state below 1 because bound floors at 1.",
  "description_proposed": null
}
```
