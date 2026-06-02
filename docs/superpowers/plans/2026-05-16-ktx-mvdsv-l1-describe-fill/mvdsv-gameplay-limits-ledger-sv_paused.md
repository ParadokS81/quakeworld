# describe-fill-synthesis ledger -- mvdsv `sv_paused`

- **project:** mvdsv
- **knob:** `sv_paused` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_paused: synthesized -- CVAR_ROM read-only mirror of internal pause state; engine writes it (Cvar_SetROM sv_user.c:2042), admin cannot set, pausable is the permission knob; bit-2 header claim has no live setter so hedged out -- origin=synthesized ref=src/sv_user.c:2042 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Read-only status value that reflects whether the server is currently paused. It shows 0 when the game is running and a non-zero value while play is paused (1 = paused). This setting cannot be changed directly to pause or unpause the game; the engine updates it automatically when a pause is toggled. To control whether pausing is permitted at all, use pausable.
>
> Default: 0.
> Set by: engine (read-only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read-only (admin cannot set) | src/sv_main.c:174 | `cvar_t sv_paused = {"sv_paused", "0", CVAR_ROM}` | MATCH (CVAR_ROM) |
| engine writes it to mirror pause state | src/sv_user.c:2042 | `Cvar_SetROM (&sv_paused, va("%i", sv.paused))` | MATCH |
| mirrors internal sv.paused toggled by bit | src/sv_user.c:2040 | `sv.paused ^= bit` | MATCH |
| reset to 0 on server spawn | src/sv_init.c:303 | `Cvar_SetROM(&sv_paused, "0")` | MATCH |
| 1 = paused (bit 1 is the live pause bit) | src/sv_main.c:3116 | `if ((sv.paused & 1) && !nclients)` | MATCH |
| only bit=1 ever set by live callers | src/sv_user.c:892, src/pr_cmds.c:2626, src/sv_main.c:3127 | `SV_TogglePause (NULL, 1)` / `SV_TogglePause("...", 1)` | MATCH |
| bit 2 (auto/single-player) claim | src/server.h:725 | `// 1 - normal, 2 - auto (single player), 3 - both` | UNTRACEABLE (header comment only, no live bit-2 setter) -> omitted from user doc |
| default 0 | src/sv_main.c:174 | `{"sv_paused", "0", CVAR_ROM}` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Read-only status value reflecting whether server is paused | src/sv_main.c:174 ; src/server.h:725 ; src/sv_user.c:2042 | `cvar_t sv_paused = {"sv_paused", "0", CVAR_ROM};` / `extern cvar_t sv_paused; // 1 - normal, 2 - auto (single player), 3 - both` / `Cvar_SetROM (&sv_paused, va("%i", sv.paused));` | MATCH (CVAR_ROM mirror of internal sv.paused) |
| 2 | Shows 0 when running; non-zero while paused (1 = paused) [polarity/threshold] | src/sv_init.c:303 ; src/sv_user.c:2040-2042 | `Cvar_SetROM(&sv_paused, "0");` (init/running) / `sv.paused ^= bit;` then `Cvar_SetROM (&sv_paused, va("%i", sv.paused));` | MATCH (bit always 1 across all 4 SV_TogglePause callers => value is exactly 0 or 1 in this build; "1 = paused" correct) |
| 3 | Cannot be set directly to pause/unpause (read-only enforcement) | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM)` / `return;` | MATCH (Cvar_Set no-ops on a console write to a CVAR_ROM var) |
| 4 | Engine updates it automatically when a pause is toggled (side-effect) | src/sv_user.c:2040-2042 ; src/cvar.c:168-178 | `sv.paused ^= bit;` / `Cvar_SetROM (&sv_paused, va("%i", sv.paused));` ; Cvar_SetROM temporarily clears CVAR_ROM (`var->flags &= ~CVAR_ROM; Cvar_Set(...); var->flags = saved_flags;`) | MATCH (engine bypasses ROM via Cvar_SetROM on each toggle) |
| 5 | Use `pausable` to control whether pausing is permitted (cross-ref) | src/sv_user.c:2078-2082 ; src/sv_user.c:3314 ; src/sv_main.c:138 | `if (!(int)pausable.value)` / `SV_ClientPrintf(... "Pause not allowed.\n"); return;` ; `{"pause", Cmd_Pause_f, true}` ; `cvar_t pausable = {"pausable", "0"};` | MATCH (pausable gates the `pause` command; real separate knob) |
| 6 | Default: 0 | src/sv_main.c:174 ; src/cvar.c:267-269 | `{"sv_paused", "0", CVAR_ROM}` ; Cvar_Register applies registered string via `Cvar_SetROM (variable, value)` | MATCH (registered default, not a cfg value) |
| 7 | Set by: engine (read-only) | src/cvar.h:63 ; src/sv_main.c:174 ; src/sv_user.c:2042 | `#define CVAR_ROM (1<<1) // read only` ; registration with CVAR_ROM ; sole writer is engine via Cvar_SetROM | MATCH |

**V-pass notes:** TRACED-CLEAN. sv_paused is a CVAR_ROM read-only mirror of the engine-internal integer sv.paused. Every material clause traced to its enforcing line incl. callee-follow:

- Read-only / "cannot be set directly": Cvar_Set early-returns on CVAR_ROM (cvar.c:134-135). The engine writes it only through Cvar_SetROM, which temporarily clears the flag (cvar.c:175-178). Both halves of the description's read-only-but-engine-updates claim are enforced.
- Side-effect / polarity: the ONLY writer of sv.paused (other than the sv.paused=false reset at sv_init.c:302) is SV_TogglePause (sv_user.c:2034), `sv.paused ^= bit`, immediately mirrored to sv_paused (sv_user.c:2042). I verified ALL four SV_TogglePause callers (sv_user.c:892 reconnect-unpause, sv_user.c:2104 Cmd_Pause_f, pr2_cmds.c:2450 + pr_cmds.c:2626 QC PF_setpause, sv_main.c:3127 auto-unpause-when-empty, sv_save.c:261 loadgame) -- every one passes bit=1. There is NO write-site anywhere that sets bit 2. So in THIS build sv.paused (and thus sv_paused) only ever holds 0 or 1. The description's "non-zero ... (1 = paused)" is exactly right and does not over-claim.
- Default 0: registered default `{"sv_paused","0",CVAR_ROM}` (sv_main.c:174), applied via Cvar_Register -> Cvar_SetROM (cvar.c:269). WI-2 satisfied (registered, not shipped-cfg).
- pausable cross-ref: real, separately-registered cvar (sv_main.c:138, default "0") that gates the `pause` command in Cmd_Pause_f (sv_user.c:2078-2082, "Pause not allowed."). The pause command -> Cmd_Pause_f mapping confirmed at sv_user.c:3314. The cross-reference is accurate.

This is the chunk's read-only/settability canary; the description does NOT invert settability (it correctly states the user cannot set it and the engine does). No flavour-C clause found.

## flags_for_review

- [fyi/runtime-dead-suspect/synthesis] src/server.h:725 declares sv_paused bit 2 as 'auto (single player)' and value 3 as 'both', but no live caller in the dedicated-server build passes bit=2 to SV_TogglePause (all callers pass bit=1: sv_user.c:892,2104; sv_save.c:261; pr_cmds.c:2626; sv_main.c:3127; pr2_cmds.c:2450) and consumers only test `& 1`. Bit 2 appears to be a dormant/NQ-single-player vestige in this build path; I omitted it from the user-facing value list and hedged it in reasoning rather than assert a value with no enforcing setter.
- [fyi/cross-mod-override/synthesis] KTX reads sv_paused as a cross-mod gameplay signal: it gates flood-protection / say timers on it (ktx src/g_cmd.c:230,238), position-save commands (ktx src/commands.c:6406 Pos_Disallowed, :8740 `(int)cvar("sv_paused") & 1`), and client logic (ktx src/client.c:945). KTX consumes bit 1, consistent with the engine semantics; KTX does NOT write sv_paused. This is a cross-mod READ relationship (engine owns the value, mod observes it) worth a See also: L3 note linking the pause mirror to KTX's paused-state behavior; not an override.
- [fyi/hidden-family/vpass] server.h:725 carries a stale Quake-heritage bitfield comment on sv_paused: `// 1 - normal, 2 - auto (single player), 3 - both`. In MVDSV bit 2 (auto / single-player pause) is unreachable: no write-site anywhere sets it -- the sole mutator SV_TogglePause is invoked with bit=1 by all six call sites (sv_user.c:892, sv_user.c:2104, pr2_cmds.c:2450, pr_cmds.c:2626, sv_main.c:3127, sv_save.c:261). So sv.paused/sv_paused only ever holds 0 or 1 in this build. The comment describes engine states that cannot occur here. The proposed description correctly says '1 = paused' and is NOT wrong; flagging only so the bitfield comment is not mistaken for live behavior in any future synthesis of related knobs.
- [fyi/other/vpass] Source-comment-is-a-hypothesis confirmation: the server.h:725 declaration-block comment lists bitfield values 2 and 3 with zero live consumers/producers in MVDSV. Consistent with the codebase's known Quake-single-player heritage being carried as dead comments. No action needed for sv_paused; noted as a reusable signal that paused-state comments in this tree predate the QW server-only reality.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_paused",
  "type": "cvar",
  "description": "Read-only status value that reflects whether the server is currently paused. It shows 0 when the game is running and a non-zero value while play is paused (1 = paused). This setting cannot be changed directly to pause or unpause the game; the engine updates it automatically when a pause is toggled. To control whether pausing is permitted at all, use pausable.\n\nDefault: 0.\nSet by: engine (read-only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:2042. Read-only mirror, NOT a settable toggle. Registered CVAR_ROM at src/sv_main.c:174 (`cvar_t sv_paused = {\"sv_paused\", \"0\", CVAR_ROM}`). The engine WRITES it via Cvar_SetROM at src/sv_user.c:2042 (`Cvar_SetROM (&sv_paused, va(\"%i\", sv.paused))`) inside SV_TogglePause, mirroring the internal `sv.paused` state (`sv.paused ^= bit` at src/sv_user.c:2040); reset to \"0\" at src/sv_init.c:303 on server spawn (`Cvar_SetROM(&sv_paused, \"0\")`). CVAR_ROM means an admin set has no effect (cannot pause by setting it) -- the polarity/'cannot set' clause traces to the CVAR_ROM flag at registration + the engine-only Cvar_SetROM writers. The '1 = paused' clause: every live SV_TogglePause caller passes bit=1 (src/sv_user.c:892,2104; src/sv_save.c:261; src/pr_cmds.c:2626; src/sv_main.c:3127; src/pr2_cmds.c:2450) and consumers check bit 1 (`sv.paused & 1` at src/sv_main.c:3116, src/sv_user.c:891, src/pr_cmds.c:2625, src/pr2_cmds.c:2449). The header comment at src/server.h:725 ('1 - normal, 2 - auto (single player), 3 - both') claims a bit 2 (auto/single-player pause) but NO live setter passes bit 2 in this dedicated-server build path -- so bit 2 is intentionally omitted from the user-facing value list (hedged out, not asserted). 'use pausable' clause is a See-also pointer to the actual permission knob, action-changing for an admin who wants to enable pausing. Default 0 from registration literal.",
  "description_proposed": null
}
```
