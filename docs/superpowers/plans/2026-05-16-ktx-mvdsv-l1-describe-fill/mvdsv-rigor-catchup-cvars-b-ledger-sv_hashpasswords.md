# describe-fill-synthesis ledger -- mvdsv `sv_hashpasswords`

- **project:** mvdsv
- **knob:** `sv_hashpasswords` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_hashpasswords: synthesized -- ON stores+checks login-account passwords as SHA1 hashes, OFF plaintext; password accounts only, no retro re-encode -- origin=synthesized ref=src/sv_login.c:319 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether server login-account passwords are stored as a one-way SHA1 hash instead of as plain text in the accounts file. When on, a new account's password is hashed before it is written, and at login the supplied password is hashed and compared against the stored hash. When off, passwords are written and compared in plain text. This applies to password-based login accounts; IP-based accounts do not use a password. Changing this does not re-encode passwords already stored under the previous setting.
>
> 0 = store and check passwords in plain text.
> 1 = store and check passwords as SHA1 hashes.
>
> Default: 1.
> Set by: server config / rcon.
> See also: sv_login.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| ON => new account password stored as SHA1; OFF => plaintext | src/sv_login.c:319-320 | `strlcpy(accounts[spot].pass, (int)sv_hashpasswords.value && use == use_log ? SHA1(Cmd_Argv(i)) : Cmd_Argv(i), MAX_LOGINNAME);` | MATCH |
| storage applies to password accounts only (use_log) | src/sv_login.c:319 | `... && use == use_log ? SHA1(...) : ...` | MATCH |
| login check: OFF plaintext compare, ON SHA1 compare | src/sv_login.c:528-529 | `(!(int)sv_hashpasswords.value && !strcasecmp(pass, accounts[i].pass)) || ((int)sv_hashpasswords.value && !strcasecmp(SHA1(pass), accounts[i].pass))` | MATCH |
| IP accounts bypass password compare | src/sv_login.c:527 | `if (use == use_ip || ...)` | MATCH |
| Default 1, settable | src/sv_main.c:79 | `cvar_t sv_hashpasswords = {"sv_hashpasswords", "1"};` | MATCH |
| KTX override absent | ktx/src (grep) | 0 hits for `sv_hashpasswords` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | ON => stored as one-way SHA1 hash instead of plain text | sv_login.c:319-320 | `strlcpy(accounts[spot].pass, (int)sv_hashpasswords.value && use == use_log ? SHA1(Cmd_Argv(i)) : Cmd_Argv(i), MAX_LOGINNAME)` | MATCH |
| 2 | algorithm is SHA1 (one-way) | sha1.c:157-165 | `char *SHA1 (char *string){ SHA1_CTX context; ... SHA1Final(digest,&context); return bin2hex(digest); }` | MATCH |
| 3 | new account's password hashed BEFORE it is written | sv_login.c:319-326 | hash applied at strlcpy into `.pass` (:319-320), then `WriteAccounts();` (:326) | MATCH |
| 4 | at login, supplied password hashed and compared vs stored hash | sv_login.c:529 | `( (int)sv_hashpasswords.value && !strcasecmp(SHA1(pass), accounts[i].pass))` | MATCH |
| 5 | OFF => passwords written in plain text | sv_login.c:319-320 | OFF takes ternary false branch -> raw `Cmd_Argv(i)` written | MATCH |
| 6 | OFF => compared in plain text | sv_login.c:528 | `(!(int)sv_hashpasswords.value && !strcasecmp(pass, accounts[i].pass))` | MATCH |
| 7 | applies to password-based login accounts | sv_login.c:319 (`use == use_log` gate), :271 (`use = use_log`) | hash only when `use == use_log` | MATCH |
| 8 | IP-based accounts do not use a password | sv_login.c:175 (`strlcpy(acc->pass, acc->login,...)` for ip), :527 (`if (use == use_ip || ...)`) | IP path stores login-as-pass and login-check short-circuits the password comparison for `use_ip` | MATCH |
| 9 | changing the cvar does NOT re-encode already-stored passwords | sv_main.c:79 + :3450 (bare cvar_t, no callback); sv_login.c:120-122 (WriteAccounts writes acc->pass verbatim); :177/:183 (ReadAccounts fscanf acc->pass verbatim) | transform exists ONLY at create-site :319; no re-encode-on-change path anywhere in the 3 use-sites | MATCH (absence verified tree-wide) |
| 10 | Default: 1 | sv_main.c:79 | `cvar_t sv_hashpasswords = {"sv_hashpasswords", "1"}` | MATCH |
| 11 | 0=plain / 1=SHA1 value semantics | sv_main.c:79 (comment) + :319/:528-529 (enforced) | `// 0 - plain passwords; 1 - hashed passwords` | MATCH |
| 12 | Set by: server config / rcon | sv_main.c:3450 | `Cvar_Register (&sv_hashpasswords)` -- ordinary cvar, no special access flags | MATCH |
| 13 | See also: sv_login | sv_login.c is the consuming subsystem | non-behavioral cross-reference, accurate | N/A |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. Trace discipline applied per enforce-trace-discipline.md.

Exactly 3 functional use-sites tree-wide: registration (sv_main.c:79 decl + :3450 Cvar_Register) and the two enforcing reads in sv_login.c (write-site :319-320, login-check :528-529). All callees followed: SHA1() (sha1.c:157-165) returns a fixed 40-char uppercase-hex string via bin2hex (DIGEST_SIZE=20, MAX_LOGINNAME = DIGEST_SIZE*2+1 = 41, so the digest fits exactly).

Every material clause maps to a verified enforcing line. The polarity is correct at both the write and the compare site (ON->SHA1 branch, OFF->plaintext branch). The OFF-state behavior is enforced, not inferred. The side-effect clause (no re-encode on change) is verified by absence: WriteAccounts (:120-122) and ReadAccounts (:177/:183) move acc->pass verbatim, the cvar carries no Cvar_Register callback, and the only hash transform is at the create-site -- so toggling the cvar cannot rewrite existing stored values. The scope clause (login accounts vs IP accounts) is enforced by the `use == use_log` gate on the hash branch and the `use == use_ip ||` short-circuit in checklogin. Default 1 matches the registered initializer and the adjacent source comment.

Non-blocking edge details (NOT clauses in the description, no contradiction): (a) the hash branch additionally requires `use == use_log`, which the description's IP-vs-login scoping already covers; (b) `acc_create <login> [<password>]` allows omitting the password, in which case the login name itself is hashed/stored (sv_login.c:315-320) -- the description makes no claim that conflicts; (c) value test is `(int)...value` so any nonzero int enables hashing -- standard cvar-bool framing, consistent with stated 0/1 thresholds and registered default.

Classification: TRACED-CLEAN -- no flavour-C inference clause, no contradiction, no metadata error.

## flags_for_review

- none

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_hashpasswords",
  "type": "cvar",
  "description": "Controls whether server login-account passwords are stored as a one-way SHA1 hash instead of as plain text in the accounts file. When on, a new account's password is hashed before it is written, and at login the supplied password is hashed and compared against the stored hash. When off, passwords are written and compared in plain text. This applies to password-based login accounts; IP-based accounts do not use a password. Changing this does not re-encode passwords already stored under the previous setting.\n\n0 = store and check passwords in plain text.\n1 = store and check passwords as SHA1 hashes.\n\nDefault: 1.\nSet by: server config / rcon.\nSee also: sv_login.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:319. Registration cvar_t literal {\"sv_hashpasswords\", \"1\"} at sv_main.c:79 -> Default 1 (WI-2). ENFORCING site 1 (storage) SV_CreateAccount_f sv_login.c:319-320 `strlcpy(accounts[spot].pass, (int)sv_hashpasswords.value && use == use_log ? SHA1(Cmd_Argv(i)) : Cmd_Argv(i), MAX_LOGINNAME);` -> ON stores SHA1(password), OFF stores plaintext; gated on `use == use_log` -> only password/login accounts, not IP accounts. ENFORCING site 2 (verification) SV_Login compare sv_login.c:528-529 `(!(int)sv_hashpasswords.value && !strcasecmp(pass, accounts[i].pass)) || ((int)sv_hashpasswords.value && !strcasecmp(SHA1(pass), accounts[i].pass))` -> OFF compares plaintext, ON compares SHA1(pass) against stored -> storage and compare agree on the same cvar, polarity confirmed. The IP-account exemption: the same compare line is reached only after `use == use_ip ||` short-circuit at sv_login.c:527, and storage is gated `use == use_log` -> 'IP-based accounts do not use a password' confirmed. 'does not re-encode already-stored passwords': hashing happens only at create-time (site 1); no migration path reads-then-rehashes existing accounts.pass -> changing the cvar leaves prior entries in their original encoding (a logged consequence; admin-observable as login failures if toggled after accounts exist). Pre-existing comment 'plain passwords / hashed passwords' (sv_main.c:79) is accurate but a sub-template fragment -> synthesized to full D20 shape per chunk rule. KTX: no override (grep ktx/src 0 hits for sv_hashpasswords).",
  "description_proposed": null
}
```
