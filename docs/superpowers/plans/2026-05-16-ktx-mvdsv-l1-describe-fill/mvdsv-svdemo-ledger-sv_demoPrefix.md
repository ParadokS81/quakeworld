# describe-fill-synthesis ledger -- mvdsv `sv_demoPrefix`

- **project:** mvdsv
- **knob:** `sv_demoPrefix` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (hard gate: `git describe --tags` confirmed exact match)
- **mechanical_candidate:** none (cold-synth -- no trailing comment, no shipped-config candidate)
- **suspect_pool_member:** FALSE (not runtime-dead)
- **verdict:** `synthesized` (origin `synthesized`, confidence `high`)

## Registered name + default (locator only -- NOT the citation)

`src/sv_demo.c:46`: `cvar_t sv_demoPrefix = {"sv_demoPrefix", ""};`

The C variable and the registered name STRING match exactly -- no case
difference. Registered default is the empty string `""`, matching the
extractor record. The `cvar_t` literal carries name + default only: no
`CVAR_*` flag field, no OnChange callback. `Cvar_Register(&sv_demoPrefix)`
at `src/sv_demo.c:1851` and the extern at `src/server.h:997` are NOT
read-sites and are NOT the citation.

## Read use-sites (Step 1 grounding)

A tree-wide grep for `sv_demoPrefix.(string|value|integer)` returns
exactly two READ sites; both read `.string`:

- **`src/sv_demo.c:1718`** -- in `SV_MVD_Record_f` (the `record <demoname>`
  command). The prefix is the first of three concatenated parts of the
  output filename: `va("%s%s%s", sv_demoPrefix.string,
  SV_CleanName((unsigned char*)Cmd_Argv(1)), sv_demoSuffix.string)`. The
  result is stored in `newname`, then composed into the on-disk path under
  `sv_demoDir` (`:1723`) and written as the `.mvd` demo file.
- **`src/sv_demo.c:1804-1805`** -- in `SV_MVDEasyRecord_f` (the
  `easyrecord [demoname]` command). The same `va("%s%s%s",
  sv_demoPrefix.string, SV_CleanName((unsigned char*)name),
  sv_demoSuffix.string)` composition is applied to the auto-generated
  (duel/teamplay/ffa) name before it is written to disk.

In both sites the prefix is concatenated RAW as the leading segment;
`SV_CleanName` wraps only the base-name argument (`Cmd_Argv(1)` / `name`),
never `sv_demoPrefix.string`.

## Per-clause enforce-trace table (B1)

| Clause | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|
| Value is text prepended to the start of a recorded demo's filename | `src/sv_demo.c:1718` | `va("%s%s%s", sv_demoPrefix.string, SV_CleanName((unsigned char*)Cmd_Argv(1)), sv_demoSuffix.string)` | MATCH -- prefix is first `%s`, ahead of cleaned name + suffix; result -> `newname` -> demo filename |
| Same prepend applies to the `easyrecord` auto-built name | `src/sv_demo.c:1804-1805` | `va("%s%s%s", sv_demoPrefix.string, SV_CleanName((unsigned char*)name), sv_demoSuffix.string)` | MATCH -- identical composition for the auto-generated name |
| Prefix is added verbatim (not sanitized; only the base name is cleaned) | `src/sv_demo.c:1718`, `1805` | `SV_CleanName(...)` wraps only `Cmd_Argv(1)` / `name`, not `sv_demoPrefix.string` | MATCH -- prefix passed raw |
| OFF-state: empty default => no prefix added | `src/sv_demo.c:46` | `cvar_t sv_demoPrefix = {"sv_demoPrefix", ""};` | MATCH -- registered default `""`; empty leading `%s` contributes nothing to the name |
| Default value is the empty string (WI-2: registered default, not a cfg value) | `src/sv_demo.c:46` | `{"sv_demoPrefix", ""}` | MATCH -- registered literal is `""` |
| Set-by: plain server cvar (no special flags), settable from server config / console | `src/sv_demo.c:46` + `src/sv_demo.c:1851` | `{"sv_demoPrefix", ""}` (no `CVAR_*` flag, no OnChange) + `Cvar_Register(&sv_demoPrefix)` | MATCH -- ordinary server-side cvar; no userinfo/serverinfo/ROM flag |

Every material clause maps to a located, verified enforcing line including
the registration literal and its (absent) flag field. Would classify
**TRACED-CLEAN**. No clause is derived from the knob name alone, an enum,
a string, or a comment.

## Verdict rationale

Cold-synth (D5 amendment: every entity is evaluated even with no comment /
candidate). No trailing comment exists to affirm, so the affirm path is
not reachable; the knob is fully source-legible from the two `.string`
read-sites, so it is neither hedged nor residue-routed and is not a
suspect-pool member. Verdict `synthesized`, confidence `high`. Description
authored in the lean D20 shape: 1-line WHAT + OFF-state + Default + Set-by,
mechanism-only, no file:line / engine jargon in the user doc (those cites
are confined to `description_reasoning`). `description_provenance` stays
`null` per operator clarification 2026-05-30 (cold-synth has no retained
shipped-doc DATA; grounding is `source_ref` + anchor + reasoning cites).

## Human-readable description

> Text added to the start of the filename of every demo the server
> records. The prefix is placed before the demo's base name (with
> sv_demoSuffix added after it), so it is a fixed label at the front of
> each saved .mvd file. The value is used exactly as entered.
>
> Default: empty (no prefix is added).
> Set by: server config / console.

## D6Record

```json
{
  "project": "mvdsv",
  "knob": "sv_demoPrefix",
  "type": "cvar",
  "description": "Text added to the start of the filename of every demo the server records. The prefix is placed before the demo's base name (with sv_demoSuffix added after it), so it is a fixed label at the front of each saved .mvd file. The value is used exactly as entered.\n\nDefault: empty (no prefix is added).\nSet by: server config / console.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment to affirm; D5-amendment evaluate-anyway. Clauses -> enforcing cites: prepend-to-filename -> src/sv_demo.c:1718 (record path) + src/sv_demo.c:1804-1805 (easyrecord path), prefix is first arg of va(\"%s%s%s\", sv_demoPrefix.string, SV_CleanName(base), sv_demoSuffix.string); added-verbatim (only base name passed through SV_CleanName, prefix raw) -> same lines; OFF-state/default empty -> registered literal src/sv_demo.c:46 {\"sv_demoPrefix\", \"\"} (WI-2 registered default, not a cfg value); Set-by plain server cvar -> src/sv_demo.c:46 has no CVAR_* flag / no OnChange + Cvar_Register at src/sv_demo.c:1851. All clauses TRACED-CLEAN; none name/enum/string/comment-only. Not suspect-pool (FALSE). Confidence high.",
  "description_proposed": null
}
```
