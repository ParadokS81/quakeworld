# ktx-l1-rewrite drafts -- batch 2026-05-27

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill. Apply-pass-author
reviews each card, applies clean drafts, hand-edits flagged-drafts after
verifying the surfaced contradiction. Drafts do NOT auto-apply to L1
(`entities.description`); the apply pass is a separate phase.

---

## k_sready (KTX cvar, Match flow -- Shape 3)

- **Status**: drafted
- **Source**: src/client.c:4266 (read use-site inside `CheckLightEffects`); src/world.c:881 (registration)
- **Catalog line**: Match flow category
- **Anchor**: 1.47-2-g67253dc

### Current description

> Causes players who have not yet typed 'ready' to glow during the prewar phase, making unready players visually distinct.
>
> 0 = no glow on unready players.
> 1 = unready players glow during prewar (not in race mode).
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command, set-once in server config).

`k_sready` is registered bare in `world.c` with no default argument. No `cvar_toggle_msg`, `cvar_fset`, or `cvar_set` write sites exist anywhere in KTX src. The single read site is in `CheckLightEffects()` (called from `PlayerPostThink`), a non-handler engine function. No command gates on this cvar. Clean Shape 3 match; no additional shape facets apply.

### Proposed draft

```
Causes unready players to emit a blue glow during the prewar phase, making players who have not yet readied up visually distinct.

0 = no glow on unready players.
1 = unready players emit a blue glow during prewar.

Prerequisites: Has no effect in matchless mode (k_matchless) or race mode.

Permission:  server config only
Default:     0

Example:
  # server.cfg
  k_sready 1

See also: k_matchless (matchless mode suppresses this glow), toggleready (player command that sets the ready flag this checks)
```

### Notes

- The existing description says "glow" without specifying the color. Source sets `EF_BLUE` (blue glow), not `EF_BRIGHTLIGHT`. The recast adds "blue" for precision. Not a contradiction -- the existing description is not wrong, just underspecified.
- Added `k_matchless` prerequisite: source condition `!k_matchLess` (the cached C global of cvar `k_matchless` at `world.c:1095`) means the glow silently does nothing in matchless mode. Not mentioned in the existing description; this is a user-surprise omission corrected in the recast. Parent terminal corrected the drafted See-also and Prerequisites lines from `k_matchLess` (C global) to `k_matchless` (the cvar entity name) before persisting.
- `toggleready` in See-also: it's the player command that sets `self->ready`, which is the flag `k_sready` checks. Cross-link helps users understand the relationship between the server knob and the player action.
- No paired toggle command exists for `k_sready`. `ToggleReady` (commands.c:7966) modifies `self->ready` (a runtime field), not the `k_sready` cvar -- confirmed independent.
