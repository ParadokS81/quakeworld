# describe-fill-synthesis ledger -- mvdsv `sv_crypt_rcon`

- **project:** mvdsv
- **knob:** `sv_crypt_rcon` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_crypt_rcon: synthesized -- ON=SHA1+timestamp rcon auth (password not in cleartext), OFF=plaintext password; reply body not encrypted; normal-rcon-blocklisted -- origin=synthesized ref=src/sv_main.c:1576 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls how rcon commands authenticate to the server. When on, an rcon request must carry a hashed (SHA1) digest of the rcon password together with a timestamp, so the password is never sent across the network in plain text and stale requests are rejected (the validity window is set by sv_timestamplen). When off, rcon falls back to the legacy scheme where the request carries the password directly; in that mode the server masks the password in its own console and log output. This protects the rcon password in transit; it does not encrypt the body of the rcon command or its reply.
>
> 0 = legacy plaintext-password rcon.
> 1 = hashed, timestamped rcon authentication.
>
> Default: 1.
> Set by: server console + master rcon only (a normal rcon connection cannot change it).
> See also: rcon_password, master_rcon_password, sv_timestamplen.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| ON => SHA1 digest + timestamp authentication (password not plaintext) | src/sv_main.c:1576-1611 | `if ((int)sv_crypt_rcon.value) { ... SHA1_Update(...password1...); ... if (strncmp(digest, SHA1_Final(), DIGEST_SIZE*2)) return 0; }` | MATCH |
| OFF => plaintext password compare | src/sv_main.c:1613 | `else if (strcmp(Cmd_Argv(1), password1)) return 0;` | MATCH |
| timestamp validity window via sv_timestamplen | src/sv_main.c:1584-1597 | `if ((int)sv_timestamplen.value) { ... if (difftime_server_client > (double)sv_timestamplen.value ...) return 0; }` | MATCH |
| OFF => server masks password in local console/log echo | src/sv_main.c:1801-1809 | `if (!(int)sv_crypt_rcon.value) { hide = net_message.data + 9; ... *hide++ = '*'; }` | MATCH |
| does NOT encrypt the rcon reply body (reply path ungated) | src/sv_main.c:1819-1828 | `SV_BeginRedirect(RD_PACKET); ... Cmd_ExecuteString(str);` | MATCH (no sv_crypt_rcon gate on reply) |
| Default 1, settable | src/sv_main.c:80 | `cvar_t sv_crypt_rcon = {"sv_crypt_rcon", "1"};` | MATCH |
| Set-by: not changeable via normal rcon (blocklist) | src/sv_main.c:1761,1767 | `!strcasecmp(tstr, "sv_crypt_rcon") || ... bad_cmd = true;` | MATCH |
| KTX override absent | ktx/src (grep) | 0 hits for `sv_crypt_rcon` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Controls how rcon commands authenticate (cvar switches the whole scheme) | src/sv_main.c:1576 | `if ((int)sv_crypt_rcon.value) {` ... `else if (strcmp(Cmd_Argv(1), password1))` (1613) | MATCH |
| 2 | When ON: hashed (SHA1) digest carried with a timestamp | src/sv_main.c:1577-1611 | `const char* digest = Cmd_Argv(1);` `const char* time_start = Cmd_Argv(1) + DIGEST_SIZE * 2;` `SHA1_Init(); SHA1_Update(...password1); SHA1_Update(...time_start);` `if (strncmp(digest, SHA1_Final(), DIGEST_SIZE * 2)) return 0;` (DIGEST_SIZE=20 per sha1.h:27) | MATCH |
| 3 | Password never sent in plain text (ON) | src/sv_main.c:1599-1611 | wire carries `digest`; `password1` (server-side secret) only fed into SHA1, never compared as plaintext in ON branch | MATCH |
| 4 | Stale requests rejected; validity window set by sv_timestamplen | src/sv_main.c:1584-1597 | `if ((int)sv_timestamplen.value) { ... if (difftime_server_client > (double)sv_timestamplen.value || difftime_server_client < -(double)sv_timestamplen.value) { return 0; } }` | MATCH (window attributed to sv_timestamplen is correct; check is skipped when sv_timestamplen=0, but text does not claim otherwise) |
| 5 | When OFF: request carries password directly (legacy) | src/sv_main.c:1613 | `else if (strcmp(Cmd_Argv(1), password1)) { return 0; }` -- plaintext compare of Argv(1) to password | MATCH |
| 6 | OFF mode: server masks password in console + log | src/sv_main.c:1801-1810, 1832-1841 | `if (!(int)sv_crypt_rcon.value) { hide = net_message.data + 9; p = admin_cmd ? rcon_password.string : master_rcon_password; while (*p) { p++; *hide++ = '*'; } }` -- runs before `Con_Printf("Rcon from %s..", ..data+4)` (1817, console) and `SV_Write_Log(RCON_LOG.., ..data+4)` (1813/1815, log) | MATCH |
| 7 | Does not encrypt the command body or its reply | src/sv_main.c:1599-1611, 1819-1828 | SHA1 is a one-way digest used only for comparison; no cipher anywhere; reply via `SV_BeginRedirect(RD_PACKET)` + `Cmd_ExecuteString(str)` is plaintext | MATCH |
| 8 | 0 = legacy plaintext-password rcon | src/sv_main.c:1613 | `else if (strcmp(Cmd_Argv(1), password1))` (the `!sv_crypt_rcon.value` branch) | MATCH |
| 9 | 1 = hashed, timestamped authentication | src/sv_main.c:1576-1611 | `if ((int)sv_crypt_rcon.value) {` branch performs SHA1 digest + timestamp validation | MATCH |
| 10 | Default: 1 | src/sv_main.c:80 | `cvar_t sv_crypt_rcon = {"sv_crypt_rcon", "1"};` (registered at 3452 with no Ex override) | MATCH |
| 11 | Set by: server console + master rcon only; normal rcon cannot change it | src/sv_main.c:1761 (+ flow 1701/1708/1747-1774) | `!strcasecmp(tstr, "sv_crypt_rcon") ||` inside the admin-path blocklist -> `bad_cmd = true` -> `do_cmd = !bad_cmd`; master path (1701 `Rcon_Validate(.., master_rcon_password)`) sets do_cmd without running the blocklist; console sets the cvar directly | MATCH |
| 12 | See also: rcon_password, master_rcon_password, sv_timestamplen | src/sv_main.c:71, 46, 82 | `cvar_t rcon_password = {"rcon_password", ""};` / `char master_rcon_password[128] = "";` / `cvar_t sv_timestamplen = {"sv_timestamplen", "60"};` | MATCH |

**V-pass notes:** TRACED-CLEAN. All 12 material clauses map to located, verified enforcing lines (incl. adjacent comments). Enforcement is fully isolated to src/sv_main.c (Rcon_Validate + SVC_RemoteCommand); sv_user.c:2198/2215 only forward-declares and calls Master_Rcon_Validate, which funnels through the same Rcon_Validate -- no separate sv_crypt_rcon enforcement exists.

Polarity confirmed: ON (1) = SHA1 digest + timestamp (1576 if-branch); OFF (0) = plaintext strcmp (1613 else-branch). Default "1" verified at the registration literal (sv_main.c:80), not from a shipped cfg (WI-2 satisfied -- registered via plain Cvar_Register at 3452, no Ex default override).

Scope clause (clause 11) traced through the dispatch, not inferred from the blocklist's presence: a normal rcon connection authenticates via rcon_password (admin_cmd=true, 1708) and then hits the 1747-1770 blocklist where sv_crypt_rcon at 1761 forces bad_cmd -> do_cmd=false. The master_rcon_password path (1701) sets do_cmd without ever entering the blocklist loop, so master rcon CAN change it. Console can set any cvar directly. The clause is accurate. This matches the source comment at sv_main.c:81 ("change only with master_rcon_password").

One sub-clause nuance (not a defect, no contradiction): the timestamp-staleness check is itself nested under `if ((int)sv_timestamplen.value)` (1584), so sv_timestamplen=0 disables the staleness window entirely. The description says "the validity window is set by sv_timestamplen," which is correct and does not assert the window is always enforced -- so no MISMATCH and no near-miss. Acceptable still-true minor vagueness.

Terminology: source comment (sv_main.c:80) loosely says "encryption," but the description correctly characterizes the mechanism as a SHA1 HASH/digest comparison and explicitly states it "does not encrypt the body of the rcon command or its reply." That is the technically-accurate reading of the code (one-way digest, plaintext redirect reply) -- a strength, not a flavour-C inference.

Masking asymmetry observed but does not break any asserted clause: on the do_cmd (success) branch (1801) masking applies to both admin and master passwords when crypt_rcon is OFF; on the bad_cmd (failure) branch (1832) masking is additionally gated on `admin_cmd` so only the rcon_password is masked there, not master_rcon_password. The description's claim ("masks the password in its own console and log output" in OFF mode) is correct at the granularity it states; it makes no per-branch / per-password claim that the code would contradict.

## flags_for_review

- [review/contradiction/synthesis] The registration trailing comment at sv_main.c:80 reads 'use SHA1 for encryption of rcon_password and using timestamps' -- the word 'encryption' is loose dev shorthand. The enforced behavior (Rcon_Validate sv_main.c:1576) is hashed/timestamped AUTHENTICATION of the rcon password, not encryption of rcon command/response traffic. The reply is sent via RD_PACKET redirect ungated by this cvar (sv_main.c:1819-1828). The chunk brief's phrasing 'governs whether rcon command/response traffic is encrypted' is therefore narrower in source: only the password authentication is protected. Description was written to the enforced behavior, not the comment.
- [fyi/other/vpass] OFF-mode password masking is asymmetric between the two output branches. On the success branch (sv_main.c:1801) the mask covers both rcon_password and master_rcon_password; on the bad-rcon (failure) branch (sv_main.c:1832) masking is additionally gated on `admin_cmd`, so a FAILED master-rcon attempt with sv_crypt_rcon=0 prints/logs master_rcon_password UNMASKED (net_message.data+4 at Con_Printf 1843 and SV_Write_Log 1848/1850). Likely intentional (a failed master auth means the supplied string was not the real master password, so there is nothing secret to hide), but worth noting as a possible information-disclosure corner if a near-miss master password were ever submitted. Out of scope for this knob's description; FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_crypt_rcon",
  "type": "cvar",
  "description": "Controls how rcon commands authenticate to the server. When on, an rcon request must carry a hashed (SHA1) digest of the rcon password together with a timestamp, so the password is never sent across the network in plain text and stale requests are rejected (the validity window is set by sv_timestamplen). When off, rcon falls back to the legacy scheme where the request carries the password directly; in that mode the server masks the password in its own console and log output. This protects the rcon password in transit; it does not encrypt the body of the rcon command or its reply.\n\n0 = legacy plaintext-password rcon.\n1 = hashed, timestamped rcon authentication.\n\nDefault: 1.\nSet by: server console + master rcon only (a normal rcon connection cannot change it).\nSee also: rcon_password, master_rcon_password, sv_timestamplen.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1576. Registration cvar_t literal {\"sv_crypt_rcon\", \"1\"} at sv_main.c:80 -> Default 1 (WI-2: 2-field initializer, no CVAR_ROM flag, settable). Pre-existing trailing comment 'use SHA1 for encryption of rcon_password and using timestamps' (sv_main.c:80) is a dev-aside and says 'encryption' loosely; ignored per chunk rule and the actual enforcement traced below. ENFORCING read-site Rcon_Validate sv_main.c:1576 `if ((int)sv_crypt_rcon.value)`: ON branch (sv_main.c:1577-1611) computes SHA1 over Cmd_Argv(0)+password1+time_start+args and compares the supplied digest (strncmp at :1609); timestamp window enforced at :1584-1597 gated on sv_timestamplen (registered \"60\" at sv_main.c:82). OFF branch `else if (strcmp(Cmd_Argv(1), password1))` at :1613 = plaintext password compare -> ON means password is a digest not cleartext, polarity ON=hashed/OFF=plaintext confirmed. Masking clauses: sv_main.c:1801 `if (!(int)sv_crypt_rcon.value)` and :1832 `if (admin_cmd && !(int)sv_crypt_rcon.value)` overwrite the password bytes in net_message with '*' ONLY when OFF -> confirms the password is on the wire/in local echo only in the OFF (plaintext) mode. 'does not encrypt the body/reply' clause: the command is dispatched via Cmd_ExecuteString(str) after SV_BeginRedirect(RD_PACKET) at :1819-1828 regardless of sv_crypt_rcon -> the reply path is not gated on this cvar; the registration comment's broad 'encryption' wording is NOT enforced on traffic, only on password authentication. Set-by: sv_crypt_rcon is on the normal-rcon blocklist at sv_main.c:1761 (sets bad_cmd=true), so normal rcon cannot change it -> 'server console + master rcon only' per chunk rule. KTX: no override (grep ktx/src 0 hits for sv_crypt_rcon).",
  "description_proposed": null
}
```
