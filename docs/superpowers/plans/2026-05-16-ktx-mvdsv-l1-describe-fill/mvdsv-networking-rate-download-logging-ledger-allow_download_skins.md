# describe-fill-synthesis ledger -- mvdsv `allow_download_skins`

- **project:** mvdsv
- **knob:** `allow_download_skins` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:allow_download_skins: synthesized -- per-type skins/ download gate read at sv_user.c:1468, boolean (1=allow,0=block) via the deny_download branch, default 1, gated behind master allow_download + techlogin bypass -- origin=synthesized ref=src/sv_user.c:1468 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether the server lets connecting clients download player skin files (anything under the skins/ folder) that they are missing.
>
> 1 = allow skin downloads.
> 0 = block skin downloads.
>
> Default: 1.
> Set by: server config / rcon.
> See also: this only applies when the master download switch allow_download is on, and a techlogin client bypasses it.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| applies to skins/ paths | src/sv_user.c:1467 | `else if (!strncmp(name, "skins/", 6))` | MATCH |
| value read as the per-type gate | src/sv_user.c:1468 | `allow_dl = allow_download_skins.value; // skins` | MATCH |
| nonzero=allow / 0=block polarity | src/sv_user.c:1480 | `if (!allow_dl) goto deny_download;` | MATCH |
| default 1 (registered) | src/sv_main.c:107 | `cvar_t allow_download_skins = {"allow_download_skins", "1"};` | MATCH |
| master allow_download gates first | src/sv_user.c:1459 | `else if (!(int)allow_download.value) allow_dl = false;` | MATCH |
| techlogin bypasses all per-type checks | src/sv_user.c:1457 | `if (sv_client->special) allow_dl = true;` | MATCH |
| no KTX override | ktx/src (grep) | `grep -rn allow_download src/` -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Scope: server lets clients download skin files under `skins/` | sv_user.c:1467-1468 | `else if (!strncmp(name, "skins/", 6))` / `allow_dl = allow_download_skins.value; // skins` | MATCH |
| 2 | "that they are missing" (only missing files) | none (server is reactive; no missing-check) | server serves any requested `skins/` file; no server-side missing test exists | UNTRACEABLE |
| 3 | 1 = allow skin downloads | sv_user.c:1468 + 1480-1481 | `allow_dl = allow_download_skins.value;` then `if (!allow_dl) goto deny_download;` (value=1 -> truthy -> proceeds) | MATCH |
| 4 | 0 = block skin downloads | sv_user.c:1468 + 1480-1481 | same site; value=0 -> `!allow_dl` true -> `goto deny_download` | MATCH |
| 5 | OFF-state: clients fall back to a default skin | none in mvdsv tree | server only emits `deny_download`; no default/base/fallback-skin substitution logic anywhere server-side (baseline.skinnum at sv_init.c:122 is an entity index, unrelated) | UNTRACEABLE |
| 6 | Default: 1 | sv_main.c:107 | `cvar_t allow_download_skins = {"allow_download_skins", "1"};` | MATCH |
| 7 | Set by: server config / rcon | sv_main.c:107 (flags field defaults 0, no CVAR_ROM) + 3536 | `Cvar_Register (&allow_download_skins);`; bare init -> CVAR_NONE, settable at runtime | MATCH |
| 8 | Only applies when master `allow_download` is on | sv_user.c:1459-1460 | `else if (!(int)allow_download.value)` / `allow_dl = false; // global allow check` -- precedes skins branch in else-if chain, so master=0 denies before skins is consulted | MATCH |
| 9 | techlogin client bypasses it | sv_user.c:1457-1458 (set at 2221) | `if (sv_client->special) allow_dl = true; // NOTE: user used techlogin...`; `special` set true in Cmd_TechLogin_f after Master_Rcon_Validate() (sv_user.c:2221) | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv `git describe --tags` == 1.11-53-g18d0362.

Single enforcing site for this cvar: Cmd_Download_f in sv_user.c, an if/else-if chain at lines 1457-1481. Registration + default at sv_main.c:107 ("1"), registered unconditionally at sv_main.c:3536. No CVAR_ROM/CVAR_SERVERINFO flags (bare struct init -> flags=0).

The 7 core clauses are all MATCH and the else-if ORDER carries two of the See-also claims exactly right: techlogin (sv_client->special) is branch 1 so it short-circuits before the skins gate (bypass = correct); the master allow_download check is branch 2 so allow_download_skins is only reached when allow_download != 0 (dependency = correct). sv_client->special verified as the techlogin flag via Cmd_TechLogin_f (sv_user.c:2221, gated by Master_Rcon_Validate). Polarity is a float-to-qbool assignment (`allow_dl = allow_download_skins.value`) consumed by `if (!allow_dl) goto deny_download` -- 1 allows, 0 blocks, confirmed.

Why C-NEAR-MISS (not TRACED-CLEAN, not C-FIX, not WI2-FIX): two clauses assert behavior with NO enforcing read-site in the oracle, neither contradicting the code.
- Clause 5 (the driver): "clients missing those skins fall back to a default skin instead of pulling them from the server" is a concrete OFF-state side-effect. mvdsv has zero default/fallback-skin substitution -- the server only sends deny_download. The fallback is a CLIENT-side rendering behavior, outside the mvdsv oracle. This is the textbook flavour-C shape (cf. canonical k_teamoverlay "not in duel": plausible/true-in-practice but no enforcing site on the feature itself).
- Clause 2 ("that they are missing"): softer. The cvar gates ALL `skins/` download requests; the server never tests missing-ness. Clients only request files they lack, so the framing is reasonable, but strictly the gate is not "missing-only."

Metadata (default 1, set by config/rcon) is correct, so this is not WI2-FIX. Nothing is inverted, so not C-FIX. Suggested tightening for a re-synth: attribute the default-skin fallback explicitly to the client (or drop it as out-of-oracle-scope), and either qualify "missing" as the client's request pattern or generalize to "skin files clients request."

## flags_for_review

- [review/hidden-family/vpass] OFF-state clause 'clients ... fall back to a default skin' has no enforcing line in mvdsv -- it is client-side behavior asserted as if server-side. Recommend attributing to the client or dropping. Same description pattern likely recurs across the allow_download_* sibling family (models/sounds/maps/demos/other), all gated by the identical else-if chain in Cmd_Download_f; worth a family-wide check for the same client-side-fallback over-claim.
- [fyi/off-scope-entity/vpass] allow_download_other registered default is 0 (sv_main.c:113), unlike all its allow_download_* siblings which default 1. Off-scope to this knob but flag for whoever fills allow_download_other so the default isn't copy-pasted as 1.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "allow_download_skins",
  "type": "cvar",
  "description": "Controls whether the server lets connecting clients download player skin files (anything under the skins/ folder) that they are missing.\n\n1 = allow skin downloads.\n0 = block skin downloads.\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: this only applies when the master download switch allow_download is on, and a techlogin client bypasses it.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1468. Read use-site sv_user.c:1468 `allow_dl = allow_download_skins.value;` selected when the requested name begins with `skins/` (sv_user.c:1467 `!strncmp(name, \"skins/\", 6)`). Polarity: the value is used as a boolean download gate -- sv_user.c:1480 `if (!allow_dl) goto deny_download;` -- so nonzero allows, 0 denies. Default 1 from the registered cvar_t literal sv_main.c:107 `{\"allow_download_skins\", \"1\"}` (WI-2: registered default, not a cfg value); registered at sv_main.c:3536 `Cvar_Register (&allow_download_skins);` (locator only). Set-by: plain cvar, no command handler in the tree -> server config / rcon. Precedence clauses (routed to See also, action-relevant): the if/else-if chain checks `sv_client->special` techlogin FIRST (sv_user.c:1457-1458 `allow_dl = true;` bypassing all allow_download_* checks) and the master `!(int)allow_download.value` SECOND (sv_user.c:1459-1460 `allow_dl = false;`), so the per-type skins gate is only consulted when downloads are globally enabled and the client is not techlogin'd. F-MV1: no KTX override (grep of ktx/src for allow_download returns empty).",
  "description_proposed": null
}
```
