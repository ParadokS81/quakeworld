# describe-fill-synthesis ledger -- mvdsv `sv_registrationinfo`

- **project:** mvdsv
- **knob:** `sv_registrationinfo` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_registrationinfo: synthesized -- text shown to a connecting player before the login prompt; only when sv_login active and non-empty; traced to sv_login.c:619 -- origin=synthesized ref=src/sv_login.c:619 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets a custom message shown to a connecting player who must log in, displayed just before the login prompt. Use it to tell players how to get an account or what the server expects. It only appears when the account-login system is active (sv_login is non-zero) and the player has not yet logged in.
>
> Empty (the default) = no extra message is shown.
>
> Default: empty.
> Set by: server config / rcon.
> See also: sv_login.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| message printed to connecting client; only when non-empty | src/sv_login.c:619-620 | `if (sv_registrationinfo.string[0]) SV_ClientPrintf2(cl, PRINT_HIGH, "%s\n", sv_registrationinfo.string);` | MATCH |
| shown just before the login prompt | src/sv_login.c:629 | `SV_ClientPrintf2(cl, PRINT_HIGH, "Enter username:\n");` (10 lines after) | MATCH |
| only when login system active (sv_login non-zero) | src/sv_login.c:585 | `if (!(int)sv_login.value) { ... return true; }` (returns before line 619) | MATCH |
| only when player not already logged in | src/sv_login.c:595 | `if (cl->logged > 0 || cl->logged_in_via_web) return true;` | MATCH |
| empty = nothing shown (OFF-state) | src/sv_login.c:619 | `if (sv_registrationinfo.string[0])` guard | MATCH |
| Default empty (registered) | src/sv_main.c:183 | `cvar_t sv_registrationinfo = {"sv_registrationinfo", ""};` | MATCH |
| settable via config/rcon (no ROM flag) | src/sv_main.c:3567 | `Cvar_Register (&sv_registrationinfo);` | MATCH |
| no KTX override | ktx/src (grep) | (no hits for sv_registrationinfo) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Sets a custom message shown to a connecting player who must log in | sv_login.c:619-620; caller sv_login.c:635 -> sv_user.c:301-302 | `if (sv_registrationinfo.string[0]) SV_ClientPrintf2(cl, PRINT_HIGH, "%s\n", sv_registrationinfo.string);` ... print path leads to `return false;` (635) -> caller `if (!SV_Login(sv_client)) return;` holds connection pending login | MATCH |
| 2 | Displayed just before the login prompt | sv_login.c:619-633 | registrationinfo printed at 619-620, then unconditionally `Enter username:` (629) or `Enter login & password:` (632) follows; corroborated by comment sv_main.c:183 `// text shown before "enter login"` | MATCH |
| 3 | Only appears when sv_login is non-zero (account-login active) | sv_login.c:585-592 | `if (!(int)sv_login.value) { ... return true; }` returns early BEFORE line 619 when sv_login==0; sv_login default `"0"` (sv_login.c:39) | MATCH |
| 4 | And the player has not yet logged in | sv_login.c:595-597, 609-613 | `if (cl->logged > 0 \|\| cl->logged_in_via_web) return true;` (595) and IP-account auto-login `if ((cl->logged = checklogin(...)) > 0) ... return true;` (609) both return BEFORE 619 | MATCH |
| 5 | Empty (default) = no extra message shown | sv_login.c:619 | `if (sv_registrationinfo.string[0])` -- print guarded on non-empty first char; empty string skips the print | MATCH |
| 6 | Default: empty | sv_main.c:183 | `cvar_t sv_registrationinfo = {"sv_registrationinfo", ""};` -- registered default `""` (WI-2: registered, not shipped-cfg) | MATCH |
| 7 | Set by: server config / rcon | sv_main.c:183 + 3567 | struct init carries NO flags (no CVAR_ROM/CVAR_SERVERINFO); plain `Cvar_Register (&sv_registrationinfo);` -- normal writable server cvar; no Cvar_SetFlags anywhere in tree | MATCH |
| 8 | See also: sv_login | sv_login.c:585 | sv_login is the documented gating cvar in SV_Login; cross-ref appropriate | MATCH |

**V-pass notes:** Oracle confirmed: `git describe --tags` == 1.11-53-g18d0362. Exhaustive grep of mvdsv/src yields exactly 5 use-sites: declaration+default (sv_main.c:183), registration (sv_main.c:3567), extern (sv_login.c:581), enforcing guard (sv_login.c:619), enforcing print (sv_login.c:620). The entire enforcing logic lives in SV_Login (sv_login.c:579-636); the registration/default lives in sv_main.c.

Every material clause enforce-traced to its specific line and matches both the code AND the adjacent declaration comment (`// text shown before "enter login"`). The "just before the login prompt" framing is corroborated by the unconditional prompt that follows the registrationinfo print in both the WebLoginsEnabled and the else branch -- there is no path where the message prints but no prompt follows. The default-empty and OFF-state-empty clauses both trace to the `.string[0]` guard and the `""` registered default. Set-by metadata is consistent with a flag-less plain server cvar. No flavour-C inference (no clause derives only from the knob name / a string / an enum / a comment without an enforcing read-site). No contradiction, no WI-2 metadata error.

PROC-1: residual reduces to checkable facts at enforcing lines; no judgment absorbed. Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] The registrationinfo message is gated by two narrower carve-outs beyond the description's stated conditions: the spectator carve-out at sv_login.c:600 (`if ((int)sv_login.value == 1 && cl->spectator) { SV_Logout(cl); cl->logged = -1; return true; }` returns before line 619, so a spectator on a sv_login==1 server never sees the message) and the IP-auto-login carve-out at sv_login.c:609 (`checklogin` IP match returns before 619). The proposed description uses necessary-condition phrasing ('only appears when sv_login non-zero ... and the player has not yet logged in'), which remains strictly correct and is NOT contradicted by these additional gates -- hence FYI, not a fix. Noting only so a future editor knows the trigger set is narrower than 'every connecting unlogged player on a login server'.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_registrationinfo",
  "type": "cvar",
  "description": "Sets a custom message shown to a connecting player who must log in, displayed just before the login prompt. Use it to tell players how to get an account or what the server expects. It only appears when the account-login system is active (sv_login is non-zero) and the player has not yet logged in.\n\nEmpty (the default) = no extra message is shown.\n\nDefault: empty.\nSet by: server config / rcon.\nSee also: sv_login.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:619. Pre-existing inline comment src/sv_main.c:183 'text shown before \"enter login\"' is a serviceable fragment but not D20 shape -> synthesized (and verified, not parroted). Enforcing read: src/sv_login.c:619-620 inside SV_Login (called on connect after 'new', per the function header at sv_login.c:576): `if (sv_registrationinfo.string[0]) SV_ClientPrintf2(cl, PRINT_HIGH, \"%s\\n\", sv_registrationinfo.string);` -- the cvar's string is printed to the client only when non-empty (string[0] truthy) -> OFF-state: empty string prints nothing (traced to the same guard). Scope 'only when login system active and player not yet logged in': SV_Login returns early before reaching line 619 when sv_login==0 (sv_login.c:585 `if (!(int)sv_login.value) ... return true;`), when already logged (sv_login.c:595), when sv_login==1 and spectator (sv_login.c:600), and when an IP account matches (sv_login.c:609 returns); line 619 is reached only on the fall-through where cl->logged is reset to 0 (sv_login.c:616) and the player is being prompted -- and it is emitted immediately before the username prompt at sv_login.c:629 ('Enter username:'). Default empty verified at registered literal src/sv_main.c:183 `{\"sv_registrationinfo\", \"\"}` (WI-2). Settable plain cvar_t, registered src/sv_main.c:3567; not on the crypt-rcon blocklist -> server config / rcon. Cross-link sv_login because the message only surfaces when sv_login gates the connection (See also). F-MV1: no KTX override (grep ktx/src for sv_registrationinfo returns nothing). Note: the description must not imply the cvar holds a secret -- it is informational text shown to clients, no sensitivity concern.",
  "description_proposed": null
}
```
