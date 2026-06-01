# describe-fill-synthesis ledger -- mvdsv `acc_block`

- **project:** mvdsv
- **knob:** `acc_block` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:acc_block: synthesized -- blocks a local login account (login-name match), kicks any connected player under it, refused at future login, persisted to <gamedir>/accounts; admin-only, no KTX override -- origin=synthesized ref=src/sv_login.c:444 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Blocks a local login account so it can no longer log in to the server. The account is matched by its login name (case-insensitive); if a player is currently connected under that account, they are immediately disconnected. A blocked account is refused at every future login attempt until it is unblocked. The block is saved to the server's account list file so it persists across restarts and map changes.
>
> acc_block <login> = block the account with that login name.
>
> Set by: server console / rcon.
> See also: acc_unblock.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registration (admin-only locator) | src/sv_login.c:566 | Cmd_AddCommand("acc_block", SV_BlockAccount_f); | MATCH |
| requires <login> arg | src/sv_login.c:486 | if (Cmd_Argc() < 2) { Con_Printf("usage: acc_block <login>\n"); return; } | MATCH |
| delegates with block=true | src/sv_login.c:492 | SV_blockAccount(true); | MATCH |
| matched by login, case-insensitive | src/sv_login.c:441 | if (!strcasecmp(accounts[i].login, Cmd_Argv(1))) | MATCH |
| sets account state to blocked | src/sv_login.c:444 | accounts[i].state = a_blocked; | MATCH |
| a_blocked enum exists | src/sv_login.c:60 | typedef enum { a_free, a_ok, a_blocked } acc_state_t; | MATCH |
| drops connected client under that account | src/sv_login.c:447-452 | for (j...MAX_CLIENTS) if (!strcasecmp(svs.clients[j].login, accounts[i].login)) { SV_DropClient(&svs.clients[j]); break; } | MATCH |
| blocked account refused at login | src/sv_login.c:518-519 | if (accounts[i].state == a_blocked) return -2; | MATCH |
| persisted to account file | src/sv_login.c:493 | WriteAccounts(); | MATCH |
| account file = <gamedir>/accounts | src/sv_login.c:108 / :36 | fopen(va("%s/" ACC_FILE, fs_gamedir),"wt"); #define ACC_FILE "accounts" | MATCH |
| not in client ucmds[] (admin-only) | src/sv_user.c:3299 | static ucmd_t ucmds[] = ... (grep acc_block empty) | MATCH |
| no KTX override (F-MV1) | ktx/src (grep) | zero matches for acc_block/blockaccount | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Blocks a local login account so it can no longer log in | sv_login.c:444 + sv_login.c:518-519 | `accounts[i].state = a_blocked;` ... `if (accounts[i].state == a_blocked) return -2;` | MATCH |
| 2 | Account matched by login name (case-insensitive) | sv_login.c:441 | `if (!strcasecmp(accounts[i].login, Cmd_Argv(1)))` | MATCH |
| 3 | Currently-connected player under that account is immediately disconnected | sv_login.c:447-452 (callee SV_DropClient sv_main.c:399,431) | `for (j=0; j<MAX_CLIENTS; ++j){ if(!strcasecmp(svs.clients[j].login, accounts[i].login)){ SV_DropClient(&svs.clients[j]); break; } }`  /  `MSG_WriteByte(&drop->netchan.message, svc_disconnect);` ... `drop->state = cs_zombie;` | MATCH |
| 4 | Refused at every future login attempt until unblocked | sv_login.c:518-519 (checklogin) → callers sv_login.c:746-747, 764-768, 848-850; unblock sv_login.c:460 | `if (accounts[i].state == a_blocked) return -2;` / `case -2: SV_BlockedLogin(cl);` / `SV_ClientPrintf2(cl,PRINT_HIGH,"Login blocked\n"); SV_DropClient(cl);` / unblock: `accounts[i].state = a_ok;` | MATCH |
| 5 | Block saved to account list file; persists across restarts + map changes | sv_login.c:493 (WriteAccounts call) + sv_login.c:108-122 (write state) + sv_init.c:272 (SV_LoadAccounts on SpawnServer) | `SV_blockAccount(true); WriteAccounts();` / `fprintf(f, "%s %s %d %d\n", acc->login, acc->pass, acc->state, acc->failures);` / `SV_LoadAccounts();` (inside SV_SpawnServer) | MATCH |
| 6 | Syntax: acc_block <login> | sv_login.c:486-488 | `if (Cmd_Argc() < 2){ Con_Printf("usage: acc_block <login>\n"); return; }` | MATCH |
| 7 | Set by server console / rcon (admin only) | sv_login.c:566 (Cmd_AddCommand) + sv_main.c:1701,1708,1828 (rcon→Cmd_ExecuteString) + sv_main.c:1754-1765 (NOT in normal-rcon blacklist); absent from sv_user.c:3299 ucmds[] | `Cmd_AddCommand("acc_block", SV_BlockAccount_f);` / rcon both tiers reach `Cmd_ExecuteString(str);`; `acc_block` not in the `rm/rmdir/ls/chmod/...` normal-rcon denylist; not present in client `ucmds[]` table | MATCH |
| 8 | See also: acc_unblock | sv_login.c:565 + sv_login.c:456-463 | `Cmd_AddCommand("acc_unblock", SV_UnblockAccount_f);` / unblock branch: `accounts[i].state = a_ok; accounts[i].failures = 0;` | MATCH |

**V-pass notes:** Oracle confirmed mvdsv @ 1.11-53-g18d0362. All eight material clauses enforce-traced to located source lines (callees followed: SV_DropClient for the disconnect, checklogin/SV_BlockedLogin for the login-refusal, WriteAccounts+SV_LoadAccounts for persistence, the rcon dispatch in sv_main.c for the access class). No clause is name/string/enum inference. The command handler chain is SV_BlockAccount_f (guards argc) -> SV_blockAccount(true) (sets a_blocked, prints "account %s blocked", drops the matching live client) -> WriteAccounts (persists state to the gamedir "accounts" file).

WI-2 access-class check (the discipline's mandatory non-name-inferred verification): acc_block is registered with plain Cmd_AddCommand and is NOT in the client ucmds[] table (sv_user.c:3299), so connected non-rcon players cannot invoke it. It is reachable from the server console and from rcon. Both master-rcon and normal admin-rcon paths reach Cmd_ExecuteString (sv_main.c:1828), and acc_block is NOT in the normal-rcon denylist (sv_main.c:1754-1765), so a standard rcon_password admin can run it. The description's "server console / rcon (admin only)" is therefore accurate, not name-inferred.

One still-true scoping nuance (does NOT drop below TRACED-CLEAN): the underlying accounts[] array holds both use_log (name) and use_ip (IP) entries; the a_blocked check in checklogin and the match in SV_blockAccount are use-agnostic, so acc_block <ip-string> would also block an IP-based account (its login field IS the IP). The description's "login name" framing covers the dominant/intended case and is traceable and not misleading; it simply omits the IP-account sub-case. Acceptable per PROC-1 (traceable minor vagueness).

Minor identifier note for downstream: the persisted file is ACC_FILE = "accounts" under fs_gamedir; ACC_DIR ("users") is commented out / unused. The description says "account list file" generically -- correct, no filename asserted.

## flags_for_review

- [fyi/other/synthesis] acc_block/acc_unblock operate on the LOCAL login-account store (the 'accounts' file), not on an IP/player ban list -- an admin reading the name may expect an IP/player ban (that is the addip/ban family). acc_block does drop the connected client as a side effect, but the persistent target is the account record. Disambiguated in the description; flagging in case the catalog wants a cross-reference to the IP-ban family.
- [fyi/other/vpass] checklogin returns -2 for a blocked account regardless of use type. The use_ip connect path (sv_login.c:609) only treats checklogin > 0 as success and lets <=0 fall through to the normal 'need to login' flow, so a blocked use_ip account is simply refused at connect-time IP auth rather than routed through SV_BlockedLogin's explicit 'Login blocked' message. Not a contradiction of the description (which describes name-based login accounts); noted only as an asymmetry in how -2 surfaces between the IP-connect path and the use_log/web paths.
- [fyi/off-scope-entity/vpass] Identical sv_login.c (acc_block -> SV_BlockAccount_f -> SV_blockAccount) is vendored verbatim into ezquake-source, unezquake, and dusty-mvdsv (all show acc_block at the same lines 488/566). This is the embedded mvdsv server in those trees, not a behavioral override. KTX (the QVM mod layer) does NOT define acc_block. Confirms no cross-mod override affects the documented mvdsv behavior.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "acc_block",
  "type": "command",
  "description": "Blocks a local login account so it can no longer log in to the server. The account is matched by its login name (case-insensitive); if a player is currently connected under that account, they are immediately disconnected. A blocked account is refused at every future login attempt until it is unblocked. The block is saved to the server's account list file so it persists across restarts and map changes.\n\nacc_block <login> = block the account with that login name.\n\nSet by: server console / rcon.\nSee also: acc_unblock.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:444. Handler SV_BlockAccount_f at sv_login.c:484 registered via Cmd_AddCommand at sv_login.c:566; arg-shape clause (requires <login>) enforced at sv_login.c:486-489 (Cmd_Argc()<2 -> 'usage: acc_block <login>' return). Delegates to SV_blockAccount(true) at sv_login.c:492. Match clause: case-insensitive login match at sv_login.c:441 (!strcasecmp(accounts[i].login, Cmd_Argv(1))). Core block clause: accounts[i].state = a_blocked at sv_login.c:444 (a_blocked enum at sv_login.c:60). Kick-connected-player side effect: sv_login.c:447-452 loops MAX_CLIENTS, SV_DropClient on matching login. Login-refusal enforcement (what 'blocked' MEANS): checklogin returns -2 for a_blocked account at sv_login.c:518-519, a login failure. Persistence clause: WriteAccounts() at sv_login.c:493 -> fopen(va('%s/' ACC_FILE, fs_gamedir)) at sv_login.c:108 where ACC_FILE='accounts' (sv_login.c:36) -- written to <gamedir>/accounts. Access class: NOT present in client ucmds[] table (sv_user.c:3299 grep empty); Cmd_AddCommand-only => server console/rcon admin-only. F-MV1: KTX src grep for acc_block/acc_unblock/blockaccount returned zero -- no cross-mod override; behavior is pure MVDSV engine. Counterintuitive-name disambiguation: acts on the local login-account store, not on an IP/player ban list; the player-drop is a side effect, the account block is the persistent target. WI-2: command, no meaningful no-arg default, so Default omitted. Not-found path: 'account %s not found' at sv_login.c:469.",
  "description_proposed": null
}
```
