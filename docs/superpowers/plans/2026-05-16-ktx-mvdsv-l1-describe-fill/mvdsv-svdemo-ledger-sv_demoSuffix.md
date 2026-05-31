# describe-fill-synthesis ledger -- mvdsv `sv_demoSuffix`

- **project:** mvdsv
- **knob:** `sv_demoSuffix` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (hard gate: `git describe --tags` confirmed exact match)
- **mechanical_candidate:** none (cold-synth -- no trailing comment, no shipped-config candidate)
- **suspect_pool_member:** FALSE (not runtime-dead)
- **verdict:** `synthesized` (origin `synthesized`, confidence `high`)

## Registered name + default (locator only -- NOT the citation)

`src/sv_demo.c:47`: `cvar_t sv_demoSuffix = {"sv_demoSuffix", ""};`

The C variable and the registered name STRING match exactly -- no case
difference. Registered default is the empty string `""`, matching the
extractor record. The `cvar_t` literal carries name + default only: no
`CVAR_*` flag field, no OnChange callback. `Cvar_Register(&sv_demoSuffix)`
at `src/sv_demo.c:1852` and the extern at `src/server.h:998` are NOT
read-sites and are NOT the citation.

## Read use-sites (Step 1 grounding)

A tree-wide grep for `sv_demoSuffix.(string|value|integer)` (and the
case-insensitive `demosuffix`/`demo_suffix`/`demosuf` sweep) returns
exactly two READ sites; both read `.string`:

- **`src/sv_demo.c:1718-1719`** -- in `SV_MVD_Record_f` (the
  `record <demoname>` command). The suffix is the LAST of three
  concatenated parts of the output filename:
  `va("%s%s%s", sv_demoPrefix.string, SV_CleanName((unsigned char*)Cmd_Argv(1)), sv_demoSuffix.string)`.
  The result is stored in `newname`, then composed into the on-disk path
  under `sv_demoDir` (`:1723`) and written as the `.mvd` demo file (the
  `.mvd` extension is appended afterward at `:1725-1727` if absent).
- **`src/sv_demo.c:1804-1805`** -- in `SV_MVDEasyRecord_f` (the
  `easyrecord [demoname]` command). The same
  `va("%s%s%s", sv_demoPrefix.string, SV_CleanName((unsigned char*)name), sv_demoSuffix.string)`
  composition is applied to the auto-generated (duel/teamplay/ffa) name
  before it is written to disk.

In both sites the suffix is concatenated RAW as the trailing segment;
`SV_CleanName` wraps only the base-name argument (`Cmd_Argv(1)` / `name`),
never `sv_demoSuffix.string`. This is the exact mirror of `sv_demoPrefix`,
which occupies the leading `%s` of the identical `va("%s%s%s", ...)`
expression at the same two lines.

## Per-clause enforce-trace table (B1)

| Clause | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|
| Value is text appended to the end of a recorded demo's filename (after the base name) | `src/sv_demo.c:1718-1719` | `va("%s%s%s", sv_demoPrefix.string, SV_CleanName((unsigned char*)Cmd_Argv(1)), sv_demoSuffix.string)` | MATCH -- suffix is the third/trailing `%s`, after prefix + cleaned name; result -> `newname` -> demo filename |
| Same append applies to the `easyrecord` auto-built name | `src/sv_demo.c:1804-1805` | `va("%s%s%s", sv_demoPrefix.string, SV_CleanName((unsigned char*)name), sv_demoSuffix.string)` | MATCH -- identical composition for the auto-generated name; suffix is the trailing `%s` |
| Suffix is added verbatim (not sanitized; only the base name is cleaned) | `src/sv_demo.c:1718-1719`, `1804-1805` | `SV_CleanName(...)` wraps only `Cmd_Argv(1)` / `name`, not `sv_demoSuffix.string` | MATCH -- suffix passed raw |
| Suffix precedes the `.mvd` extension (it is part of the name body, not the extension) | `src/sv_demo.c:1719`, `1725-1727` | suffix concatenated into `newname`; then `if (strcmp(name + c - 4, ".mvd")) strlcat(name, ".mvd", ...)` | MATCH -- `.mvd` is appended only after the name (incl. suffix) is assembled |
| OFF-state: empty default => no suffix added | `src/sv_demo.c:47` | `cvar_t sv_demoSuffix = {"sv_demoSuffix", ""};` | MATCH -- registered default `""`; empty trailing `%s` contributes nothing to the name |
| Default value is the empty string (WI-2: registered default, not a cfg value) | `src/sv_demo.c:47` | `{"sv_demoSuffix", ""}` | MATCH -- registered literal is `""` |
| Set-by: plain server cvar (no special flags), settable from server config / console | `src/sv_demo.c:47` + `src/sv_demo.c:1852` | `{"sv_demoSuffix", ""}` (no `CVAR_*` flag, no OnChange) + `Cvar_Register(&sv_demoSuffix)` | MATCH -- ordinary server-side cvar; no userinfo/serverinfo/ROM flag |

Every material clause maps to a located, verified enforcing line including
the registration literal and its (absent) flag field. Would classify
**TRACED-CLEAN**. No clause is derived from the knob name alone, an enum,
a string, or a comment. The polarity (suffix = trailing, not leading) is
enforce-traced to the `%s%s%s` argument ORDER, not inferred from the name
"Suffix": `sv_demoSuffix.string` is the third positional argument at both
read-sites, and the sibling `sv_demoPrefix.string` is the first -- the
two cvars are distinguished by position in the same format string.

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

> Text added to the end of the filename of every demo the server records.
> The suffix is placed after the demo's base name (with sv_demoPrefix
> added before it) and before the .mvd extension, so it is a fixed label
> at the tail of each saved demo file. The value is used exactly as
> entered.
>
> Default: empty (no suffix is added).
> Set by: server config / console.

## D6Record

```json
{
  "project": "mvdsv",
  "knob": "sv_demoSuffix",
  "type": "cvar",
  "description": "Text added to the end of the filename of every demo the server records. The suffix is placed after the demo's base name (with sv_demoPrefix added before it) and before the .mvd extension, so it is a fixed label at the tail of each saved demo file. The value is used exactly as entered.\n\nDefault: empty (no suffix is added).\nSet by: server config / console.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment to affirm; D5-amendment evaluate-anyway. Clauses -> enforcing cites: append-to-filename -> src/sv_demo.c:1718-1719 (record path) + src/sv_demo.c:1804-1805 (easyrecord path), suffix is the trailing (third) arg of va(\"%s%s%s\", sv_demoPrefix.string, SV_CleanName(base), sv_demoSuffix.string); polarity suffix=trailing traced to the %s%s%s argument ORDER (third positional), not the name; before-.mvd -> .mvd appended later at src/sv_demo.c:1725-1727; added-verbatim (only base name passed through SV_CleanName, suffix raw) -> same read lines; OFF-state/default empty -> registered literal src/sv_demo.c:47 {\"sv_demoSuffix\", \"\"} (WI-2 registered default, not a cfg value); Set-by plain server cvar -> src/sv_demo.c:47 has no CVAR_* flag / no OnChange + Cvar_Register at src/sv_demo.c:1852. All clauses TRACED-CLEAN; none name/enum/string/comment-only. Not suspect-pool (FALSE). Confidence high.",
  "description_proposed": null
}
```
