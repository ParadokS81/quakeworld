# describe-fill-synthesis ledger -- mvdsv `sv_login_web`

- **project:** mvdsv
- **knob:** `sv_login_web` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_login_web: synthesized -- 0=local files / 1=website auth (no local acct needed) / 2=mandatory web auth + local acct; only in WWW_INTEGRATION builds -- origin=synthesized ref=src/sv_login.c:42 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Selects how account logins are checked when login is enabled (see sv_login). Only present and meaningful on servers built with website-login support.
>
> 0 = use local account files only; no website authentication.
> 1 = authenticate against the login website; a local account is not required (bans may still be enforced from local files).
> 2 = mandatory website authentication and the client must also have a matching local account.
>
> Default: 1.
> Set by: server config / rcon.
> See also: sv_login.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 = local files only, no web auth | src/sv_login.c:42,46 | `LoginModeFileBased() ((int)sv_login_web.value == 0)`; `WebLoginsEnabled() (!LoginModeFileBased())` | MATCH |
| 1 = web auth, local account not required | src/sv_login.c:43,45 | `LoginModeOptionalWeb() (==1)`; `LoginMustHaveLocalAccount() (LoginModeMandatoryWeb() || LoginModeFileBased())` (false for 1) | MATCH |
| 2 = mandatory web auth + must have local account | src/sv_login.c:44,45 | `LoginModeMandatoryWeb() (==2)`; LoginMustHaveLocalAccount() true for 2 | MATCH |
| value selects web-vs-local login check | src/sv_login.c:878 | `if (WebLoginsEnabled()) return !cl->logged_in_via_web; else return !cl->logged;` | MATCH |
| only present in website-login builds | src/sv_login.c:28-29,40-41 | `#if defined(SERVERONLY) && defined(WWW_INTEGRATION)` -> `#define WEBSITE_LOGIN_SUPPORT`; cvar under `#ifdef WEBSITE_LOGIN_SUPPORT` | MATCH |
| non-web build forces file-based | src/sv_login.c:48-52 | `#else ... #define WebLoginsEnabled() (0)` | MATCH |
| default 1 | src/sv_login.c:41 | `cvar_t sv_login_web = { "sv_login_web", "1" };` | MATCH |
| set-by server config/rcon (no flag) | src/sv_login.c:559 | `Cvar_Register(&sv_login_web);` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Scope: only present/meaningful on servers built with website-login support | sv_login.c:28-29 ; sv_login.c:558-559 ; CMakeLists.txt:185-186 | `#if defined(SERVERONLY) && defined(WWW_INTEGRATION)` / `#define WEBSITE_LOGIN_SUPPORT` ... `#ifdef WEBSITE_LOGIN_SUPPORT \n Cvar_Register(&sv_login_web);` ... `if(CURL_FOUND) target_compile_definitions(... WWW_INTEGRATION)` | MATCH -- cvar is registered ONLY under SERVERONLY+WWW_INTEGRATION; WWW_INTEGRATION is itself gated on CURL_FOUND. When absent, the cvar does not exist and all LoginMode macros collapse to file-based (sv_login.c:48-52). |
| 2 | Checked when login is enabled (see sv_login) | sv_login.c:585 ; sv_login.c:873-885 | `if (!(int)sv_login.value) { ... return true; }` ; `qbool SV_LoginRequired(...) { int login=(int)sv_login.value; if (login==2 || (login==1 && !cl->spectator)) { if (WebLoginsEnabled()) return !cl->logged_in_via_web; ... } return false; }` | MATCH -- when sv_login==0, SV_Login short-circuits and SV_LoginRequired returns false; sv_login_web semantics only take effect once sv_login gates login on. |
| 3 | 0 = use local account files only; no website authentication | sv_login.c:42 ; sv_login.c:46 ; sv_login.c:622,699,631-632 | `#define LoginModeFileBased() ((int)sv_login_web.value == 0)` ; `#define WebLoginsEnabled() (!LoginModeFileBased())` ; `if (WebLoginsEnabled()){...//authprompt...} else { SV_ClientPrintf2(cl,...,"Enter login & password:\n"); }` | MATCH -- value 0 makes WebLoginsEnabled() false everywhere; the web/authprompt + Central_* challenge paths (SV_ParseLogin:699) are skipped and the local password prompt is used. |
| 4 | 1 = authenticate against login website; a local account is NOT required | sv_login.c:45 ; sv_login.c:852,856-858 ; sv_login.c:542-543 | `#define LoginMustHaveLocalAccount() (LoginModeMandatoryWeb() || LoginModeFileBased())` ; `else if (status == 0 && LoginMustHaveLocalAccount()) { SV_BlockedLogin(cl); } else { ...SV_SuccessfulLogin(cl); }` ; checklogin: `else { return i + 1; }` | MATCH -- for value 1, LoginMustHaveLocalAccount() is false, so a successful web auth with no local account (status==0) falls through to SV_SuccessfulLogin instead of being blocked. |
| 4b | 1 sub-claim: bans may still be enforced from local files | sv_login.c:518-519 ; sv_login.c:848-850 | `if (accounts[i].state == a_blocked) return -2;` (precedes the LoginMustHaveLocalAccount() gate at :522) ; `if (status < 0) { ...SV_BlockedLogin(cl); }` | MATCH -- the a_blocked check in checklogin runs BEFORE the LoginMustHaveLocalAccount() branch, so a locally-blocked account returns -2 and SV_LoginWebCheck blocks even in optional-web (value 1) mode. Genuinely enforced, not a comment inference. |
| 5 | 2 = mandatory website auth AND client must also have a matching local account | sv_login.c:44 ; sv_login.c:45 ; central.c:242,244 ; sv_login.c:852,854 | `#define LoginModeMandatoryWeb() ((int)sv_login_web.value == 2)` ; `LoginMustHaveLocalAccount() = (LoginModeMandatoryWeb() || LoginModeFileBased())` ; `client->logged_in_via_web = true; ... SV_LoginWebCheck(client);` ; `else if (status == 0 && LoginMustHaveLocalAccount()) { SV_BlockedLogin(cl); }` | MATCH -- value 2 keeps WebLoginsEnabled() true (web challenge required) AND makes LoginMustHaveLocalAccount() true, so even after a successful web auth, status==0 (no local account) triggers SV_BlockedLogin. Both conditions enforced. |
| 6 | Default: 1 | sv_login.c:41 ; sv_login.c:559 | `cvar_t sv_login_web = { "sv_login_web", "1" };` ; `Cvar_Register(&sv_login_web);` | MATCH -- registered default string is "1" (value 1.0); plain Cvar_Register, no Ex-override, no OnChange, flags field unset. |
| 7 | Set by: server config / rcon | sv_login.c:41 ; cvar.h:66-75 | `cvar_t sv_login_web = { "sv_login_web", "1" };` (flags=0, no CVAR_ROM/CVAR_SERVERINFO) | MATCH -- flag-less, OnChange-less server cvar; settable via config exec or rcon/console set. Generic-correct for this cvar shape. |

**V-pass notes:** TRACED-CLEAN. Oracle confirmed at mvdsv 1.11-53-g18d0362. Every material clause (scope / enable-gate / values 0,1,2 / default / set-by) maps to a located, verified enforcing line, with the value semantics traced through the LoginMode* macro layer to the actual enforcement sites rather than stopping at the registration comment.

Enforcement architecture (single file, src/sv_login.c, with one cross-file path into central.c): sv_login_web's value never gates behavior directly -- it feeds five macros (FileBased / OptionalWeb / MandatoryWeb / MustHaveLocalAccount / WebLoginsEnabled, lines 42-46). The two derived macros are the real enforcers:
- WebLoginsEnabled() = (value != 0): selects web-challenge vs local-password path (SV_Login:622, SV_ParseLogin:699, SV_LoginRequired:878, SV_LoginBlockJoinRequest:890).
- LoginMustHaveLocalAccount() = (value==2 || value==0): requires a local account row even when web auth succeeds (SV_LoginWebCheck:852, checklogin:522, acc_remove:356).
Value 1 is the only mode where BOTH web auth is active AND a local account is optional -- exactly what the description says. The "bans still enforced from local files" parenthetical under value 1 is genuinely traced: the a_blocked check (checklogin:518) precedes the MustHaveLocalAccount gate (:522), so block state is honored in all modes.

The inline registration comment at sv_login.c:41 ("0=local files, 1=auth via website (bans can be in local files), 2=mandatory auth (must have account in local files)") happens to match the enforced behavior exactly -- but the classification rests on the traced enforcement sites, not the comment. No flavour-C inference: no clause rests on the knob name, an enum name, or the comment alone. WI-2 metadata (default 1, set-by) verified against the registered initializer + flags field. No contradictions, no untraceable clauses, no metadata errors.

## flags_for_review

- [review/other/synthesis] sv_login_web is registered ONLY when WEBSITE_LOGIN_SUPPORT is defined, which requires both SERVERONLY and WWW_INTEGRATION (sv_login.c:28-29). A vanilla MVDSV build compiled without WWW_INTEGRATION does not register this cvar at all -- if the L1 extractor harvested it from a non-WWW build, its presence/default may be build-config-dependent. Worth confirming the extract build had WWW_INTEGRATION so the 'Default: 1' and registration claim hold.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_login_web",
  "type": "cvar",
  "description": "Selects how account logins are checked when login is enabled (see sv_login). Only present and meaningful on servers built with website-login support.\n\n0 = use local account files only; no website authentication.\n1 = authenticate against the login website; a local account is not required (bans may still be enforced from local files).\n2 = mandatory website authentication and the client must also have a matching local account.\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: sv_login.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:42. Enforcing macros (src/sv_login.c:42-46): `LoginModeFileBased() ((int)sv_login_web.value == 0)`, `LoginModeOptionalWeb() (==1)`, `LoginModeMandatoryWeb() (==2)`, `WebLoginsEnabled() (!LoginModeFileBased())` (TRUE for 1 or 2), `LoginMustHaveLocalAccount() (LoginModeMandatoryWeb() || LoginModeFileBased())` (TRUE for 0 or 2). These enforce: value 0 => web logins OFF, local account required (file-based); value 1 => web logins ON, local account NOT required (optional web); value 2 => web logins ON AND local account required (mandatory web). Consumed at SV_LoginRequired sv_login.c:878 `if (WebLoginsEnabled()) return !cl->logged_in_via_web; else return !cl->logged;` (web-vs-local check selection). 'bans may still be enforced from local files' at value 1: derived from the registration comment AND the LoginMustHaveLocalAccount semantics (value 1 omits the local-account requirement while local files are still loaded); stated as 'may' (not a hard enforce-trace of a per-connection ban check in this read scope) -- conservative wording. Build-gate: sv_login_web is REGISTERED only inside `#ifdef WEBSITE_LOGIN_SUPPORT` (sv_login.c:40-41 around the cvar_t; Cvar_Register at sv_login.c:558-559 also #ifdef'd), and WEBSITE_LOGIN_SUPPORT is defined only when `defined(SERVERONLY) && defined(WWW_INTEGRATION)` (sv_login.c:28-29). In a build without WWW_INTEGRATION the cvar does not exist and the macros hardcode file-based (sv_login.c:48-52, WebLoginsEnabled()=0) -- hence 'only present and meaningful on servers built with website-login support'. Default 1: registration `{ \"sv_login_web\", \"1\" }` at sv_login.c:41 (WI-2). Set-by: plain Cvar_Register at sv_login.c:559 (no ROM/serverinfo flag) => server config / rcon. F-MV1: no KTX read/override of sv_login_web found.",
  "description_proposed": null
}
```
