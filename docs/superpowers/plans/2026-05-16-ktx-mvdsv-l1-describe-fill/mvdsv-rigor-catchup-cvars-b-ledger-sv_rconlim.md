# describe-fill-synthesis ledger -- mvdsv `sv_rconlim`

- **project:** mvdsv
- **knob:** `sv_rconlim` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_rconlim: synthesized -- max rcon requests/sec; <=0 disables; excess ignored for the 1s window; traced to sv_main.c:1537,1557 -- origin=synthesized ref=src/sv_main.c:1557 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Rate-limits how many rcon requests the server will act on, in requests per second, to blunt rcon password-guessing floods. Once the limit is exceeded within a one-second window, further rcon requests are ignored until the window resets.
>
> 0 or a negative value = no limit (rate limiting disabled).
> any positive value = maximum rcon requests accepted per second.
>
> Default: 10.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| <=0 disables rate limiting | src/sv_main.c:1537 | `if ((int)sv_rconlim.value <= 0) return false;` (false = ok to proceed) | MATCH |
| positive value = max rcon requests/sec; excess ignored | src/sv_main.c:1557 | `if (++lpackets > (int)sv_rconlim.value) return true;` (true -> Rcon_Validate returns 0) | MATCH |
| window is one second | src/sv_main.c:1544 | `if (realtime - lticks > 1.0) { ... lpackets = 0; }` | MATCH |
| gates rcon password check (anti-guess) | src/sv_main.c:1568 | `if (rcon_bandlim()) { return 0; }` in Rcon_Validate | MATCH |
| Default 10 (registered) | src/sv_main.c:83 | `cvar_t sv_rconlim = {"sv_rconlim", "10"};` | MATCH |
| settable via config/rcon (no ROM flag) | src/sv_main.c:3454 | `Cvar_Register (&sv_rconlim);` | MATCH |
| no KTX override | ktx/src (grep) | (no hits for sv_rconlim) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Rate-limits how many rcon requests the server acts on, in requests per second | sv_main.c:1557 (gate) + 1530/1544/1550 (window) | `if (++lpackets > (int)sv_rconlim.value) return true;` with `lpackets` reset when `realtime - lticks > 1.0` | MATCH |
| 2 | Purpose: blunt rcon password-guessing floods | sv_main.c:1568 (gate runs in Rcon_Validate BEFORE strlen(password1)/password compare at 1572+) | `if (rcon_bandlim()) { return 0; }` precedes password check | MATCH (gate fires on every rcon attempt incl. wrong-password floods; framing is a fair purpose-gloss, header calls it "rcon requests bandwidth limit" modeled on FreeBSD badport_bandlim) |
| 3 | Once limit exceeded within a one-second window, further requests are ignored until window resets | sv_main.c:1544-1551 (window reset) + 1557-1558 (return true) -> 1568-1570 (Rcon_Validate returns 0) -> 1701/1708 both fail -> do_cmd stays false -> 1799 else-branch, Cmd_ExecuteString NOT reached | `if (realtime - lticks > 1.0) { ... lpackets = 0; }`; rejected request falls to `Bad rcon` else-branch (1830), command not executed | MATCH ("ignored" = treated as bad rcon, command not run; lazy rolling ~1s window confirmed) |
| 4 | 0 or negative value = no limit (disabled) | sv_main.c:1537-1538 | `if ((int)sv_rconlim.value <= 0) return false;` (false = "ok to check password", i.e. not limited) | MATCH |
| 5 | any positive value = max rcon requests accepted per second | sv_main.c:1557 | `if (++lpackets > (int)sv_rconlim.value) return true;` -> requests 1..N pass (false), request N+1 limited (true) => exactly N accepted per window | MATCH (for integer N>=1; sub-integer caveat in flags) |
| 6 | Default: 10 | sv_main.c:83 + cvar.c:267-269 | `cvar_t sv_rconlim = {"sv_rconlim", "10"};` registered via Cvar_SetROM -> value=10.0; no min/max clamp, no OnChange | MATCH (WI-2: registered default, not a shipped-cfg value; no .cfg override found in-repo) |
| 7 | Set by: server config / rcon | sv_main.c:83 (flags field omitted => 0) + cvar.c:240 Cvar_Register (no CVAR_ROM/SERVERINFO) + sv_main.c:1828 rcon path Cmd_ExecuteString | initializer supplies only name+default, flags=0 => normal settable server cvar | MATCH (server-side cvar; settable from console/config/rcon; not userinfo) |

**V-pass notes:** Oracle confirmed 1.11-53-g18d0362. Every material clause maps to a located, verified enforcing line. The enforcement is a single function rcon_bandlim() (sv_main.c:1527-1561) called first inside Rcon_Validate (1568) which is called by SVC_RemoteCommand (the rcon command handler) at 1701/1708. Polarity (<=0 disables, return false), threshold (++lpackets > N => limited so exactly N pass per window), the ~1s lazy rolling window (realtime - lticks > 1.0 reset), the "ignored" outcome (rejected => Bad-rcon else-branch, Cmd_ExecuteString not reached), and the registered default 10 all verified against actual code + adjacent comments (the header comment at 1516-1519 independently corroborates "<=0 disabled, return false"). No OnChange handler, no min/max clamp, flags=0 (settable server cvar). No flavour-C inference detected: no clause rests on knob name / enum / string / config-comment alone. One sub-integer nuance noted as FYI (does not rise to near-miss): the gate truncates via (int)cast, so a fractional value in (0,1) is positive yet truncates to 0 and is therefore disabled -- the description's "any positive value" is exact for the only sensible domain (integers >=1) but technically imprecise for fractional rates nobody would set. Per rubric this is still-true minor vagueness that was traceable -> TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] rcon_bandlim() uses two function-static accumulators (static double lticks; static int lpackets) shared across ALL source addresses -- the rate limit is global, not per-IP. A flood from one attacker raises lpackets and can cause legitimate rcon from a different admin IP to be rate-limited within the same ~1s window. The WARNING printf at sv_main.c:1547-1548 names a single net_from, which can misattribute the count to whichever address happened to trip the window boundary. Not a defect in the description (which correctly says 'per second' without claiming per-IP), but a behavior worth knowing for any server-admin L3 concept note. Also a known mvdsv quirk, not version-specific to this tag.
- [fyi/other/vpass] Sub-integer truncation edge case: sv_main.c:1537 and 1557 both cast via (int)sv_rconlim.value, so values in (0,1) truncate to 0 and DISABLE the limiter despite being positive. The description's 'any positive value = maximum rcon requests accepted per second' is exact for integers >=1 but does not cover fractional rates (which are meaningless here anyway). FYI only; not a contradiction.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_rconlim",
  "type": "cvar",
  "description": "Rate-limits how many rcon requests the server will act on, in requests per second, to blunt rcon password-guessing floods. Once the limit is exceeded within a one-second window, further rcon requests are ignored until the window resets.\n\n0 or a negative value = no limit (rate limiting disabled).\nany positive value = maximum rcon requests accepted per second.\n\nDefault: 10.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:1557. Pre-existing inline comment src/sv_main.c:83 'rcon bandwith limit: requests per second' is serviceable but a bare fragment, not D20 shape -> synthesized. Enforcing reads in rcon_bandlim() (src/sv_main.c:1527-1561), called from Rcon_Validate at sv_main.c:1568 (returns 0 = reject when bandlim hit): (1) src/sv_main.c:1537 `if ((int)sv_rconlim.value <= 0) return false;` -- false means 'ok to proceed', so <=0 DISABLES the limit (OFF-state + polarity traced exactly). (2) src/sv_main.c:1557 `if (++lpackets > (int)sv_rconlim.value) return true;` -- per-window packet counter; once it exceeds the cvar the function returns true and Rcon_Validate returns 0 (request rejected). (3) Window is one second: src/sv_main.c:1544 `if (realtime - lticks > 1.0)` resets lpackets, establishing the per-second unit. Function-header comment sv_main.c:1519 corroborates ('If sv_rconlim.value is <= 0, the feature is disabled') but the enforcement is the cited code, not the comment (TRAP 1). The anti-guessing intent is the observable purpose (rcon password is checked only after passing bandlim, Rcon_Validate). Default 10 verified at registered literal src/sv_main.c:83 `{\"sv_rconlim\", \"10\"}` (WI-2). Settable plain cvar_t, registered src/sv_main.c:3454; not on the sv_crypt_rcon normal-rcon blocklist -> server config / rcon. F-MV1: no KTX override (grep ktx/src for sv_rconlim returns nothing).",
  "description_proposed": null
}
```
