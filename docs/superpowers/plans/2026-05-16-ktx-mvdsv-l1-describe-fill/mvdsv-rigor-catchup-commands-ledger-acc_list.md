# describe-fill-synthesis ledger -- mvdsv `acc_list`

- **project:** mvdsv
- **knob:** `acc_list` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `rigor-catchup-commands` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:acc_list: synthesized -- prints all login accounts (login + 'blocked' marker) and a count, or 'empty'; no-arg, admin-only, not on rcon blocklist -- origin=synthesized ref=src/sv_login.c:417 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints the server's stored accounts (both password and IP-based, loaded from the accounts file plus any added this session) to the console: one login per line, with 'blocked' shown next to any account that has been blocked, followed by the total count.
>
> If no accounts exist, prints that the list is empty.
>
> Set by: server console / rcon (admin only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| handler / admin-only | src/sv_login.c:564 ; src/sv_user.c:3299,3399 | `Cmd_AddCommand("acc_list", SV_ListAccount_f);` ; not in ucmds[]; no fall-through | MATCH |
| not on rcon blocklist | src/sv_main.c:1754-1764 | acc_list absent from blocklist tokens | MATCH |
| empty-list message | src/sv_login.c:405-408 | `if (!num_accounts) { Con_Printf("account list is empty\n"); return; }` | MATCH |
| one login per line + blocked marker | src/sv_login.c:415-417 | `if (accounts[i].state != a_free) { Con_Printf("%.16s %s\n", accounts[i].login, accounts[i].state == a_ok ? "" : "blocked"); ...}` | MATCH |
| total count line | src/sv_login.c:422 | `Con_Printf("%d login(s) found\n", num_accounts);` | MATCH |
| F-MV1 no KTX override | ktx/src (grep) | grep acc_list -> empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Prints the server's login accounts to the console | sv_login.c:401-417, 411 | `void SV_ListAccount_f(void)` ... `Con_Printf("account list:\n");` ... `Con_Printf("%.16s %s\n", accounts[i].login, ...)` | MATCH (note: under rcon, output redirects to issuer via SV_BeginRedirect(RD_PACKET) at sv_main.c:1819; "console" is the correct register) |
| 2 | Accounts are those created with acc_create | sv_login.c:313-326 (acc_create writer) AND sv_login.c:141-193 + sv_init.c:272 (disk loader) | acc_create: `num_accounts++; ... accounts[spot].state = a_ok; ... WriteAccounts();` / loader: `SV_LoadAccounts();` populates accounts[] from ACC_FILE on every map spawn | MISMATCH (imprecise/over-narrow): the listed table is also populated from the persisted `accounts` file via SV_LoadAccounts() at sv_init.c:272 on every map; the clause attributes population solely to acc_create. Also lists IP-type entries (acc_create <address> <username>, use==use_ip) which "login accounts" under-describes. Not contradicted — acc_create is the origin command that writes the file — but real populator set is broader than stated. |
| 3 | One login per line | sv_login.c:413-419 | `for (i = 0, c = 0; c < num_accounts; i++) { if (accounts[i].state != a_free) { Con_Printf("%.16s %s\n", ...); c++; } }` | MATCH (one Con_Printf per non-free account; login truncated to 16 chars via %.16s — minor detail not stated, not wrong) |
| 4 | 'blocked' shown next to any blocked account | sv_login.c:417 | `Con_Printf("%.16s %s\n", accounts[i].login, accounts[i].state == a_ok ? "" : "blocked");` | MATCH (state enum a_free/a_ok/a_blocked at :60; a_free is skipped at :415, so the ternary's else-branch is exactly a_blocked → "blocked") |
| 5 | Followed by the total count | sv_login.c:422 | `Con_Printf("%d login(s) found\n", num_accounts);` | MATCH (prints num_accounts after the loop) |
| 6 | If no accounts exist, prints list is empty | sv_login.c:405-409 | `if (!num_accounts) { Con_Printf("account list is empty\n"); return; }` | MATCH |
| 7 | Set by: server console / rcon (admin only) | Cmd_AddCommand at sv_login.c:564; client path sv_user.c:3399-3424; rcon path sv_main.c:1701-1828 | Registered with bare `Cmd_AddCommand("acc_list", SV_ListAccount_f)` (no CF_ flags, MVDSV-style). NOT present in ucmds[] (sv_user.c:3299); client stringcmds hit only ucmds and fall to "Bad user command" (no Cmd_ExecuteString fallthrough). Both rcon tiers (master_rcon_password, rcon_password admin tier) reach Cmd_ExecuteString (:1828); acc_list is NOT in the admin-tier blocklist (:1754-1765). | MATCH (console + rcon reach it; ordinary connected players/spectators cannot invoke it via stringcmd) |

**V-pass notes:** Oracle confirmed at mvdsv 1.11-53-g18d0362. Handler SV_ListAccount_f (sv_login.c:401-423) is the single enforcing site for the output-shape clauses; all of them (header "account list:", one line per non-free account, "blocked" for a_blocked, "%d login(s) found" count, "account list is empty" on num_accounts==0) trace clean to verbatim Con_Printf calls. Access-class clause (clause 7) traced through the full dispatch boundary: acc_list is a Cmd_AddCommand console command absent from ucmds[], so the client stringcmd path (SV_ExecuteUserCommand) cannot reach it (no fallthrough to Cmd_ExecuteString), and both rcon password tiers do reach it (acc_list not in the admin-rcon blocklist) — "server console / rcon (admin only)" is accurate.

The single imprecision (clause 2) is why this is C-NEAR-MISS not TRACED-CLEAN: the description says the listed accounts are "those created with acc_create," but the in-memory accounts[] table that the handler walks is ALSO populated from the on-disk ACC_FILE ("accounts") by SV_LoadAccounts(), which is called uncommented at sv_init.c:272 on every SpawnServer (the call inside Login_Init at sv_login.c:569 is commented out, but the sv_init one is live). So the list reflects the persisted account file reloaded each map plus live additions — broader than "what acc_create created this session." Secondarily, acc_create creates both login-type and IP-type (use_ip) entries and the handler lists both without filtering on `use`, so "login accounts" slightly under-describes the IP-access entries that also appear. Neither point contradicts the code (every account does originate from an acc_* command that writes the file via WriteAccounts at sv_login.c:326), but the clause's populator attribution is narrower than the code, which is the C-NEAR-MISS signature. The rest of the description is solid and the recommended tightening is small: say it lists the server's stored accounts (login and IP-based, persisted in the "accounts" file) rather than "login accounts ... created with acc_create."

## flags_for_review

- [review/contradiction/vpass] Clause 2 origin-attribution is narrower than the code: the listed accounts[] table is populated both by acc_create (SV_CreateAccount_f, sv_login.c:313-326) and by reload-from-disk via SV_LoadAccounts() at sv_init.c:272 (called on every SpawnServer; the Login_Init call at sv_login.c:569 is commented out but this one is live). The list also includes IP-type entries (use==use_ip) created via the 'acc_create <address> <username>' form, which the 'login accounts' wording under-describes. Recommend tightening to 'the server's stored accounts (login- and IP-based, persisted in the accounts file)'.
- [fyi/suspected-bug/vpass] Adjacent off-scope source observation (not part of this knob's correctness): SV_LoadAccounts (sv_login.c:165-191) reads ACC_FILE with fscanf("%s", acc->login) into a fixed buffer with an in-source FIXME comment ('Is realy safe to use fscanf...? FIXME!'). Login field width is unbounded by the format string; the buffer is login[MAX_LOGINNAME]. This is a pre-existing file-parser concern in the account-load path, surfaced while tracing the populator for clause 2 — flagged FYI, not a finding against acc_list.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: addip=C-FIX, cuff=C-FIX, stop=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "acc_list",
  "type": "command",
  "description": "Prints the server's stored accounts (both password and IP-based, loaded from the accounts file plus any added this session) to the console: one login per line, with 'blocked' shown next to any account that has been blocked, followed by the total count.\n\nIf no accounts exist, prints that the list is empty.\n\nSet by: server console / rcon (admin only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_login.c:417. Handler SV_ListAccount_f registered Cmd_AddCommand-only at sv_login.c:564 (not in ucmds[] sv_user.c:3299; no fall-through sv_user.c:3399 -> admin-only). Not on the normal-rcon blocklist (sv_main.c:1754-1764) -> plain 'server console / rcon'. No-arg command (no Cmd_Argc guard; iterates the account array). Empty-list path 'account list is empty' sv_login.c:405-408. Per-account print: login (%.16s) plus 'blocked' marker when state != a_ok, sv_login.c:417 (`accounts[i].state == a_ok ? \"\" : \"blocked\"`); only non-free slots printed sv_login.c:415. Trailing '%d login(s) found' count sv_login.c:422. F-MV1: no KTX override (grep ktx/src empty). No-arg command -> no worked example (per chunk rule). No registered default for a command.",
  "description_proposed": null
}
```
