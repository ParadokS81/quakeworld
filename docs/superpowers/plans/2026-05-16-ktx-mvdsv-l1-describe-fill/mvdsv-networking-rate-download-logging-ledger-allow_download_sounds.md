# describe-fill-synthesis ledger -- mvdsv `allow_download_sounds`

- **project:** mvdsv
- **knob:** `allow_download_sounds` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:allow_download_sounds: synthesized -- per-type sound/ download gate read at sv_user.c:1472, boolean (1=allow,0=block) via the deny_download branch, default 1, gated behind master allow_download + techlogin bypass -- origin=synthesized ref=src/sv_user.c:1472 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server lets connecting clients download sound files (anything under the sound/ folder) that they are missing.
>
> 1 = allow sound downloads.
> 0 = block sound downloads; clients simply go without the missing sounds.
>
> Default: 1.
> Set by: server config / rcon.
> See also: this only applies when the master download switch allow_download is on, and a techlogin client bypasses it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| applies to sound/ paths | src/sv_user.c:1471 | `else if (!strncmp(name, "sound/", 6))` | MATCH |
| value read as the per-type gate | src/sv_user.c:1472 | `allow_dl = allow_download_sounds.value; // sounds` | MATCH |
| nonzero=allow / 0=block polarity | src/sv_user.c:1480 | `if (!allow_dl) goto deny_download;` | MATCH |
| default 1 (registered) | src/sv_main.c:109 | `cvar_t allow_download_sounds = {"allow_download_sounds", "1"};` | MATCH |
| master allow_download gates first | src/sv_user.c:1459 | `else if (!(int)allow_download.value) allow_dl = false;` | MATCH |
| techlogin bypasses all per-type checks | src/sv_user.c:1457 | `if (sv_client->special) allow_dl = true;` | MATCH |
| no KTX override | ktx/src (grep) | `grep -rn allow_download src/` -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| 1 | Server-side cvar controlling whether clients can download sound files | sv_user.c:1471-1472 | `else if (!strncmp(name, "sound/", 6))` / `allow_dl = allow_download_sounds.value; // sounds` | MATCH |
| 2 | Scope = anything under the sound/ folder | sv_user.c:1471 | `!strncmp(name, "sound/", 6)` (prefix match on `sound/`) | MATCH |
| 3 | "that they are missing" (client requesting files it lacks) | sv_user.c:1414 `Cmd_Download_f` | client-initiated `download` command handler; cvar gates the server response. NOTE: code does not itself test missing-ness, it gates any `download sound/...` request -- standard QW download-protocol semantics, accurate in practice | MATCH |
| 4 | 1 = allow sound downloads | sv_user.c:1472,1480 | `allow_dl = allow_download_sounds.value;` then `if (!allow_dl) goto deny_download;` -- nonzero => proceeds to download | MATCH |
| 5 | 0 = block sound downloads | sv_user.c:1480-1481 | `if (!allow_dl) goto deny_download;` -- value 0 => allow_dl false => deny | MATCH |
| 6 | OFF-state: clients go without missing sounds (no kick/error) | sv_user.c:1613-1633 (deny_download) | writes `svc_download` with `-1`/`0` (download-failed marker), `SV_DownloadNextFile()`, `return;` -- no disconnect, just a failed download | MATCH |
| 7 | Default: 1 | sv_main.c:109 (+ register :3538) | `cvar_t allow_download_sounds = {"allow_download_sounds", "1"};` registered via plain `Cvar_Register` | MATCH |
| 8 | Set by: server config / rcon | sv_main.c:3538 | `Cvar_Register (&allow_download_sounds);` -- no CVAR_ROM/CVAR_SERVERINFO/lock flags; ordinary settable server cvar | MATCH |
| 9 | Only applies when master allow_download is on | sv_user.c:1459-1472 | `else if (!(int)allow_download.value) allow_dl = false;` precedes the `sound/` branch in the same else-if chain; master off short-circuits before the sound check, so the sub-switch is inert | MATCH |
| 10 | A techlogin client bypasses it | sv_user.c:1457-1458 (+ source :2221) | `if (sv_client->special) allow_dl = true; // ...techlogin...` checked FIRST, bypassing master + per-type. `special` set by `Cmd_TechLogin_f` at sv_user.c:2221 after `Master_Rcon_Validate()` | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv git describe == 1.11-53-g18d0362. enforce-trace-discipline.md read and applied per-clause.

Wide read complete: exactly 4 use-sites of allow_download_sounds tree-wide -- declaration (sv_main.c:109), registration (sv_main.c:3538), extern decl (sv_user.c:1421), and the single enforcing read (sv_user.c:1472 inside Cmd_Download_f). No config-dump, serverinfo-propagation, or secondary read exists. The enforcing logic lives in a DIFFERENT file (sv_user.c) than registration (sv_main.c) -- traced across the boundary.

Every material clause maps to a located, verified enforcing line including adjacent comments:
- Polarity (1=allow / 0=block): the cvar value is loaded straight into allow_dl, then `if (!allow_dl) goto deny_download` (sv_user.c:1480). Nonzero allows, zero denies. Correct, not inverted.
- Scope (sound/ prefix): strncmp on "sound/" length 6. Correct.
- Default 1: verified against the REGISTERED default in the static cvar_t initializer (sv_main.c:109), not a shipped cfg. Plain Cvar_Register, no flags -> WI-2 metadata clean.
- Set-by config/rcon: no CVAR_ROM or lock flags on registration; settable. Correct.
- OFF-state: deny_download path writes a download-failed marker and moves to next file; no kick/error escalation. "Clients simply go without the missing sounds" is accurate.
- Master-switch dependency (clause 9): verified the else-if ORDERING -- `!allow_download.value` branch precedes the sound branch, so when the master is off the sound sub-switch is never consulted. Precise.
- Techlogin bypass (clause 10): traced end-to-end. `sv_client->special` (set by Cmd_TechLogin_f after Master_Rcon_Validate, sv_user.c:2221) is checked at sv_user.c:1457 BEFORE both the master check and the per-type check, granting unconditional allow. Description says techlogin "bypasses it" -- correct, and the broader truth (bypasses the master too) is consistent, not contradicted.

No clause is inferred from name/string/enum/comment without an enforcing read-site. No C-FIX (no contradiction), no WI2-FIX (default + access-class both verified). Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] Description clause 'that they are missing' is an inference about client behavior (the QW download command is client-initiated for absent assets) rather than an enforcement in this cvar's code path -- sv_user.c:1472 gates ANY 'download sound/...' request, not a missing-ness test. Accurate in practice given the standard QW download protocol; does not move the row off TRACED-CLEAN. FYI only.
- [fyi/cross-mod-override/vpass] Off-scope but adjacent: the techlogin/special bypass (sv_user.c:1457-1458) overrides ALL allow_download_* sub-switches AND the master allow_download for anything inside the quake dir, with only the .pak-map extra-check (sv_user.c:1554-1560) still applied. This is a broader admin-bypass surface than any single allow_download_* row's description conveys; if other allow_download_* rows are being filled, each should mention the same techlogin bypass for consistency.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "allow_download_sounds",
  "type": "cvar",
  "description": "Controls whether the server lets connecting clients download sound files (anything under the sound/ folder) that they are missing.\n\n1 = allow sound downloads.\n0 = block sound downloads; clients simply go without the missing sounds.\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: this only applies when the master download switch allow_download is on, and a techlogin client bypasses it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1472. Read use-site sv_user.c:1472 `allow_dl = allow_download_sounds.value;` selected when the requested name begins with `sound/` (sv_user.c:1471 `!strncmp(name, \"sound/\", 6)`). Polarity: value used as a boolean gate -- sv_user.c:1480 `if (!allow_dl) goto deny_download;` -- nonzero allows, 0 denies. Default 1 from registered cvar_t literal sv_main.c:109 `{\"allow_download_sounds\", \"1\"}` (WI-2); registered sv_main.c:3538 (locator only). Set-by: plain cvar, no command handler -> server config / rcon. Precedence (routed to See also, action-relevant): techlogin check first (sv_user.c:1457-1458) and master `!(int)allow_download.value` second (sv_user.c:1459-1460) both precede this per-type line in the else-if chain. F-MV1: no KTX override (ktx/src allow_download grep empty).",
  "description_proposed": null
}
```
