# describe-fill-synthesis ledger -- mvdsv `sv_forcenick`

- **project:** mvdsv
- **knob:** `sv_forcenick` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_forcenick: synthesized -- ON forces a logged-in player's name to their account (alias-or-login), reverts name changes, kicks name-clashers; non-logged-in unaffected -- origin=synthesized ref=src/sv_login.c:782 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Forces a logged-in player's in-game name to match their server login account. When on, at the moment a player logs in their name is set to their account name (their login alias if one is set, otherwise the login name), and while logged in they cannot change their name away from their login name (color and case variations are still allowed). If another player on the server is already using that name, that other player is kicked. Players who are not logged in are unaffected.
>
> 0 = do not force names.
> 1 = force a logged-in player's name to their login account.
>
> Default: 0.
> Set by: server config / rcon.
> See also: sv_login.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| ON => at login, name forced to login-alias-or-login | src/sv_login.c:782-788 | `if ((int)sv_forcenick.value) { const char* forced_name = cl->login_alias[0] ? cl->login_alias : cl->login; if (forced_name[0]) SV_ForceClientName(cl, forced_name); }` | MATCH |
| another client holding that name is kicked | src/sv_login.c:813-814 | `if (!Q_namecmp(other->name, forced_name)) SV_KickClient(other, " (using authenticated user's name)");` | MATCH |
| ON + logged-in => name-change away from login reverted | src/sv_user.c:2397-2408 | `if ((int)sv_forcenick.value && /*...*/ sv_client->login[0]) { if (Q_namecmp(sv_client->login, Cmd_Argv(2))) { ... Info_Set(...,"name", sv_client->login); ... } }` | MATCH |
| color/case variations allowed (Q_namecmp) | src/sv_user.c:2400 | `if (Q_namecmp(sv_client->login, Cmd_Argv(2)))` (comment :2399 'allow differences in case, redtext') | MATCH |
| not-logged-in players unaffected (login[0] guard) | src/sv_user.c:2397 | `... && sv_client->login[0]` (comment :2396) | MATCH |
| Default 0, settable | src/sv_main.c:182 | `cvar_t sv_forcenick = {"sv_forcenick", "0"};` | MATCH |
| KTX override absent | ktx/src (grep) | 0 hits for `sv_forcenick` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Polarity: when ON (non-zero) forcing is active | sv_login.c:782 ; sv_user.c:2397 | `if ((int)sv_forcenick.value)` ; `if ((int)sv_forcenick.value && /*...*/ sv_client->login[0])` | MATCH |
| 2 | Forced name = "login alias if one is set, otherwise the login name" (login-time) | sv_login.c:784 | `const char* forced_name = cl->login_alias[0] ? cl->login_alias : cl->login;` | MATCH (literal ternary; note login_alias is in practice always populated -- legacy path sv_login.c:758 copies login into it, web path central.c:238-240 sets it to Alias-or-login) |
| 3 | At login, the logged-in player's name is set to the account name | sv_login.c:787 -> SV_ForceClientName sv_login.c:822-828 | `Info_Set(&cl->_userinfo_ctx_, "name", forced_name);` ... `va("name %s\n", forced_name)` | MATCH |
| 4 | Blocked from changing name away "from that name [the account name]" while logged in | sv_user.c:2397-2408 | `if (Q_namecmp(sv_client->login, Cmd_Argv(2))) { ... Info_Set(...,"name", sv_client->login); strlcpy(sv_client->name, sv_client->login, ...) ... }` | MISMATCH (narrower) -- the block compares against and snaps to `sv_client->login`, NOT `login_alias`. Description unifies it with clause 2's alias-or-login target; the two sites use different targets. Diverges only when web auth returns Alias != Login. |
| 5 | "color and case variations are still allowed" | common.c:1876-1893 (Q_namecmp), used at sv_user.c:2400 and sv_login.c:813,819 | `if (tolower(*s1 & 0x7f) != tolower(*s2 & 0x7f))` | MATCH (case-folds via tolower + masks high/color bit via `& 0x7f`) |
| 6 | If another player is already using that name, that other player is kicked (login scenario) | sv_login.c:804-816 -> sv_ccmds.c:864 | `if (!Q_namecmp(other->name, forced_name)) { SV_KickClient(other, " (using authenticated user's name)"); }` ; SV_KickClient -> `SV_DropClient(cl);` | MATCH (genuine disconnect; only in the login/SV_ForceClientName path, not at name-change -- description scopes it to login correctly) |
| 7 | Players not logged in are unaffected | sv_user.c:2397 | `&& sv_client->login[0]` | MATCH (name-change gate requires non-empty login) |
| 8 | 0 = do not force names | sv_main.c:182 + falsy branch sv_login.c:782 / sv_user.c:2397 | `cvar_t sv_forcenick = {"sv_forcenick", "0"}; //0 - don't force; 1 - as login;` | MATCH |
| 9 | 1 = force a logged-in player's name to their login account | sv_main.c:182 (comment) + enforcement clauses 2-4 | `//0 - don't force; 1 - as login;` | MATCH |
| 10 | Default: 0 | sv_main.c:182 ; registered sv_main.c:3566 | `{"sv_forcenick", "0"}` ; `Cvar_Register (&sv_forcenick);` | MATCH (registered default literally "0") |
| 11 | Set by: server config / rcon (plain settable cvar) | sv_main.c:182 (no flag bits) ; :3566 | `cvar_t sv_forcenick = {"sv_forcenick", "0"};` (no CVAR_ROM/CVAR_SERVERINFO) | MATCH |
| 12 | See also: sv_login | sv_user.c:2396 (related) | `//meag: removed sv_login check to allow optional logins... sv_forcenick should still take effect` | MATCH (genuinely related; the removed-check comment confirms the coupling) |

**V-pass notes:** Oracle confirmed mvdsv 1.11-53-g18d0362. Three use-sites traced: registration (sv_main.c:182, :3566), login-time force (sv_login.c:770-829), name-change block (sv_user.c:2301-2412). All clauses enforce-traced into callees (SV_ForceClientName, SV_KickClient->SV_DropClient, Q_namecmp, Auth_ProcessLoginAttempt field mapping).

Classification C-NEAR-MISS rests on ONE clause (row 4). The description presents a single coherent rule: the name is forced to "their account name (login alias if set, otherwise login name)" AND the player is "blocked from changing it away from that name." This over-unifies two enforcement sites that use DIFFERENT name targets:
  - Login-time force (sv_login.c:784,787): target = login_alias (alias-or-login).
  - Name-change block (sv_user.c:2400-2403): target = bare sv_client->login, NEVER the alias.
The web auth response carries separate "Alias" and "Login" fields (central.c:198-199, 218, 238-240), so login_alias CAN legitimately differ from login. In that web-with-distinct-Alias case the login-time name becomes the alias, but any subsequent name change snaps to the bare login -- so "blocked from changing it away from that name [= the alias]" is not literally what the code enforces; it locks to the login instead. The real code is narrower/more conditional than the single-name framing implies (the flavour-C near-miss shape: a clause that is correct only under a condition the text doesn't state).

Why NOT C-FIX: in the dominant case alias == login (ALWAYS true for legacy/non-web logins via sv_login.c:758, and for web logins where the backend returns no distinct Alias via the `preferred_alias ? preferred_alias : login` fallback at central.c:238), the description is exactly correct on every clause. The divergence requires a web auth backend that returns Alias != Login. So the description is essentially correct with one over-unified clause, not flatly contradicted.

Why NOT WI2-FIX: all metadata (default 0, no cvar flags, set-by) verified at the registration line and is correct.

Everything else MATCHES cleanly: polarity, the alias-or-login login-time target (literal ternary), the kick-the-impostor side-effect (correctly scoped to login only -- there is NO kick at name-change time), color/case tolerance (Q_namecmp tolower + 0x7f mask -- the high-bit mask is exactly what permits redtext/color variants), the not-logged-in exemption (login[0] gate), and the 0/1 enum.

Suggested minimal fix for the re-synth: either (a) state the name-change block locks to the login name specifically (which equals the displayed name except when a distinct login Alias is in play), or (b) drop the implication that the locked-to name is necessarily the same alias shown at login. A precise phrasing: "...at login their name is set to their account name (their login alias if one is set, otherwise the login name); while logged in they cannot change their name away from their login name (color and case variations allowed)." This keeps both sites honest without exposing the alias-vs-login edge unless desired.

## flags_for_review

- [fyi/other/vpass] Two-site target divergence in sv_forcenick: login-time force (sv_login.c:784) targets cl->login_alias (alias-or-login), but the name-change block (sv_user.c:2400-2403) compares against and resets to bare sv_client->login, never the alias. Because the web auth response carries distinct 'Alias' and 'Login' fields (central.c:198-199), a web login whose backend returns Alias != Login will display the Alias at login but get snapped to the bare Login on any subsequent name change. Likely an intentional simplification (the name-change author 'meag' touched this path per the sv_user.c:2396 comment) but it is an observable inconsistency: the locked name differs from the login-assigned name on that edge. Flagging as FYI, not a bug claim -- enforcement is internally valid, just non-uniform.
- [fyi/runtime-dead-suspect/vpass] sv_login.c:784 ternary `cl->login_alias[0] ? cl->login_alias : cl->login` has a defensively-dead else-branch at the SV_SuccessfulLogin call site: login_alias is unconditionally populated before SV_SuccessfulLogin runs in BOTH login paths (legacy: strlcpy at sv_login.c:758 copies login into login_alias immediately before the SV_SuccessfulLogin call; web: central.c:238-240 sets it to preferred_alias-or-login before SV_LoginWebCheck). So login_alias[0] is always truthy here and the `: cl->login` fallback is never taken via these paths. Not a defect -- defensive coding -- but means the description's 'otherwise the login name' branch describes a state not reachable through the normal login flow. FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_forcenick",
  "type": "cvar",
  "description": "Forces a logged-in player's in-game name to match their server login account. When on, at the moment a player logs in their name is set to their account name (their login alias if one is set, otherwise the login name), and while logged in they cannot change their name away from their login name (color and case variations are still allowed). If another player on the server is already using that name, that other player is kicked. Players who are not logged in are unaffected.\n\n0 = do not force names.\n1 = force a logged-in player's name to their login account.\n\nDefault: 0.\nSet by: server config / rcon.\nSee also: sv_login.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:782. Registration cvar_t literal {\"sv_forcenick\", \"0\"} at sv_main.c:182 -> Default 0 (WI-2). Read as `(int)sv_forcenick.value` (boolean test) at both enforcing sites -> on/off, no distinct mode 2 (comment '0 - don't force; 1 - as login;' describes the single non-zero mode). ENFORCING site 1 SV_SuccessfulLogin sv_login.c:782 `if ((int)sv_forcenick.value)`: forced_name = cl->login_alias[0] ? cl->login_alias : cl->login (sv_login.c:784), then SV_ForceClientName(cl, forced_name) at :787 -> name set to login alias-or-login at login time. SV_ForceClientName (sv_login.c:798+) loops all clients and SV_KickClient(other,\" (using authenticated user's name)\") at :814 when another client holds that name -> 'other player using that name is kicked' confirmed. ENFORCING site 2 sv_user.c:2397 `if ((int)sv_forcenick.value && /*...*/ sv_client->login[0])`: in the userinfo name-change handler, when forcenick on AND client is logged in, a name change is reverted to sv_client->login with a stuffcmd, gated `if (Q_namecmp(sv_client->login, Cmd_Argv(2)))` -> Q_namecmp ignores color/case so those variations are allowed; message 'You can't change your name while logged in on this server.' at :2401 -> 'blocked from changing away from login name; color/case allowed' confirmed. The `sv_client->login[0]` guard and adjacent comment sv_user.c:2396 ('removed sv_login check to allow optional logins') confirm only logged-in players are constrained -> 'players not logged in are unaffected'. See also sv_login: forcenick is meaningful only for clients that have a login set. KTX: no override (grep ktx/src 0 hits for sv_forcenick).",
  "description_proposed": null
}
```
