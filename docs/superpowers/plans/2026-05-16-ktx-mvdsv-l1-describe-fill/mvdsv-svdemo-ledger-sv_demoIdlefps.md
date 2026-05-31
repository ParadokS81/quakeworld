# MVDSV L1 describe-fill ledger -- `sv_demoIdlefps`

- **project:** mvdsv
- **knob:** `sv_demoIdlefps` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE confirmed: `git describe --tags` printed exactly this)
- **C variable / registered name string:** `cvar_t sv_demoIdlefps = {"sv_demoIdlefps", "10"}` -- variable and registered name STRING match the L1 entity name exactly; no case drift.
- **mechanical_candidate:** none (cold-synth; no trailing comment, no shipped-config candidate).
- **suspect_pool_member:** FALSE (live `.value` read confirmed; not runtime-dead).
- **verdict:** `synthesized` (high confidence)

## Final user-facing description

> Sets the rate (in frames per second) at which the server records MVD demo
> frames while it is idle -- that is, while no players are spawned in or the
> server is paused. When the server is active with players, sv_demofps applies
> instead. A higher value records idle periods more finely (larger demo files);
> a lower value records them more sparsely. The value is clamped to the range
> 4-30, so it cannot be set lower than 4 or used to stop recording during idle.
>
> Default: 10.
> Set by: server config.

## Per-clause enforce-trace (B1) -- all TRACED-CLEAN

The sole read use-site is `src/sv_send.c:1343`, inside `SV_SendDemoMessage`
(declared `src/sv_send.c:1309`). Registration `src/sv_demo.c:1842`; cvar_t
literal `src/sv_demo.c:41`. Wide read (WI-1): a tree-wide case-insensitive grep
finds NO other use-site of the knob beyond these four lines.

| # | Clause | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|---|
| 1 | Value is the MVD demo recording frame rate used during idle | `src/sv_send.c:1343` | `min_fps = bound(4.0, (int)sv_demoIdlefps.value, 30);` | MATCH -- the value feeds `min_fps`, the demo writer's fps cap |
| 2 | "Idle" = no spawned players, OR server paused | `src/sv_send.c:1339-1343` (+ `cls` built at 1331-1337) | `// if no players or paused, use idle fps` / `if (cls && !sv.paused) ... else min_fps = bound(...)` ; `cls |= 1 << i;` over `cs_spawned` clients | MATCH -- else-branch (idlefps) is reached when NOT(players present AND not-paused) = no players OR paused |
| 3 | Active-with-players path uses sv_demofps instead (scope boundary) | `src/sv_send.c:1340-1341` | `if (cls && !sv.paused) min_fps = max(4.0, (int)sv_demofps.value ? (int)sv_demofps.value : 20.0);` | MATCH -- the IF branch (the other path) uses sv_demofps, not idlefps |
| 4 | fps meaning: at most one demo frame written per `1/min_fps` second | `src/sv_send.c:1345-1347` | `if (curtime - demo.curtime < 1.0 / min_fps) { return; }` | MATCH -- the write gate returns (skips the frame) until the interval elapses; min_fps is literally frames/sec |
| 5 | Higher = more frequent frames / larger file; lower = sparser | derived from 1+4 (monotonic: larger min_fps -> smaller `1.0/min_fps` interval -> frames written more often) | same as #4 | MATCH |
| 6 | Clamped to 4-30; below 4 floored to 4, above 30 capped to 30; cannot be turned off | `src/sv_send.c:1343` + `src/bothdefs.h:151` | `bound(4.0, (int)sv_demoIdlefps.value, 30)` ; `#define bound(a,b,c) ((a) >= (c) ? (a) : (b) < (a) ? (a) : (b) > (c) ? (c) : (b))` | MATCH -- macro expands to floor=a=4, ceil=c=30; value below 4 returns 4, so 0 does NOT disable (no OFF-state) |
| 7 (WI-2) | Default = 10 (registered) | `src/sv_demo.c:41` | `cvar_t sv_demoIdlefps = {"sv_demoIdlefps", "10"};` | MATCH -- registered default literal, not a shipped-cfg value |
| 8 (WI-2) | Set by: server config (no special access, no OnChange) | `src/sv_demo.c:41` + `src/sv_demo.c:1842` | literal carries no `CVAR_ROM` / `CVAR_SERVERINFO` flag and no OnChange callback; `Cvar_Register (&sv_demoIdlefps);` | MATCH -- plain registered server cvar, settable from server console/config/rcon |

### Polarity verification of the `bound` macro (r42 anti-shortcut guard)

`bound(a,b,c)` with `a=4.0` (lower), `b=value`, `c=30` (upper):
- `(4.0 >= 30)` false -> skip.
- `(value < 4.0)` true -> return `4.0` (FLOOR).
- else `(value > 30)` true -> return `30` (CEIL).
- else return `value`.

Confirms floor 4 / ceil 30. The OFF-state clause is the load-bearing one: a
naive reading of "fps" would invite "0 = off", but 0 is floored to 4, so the
demo recorder always writes at >=4 fps during idle. The description states this
explicitly and asserts NO off-state.

### Cross-engine (D20) check

The idle fps is a purely server-side decision about how often MVD frames are
emitted. The recorded MVD is replayed later by ezQuake / QTV, but this knob does
not change any admin action on another codebase (it is not action-changing
cross-engine). No `See also: L3` warranted; lean D20 shape is correct.

## Rubric (D5) grading

1. WHAT in admin-observable terms (idle demo recording fps; file granularity) -- not WHY. PASS.
2. Not a name restatement (explains "idle" = no players / paused, and the fps effect on demo files). PASS.
3. Units spelled out (frames per second) + the 4-30 clamp + explicit no-off-state. PASS.
4. Mechanism only -- no recommended value, no opinion. PASS.
5. Self-contained without reading C. PASS.

D20 QA self-check: admin-readable (yes); zero file:line / function names / engine
jargon in `description` (yes -- `min_fps`, `SV_SendDemoMessage`, `bound`,
`cls`, `sv.paused` all kept OUT of the user doc and live only here); units/range
+ Default + Set-by present (yes); cross-engine routed (n/a, not action-changing);
every clause enforce-traced with cites recorded in `description_reasoning` (yes).

## D6 record

```json
{
  "project": "mvdsv",
  "knob": "sv_demoIdlefps",
  "type": "cvar",
  "description": "Sets the rate (in frames per second) at which the server records MVD demo frames while it is idle -- that is, while no players are spawned in or the server is paused. When the server is active with players, sv_demofps applies instead. A higher value records idle periods more finely (larger demo files); a lower value records them more sparsely. The value is clamped to the range 4-30, so it cannot be set lower than 4 or used to stop recording during idle.\n\nDefault: 10.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment/candidate; every clause traced to its enforcing read-site (TRACED-CLEAN). idle-demo-fps semantic + fps meaning -> sv_send.c:1343 (min_fps = bound(4.0,(int)sv_demoIdlefps.value,30)) feeding the write gate sv_send.c:1345-1347 (if (curtime-demo.curtime < 1.0/min_fps) return). Idle scope (no spawned players OR paused) -> sv_send.c:1339-1343 else-branch + cls bitmask sv_send.c:1331-1337; the active-with-players path uses sv_demofps -> sv_send.c:1340-1341. Clamp/OFF-state polarity -> bound macro bothdefs.h:151 expands floor=4/ceil=30, so 0 floors to 4 (no off-state); r42-guarded by expanding the macro, not trusting the call shape. Default 10 (WI-2 registered literal) -> sv_demo.c:41; Set by server config (no CVAR_ROM/SERVERINFO/OnChange) -> sv_demo.c:41 + register sv_demo.c:1842. WI-1 tree-wide grep: no other use-site. suspect_pool_member=FALSE (live read). D20 lean shape; cross-engine not action-changing so no See also. Verdict synthesized, high confidence.",
  "description_proposed": "Sets the rate (in frames per second) at which the server records MVD demo frames while it is idle -- that is, while no players are spawned in or the server is paused. When the server is active with players, sv_demofps applies instead. A higher value records idle periods more finely (larger demo files); a lower value records them more sparsely. The value is clamped to the range 4-30, so it cannot be set lower than 4 or used to stop recording during idle.\n\nDefault: 10.\nSet by: server config."
}
```

## source_ref (file:line)

- Primary read use-site (authoritative): `src/sv_send.c:1343`
- Supporting enforcement (write gate / scope / clamp macro / default / registration):
  `src/sv_send.c:1345-1347`, `src/sv_send.c:1339-1343`, `src/bothdefs.h:151`,
  `src/sv_demo.c:41`, `src/sv_demo.c:1842`
