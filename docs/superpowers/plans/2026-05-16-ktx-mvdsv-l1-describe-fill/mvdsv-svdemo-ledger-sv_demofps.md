# describe-fill-synthesis ledger -- mvdsv `sv_demofps`

- **project:** mvdsv
- **knob:** `sv_demofps` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE: `git describe --tags` printed `1.11-53-g18d0362` -- PASS)
- **registered name string:** `"sv_demofps"` (cvar_t literal `sv_demo.c:40`; cvar_t C variable is also `sv_demofps` -- no case drift. NB sibling `sv_demoPings` at `sv_demo.c:42` DOES drift to string `"sv_demopings"`, so the string was checked explicitly here, not assumed from the variable)
- **registered default:** `"77"` (bare two-field initializer `{"sv_demofps", "77"}` -- no flags, no OnChange; WI-2 confirms registered default = 77, matching the extractor-recorded default)
- **L1 row:** `mvdsv:cvar:sv_demofps`, `source_backed` (cold-synth: no help_desc / nothing to affirm)
- **suspect_pool_member:** FALSE (per brief; verified vs Phase-0 C3 pool; not runtime-dead) -> Step 2 skipped
- **mechanical_candidate:** none (cold-synth). Registration line `cvar_t sv_demofps = {"sv_demofps", "77"};` carries NO trailing comment -- nothing to affirm. Per D5 amendment the entity is still evaluated; with no comment it routes directly to Step 5 synthesize. Behavior is source-legible (single clear read-site + enforcing gate), so NOT Step 4.

## Verdict (halt line)

```
mvdsv:sv_demofps: synthesized -- cold-synth; value = demo frame rate (frames/sec) written into the MVD while players are present and unpaused; 0 falls back to 20 fps (not off); values floored at 4 fps; all clauses enforce-traced TRACED-CLEAN -- origin=synthesized ref=src/sv_send.c:1341 anchor=1.11-53-g18d0362
```

## Final `description` (verbatim, D20 shape)

> Sets the recording frame rate of server-side MVD demos: how many demo frames per second are written while at least one player is in the game and the server is not paused. A higher value records the action more finely (larger demo files); a lower value records more coarsely. Setting it to 0 does not turn recording off -- it falls back to 20 frames per second. Values are effectively floored at 4 frames per second. (When the game is paused or no players are spawned, the separate sv_demoIdlefps rate applies instead.)
>
> Default: 77.
> Set by: server config.

## `source_ref`(s)

- Primary (authoritative read use-site): `src/sv_send.c:1341` -- `min_fps = max(4.0, (int)sv_demofps.value ? (int)sv_demofps.value : 20.0);` (the sole site the value is read and consumed)
- Supporting enforcing lines (all in `SV_SendDemoMessage`, `src/sv_send.c`): `:1345` (the per-frame throttle gate that turns `min_fps` into a frames-per-second cap), `:1412` (`demo.curtime = curtime;` -- confirms the gate is a real per-write throttle), `:1331-1337` + `:1340` (the `cls && !sv.paused` active-state scope that selects this branch)

## Per-clause enforce-trace table

| # | Clause (in `description`) | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|---|
| 1 | "Sets the recording frame rate ... how many demo frames per second are written" (unit = frames/sec) | `src/sv_send.c:1345` (+ `:1412`) | `if (curtime - demo.curtime < 1.0 / min_fps) {` ... `return;` ; `demo.curtime = curtime;` (1412) | MATCH -- a new demo message is written only once `1.0/min_fps` seconds have passed since the last (`demo.curtime` updated to `curtime` after each write at 1412), so `min_fps` is the frames-per-second rate. `sv_demofps` supplies `min_fps` in the active branch (1341). |
| 2 | value is read as the active demo fps | `src/sv_send.c:1341` | `min_fps = max(4.0, (int)sv_demofps.value ? (int)sv_demofps.value : 20.0);` | MATCH -- the only read of `sv_demofps.value` (WI-1 whole-tree grep: this is the sole `.value` read). |
| 3 | "while at least one player is in the game and the server is not paused" (scope) | `src/sv_send.c:1331-1337` + `:1340` | `if (c->state != cs_spawned) continue;` ... `cls |= 1 << i;` (1331-1337); `if (cls && !sv.paused)` (1340) | MATCH -- `cls` is the spawned-client bitmask (nonzero iff >=1 spawned client); the `sv_demofps` branch is taken only when `cls` is nonzero AND `!sv.paused`. Otherwise the else-branch (`sv_demoIdlefps`) runs. |
| 4 | "A higher value records ... more finely ... a lower value records more coarsely" (polarity) | `src/sv_send.c:1341` + `:1345` | `(int)sv_demofps.value` fed as `min_fps`; `curtime - demo.curtime < 1.0 / min_fps` | MATCH -- larger `min_fps` -> smaller `1.0/min_fps` inter-frame interval -> more frames/sec; the file-size consequence is the direct user-observable result of more frames, no separate code clause needed. |
| 5 | "Setting it to 0 does not turn recording off -- it falls back to 20 frames per second" (OFF-state) | `src/sv_send.c:1341` | `(int)sv_demofps.value ? (int)sv_demofps.value : 20.0` | MATCH -- ternary: when `(int)sv_demofps.value` is 0 (i.e. set to 0, or any value in [0,1) truncating to 0) the else-branch `20.0` is used. Recording is NOT gated on this value being nonzero (recording on/off is `sv.mvdrecording` at `:1325`, independent). So 0 is a fallback, not an off-switch. |
| 6 | "Values are effectively floored at 4 frames per second" (threshold/clamp) | `src/sv_send.c:1341` | `max(4.0, ...)` | MATCH -- the whole ternary result is wrapped in `max(4.0, ...)`, so any computed rate below 4.0 (e.g. `sv_demofps 1`, `2`, or `3`) is clamped up to 4.0 fps. |
| 7 | (implicit) value truncated to whole frames | `src/sv_send.c:1341` | `(int)sv_demofps.value` (both ternary positions) | MATCH -- the float cvar value is cast to int before use; fractional fps are truncated. Not surfaced as a separate user clause (would be jargon); folded into "frames per second". |
| 8 | "the separate sv_demoIdlefps rate applies instead" (paused/no-players scope boundary) | `src/sv_send.c:1342-1343` | `else min_fps = bound(4.0, (int)sv_demoIdlefps.value, 30);` | MATCH -- the else branch (no spawned players OR paused) uses `sv_demoIdlefps`, not `sv_demofps`. Named for scope clarity only; `sv_demoIdlefps` itself is out of scope and not described here. |
| 9 | Default: 77 | `src/sv_demo.c:40` | `cvar_t  sv_demofps          = {"sv_demofps",        "77"};` | MATCH -- WI-2: registered default read from the cvar_t literal (2-field, no flags, no callback), matches the extractor-recorded `77`. Not a shipped-cfg value. |
| 10 | Set by: server config | `src/sv_demo.c:40` + `src/sv_demo.c:1841` | `{"sv_demofps", "77"}` (no CVAR_* flag, no OnChange) ; `Cvar_Register (&sv_demofps);` | MATCH -- plain registered cvar: no `CVAR_SERVERINFO`/`CVAR_ROM` flag, no OnChange handler, no command/vote dispatch path. Settable from the server config / console. |

### Clauses deliberately NOT asserted (B1 hygiene)

- No mention of `max()`, `bound()`, the ternary, `(int)` cast, `min_fps`, `demo.curtime`, or any file:line in `description` -- all internal mechanism, kept in this trace + `description_reasoning` per D20.
- No "stops recording" / "disables demos" reading of the 0 case -- that would be a flavour-C inversion (the OFF claim derivable from a naive "fps=0 means off" intuition). The enforcing ternary proves 0 -> 20 fps fallback; recording on/off is `sv.mvdrecording`, a different gate. Asserted exactly as the code enforces.
- No `See also: L3`. The MVD is consumed downstream (QTV proxies, client demo playback) and demo fps does affect playback smoothness / file size, but that consequence is cross-codebase L3 CONTEXT and is NOT action-changing at the MVDSV L1 layer (an admin sets the server's record rate; nothing in the same codebase enforces a client/proxy effect). Per the D20 cross-engine default, this is left to L3, and no slug is invented here.
- No recommended value (D5 clause 4 / mechanism-only -- note the registered default 77 is stated as the default, not as advice).

## Grading rationale

- **Step 1 (read-site grounding):** `sv_demofps.value` is READ at exactly one site, `sv_send.c:1341`, inside `SV_SendDemoMessage` (the MVD recorder write tick). Whole-tree grep (WI-1) returns only that read plus extern decls (`sv_send.c:1317`, `server.h:992`) and the registration (`sv_demo.c:40`, `:1841`) -- no macro-indirected read, no second branch. Not name-only synthesis; behavior fully source-legible.
- **Step 2:** skipped (`suspect_pool_member = FALSE`).
- **Step 3 (D5):** the registration line carries no trailing comment, so there is nothing to affirm; cold-synth. Evaluated anyway per the D5 amendment -> synthesize.
- **Step 4:** not reached -- every material clause has an enforcing line.
- **Step 5 (synthesize, D20):** authored in the condensed user-doc shape; every file:line / code cite kept OUT of `description` (recorded here + in `description_reasoning`). The paused/no-players scope is stated in user terms (and names the sibling `sv_demoIdlefps` only for boundary clarity, without describing it). WI-2: default 77 verified against the registered cvar_t literal, not a cfg. Set-by = server config (plain cvar, no flags, no OnChange, no command/vote path).
- **V-pass self-classification:** TRACED-CLEAN -- every semantic/threshold(4 fps floor)/polarity(higher=finer)/scope(active vs idle)/OFF-state(0 -> 20 fps)/side-effect clause maps to a located, verified enforcing line, incl. the adjacent comment `// if no players or paused, use idle fps` at `:1339`.
- **Confidence:** high (single self-contained consumer function; all clauses directly enforced at one read-site + its throttle gate; default + flags cross-checked against source and the extractor record).

## D6 Record

```json
{
  "project": "mvdsv",
  "knob": "sv_demofps",
  "type": "cvar",
  "description": "Sets the recording frame rate of server-side MVD demos: how many demo frames per second are written while at least one player is in the game and the server is not paused. A higher value records the action more finely (larger demo files); a lower value records more coarsely. Setting it to 0 does not turn recording off -- it falls back to 20 frames per second. Values are effectively floored at 4 frames per second. (When the game is paused or no players are spawned, the separate sv_demoIdlefps rate applies instead.)\n\nDefault: 77.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment on cvar_t literal sv_demo.c:40; nothing to affirm). Sole read of sv_demofps.value is sv_send.c:1341 in SV_SendDemoMessage (WI-1 whole-tree grep: only that read + externs sv_send.c:1317/server.h:992 + reg sv_demo.c:40,1841). Frame-rate unit + 'demo frames per second' -> sv_send.c:1345 'curtime - demo.curtime < 1.0/min_fps' throttle gate, with demo.curtime=curtime at :1412 confirming a real per-write throttle; sv_demofps feeds min_fps in the active branch. Active-state scope (players present + not paused) -> cls spawned-client bitmask sv_send.c:1331-1337 + gate 'if (cls && !sv.paused)' :1340 (adjacent comment :1339 'if no players or paused, use idle fps'). Polarity higher=finer/larger files -> larger min_fps shrinks 1.0/min_fps interval (:1341/:1345). OFF-state: '0 -> 20 fps fallback, not off' -> ternary '(int)sv_demofps.value ? (int)sv_demofps.value : 20.0' at :1341; recording on/off is sv.mvdrecording :1325, a separate gate. Floor: 'effectively 4 fps' -> max(4.0, ...) wrap at :1341 clamps any sub-4 value up. int truncation -> (int) cast at :1341 (folded into 'frames per second', no jargon). Paused/no-players boundary uses sv_demoIdlefps -> else branch :1342-1343 (named for scope only; out of scope). Default 77 verified vs registered cvar_t literal sv_demo.c:40 (WI-2, 2-field no-flags, matches extractor 77; not a cfg value). Set-by=server config: plain cvar, no CVAR_SERVERINFO/ROM flag, no OnChange/command/vote. No See-also: cross-codebase demo-playback/QTV consequence is L3 context, not action-changing at MVDSV L1. V-pass self-class TRACED-CLEAN; all clauses enforce-traced; confidence high.",
  "description_proposed": null
}
```
