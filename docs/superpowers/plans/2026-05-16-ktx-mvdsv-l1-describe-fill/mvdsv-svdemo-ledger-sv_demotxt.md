# MVDSV L1 describe-fill ledger -- `sv_demotxt`

- **Project:** mvdsv
- **Knob:** `sv_demotxt` (cvar)
- **Anchor version:** `1.11-53-g18d0362` (`git describe --tags` verified before tracing)
- **Mechanical candidate:** none (cold-synth; no trailing comment, no shipped-config candidate)
- **Suspect-pool member:** FALSE (verified vs Phase-0 C3 pool; not runtime-dead)
- **Skill verdict:** `synthesized` (confidence `high`)
- **V-pass self-classification:** TRACED-CLEAN (every material clause -- including the three value branches 0/1/2 -- maps to a located, verified enforcing line incl. branch + content callee)

## Registration / locator facts (NOT the citation)

- C variable + registered name STRING are identical case: `cvar_t sv_demotxt = {"sv_demotxt", "1"};` at `src/sv_demo.c:48`. No letter-case divergence between the C symbol and the registered name.
- The initializer is a two-field literal `{"sv_demotxt", "1"}` -- no `CVAR_SERVERINFO` / `CVAR_ROM` / any flag -> ordinary server-side cvar, settable from server config / console (not published in serverinfo, not read-only).
- Registered default literal: `"1"` (matches extractor-recorded default `1`).
- `Cvar_Register(&sv_demotxt)` at `src/sv_demo.c:1855` -- registration locator only, not the behavior citation.
- `extern cvar_t sv_demotxt;` at `src/server.h:999`.

## Read use-sites (Step 1 -- the synthesis input)

Tree-wide grep (`-rn`) for `sv_demotxt`/`demotxt` over `src/` returns the declaration (`sv_demo.c:48`), the extern (`server.h:999`), the registration (`sv_demo.c:1855`), and the following value READ sites:

1. **`src/sv_demo.c:863`** -- `if ((int)sv_demotxt.value)` inside `SV_InitRecordFile` (the record-start path). Gates whether a `.txt` companion is created when recording begins.
2. **`src/sv_demo.c:868`** -- `if (sv_demotxt.value == 2)` -- inner branch selecting empty-file vs full-content at record start.
3. **`src/sv_demo_misc.c:165`** -- `if ((int)sv_demotxt.value)` inside `SV_DirSizeCheck`; when non-zero it doubles (`n <<= 1`) the old-demo cleanup count because each demo has a paired `.txt`.
4. **`src/sv_demo_misc.c:192`** -- `if ((int)sv_demotxt.value && !destroyfiles)` inside `Run_sv_demotxt_and_sv_onrecordfinish` (the record-FINISH path; called from `DestCloseAllFlush`, `sv_demo.c:307`). Gates whether the `.txt` is (re)written at finish, and not for demos being deleted.
5. **`src/sv_demo_misc.c:197`** -- `if (sv_demotxt.value == 2)` -- inner branch selecting empty-file vs full-content at record finish (mirror of site 2).

**Observable admin-facing behavior:** `sv_demotxt` controls whether the server writes a companion `.txt` file next to each recorded MVD demo, and how much that file holds. Non-zero (default `1`) writes a text summary of the match (date, map, teamplay/deathmatch/timelimit settings, and each team's players with their scores). Value `2` writes only an empty placeholder `.txt`. Value `0` writes no `.txt` and removes a pre-existing one at record start. The same value logic runs at both record-start (`sv_demo.c:863`-`882`) and record-finish (`sv_demo_misc.c:192`-`209`); the record-start path is the authoritative behavior site for the user-facing claim.

## Per-clause enforce-trace table (B1 -- MANDATORY)

| # | Clause asserted in `description` | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|---|
| 1 | Writes a companion `.txt` file alongside the recorded MVD demo (the `.txt` is the demo path with extension swapped) | `src/sv_demo.c:860`-`863` | `strlcpy(path, name, MAX_OSPATH); strlcpy(path + strlen(path) - 3, "txt", ...);` then `if ((int)sv_demotxt.value) {` | MATCH |
| 2 | The text-summary content (date, map, teamplay/deathmatch/timelimit, per-team players + scores) is what the full `.txt` holds | `src/sv_demo.c:873`-`878` + callee `src/sv_demo_misc.c:242`-`300`+ | `else if ((f = fopen (path, "w+t"))) { text = SV_PrintTeams(); fwrite(text, strlen(text), 1, f); ...}`; `SV_PrintTeams` builds `"date %s\nmap %s\nteamplay %d\ndeathmatch %d\ntimelimit %d\n"` + per-mode (duel/ffa/team) player names and `old_frags` | MATCH (callee followed per B1: content is enforced in `SV_PrintTeams`, not the caller) |
| 3 | Value `1` (any non-zero except `2`) = write the full text summary | `src/sv_demo.c:863`,`868`,`873` | outer `if ((int)sv_demotxt.value)` true AND inner `if (sv_demotxt.value == 2)` false -> falls to `else if (... "w+t")` (full-content write). The default `1` takes this path | MATCH |
| 4 | Value `2` = create an EMPTY `.txt` only (no summary written) | `src/sv_demo.c:868`-`872` | `if (sv_demotxt.value == 2) { if ((f = fopen (path, "a+t"))) fclose(f); // at least made empty file }` -- opens append-mode and immediately closes; never calls `SV_PrintTeams`/`fwrite` | MATCH |
| 5 | Value `0` (OFF) = no `.txt` written; an existing one is removed at record start | `src/sv_demo.c:881`-`882` | `else Sys_remove(path);` -- the `else` of `if ((int)sv_demotxt.value)` (i.e. value 0 / int-cast falsey); deletes the `.txt` at the demo path | MATCH (OFF-state + side-effect both enforced here) |
| 6 | Polarity / threshold: int-cast; `0` is off, any non-zero is on; `2` is the special empty-file value | `src/sv_demo.c:863`,`868` | outer gate is `(int)sv_demotxt.value` (non-zero true), inner discriminator is exact `== 2`. So the meaningful set is {0 off, 2 empty, else(=1...) full}; no other distinct branch | MATCH |
| 7 | Same behavior re-applies at record finish; deleted demos keep no `.txt` | `src/sv_demo_misc.c:192`-`209` | `if ((int)sv_demotxt.value && !destroyfiles) { ... if (sv_demotxt.value == 2) {empty} else if (...w+t) {SV_PrintTeams} }` -- mirror of the start logic; `!destroyfiles` skips it for demos being removed | MATCH (consequence kept OUT of `description` per D20; recorded here) |
| 8 | Default: 1 | `src/sv_demo.c:48` | `cvar_t sv_demotxt = {"sv_demotxt", "1"};` -- registered default `"1"` (WI-2: verified at the cvar_t literal, not a shipped cfg) | MATCH |
| 9 | Set by: server config | `src/sv_demo.c:48` | declaration carries no `CVAR_SERVERINFO`/`CVAR_ROM`/any flag -> ordinary server-side cvar set from config/console | MATCH |

Callee note (B1 callee-follow, dropquad lesson): clause 2's content is NOT visible at the caller `fwrite`; it is enforced in `SV_PrintTeams` (`src/sv_demo_misc.c:242`-`300`+), which counts spawned non-spectator clients, then writes a header line (`date`/`map`/`teamplay`/`deathmatch`/`timelimit`) and a per-mode block: duel (`player1`/`player2` with `old_frags`), FFA (`players:` list with `old_frags`), or per-team rosters. Verified by reading the function body, not inferred from its name.

WI-1 (wide read): grep covered the declaration + extern + registration + every value read. Five read sites exist (two at start `863`/`868`, three in misc `165`/`192`/`197`); the cleanup-count site `165` and the finish site `192`/`197` are the SAME value semantics applied to internal file housekeeping, not new user-facing value meanings -- they are recorded in reasoning, not asserted as separate `description` clauses (D20: no internal mechanism in the user doc). The one mediating content callee (`SV_PrintTeams`, clause 2) was followed. No "grouped elsewhere / untraced callee" residual.

WI-2 (metadata precision): default verified at the registered cvar_t literal `{"sv_demotxt", "1"}` (`sv_demo.c:48`), not a shipped `.cfg`. Access class verified by the ABSENCE of any `CVAR_` flag on the two-field initializer -> ordinary server cvar; no command-table `CF_` flag applies (this is a cvar, not a command).

## D5 rubric grading (Step 3)

Cold-synth: no trailing comment on `src/sv_demo.c:48` and `mechanical_candidate = none`, so there is nothing to affirm. Per the D5 amendment every entity is still evaluated; with no candidate text the path is straight to Step 5 synthesis. The behavior is fully source-legible at the read-sites + their inner `== 2` branch + the followed content callee, including the three distinct value branches the task flagged (0 / 1 / 2) and the `Sys_remove` OFF-state side-effect (Step 4 confabulation guard NOT triggered; no name-only inference). Result: `synthesized`, confidence `high`.

D8: not a bot/judgment knob. C2: no candidate -> no candidate-vs-source conflict. C3: suspect_pool_member FALSE -> no dead-stamp.

## D20 QA self-check (Step 5/6)

1. Admin-understandable without C code? Yes -- "write a text file with the match summary next to each recorded demo, or just an empty marker, or nothing."
2. Zero file:line / function names / engine jargon in `description`? Yes (no `SV_PrintTeams`, no `.value`, no `Sys_remove`, no `fopen`; all cites live in `description_reasoning`).
3. Values / units spelled out, Default + Set-by present? Yes (`0`/`1`/`2` meanings spelled out; Default 1; Set by server config).
4. Cross-engine detail routed to `See also:`? N/A -- behavior is entirely server-side `.txt` file construction; no client/proxy consequence to route.
5. Every clause still enforce-traced (B1), cites recorded in reasoning? Yes (table above; reasoning carries the compact cite list).

## Final human-readable description (verbatim, as emitted)

> Controls whether the server saves a companion `.txt` file next to each recorded demo, and how much it contains. The `.txt` holds a short summary of the match: date, map, the teamplay / deathmatch / timelimit settings, and each team's players with their final scores.
>
> 0 = do not save a `.txt` (and delete an existing one for that demo).
> 1 = save the full match summary.
> 2 = save an empty `.txt` only (a placeholder, no summary).
>
> Default: 1.
> Set by: server config.

## D6Record (the ONE machine-parsed json block)

```json
{
  "project": "mvdsv",
  "knob": "sv_demotxt",
  "type": "cvar",
  "description": "Controls whether the server saves a companion `.txt` file next to each recorded demo, and how much it contains. The `.txt` holds a short summary of the match: date, map, the teamplay / deathmatch / timelimit settings, and each team's players with their final scores.\n\n0 = do not save a `.txt` (and delete an existing one for that demo).\n1 = save the full match summary.\n2 = save an empty `.txt` only (a placeholder, no summary).\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment, no mechanical_candidate); D5-amendment evaluated, straight to Step 5. Three distinct value branches enforce-traced. Write-a-txt-on-record + path-built -> sv_demo.c:860-863 `if ((int)sv_demotxt.value)`; value 2 = empty placeholder -> sv_demo.c:868-872 (fopen a+t then fclose, comment 'at least made empty file', no fwrite); value 1/non-2 = full summary -> sv_demo.c:873-878 `text = SV_PrintTeams(); fwrite(...)`; summary content (date/map/teamplay/deathmatch/timelimit + per-team players & old_frags) enforced in callee SV_PrintTeams sv_demo_misc.c:242-300+ (callee followed per B1); value 0 OFF + delete-existing side-effect -> sv_demo.c:881-882 `else Sys_remove(path)`; polarity int-cast non-zero=on, exact ==2 discriminator -> sv_demo.c:863,868. Same value logic re-runs at record finish (sv_demo_misc.c:192-209, guarded by !destroyfiles) and drives old-demo cleanup-count doubling (sv_demo_misc.c:165-166 n<<=1) -- internal consequences, kept OUT of description per D20. Default 1 (WI-2 registered literal {\"sv_demotxt\",\"1\"}) -> sv_demo.c:48; Set-by server config (no CVAR_ flags on the two-field initializer) -> sv_demo.c:48. suspect_pool_member FALSE -> no C3 dead-stamp; not a D8 bot knob; no C2 conflict (no candidate). V-pass self-class TRACED-CLEAN.",
  "description_proposed": null
}
```

## source_ref (file:line)

- Behavior citation (Step 5 evidence requirement -- the authoritative read use-site, record-start path): `src/sv_demo.c:863`
- Value-`2` discriminator (same site cluster): `src/sv_demo.c:868`
- Supporting enforce-trace cites (in reasoning, not the primary source_ref): `src/sv_demo.c:860-862`, `:873-878`, `:881-882`, `:48`; content callee `src/sv_demo_misc.c:242-300`; finish-path mirror `src/sv_demo_misc.c:192-209`; cleanup-count consequence `src/sv_demo_misc.c:165-166`.
