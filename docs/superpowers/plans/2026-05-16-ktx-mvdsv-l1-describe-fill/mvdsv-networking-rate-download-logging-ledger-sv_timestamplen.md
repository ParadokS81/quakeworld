# describe-fill-synthesis ledger -- mvdsv `sv_timestamplen`

- **project:** mvdsv
- **knob:** `sv_timestamplen` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_timestamplen: synthesized -- +/- seconds tolerance for the encrypted-rcon timestamp (replay window); only with sv_crypt_rcon; 0 = skip check; default 60 -- origin=synthesized ref=sv_main.c:1595 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets how far apart, in seconds, the server clock and the timestamp inside an encrypted rcon command are allowed to be. This only applies when encrypted rcon is enabled (sv_crypt_rcon). An encrypted rcon command whose timestamp is off from the server's current time by more than this many seconds in either direction is rejected, which limits how long a captured rcon command could be replayed.
>
> Value is in seconds; a smaller window is stricter, a larger window is more tolerant of clock skew.
>
> Default: 60. At 0 the timestamp check is skipped entirely (only the encryption is verified).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| only applies when encrypted rcon on | sv_main.c:1576,1584 | `if ((int)sv_crypt_rcon.value) { ... if ((int)sv_timestamplen.value) { ... } }` | MATCH |
| rejects if timestamp diff exceeds value (both directions) | sv_main.c:1595-1596 | `if (difftime_server_client > (double)sv_timestamplen.value || difftime_server_client < -(double)sv_timestamplen.value) { return 0; }` | MATCH |
| unit = seconds (difftime) | sv_main.c:1593 | `difftime_server_client = difftime(server_time, client_time);` | MATCH |
| compares server time vs embedded command timestamp | sv_main.c:1588-1592 | `time(&server_time); ... client_time += (char2int(...time_start[i])...)` | MATCH |
| OFF-state at 0 = check skipped | sv_main.c:1584 | `if ((int)sv_timestamplen.value)` guard false at 0 -> block skipped | MATCH |
| default 60 | sv_main.c:82 | `cvar_t sv_timestamplen = {"sv_timestamplen", "60"};` | MATCH |
| set by config/rcon (no flags) | sv_main.c:82,3453 | `{"sv_timestamplen", "60"}` ... `Cvar_Register (&sv_timestamplen);` | MATCH |
| 1762 is blocklist string, NOT a value read | sv_main.c:1762 | `!strcasecmp(tstr, "sv_timestamplen")` (compares an rcon token, not .value) | MATCH (excluded) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| A | "how far apart, in seconds, server clock and timestamp inside encrypted rcon command are allowed to be" | sv_main.c:1588,1593,1595 | `time(&server_time);` ... `difftime_server_client = difftime(server_time, client_time);` ... `if (difftime_server_client > (double)sv_timestamplen.value ...` | MATCH (server_time from time(); client_time decoded from time_start = Cmd_Argv(1)+DIGEST_SIZE*2, the timestamp in the rcon command; difftime returns seconds) |
| B | "only applies when encrypted rcon is enabled (sv_crypt_rcon)" | sv_main.c:1576 | `if ((int)sv_crypt_rcon.value) {` | MATCH (entire timestamp block 1584-1598 is nested inside this gate; else-branch at 1613 is plain-password compare with no timestamp logic) |
| C | "timestamp off from server's current time by more than this many seconds in either direction is rejected" | sv_main.c:1595-1596 | `if (difftime_server_client > (double)sv_timestamplen.value \|\| difftime_server_client < -(double)sv_timestamplen.value) { return 0; }` | MATCH (strict > +N OR < -N => return 0; bidirectional; "more than" correctly captures the strict boundary so exactly +/-N is accepted) |
| D | "limits how long a captured rcon command could be replayed" | sv_main.c:81 (comment) + 1595 (enforcement) | `// Time in seconds during which in rcon command this encryption is valid` | MATCH (rationale; replay-window framing is the direct consequence of the enforced freshness check + grounded in registration comment) |
| E | "smaller window stricter, larger more tolerant of clock skew" | sv_main.c:1595 | `> (double)sv_timestamplen.value \|\| ... < -(double)sv_timestamplen.value` | MATCH (smaller value narrows accepted difftime band, larger widens it -- direct reading of the comparison) |
| F | "Default: 60" | sv_main.c:82 | `cvar_t sv_timestamplen = {"sv_timestamplen", "60"};` | MATCH (registered default string "60"; verified no other Cvar_Set override-site exists -- WI-2 satisfied) |
| G | "At 0 the timestamp check is skipped entirely (only the encryption is verified)" | sv_main.c:1584,1599 | `if ((int)sv_timestamplen.value) {` ... (else falls to) `SHA1_Init();` | MATCH (value 0 => false => block 1585-1597 skipped, control falls to SHA1 digest verification at 1599-1611) |
| H | "Set by: server config / rcon" | sv_main.c:3453,1762 | `Cvar_Register (&sv_timestamplen);` ... `!strcasecmp(tstr, "sv_timestamplen") \|\|` | MATCH (registered settable cvar; 1762 confirms rcon recognizes it -- gated to master_rcon_password for non-master rcon, but both named channels are real) |

**V-pass notes:** TRACED-CLEAN. Oracle confirmed at 1.11-53-g18d0362. Every material clause maps to a located, verified enforcing line in Rcon_Validate (sv_main.c:1564-1617). The enforcing structure: sv_crypt_rcon gate (1576) wraps the timestamplen gate (1584) wraps the bidirectional difftime window check (1593-1595). No flavour-C inference present -- the description does not lean on the knob name, an enum, or a string; every semantic assertion (seconds unit via time()/difftime, sv_crypt_rcon scope, bidirectional "either direction" reject, OFF-at-0 falling through to SHA1, registered default 60) has a traced read-site. Notable precision wins that are correct against code: (1) "more than ... in either direction" correctly matches the STRICT > / < comparison (exactly +/-N is accepted, and the text does not say "at least", so no off-by-one over-claim); (2) "only the encryption is verified" at 0 is correct -- the SHA1 digest check at 1599-1611 still runs after the skipped block; (3) Default 60 verified against the C registration literal (sv_main.c:82), not a shipped cfg, and confirmed no Cvar_Set override-site exists anywhere in src. WI-2 metadata (default + set-channels) clean.

## flags_for_review

- [fyi/other/synthesis] sv_timestamplen and sys_command_line appear at sv_main.c:1762/1764 inside a string-literal blocklist (alongside rm/rmdir/ls/chmod/sv_admininfo/if/localcommand/sv_crypt_rcon/log*) that sets bad_cmd=true when one of these is the FIRST token of a NORMAL (non-master) rcon command. This is a write/exec guard on those names, not a read of either cvar's value -- the real behavioral read-sites are elsewhere. Noting so a reviewer does not mistake the blocklist hit for the enforcing site.
- [fyi/other/vpass] sv_timestamplen is in the rcon bad_cmd guard list (sv_main.c:1754-1765): changing sv_timestamplen (and sv_crypt_rcon) via rcon is rejected as a bad_cmd unless validated through master_rcon_password (registration comment line 81: 'change only with master_rcon_password'). The proposed description's 'Set by: server config / rcon' is accurate at the channel level (both are real set paths) and does not overclaim, so this is not a defect -- noting only that the rcon path carries a master-password restriction that the one-line metadata field does not (and arguably need not) spell out.
- [fyi/other/vpass] Off-scope, not a description concern: the client_time hex-decode loop (sv_main.c:1589-1592) reconstructs a sizeof(time_t)*2-hex-digit value via per-nibble shifts. On a 64-bit time_t the shift `<< (4 + i*4)` reaches up to 60 bits, which is well-defined, but the loop's nibble-pairing/endianness is the kind of detail that could drift cross-platform. It does not affect any clause in the description (which speaks only of seconds and a +/- window) and the difftime comparison is symmetric, so correctness of the documented window holds regardless. Flagging purely as an upstream-code curiosity encountered while tracing.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_timestamplen",
  "type": "cvar",
  "description": "Sets how far apart, in seconds, the server clock and the timestamp inside an encrypted rcon command are allowed to be. This only applies when encrypted rcon is enabled (sv_crypt_rcon). An encrypted rcon command whose timestamp is off from the server's current time by more than this many seconds in either direction is rejected, which limits how long a captured rcon command could be replayed.\n\nValue is in seconds; a smaller window is stricter, a larger window is more tolerant of clock skew.\n\nDefault: 60. At 0 the timestamp check is skipped entirely (only the encryption is verified).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1595. Enforcing read-site in Rcon_Validate, sv_main.c:1584 `if ((int)sv_timestamplen.value) { ... }` nested inside sv_main.c:1576 `if ((int)sv_crypt_rcon.value)` -- so the whole timestamp check only runs when encrypted rcon is on. The reject: sv_main.c:1593-1596 `difftime_server_client = difftime(server_time, client_time); if (difftime_server_client > (double)sv_timestamplen.value || difftime_server_client < -(double)sv_timestamplen.value) { return 0; }` -- bidirectional (+/-) magnitude comparison; difftime returns SECONDS, so the unit is seconds. client_time is decoded from the digest's time_start field (sv_main.c:1589-1592), i.e. the timestamp embedded in the encrypted command; server_time is `time(&server_time)` (sv_main.c:1588). Replay-window framing is what a bounded +/- tolerance on a request timestamp does. OFF-state: at 0 the sv_main.c:1584 guard `if ((int)sv_timestamplen.value)` is false, so the entire time-difference block is skipped and only the SHA1 digest is checked (traced). Default: registered cvar_t literal `{\"sv_timestamplen\", \"60\"}` (sv_main.c:82) -> 60. Set-by: plain cvar_t no flags (sv_main.c:82), registered sv_main.c:3453 -> server config / rcon. NOTE the sv_main.c:1762 occurrence is NOT a value read -- it is a string-literal blocklist entry that prevents a NORMAL-rcon user from naming sv_timestamplen as the first rcon token (a write/exec guard, see Cmd_Argv comparison), not a read of the cvar's value. No KTX override (grep empty).",
  "description_proposed": null
}
```
