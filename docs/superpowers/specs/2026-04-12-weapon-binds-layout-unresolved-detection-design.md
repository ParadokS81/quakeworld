# Per-Key Weapon Bind Layout + Unresolved Bind Detection

**Date:** 2026-04-12
**Status:** Draft
**Scope:** `apps/slipgate-app/src/components/ConfigDomainBinds.tsx`, `apps/slipgate-app/src/components/configMerger.ts`, `apps/slipgate-app/src/components/ConfigBindsSection.tsx`

## Problem

### Weapon binds layout

The weapon binds section groups all keys for a weapon into a single row (e.g. RL shows 7 keycaps in one line). Expanding shows ALL alias chains dumped sequentially. For messy configs with many binds per weapon, this is unreadable.

### Unresolved binds

When a bind references an alias or command that does not exist in the config chain (user aliases) or the engine (built-in commands and cvars), the bind is effectively broken. Currently these fall into the "misc" category with no indication they are non-functional.

## Design

### Feature 1: Per-key weapon bind rows

**Current:** One row per weapon, all keys grouped.

**New:** One row per key-weapon combination. RL bound to 4 keys = 4 separate rows, each individually expandable.

#### Row structure

Each row shows:
- Weapon color badge + short name (e.g. `[RL]`)
- Weapon full name (e.g. `Rocket Launcher`)
- Keycap with method label (e.g. `[Ctrl] quickfire`)

Rows are sorted by weapon order (RL, LG, GL, SNG, NG, SSG, SG, AXE), then alphabetically by key within each weapon.

#### Expanding

Clicking a row expands it to show the alias chain for just that one key. This replaces the current behavior where expanding RL dumps all 7 keys' alias chains at once.

The expanded state tracks individual key-weapon pairs (e.g. `"rl:Ctrl"`) instead of just the weapon name.

#### Compare mode

Each row matches on the weapon+key combination. If your config has RL on Ctrl and the comparison config also has RL on Ctrl, they appear side-by-side. Keys that exist only in one config show as "only yours" / "only theirs" with the existing styling.

#### Weapons with no binds

Weapons with no binds (NG, SSG, AXE in most configs) still show a single row with "--" to indicate no bind. This preserves the full weapon inventory view.

### Feature 2: Unresolved bind detection

#### Category

New bind category: `"unresolved"` added alongside `"movement" | "weapons" | "teamsay" | "misc"`.

#### Detection logic

In `categorizeBinds`, after checking weapon/teamsay/movement/rocketjump, before the misc fallback:

1. Extract the first command token from the bind (the word before any arguments)
2. Handle `+` and `-` prefixed commands (strip prefix for lookup, but keep it for display)
3. Check if the token exists in ANY of these sources:
   - User-defined aliases (from the merged config chain)
   - Cvars (from the qw-config database via `loadDatabase()`)
   - Known engine commands (a hardcoded `Set<string>` of built-in ezQuake commands)
4. For compound commands (semicolon-separated), check each part's first token
5. If ANY token is not found in any source, classify as `"unresolved"`

Note: for compound commands where SOME parts resolve and some don't, still classify as unresolved -- the bind is partially broken.

#### Known engine commands set

A `Set<string>` constant in `configMerger.ts` containing ~60-80 built-in ezQuake commands. This includes:

**Movement/action:** `+forward`, `+back`, `+moveleft`, `+moveright`, `+jump`, `+moveup`, `+movedown`, `+attack`, `+speed`, `+strafe`, `+mlook`, `+klook`, `+use`, `+hook`

**Weapon:** `impulse`, `weapon`, `+fire`, `+fire_ar`

**Communication:** `say`, `say_team`, `messagemode`, `messagemode2`, `tp_msgsound`

**Meta/config:** `bind`, `unbind`, `unbindall`, `alias`, `unalias`, `set`, `unset`, `seta`, `exec`, `echo`, `if`, `toggle`, `inc`, `dec`, `reset`, `resetall`

**Client:** `quit`, `disconnect`, `reconnect`, `connect`, `join`, `observe`, `ready`, `break`, `noready`, `toggleconsole`, `clear`, `cmdlist`, `cvarlist`, `apropos`

**Demo/recording:** `record`, `stop`, `playdemo`, `timedemo`, `demo_jump`

**Visual:** `screenshot`, `vid_restart`, `hud_262_load`, `bf`

**Team play:** `tp_msg*` commands (tp_msgsound, tp_msgpoint, etc. -- matched by prefix)

**Misc actions:** `menu_main`, `menu_options`, `menu_keys`, `togglemenu`, `skinselect`, `pause`, `status`, `serverinfo`, `ping`, `notify`

The list does not need to be exhaustive on day one. False positives (valid binds flagged as unresolved) will surface during testing and can be fixed by adding missing commands to the set. False negatives (broken binds not caught) are acceptable -- we catch the obvious cases.

#### UI presentation

**In the Binds view (misc:binds pill area):**
- Unresolved binds appear with yellow warning styling
- Yellow `!` triangle icon instead of the normal expand arrow
- Yellow-tinted keycap border (using existing OKLCH color system)
- Label shows the raw command text (same as misc)

**Expanded explanation:**
When the user expands an unresolved bind, show an explanation line above the command:
> "Command `{token}` was not found as an alias in the config chain or as a known engine command. This bind will likely not work during gameplay."

**Binds pill count:** The Binds pill in the sidebar could optionally show an unresolved count badge (e.g. `Binds (3!)`) but this is a nice-to-have, not required for the initial implementation.

### Types changes

The `EnrichedBind` interface in `configMerger.ts` needs `"unresolved"` added to the category union type:

```typescript
category: "movement" | "weapons" | "teamsay" | "unresolved" | "misc";
```

Same for `compareCategory`.

## Scope boundaries

**In scope:**
- `ConfigDomainBinds.tsx`: Restructure `ConfigWeaponBindsSection` from per-weapon grouping to per-key rows
- `configMerger.ts`: Add `"unresolved"` category, known engine commands set, detection logic in `categorizeBinds`, update `EnrichedBind` type
- `ConfigBindsSection.tsx`: Yellow warning styling for unresolved binds in the all-binds view

**Out of scope:**
- Teamsay binds layout (stays as-is)
- Rust-side changes (detection is TS-only, uses existing data)
- Profile view keyboard layout (separate concern)
- Exhaustive engine command list (start with common ones, expand as needed)

## Testing

Manual verification:

1. Load a config with multiple binds per weapon (HangTime's config) -- verify each key gets its own row
2. Verify weapon order is preserved (RL first, AXE last)
3. Verify expanding a row shows only that key's alias chain
4. Verify compare mode works with per-key rows
5. Create a test bind to a nonexistent alias -- verify it shows as unresolved with yellow styling
6. Verify built-in commands (+attack, toggleconsole, etc.) are NOT flagged as unresolved
7. Verify normal aliases from the config chain are NOT flagged as unresolved
