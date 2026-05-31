# D6 ledger -- mvdsv `sv_demoDirAlt`

- **Skill:** describe-fill-synthesis (Opus 4.7 MAX, locked dial)
- **Project / knob / type:** mvdsv / `sv_demoDirAlt` / cvar
- **Anchor version:** `1.11-53-g18d0362` (HARD GATE: `git describe --tags` == anchor -- PASS)
- **mechanical_candidate:** none (cold-synth; no trailing comment, no shipped-config candidate)
- **suspect_pool_member:** FALSE (Step 2 C3 not applicable)
- **Verdict:** `synthesized` -- confidence `high`

## Source identity (locator aids -> confirmed)

- C variable: `sv_demoDirAlt` (same letter-case as the L1 name).
- Registered name string: `"sv_demoDirAlt"` -- `src/sv_demo.c:39`. Matches L1 exactly.
- Registered default: `""` (empty) -- the bare `cvar_t` literal `{"sv_demoDirAlt", "", 0, sv_demoDir_OnChange}`. WI-2 satisfied: empty literal is the registered default; there is no shipped-cfg drift datum to confuse it with.
- Registration call: `src/sv_demo.c:1850` `Cvar_Register (&sv_demoDirAlt);` (plain cvar; no CF flags, not a command -> set by server config).
- OnChange handler: `sv_demoDir_OnChange` (`src/sv_demo.c:61-76`), SHARED with `sv_demoDir`.

The `sv_demo.c:39` registration is a LOCATOR ONLY. The citation lives at the READ use-sites below.

## Read use-sites (Step 1)

Whole-tree grep (case-insensitive, `src/**` `.c`/`.h`) for `demoDirAlt` / `demo_dir_alt` / `demodiralt` / `DirAlt` returned exactly: the declaration (`sv_demo.c:39`), the registration (`sv_demo.c:1850`), the extern (`server.h:991`), and two READ consumers -- `sv_user.c:1491-1494`+`1546-1547` and `central.c:296-297`. No other reads. WI-1 wide-read complete.

1. **`src/sv_user.c:1486-1547` -- client demo-download path.** When a client requests `demos/<file>` and the primary `sv_demoDir` is set (`1486`), the server builds the primary path (`1488`) and, if `sv_demoDirAlt` is non-empty (`1491`), ALSO builds an `alternative_path` from `sv_demoDirAlt` (`1492-1494`). The enforcing fallback is `1545-1547`: it opens the primary `name` first (`1545`); only `if (!sv_client->download && alternative_path[0])` (`1546` -- primary open FAILED) does it open the alternate path instead (`1547`). Observable effect: a demo missing from `sv_demoDir` is still served to the downloading client if it exists under `sv_demoDirAlt`.

2. **`src/central.c:290-297` -- central/upload demo-locate path.** When the central system asks the server to upload `demos/<file>` and `sv_demoDir` is set (`290`), the server builds `fs_gamedir/sv_demoDir/<file>` (`295`); `if (!CheckFileExists(demoName) && sv_demoDirAlt.string[0])` (`296` -- not found in primary AND alt set) it rebuilds the path under `sv_demoDirAlt` (`297`). Observable effect: a demo missing from the primary dir is located under the alternate dir for upload.

Both sites enforce the SAME semantic with the SAME polarity: the alternate dir is a FALLBACK consulted only when the file is absent from the primary `sv_demoDir`, and only when `sv_demoDir` is itself set.

## Step 3 (evaluate existing comment)

No trailing comment / no mechanical_candidate (cold-synth). Per the D5 amendment every entity is evaluated regardless; with no user-WHAT comment to affirm, route to Step 5 synthesize. Not a C3 suspect-pool member (Step 2 skipped). Not name-only (Step 1 produced two legible enforcing read-sites), so the confabulation guard does not fire.

## Step 5 enforce-trace (per-clause; all TRACED-CLEAN)

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|
| Names a secondary/alternate demo directory the server checks | `src/sv_user.c:1492` ; `src/central.c:297` | `strlcpy(alternative_path, sv_demoDirAlt.string, sizeof(alternative_path));` ; `snprintf(demoName, sizeof(demoName), "%s/%s/%s", fs_gamedir, sv_demoDirAlt.string, upload + 6);` | MATCH |
| Consulted only when the demo is NOT found in the primary `sv_demoDir` (download path) | `src/sv_user.c:1546-1547` | `if (!sv_client->download && alternative_path[0]) { sv_client->download = FS_OpenVFS(alternative_path, "rb", CLIENT_DOWNLOAD_RELATIVE_BASE); }` | MATCH -- polarity `!download` = primary open failed first |
| Consulted only when the demo is NOT found in the primary `sv_demoDir` (central/upload path) | `src/central.c:296-297` | `if (!CheckFileExists(demoName) && sv_demoDirAlt.string[0]) { snprintf(... sv_demoDirAlt.string ...); }` | MATCH -- polarity `!CheckFileExists` = primary miss first |
| Used both for serving demo downloads to clients and for locating a demo to upload | `src/sv_user.c:1545-1547` (download) ; `src/central.c:300-307` (upload via curl_formadd) | `FS_OpenVFS(alternative_path, "rb", ...)` ; `curl_formadd(..., CURLFORM_FILE, demoName, ...)` | MATCH |
| Only takes effect when primary `sv_demoDir` is also set | `src/sv_user.c:1486` ; `src/central.c:290` | `if ( !strncmp(name, "demos/", 6) && sv_demoDir.string[0])` ; `if (sv_demoDir.string[0]) {` | MATCH -- alt branch is nested inside the `sv_demoDir` set guard at both sites |
| Path is relative to the game directory | `src/central.c:297` ; `src/sv_user.c:1547` (`CLIENT_DOWNLOAD_RELATIVE_BASE` = `FS_GAME` under SERVERONLY, `sv_user.c:1539-1543`) | `"%s/%s/%s", fs_gamedir, sv_demoDirAlt.string, ...` ; `#define CLIENT_DOWNLOAD_RELATIVE_BASE FS_GAME` | MATCH |
| OFF-state: empty = no alternate dir (disabled); only `sv_demoDir` searched | `src/sv_user.c:1491` ; `src/central.c:296` ( `.string[0]` guards) + `src/sv_demo.c:63` | `if (sv_demoDirAlt.string[0])` ; `if (cvar == &sv_demoDir && !value[0]) { *cancel = true; return; }` (empty-cancel applies to `sv_demoDir` ONLY, so `sv_demoDirAlt` is permitted empty) | MATCH |
| Default: empty | `src/sv_demo.c:39` | `cvar_t  sv_demoDirAlt = {"sv_demoDirAlt", "", 0, sv_demoDir_OnChange };` | MATCH (WI-2: bare empty literal) |
| Set by: server config | `src/sv_demo.c:1850` | `Cvar_Register (&sv_demoDirAlt);` (no CF flags, not a command) | MATCH |

**Non-asserted detail (deliberately kept OUT of `description`, per D20 -- it is WHY/internals, not admin-WHAT, and is not action-changing):** the shared `sv_demoDir_OnChange` handler (`sv_demo.c:68-75`) strips a leading `..` and cancels the set if the value contains `/..` (path-traversal sanitization). This applies to both demo-dir cvars and does not change how an admin uses the alternate dir; recorded here in reasoning only, not promoted to the user doc.

**No side-effect clause** beyond the sanitization above. No cross-engine consequence: `sv_demoDirAlt` is read entirely within MVDSV (the download server path and the central/upload path); no client cvar acts on it -> no `See also: L3` needed.

## Final `description` (D20 lean shape; verbatim as emitted)

> Specifies a secondary directory the server checks for stored demos when a requested demo is not found in the primary directory (sv_demoDir). It is used both when serving demo downloads to clients and when locating a demo to upload, letting recorded demos be split across two locations. The path is relative to the game directory, and it only takes effect when sv_demoDir is also set.
>
> Empty = no secondary directory; only sv_demoDir is searched.
>
> Default: empty.
> Set by: server config.

D20 QA self-check: (1) admin-understandable without C -- yes; (2) zero file:line / function names / engine jargon in `description` -- yes (cites all confined to this ledger + `description_reasoning`); (3) OFF-state value spelled out, Default + Set-by present; (4) no cross-engine detail to route; (5) every clause enforce-traced above, cites recorded in reasoning. PASS.

## D6 record

```json
{
  "project": "mvdsv",
  "knob": "sv_demoDirAlt",
  "type": "cvar",
  "description": "Specifies a secondary directory the server checks for stored demos when a requested demo is not found in the primary directory (sv_demoDir). It is used both when serving demo downloads to clients and when locating a demo to upload, letting recorded demos be split across two locations. The path is relative to the game directory, and it only takes effect when sv_demoDir is also set.\n\nEmpty = no secondary directory; only sv_demoDir is searched.\n\nDefault: empty.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment (D5-amendment: evaluated anyway -> synthesize). Not a C3 suspect-pool member. Whole-tree grep found two read use-sites; both enforce a fallback semantic with matching polarity. Clause->enforcing cites: alt-dir-named -> src/sv_user.c:1492 + src/central.c:297; fallback-only-when-primary-miss (download) -> src/sv_user.c:1546-1547 (!sv_client->download); fallback-only-when-primary-miss (central/upload) -> src/central.c:296-297 (!CheckFileExists); used for both download-serving and upload-locating -> src/sv_user.c:1545-1547 + src/central.c:300-307; only-effective-when-sv_demoDir-set -> src/sv_user.c:1486 + src/central.c:290; path-relative-to-gamedir -> src/central.c:297 (fs_gamedir) + src/sv_user.c:1539-1543/1547 (CLIENT_DOWNLOAD_RELATIVE_BASE=FS_GAME); OFF-state empty=disabled -> src/sv_user.c:1491 + src/central.c:296 (.string[0] guards) and src/sv_demo.c:63 (empty-cancel binds to sv_demoDir only, so sv_demoDirAlt may be empty); Default empty -> src/sv_demo.c:39 (bare empty cvar_t literal, WI-2); Set-by server-config -> src/sv_demo.c:1850 Cvar_Register, no CF flags. Shared OnChange sv_demo.c:68-75 path-traversal sanitization kept in reasoning only (WHY/internal, not action-changing, D20). No cross-engine consumer -> no See also. All clauses TRACED-CLEAN; confidence high.",
  "description_proposed": null
}
```

### source_ref (authoritative read use-sites)

- Primary citation (download-serving fallback open): `src/sv_user.c:1546`
- Corroborating citation (central/upload locate fallback): `src/central.c:296`

(Registration `src/sv_demo.c:39` / `src/sv_demo.c:1850` are locator aids, NOT the citation.)
