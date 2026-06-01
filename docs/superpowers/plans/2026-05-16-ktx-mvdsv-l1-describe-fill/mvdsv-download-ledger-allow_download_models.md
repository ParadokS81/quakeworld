# describe-fill-synthesis ledger -- mvdsv `allow_download_models`

- **project:** mvdsv
- **knob:** `allow_download_models` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE verified: `git -C research/repos/mvdsv describe --tags` == `1.11-53-g18d0362`)
- **mechanical_candidate:** none -- cold-synth (description was NULL)
- **suspect_pool_member:** FALSE
- **verdict:** `synthesized` -- high confidence; every clause enforce-traced; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow pilot `mvdsv-describe-fill-pilot` -- 1 synthesis worker + independent cold V-pass; F-D6a + HG1 canary + HG2 gates passed (see Gate log)

## Halt verdict

```
mvdsv:allow_download_models: synthesized -- gates client downloads of progs/ (model) files; effect only while allow_download on; enforced in Cmd_Download_f not at registration -- origin=synthesized ref=src/sv_user.c:1470 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether clients may download model/progs files (the progs/ folder, e.g. player and weapon models) from the server. Has effect only while allow_download is on.
>
> 0 = block model downloads.
> 1 = allow clients to download models from this server.
>
> Default: 1.
> Set by: server config.
> See also: allow_download, allow_download_other.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| scope = progs/ path (= models) | src/sv_user.c:1469-1470 | `else if (!strncmp(name, "progs/", 6))` -> `allow_dl = allow_download_models.value; // models` | MATCH |
| polarity: !allow_dl denies | src/sv_user.c:1480 | `if (!allow_dl) goto deny_download;` | MATCH |
| effect only when allow_download on (else-if chain) | src/sv_user.c:1459 | first branch `else if (!(int)allow_download.value) allow_dl=false;` short-circuits chain when off | MATCH |
| default 1 | src/sv_main.c:108 | `cvar_t allow_download_models = {"allow_download_models", "1"};` | MATCH |
| set by server config (plain cvar) | src/sv_main.c:108 | `cvar_t allow_download_models = {"allow_download_models", "1"};` (no CVAR_* flag) | MATCH |
| F-MV1: no KTX override | ktx/src/commands.c | absent | MATCH (moot) |

## Independent V-pass (cold context; given knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Controls download of model/progs files (progs/ folder, e.g. player/weapon models) | src/sv_user.c:1469-1470 | `else if (!strncmp(name, "progs/", 6))` / `allow_dl = allow_download_models.value; // models` | MATCH |
| 2 | Has effect only while allow_download is on | src/sv_user.c:1459-1460 | `else if (!(int)allow_download.value)` / `allow_dl = false; // global allow check` (else-if chain short-circuits before the progs/ branch at 1469 when allow_download==0) | MATCH |
| 3 | 0 = block model downloads | src/sv_user.c:1470, 1480-1481 | `allow_dl = allow_download_models.value;` then `if (!allow_dl) goto deny_download;` (qbool: 0.0 -> false -> deny). deny_download (1613) writes -1 refusal. | MATCH |
| 4 | 1 = allow clients to download models | src/sv_user.c:1470, 1480 | `allow_dl = allow_download_models.value;` then `if (!allow_dl)` false -> proceeds to open/serve file | MATCH |
| 5 | Default: 1 | src/sv_main.c:108 (reg 3537) | `cvar_t allow_download_models = {"allow_download_models", "1"};` ; plain `Cvar_Register (&allow_download_models);` (no Ex override) | MATCH |
| 6 | Set by: server config | src/sv_main.c:108 + 3537 | server-side `cvar_t` registered in sv_main.c via `Cvar_Register`; no special access flag (it is a cvar, not a CF_-flagged command) | MATCH |
| 7 | See also: allow_download, allow_download_other | src/sv_main.c:106, 113 | `allow_download = {"allow_download","1"}` ; `allow_download_other = {"allow_download_other","0"}` -- both exist and are siblings in the same else-if chain (sv_user.c:1459, 1478) | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv describe --tags == 1.11-53-g18d0362. enforce-trace-discipline.md loaded and applied per-clause.

Wide-grep (WI-1): only 4 use-sites for allow_download_models -- registration/default (sv_main.c:108), Cvar_Register (sv_main.c:3537), extern decl (sv_user.c:1420), and the single enforcing read (sv_user.c:1470). No callee follow needed: the gate is a direct `.value` read assigned to `qbool allow_dl`, enforced inline at sv_user.c:1480 `if (!allow_dl) goto deny_download`.

All 7 clauses MATCH their enforcing lines (no MISMATCH, no UNTRACEABLE). The dependency clause (#2) is the only non-trivial one: it relies on the else-if chain ordering -- the `!(int)allow_download.value` branch at 1459 sets allow_dl=false and short-circuits, so the progs/ branch at 1469 is unreachable when allow_download==0. Verified the chain structure directly; clause is correct.

WI-2 metadata: Default 1 verified against the REGISTERED default string "1" (sv_main.c:108), via plain Cvar_Register (no RegisterCvarEx override) -- not a shipped-cfg value. "Set by: server config" is correct for a server-side cvar with no command access flag.

Two corner cases the description neither asserts nor contradicts (so no effect on classification, noted for completeness):
1) Techlogin bypass: sv_user.c:1457-1458 `if (sv_client->special) allow_dl = true;` precedes both the allow_download gate and the per-type gates, so a techlogin'd client downloads anything in the quake dir regardless of these cvars. The description correctly describes normal-client behavior.
2) Polarity precision: the value is read as raw float `.value` truncated into qbool, so ANY non-zero value enables (not strictly ==1). The description's "1 = allow" is consistent with the registered default and the on/off framing; no over-claim that only 1 works.

PROC-1: residual reduces to checkable facts confirmed at enforcing lines; no buried judgment. Row is TRACED-CLEAN.

## Gate log (orchestrator / MAIN session)

- **F-D6a (fabrication check):** source_ref `src/sv_user.c:1470` verified against live source -- line exists and reads `allow_download_models`. PASS.
- **HG1 (canary):** the wave's planted canary `allow_download_skins` (deliberately inverted-polarity description) was correctly flagged `C-FIX` (ground truth C-FIX) -- the cold V-pass is not rubber-stamping. PASS.
- **HG2 (re-grep V-pass nuance, both directions):** V-pass edge-case observations re-checked against source (src/sv_user.c:1457-1481); confirmed accurate; row correctly held TRACED-CLEAN (nuances were completeness notes, not contradictions). PASS.

## Notes / refinement

- No post-V-pass refinement; shipped as synthesized.

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "allow_download_models",
  "type": "cvar",
  "description": "Controls whether clients may download model/progs files (the progs/ folder, e.g. player and weapon models) from the server. Has effect only while allow_download is on.\n\n0 = block model downloads.\n1 = allow clients to download models from this server.\n\nDefault: 1.\nSet by: server config.\nSee also: allow_download, allow_download_other.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1470. Cold synth (description NULL). Registration sv_main.c:108 cvar_t allow_download_models={\"allow_download_models\",\"1\"} is LOCATOR only (TRAP2); enforcement in src/sv_user.c Cmd_Download_f. Per-clause enforce-trace: (1) Scope = progs/ path -- sv_user.c:1469-1470 `else if (!strncmp(name, \"progs/\", 6)) allow_dl = allow_download_models.value; // models`. NOTE the name says 'models' but the enforced path prefix is literally \"progs/\" (Quake stores model .mdl files under progs/); user doc states the observable folder (progs/) AND the plain-English meaning (models) to avoid a name-vs-path confusion -- both verified to the same enforcing line. (2) Polarity -- assigned to allow_dl then sv_user.c:1480 `if (!allow_dl) goto deny_download;` => 0=block, non-zero=allow. (3) Gated under allow_download -- later branch of the same if/else-if chain; first branch (sv_user.c:1459) short-circuits when allow_download is 0, so this is reached only when allow_download is on (action-changing dependency, inline per D20). (4) Default -- WI-2 registered literal sv_main.c:108 = \"1\". (5) Set-by -- plain cvar_t no flags (sv_main.c:108), server console/config. Techlogin/'special' clients bypass (sv_user.c:1457-1458) -- admin-bypass, omitted. F-MV1: no KTX override (moot).",
  "description_proposed": null
}
```
