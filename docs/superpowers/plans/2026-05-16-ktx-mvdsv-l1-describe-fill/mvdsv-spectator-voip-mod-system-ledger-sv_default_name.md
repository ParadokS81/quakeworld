# describe-fill-synthesis ledger -- mvdsv `sv_default_name`

- **project:** mvdsv
- **knob:** `sv_default_name` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_default_name: synthesized -- replacement name for empty/illegal/color-escape/'console' names; two enforcing overwrite sites -- origin=synthesized ref=src/sv_main.c:3768 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Replacement name the server assigns to a player whose chosen name is not allowed: a name that is empty, contains illegal characters (such as backslash, quote, semicolon, $, # or line breaks), is "console", or contains a color-code escape is overwritten with this name instead.
>
> Default: unnamed.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| illegal-char name replaced with this value | src/sv_main.c:3738-3740 | `if ((*p & 127) == '\\' || *p == '\r' || *p == '\n' || *p == '$' || *p == '#' || *p == '"' || *p == ';') { ... strlcpy(newname, sv_default_name.string, sizeof(newname)); break; }` | MATCH |
| empty / 'console' / color-escape name replaced with this value | src/sv_main.c:3766-3768 | `if (!val[0] || !Q_namecmp(val, "console") || strstr(val, "&c") || strstr(val, "&r")) { Info_Set (&cl->_userinfo_ctx_, "name", sv_default_name.string); ... }` | MATCH |
| registered default 'unnamed' | src/sv_main.c:150 | `cvar_t sv_default_name = {"sv_default_name", "unnamed"};` | MATCH |
| set by server config (no serverinfo flag / blocklist) | src/sv_main.c:3564 | `Cvar_Register (&sv_default_name);` | MATCH |
| no KTX override | ktx/src (grep) | grep sv_default_name -> 0 matches | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Purpose: replacement name assigned when chosen name is not allowed | sv_main.c:3740 + :3768 | `strlcpy(newname, sv_default_name.string, sizeof(newname));` / `Info_Set (&cl->_userinfo_ctx_, "name", sv_default_name.string);` | MATCH |
| 2 | Trigger: empty name overwritten | sv_main.c:3766 | `if (!val[0] \|\| ...)` -> :3768 Info_Set to sv_default_name | MATCH |
| 3 | Trigger: illegal chars = backslash, quote, semicolon, $, #, line breaks | sv_main.c:3738 | `if ((*p & 127) == '\\' \|\| *p == '\r' \|\| *p == '\n' \|\| *p == '$' \|\| *p == '#' \|\| *p == '"' \|\| *p == ';')` (comment: "illegal characters in name, set some default") -> :3740 | MATCH (exact: backslash, \r+\n=line breaks, $, #, " =quote, ; =semicolon; list is complete) |
| 4 | Trigger: name "console" overwritten | sv_main.c:3766 (Q_namecmp def common.c:1876-1896) | `!Q_namecmp(val, "console")` ; Q_namecmp = case-insensitive compare returning 0 on equal | MATCH (case-insensitive; "is console" true, also matches Console/CONSOLE) |
| 5 | Trigger: contains a color-code escape overwritten | sv_main.c:3766 | `strstr(val, "&c") \|\| strstr(val, "&r")` (substring/contains; &cRGB and &r are QW color-code escapes) | MATCH |
| 6 | Default: unnamed | sv_main.c:150 (registered :3564) | `cvar_t sv_default_name = {"sv_default_name", "unnamed"};` | MATCH (registered default, not a shipped-cfg value) |
| 7 | Set by: server config | sv_main.c:150 + :3564 | struct initializer carries only name+default, no CVAR_* flags (not CVAR_ROM/SERVERINFO); `Cvar_Register (&sv_default_name);` | MATCH (plain admin-settable server cvar) |

**V-pass notes:** TRACED-CLEAN. Oracle confirmed at 1.11-53-g18d0362. All 7 clauses map to located, verified enforcing lines.

Wide-grep found 4 use-sites: registration (sv_main.c:150), Cvar_Register (:3564), and two ENFORCING sites both inside SV_ExtractFromUserinfo (:3740 illegal-char path, :3768 empty/console/colorcode path). Both assign sv_default_name.string. No reads live in a different file; the only callee that needed following was Q_namecmp (common.c:1876) for the "console" clause -- confirmed case-insensitive equality (tolower(*s & 0x7f)).

Control-flow note (traced, not a defect): the four triggers are enforced at TWO sites, not one. Illegal-char (:3738) runs FIRST and writes sv_default_name into the local `newname`, which is only committed to userinfo at :3762 via `if (strcmp(val,newname)) Info_Set(...)`; the empty/"console"/&c/&r check (:3766) is a second, independent guard on the (possibly already-rewritten) name. I traced the illegal-char path end-to-end (3738->3740->3762 commit->3766 no-op on "unnamed") and confirmed net observable behavior is exactly the flat OR-list the description states: any of {empty, illegal char, "console", color-code} yields a name overwrite to sv_default_name. The description's single-list framing is faithful to behavior.

Minor still-true roundings that do NOT rise to C-NEAR-MISS (each is traceable and the description is not wrong):
- "is console" omits that the match is case-insensitive -- but "is console" remains true; the code is broader (Console/CONSOLE also caught), not narrower, so no over-claim.
- The illegal-char list is presented as "such as ..." (illustrative) but is in fact the COMPLETE set at :3738 -- neither over- nor under-claim.
- An adjacent leading/trailing space-trim step (:3745-3758) sanitizes the name in place but does NOT involve sv_default_name; correctly out of scope for this cvar's description.

WI-2: Default "unnamed" verified against the registered struct initializer (:150), not a shipped .cfg. No CVAR_* flags -> "Set by: server config" correct.

## flags_for_review

- [fyi/other/vpass] sv_default_name enforcement is split across two sites in SV_ExtractFromUserinfo: illegal-char replacement at sv_main.c:3738-3743 (writes local newname, committed at :3762) and empty/console/colorcode replacement at sv_main.c:3766-3770. Net behavior matches the description's flat OR-list, but a future re-synth should be aware the gating is two-stage, not one branch.
- [fyi/other/vpass] The 'console' rejection uses Q_namecmp (common.c:1876-1896), a case-INSENSITIVE compare. So 'Console', 'CONSOLE', 'cOnSoLe' are all rejected, not just lowercase 'console'. Description says 'is console' which stays true (code is broader), so no defect -- but the case-insensitivity is an unstated detail.
- [fyi/off-scope-entity/vpass] The '&c'/'&r' color-code substring rejection is a recurring userinfo-sanitization pattern across the tree, NOT specific to the name field: same strstr(...,"&c")||strstr(...,"&r") guard appears at sv_main.c:924 (whole userinfo), :3832 (team field -> reset to 'none'), sv_user.c:2365, and pr2_cmds.c:2330/:2462. Off-scope for sv_default_name but relevant if a color-code-escape concept note or sibling info_key descriptions are later authored.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_default_name",
  "type": "cvar",
  "description": "Replacement name the server assigns to a player whose chosen name is not allowed: a name that is empty, contains illegal characters (such as backslash, quote, semicolon, $, # or line breaks), is \"console\", or contains a color-code escape is overwritten with this name instead.\n\nDefault: unnamed.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3768. Two enforcing read-sites in SV_ExtractFromUserinfo overwrite the userinfo 'name' key with sv_default_name.string: src/sv_main.c:3740 fires when the name contains an illegal character -- the gate at :3738 tests `(*p & 127) == '\\\\' || *p == '\\r' || *p == '\\n' || *p == '$' || *p == '#' || *p == '\"' || *p == ';'`; src/sv_main.c:3768 fires when `!val[0] || !Q_namecmp(val, \"console\") || strstr(val, \"&c\") || strstr(val, \"&r\")` (empty, equals 'console', or contains a &c/&r color escape). Registered default 'unnamed' verified at the cvar_t literal src/sv_main.c:150 `cvar_t sv_default_name = {\"sv_default_name\", \"unnamed\"}`. Set-by: plain Cvar_Register at src/sv_main.c:3564 with no CVAR_SERVERINFO flag and no rcon blocklist entry -> server config / rcon. No KTX override (grep of ktx/src returned zero matches). Description states the admin-observable replacement behavior; the exact char list and color-escape internals are evidence here, summarized in the user doc.",
  "description_proposed": null
}
```
