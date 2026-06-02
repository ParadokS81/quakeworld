# describe-fill-synthesis ledger -- mvdsv `pausable`

- **project:** mvdsv
- **knob:** `pausable` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:pausable: synthesized -- engine pause gate, 0=not allowed; KTX shadows the pause command and re-reads same cvar with admin/player bypass -- origin=synthesized ref=src/sv_user.c:2078 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Controls whether players are allowed to pause the game with the pause command.
>
> 0 = pausing is not allowed.
> non-zero = players may pause.
>
> Default: 0 (pausing disabled).
> Set by: server config.
> See also: ktx-pause-controls.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| 0 = pausing not allowed (polarity) | src/sv_user.c:2078 | `if (!(int)pausable.value) { ..."Pause not allowed."...; return; }` | MATCH |
| gates the pause command | src/sv_user.c:3314 | `{"pause", Cmd_Pause_f, true}` (handler at :2071) | MATCH |
| non-zero = pause may proceed | src/sv_user.c:2078-2099 | falls through past the `!pausable.value` return to the actual pause toggle | MATCH |
| Default 0 | src/sv_main.c:138 | `pausable = {"pausable", "0"}` | MATCH |
| KTX overrides pause command + re-reads cvar same polarity | ktx commands.c:1002 ; ktx commands.c:8793 | `{ "pause", TogglePause, ... }` ; `if (!cvar("pausable") && !is_adm(self) && !PlayerCanPause(self))` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Controls whether players are allowed to pause the game with the pause command" (scope: actor=players, gate on the `pause` command) | src/sv_user.c:2078 (gate) + src/sv_user.c:3314 (cmd->handler) + src/sv_user.c:2084 (spectator exclusion) | `if (!(int)pausable.value)` / `{"pause", Cmd_Pause_f, true}` / `if (sv_client->spectator){ ... "Spectators can not pause.\n"); return; }` | MATCH — `pausable` is read ONLY inside `Cmd_Pause_f`, the handler bound to the user `pause` command. Spectators are excluded by a separate gate, so "players" (non-spectators) is the correct actor word; the description does NOT overclaim spectators. |
| 2 | "0 = pausing is not allowed" (OFF-state polarity) | src/sv_user.c:2078-2081 | `if (!(int)pausable.value){ SV_ClientPrintf (sv_client, PRINT_HIGH, "Pause not allowed.\n"); return; }` | MATCH — when `(int)value==0` the handler prints "Pause not allowed." and returns. OFF-state taken directly from the enforcing branch, not inferred. |
| 3 | "non-zero = players may pause" (ON-state threshold) | src/sv_user.c:2078 (fall-through) + 2084/2090 follow-on gates | `if (!(int)pausable.value)` (blocks only when int-zero; otherwise falls through to spectator check and optional `GE_ShouldPause` QC veto) | MATCH for all integer values and standard usage. FYI: gate is `(int)pausable.value`, so a fractional like 0.5 is float-"non-zero" but truncates to int 0 and is BLOCKED. Edge case only; "0 vs non-zero" is accurate in practice. |
| 4 | "Default: 0" | src/sv_main.c:138 + src/sv_main.c:3560 | `cvar_t pausable = {"pausable", "0"};` / `Cvar_Register (&pausable);` | MATCH — registered default string is "0". cvar_t layout {name, string, flags,...} confirmed in src/cvar.h:66-75; flags field defaults to 0. |
| 5 | "Set by: server config" (scope) | src/sv_main.c:138 | `cvar_t pausable = {"pausable", "0"};` (flags=0: no CVAR_ROM, no serverinfo, no OnChange) | MATCH — plain settable server cvar; no read-only/serverinfo flags; settable via config/rcon. No .cfg/.qc override anywhere in repo. |
| 6 | "See also: ktx-pause-controls" | n/a | n/a | UNTRACEABLE (out-of-scope: cross-ref pointer to an L3 concept note, not a source-behavior claim). |

**V-pass notes:** Oracle confirmed 1.11-53-g18d0362. Exhaustive grep of /src: `pausable` appears at exactly 4 sites — registration (sv_main.c:138 init, sv_main.c:3560 Cvar_Register), extern decl (sv_user.c:89), and ONE read/enforcing site (sv_user.c:2078). No other reader, no write-site beyond registration, no .cfg/.qc override in the tree.

Enforcing line is sv_user.c:2078 `if (!(int)pausable.value)` inside Cmd_Pause_f — the handler mapped to the client `pause` command (sv_user.c:3314 `{"pause", Cmd_Pause_f, true}`). The third ucmd_t field is `overrideable` (cvar.h-adjacent typedef sv_user.c:3290-3296), NOT an access-class flag — it lets the mod's QC SV_ExecutePRCommand handle `pause` first; the built-in only runs as fallback. This does not affect any description clause.

All six clauses verify. Polarity and OFF-state are read straight from the enforcing branch (not name/comment inference), so no flavour-C. Default "0" matches the registered string. The actor word "players" is correct: a separate spectator gate (sv_user.c:2084) blocks spectators even when pausable!=0, and the description does not claim otherwise. The description correctly scopes pausable to "controls whether" rather than "guarantees" — necessary-not-sufficient (spectator gate + optional GE_ShouldPause QC veto at 2090-2096 also apply), which is the right framing for this cvar's single gate.

Result: TRACED-CLEAN. No edit needed.

## flags_for_review

- [fyi/cross-mod-override/synthesis] pausable is read by BOTH the mvdsv engine pause handler (sv_user.c:2078) and KTX's own 'pause' command TogglePause (ktx commands.c:1002 registration, cvar read at ktx commands.c:8793), which shadows the engine command when KTX is loaded. Same cvar, same polarity (0=blocked), but KTX adds admin/PlayerCanPause bypass and match-state gating. The L1 prose documents the engine gate; the KTX bypass is routed to See also: L3 per D20 cross-engine policy.
- [fyi/other/vpass] The pausable gate at sv_user.c:2078 is `if (!(int)pausable.value)` — an (int) truncating cast. A fractional non-zero value (e.g. pausable 0.5) is float-non-zero but truncates to int 0 and is BLOCKED. The description's '0 = not allowed / non-zero = may pause' is accurate for every integer value and all standard usage; this is an extreme edge case, not a description defect. FYI only.
- [fyi/other/vpass] pausable != 0 is necessary but not sufficient to pause. After the pausable gate, Cmd_Pause_f also enforces a spectator exclusion (sv_user.c:2084 'Spectators can not pause.') and an optional mod-defined veto via GE_ShouldPause (sv_user.c:2090-2096, 'progs said ignore the request'). The proposed description correctly frames pausable as 'controls whether ... allowed' rather than guaranteeing a pause, and the See-also (ktx-pause-controls) is the right place to document the mod-side veto. No change needed; noted so a reviewer knows the cvar is one gate of three.
- [fyi/off-scope-entity/vpass] Internal/QC pause paths bypass pausable entirely: SV_TogglePause is called unconditionally from save-restore (sv_save.c:261), no-players-left auto-release (sv_main.c:3127), and the QC setpause builtin #531 (pr_cmds.c:2626 / pr2_cmds.c:2450). These are not 'the pause command' (the client-issued user command), so the description's scope ('the pause command') remains correct — flagging only to confirm the scope boundary was checked, not crossed.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "pausable",
  "type": "cvar",
  "description": "Controls whether players are allowed to pause the game with the pause command.\n\n0 = pausing is not allowed.\nnon-zero = players may pause.\n\nDefault: 0 (pausing disabled).\nSet by: server config.\nSee also: ktx-pause-controls.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:2078. Engine-enforced pause gate. Registration: src/sv_main.c:138 `pausable = {\"pausable\", \"0\"}` -> default 0 (WI-2: bare initializer, no flags). Enforcing read: src/sv_user.c:2078 inside the engine's pause command handler Cmd_Pause_f (registered as the client command \"pause\" at src/sv_user.c:3314 `{\"pause\", Cmd_Pause_f, true}`): `if (!(int)pausable.value) { SV_ClientPrintf(sv_client, PRINT_HIGH, \"Pause not allowed.\\n\"); return; }`. So value 0 -> request rejected with \"Pause not allowed\"; non-zero -> pause proceeds (subject to a further spectator check at src/sv_user.c:2084 and an optional QC GE_ShouldPause veto at :2090). Polarity confirmed: the gate is `!pausable.value`, i.e. falsey = blocked. CROSS-MOD OVERRIDE (F-MV1): under KTX the live `pause` command is KTX's own TogglePause (ktx commands.c:1002 registers `{\"pause\", TogglePause, ...}`, handler ktx commands.c:8726), which shadows the engine handler; KTX re-reads the SAME cvar with the SAME polarity at ktx commands.c:8793 `if (!cvar(\"pausable\") && !is_adm(self) && !PlayerCanPause(self)) { G_sprint(...\"Pause is not allowed\"...); return; }` -- so under KTX, admins and (PlayerCanPause-eligible) players can bypass a pausable=0 setting, plus KTX adds match-state / pause-count gating. That mod-specific bypass detail is routed to See also: L3, not the L1 prose.",
  "description_proposed": null
}
```
