# describe-fill-synthesis ledger -- mvdsv `download_map_url`

- **project:** mvdsv
- **knob:** `download_map_url` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:download_map_url: synthesized -- non-empty string is prepended to a bare map filename in a 'download faster' message shown to a client downloading a maps/ file; empty = no message -- origin=synthesized ref=src/sv_user.c:1595 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets a web address the server offers to clients as a faster alternative when they begin downloading a map from the server. When a client starts downloading a file under maps/, the server prints it a message ending in this address followed by the map's filename, so the player can fetch the map from the web instead.
>
> Default: empty (no alternate-download message is shown).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| Non-empty triggers the offer; empty = no message (OFF-state) | src/sv_user.c:1595 | `if (download_map_url.string[0])` | MATCH |
| Offer is shown only for map downloads | src/sv_user.c:1590 | `if (!strncmp(name, "maps/", 5))` | MATCH |
| Printed text = URL string + bare filename (maps/ prefix stripped) | src/sv_user.c:1597,1599-1600 | `name += 5;` ... `SV_ClientPrintf(... "%s%s\n\n", download_map_url.string, name)` | MATCH |
| "Download this map faster:" precedes it | src/sv_user.c:1598 | `SV_ClientPrintf(sv_client, PRINT_HIGH, "Download this map faster:\n")` | MATCH |
| Registered default empty | src/sv_main.c:115 | `cvar_t download_map_url = {"download_map_url", ""}` | MATCH |
| No KTX override | ktx/src (grep) | (no match) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | "Sets a web address the server offers to clients as a faster alternative when they begin downloading a map" | src/sv_user.c:1595-1600 | `if (download_map_url.string[0]) { name += 5; SV_ClientPrintf(..., "Download this map faster:\n"); SV_ClientPrintf(..., "%s%s\n\n", download_map_url.string, name); }` | MATCH |
| 2 | Triggered "when a client starts downloading a file under maps/" | src/sv_user.c:1590 | `if (!strncmp(name, "maps/", 5))` (block reached only after download already opened+started: FS_OpenVFS @1545, Cmd_NextDownload_f @1586) | MATCH |
| 3 | "prints IT a message" (per-client, the requesting client) | src/sv_send.c:220 + sv_user.c:1598-1600 | `void SV_ClientPrintf (client_t *cl, ...)` called with `sv_client` (the downloading client) | MATCH |
| 4 | message "ending in this address followed by the map's filename" (= url + bare filename, not full path) | src/sv_user.c:1597,1599-1600 | `name += 5;` (strips "maps/") then `SV_ClientPrintf(..., "%s%s\n\n", download_map_url.string, name)` -> final printed line is `<url><filename>` | MATCH |
| 5 | "Default: empty (no alternate-download message is shown)" | src/sv_main.c:115 (default) + sv_user.c:1595 (OFF-state) | `cvar_t download_map_url = {"download_map_url", ""};` ; `if (download_map_url.string[0])` -> empty => `.string[0]=='\0'` falsy => faster-download block skipped (only the size line prints) | MATCH |
| 6 | "Set by: server config / rcon" (normal server cvar, no access flags) | src/sv_main.c:3544 | `Cvar_Register (&download_map_url);` -- plain register, struct initializer carries no CVAR_* flag (no SERVERINFO/ROM/etc.) | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Wide-grep found exactly 5 use-sites: registration (sv_main.c:115 default, :3544 Cvar_Register) and the read/enforce site (sv_user.c:1426 extern, :1595 gate, :1600 use), all inside the `download` console-command handler Cmd_Download_f (sv_user.c:1414, the server-side processor of a client's download request).

Every material clause traces to a located enforcing line and matches its code + adjacent comments (the bliP "download info/download url" comment block @1589/1609 corroborates intent). No flavour-C inference detected.

Sharpened polarity/default re-check (per instruction):
- DEFAULT: registered as `{"download_map_url", ""}` (sv_main.c:115) -- empty string, exactly as claimed. No shipped-cfg drift involved; this is the true registered default.
- OFF-STATE polarity: enforcing line is `if (download_map_url.string[0])` (sv_user.c:1595). VALUE THAT ENABLES = any non-empty string (`.string[0] != '\0'`); VALUE THAT BLOCKS = empty (`.string[0] == '\0'`). Description's "Default: empty (no alternate-download message is shown)" matches: empty => block skipped, only the "Map ... is NKB" size line prints. Correct direction, not inverted.
- FILENAME nuance: `name += 5` (line 1597) strips the literal "maps/" prefix BEFORE the URL print, so the appended token is the bare map filename (e.g. dm3.bsp), not the full "maps/dm3.bsp" path. Description's "followed by the map's filename" is precise on this subtle point.
- ACCESS-CLASS (WI-2): plain Cvar_Register, no CVAR_SERVERINFO / CVAR_ROM / access flag. Standard server-side cvar settable via config or rcon as stated.

The "faster alternative" framing is an offer/suggestion only -- the server continues serving the file over the normal download channel regardless (no redirect, no abort); the URL is informational redtext printed alongside the in-progress download. The description ("offers ... as a faster alternative", "so the player can fetch the map from the web instead") conveys this without asserting a redirect, so no contradiction.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "download_map_url",
  "type": "cvar",
  "description": "Sets a web address the server offers to clients as a faster alternative when they begin downloading a map from the server. When a client starts downloading a file under maps/, the server prints it a message ending in this address followed by the map's filename, so the player can fetch the map from the web instead.\n\nDefault: empty (no alternate-download message is shown).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1595. Enforcing read-site src/sv_user.c:1595 `if (download_map_url.string[0])` gates the message on a non-empty string (so empty = no message -- the OFF-state). Inside that block, src/sv_user.c:1597 `name += 5` strips the leading `maps/` (5 chars), and src/sv_user.c:1599-1600 `SV_ClientPrintf(... \"%s%s\\n\\n\", download_map_url.string, name)` prints the URL string immediately followed by the bare map filename, preceded by the \"Download this map faster:\" line at src/sv_user.c:1598. Whole block is reached only on the `if (!strncmp(name, \"maps/\", 5))` branch (src/sv_user.c:1590), so the offer is map-downloads-only. Registered default empty: src/sv_main.c:115 `cvar_t download_map_url = {\"download_map_url\", \"\"}` (WI-2). F-MV1: grep of ktx/src for download_map_url = NONE; no KTX override, engine behavior is live. Mechanism only, no recommended value. D20: no file:line/jargon in description.",
  "description_proposed": null
}
```
