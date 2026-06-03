# describe-fill-synthesis ledger -- mvdsv `sv_mintic`

- **project:** mvdsv
- **knob:** `sv_mintic` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_mintic: synthesized -- minimum seconds between server frames; below it the frame is skipped; 0 = no minimum; traced to sv_phys.c:964 -- origin=synthesized ref=src/sv_phys.c:964 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the minimum time, in seconds, between server simulation frames. The server skips running a frame until at least this much time has passed since the last one, which caps how often the world is updated. A higher value runs the server less often (coarser simulation); a lower value allows more frequent updates. At 0 there is no minimum and a frame runs every cycle.
>
> Default: 0.013.
> Set by: server config / rcon.
> See also: sv_maxtic.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| minimum seconds between server frames; below it the frame is skipped | src/sv_phys.c:964 | `if (sv_frametime < (double) sv_mintic.value) return;` | MATCH |
| sv_frametime is a time delta in seconds | src/sv_phys.c:963 | `sv_frametime = sv.time - sv.old_time;` | MATCH |
| at 0 a frame runs every cycle (no minimum) | src/sv_phys.c:964 | `sv_frametime < 0` never true since frametime >= 0 | MATCH |
| upper bound is sv_maxtic (See also) | src/sv_phys.c:966-967 | `if (sv_frametime > (double) sv_maxtic.value) sv_frametime = (double) sv_maxtic.value;` | MATCH |
| Default 0.013 (registered) | src/sv_main.c:48 | `cvar_t sv_mintic = {"sv_mintic","0.013"};` | MATCH |
| settable via config/rcon (no ROM flag) | src/sv_main.c:3478 | `Cvar_Register (&sv_mintic);` | MATCH |
| no KTX override | ktx/src (grep) | (no hits for sv_mintic) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "minimum time, in seconds, between server simulation frames" | sv_phys.c:962-965 | `// don't bother running a frame if sv_mintic seconds haven't passed` / `sv_frametime = sv.time - sv.old_time;` / `if (sv_frametime < (double) sv_mintic.value)` / `return;` | MATCH |
| 2 | "skips running a frame until at least this much time has passed since the last one" | sv_phys.c:964-965, 968 | `if (sv_frametime < (double) sv_mintic.value)` / `return;` ... `sv.old_time = sv.time;` (old_time only updated on a frame that actually runs, so "since the last [run] frame" is exact) | MATCH |
| 3 | "caps how often the world is updated" | sv_phys.c:965 vs body 978-1043 | early `return;` at 965 skips `PR_GLOBAL(frametime)=sv_frametime;` + `SV_ProgStartFrame` + the per-edict think/physics loop (the world update) | MATCH |
| 4 | "higher value -> server runs less often; lower value -> more frequent" (polarity) | sv_phys.c:964 | `if (sv_frametime < (double) sv_mintic.value) return;` -- larger threshold => more cycles return early => fewer frames run. Direction correct. | MATCH |
| 5 | "At 0 there is no minimum and a frame runs every cycle" (OFF-state) | sv_phys.c:963-964 | `sv_frametime = sv.time - sv.old_time;` (>=0) ; `sv_frametime < 0` is never true => guard never returns early at value 0 => a frame runs each SV_Physics call | MATCH |
| 6 | "Default: 0.013" | sv_main.c:48 (registered unmodified sv_main.c:3478) | `cvar_t sv_mintic = {"sv_mintic","0.013"};` -- registered default per WI-2 (struct initializer, not a shipped-cfg value); `Cvar_Register (&sv_mintic);` | MATCH |
| 7 | "Set by: server config / rcon" | sv_main.c:48, 3478 | `{"sv_mintic","0.013"}` registered with NO flags (no CVAR_SERVERINFO / readonly) => standard server cvar settable via cfg/console/rcon. Generic-but-accurate; no contradicting flag. | MATCH |
| 8 | "See also: sv_maxtic" | sv_phys.c:966-967 | `if (sv_frametime > (double) sv_maxtic.value)` / `sv_frametime = (double) sv_maxtic.value;` -- paired upper clamp at the SAME enforcing site | MATCH |

**V-pass notes:** Oracle confirmed: mvdsv `git describe --tags` == 1.11-53-g18d0362.

Wide read complete: sv_mintic appears in exactly three files across the whole src tree -- registration (sv_main.c:48 struct init + 3478 Cvar_Register), extern decl (server.h:727), and ONE enforcing site (sv_phys.c:962-968). No other read-sites, no callee indirection, no cross-file enforcement. SV_CheckVars (sv_main.c:3213) does NOT touch mintic/maxtic/frametime (verified by grep of its body). Cvar_Register applies no min/max bound, so the value itself is unclamped -- consistent with the description making no clamp claim.

Mechanism traced end-to-end: SV_Frame (sv_main.c:3284, per server cycle) advances `sv.time += time1` (3299, seconds) when not paused, then calls SV_Physics() (3336, comment "move autonomous things around if enough time has passed"). SV_Physics (sv_phys.c:950) computes `sv_frametime = sv.time - sv.old_time` and early-returns when below sv_mintic.value, skipping the entire edict think/physics loop. `sv.old_time` advances only on a frame that runs (968), so the "since the last frame" semantics are precise. The two init frames in sv_init.c:646-650 prime sv.old_time and are not a contradiction.

Every material clause (semantic / polarity / OFF-state / default / scope / see-also) maps to a located, verified enforcing line plus its adjacent comment. The "in seconds" assertion is corroborated by the source comment "if sv_mintic seconds haven't passed" (962). Default 0.013 is the REGISTERED default per WI-2 (struct initializer), not a shipped-cfg datum. Polarity and the value-0 OFF-state both verify by direct evaluation of the `<` guard. No flavour-C clause (nothing inferred from the knob name / a string / an enum without an enforcing read-site). Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/other/vpass] Minor terminology, NOT an imprecision: the description's "server simulation frames" / "world is updated" maps to the SV_Physics (physics/entity-think) frame. The early return at sv_phys.c:965 skips only the SV_Physics body; the surrounding SV_Frame work (SV_ReadPackets, SV_CheckTimeouts, MVD poll, etc.) still runs every cycle. For a user-doc this framing is correct and appropriately abstracted -- flagging only so a reviewer is aware sv_mintic gates the physics/think loop specifically, not the entire server tick.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_mintic",
  "type": "cvar",
  "description": "Sets the minimum time, in seconds, between server simulation frames. The server skips running a frame until at least this much time has passed since the last one, which caps how often the world is updated. A higher value runs the server less often (coarser simulation); a lower value allows more frequent updates. At 0 there is no minimum and a frame runs every cycle.\n\nDefault: 0.013.\nSet by: server config / rcon.\nSee also: sv_maxtic.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_phys.c:964. Pre-existing inline comment at src/sv_main.c:48 ('bound the size of the') is truncated dev-aside -- ignored per chunk rule; synthesized purely from the read use-site. Enforcing read: src/sv_phys.c:962-968 in SV_Physics -- sv_frametime = sv.time - sv.old_time (seconds), then `if (sv_frametime < (double) sv_mintic.value) return;` (sv_phys.c:964) skips the entire frame when elapsed time is below the cvar -> establishes it as the MINIMUM seconds between server frames (polarity: lower threshold gates frame execution; unit: seconds, since sv_frametime is a time delta). OFF-state (value 0): sv_frametime is always >= 0 so `< 0` is never true and a frame runs every cycle -- traced to the same comparison. Upper bound is the sibling sv_maxtic at sv_phys.c:966-967 (`if (sv_frametime > sv_maxtic.value) sv_frametime = sv_maxtic.value`), which is why See also: sv_maxtic. Default 0.013 verified at the registered cvar_t literal src/sv_main.c:48 `{\"sv_mintic\",\"0.013\"}` (WI-2). Settable: plain cvar_t with no ROM flag, registered src/sv_main.c:3478; not on the sv_crypt_rcon blocklist -> server config / rcon. F-MV1: no KTX override (grep ktx/src for sv_mintic returns nothing).",
  "description_proposed": null
}
```
