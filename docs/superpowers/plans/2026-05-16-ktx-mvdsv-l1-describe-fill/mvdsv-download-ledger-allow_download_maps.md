# describe-fill-synthesis ledger -- mvdsv `allow_download_maps`

- **project:** mvdsv
- **knob:** `allow_download_maps` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE verified: `git -C research/repos/mvdsv describe --tags` == `1.11-53-g18d0362`)
- **mechanical_candidate:** none -- cold-synth (description was NULL)
- **suspect_pool_member:** FALSE
- **verdict:** `synthesized` -- high confidence; every clause enforce-traced; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow pilot `mvdsv-describe-fill-pilot` -- 1 synthesis worker + independent cold V-pass; F-D6a + HG1 canary + HG2 gates passed (see Gate log)

## Halt verdict

```
mvdsv:allow_download_maps: synthesized -- gates client downloads of maps/ files; effect only while allow_download on; enforced in Cmd_Download_f not at registration -- origin=synthesized ref=src/sv_user.c:1474 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether clients may download map files (the maps/ folder) from the server. Has effect only while allow_download is on.
>
> 0 = block map downloads.
> 1 = allow clients to download maps from this server.
>
> Default: 1.
> Set by: server config.
> See also: allow_download, allow_download_pakmaps, allow_download_other.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| scope = maps/ path | src/sv_user.c:1473-1474 | `else if (!strncmp(name, "maps/", 5))` -> `allow_dl = allow_download_maps.value; // maps` | MATCH |
| polarity: !allow_dl denies | src/sv_user.c:1480 | `if (!allow_dl) goto deny_download;` | MATCH |
| effect only when allow_download on (else-if chain) | src/sv_user.c:1459 | first branch `else if (!(int)allow_download.value) allow_dl=false;` short-circuits chain when off | MATCH |
| default 1 | src/sv_main.c:110 | `cvar_t allow_download_maps = {"allow_download_maps", "1"};` | MATCH |
| set by server config (plain cvar) | src/sv_main.c:110 | `cvar_t allow_download_maps = {"allow_download_maps", "1"};` (no CVAR_* flag) | MATCH |
| pakmaps handled by a different cvar (out of scope) | src/sv_user.c:1556 | `... && !(int)allow_download_pakmaps.value) { ... goto deny_download; }` | MATCH (scoped out) |
| F-MV1: no KTX override | ktx/src/commands.c | absent | MATCH (moot) |

## Independent V-pass (cold context; given knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Subject: controls client download of map files (the maps/ folder) | src/sv_user.c:1473-1474 | `else if (!strncmp(name, "maps/", 5)) // maps` / `allow_dl = allow_download_maps.value; // maps` | MATCH |
| 2 | Has effect only while allow_download is on | src/sv_user.c:1459-1460 (vs 1473 in same if/else-if chain) | `else if (!(int)allow_download.value)` / `allow_dl = false; // global allow check` | MATCH |
| 3 | 0 = block map downloads | src/sv_user.c:1474 + 1480-1481 | `allow_dl = allow_download_maps.value;` then `if (!allow_dl) goto deny_download;` | MATCH |
| 4 | 1 = allow clients to download maps | src/sv_user.c:1474 + 1480 | `allow_dl = allow_download_maps.value;` (1 -> allow_dl true -> deny at 1480 skipped) | MATCH |
| 5 | Default: 1 | src/sv_main.c:110 (registered via Cvar_Register at sv_main.c:3539) | `cvar_t allow_download_maps = {"allow_download_maps", "1"};` | MATCH |
| 6 | Set by: server config | src/sv_main.c:110 (plain cvar_t, no flags field set) | `{"allow_download_maps", "1"}` -- flags=0, no CVAR_USERINFO/serverinfo, no in-game command path | MATCH |
| 7 | See also targets exist (allow_download, allow_download_other) | src/sv_main.c:106, :113 | `cvar_t allow_download = {"allow_download", "1"};` / `cvar_t allow_download_other = {"allow_download_other", "0"};` | MATCH |

**V-pass notes:** Version confirmed: git describe == 1.11-53-g18d0362. Wide-grep found exactly one `.value` read-site of allow_download_maps (sv_user.c:1474) and one registration (sv_main.c:110 + Cvar_Register at sv_main.c:3539); no other independent enforcing path exists, so the allow_download-dependency clause is fully sound.

CLAUSE 2 (the load-bearing one) verified structurally: lines 1457-1478 form a single if / else-if chain. The maps/ branch (1473-1474) is only reachable if every prior else-if condition was false -- including `!(int)allow_download.value` at 1459. Therefore when allow_download==0 (and the client is not techlogin-`special`), control sets allow_dl=false at 1460 and the maps/ branch is never evaluated. allow_download_maps has effect ONLY when allow_download is non-zero. MATCH. (The `sv_client->special` techlogin bypass at 1457 also short-circuits both cvars, but that is an override that makes allow_download_maps irrelevant too -- it does not falsify "effect only while allow_download is on" for the normal-client path, and the description makes no special-client claim.)

CLAUSE 5 / WI-2: "Default: 1" verified against the REGISTERED cvar_t string initializer `{"allow_download_maps", "1"}` (sv_main.c:110), the value Cvar_Register parses -- not a shipped-cfg value. PASS.

CLAUSE 6 / WI-2: "Set by: server config" -- cvar_t struct (cvar.h:66-75) has a `flags` field; the initializer leaves it 0, so allow_download_maps carries no CVAR_USERINFO/serverinfo/archive flag and has no rcon-command or in-game setter path beyond normal cvar set. Plain server cvar. PASS.

NON-CONTRADICTING COMPLETENESS NOTE (not a defect, no fix required): the "1 = allow" path has one additional narrower gate the description omits. At sv_user.c:1554-1559, for non-techlogin clients, a map that resolves to a copy-protected .pak file (VFS_COPYPROTECTED, vfs.h:114) is additionally denied when allow_download_pakmaps==0 (allow_download_pakmaps defaults 1, sv_main.c:111). The source comment at sv_user.c:1473 itself flags this ("note usage of allow_download_pakmaps a bit below"). This is a separate cvar's gate, not an allow_download_maps behavior, and the description asserts no unconditional/all-maps claim -- so it is a completeness omission a fuller "See also" could mention (allow_download_pakmaps), NOT a polarity/threshold/scope contradiction. Per PROC-1 this is a judgment-level presentation note, surfaced but not counted against the row.

Every material clause (polarity, threshold, default, scope, OFF-state, dependency, set-by) maps to a located, verified enforcing line incl. adjacent comments. No flavour-C clause (no claim sourced only from the knob name / enum / string / comment without an enforcing read-site). Classification: TRACED-CLEAN.

## Gate log (orchestrator / MAIN session)

- **F-D6a (fabrication check):** source_ref `src/sv_user.c:1474` verified against live source -- line exists and reads `allow_download_maps`. PASS.
- **HG1 (canary):** the wave's planted canary `allow_download_skins` (deliberately inverted-polarity description) was correctly flagged `C-FIX` (ground truth C-FIX) -- the cold V-pass is not rubber-stamping. PASS.
- **HG2 (re-grep V-pass nuance, both directions):** V-pass edge-case observations re-checked against source (src/sv_user.c:1457-1481); confirmed accurate; row correctly held TRACED-CLEAN (nuances were completeness notes, not contradictions). PASS.

## Notes / refinement

Operator-approved refinement (post-V-pass): added allow_download_pakmaps to See-also. The V-pass surfaced that allow_download_pakmaps adds a narrower gate blocking copy-protected / .pak-sourced maps for non-techlogin clients (src/sv_user.c:1556); it is a separate cvar, so this is a See-also pointer, not an inline behavior change. Row classified TRACED-CLEAN.

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "allow_download_maps",
  "type": "cvar",
  "description": "Controls whether clients may download map files (the maps/ folder) from the server. Has effect only while allow_download is on.\n\n0 = block map downloads.\n1 = allow clients to download maps from this server.\n\nDefault: 1.\nSet by: server config.\nSee also: allow_download, allow_download_pakmaps, allow_download_other.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1474. Cold synth (description NULL). Registration sv_main.c:110 cvar_t allow_download_maps={\"allow_download_maps\",\"1\"} is LOCATOR only (TRAP2); enforcement in src/sv_user.c Cmd_Download_f. Per-clause enforce-trace: (1) Scope = maps/ path -- sv_user.c:1473-1474 `else if (!strncmp(name, \"maps/\", 5)) allow_dl = allow_download_maps.value; // maps`; the file-name prefix matched is literally \"maps/\". (2) Polarity -- value assigned to allow_dl, then sv_user.c:1480 `if (!allow_dl) goto deny_download;` => 0=block, non-zero=allow. (3) Gated under allow_download -- this is a later branch of the same if/else-if chain whose first branch (sv_user.c:1459) denies and short-circuits when allow_download is 0, so the maps branch is only evaluated when allow_download is on (action-changing dependency kept inline per D20). (4) Default -- WI-2 registered literal sv_main.c:110 = \"1\". (5) Set-by -- plain cvar_t no flags (sv_main.c:110), server console/config. Adjacent nuance NOT claimed in user doc: a separate cvar allow_download_pakmaps additionally blocks copy-protected/.pak-sourced maps for non-techlogin clients (sv_user.c:1556) -- that is allow_download_pakmaps' behavior, out of scope for this knob; techlogin/'special' clients bypass (sv_user.c:1457-1458). F-MV1: no KTX override (moot). [Operator-approved refinement (post-V-pass): added allow_download_pakmaps to See-also. The V-pass surfaced that allow_download_pakmaps adds a narrower gate blocking copy-protected / .pak-sourced maps for non-techlogin clients (src/sv_user.c:1556); it is a separate cvar, so this is a See-also pointer, not an inline behavior change. Row classified TRACED-CLEAN.]",
  "description_proposed": null
}
```
