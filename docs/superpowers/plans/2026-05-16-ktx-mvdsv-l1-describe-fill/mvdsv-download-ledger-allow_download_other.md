# describe-fill-synthesis ledger -- mvdsv `allow_download_other`

- **project:** mvdsv
- **knob:** `allow_download_other` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE verified: `git -C research/repos/mvdsv describe --tags` == `1.11-53-g18d0362`)
- **mechanical_candidate:** none -- cold-synth (description was NULL)
- **suspect_pool_member:** FALSE
- **verdict:** `synthesized` -- high confidence; every clause enforce-traced; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow pilot `mvdsv-describe-fill-pilot` -- 1 synthesis worker + independent cold V-pass; F-D6a + HG1 canary + HG2 gates passed (see Gate log)

## Halt verdict

```
mvdsv:allow_download_other: synthesized -- catch-all gate for client downloads not matching skins/models/sounds/maps/demos; default off; effect only while allow_download on; enforced in Cmd_Download_f not at registration -- origin=synthesized ref=src/sv_user.c:1478 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether clients may download files that are not skins, models, sounds, maps, or demos -- any other file located in a subdirectory on the server. Has effect only while allow_download is on.
>
> 0 = block these other downloads.
> 1 = allow clients to download other files from this server.
>
> Default: 0.
> Set by: server config.
> See also: allow_download, allow_download_maps, allow_download_models.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| scope = catch-all else (not skins/models/sounds/maps/demos) | src/sv_user.c:1477-1478 | `else` -> `allow_dl = allow_download_other.value; // all other stuff` (terminal else after 1467/1469/1471/1473/1475) | MATCH |
| polarity: !allow_dl denies | src/sv_user.c:1480 | `if (!allow_dl) goto deny_download;` | MATCH |
| default 0 (off by default => blocked) | src/sv_main.c:113 | `cvar_t allow_download_other = {"allow_download_other", "0"};` | MATCH |
| effect only when allow_download on (else-if chain) | src/sv_user.c:1459 | first branch `else if (!(int)allow_download.value) allow_dl=false;` short-circuits chain when off | MATCH |
| set by server config (plain cvar) | src/sv_main.c:113 | `cvar_t allow_download_other = {"allow_download_other", "0"};` (no CVAR_* flag) | MATCH |
| no-subdir files rejected before this branch | src/sv_user.c:1465-1466 | `else if (!strstr(name, "/")) allow_dl = false; // should be in subdir` | MATCH |
| F-MV1: no KTX override | ktx/src/commands.c | absent | MATCH (moot) |

## Independent V-pass (cold context; given knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| A | Governs files that are NOT skins/models/sounds/maps/demos -- the residual "other" bucket | src/sv_user.c:1477-1478 | `else` / `allow_dl = allow_download_other.value; // all other stuff` | MATCH -- fall-through `else` after explicit `skins/`(1467), `progs/`=models(1469), `sound/`(1471), `maps/`(1473), `demos/`+`demonum/`(1475) prefix checks |
| B | Has effect only while allow_download is on | src/sv_user.c:1459-1460 | `else if (!(int)allow_download.value)` / `allow_dl = false; // global allow check` | MATCH -- global gate sits ABOVE the prefix ladder; if allow_download==0 the function denies at 1480-1481 and never reaches line 1478. (Edge: techlogin client at 1457-1458 `sv_client->special` short-circuits BOTH cvars to allow -- separate admin override, not a contradiction.) |
| C | 0 = block these downloads | src/sv_user.c:1480-1481 | `if (!allow_dl)` / `goto deny_download;` | MATCH -- value 0 -> allow_dl false -> deny |
| C2 | 1 = allow other downloads | src/sv_user.c:1478, 1480 | `allow_dl = allow_download_other.value;` ... `if (!allow_dl)` | MATCH -- nonzero value -> allow_dl true -> proceeds past deny gate |
| D | Default: 0 | src/sv_main.c:113 | `cvar_t allow_download_other = {"allow_download_other", "0"};` | MATCH -- registered default string "0"; plain `Cvar_Register(&allow_download_other)` at sv_main.c:3542, no override |
| E | Set by: server config | src/sv_main.c:113, 3542 | struct init `{"allow_download_other", "0"}` (no flags field) + `Cvar_Register (&allow_download_other);` | MATCH -- server-side cvar, no CVAR_SERVERINFO / CVAR_ROM / OnChange (cf. `sys_command_line` CVAR_ROM at line 99); settable from server console/config, not client-pushed |
| F | See also: allow_download, allow_download_maps, allow_download_models | src/sv_main.c:106, 108, 110 | `allow_download = {"allow_download","1"}`; `allow_download_models = {...,"1"}`; `allow_download_maps = {...,"1"}` | MATCH -- all three siblings exist and gate the same `Cmd_Download_f` ladder |

**V-pass notes:** Oracle confirmed at mvdsv 1.11-53-g18d0362. Wide-grep returned exactly 4 use-sites: extern decl (sv_user.c:1425), the sole enforcement read (sv_user.c:1478), registration struct (sv_main.c:113), Cvar_Register (sv_main.c:3542). A tree-wide --include=*.c/*.h grep confirmed NO additional read-sites (no second/HTTP/FTE download path consumes the value). The single enforcing gate is the exclusive if/else-if/else ladder in Cmd_Download_f (sv_user.c:1457-1481).

Every material clause traced to a verified enforcing line; all MATCH. Polarity, default (registered "0", not a shipped-cfg value), allow_download dependency, residual-bucket scope, and set-by classification all confirmed against actual code + adjacent comments.

Two precision nuances surfaced during the trace that the description does NOT mis-assert and that do NOT contradict any clause (so they remain TRACED-CLEAN, not C-NEAR-MISS):
1. Techlogin override (sv_user.c:1457-1458): `if (sv_client->special) allow_dl = true;` short-circuits the ENTIRE ladder, so a techlogin client bypasses both allow_download and allow_download_other. This is a separate admin mechanism, orthogonal to the cvar's user-doc.
2. Two carve-outs sit above the `else`: csprogs.dat is force-allowed under #ifdef FTE_PEXT_CSQC (1462-1463), and a name with no `/` is denied at 1465 ("should be in subdir"). So "any other file type" is, strictly, "any other file in a subdirectory, excluding csprogs.dat when FTE_PEXT_CSQC is compiled." The description's residual-bucket framing is substantively correct; these are edge refinements, not wrong-polarity/threshold/scope errors. If the synthesis pipeline wants maximal precision an optional one-clause tightening ("...other files located in a subdirectory") would capture nuance #2's no-slash deny, but it is not required for a clean classification.

## Gate log (orchestrator / MAIN session)

- **F-D6a (fabrication check):** source_ref `src/sv_user.c:1478` verified against live source -- line exists and reads `allow_download_other`. PASS.
- **HG1 (canary):** the wave's planted canary `allow_download_skins` (deliberately inverted-polarity description) was correctly flagged `C-FIX` (ground truth C-FIX) -- the cold V-pass is not rubber-stamping. PASS.
- **HG2 (re-grep V-pass nuance, both directions):** V-pass edge-case observations re-checked against source (src/sv_user.c:1457-1481); confirmed accurate; row correctly held TRACED-CLEAN (nuances were completeness notes, not contradictions). PASS.

## Notes / refinement

Operator-approved refinement (post-V-pass): tightened "any other file type the server is asked for" to "any other file located in a subdirectory on the server". A slash-less filename is denied upstream at src/sv_user.c:1465-1466 ("should be in subdir") before reaching the catch-all else, so this cvar only governs subdir-qualified files. Row classified TRACED-CLEAN.

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "allow_download_other",
  "type": "cvar",
  "description": "Controls whether clients may download files that are not skins, models, sounds, maps, or demos -- any other file located in a subdirectory on the server. Has effect only while allow_download is on.\n\n0 = block these other downloads.\n1 = allow clients to download other files from this server.\n\nDefault: 0.\nSet by: server config.\nSee also: allow_download, allow_download_maps, allow_download_models.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1478. Cold synth (description NULL). Registration sv_main.c:113 cvar_t allow_download_other={\"allow_download_other\",\"0\"} is LOCATOR only (TRAP2); enforcement in src/sv_user.c Cmd_Download_f. Per-clause enforce-trace: (1) Scope = catch-all -- sv_user.c:1477-1478 is the terminal `else` of the path-prefix if/else-if chain: `else allow_dl = allow_download_other.value; // all other stuff`; it is reached only for names that did NOT match skins/ (1467), progs/ (1469), sound/ (1471), maps/ (1473), or demos//demonum/ (1475), hence 'any other file type'. (2) Polarity -- assigned to allow_dl then sv_user.c:1480 `if (!allow_dl) goto deny_download;` => 0=block, non-zero=allow. (3) OFF-by-default meaning -- registered default is 0, so out of the box these other downloads are blocked; stated as Default 0. WI-2 registered literal sv_main.c:113 = \"0\" (the one knob in this batch defaulting off). (4) Gated under allow_download -- terminal else of the same chain whose first branch (sv_user.c:1459) short-circuits when allow_download is 0, so reached only when allow_download is on (action-changing dependency, inline per D20). (5) Set-by -- plain cvar_t no flags (sv_main.c:113), server console/config. Note: a request with no '/' is rejected earlier (sv_user.c:1465-1466 'should be in subdir') before reaching this else, so 'other' covers subdir'd files outside the named categories; techlogin/'special' clients bypass (sv_user.c:1457-1458). F-MV1: no KTX override (moot). [Operator-approved refinement (post-V-pass): tightened \"any other file type the server is asked for\" to \"any other file located in a subdirectory on the server\". A slash-less filename is denied upstream at src/sv_user.c:1465-1466 (\"should be in subdir\") before reaching the catch-all else, so this cvar only governs subdir-qualified files. Row classified TRACED-CLEAN.]",
  "description_proposed": null
}
```
