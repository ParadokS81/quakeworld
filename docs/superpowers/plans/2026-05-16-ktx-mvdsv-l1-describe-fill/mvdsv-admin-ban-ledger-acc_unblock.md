# describe-fill-synthesis ledger -- mvdsv `acc_unblock`

- **project:** mvdsv
- **knob:** `acc_unblock` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:acc_unblock: synthesized -- unblocks a local login account (login-name match), resets its failed-login counter (reverses both manual block and auto-lockout), no-op if not blocked, persisted to <gamedir>/accounts; admin-only, no KTX override -- origin=synthesized ref=src/sv_login.c:460 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Unblocks a previously blocked local login account so it can log in again. The account is matched by its login name (case-insensitive). Unblocking also clears the account's failed-login counter, which matters because accounts are auto-blocked after too many failed login attempts -- so this reverses both a manual acc_block and an automatic lockout. If the named account is not currently blocked, nothing changes. The result is saved to the server's account list file.
>
> acc_unblock <login> = unblock the account with that login name.
>
> Set by: server console / rcon.
> See also: acc_block.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registration (admin-only locator) | src/sv_login.c:565 | Cmd_AddCommand("acc_unblock", SV_UnblockAccount_f); | MATCH |
| requires <login> arg | src/sv_login.c:474 | if (Cmd_Argc() < 2) { Con_Printf("usage: acc_unblock <login>\n"); return; } | MATCH |
| delegates with block=false | src/sv_login.c:480 | SV_blockAccount(false); | MATCH |
| matched by login, case-insensitive | src/sv_login.c:441 | if (!strcasecmp(accounts[i].login, Cmd_Argv(1))) | MATCH |
| no-op when not blocked | src/sv_login.c:456-458 | if (accounts[i].state != a_blocked) { Con_Printf("account %s not blocked\n", ...); } | MATCH |
| restores account to usable state | src/sv_login.c:460 | accounts[i].state = a_ok; | MATCH |
| clears failed-login counter | src/sv_login.c:461 | accounts[i].failures = 0; | MATCH |
| failed logins auto-block (why reset matters) | src/sv_login.c:536-538 | if (++accounts[i].failures >= MAX_FAILURES) { ... accounts[i].state = a_blocked; } | MATCH |
| unblocked account passes login again | src/sv_login.c:518-519 | if (accounts[i].state == a_blocked) return -2;  (no longer hit once a_ok) | MATCH |
| persisted to account file | src/sv_login.c:481 | WriteAccounts(); | MATCH |
| account file = <gamedir>/accounts | src/sv_login.c:108 / :36 | fopen(va("%s/" ACC_FILE, fs_gamedir),"wt"); #define ACC_FILE "accounts" | MATCH |
| not in client ucmds[] (admin-only) | src/sv_user.c:3299 | static ucmd_t ucmds[] = ... (grep acc_unblock empty) | MATCH |
| no KTX override (F-MV1) | ktx/src (grep) | zero matches for acc_unblock/blockaccount | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Unblocks a previously blocked account so it can log in again (blocked accounts are refused at login) | sv_login.c:460 (set a_ok) + 518-519 + 746-747 | `accounts[i].state = a_ok;` / blocked: `if (accounts[i].state == a_blocked) return -2;` -> `case -2: SV_BlockedLogin(cl);` | MATCH |
| 2 | Matched by login name | sv_login.c:441 | `if (!strcasecmp(accounts[i].login, Cmd_Argv(1)))` | MATCH |
| 3 | Matching is case-insensitive | sv_login.c:441 | `!strcasecmp(accounts[i].login, Cmd_Argv(1))` (strcasecmp = case-fold compare) | MATCH |
| 4 | Unblocking also clears the failed-login counter | sv_login.c:461 | `accounts[i].failures = 0;` | MATCH |
| 5 | Accounts are auto-blocked after too many failed login attempts (threshold) | sv_login.c:34, 536-538 | `#define MAX_FAILURES 10` ; `if (++accounts[i].failures >= MAX_FAILURES) { ... accounts[i].state = a_blocked; }` | MATCH |
| 6 | Reverses both a manual acc_block AND an automatic lockout | sv_login.c:444 (acc_block sets a_blocked) + 538 (auto sets a_blocked); both undone at 460 | manual: `accounts[i].state = a_blocked;` ; auto: `accounts[i].state = a_blocked;` ; undo: `accounts[i].state = a_ok;` | MATCH |
| 7 | If the named account is not currently blocked, nothing changes (OFF-state) | sv_login.c:456-458 | `if (accounts[i].state != a_blocked) { Con_Printf("account %s not blocked\n", Cmd_Argv(1)); } else { ... }` then `return;` -- no mutation in the not-blocked branch | MATCH |
| 8 | Result is saved to the server's account list file (side-effect) | sv_login.c:481 -> 97-108 | `WriteAccounts();` -> `/* Writes account list to disk */` ; `fopen(va("%s/" ACC_FILE, fs_gamedir), "wt")` (ACC_FILE="accounts") | MATCH |
| 9 | Usage `acc_unblock <login>` (requires an argument) | sv_login.c:474-476 | `if (Cmd_Argc() < 2) { Con_Printf("usage: acc_unblock <login>\n"); return; }` | MATCH |
| 10 | Set by: server console / rcon (admin only) | sv_login.c:565 (plain Cmd_AddCommand) ; sv_user.c:3299-3385 (absent from ucmds[]) ; sv_main.c:1799-1828 (rcon password-gated -> Cmd_ExecuteString) | `Cmd_AddCommand("acc_unblock", SV_UnblockAccount_f);` ; not present in client `ucmds[]` table ; rcon: `do_cmd` set only after password validation, then `Cmd_ExecuteString(str);` | MATCH |
| 11 | See also: acc_block | sv_login.c:484-494, 566 | `void SV_BlockAccount_f(void)` -> `SV_blockAccount(true);` ; `Cmd_AddCommand("acc_block", SV_BlockAccount_f);` | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv @ 1.11-53-g18d0362. All use-sites of acc_unblock live in src/sv_login.c (registration line 565, usage-string line 476). The enforcing logic is in the shared helper SV_blockAccount(qbool block) -- the unblock branch (block=false) is lines 456-465; the handler SV_UnblockAccount_f (472-482) calls SV_blockAccount(false) then WriteAccounts(). I followed the callee (the caller has no gating of its own beyond the arg-count check) and verified every asserted clause against the helper's actual code and adjacent comments.

Every material clause -- polarity (a_blocked -> a_ok), the case-insensitive name match, the failures-counter reset, the MAX_FAILURES=10 auto-block rationale, the dual-source reversal (manual acc_block + auto lockout), the not-blocked no-op OFF-state, the file-write side-effect, the usage arg requirement, and the access-class -- maps to a located enforcing line and MATCHES. Access-class was traced, not name-inferred: acc_unblock is registered via plain Cmd_AddCommand into the server-console command table and is absent from the client ucmds[] dispatch table (sv_user.c:3299-3385), so ordinary players cannot reach it via `cmd`; the only remote path is rcon, which password-validates before routing to Cmd_ExecuteString (sv_main.c:1799-1828). "Admin only" via server console / rcon is therefore correct.

One completeness observation (does NOT move classification): the helper SV_blockAccount matches purely on the login-string field and does NOT filter by account use-type (use_log vs use_ip). IP-based entries created via `acc_create <address> <username>` (sv_login.c:260-262, stored with use=use_ip, the IP string in the .login field) can also be blocked/unblocked by the same commands. The proposed description scopes to "local login account," which is the dominant, documented case and the only case where the failures-reset framing is meaningful (IP accounts never carry a failures field -- WriteAccounts line 119-122 omits it, and the failures-increment path is gated by LoginMustHaveLocalAccount()/use_log). This is "the real code is BROADER than implied" (a secondary un-asserted behavior), not a wrong, narrowed, or name-inferred clause -- it is outside the flavour-C definition. Flagged FYI for the author in case they want to widen the scope sentence; it is not a defect in any asserted clause.

## flags_for_review

- [fyi/other/synthesis] acc_unblock clears accounts[i].failures = 0 (sv_login.c:461) in addition to setting a_ok. This is load-bearing: accounts auto-block after MAX_FAILURES failed logins (sv_login.c:536-538), so acc_unblock is the single recovery path for BOTH a manual acc_block and an automatic failed-login lockout. Captured in the description; flagging the dual-recovery semantics because the command name only implies reversing a manual block.
- [fyi/off-scope-entity/vpass] acc_unblock (and its twin acc_block) operate on the unified accounts[] array via SV_blockAccount, which matches by the login-string field WITHOUT filtering account use-type. IP-based entries created by `acc_create <address> <username>` (use_ip, IP string stored in .login) are therefore also blockable/unblockable by these commands. The proposed description scopes only to 'local login account'. This is a code-is-broader completeness gap, not a wrong clause -- every ASSERTED clause is correct for login accounts, and the failures-reset/auto-block framing is login-specific (IP accounts carry no persisted failures field; WriteAccounts sv_login.c:119-122). Author may optionally widen the first sentence to acknowledge IP entries; no clause needs correction.
- [fyi/other/vpass] Side-effect not in the proposed description (FYI, not a defect): a MANUAL acc_block of a logged-in account also drops that client (SV_blockAccount lines 447-452, SV_DropClient loop). That drop is on the BLOCK path only; acc_unblock has no such side-effect, so its omission from the unblock description is correct. Noted only so the author of acc_block's description is aware of the asymmetry.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "acc_unblock",
  "type": "command",
  "description": "Unblocks a previously blocked local login account so it can log in again. The account is matched by its login name (case-insensitive). Unblocking also clears the account's failed-login counter, which matters because accounts are auto-blocked after too many failed login attempts -- so this reverses both a manual acc_block and an automatic lockout. If the named account is not currently blocked, nothing changes. The result is saved to the server's account list file.\n\nacc_unblock <login> = unblock the account with that login name.\n\nSet by: server console / rcon.\nSee also: acc_block.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:460. Handler SV_UnblockAccount_f at sv_login.c:472 registered via Cmd_AddCommand at sv_login.c:565; arg-shape clause (requires <login>) enforced at sv_login.c:474-477 (Cmd_Argc()<2 -> 'usage: acc_unblock <login>' return). Delegates to SV_blockAccount(false) at sv_login.c:480. Match clause: case-insensitive login match at sv_login.c:441 (!strcasecmp(accounts[i].login, Cmd_Argv(1))) -- shared helper. Unblock clauses (block==false branch): if state != a_blocked -> 'account %s not blocked' no-op at sv_login.c:456-458; else state = a_ok at sv_login.c:460 AND failures = 0 at sv_login.c:461, print 'account %s unblocked' (sv_login.c:462). Why failures-reset matters: auto-block on failed logins at sv_login.c:536-538 (if (++accounts[i].failures >= MAX_FAILURES) accounts[i].state = a_blocked) -- so clearing failures reverses an automatic lockout, not just a manual block; login then permitted because checklogin no longer hits the a_blocked return -2 (sv_login.c:518-519). Persistence clause: WriteAccounts() at sv_login.c:481 -> fopen(va('%s/' ACC_FILE, fs_gamedir)) at sv_login.c:108, ACC_FILE='accounts' (sv_login.c:36) -> <gamedir>/accounts. Access class: NOT present in client ucmds[] table (sv_user.c:3299 grep empty); Cmd_AddCommand-only => server console/rcon admin-only. F-MV1: KTX src grep for acc_unblock/acc_block/blockaccount returned zero -- no cross-mod override. WI-2: command, no meaningful no-arg default, Default omitted. Not-found path: 'account %s not found' at sv_login.c:469.",
  "description_proposed": null
}
```
