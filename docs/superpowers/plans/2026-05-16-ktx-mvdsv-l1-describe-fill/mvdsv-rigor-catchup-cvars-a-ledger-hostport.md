# describe-fill-synthesis ledger -- mvdsv `hostport`

- **project:** mvdsv
- **knob:** `hostport` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `rigor-catchup-cvars-a` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:hostport: synthesized -- optional display-address label; overrides shown IP:port when non-empty (sv_broadcast.c:579) -- origin=synthesized ref=src/sv_broadcast.c:579 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> An optional human-friendly address label for the server (for example a domain name with port, like quake.se:28501). When set, this text is shown as the server's address in cross-server broadcast/announce messages (the server-to-server broadcast/spectalk line) instead of its raw numeric IP:port. Leave it empty to fall back to the server's actual address.
>
> Default: empty (use the real IP:port).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| when set, used as the shown server address | src/sv_broadcast.c:579-581 | `if (strlen(hostport) > 0) { displayaddr = hostport; }` | MATCH |
| OFF-state: empty falls back to real address | src/sv_broadcast.c:583+ | else branches set displayaddr to net_from:port / addr | MATCH |
| sent in the broadcast/announce packet | src/sv_broadcast.c:443 | `Cvar_String("hostport"), NET_UDPSVPort(), ...` | MATCH |
| also published in serverinfo (CVAR_SERVERINFO) | src/cvar.c:157 | `if (var->flags & CVAR_SERVERINFO) SV_ServerinfoChanged(...)` | MATCH |
| CVAR_SERVERINFO flag + Default empty | src/sv_main.c:177 | `cvar_t hostport = {"hostport", "", CVAR_SERVERINFO};` | MATCH |
| settable, not rcon-blocked | src/sv_main.c:1754-1764 | blocklist tokens do not include 'hostport' | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| C1 | Optional human-friendly address label; example "quake.se:28501" | src/sv_main.c:177 | `cvar_t hostport = {"hostport", "", CVAR_SERVERINFO}; // example: "quake.se:28501"` | MATCH (example is the verbatim source comment; value is later used purely as a display string) |
| C2 | This text is used as the server's shown address **in server listings** instead of its raw numeric IP:port | src/sv_broadcast.c:579-581 (-> formatted at 597-604) | `if (strlen(hostport) > 0)` / `displayaddr = hostport;` ... `snprintf(out, ..., displayaddr, ...)` | MISMATCH (surface). Substitution semantics + polarity (friendly text replaces raw IP:port) are correct and traced. But the surface is the server-to-server **broadcast announcement message** (console + PRINT_CHAT + broadcast log; sinks at lines 608/616/631), e.g. `[tot.qwsv.net:27500] ToT_Oddjob: prac now` -- NOT a master-server "server listing"/browser. "server listings" has NO enforcing site (no status/heartbeat/master path reads hostport -- confirmed by tree-wide grep). |
| C3 | OFF-state: leave empty to fall back to the server's actual address | src/sv_broadcast.c:579-591 | `if (strlen(hostport) > 0) { displayaddr = hostport; } else if (strlen(port) > 0) { ...NET_BaseAdrToString(net_from):port } else { displayaddr = addr; }` | MATCH (empty hostport -> falls through to BaseAdr:port or raw addr; both are the actual address. Same surface caveat as C2, but the empty-fallback behavior is correct.) |
| C4 | Default: empty | src/sv_main.c:177 (registered at 3498) | `{"hostport", "", CVAR_SERVERINFO}` ... `Cvar_Register (&hostport);` | MATCH (WI-2: registered default is `""`; verified against the cvar declaration, not a shipped .cfg) |
| C5 | Set by: server config / rcon | src/sv_main.c:177 | `CVAR_SERVERINFO` (no CVAR_ROM / CVAR_USERINFO); plain serverinfo cvar | MATCH (ordinary settable serverinfo cvar; no access flag restricts it; it is a cvar not a command so CF_ access-class check is N/A) |

**V-pass notes:** Exhaustive trace: `hostport` (the documented cvar) has use-sites in exactly two files, both fully read. Registration: src/sv_main.c:177 (default "", CVAR_SERVERINFO), registered at :3498. Sender path: SV_BroadcastSend reads Cvar_String("hostport") into the outgoing `\hostport\<value>` broadcast packet field (sv_broadcast.c:443). Receiver/relay path: SVC_Broadcast (dispatched from sv_main.c:1963) parses the payload `hostport` key (sv_broadcast.c:566) and at lines 579-591 selects displayaddr = hostport when non-empty, else BaseAdr:port, else raw addr; displayaddr is formatted into the broadcast announcement line (597-604) shown via console/Con_Printf (616), PRINT_CHAT to spawned clients/spectators (631), and the broadcast log/cache (608/613). The cvar value thus travels in the packet and drives the display substitution on the receiving server -- so the behavior IS a true runtime consequence of the cvar.

Classification = C-NEAR-MISS (flavour-C positive on the scope/surface clause). Core mechanism is correct and enforcement-traced on every material axis: polarity (friendly text replaces raw IP:port -- raw-addr fallback at line 590 confirms direction), OFF-state empty-fallback (579-591), default empty (WI-2 against the declaration), and set-by (plain serverinfo cvar). The single defect is C2's named surface: "server's shown address in server listings" implies the master-server-fed server browser, but the only surface that consumes hostport is the server-to-server broadcast/spectalk announcement message (the "prac now" cross-server advertise line). Tree-wide grep confirms NO status/heartbeat/master/browser consumer of the hostport serverinfo key -- so "server listings" is an over-broad inference with zero enforcing read-site, while the real code is narrower (broadcast announcement only). That is exactly the C-NEAR-MISS profile: correct mechanism, unenforced/misleading scope. Not C-FIX (no clause contradicts the code), not WI2-FIX (metadata correct), not TRACED-CLEAN (the surface claim is materially misleading and unenforced).

Suggested minimal correction for re-synth: replace "server listings" with the actual surface, e.g. "...shown as the server's address in the cross-server broadcast/announce line (the server-to-server 'broadcast' / spectalk message), instead of its raw numeric IP:port." Keep C1/C3/C4/C5 as-is.

## flags_for_review

- [fyi/off-scope-entity/vpass] hostport is consumed ONLY by the server-to-server broadcast/spectalk announcement feature (sv_broadcast.c), not by any master-server status response or server-browser listing path. Despite the CVAR_SERVERINFO flag, no status/heartbeat/master code reads the hostport key (tree-wide grep clean). Operators (and the L1 description) should not assume hostport controls how the server appears in the server browser.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_paused=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "hostport",
  "type": "cvar",
  "description": "An optional human-friendly address label for the server (for example a domain name with port, like quake.se:28501). When set, this text is shown as the server's address in cross-server broadcast/announce messages (the server-to-server broadcast/spectalk line) instead of its raw numeric IP:port. Leave it empty to fall back to the server's actual address.\n\nDefault: empty (use the real IP:port).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_broadcast.c:579. No real prior description (registration comment is just an example) -> synthesized. hostport is CVAR_SERVERINFO at src/sv_main.c:177 (default empty), so like hostname it is published into the serverinfo string via src/cvar.c:157 -> SV_ServerinfoChanged. Its distinguishing, action-relevant behavior is in the broadcast/announce path: SV_BroadcastSend (src/sv_broadcast.c:410) sends `\\hostport\\<value>` in the broadcast packet at src/sv_broadcast.c:443 `Cvar_String(\"hostport\")`; on the receiving side src/sv_broadcast.c:566 reads it back and at src/sv_broadcast.c:579-581 `if (strlen(hostport) > 0) displayaddr = hostport;` uses it as the displayed address, overriding the raw IP:port (the else branches at 583+ fall back to net_from:port or the bare address). OFF-state verified: empty string fails `strlen>0`, so the raw address is shown. Default empty from the registered literal at src/sv_main.c:177 (WI-2). Settable (CVAR_SERVERINFO, no ROM; not on the rcon blocklist) -> server config / rcon. The example comment ('quake.se:28501') corroborates the domain-label intent and matches the displayaddr enforcement. F-MV1: no KTX override of hostport found.",
  "description_proposed": null
}
```
