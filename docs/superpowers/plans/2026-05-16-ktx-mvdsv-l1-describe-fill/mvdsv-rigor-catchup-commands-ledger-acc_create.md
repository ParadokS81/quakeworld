# describe-fill-synthesis ledger -- mvdsv `acc_create`

- **project:** mvdsv
- **knob:** `acc_create` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:acc_create: synthesized -- creates login/IP server account (3-40 char a-zA-Z0-9._; pass defaults to login; 1000 cap; saved to disk); admin-only, not on rcon blocklist -- origin=synthesized ref=src/sv_login.c:314 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Creates a server login account that players can use to authenticate (see sv_login). Two forms are accepted: a name/password login, or a name tied to a connecting IP address.
>
> acc_create <login> [<password>] = create a password account; if the password is omitted, the login name is also used as the password. Login and password may contain only letters, digits, '.' and '_', and must be at least 3 characters (only the first 40 are stored).
> acc_create <address> <username> = create an account that logs in automatically from the given IP address (a 0 in any address octet matches any value there); no password is used.
>
> A duplicate login name is rejected, and no more than 1000 accounts can exist. The account list is saved to disk immediately.
>
> Set by: server console / rcon (admin only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| handler / admin-only (Cmd_AddCommand, not ucmds[]) | src/sv_login.c:562 ; src/sv_user.c:3299,3399 | `Cmd_AddCommand("acc_create", SV_CreateAccount_f);` ; ucmds[] has no acc_create; 'Bad user command' no fall-through | MATCH |
| not on rcon blocklist -> plain console/rcon | src/sv_main.c:1754-1764 | blocklist tokens rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/sv_timestamplen/log*/sys_command_line -- acc_create absent | MATCH |
| login form syntax | src/sv_login.c:248-250 | `if (Cmd_Argc() < 2) ... usage: acc_create <login> [<password>]` | MATCH |
| IP/address form selected by StringToFilter | src/sv_login.c:260-267 | `if (StringToFilter(Cmd_Argv(1), &adr)) { use = use_ip; if (Cmd_Argc() < 3) ... usage: acc_create <address> <username>` | MATCH |
| password defaults to login when omitted | src/sv_login.c:315-320 | `if (Cmd_Argc() == 3) i = 2; else i = 1; strlcpy(accounts[spot].pass, ... Cmd_Argv(i) ...)` | MATCH |
| char set + length 3-40 | src/sv_login.c:81-90,274,280 | validAcc allows a-zA-Z0-9 '.' '_'; `return acc - s <= MAX_LOGINNAME && acc - s >= 3;` ; callers reject invalid | MATCH |
| duplicate login rejected | src/sv_login.c:296-307 | `if (!strcasecmp(accounts[i].login, Cmd_Argv(1)) ...) break; ... Con_Printf("Login already in use\n")` | MATCH |
| max 1000 accounts | src/sv_login.c:254 ; src/sv_login.c:33 | `if (num_accounts == MAX_ACCOUNTS)` ; `#define MAX_ACCOUNTS 1000` | MATCH |
| persists to disk | src/sv_login.c:326 ; src/sv_login.c:101-127 | `WriteAccounts();` ; `Writes account list to disk` / fprintf loop | MATCH |
| F-MV1 no KTX override | ktx/src (grep) | grep acc_create -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Creates a server login account for authentication (relates to sv_login) | sv_login.c:562; sv_login.c:39 | `Cmd_AddCommand("acc_create", SV_CreateAccount_f);` ; `cvar_t sv_login = { "sv_login", "0" }; // if enabled, login required` | MATCH |
| 2 | Two forms accepted (name/password OR name tied to IP) | sv_login.c:260-271 | `if (StringToFilter(Cmd_Argv(1), &adr)) { use = use_ip; ... } else { use = use_log; ... }` | MATCH |
| 3 | `acc_create <login> [<password>]` = password account | sv_login.c:269-285, 314-320 | `use = use_log; ... validAcc(Cmd_Argv(1)) ...` then stores login+pass | MATCH |
| 4 | If password omitted, login name used as the password | sv_login.c:315-320 | `if (Cmd_Argc() == 3) i = 2; else i = 1; strlcpy(accounts[spot].pass, ... Cmd_Argv(i), ...)` (Argc==2 -> i=1 -> pass=login) | MATCH |
| 5 | Login/password may contain ONLY letters, digits, '.' and '_' | sv_login.c:83-87 | `if (*acc < 'a'||*acc>'z') if (*acc<'A'||*acc>'Z') if (*acc<'0'||*acc>'9') if (*acc!='.' && *acc!='_') return false;` | MATCH |
| 6 | Must be 3-40 characters | sv_login.c:90 (validAcc); MAX_LOGINNAME = sv_login.c:35 + sha1.h:27 | `return acc - s <= MAX_LOGINNAME && acc - s >= 3;` with `MAX_LOGINNAME = DIGEST_SIZE*2+1 = 41` | MISMATCH (enforcing cap is 41, not 40; "40" is the usage-string value MAX_LOGINNAME-1, not the validation. Min=3 correct, char-set correct) |
| 7 | `acc_create <address> <username>` = IP-auto-login form | sv_login.c:260-267, 296-297 | `if (StringToFilter(Cmd_Argv(1), &adr)) { use = use_ip; if (Cmd_Argc()<3){usage...return;} }` | MATCH |
| 8 | A 0 in any address octet matches any value there | sv_main.c:2057-2058 (StringToFilter) | `b[i] = Q_atoi(num); if (b[i] != 0) m[i] = 255;` (octet 0 -> mask byte 0 -> not compared) | MATCH |
| 9 | IP form: no password is used | sv_login.c:269-285 (no validAcc/pass-challenge for use_ip); SV_Login authenticates by IP | use_ip branch never validates/requires a password; auth is by IP-filter match | MATCH (user-doc level: IP auth, no password challenge) |
| 10 | A duplicate login name is rejected | sv_login.c:296-307 | `if (!strcasecmp(accounts[i].login, Cmd_Argv(1)) || ...) break;` then `if (c < num_accounts){Con_Printf("Login already in use\n"); return;}` | MATCH |
| 11 | No more than 1000 accounts can exist | sv_login.c:254-258, 33 | `if (num_accounts == MAX_ACCOUNTS){Con_Printf("MAX_ACCOUNTS reached\n"); return;}` with `#define MAX_ACCOUNTS 1000` | MATCH |
| 12 | Account list saved to disk immediately | sv_login.c:326 -> 101-131 (WriteAccounts) | `WriteAccounts();` (fopen/fprintf/fclose to ACC_FILE on each successful create) | MATCH |
| 13 | Set by: server console / rcon (admin only) | sv_login.c:562; cmd.h:85-91; sv_main.c:1828 | Registered with plain `Cmd_AddCommand` (no client/CF flag); absent from sv_user.c client cmd table; dispatched via `Cmd_ExecuteString` after `Rcon_Validate`. Not player-reachable. | MATCH |

**V-pass notes:** ORACLE confirmed: git describe == 1.11-53-g18d0362. enforce-trace-discipline.md loaded and applied per-clause.

VERDICT: C-FIX. Exactly one clause CONTRADICTS its enforcing line.

Clause 6 ("must be 3-40 characters"): The enforcing validation is validAcc() at sv_login.c:90: `return acc - s <= MAX_LOGINNAME && acc - s >= 3;`. MAX_LOGINNAME resolves to DIGEST_SIZE*2+1 = 20*2+1 = 41 (sv_login.c:35 -> sha1.h:27, single definition, no redefinition). `acc - s` is strlen (s saved at entry line 79, acc advanced to NUL by the char loop). So validAcc ACCEPTS lengths 3 through 41 inclusive; a 42-char string is the first rejected. The description's upper bound "40" is the value printed in the two usage strings (sv_login.c:250, 265) as `MAX_LOGINNAME - 1`, i.e. a help-string number, NOT the enforcing comparison. This is the textbook flavour-C pattern: the threshold was lifted from the usage text / a name-adjacent string instead of the branch that enforces it. A 41-char login passes validation, then is truncated to 40 chars on storage by `strlcpy(..., MAX_LOGINNAME)` at line 314 -- so 40 is the stored cap but NOT the validation/acceptance boundary the clause asserts. The minimum "3" is correct (`>= 3`); the char-set "letters, digits, '.' and '_'" is correct (lines 83-87).

Minimal fix direction (FYI, not in scope to apply): change "3-40 characters" to reflect the validation reality -- the validator accepts 3-41 characters; 41-char logins are silently truncated to 40 on storage. A defensible user-doc phrasing: "must be at least 3 characters and is stored up to 40 characters." But the literal "40" as the rejection threshold is wrong.

The other 12 clauses all trace cleanly to located enforcing lines (incl. adjacent comments): two-form dispatch on StringToFilter, password-omitted-defaults-to-login (Argc-based i index), IP octet-0 wildcard (mask byte stays 0), case-insensitive duplicate rejection, the 1000-account hard cap, immediate WriteAccounts() persistence, and the console/rcon admin-only scope (plain Cmd_AddCommand, no client-command registration, not in sv_user.c, dispatched only post-Rcon_Validate).

PROC-1: the C-FIX is a checkable fact at its enforcing line (41 vs 40), not a framing judgment.

## flags_for_review

- [fyi/suspected-bug/synthesis] acc_create usage string advertises 'maximum MAX_LOGINNAME-1' (40) characters for login/pass (sv_login.c:250,265), but validAcc enforces length <= MAX_LOGINNAME (41) at sv_login.c:90 (the comparison is '<= MAX_LOGINNAME', not '< MAX_LOGINNAME'). A 41-char login is accepted despite the usage text saying 40 is the max. Off-by-one between advertised and enforced limit; user doc states the advertised 40 to avoid documenting the boundary inconsistency. Minor candidate upstream bug.
- [fyi/hidden-family/synthesis] acc_create registers sibling commands acc_unblock (SV_UnblockAccount_f, sv_login.c:565) and acc_block (SV_BlockAccount_f, sv_login.c:566) alongside acc_create/acc_remove/acc_list. These two are outside the 4-command set for this invocation but are part of the same account-management family (handler SV_blockAccount sv_login.c:432) and likely warrant their own L1 descriptions if not already covered.
- [fyi/suspected-bug/vpass] In-code inconsistency between the validator and the usage/help text. validAcc (sv_login.c:90) accepts login/pass up to 41 chars (acc - s <= MAX_LOGINNAME, MAX_LOGINNAME=41), but the usage strings at sv_login.c:250 and :265 advertise 'maximum %d characters' with MAX_LOGINNAME-1 = 40, and storage strlcpy(...,MAX_LOGINNAME) at line 314 truncates to 40. So a 41-char login is accepted by validation but silently truncated on store. This is the upstream source of the description's 'off-by-one' (the synth trusted the help string over the enforcing comparison). Off-scope to fix in MVDSV, but worth noting as a latent upstream quirk.
- [fyi/other/vpass] For the IP form (use_ip), neither the <address> nor the <username> argument is passed through validAcc -- the char-set and length validation in clause 5/6 applies ONLY to the name/password (use_log) form. The proposed description scopes the char/length rule to the name/password bullet, so this is correctly handled, but flagging that the IP-form username is unvalidated (and is stored in the account 'pass' slot at line 320, then assigned as the client's login at lines 221/175) in case a future re-synth wants to state it.
- [fyi/other/vpass] Passwords for use_log accounts are stored as SHA1(password) when sv_hashpasswords is set (sv_login.c:319-320). The proposed description does not mention at-rest hashing. Not a contradiction (no clause asserts plaintext storage), but a potential enrichment for a fuller user-doc.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "acc_create",
  "type": "command",
  "description": "Creates a server login account that players can use to authenticate (see sv_login). Two forms are accepted: a name/password login, or a name tied to a connecting IP address.\n\nacc_create <login> [<password>] = create a password account; if the password is omitted, the login name is also used as the password. Login and password may contain only letters, digits, '.' and '_', and must be at least 3 characters (only the first 40 are stored).\nacc_create <address> <username> = create an account that logs in automatically from the given IP address (a 0 in any address octet matches any value there); no password is used.\n\nA duplicate login name is rejected, and no more than 1000 accounts can exist. The account list is saved to disk immediately.\n\nSet by: server console / rcon (admin only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:314. Handler SV_CreateAccount_f registered Cmd_AddCommand-only at sv_login.c:562 (not in ucmds[] at sv_user.c:3299; SV_ExecuteUserCommand sv_user.c:3399 has no fall-through to console cmds -> admin-only). Not on the normal-rcon blocklist (sv_main.c:1754-1764) -> plain 'server console / rcon'. Two forms: login form usage sv_login.c:250; IP form gated by StringToFilter succeeding at sv_login.c:260 (use=use_ip) with its own usage sv_login.c:265 requiring a 2nd arg (username). Password-defaults-to-login: when Cmd_Argc()==3 password=arg2 else i=1 -> arg1 (login) copied as pass, sv_login.c:315-320 (confirmed by comment sv_login.c:238). Char/length validity: validAcc sv_login.c:81-90 allows only a-zA-Z0-9._ and requires length in [3, MAX_LOGINNAME]; rejection 'Invalid login!'/'Invalid pass!' sv_login.c:276,282. Stated max '40' = MAX_LOGINNAME-1 from usage string sv_login.c:250 (MAX_LOGINNAME=DIGEST_SIZE*2+1=41, sv_login.c:35 + sha1.h:27). Duplicate rejected sv_login.c:303-307; MAX_ACCOUNTS=1000 cap sv_login.c:254 (sv_login.c:33). Persists to disk via WriteAccounts sv_login.c:326 -> sv_login.c:101-131. IP wildcard (0-octet=any) per StringToFilter parser (QW has no CIDR/'/mask'). SHA1 hashing of the password is conditional on sv_hashpasswords (sv_login.c:319-320) -- an internal storage detail, omitted from the user doc. F-MV1: no KTX override (grep ktx/src empty). No registered default for a command. Worked example: 'acc_create alice s3cret' creates login alice with password s3cret; 'acc_create 192.168.0.0 lanuser' auto-logs in any 192.168.* client as lanuser.",
  "description_proposed": null
}
```
