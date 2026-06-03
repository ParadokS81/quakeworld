# describe-fill-synthesis ledger -- mvdsv `acc_remove`

- **project:** mvdsv
- **knob:** `acc_remove` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:acc_remove: synthesized -- deletes a login account, kicks the logged-in client when web-login is mandatory, saves to disk; admin-only, not on rcon blocklist -- origin=synthesized ref=src/sv_login.c:382 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Deletes a server login account (the kind created with acc_create).
>
> acc_remove <login> = remove the account with this login name. If the account is not found, a message is printed and nothing changes.
>
> When logins are required (sv_login 1) and the server keeps local account files, any player currently connected under that login is logged out and disconnected. The updated account list is saved to disk immediately.
>
> Set by: server console / rcon (admin only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| handler / admin-only | src/sv_login.c:563 ; src/sv_user.c:3299,3399 | `Cmd_AddCommand("acc_remove", SV_RemoveAccount_f);` ; not in ucmds[]; no fall-through | MATCH |
| not on rcon blocklist | src/sv_main.c:1754-1764 | acc_remove absent from blocklist tokens | MATCH |
| usage / arg | src/sv_login.c:341-343 | `if (Cmd_Argc() < 2) { Con_Printf("usage: acc_remove <login>\n"); return; }` | MATCH |
| match by login (case-insensitive) | src/sv_login.c:352 | `if (!strcasecmp(accounts[i].login, Cmd_Argv(1)))` | MATCH |
| kick connected user when sv_login==1 + local accounts | src/sv_login.c:354-364 | `if ((int)sv_login.value == 1) { if (LoginMustHaveLocalAccount()) { ... SV_Logout(cl); SV_DropClient(cl); } }` | MATCH |
| decrement + persist | src/sv_login.c:382-384 | `num_accounts--; Con_Printf("login %s removed\n"...); WriteAccounts();` | MATCH |
| not-found path | src/sv_login.c:391 | `Con_Printf("account for %s not found\n", Cmd_Argv(1));` | MATCH |
| F-MV1 no KTX override | ktx/src (grep) | grep acc_remove -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Deletes a server login account (kind created with acc_create) | src/sv_login.c:337-385 (handler); :369-382 remove logic; :326 acc_create writes | `void SV_RemoveAccount_f(void)` ... `memcpy(&accounts[i], &accounts[num_accounts-1], ...); ... num_accounts--; ... WriteAccounts();` | MATCH |
| 2 | `acc_remove <login>` = remove account with this login name | src/sv_login.c:352; usage :343 | `if (!strcasecmp(accounts[i].login, Cmd_Argv(1)))` ; `Con_Printf("usage: acc_remove <login>\n")` | MATCH (case-insensitive match by login) |
| 3 | If account not found, a message is printed and nothing changes | src/sv_login.c:391 | `Con_Printf("account for %s not found\n", Cmd_Argv(1));` (loop falls through; no mutation on no-match) | MATCH |
| 4a | "mandatory web login is in effect (sv_login 1)" -- equates sv_login 1 with mandatory web login | src/sv_login.c:354 (gate) vs :39, :599-600, :877, :44 (semantics) | `if ((int)sv_login.value == 1)` ; cvar comment `"if enabled, login required"` ; `// sv_login == 1 -> spectators don't login` ; `if (login == 2 || (login == 1 && !cl->spectator))` ; `#define LoginModeMandatoryWeb() ((int)sv_login_web.value == 2)` | MISMATCH -- sv_login 1 means "players must login, spectators exempt"; mandatory-for-all is sv_login 2 (which does NOT fire this block); "web" is the separate sv_login_web cvar (mandatory web = sv_login_web 2). Label contradicts the enforcing line's meaning. |
| 4b | "and local accounts are required" | src/sv_login.c:356, def :45 | `if (LoginMustHaveLocalAccount())` ; `#define LoginMustHaveLocalAccount() (LoginModeMandatoryWeb() || LoginModeFileBased())` | MATCH (acceptable plain-English gloss of the macro) |
| 4c | player connected under that login is logged out and disconnected | src/sv_login.c:357-364; SV_Logout :638-656; SV_DropClient sv_main.c:377+ | `if (!strcasecmp(cl->login, Cmd_Argv(1))) { SV_Logout(cl); SV_DropClient(cl); }` ; SV_Logout clears login state; SV_DropClient logs "disconnect" | MATCH |
| 5 | The updated account list is saved to disk immediately | src/sv_login.c:384; WriteAccounts :101-127 | `WriteAccounts();` -> `fopen(va("%s/" ACC_FILE, fs_gamedir), "wt")` ... `fprintf(...)` ... `fclose(f)` | MATCH (fires unconditionally on every successful removal, not only the mandatory branch) |
| 6 | Set by: server console / rcon (admin only) | src/sv_login.c:563 (registration); sv_main.c:1701-1828 (rcon path) | `Cmd_AddCommand("acc_remove", SV_RemoveAccount_f);` (no client exposure, no CF_ flag in MVDSV's 2-arg Cmd_AddCommand) ; rcon validates rcon_password/master_rcon_password then `Cmd_ExecuteString(str)` | MATCH (server console + rcon-authenticated admin) |

**V-pass notes:** C-FIX. Five of six clauses trace clean to enforcing lines (registration, match-by-login, not-found no-op, logout+disconnect effect, disk-save). The defect is clause 4a: the description equates "mandatory web login" with "sv_login 1". The enforcing gate is `if ((int)sv_login.value == 1)` (sv_login.c:354), but the code's own semantics for sv_login (cvar comment line 39 "if enabled, login required"; SV_LoginRequired line 877 `login == 2 || (login == 1 && !cl->spectator)`; line 599-600 "sv_login == 1 -> spectators don't login") define sv_login 1 as "players must login, spectators exempt" -- NOT mandatory-for-all and NOT web-specific. The genuinely-mandatory level is sv_login 2, which does NOT execute this logout block (gate is strictly `== 1`). "Mandatory web login" is a different cvar's state entirely: LoginModeMandatoryWeb() == (sv_login_web == 2), and the whole web layer is `#ifdef WEBSITE_LOGIN_SUPPORT` (line 40-46). The label was inferred from the web-login feature area / the LoginMustHaveLocalAccount() function name rather than from what the enforcing line gates on -- textbook flavour-C, and it directly contradicts the meaning of sv_login 1 (it even inverts the mandatory/scope relationship by attaching "mandatory" to the value at which the block fires, value 1, while the truly-mandatory value 2 does not fire it). Clause 4b's "local accounts are required" is a fair gloss of LoginMustHaveLocalAccount() and clause 4c's logout+disconnect is correctly traced, so the paragraph's mechanism is mostly right -- but the gating LABEL is wrong, which is the C-FIX. Re-synth should describe the gate as: fires only when sv_login == 1 AND the server uses local accounts (file-based sv_login_web 0, or mandatory-web sv_login_web 2), dropping the "mandatory web login" equation. Minor presentation note (not the defect): clause 5 (disk save) sits after the conditional paragraph and could read as part of that branch, but WriteAccounts() at :384 runs on every successful removal regardless of sv_login -- the sentence is true as written.

## flags_for_review

- [fyi/suspected-bug/vpass] sv_login value semantics (verified): 0 = login disabled; 1 = players must login, spectators exempt (sv_login.c:599-600, 877); 2 (>1) = mandatory for all incl. spectators (sv_login.c:877, sv_user.c:3253). The acc_remove logout-on-delete block fires ONLY at sv_login == 1 (strict equality, sv_login.c:354) and NOT at sv_login == 2. This asymmetry (logout/drop on account removal happens at the players-only level but not the everyone-mandatory level) looks intentional-but-surprising; worth confirming with upstream whether the strict `== 1` is deliberate or should be `>= 1`. FYI only -- not a defect in the description per se, but it is the root of the description's mislabel.
- [fyi/other/vpass] The entire web-login layer (sv_login_web cvar and LoginModeMandatoryWeb/FileBased/OptionalWeb macros, sv_login.c:40-53) is gated behind `#ifdef WEBSITE_LOGIN_SUPPORT`. When not compiled, LoginMustHaveLocalAccount() is hardcoded to 1 (always true) and LoginModeMandatoryWeb() to 0. So whether clause 4b's gate (LoginMustHaveLocalAccount) is ever false at runtime depends on the build's compile flags -- in a non-WEBSITE_LOGIN_SUPPORT build the local-account requirement is unconditional. The oracle should note that the sv_login_web-dependent behavior only exists in WEBSITE_LOGIN_SUPPORT builds.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "acc_remove",
  "type": "command",
  "description": "Deletes a server login account (the kind created with acc_create).\n\nacc_remove <login> = remove the account with this login name. If the account is not found, a message is printed and nothing changes.\n\nWhen logins are required (sv_login 1) and the server keeps local account files, any player currently connected under that login is logged out and disconnected. The updated account list is saved to disk immediately.\n\nSet by: server console / rcon (admin only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:382. Handler SV_RemoveAccount_f registered Cmd_AddCommand-only at sv_login.c:563 (not in ucmds[] sv_user.c:3299; no fall-through sv_user.c:3399 -> admin-only). Not on the normal-rcon blocklist (sv_main.c:1754-1764) -> plain 'server console / rcon'. Usage 'acc_remove <login>' at sv_login.c:343 (Argc<2 guard). Match by case-insensitive login sv_login.c:352. Kick-on-remove: gated on (int)sv_login.value==1 AND LoginMustHaveLocalAccount() at sv_login.c:354-356, then for each connected client with that login SV_Logout + SV_DropClient sv_login.c:357-364. Account-array compaction (moves last account into the freed slot, fixes up cl->logged pointers) sv_login.c:369-380 -- an internal detail, omitted from the user doc. num_accounts-- and persistence WriteAccounts sv_login.c:382-384. Not-found message 'account for %s not found' sv_login.c:391. F-MV1: no KTX override (grep ktx/src empty). Worked example: 'acc_remove alice' deletes login alice. No registered default for a command.",
  "description_proposed": null
}
```
