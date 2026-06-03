# describe-fill-synthesis ledger -- mvdsv `sv_login`

- **project:** mvdsv
- **knob:** `sv_login` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_login: synthesized -- 0=off / 1=non-spectators must log in (spectators exempt) / 2=everyone must log in -- origin=synthesized ref=src/sv_login.c:877 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether connecting clients must log in to an account before they can play.
>
> 0 = no login required.
> 1 = login required to play; spectators are exempt and may connect without an account.
> 2 = login required for everyone, including spectators.
>
> When login is required, a client that does not authenticate is held at connect and cannot enter the game; one already connected without an account is dropped after a login timeout (or immediately if its account is blocked). Account handling and whether logins use local files or website authentication are governed by the surrounding login system.
>
> Default: 0 (logins disabled).
> Set by: server config / rcon.
> See also: sv_login_web, sv_hashpasswords.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 = no login required (OFF-state) | src/sv_login.c:585 | `if (!(int)sv_login.value) { ... return true; }` | MATCH |
| 1 = required for non-spectators only | src/sv_login.c:877 | `if (login == 2 || (login == 1 && !cl->spectator))` | MATCH |
| spectators exempt at value 1 | src/sv_login.c:599-600 | `if ((int)sv_login.value == 1 && cl->spectator){ SV_Logout(cl); cl->logged = -1; return true; }` | MATCH |
| 2 = required for everyone incl spectators | src/sv_login.c:877 | `login == 2` branch (no spectator condition) | MATCH |
| not-authenticated client refused entry | src/sv_login.c:891,896 | `if (... && (int)sv_login.value){ SV_ClientPrintf(...requires users to login...); return true; }` | MATCH |
| mandatory-login client dropped | src/sv_user.c:3253 | `if ((int)sv_login.value > 1 || ((int)sv_login.value == 1 && !sv_client->spectator)) SV_DropClient(sv_client);` | MATCH |
| default 0 | src/sv_login.c:39 | `cvar_t sv_login = { "sv_login", "0" };` | MATCH |
| set-by server config/rcon (no flag) | src/sv_login.c:557 | `Cvar_Register(&sv_login);` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Controls whether connecting clients must log in before they can play | sv_login.c:579-635 (SV_Login) + sv_login.c:873-886 (SV_LoginRequired), called sv_user.c:301-307 | `if (!SV_Login(sv_client)) return; if (SV_LoginRequired(sv_client)) { return; }` | MATCH |
| 2 | 0 = no login required | sv_login.c:585 / sv_login.c:877 | `if (!(int)sv_login.value) {... return true;}` ; `if (login == 2 || (login == 1 && !cl->spectator))` (0 fails both -> SV_LoginRequired returns false) | MATCH |
| 3 | 1 = login required to play; spectators exempt, may connect without account | sv_login.c:600 / sv_login.c:877 | `if ((int)sv_login.value == 1 && cl->spectator) { SV_Logout(cl); cl->logged = -1; return true; }` ; SV_LoginRequired: `(login == 1 && !cl->spectator)` -> false for spectator | MATCH |
| 4 | 2 = login required for everyone, including spectators | sv_login.c:877 | `if (login == 2 || (login == 1 && !cl->spectator))` -- login==2 short-circuits true regardless of cl->spectator | MATCH |
| 5 | Client that does not authenticate is refused entry | sv_user.c:305-307 | `if (SV_LoginRequired(sv_client)) { return; }` -- early return holds client at cs_connected, blocks spawn (refused entry to play) | MATCH |
| 6 | ...and, if already connected without an account, is dropped | sv_login.c:840 (SV_LoginCheckTimeOut) + sv_login.c:767 (SV_BlockedLogin) | `if (connected && connected > 60) {... SV_DropClient(cl);}` ; `SV_DropClient(cl)` in SV_BlockedLogin | MATCH (imprecise) -- a real drop exists but it is gated on a 60s login timeout or an explicit ban/blocked-account; immediate at-connect effect is a HOLD, not a drop. Code narrower/more conditional than "is dropped" implies |
| 7 | Account handling / local-files-vs-website governed by surrounding login system | sv_login.c:41-46 (sv_login_web modes) | `cvar_t sv_login_web ... // 0=local files, 1=auth via website, 2=mandatory auth` ; WebLoginsEnabled()/LoginModeFileBased() macros | MATCH (non-asserting deferral, accurate) |
| 8 | Default: 0 (logins disabled) | sv_login.c:39 + 557 | `cvar_t sv_login = { "sv_login", "0" };` registered via `Cvar_Register(&sv_login)` | MATCH (registered default = "0") |
| 9 | Set by: server config / rcon | sv_login.c:39, 557 | plain `cvar_t sv_login = { "sv_login", "0" }` (no userinfo/archive/special flags) registered as standard server cvar | MATCH |
| 10 | See also: sv_login_web, sv_hashpasswords | sv_login.c:41/559 ; sv_main.c:79/3450 | `cvar_t sv_login_web` (Cvar_Register sv_login.c:559) ; `cvar_t sv_hashpasswords = {"sv_hashpasswords","1"}` (Cvar_Register sv_main.c:3450) | MATCH (both real, registered, login-related) |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Wide-grep covered all 14 sv_login use-sites across sv_login.c, sv_user.c, server.h; callees followed (SV_Login, SV_LoginRequired, SV_LoginBlockJoinRequest, SV_BlockedLogin, SV_LoginCheckTimeOut, SV_Logout, checklogin paths).

Verdict: C-NEAR-MISS, single clause (#6, the "is dropped" half of the side-effect sentence). Every polarity/threshold/scope/default/see-also clause is fully enforce-traced and MATCHes. The 3-level semantics are exactly right: SV_LoginRequired (sv_login.c:877) gates on `login == 2 || (login == 1 && !cl->spectator)` -- so 0=never, 1=players-only (spectators exempt, and SV_Login:600 actively logs spectators out without an account), 2=everyone including spectators. Spectator-exempt-at-1 and everyone-at-2 both verified at the dispatch line, not inferred from the name.

The C-NEAR-MISS is the second-limb signature (code more conditional than implied), NOT a contradiction:
- The immediate at-connect behavior for a non-authenticating client is a HOLD, not a drop: sv_user.c:301-307 early-returns and leaves the client at cs_connected, blocked from spawning. The "refused entry" half (clause 5) is accurate for this.
- A drop genuinely DOES occur for an already-connected-without-account client, so the clause is not WI2/untraceable -- but only via (a) the 60-second login timeout SV_LoginCheckTimeOut->SV_DropClient (sv_login.c:840), or (b) an explicit ban / mandatory-local-account-missing via SV_BlockedLogin->SV_DropClient (sv_login.c:767). "is dropped" reads as an immediate/unconditional consequence; the enforcing reality is timeout-or-ban-gated. That gap is the near-miss.

A first-pass rewrite would hedge clause 6 to something like "...is held and cannot enter the game until it authenticates; an un-authenticated client is dropped after a login timeout (or immediately if its account is explicitly blocked)." Not a C-FIX -- the drop is real and traced; just narrower than stated.

Mandatory-mode logout drop (Cmd_Logout_f sv_user.c:3253-3254: `if ((int)sv_login.value > 1 || ((int)sv_login.value == 1 && !sv_client->spectator)) SV_DropClient`) corroborates that a player who logs out under a login requirement is dropped -- consistent with, but not the primary site for, clause 6.

## flags_for_review

- [fyi/cross-mod-override/synthesis] KTX drives sv_login from its private-server vote (ktx/src/vote.c:1554-1557: sets 1 when spectators allowed, 2 otherwise) and reads it at ktx/src/commands.c:2256. On a KTX server the admin-observable setter for sv_login is frequently the KTX 'private' vote/command, not raw config -- a candidate See also: L3 cross-link, not an override of the MVDSV enforcement.
- [review/suspected-bug/vpass] The 'is dropped' side-effect in the proposed description has a real enforcing drop (SV_LoginCheckTimeOut sv_login.c:840 on 60s login timeout; SV_BlockedLogin sv_login.c:767 on explicit ban / mandatory-local-account-missing), but the immediate at-connect effect for a non-authenticating client is a HOLD at cs_connected (sv_user.c:301-307 early return), not a drop. Phrasing reads as immediate/unconditional; enforcing reality is timeout-or-ban-gated. Recommend hedging clause 6 in re-synth.
- [fyi/off-scope-entity/vpass] Off-scope but adjacent: WEBSITE_LOGIN_SUPPORT / WWW_INTEGRATION / SERVERONLY compile guards bracket large parts of the login path (sv_login_web cvar registration sv_login.c:559 is inside #ifdef WEBSITE_LOGIN_SUPPORT; Cmd_Login_f/Cmd_Logout_f at sv_user.c:3182 are inside #if defined(SERVERONLY)&&defined(WWW_INTEGRATION)). In a build without those defines, sv_login_web is not registered and the web-auth path collapses (LoginModeFileBased()==1 always). The sv_login cvar itself (sv_login.c:39/557) is unconditional, so its 0/1/2 semantics hold regardless, but the 'website authentication' framing in clause 7 is conditional on WEBSITE_LOGIN_SUPPORT being compiled. Not a defect in the description (it defers softly to 'the surrounding login system'), flagged for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_login",
  "type": "cvar",
  "description": "Controls whether connecting clients must log in to an account before they can play.\n\n0 = no login required.\n1 = login required to play; spectators are exempt and may connect without an account.\n2 = login required for everyone, including spectators.\n\nWhen login is required, a client that does not authenticate is held at connect and cannot enter the game; one already connected without an account is dropped after a login timeout (or immediately if its account is blocked). Account handling and whether logins use local files or website authentication are governed by the surrounding login system.\n\nDefault: 0 (logins disabled).\nSet by: server config / rcon.\nSee also: sv_login_web, sv_hashpasswords.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:877. Central enforcing site SV_LoginRequired (src/sv_login.c:873-885): `int login = (int)sv_login.value;` then `if (login == 2 || (login == 1 && !cl->spectator))` (sv_login.c:877) enforces the polarity exactly -- 2 => all clients must be logged; 1 => only non-spectators; the function returns false (no login required) for value 0 (falls through to `return false;` at 885) and for spectators at value 1. The spectator-exempt-at-1 clause is independently enforced in SV_Login at sv_login.c:599-600 `if ((int)sv_login.value == 1 && cl->spectator){ SV_Logout(cl); cl->logged=-1; return true; }`. OFF-state (value 0) enforced at sv_login.c:585 `if (!(int)sv_login.value){ ... return true; }` (login not necessary). 'Refused / dropped if not authenticated': SV_LoginBlockJoinRequest sv_login.c:891/896 prints 'This server requires users to login' and returns true (blocks join) whenever `(int)sv_login.value` is nonzero and the client is not logged; the mandatory-drop path at sv_user.c:3253 `if ((int)sv_login.value > 1 || ((int)sv_login.value == 1 && !sv_client->spectator)) SV_DropClient(sv_client);` enforces dropping a player when login is mandatory for them. Default 0: registration `{ \"sv_login\", \"0\" }` at sv_login.c:39 (WI-2). Set-by: plain Cvar_Register at sv_login.c:557 (no ROM/serverinfo flag) => server config / rcon. The local-vs-web account distinction is routed to sv_login_web rather than asserted here. F-MV1: KTX SETS sv_login via its 'private server' vote (ktx/src/vote.c:1554-1557: 1 when spectators allowed, 2 otherwise) and reads it at ktx/src/commands.c:2256; this is an additional KTX-side setter, not an override of the engine login enforcement -- flagged.",
  "description_proposed": null
}
```
