# describe-fill-synthesis ledger -- mvdsv `allow_download`

- **project:** mvdsv
- **knob:** `allow_download` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE verified: `git -C research/repos/mvdsv describe --tags` == `1.11-53-g18d0362`)
- **mechanical_candidate:** none -- cold-synth (description was NULL)
- **suspect_pool_member:** FALSE
- **verdict:** `synthesized` -- high confidence; every clause enforce-traced; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow pilot `mvdsv-describe-fill-pilot` -- 1 synthesis worker + independent cold V-pass; F-D6a + HG1 canary + HG2 gates passed (see Gate log)

## Halt verdict

```
mvdsv:allow_download: synthesized -- master download gate; off denies all client downloads and disables per-type settings; enforced in Cmd_Download_f not at registration -- origin=synthesized ref=src/sv_user.c:1459 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Master switch for client file downloads from the server. When off, the server refuses every client download request -- the per-type download settings (skins, models, sounds, maps, demos, other) have no effect while this is off; it must be on for any of them to apply.
>
> 0 = block all downloads from this server.
> 1 = allow downloads, subject to the per-type settings.
>
> Default: 1.
> Set by: server config.
> See also: allow_download_maps, allow_download_models, allow_download_other.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| global gate, off=block | src/sv_user.c:1459 | `else if (!(int)allow_download.value)` -> `allow_dl = false; // global allow check` | MATCH |
| polarity: !allow_dl denies | src/sv_user.c:1480 | `if (!allow_dl) goto deny_download;` | MATCH |
| per-type settings dead when off (same else-if chain) | src/sv_user.c:1459-1478 | `else if (!(int)allow_download.value) allow_dl=false;` is first branch; per-type branches (1468/1470/1472/1474/1476/1478) only reached when this is non-zero | MATCH |
| default 1 | src/sv_main.c:106 | `cvar_t allow_download = {"allow_download", "1"};` | MATCH |
| set by server config (plain cvar, no flags) | src/sv_main.c:106 | `cvar_t allow_download = {"allow_download", "1"};` (no CVAR_* flag arg) | MATCH |
| download cmd is client-issued, not admin | src/sv_user.c:3323 | `{"download", Cmd_Download_f, false},` | MATCH |
| F-MV1: no KTX override | ktx/src/commands.c | no `allow_download`/`download` cvar/cmd; only `race_dl_record_demo` (1025) | MATCH (moot) |

## Independent V-pass (cold context; given knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Master switch for client file downloads from the server" (it sits above the per-type checks as the global gate) | src/sv_user.c:1459-1460 | `else if (!(int)allow_download.value)` / `allow_dl = false; // global allow check` | MATCH |
| 2 | OFF-state: "When off, the server refuses every client download request" | src/sv_user.c:1459-1460, 1480-1481 | `else if (!(int)allow_download.value)` / `allow_dl = false;` ... `if (!allow_dl)` / `goto deny_download;` | MATCH (caveat: techlogin override) |
| 3 | Side-effect/scope: per-type settings (skins, models, sounds, maps, demos, other) have NO effect while off; must be on for any to apply | src/sv_user.c:1459 (short-circuit) + 1467-1478 | `else if (!(int)allow_download.value) allow_dl = false;` precedes per-type arms: `else if (!strncmp(name, "skins/", 6)) allow_dl = allow_download_skins.value;` ... `else allow_dl = allow_download_other.value;` — the per-type cvars are read ONLY in the `else` reached when allow_download is truthy | MATCH |
| 4 | "0 = block all downloads from this server" | src/sv_user.c:1459-1460, 1480-1481 | `else if (!(int)allow_download.value)` (true when value==0) -> `allow_dl = false;` -> `if (!allow_dl) goto deny_download;` | MATCH (caveat: techlogin override) |
| 5 | "1 = allow downloads, subject to the per-type settings" | src/sv_user.c:1459 -> 1465-1478 | when `allow_download.value` truthy, the `else if (!(int)allow_download.value)` is false so control falls through to per-type branches that set `allow_dl = allow_download_<type>.value` | MATCH |
| 6 | Default: 1 | src/sv_main.c:106 (+ register 3535) | `cvar_t allow_download = {"allow_download", "1"};` / `Cvar_Register (&allow_download);` | MATCH |
| 7 | Set by: server config | src/sv_main.c:106, 3535 (SV_InitLocal) | plain `cvar_t` struct, no flags (no CVAR_SERVERINFO etc.); registered server-side in SV_InitLocal | MATCH |

**V-pass notes:** Oracle verified: mvdsv describe --tags == 1.11-53-g18d0362. Enforcement chain fully traced in Cmd_Download_f (src/sv_user.c:1414-1481), registration in src/sv_main.c:106/3535.

All 7 clauses map to located enforcing lines and MATCH. The load-bearing side-effect clause (per-type settings inert while off; on required for any to apply) is exactly enforced by the if/else-if short-circuit ordering: line 1459's `else if (!(int)allow_download.value) allow_dl=false;` precedes every per-type branch (1467-1478), so when allow_download is 0 the per-type cvars (allow_download_skins/models[progs/]/sounds/maps/demos/other) are never read; they are consulted ONLY in the `else` arms reached when allow_download is truthy. The listed six types match lines 1467-1478 exactly.

ONE NOTED CAVEAT (does not change classification): the absolute phrasings "refuses EVERY client download request" (clause 2) and "block ALL downloads" (clause 4) have a single carve-out at sv_user.c:1457-1458 — `if (sv_client->special) allow_dl = true;` precedes the global gate. `sv_client->special` is the techlogin flag, set true ONLY after `Master_Rcon_Validate()` succeeds (sv_user.c:2221), with inline comment "user used techlogin, allow dl anything in quake dir in such case!". This is an rcon-authenticated admin escape hatch, not an ordinary client download, so it does not contradict a user-doc whose scope is the normal client-download path. For every ordinary (non-rcon) client the OFF-state and 0/1 polarity claims are precisely correct. Verdict held at TRACED-CLEAN; the techlogin carve-out is admin-path trivia a user-facing description of this knob need not enumerate.

Secondary observations (not clauses in the description, no action): allow_download_pakmaps (a further .pak-map sub-restriction at sv_user.c:1556, also gated downstream of the master switch) is correctly NOT in the description's per-type list. allow_download_other has registered default 0 (sv_main.c:113), unlike the other per-type cvars which default 1 — not asserted by this description so out of scope here.

## Gate log (orchestrator / MAIN session)

- **F-D6a (fabrication check):** source_ref `src/sv_user.c:1459` verified against live source -- line exists and reads `allow_download`. PASS.
- **HG1 (canary):** the wave's planted canary `allow_download_skins` (deliberately inverted-polarity description) was correctly flagged `C-FIX` (ground truth C-FIX) -- the cold V-pass is not rubber-stamping. PASS.
- **HG2 (re-grep V-pass nuance, both directions):** V-pass edge-case observations re-checked against source (src/sv_user.c:1457-1481); confirmed accurate; row correctly held TRACED-CLEAN (nuances were completeness notes, not contradictions). PASS.

## Notes / refinement

- No post-V-pass refinement; shipped as synthesized.

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "allow_download",
  "type": "cvar",
  "description": "Master switch for client file downloads from the server. When off, the server refuses every client download request -- the per-type download settings (skins, models, sounds, maps, demos, other) have no effect while this is off; it must be on for any of them to apply.\n\n0 = block all downloads from this server.\n1 = allow downloads, subject to the per-type settings.\n\nDefault: 1.\nSet by: server config.\nSee also: allow_download_maps, allow_download_models, allow_download_other.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1459. Cold synth (description NULL). Registration sv_main.c:106 cvar_t allow_download={\"allow_download\",\"1\"} is LOCATOR only (TRAP2); enforcement is in src/sv_user.c Cmd_Download_f. Per-clause enforce-trace: (1) Global gate + polarity -- sv_user.c:1459-1460 `else if (!(int)allow_download.value) allow_dl=false; // global allow check`; resolves to denial at sv_user.c:1480 `if (!allow_dl) goto deny_download;` so 0=>block, non-zero=>allow. (2) 'must be on for per-type to apply' -- the allow_download check is the FIRST branch of an if/else-if chain (sv_user.c:1459-1478); when allow_download.value is 0 the chain sets allow_dl=false and short-circuits, so the per-type branches (skins 1468, models 1470, sounds 1472, maps 1474, demos 1476, other 1478) are never evaluated; thus this is the master switch -- action-changing context kept inline per D20. (3) Default -- WI-2 registered literal sv_main.c:106 = \"1\". (4) Set-by -- plain cvar_t with no CVAR_* flags (sv_main.c:106), settable from server console/config; the 'download' protocol command itself (registration sv_user.c:3323 {\"download\",Cmd_Download_f,false}) is client-issued, so the admin sets the cvar, not the command. Note: a techlogin/'special' client bypasses this gate (sv_user.c:1457-1458, special set at sv_user.c:2221) -- admin-bypass, not user-doc behavior, so omitted. F-MV1: KTX has no allow_download override (only unrelated race_dl_record_demo, ktx commands.c:1025) -- moot as expected.",
  "description_proposed": null
}
```
