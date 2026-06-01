# describe-fill-synthesis ledger -- mvdsv `sv_www_checkin_period`

- **project:** mvdsv
- **knob:** `sv_www_checkin_period` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_www_checkin_period: synthesized -- idle check-in interval in seconds, floored at 60, only when web address set and server not busy; default 60; live under WWW_INTEGRATION (CMake default-on) -- origin=synthesized ref=src/central.c:730 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets how often, in seconds, the server checks in with the central web server while it is idle. The check-in only happens when a web server address is configured and the server is not busy with a live game or a request already in flight. Values below 60 have no effect: the interval is never shorter than 60 seconds.
>
> Default: 60 (seconds).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 60 | src/central.c:20 | `static cvar_t sv_www_checkin_period = { "sv_www_checkin_period", "60" };` | MATCH |
| interval in seconds, gated + floored | src/central.c:730 | `if (sv_www_address.string[0] && !server_busy && curtime - last_checkin_time > max(MIN_CHECKIN_PERIOD, sv_www_checkin_period.value)) {` | MATCH |
| floor is 60 | src/central.c:10 | `#define MIN_CHECKIN_PERIOD          60` | MATCH |
| not-busy = no in-flight request and no live game | src/central.c:677 | `server_busy = running_handles || GameStarted();` | MATCH |
| evaluated every frame | src/sv_main.c:3348 | `Central_ProcessResponses();` (inside SV_Frame, WWW_INTEGRATION block) | MATCH |
| set by config (registration) | src/central.c:760 | `Cvar_Register(&sv_www_checkin_period);` (inside Central_Init) | MATCH |
| compiled under WWW_INTEGRATION, defined by build | src/sv_main.c:4062 / CMakeLists.txt:186 | `#if defined(SERVERONLY) && defined(WWW_INTEGRATION)` / `target_compile_definitions(... PRIVATE WWW_INTEGRATION)` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| Clause | file:line | snippet | Verdict |
|---|---|---|---|
| A. Sets how often (seconds) the server checks in with central web server while idle | central.c:730 | `if (sv_www_address.string[0] && !server_busy && curtime - last_checkin_time > max(MIN_CHECKIN_PERIOD, sv_www_checkin_period.value))` | MATCH -- cvar.value is the seconds-gap floor compared against (curtime - last_checkin_time); curtime is seconds. Function Central_ProcessResponses posts CHECKIN_PATH ("ServerApi/Checkin"). |
| B1. Only when a web server address is configured | central.c:730 | `sv_www_address.string[0] && ...` | MATCH -- gate requires non-empty sv_www_address string. |
| B2. Only when server is "not busy" | central.c:730, 677 | `&& !server_busy` ; `server_busy = running_handles \|\| GameStarted();` | MATCH. |
| B3. "live game" maps to GameStarted() | sv_main.c:218-227 | `return (d \|\| strncasecmp(Info_ValueForKey(svs.info, "status"), "Standby", 8));` | MATCH -- true when a non-stream demo dest exists OR server status != "Standby" (i.e. a game is running). |
| B4. "a request already in flight" maps to running_handles | central.c:675-677 | `curl_multi_perform(curl_handle, &running_handles); ... server_busy = running_handles \|\| GameStarted();` | MATCH -- running_handles = count of still-running curl transfers; non-zero makes server_busy true, blocking a new check-in. |
| C. Values below 60 have no effect; interval never shorter than 60s | central.c:730, central.c:10, bothdefs.h:147 | `max(MIN_CHECKIN_PERIOD, sv_www_checkin_period.value)` ; `#define MIN_CHECKIN_PERIOD 60` ; `#define max(a,b) ((a) > (b) ? (a) : (b))` | MATCH -- max(60, value): for value<60 returns 60 (floor); for value>60 returns value. Polarity confirmed: 60 is the lower bound, not an upper cap. |
| D. Default: 60 (seconds) | central.c:20, central.c:760 | `static cvar_t sv_www_checkin_period = { "sv_www_checkin_period", "60" };` ; `Cvar_Register(&sv_www_checkin_period);` | MATCH (WI-2) -- registered default is the literal "60" in the cvar_t initializer; parses to value 60.0. |
| E. Set by: server config / rcon | central.c:20, cvar.h:66-75 | initializer `{ "sv_www_checkin_period", "60" }` (2 fields) ; struct order `{ name, string, flags, ... }` | MATCH (WI-2) -- flags field zero-initialized (no CVAR_ROM / locked flag), so it is a plain settable server cvar. |

**V-pass notes:** Oracle confirmed: git describe == "1.11-53-g18d0362". enforce-trace-discipline.md loaded and applied.

Wide-grep of sv_www_checkin_period in /src returned exactly 3 sites, all in central.c: registration (line 20, default "60"), the single enforcing read-site (line 730), and Cvar_Register (line 760). The entire behavior is concentrated at line 730 -- no callee mediates the cvar value itself, so no deeper call-chain was needed for the threshold/default/polarity clauses; however B3/B4 (the meaning of server_busy) WERE followed into their callees: GameStarted() at sv_main.c:218 and the curl_multi_perform/running_handles assignment at central.c:675-677.

SHARPENED RE-CHECK on the polarity/default claims (the calibration-row concern):
- Threshold direction: max(a,b) = ((a)>(b)?(a):(b)) (bothdefs.h:147), MIN_CHECKIN_PERIOD = 60 (central.c:10). So max(60, value) FLOORS the effective interval at 60. A value below 60 yields 60; 60 is a lower bound, NOT a cap. The description's "Values below 60 have no effect: the interval is never shorter than 60 seconds" matches exactly. No inversion.
- Default: verified against the REGISTERED default -- the cvar_t initializer literal "60" (central.c:20), registered at central.c:760. Not a shipped-cfg value. value parses to 60.0.
- "Set by: server config / rcon": cvar_t struct field order is {name, string, flags, ...} (cvar.h:66-75); the 2-field initializer zero-inits flags, so no CVAR_ROM/locked flag -> plain settable server cvar. Verified, not inferred from the name.

Every material clause (polarity, threshold floor, default, scope/OFF-state gate, the two busy sub-conditions) maps to a located enforcing line and matches its code plus adjacent context. No flavour-C name/enum/string inference, no contradiction, no behavior asserted without an enforcing read-site. Classification: TRACED-CLEAN.

Relevant file: /home/paradoks/projects/quakeworld/research/repos/mvdsv/src/central.c (lines 10, 20, 663-742, 754-760); /home/paradoks/projects/quakeworld/research/repos/mvdsv/src/sv_main.c (lines 218-227); /home/paradoks/projects/quakeworld/research/repos/mvdsv/src/bothdefs.h:147; /home/paradoks/projects/quakeworld/research/repos/mvdsv/src/cvar.h:66-75.

## flags_for_review

- [fyi/other/vpass] Timer-reset behavior (FYI, not a defect in the description): at central.c:739-740, last_checkin_time is reset to curtime on EVERY tick where server_busy is true (else-if branch). Combined with the initial guard at central.c:670-672 (first call seeds last_checkin_time and returns), this means the idle check-in clock effectively restarts whenever the server is busy. After a live game ends, the first idle check-in waits a full interval measured from the moment the server became idle, not from the last successful check-in. The proposed description's phrasing ('how often ... while it is idle') is consistent with this -- it describes idle-period cadence rather than a global wall-clock period -- so no clause is wrong; this is contextual detail an editor may or may not want to surface.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_www_checkin_period",
  "type": "cvar",
  "description": "Sets how often, in seconds, the server checks in with the central web server while it is idle. The check-in only happens when a web server address is configured and the server is not busy with a live game or a request already in flight. Values below 60 have no effect: the interval is never shorter than 60 seconds.\n\nDefault: 60 (seconds).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/central.c:730. Single read use-site: src/central.c:730 in Central_ProcessResponses (called every server frame at src/sv_main.c:3348). The gate is 'if (sv_www_address.string[0] && !server_busy && curtime - last_checkin_time > max(MIN_CHECKIN_PERIOD, sv_www_checkin_period.value))'. Units/seconds clause: curtime - last_checkin_time is elapsed seconds, compared against the cvar value -> the value is an interval in seconds. Floor clause: max(MIN_CHECKIN_PERIOD, sv_www_checkin_period.value) with MIN_CHECKIN_PERIOD = 60 (src/central.c:10) -> any value below 60 is clamped up to 60, so values under 60 have no observable effect. Address-gated clause: the same condition requires sv_www_address.string[0] -> no check-in when address empty. Not-busy clause: !server_busy, where server_busy = running_handles || GameStarted() (src/central.c:677) -> check-in suppressed while a request is in flight or a game is live (last_checkin_time is just reset at :740 in that case). On fire (:733-737) it builds the CHECKIN_PATH URL and submits a request, then resets last_checkin_time. Default clause (WI-2): registered at src/central.c:20 as cvar_t {\"sv_www_checkin_period\", \"60\"} -> 60. Set-by: Cvar_Register at src/central.c:760 in Central_Init -> server config / rcon. Cross-mod (F-MV1): no KTX reference (grep hit only sv_www_address). Build note: same WWW_INTEGRATION conditional, defined by the standard build (CMakeLists.txt:186) -> live, not dead. Did NOT dead-stamp per chunk rule. No new citation format (P3).",
  "description_proposed": null
}
```
