# Weapon Bind Classifier v2 - Design

**Date:** 2026-04-13
**Status:** Design approved, ready for implementation plan
**Supersedes:** `2026-04-13-weapon-bind-classifier-rewrite-handoff.md` (the problem statement and research notes that triggered this redesign)
**Scope:** Rewrite `analyze_weapon_binds` in `apps/slipgate-app/src-tauri/src/commands/ezquake.rs`; create a new QW domain knowledge doc at `packages/qw-knowledge/weapon-scripts/`.

## Background

The current weapon bind classifier in slipgate-app emits `quickfire` or `manual` tags per weapon bind. It was designed against the author's own config (a hybrid of explicit `+attack` scripts and one rebind-chain pattern) and does not generalize. Known problems surfaced during HangTime config testing:

- It assumes Mouse1 is always a generic `+attack` fire key. When Mouse1 is rebound to a weapon-specific quickfire like `+rocket`, the classifier incorrectly treats unrelated weapon selects as having a manual Mouse1 fire path.
- It does not distinguish manual-select (one-shot rebind) from manual-hold (temporary rebind via `+alias`/`-alias`) - they feel different to the player and one is a conversation item.
- It has no principled handling of the ezQuake `cl_weaponpreselect` method.
- Kill-me teamsay binds slip through or are handled with ad-hoc heuristics.
- It cannot express multiple firing paths per weapon (the ParadokS C-SSG case: quickfire on press, manual-select continues after release).

The v2 classifier is built around a causal-chain model: for each resolved bind, trace what firing paths actually exist, emit them as a flat list, and filter out non-combat patterns (rocket jumps, kill-me sequences, pack-drop scans).

## Goals

1. Correctly classify every functional firing path in an arbitrary ezQuake config.
2. Express each path as `{weapon, method, flavor, trigger_key, fire_key, source, mechanism}` so the UI can render the full "how do I fire this weapon?" conversation per weapon.
3. Reject non-combat patterns (rocket jumps, kill-me, pack-drop) cleanly.
4. Handle HangTime-style configs where Mouse1 is a weapon-specific quickfire and generic fire keys may be absent or bound elsewhere.
5. Capture the underlying QW weapon-script domain knowledge in a shared `packages/qw-knowledge/weapon-scripts/` folder so future sessions (and other apps) don't re-derive it.

## Non-goals

- High-level "setup style" metadata (preselect-style vs explicit-script vs rebind-chain vs default). Deferred; not needed for the flat-list output.
- Changing the `classify_chain_binds` Tauri command signature. The command keeps its name and entry points; only the internal data model and algorithm change.
- Rewriting the frontend weapon display component. Extensions to `WeaponBindViz.tsx` are required to render the new fields but are not architectural changes.

## Data model

```rust
pub struct FiringPath {
    pub weapon: Weapon,                 // Axe, SG, SSG, NG, SNG, GL, RL, LG
    pub method: Method,                 // Quickfire | Manual
    pub flavor: Option<ManualFlavor>,   // Select | Hold; None when Quickfire
    pub trigger_key: String,            // first key the player presses ("C", "Shift", "7")
    pub fire_key: Option<String>,       // second key for Manual ("Mouse1"); None for Quickfire
    pub source: PathSource,             // Explicit | EngineDefault
    pub mechanism: Mechanism,           // see enum below
    pub origin_alias_chain: Vec<String>,// e.g. ["C", "+boom", "weapon 2;+attack;bind mouse1 +boom"]
}

pub enum Method { Quickfire, Manual }

pub enum ManualFlavor {
    Select, // one-shot persistent rebind; press key1, release, press key2 any time later
    Hold,   // temporary rebind via +alias/-alias; only valid while key1 is held
}

pub enum PathSource {
    Explicit,      // player-authored bind
    EngineDefault, // 1-8 -> impulse 1-8 fallback; UI may dim these
}

pub enum Mechanism {
    PlusFire,           // +fire N ...
    PlusFireAr,         // +fire_ar N ...
    WeaponAttack,       // weapon N ...;+attack (or +attack;weapon N ...)
    ImpulseAttack,      // impulse N;+attack
    PreselectWeapon,    // weapon N ... with cl_weaponpreselect >= 1, no inline fire
    PreselectImpulse,   // impulse N with cl_weaponpreselect >= 1 (not actually supported by engine but detected for flagging)
    RebindFireKey,      // trigger key rebinds Mouse1 (or another fire key) to a weapon fire
    HoldModifierRebind, // +alias / -alias pair that temporarily rebinds the fire key
    GenericFireKey,     // used in Quickfire entries where a fire key is bound directly to a weapon script (e.g., Mouse1 = +rocket)
}

pub enum Weapon { Axe, SG, SSG, NG, SNG, GL, RL, LG }
```

The classifier returns `Vec<FiringPath>` (flat). UI groups by weapon at render time.

### Field semantics

- **trigger_key**: the key the player physically presses first. For a Quickfire path, this is the only key. For Manual paths, this is the select/hold key.
- **fire_key**: only set when `method == Manual`. Names the second key the player presses (almost always Mouse1, but can be any key bound to `+attack` generically).
- **source**: `EngineDefault` marks the `bind 7 "impulse 7"` fallback paths that exist unless the config explicitly overrides them. UI can dim or collapse these. `Explicit` means the player authored the bind.
- **mechanism**: the underlying technique the script uses. Lets the UI show "you're using `+fire` here but `weapon+attack` there" if we ever want that, and is useful for the knowledge-capture doc.
- **origin_alias_chain**: the full resolved chain from trigger key to underlying command. Used for tooltips, debugging, and regression-test diffs.

## Algorithm

Two-pass, following the causal-chain model from last night's handoff.

### Pass 1: resolve

For every `bind KEY BODY` in the merged config chain (primary `config.cfg` plus any `exec`'d files), resolve `BODY` by following:

- Plain alias references: substitute with alias body
- `+alias` / `-alias` pairs: track press body and release body separately
- `tempalias`: treated identically to `alias`
- Nested `bind KEY BODY` statements inside bodies: these are rebinds, not fires - record them as state changes
- `exec file.cfg` statements: already implemented; keep as-is

Resolution is depth-limited (10 levels, matches current code) to prevent infinite recursion.

Output per key: `ResolvedBinding { press_body, release_body, persistent_rebinds, temporary_rebinds }`, where `persistent_rebinds` is the set of `bind TARGET NEWBODY` pairs issued during press (one-shot, they stick), and `temporary_rebinds` is the set issued by a `+alias` whose matching `-alias` issues the inverse during release.

### Pass 2: identify fire keys

Before extracting paths, classify every key that currently fires something:

- **Generic fire key**: a key whose resolved press body is exactly `+attack` (or `+fire` with no weapon arg), with no weapon selection preceding. These are keys that "fire whatever is currently selected." Example: default `bind mouse1 +attack`.
- **Weapon-specific fire key**: a key whose resolved press body both selects a weapon AND fires (e.g., `bind mouse1 +rocket` where `+rocket = "weapon 7;+attack"`). These are Quickfire paths in their own right AND they disqualify themselves as generic fire keys for other weapons - pressing them always re-selects their own weapon first.

Each key ends up in exactly one of: `{generic_fire_keys, weapon_specific_fire_keys, non_fire_keys}`. The set of generic fire keys drives which select-only binds have a valid manual path.

### Pass 3: extract paths

For each `ResolvedBinding`, emit zero or more `FiringPath` entries:

1. **Quickfire from press body**: if the press body contains both a weapon selection (`impulse N`, `weapon N [N2 ...]`, `+fire N ...`, `+fire_ar N ...`) AND an inline fire command (`+attack`, `+fire`, `+fire_ar`), and does NOT contain `+jump` (rocket jump exclusion), emit a Quickfire path with the appropriate mechanism.
   - Weapon ID is taken from the first weapon in the priority chain (`weapon 7 5 3 2 1` -> RL).
   - If the same bind also persistently rebinds a fire key to a weapon fire, emit an ADDITIONAL Manual-Select path for that secondary weapon (ParadokS C-SSG case).

2. **Manual-Select via persistent rebind**: if the press body persistently rebinds a fire key (Mouse1 or another generic fire key) to a weapon-specific fire command, emit a Manual-Select path: `trigger_key = this key`, `fire_key = the rebound target`, weapon = the weapon the rebound command fires.

3. **Manual-Hold via `+alias`/`-alias` rebind**: if this key is a `+alias` whose press body rebinds a fire key to a weapon-specific fire, AND the matching `-alias` restores the original binding, emit a Manual-Hold path.

4. **Manual-Select via select-only bind + generic fire key**: if the press body selects a weapon but does not fire, and at least one generic fire key exists, emit a Manual-Select path for each `(trigger_key, generic_fire_key)` pair.
   - If no generic fire keys exist (HangTime case: Mouse1 = +rocket, no plain +attack binding), emit nothing. Select-only binds with no reachable generic fire are not functional weapon binds.

5. **Preselect-aware manual**: if `cl_weaponpreselect >= 1` is set in the config AND the press body is a bare `weapon N ...` (no inline fire, no persistent rebind), still emit a Manual-Select path with `mechanism = PreselectWeapon`. The engine queues the selection and fires it on the next generic `+attack` press. Without preselect, the same bind behavior is functionally identical (instant select + next fire key press), so this case is already covered by rule 4 - the difference is only the `mechanism` tag.

6. **Quickfire from standalone fire key binds**: weapon-specific fire keys (from Pass 2) emit Quickfire paths directly. Example: `bind mouse1 +rocket` -> Quickfire path `{weapon: RL, trigger_key: Mouse1, mechanism: GenericFireKey}`.

7. **Engine defaults**: for each number key 1-8 NOT explicitly bound in the merged config, emit a Manual-Select path representing the engine's built-in `bind N "impulse N"` fallback, with `source = EngineDefault`. These use the existing set of generic fire keys; if none exist, they are omitted. An explicit `bind 7 "impulse 7"` written by the player is classified as `Explicit` via rule 4, not `EngineDefault` - the `EngineDefault` tag is reserved for paths that exist only because the engine provides them.

### Pass 4: apply exclusion rules

For each emitted `FiringPath`, check the origin bind (via `origin_alias_chain`) against the exclusion rules. Drop the path if any rule fires.

**RJ - Rocket jump:** resolved chain contains both `+attack` (or `+fire`/`+fire_ar`) and `+jump`. This is movement, not combat. Emit nothing for this bind at all.

**E1 - Kill-me name convention:** any alias name in the chain matches the regex `/(^|_)_*kill_?me(_|$)/i`. Covers `__kill_me`, `_killme`, `__kill_me_rl_check`, `.msg.kill.me.rl`, etc. Drop.

**E2 - Kill-me literal text:** the chain contains a `say_team` (or `say`) command whose message text contains the substring "kill me" (case insensitive, after stripping QW color codes like `{&cb1a...&cfff}`). Drop.

**E3 - Announce-without-fire:** the chain contains weapon selection AND reaches a `say_team`/`say` AND has no fire path (no `+attack`/`+fire`/`+fire_ar` and no rebind to a fire key). Drop.

**E4 - Multi-weapon scan without fire:** the chain contains 4 or more sequential `impulse N` or `weapon N [N2 ...]` selects with no fire path. Catches the ParadokS-style `impulse 7 8 6 5 3 5 4` pack-drop pattern regardless of alias name. Drop.

Exclusions are applied after path extraction so that a bind like `bind q "weapon 7;+attack;say_team rl"` (combat with commentary) correctly passes through (RJ doesn't fire, E1/E2/E3 don't fire because there is a fire path, E4 doesn't fire because only one weapon is selected).

## Exclusion rule examples

| Bind | Hits | Decision |
|---|---|---|
| `bind shift "weapon 7;+attack;+jump"` | RJ | Drop - rocket jump |
| `bind x "__kill_me; impulse 7 8 6 5 3 5 4"` | E1, E3, E4 | Drop - kill-me |
| `bind x "_killme"` where `_killme` reaches `say_team "kill me ..."` | E1, E2 | Drop - kill-me |
| `bind q "weapon 7;+attack"` | none | Keep - Quickfire RL |
| `bind q "weapon 7;+attack;say_team enemy rl"` | none | Keep - Quickfire RL with commentary |
| `bind q "weapon 7"` (no fire) with `bind mouse1 +attack` | none | Keep - Manual-Select RL |
| `bind q "weapon 7"` (no fire) with `bind mouse1 +rocket` | none (rule 4 emits nothing) | No path (no generic fire key) |

## Code location and structure

### Single source of truth

The Rust classifier in `ezquake.rs` is the single source of truth for weapon classification. Two frontend consumers exist today and must continue to share this output:

- **Profile section:** `apps/slipgate-app/src/components/ProfileTab.tsx` - reads `ezConfig.weapon_binds` (the classifier output embedded in the parsed config) and renders via `WeaponBindViz.tsx`.
- **Config Viewer section:** `apps/slipgate-app/src/components/ConfigViewer.tsx` - calls `invoke("classify_chain_binds", ...)` directly for the primary and compare chains, and renders via `ConfigWeaponBindsSection` in `ConfigDomainBinds.tsx`.

Both call paths end up consuming the same `Vec<FiringPath>` from the backend. The two render components (`WeaponBindViz` and `ConfigWeaponBindsSection`) stay distinct because they serve different UX goals (single-view visual grid vs. side-by-side diff) - but they never re-classify or re-derive weapon paths in TypeScript.

A TypeScript helper currently exists in `configMerger.ts` called `synthesizeModifierWeaponBinds` that synthesizes modifier-combo keys client-side from raw binds and aliases. This duplicates work the Rust classifier should own. The v2 redesign covers this logic in Rust (Pass 3 rules 2 and 3: persistent-rebind and hold-modifier detection), so `synthesizeModifierWeaponBinds` is deleted as part of the rewrite and both consumers drop their call to it.

### Rust backend

`apps/slipgate-app/src-tauri/src/commands/ezquake.rs`

- Replace `analyze_weapon_binds` with a new implementation following Passes 1-4.
- Introduce new sub-functions: `resolve_bind_chain`, `classify_fire_keys`, `extract_firing_paths`, `apply_exclusion_rules`.
- Add helper predicates: `is_rocket_jump`, `matches_killme_name`, `contains_killme_text`, `is_announce_without_fire`, `is_long_impulse_scan`, `is_rotate_weapon`.
- `classify_chain_binds` Tauri command keeps its name and chain-input signature; only the output struct (now `Vec<FiringPath>` instead of `Vec<WeaponBind>`) changes. Rename the output type to `FiringPath` throughout.
- The `weapon_binds` field on the parsed-config struct that feeds `ProfileTab` is renamed to `firing_paths` (or kept as `weapon_binds` holding the new type - decide in the implementation plan based on rename blast radius).

### Frontend

Shared TypeScript types in `apps/slipgate-app/src/types.ts`:

- Replace `WeaponBind` type with `FiringPath` mirroring the Rust struct exactly.
- Delete `synthesizeModifierWeaponBinds` from `configMerger.ts`.

`WeaponBindViz.tsx` (Profile consumer):

- Update prop type to `FiringPath[]`.
- Render multiple paths per weapon, grouped by weapon, with sub-tags for `flavor` (Select/Hold) and `source` (Explicit/EngineDefault).
- Show `origin_alias_chain` in a tooltip or expandable detail panel.
- No architectural change; this is a display extension.

`ConfigWeaponBindsSection` in `ConfigDomainBinds.tsx` (Config Viewer consumer):

- Update prop type to `FiringPath[]`.
- Side-by-side diff logic: pair paths by `(weapon, trigger_key, fire_key, flavor)` as the identity tuple. Two paths from different configs are "the same row" if all four match. Changes in `mechanism` or `source` within the same identity tuple are shown as in-row annotations.
- Same new render fields as `WeaponBindViz` (flavor tag, source tag, origin chain tooltip).

Both consumers drop their call to `synthesizeModifierWeaponBinds` after it is deleted from `configMerger.ts`.

## Testing

The existing codebase has no automated tests for the classifier. This redesign adds test fixtures and a small Rust test module.

**Fixtures** (live in `apps/slipgate-app/assets/weapon-fixtures/`):

- `paradoks_hybrid.cfg` - author config with quickfire+manual-select hybrid on SSG
- `hangtime.cfg` - existing HangTime config; critical because Mouse1 is a weapon-specific quickfire
- `killme_paradoks.cfg` - the full kill-me chain from the design conversation
- `killme_hangtime.cfg` - HangTime variant of kill-me
- `killme_vikpe.cfg` - vikpe variant of kill-me
- `preselect_style.cfg` - a minimal config using `cl_weaponpreselect 1` and bare `weapon N` binds
- `oldschool_hold.cfg` - the `+rock`/`-rock` hold-modifier pattern
- `rocket_jump.cfg` - isolated rocket jump binds that must be filtered to movement
- `vanilla.cfg` - bare config using only default number key binds and `bind mouse1 +attack`

Each fixture has an adjacent `.expected.json` snapshot capturing the expected `Vec<FiringPath>` output.

**Rust test module** in `ezquake.rs`:

```rust
#[cfg(test)]
mod firing_path_tests {
    use super::*;

    #[test]
    fn hangtime_mouse1_is_rl_quickfire() {
        let content = include_str!("../../../assets/weapon-fixtures/hangtime.cfg");
        let paths = classify_fixture(content);
        assert!(paths.iter().any(|p|
            p.weapon == Weapon::RL &&
            p.method == Method::Quickfire &&
            p.trigger_key == "Mouse1"
        ));
    }

    #[test]
    fn paradoks_c_produces_quickfire_and_manual_select_for_ssg() {
        let content = include_str!("../../../assets/weapon-fixtures/paradoks_hybrid.cfg");
        let paths = classify_fixture(content);
        let ssg_paths: Vec<_> = paths.iter().filter(|p| p.weapon == Weapon::SSG).collect();
        assert!(ssg_paths.iter().any(|p| p.method == Method::Quickfire && p.trigger_key == "C"));
        assert!(ssg_paths.iter().any(|p|
            p.method == Method::Manual &&
            p.flavor == Some(ManualFlavor::Select) &&
            p.trigger_key == "C" &&
            p.fire_key.as_deref() == Some("Mouse1")
        ));
    }

    #[test]
    fn killme_bind_is_excluded() {
        let content = include_str!("../../../assets/weapon-fixtures/killme_paradoks.cfg");
        let paths = classify_fixture(content);
        assert!(paths.iter().all(|p| p.origin_alias_chain.iter().all(|s| !s.contains("kill_me"))));
    }

    #[test]
    fn rocket_jump_produces_no_weapon_paths() {
        let content = include_str!("../../../assets/weapon-fixtures/rocket_jump.cfg");
        let paths = classify_fixture(content);
        assert!(paths.is_empty());
    }

    #[test]
    fn hangtime_kp_uparrow_has_no_lg_manual_path() {
        let content = include_str!("../../../assets/weapon-fixtures/hangtime.cfg");
        let paths = classify_fixture(content);
        assert!(!paths.iter().any(|p|
            p.weapon == Weapon::LG &&
            p.method == Method::Manual &&
            p.trigger_key == "KP_UPARROW"
        ));
    }
}
```

Snapshot tests (full `Vec<FiringPath>` compared against `.expected.json`) catch regressions beyond the targeted assertions.

## Knowledge capture deliverable

Create `packages/qw-knowledge/weapon-scripts/` with:

- `README.md` - the prose reference. Sections: "Firing mechanisms" (quickfire, manual-select, manual-hold), "ezQuake weapon commands" (impulse, weapon, +fire, +fire_ar, cl_weaponpreselect, cl_weaponhide), "Priority chains and fallback syntax" (old impulse-chain style vs new `weapon N N N`), "Non-combat patterns" (rocket jump, kill-me, pack-drop, walking backpack), "Generic vs weapon-specific fire keys", and source references (ezquake docs URL, `research/repos/ezquake-source/src/cl_input.c` for the implementation).
- `examples/` - small annotated `.cfg` snippets per method/pattern, mirroring the test fixtures but with inline comments explaining what's happening. These double as reference material for humans and as a test set.

The slipgate-app classifier references this doc as its authoritative source. `apps/slipgate-app/CLAUDE.md` gets a one-line pointer so future work in that app finds the doc.

## Risks and open items

- **Priority chain first-weapon rule**: the design assumes `weapon 7 5 3 2 1` anchors to RL and the rest are fallbacks. This matches current code and user guidance. If a config uses priority chains as "best available weapon" scripts bound to several different trigger keys with overlapping chains, the UI may show the same trigger_key pointing to different weapons depending on game state. Deferred; flag in the doc but do not try to handle in v1.
- **`weapon 10` / `weapon 12` rotate**: the engine supports rotate-next and rotate-prev. These do not name a specific weapon and should be excluded from the weapon classifier entirely. Add an `is_rotate_weapon` check in Pass 3 and emit nothing for rotate binds.
- **Multiple generic fire keys**: if a config binds `+attack` to both Mouse1 AND some other key (e.g., Enter), rule 4 will emit one Manual-Select path per `(trigger_key, generic_fire_key)` pair. That may produce more rows than the UI wants to show. The classifier emits all of them honestly; the render layer may collapse "any generic fire key" into a single row if it becomes noisy. This is a UI decision, not a classifier decision.
- **Non-Mouse1 generic fire keys**: the design correctly handles any key bound to plain `+attack`, not just Mouse1. Verify test fixtures cover at least one config where `+attack` is on a non-Mouse1 key.
- **Exec chain interaction**: the existing `exec`-following logic is reused; bugs in that layer would cascade. Out of scope for this redesign.

## Rollout

1. Create `packages/qw-knowledge/weapon-scripts/` with the prose doc and example fixtures. This unblocks fixture creation for the Rust tests.
2. Create the weapon-fixture set in `apps/slipgate-app/assets/weapon-fixtures/` with expected-output snapshots.
3. Rewrite `analyze_weapon_binds` per Passes 1-4. Land behind a feature flag or in a separate function until tests pass, then swap.
4. Update frontend types and `WeaponBindViz.tsx` to render the new shape.
5. Manually verify against ParadokS, HangTime, and a few real-world configs from `research/`.
6. Update `apps/slipgate-app/CLAUDE.md` to reference the knowledge doc.

The implementation plan produced by the `writing-plans` skill will expand these into concrete phases with review checkpoints.
