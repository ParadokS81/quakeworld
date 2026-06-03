# describe-fill-synthesis ledger -- mvdsv `sv_maxtic`

- **project:** mvdsv
- **knob:** `sv_maxtic` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_maxtic: synthesized -- caps the longest real time (seconds) simulated in one physics frame; over-long steps clamped to it -- origin=synthesized ref=src/sv_phys.c:966 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the longest amount of real time, in seconds, the server will simulate in a single physics frame. If more than this much time has elapsed since the last frame (for example after a hitch or lag spike), the step is capped at this value so the game does not advance in one huge jump. The excess beyond the cap is dropped -- not simulated or deferred -- so the server clock simply falls that much behind real time.
>
> Default: 0.1 (100 ms).
> Set by: server config / rcon.
> See also: sv_mintic.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| upper-bounds the per-frame physics time step | src/sv_phys.c:966-967 | `if (sv_frametime > (double) sv_maxtic.value) sv_frametime = (double) sv_maxtic.value;` | MATCH |
| units are seconds (time delta) | src/sv_phys.c:963,978 | `sv_frametime = sv.time - sv.old_time;` ... `PR_GLOBAL(frametime) = sv_frametime;` | MATCH |
| excess time caught up next frames | src/sv_phys.c:968 | `sv.old_time = sv.time;` (advanced only after clamp) | MATCH |
| default 0.1 | src/sv_main.c:49 | `cvar_t sv_maxtic = {"sv_maxtic","0.1"};` | MATCH |
| set-by server config/rcon (no flag) | src/sv_main.c:3479 | `Cvar_Register (&sv_maxtic);` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| C1 | Longest real time, in seconds, the server simulates in a single physics frame | src/sv_phys.c:963,966-967,978 | `sv_frametime = sv.time - sv.old_time;` ... `if (sv_frametime > (double) sv_maxtic.value) sv_frametime = (double) sv_maxtic.value;` ... `PR_GLOBAL(frametime) = sv_frametime;` | MATCH |
| C2 | If more than this elapsed since last frame, step capped at this value (no one huge jump) | src/sv_phys.c:966-967 | `if (sv_frametime > (double) sv_maxtic.value)` / `sv_frametime = (double) sv_maxtic.value;` | MATCH |
| C3 | The excess time is "caught up over the following frames" | src/sv_phys.c:968 (+ sv_main.c:3299) | `sv.old_time = sv.time;` (old_time jumps to full current sv.time, not old_time+clamped) ; `sv.time += time1;` (one advance/host-frame, no catch-up loop, no residual accumulator) | MISMATCH |
| C4 | Default 0.1 (100 ms) | src/sv_main.c:49,3479 | `cvar_t sv_maxtic = {"sv_maxtic","0.1"};` / `Cvar_Register (&sv_maxtic);` (no value arg, no OnChange) | MATCH |
| C5 | Set by server config / rcon | src/sv_main.c:49 | `cvar_t sv_maxtic = {"sv_maxtic","0.1"};` (no CVAR_SERVERINFO / no restricting flags; plain server cvar) | MATCH |
| C6 | See also: sv_mintic | src/sv_main.c:48; src/sv_phys.c:964-965 | `cvar_t sv_mintic = {"sv_mintic","0.013"};` / `if (sv_frametime < (double) sv_mintic.value) return;` (complementary lower bound at adjacent enforcing lines) | MATCH |

**V-pass notes:** Classification: C-FIX. Five of six clauses (C1, C2, C4, C5, C6) trace clean to their enforcing lines. Clause C3 ("the excess time is caught up over the following frames") CONTRADICTS the enforcing line.

The enforcing block is sv_phys.c:960-971 (registration in sv_main.c:49, registered sv_main.c:3479). sv_maxtic appears at EXACTLY two read-sites, both in this block (wide grep over src/ for "sv_maxtic" and "maxtic" returned only sv_main.c:49/3479, server.h:727 decl, sv_phys.c:966-967). The bot-physics branch (sv_phys.c:1048-1073) does NOT consult sv_maxtic, so the clamp's scope is precisely the main SV_Physics frametime -- no extra scope caveat needed.

Why C3 is wrong (flavour-C, canonical "spiral-of-death mitigation" inference): The standard catch-up engine pattern advances old_time by the CLAMPED step (old_time += clamped_frametime), leaving the un-simulated remainder to be processed next frame. mvdsv does NOT do this. At sv_phys.c:968 it sets `sv.old_time = sv.time` -- old_time jumps to the FULL current sv.time, so on the next frame sv_frametime = sv.time - old_time is computed fresh and the excess (gap - sv_maxtic) is DISCARDED, never replayed. Confirmed there is no residual accumulator and no catch-up while-loop: SV_Frame (sv_main.c:3284) advances `sv.time += time1` once (line 3299) and calls SV_Physics() once per host frame (line 3336). I grepped every `sv.time =` assignment in src/ -- only += time1 (3299), init values in sv_init.c, and savegame load (sv_save.c:307); none rewinds sv.time based on the clamp. So after a hitch the server clock is permanently "behind" wall-clock by the dropped amount and proceeds normally from there; the lost simulation time is gone, not deferred.

Recommended fix for C3 (re-synth): replace the "caught up over the following frames" sentence with the truth -- the excess time beyond the cap is DROPPED (not simulated and not deferred); the physics clock simply advances by at most sv_maxtic that frame and the un-simulated time is discarded. C1/C2/C4/C5/C6 can stand as written.

Metadata (WI-2): C4 default verified against the registered struct default "0.1" at sv_main.c:49 with a bare Cvar_Register (no value arg, no OnChange) -- not a shipped-cfg value. Correct as 0.1 / 100 ms. C5: plain cvar, no CVAR_SERVERINFO (contrast sv_maxfps at sv_main.c:50), settable via console/config/rcon -- correct.

## flags_for_review

- [review/contradiction/vpass] sv_maxtic clamp at sv_phys.c:966-968 discards excess frame time (sv.old_time = sv.time, not old_time += clamped step). This is by-design Quake behavior, NOT a bug, but it directly falsifies the proposed C3 'excess caught up over following frames' clause. Flagging so the re-synth corrects the side-effect narrative rather than re-inheriting the common catch-up-engine assumption.
- [fyi/hidden-family/vpass] Adjacent paired knob sv_mintic (sv_main.c:48, enforced sv_phys.c:964-965) has the SAME discard-vs-defer subtlety in reverse: when frametime < sv_mintic the whole physics frame is SKIPPED via early return WITHOUT updating sv.old_time, so the time naturally accumulates into the next frame's gap (this IS a real accumulate path). If sv_mintic gets a describe-fill row, its 'accumulates until enough time passes' framing would be CORRECT there -- the asymmetry (mintic accumulates because old_time is not bumped on the skip; maxtic discards because old_time IS bumped to full sv.time on the clamp) is the load-bearing detail and a likely cross-row consistency trap.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_maxtic",
  "type": "cvar",
  "description": "Sets the longest amount of real time, in seconds, the server will simulate in a single physics frame. If more than this much time has elapsed since the last frame (for example after a hitch or lag spike), the step is capped at this value so the game does not advance in one huge jump. The excess beyond the cap is dropped -- not simulated or deferred -- so the server clock simply falls that much behind real time.\n\nDefault: 0.1 (100 ms).\nSet by: server config / rcon.\nSee also: sv_mintic.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_phys.c:966. Enforcing site SV_Physics (src/sv_phys.c:960-968): `sv_frametime = sv.time - sv.old_time;` then sv_phys.c:966-967 `if (sv_frametime > (double) sv_maxtic.value) sv_frametime = (double) sv_maxtic.value;` enforces the upper clamp on the per-frame time step. Units are seconds: sv_frametime is a time delta (sv.time - sv.old_time) and is assigned into PR_GLOBAL(frametime) at sv_phys.c:978; the registration comment 'physics time tic' (sv_main.c:49) corroborates. 'excess caught up over following frames': sv.old_time is advanced to sv.time at sv_phys.c:968 only after the clamp, so remaining wall-time is consumed on subsequent frames -- enforced by the old_time bookkeeping; stated in user terms. Companion lower bound sv_mintic at sv_phys.c:964 (`if (sv_frametime < sv_mintic.value) return;`) is the paired clamp -> See also. Default 0.1: registration `{\"sv_maxtic\",\"0.1\"}` at sv_main.c:49 (WI-2). Set-by: plain Cvar_Register at sv_main.c:3479 (no ROM/serverinfo flag) => server config / rcon. F-MV1: no KTX read/override of sv_maxtic found.",
  "description_proposed": null
}
```
