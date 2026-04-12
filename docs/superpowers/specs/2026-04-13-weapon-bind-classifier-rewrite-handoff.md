# Weapon Bind Classifier Rewrite — Handoff

**Date:** 2026-04-13
**Status:** Handoff for fresh session
**Scope:** `apps/slipgate-app/src-tauri/src/commands/ezquake.rs` — `analyze_weapon_binds` function

## Why this handoff exists

Previous session (2026-04-12 / 2026-04-13) made significant progress on the config viewer but ran long. The weapon bind classifier has correctness issues that emerged during testing with HangTime's config. Some were fixed (rocket jump classification, Mouse1 filter heuristic). The deeper question — "what is a weapon bind, really?" — needs focused investigation in a fresh session.

## Current classifier state

**File:** `apps/slipgate-app/src-tauri/src/commands/ezquake.rs`, function `analyze_weapon_binds` (around line 916).

**Three classification paths in the function:**

1. **Priority 1 — Rebind path.** If the bind's resolved command contains `bind KEY X` statements, walk each rebind, find the weapon number in the rebind target, classify the bind as manual (or quickfire if the outer command has `+attack`). Used for "oldschool" weapon scripts like `alias +rock "bind mouse1 +rock_shoot;..."`.
2. **Priority 2 — Direct weapon select.** If the resolved command contains `impulse N` or `weapon N ...`:
   - If `+attack` also present → quickfire for weapon N
   - Else if the command rebinds mouse1 → manual with fire_key = Mouse1
   - Else → assumption-based manual with fire_key = Mouse1 (this is the weak branch)
3. **Fallback — Default number keys.** If no custom weapon binds found, include number key binds (1-8) as manual.

**Filter at the end:** `mouse1_is_contested` check (fixed in this session — see "Recent fixes" below).

**Rocket jump filter:** Earlier in this session we added a filter: any bind whose resolved command contains BOTH `+attack` AND `+jump` gets excluded from weapon binds (it's a rocket jump, which is movement, not offense). Applied in all three paths (direct, rebind, rebind-fallback).

## Recent fixes (in scope of this handoff's commits)

1. **Rocket jump exclusion** (`3a18e9a`): +attack && +jump → skip as weapon bind
2. **moveup/movedown movement classification** (`b4abea4`): extended MovementKeys + rocket jump handling in TS `categorizeBinds`
3. **Mouse1 filter heuristic rewrite** (this commit): replaced assumption-counting with actual-rebind-counting. Old heuristic counted any WeaponBind with `fire_key == Some("Mouse1")`, including Priority 2 assumption-based entries. New heuristic counts only keys whose resolved command literally contains `bind mouse1 X`. Restores `MOUSE1 → +rocket` as RL quickfire for HangTime-style configs.

## Known issues remaining

### 1. Priority 2 "assumption-based manual" is not causal

The classifier assigns `fire_key = Some("Mouse1")` to any manual-select bind (`bind X "impulse 7"`) as an assumption that "the user probably fires with Mouse1." This isn't always true:

- **HangTime's config**: `bind MOUSE1 "+rocket"` is a weapon-specific quickfire for RL. Pressing KP_UPARROW (which selects LG via `impulse 8;__kill_me`) does NOT result in LG being fired when Mouse1 is pressed afterwards — Mouse1's `+rocket` re-selects RL. So KP_UPARROW is NOT a functional manual LG bind, but the classifier shows it as one.
- **HangTime's KP_HOME**: `impulse 7;__kill_me` technically selects RL before running a teamsay chain. If the user then presses Mouse1, RL fires (by coincidence — `+rocket` also selects RL first). Whether this counts as a "manual RL bind" is debatable:
  - **Strict causal view**: KP_HOME doesn't CAUSE Mouse1 to fire RL. It's coincidence that both select the same weapon. Not a weapon bind — it's teamsay prep.
  - **Functional view**: Pressing KP_HOME then Mouse1 does fire RL. Therefore it's a functional manual RL bind, even if incidental.

### 2. Weapon preselect system (NEW ezQuake feature)

The user mentioned a new weapon preselect system in ezQuake that they don't fully understand. Our classifier doesn't account for it. This is a gap that needs source investigation before any rewrite:

**Research task**: In `research/repos/ezquake-source/src/`, grep for:
- `preselect`
- `weapon_preselect` or similar
- `cl_weapon_` cvars
- Recent commits touching weapon scripts

Understand how preselect changes the firing model, what config syntax it uses, and how to recognize it in a parsed config.

### 3. The user's mental model (from 2026-04-13 session)

Paraphrased from the final conversation:

> If I load another player's config with no idea what their setup is, I'd go weapon by weapon (axe → LG) and ask: "how do I fire this weapon?" I'd try Mouse1 first — does it shoot something? If yes, primary quickfire identified. Then I'd ask: "how about another weapon? Do I need to press a button first?" That's the manual-select case. A weapon can have BOTH a quickfire and a manual path — note both. If the same weapon is bound in multiple ways, show all.

Key implications:
- Start from the fire keys, not from weapon selects. Find what actually fires.
- For each weapon, determine if there's a direct quickfire path AND/OR a manual select path.
- A manual select must have a causal link to firing — not just "Mouse1 happens to fire this weapon regardless."
- The user wants to see the COMPLETE picture per weapon, including multiple ways to fire the same weapon.

### 4. Mouse1 isn't always the fire key

Some players bind `+attack` to other keys. The classifier hardcodes Mouse1 as the assumed fire key. A proper rewrite should detect all fire keys (any key bound to something containing top-level `+attack`).

## Recommended approach for fresh session

### Phase 1: Research (don't code yet)

1. **Read the current classifier** end-to-end. Understand what each branch does.
2. **Research weapon preselect** in ezQuake source. Document how it works.
3. **Collect test configs**:
   - HangTime's config: `apps/slipgate-app/assets/teamsays/hangtime.cfg`
   - User's own config (get from user — has oldschool hybrid pattern)
   - A simple vanilla config (generic Mouse1 = +attack, impulse N on number keys)
   - A weapon preselect config (if any exists in `research/assets/`)
4. **Manually classify each test config** by hand, using the user's mental model. Write down expected output.

### Phase 2: Design the new classifier

Reverse the current approach. Instead of iterating binds and asking "does this bind fire a weapon?", iterate weapons and ask "what keys fire this weapon?"

Pseudocode:

```
for each weapon W in [axe, sg, ssg, ng, sng, gl, rl, lg]:
    fire_paths[W] = []
    for each bind (key, cmd):
        resolved = resolve(cmd)
        # Does pressing this key fire W in one press?
        if contains(resolved, "+attack") and extract_first_weapon(resolved) == W:
            fire_paths[W].append(Quickfire(key))
        # Does pressing this key rebind a fire key to fire W?
        for rebind (target, target_cmd) in extract_rebinds(resolved):
            target_resolved = resolve(target_cmd)
            if contains(target_resolved, "+attack") and extract_first_weapon(target_resolved) == W:
                fire_paths[W].append(ManualRebind(key, fires_via=target))
        # Is this a select-only bind for W? Valid only if a fire key exists that fires whatever-is-selected.
        if extract_first_weapon(resolved) == W and not contains(resolved, "+attack"):
            for fire_key in find_generic_fire_keys(bindings):  # keys bound to plain +attack
                fire_paths[W].append(Manual(key, fires_via=fire_key))
```

Notes on the pseudocode:
- `extract_first_weapon` returns the first weapon in a `weapon N1 N2 ...` chain or the single weapon in `impulse N`. Fallbacks don't count.
- `find_generic_fire_keys` finds all keys whose resolved command is exactly `+attack` (or similar generic fire) without a weapon select. These are the keys that fire "whatever is currently selected."
- If there are NO generic fire keys, select-only binds don't count as weapon binds (nothing would fire them).
- A specific quickfire like `Mouse1 = +rocket` is NOT a generic fire key. It always fires RL regardless of what's selected.

### Phase 3: Implement

Rewrite `analyze_weapon_binds` with the new model. Keep the WeaponBind struct shape compatible (so UI doesn't need to change). Keep the rocket jump filter.

Add handling for weapon preselect if research shows it's common enough to matter.

### Phase 4: Verify

Run the new classifier against test configs. Compare output to hand-classified expected output. Iterate.

## Files to know about

- **Classifier (Rust)**: `apps/slipgate-app/src-tauri/src/commands/ezquake.rs` — `analyze_weapon_binds`, `extract_weapon_number`, `has_attack`, `has_jump`, `extract_rebinds`, `resolve_command`, `impulse_to_weapon`
- **TypeScript bind display**: `apps/slipgate-app/src/components/ConfigDomainBinds.tsx` — `ConfigWeaponBindsSection`
- **TypeScript bind enrichment**: `apps/slipgate-app/src/components/configMerger.ts` — `categorizeBinds`
- **Test config**: `apps/slipgate-app/assets/teamsays/hangtime.cfg`
- **ezQuake source**: `research/repos/ezquake-source/src/` — `cl_cmd.c`, `cl_parse.c`, `cl_input.c` likely contain weapon command handling

## Testing approach

There are no automated tests for `analyze_weapon_binds`. Rust's `cargo test` on the tauri crate is set up but there's no weapon-bind test suite. Adding a test module with a few known-good classifications would be worthwhile during the rewrite:

```rust
#[cfg(test)]
mod weapon_bind_tests {
    #[test]
    fn hangtime_config_classifies_mouse1_as_rl_quickfire() {
        let content = include_str!("../../../assets/teamsays/hangtime.cfg");
        let parsed = parse_config(content);
        let binds = analyze_weapon_binds(&parsed.bindings, &parsed.aliases);
        let rl_binds: Vec<_> = binds.iter().filter(|wb| wb.weapon == "rl").collect();
        assert!(rl_binds.iter().any(|wb| wb.key == "Mouse1" && wb.method == "quickfire"));
    }
}
```

A handful of tests covering the known cases (HangTime's +rocket, oldschool hybrid, vanilla number keys, rocket jumps, weapon preselect if applicable) would catch regressions.

## Relevant memory entries

- `project_slipgate_bind_parser.md` — earlier notes on bind parsing
- `project_config_viewer_next.md` — config viewer status
- `project_helper_panel_vision.md` — long-term UX vision that ties into cross-source documentation (ezquake + ktx collaboration)

## Session notes

This session spanned many features (Commands category extraction, bind detection rewrites, Rust parser updates, UI refactors). Context is long. Start the fresh session with a clean slate; read this handoff and the relevant code, but don't try to load the full history of the previous session. The handoff captures what matters.
