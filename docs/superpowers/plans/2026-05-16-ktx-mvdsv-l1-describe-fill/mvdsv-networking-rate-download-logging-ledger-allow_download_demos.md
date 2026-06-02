# describe-fill-synthesis ledger -- mvdsv `allow_download_demos`

- **project:** mvdsv
- **knob:** `allow_download_demos` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:allow_download_demos: synthesized -- per-type demos//demonum/ download gate read at sv_user.c:1476, boolean (1=allow,0=block) via the deny_download branch, default 1, gated behind master allow_download + techlogin bypass -- origin=synthesized ref=src/sv_user.c:1476 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server lets clients download recorded demo files from it (requests under demos/, and the demonum/ shortcut that resolves to a recorded demo by number).
>
> 1 = allow demo downloads.
> 0 = block demo downloads.
>
> Default: 1.
> Set by: server config / rcon.
> See also: this only applies when the master download switch allow_download is on, and a techlogin client bypasses it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| applies to demos/ AND demonum/ paths | src/sv_user.c:1475 | `else if (!strncmp(name, "demos/", 6) || !strncmp(name, "demonum/", 8))` | MATCH |
| value read as the per-type gate | src/sv_user.c:1476 | `allow_dl = allow_download_demos.value; // demos` | MATCH |
| demonum/ resolves to a real demo | src/sv_user.c:1519 | `name = SV_MVDNum(num);` | MATCH |
| nonzero=allow / 0=block polarity | src/sv_user.c:1480 | `if (!allow_dl) goto deny_download;` | MATCH |
| default 1 (registered) | src/sv_main.c:112 | `cvar_t allow_download_demos = {"allow_download_demos", "1"};` | MATCH |
| master allow_download gates first | src/sv_user.c:1459 | `else if (!(int)allow_download.value) allow_dl = false;` | MATCH |
| techlogin bypasses all per-type checks | src/sv_user.c:1457 | `if (sv_client->special) allow_dl = true;` | MATCH |
| no KTX override | ktx/src (grep) | `grep -rn allow_download src/` -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Controls whether server lets clients download recorded demo files | sv_user.c:1475-1476 | `else if (!strncmp(name, "demos/", 6) || !strncmp(name, "demonum/", 8))` / `allow_dl = allow_download_demos.value; // demos` | MATCH |
| 2 | Scope: requests under demos/ | sv_user.c:1475 | `!strncmp(name, "demos/", 6)` | MATCH |
| 3 | Scope: demonum/ shortcut that resolves to a recorded demo by number | sv_user.c:1475, :1497-1519; sv_demo_misc.c:435 | `\|\| !strncmp(name, "demonum/", 8)` (shares the demo gate) ; `else if (!strncmp(name, "demonum/", 8)) { int num = Q_atoi(name + 8); ... name = SV_MVDNum(num);` ; `char *SV_MVDNum (int num)` resolves num to a recorded demo filename | MATCH |
| 4 | 1 = allow demo downloads | sv_user.c:1476, :1480 | `allow_dl = allow_download_demos.value;` then `if (!allow_dl) goto deny_download;` (nonzero -> download proceeds) | MATCH |
| 5 | 0 = block demo downloads | sv_user.c:1480-1481 | `if (!allow_dl)` / `goto deny_download;` (zero value -> deny) | MATCH |
| 6 | Default: 1 | sv_main.c:112 (registered :3541) | `cvar_t allow_download_demos = {"allow_download_demos", "1"};` ; `Cvar_Register (&allow_download_demos);` | MATCH |
| 7 | Set by: server config / rcon | sv_main.c:112, :3541 | plain `cvar_t` with no flags arg and no OnChange handler -> ordinary settable cvar (no CVAR_ROM, no SERVERINFO lock) | MATCH |
| 8 | Only applies when master switch allow_download is on | sv_user.c:1459-1460 (relative to :1475) | `else if (!(int)allow_download.value)` / `allow_dl = false; // global allow check` -- in the if/else-if chain this branch precedes (and short-circuits) the demo branch, so allow_download_demos is consulted only when allow_download is nonzero | MATCH |
| 9 | A techlogin client bypasses it | sv_user.c:1457-1458 (techlogin source :2221) | `if (sv_client->special)` / `allow_dl = true; // NOTE: user used techlogin, allow dl anything in quake dir in such case!` -- first branch of the chain, set true only after Master_Rcon_Validate at :2221 `sv_client->special = true;` | MATCH |

**V-pass notes:** Exhaustive tree-wide grep of allow_download_demos returns exactly two locations: registration (sv_main.c:112 declaration, :3541 Cvar_Register) and one read-site (sv_user.c:1476 inside Cmd_Download_f). No other consumer, no help/serverinfo mirror. Every material clause maps to a located, verified enforcing line.

Control-flow chain in Cmd_Download_f (sv_user.c:1457-1481) is a single if/else-if cascade, traced in full:
- 1457 `if (sv_client->special)` -> allow_dl=true (techlogin first; wins over everything below)
- 1459 `else if (!allow_download.value)` -> deny (master switch)
- 1465 `else if (!strstr(name,"/"))` -> deny (must be subdir)
- ... per-type branches ...
- 1475 `else if (demos/ || demonum/)` -> allow_dl = allow_download_demos.value
- 1480 `if (!allow_dl) goto deny_download;`

This cascade structure is exactly what makes clauses 8 and 9 true and verifiable, not name-inferred: the master-switch branch (1459) textually precedes and short-circuits the demo branch (1475), so the demo cvar is only consulted when allow_download!=0; and the techlogin branch (1457) precedes the master-switch branch, so special clients bypass both. The two scope prefixes (demos/, demonum/) share one gate via the `||` on line 1475 -- the demonum/ shortcut is gated by the same cvar before its later resolution block (1497-1519) runs.

Default verified against the REGISTERED initializer (WI-2): `{"allow_download_demos", "1"}` is the literal default 1, not a shipped-cfg value. No OnChange handler, no flags -> ordinary cvar settable via config/rcon (clause 7).

Techlogin = sv_client->special, set true only in Cmd_TechLogin_f (sv_user.c:2221) after Master_Rcon_Validate() passes; cleared on logout (:2208). Confirms "techlogin client bypasses it" is the literal first-branch override, with the in-code comment at :1458 explicitly stating the bypass rationale.

No flavour-C clause found: every polarity/threshold/default/scope/OFF-state/bypass assertion is anchored to enforcing code, not to the knob name, an enum, or a comment.

## flags_for_review

- [fyi/off-scope-entity/vpass] sv_user.c:1465 `else if (!strstr(name, "/"))` -> deny: a non-techlogin download request with no '/' in the path is denied before any per-type cvar is reached. This is a download-system-wide subdir requirement, off-scope for this knob (demos/ and demonum/ both contain '/'), but worth noting that the demo gate is unreachable for a slash-less request.
- [fyi/other/vpass] demonum/ resolution (sv_user.c:1497-1531) does not actually open/stream the file in Cmd_Download_f; after SV_MVDNum resolves the name it stuffs a `download demos/<name>` command back to the client (svc_stufftext, :1529-1531) and returns. That re-issued request re-enters Cmd_Download_f under the demos/ prefix and is gated again by allow_download_demos at :1475 -- so the demo gate effectively applies twice on the demonum/ path (once on the demonum/ request, once on the resolved demos/ request). The description's framing ('demonum/ shortcut that resolves to a recorded demo by number') is accurate and this double-gating does not change the user-visible behavior, but it is a non-obvious control-flow detail.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "allow_download_demos",
  "type": "cvar",
  "description": "Controls whether the server lets clients download recorded demo files from it (requests under demos/, and the demonum/ shortcut that resolves to a recorded demo by number).\n\n1 = allow demo downloads.\n0 = block demo downloads.\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: this only applies when the master download switch allow_download is on, and a techlogin client bypasses it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1476. Read use-site sv_user.c:1476 `allow_dl = allow_download_demos.value;` selected when the requested name begins with `demos/` OR `demonum/` (sv_user.c:1475 `!strncmp(name, \"demos/\", 6) || !strncmp(name, \"demonum/\", 8)`); the demonum/ form is a by-number shortcut that is resolved into an actual demo path further down (SV_MVDNum, sv_user.c:1519) but is gated by this same cvar. Polarity: value used as a boolean gate -- sv_user.c:1480 `if (!allow_dl) goto deny_download;` -- nonzero allows, 0 denies. Default 1 from registered cvar_t literal sv_main.c:112 `{\"allow_download_demos\", \"1\"}` (WI-2); registered sv_main.c:3541 (locator only). Set-by: plain cvar, no command handler -> server config / rcon. Precedence (routed to See also, action-relevant): techlogin first (sv_user.c:1457-1458), master `!(int)allow_download.value` second (sv_user.c:1459-1460), both before this per-type line. F-MV1: no KTX override (ktx/src allow_download grep empty).",
  "description_proposed": null
}
```
