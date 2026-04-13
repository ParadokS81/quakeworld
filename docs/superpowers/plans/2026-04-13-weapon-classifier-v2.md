# Weapon Classifier v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current weapon bind classifier in slipgate-app with a causal-chain model that emits a flat list of firing paths per weapon (quickfire / manual-select / manual-hold), handles kill-me and rocket-jump exclusions correctly, distinguishes generic vs weapon-specific fire keys, and is consumed identically by both the Profile and Config Viewer sections.

**Architecture:** New Rust module `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs` implementing 4 passes (resolve aliases, classify fire keys, extract firing paths, apply exclusions). Called from the existing `classify_chain_binds` Tauri command in `ezquake.rs`. Output type `FiringPath` replaces `WeaponBind` throughout the Rust and TypeScript layers. TypeScript-side modifier-combo synthesis in `configMerger.ts` is deleted (its logic moves into the Rust classifier). Both frontend consumers (`WeaponBindViz`, `ConfigWeaponBindsSection`) read the same `FiringPath[]`.

**Tech Stack:** Rust 1.70+, Tauri v2, SolidJS + TypeScript, Bun. Testing: `cargo test` for Rust (inline `#[cfg(test)]` modules), manual verification for frontend.

**Spec:** `docs/superpowers/specs/2026-04-13-weapon-classifier-v2-design.md`

**Branch:** `feature/qw-config` (already active)

---

## Task map

| Phase | Tasks | What |
|---|---|---|
| A. Knowledge doc | 1-2 | Create `packages/qw-knowledge/weapon-scripts/` |
| B. Rust scaffold | 3-4 | New module, type definitions, test stub |
| C. Pass 1 resolve | 5-6 | Alias chain resolution, +alias/-alias pairs |
| D. Pass 2 fire keys | 7 | Classify generic vs weapon-specific |
| E. Pass 3 paths | 8-12 | 7 extraction rules grouped into 5 tasks |
| F. Pass 4 exclude | 13-14 | 5 exclusion rules grouped into 2 tasks |
| G. Integration | 15-18 | Rotate filter, wire command, fixtures, snapshots, delete old code |
| H. Frontend | 19-21 | Types, Profile consumer, Config Viewer consumer |
| I. Final | 22 | CLAUDE.md pointer, manual verification |

---

## Phase A: Knowledge doc

### Task 1: Create weapon-scripts knowledge package

**Files:**
- Create: `packages/qw-knowledge/weapon-scripts/README.md`
- Create: `packages/qw-knowledge/weapon-scripts/examples/quickfire_weapon_attack.cfg`
- Create: `packages/qw-knowledge/weapon-scripts/examples/quickfire_plus_fire.cfg`
- Create: `packages/qw-knowledge/weapon-scripts/examples/manual_select.cfg`
- Create: `packages/qw-knowledge/weapon-scripts/examples/manual_hold.cfg`
- Create: `packages/qw-knowledge/weapon-scripts/examples/preselect_style.cfg`
- Create: `packages/qw-knowledge/weapon-scripts/examples/killme_teamsay.cfg`
- Create: `packages/qw-knowledge/weapon-scripts/examples/rocket_jump.cfg`

- [ ] **Step 1: Write `README.md`**

```markdown
# QuakeWorld Weapon Scripts

Reference for ezQuake weapon-script patterns: how players select and fire
weapons in config.cfg, the community conventions around it, and the
classification rules the slipgate-app parser applies.

Source: <https://ezquake.com/docs/weapon-scripts.html> and
`research/repos/ezquake-source/src/cl_input.c`.

## Firing mechanisms

Two top-level categories describe how a player fires a weapon:

- **Quickfire**: one physical keypress selects AND fires the weapon in a
  single action. Example: `bind q "weapon 7;+attack"`.
- **Manual**: two physical keypresses. First key selects the weapon,
  second key fires what is currently selected. Splits into two flavors:
  - **Manual-select**: press-and-release rebind. Press key1 once, then
    press key2 any time later. The select persists until another select
    overrides it.
  - **Manual-hold**: hold-modifier rebind via `+alias`/`-alias`. Hold
    key1 down while pressing key2. Releasing key1 reverts.

A single weapon can have BOTH a quickfire path and a manual path in the
same config (for example, quickfire on a dedicated key and manual-select
continues after release via a Mouse1 rebind).

## Generic vs weapon-specific fire keys

A fire key "fires what is currently selected" only if it is bound to a
generic fire command (`+attack`, `+fire`, `+fire_ar`) with NO weapon
selection attached. That makes it a **generic fire key**.

If a key is bound to a script that both selects a weapon AND fires
(e.g., `bind mouse1 +rocket` where `+rocket = "weapon 7;+attack"`), it
is a **weapon-specific fire key**. It is a quickfire path in its own
right and it does NOT act as a generic fire key for any other weapon
select - because pressing it always re-selects its own weapon first.

This distinction is critical. A config with `bind mouse1 +rocket` and
`bind q "weapon 8"` does NOT have a manual-select path for LG via
Mouse1, because Mouse1 fires RL regardless of what Q selected.

## ezQuake commands

| Command | Behavior |
|---|---|
| `impulse N` | Select weapon N. No preselect support. |
| `weapon N [N2 N3 ...]` | Select first available from list. Respects `cl_weaponpreselect`. |
| `+fire N [N2 ...]` | Quickfire: select and fire in one action. |
| `+fire_ar N [N2 ...]` | Anti-rollover quickfire. Same as `+fire` with fire-release race mitigation. |
| `weapon 10` | Rotate to next weapon in order. Not a specific-weapon bind. |
| `weapon 12` | Rotate to previous weapon in order. Not a specific-weapon bind. |

### cvars

- `cl_weaponpreselect` (0-4, default 0): 0=select immediately, 1=queue until next attack, 2=queue or select-on-attack, 3=mode 1 in DM only, 4=mode 2 in DM only.
- `cl_weaponhide` (0-2, default 0): hide weapon after firing (0=off, 1=always, 2=DM only).
- `cl_weaponhide_axe` (0|1): hide to axe instead of shotgun.
- `cl_weaponforgetorder` (0|1): persist `weapon_order` between frames.
- `w_switch` / `b_switch` (0-8): weapon auto-switch thresholds for pickups / backpack pickups.

### Impulse number to weapon

1=Axe, 2=SG, 3=SSG, 4=NG, 5=SNG, 6=GL, 7=RL, 8=LG.

## Priority chains

Two styles of "best available weapon" scripts exist in the wild:

- **Old-school** (`alias rl "impulse 6; impulse 7"`): runs sequentially.
  Last successful select wins. If both GL and RL are held, the player
  ends up on RL. If RL is missing, ends up on GL. Produces the same end
  state as a priority list for simple 2-weapon cases, but fragile for
  longer chains.
- **Modern** (`alias rl "weapon 7 6"`): the engine picks the first
  available weapon from the list. Cleaner and respects `cl_weaponpreselect`.

The classifier anchors priority chains to the FIRST weapon in the list.
A bind `bind q "weapon 7 5 3 2 1"` is classified as selecting RL; the
rest are fallbacks, not separate weapon binds.

## Non-combat patterns

These look like weapon binds to a naive parser but are not combat:

### Rocket jump

A bind whose resolved chain contains both `+attack` (or `+fire`/`+fire_ar`)
AND `+jump`. Example: `bind mouse2 "weapon 7;+attack;+jump"`. This is
movement - the player uses it to reposition, not to shoot enemies.

### Kill-me teamsay

A player selects a high-tier weapon (usually RL or LG) and announces it
in team chat so a teammate can finish them off and pick up the weapon
from the resulting backpack. Signals:

- Alias name matching `_*kill_?me` convention (`__kill_me`, `_killme`, `__kill_me_rl_check`, `.msg.kill.me.rl`, etc.).
- `say_team` message containing literal "kill me" text (after stripping QW color codes like `{&cb1a...&cfff}`).
- Selects-then-announces with no fire path.

### Pack-drop scan

Multi-weapon impulse chains (`impulse 7 8 6 5 3 5 4`) with no fire, used
to leave the player holding a specific weapon when they die. Related to
the walking-backpack problem (dropping RL is expensive; players avoid
being auto-switched into holding it when picking up ammo).

## Classification rules (summary)

The slipgate-app classifier is implemented in
`apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`. It
resolves alias chains, identifies fire keys, extracts firing paths, and
filters out non-combat patterns. See the design spec
`docs/superpowers/specs/2026-04-13-weapon-classifier-v2-design.md` for
the full algorithm and rule set.

## See also

- <https://ezquake.com/docs/weapon-scripts.html> - ezQuake docs
- `research/repos/ezquake-source/src/cl_input.c` - engine implementation
- `apps/slipgate-app/docs/CFG-PARSER.md` - ezQuake config parser architecture
- `examples/` - annotated config snippets for each pattern
```

- [ ] **Step 2: Write the 7 example fixtures**

`quickfire_weapon_attack.cfg`:
```
// Quickfire via explicit weapon+attack
// One physical keypress on Q selects RL and fires it.
alias +rocket "weapon 7;+attack"
alias -rocket "-attack"
bind q +rocket
bind mouse1 +attack
```

`quickfire_plus_fire.cfg`:
```
// Quickfire via +fire with priority fallback
// One keypress on Q quickfires RL, falling back to GL, SNG, SSG if unavailable.
bind q "+fire 7 6 5 3"
bind mouse1 +attack
```

`manual_select.cfg`:
```
// Manual-select: press-and-release rebind
// Press Shift once (don't hold), Mouse1 now fires RL persistently.
alias select_rl "bind mouse1 +attack; weapon 7"
bind shift select_rl
bind mouse1 +attack
```

`manual_hold.cfg`:
```
// Manual-hold: temporary rebind via +alias/-alias pair
// Hold Shift, Mouse1 fires RL. Release Shift, Mouse1 reverts to +attack.
alias +hold_rl "bind mouse1 +firerocket"
alias -hold_rl "bind mouse1 +attack"
alias +firerocket "weapon 7;+attack"
alias -firerocket "-attack"
bind shift +hold_rl
bind mouse1 +attack
```

`preselect_style.cfg`:
```
// Preselect-style: no explicit +attack in weapon binds
// cl_weaponpreselect 1 makes "weapon 7" queue RL; next Mouse1 press fires it.
cl_weaponpreselect 1
bind q "weapon 7"
bind e "weapon 8"
bind mouse1 +attack
```

`killme_teamsay.cfg`:
```
// Kill-me teamsay - selects high-tier weapons and announces for teammate pickup
// Not a combat bind. Excluded from weapon classification via E1 (name), E2 (text),
// E3 (announce-without-fire), and E4 (multi-weapon scan without fire).
alias __kill_me "if ('$bestweapon' = '$tp_name_rl') then .msg.kill.me.rl else .msg.kill.me.lg"
alias .msg.kill.me.rl "say_team kill me rl:$rockets"
alias .msg.kill.me.lg "say_team kill me lg:$cells"
bind x "__kill_me; impulse 7 8 6 5 3 5 4"
bind mouse1 +attack
```

`rocket_jump.cfg`:
```
// Rocket jump - +attack AND +jump in the same chain
// Classified as movement, not a weapon bind. Excluded via RJ rule.
alias +rj "weapon 7;+attack;+jump"
alias -rj "-attack;-jump"
bind mouse2 +rj
bind mouse1 +attack
```

- [ ] **Step 3: Commit the knowledge package**

```bash
git add packages/qw-knowledge/weapon-scripts/
git commit -m "docs(qw-knowledge): add weapon-scripts reference package

Captures QuakeWorld weapon-script domain knowledge so the slipgate-app
classifier and future apps share a single authoritative reference for
firing mechanics, priority chains, non-combat patterns, and generic vs
weapon-specific fire key distinction."
```

---

### Task 2: Add knowledge-package pointer to slipgate-app CLAUDE.md

**Files:**
- Modify: `apps/slipgate-app/CLAUDE.md`

- [ ] **Step 1: Add pointer row to the "Where to find things" table**

Find the line:
```
ezQuake config parser architecture (how bind classification / exec chains / macros / triggers work) | `docs/CFG-PARSER.md`
```

Add a new row right after it:
```
QW weapon-script domain knowledge (firing mechanics, kill-me patterns, fire key types) | `packages/qw-knowledge/weapon-scripts/README.md`
```

- [ ] **Step 2: Commit**

```bash
git add apps/slipgate-app/CLAUDE.md
git commit -m "docs(slipgate-app): point CLAUDE.md at qw-knowledge weapon-scripts"
```

---

## Phase B: Rust scaffold

### Task 3: Create `weapon_classifier.rs` with type definitions

**Files:**
- Create: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Create the new module file**

Create `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`:

```rust
//! Weapon bind classifier v2.
//!
//! Causal-chain model: for each bind, trace what firing paths actually exist,
//! emit them as a flat `Vec<FiringPath>`, filter out non-combat patterns.
//!
//! See `docs/superpowers/specs/2026-04-13-weapon-classifier-v2-design.md`
//! and `packages/qw-knowledge/weapon-scripts/README.md`.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Weapon {
    Axe,
    Sg,
    Ssg,
    Ng,
    Sng,
    Gl,
    Rl,
    Lg,
}

impl Weapon {
    pub fn from_impulse(n: u8) -> Option<Self> {
        match n {
            1 => Some(Weapon::Axe),
            2 => Some(Weapon::Sg),
            3 => Some(Weapon::Ssg),
            4 => Some(Weapon::Ng),
            5 => Some(Weapon::Sng),
            6 => Some(Weapon::Gl),
            7 => Some(Weapon::Rl),
            8 => Some(Weapon::Lg),
            _ => None,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Method {
    Quickfire,
    Manual,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ManualFlavor {
    Select,
    Hold,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PathSource {
    Explicit,
    EngineDefault,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Mechanism {
    PlusFire,
    PlusFireAr,
    WeaponAttack,
    ImpulseAttack,
    PreselectWeapon,
    PreselectImpulse,
    RebindFireKey,
    HoldModifierRebind,
    GenericFireKey,
}

/// One functional firing path: pressing `trigger_key` (and optionally
/// `fire_key` after/during) causes `weapon` to fire.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct FiringPath {
    pub weapon: Weapon,
    pub method: Method,
    pub flavor: Option<ManualFlavor>,
    pub trigger_key: String,
    pub fire_key: Option<String>,
    pub source: PathSource,
    pub mechanism: Mechanism,
    pub origin_alias_chain: Vec<String>,
}

/// Classify a merged config chain into firing paths.
///
/// `bindings` is the ordered list of `(key, command)` pairs as parsed.
/// `aliases` maps alias name to alias body.
/// `cvars` is the resolved cvar state (absent values filled from defaults).
pub fn classify_firing_paths(
    bindings: &[(String, String)],
    aliases: &HashMap<String, String>,
    cvars: &HashMap<String, String>,
) -> Vec<FiringPath> {
    // Stub implementation - real passes land in later tasks.
    let _ = (bindings, aliases, cvars);
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn weapon_from_impulse_maps_all_eight() {
        assert_eq!(Weapon::from_impulse(1), Some(Weapon::Axe));
        assert_eq!(Weapon::from_impulse(2), Some(Weapon::Sg));
        assert_eq!(Weapon::from_impulse(3), Some(Weapon::Ssg));
        assert_eq!(Weapon::from_impulse(4), Some(Weapon::Ng));
        assert_eq!(Weapon::from_impulse(5), Some(Weapon::Sng));
        assert_eq!(Weapon::from_impulse(6), Some(Weapon::Gl));
        assert_eq!(Weapon::from_impulse(7), Some(Weapon::Rl));
        assert_eq!(Weapon::from_impulse(8), Some(Weapon::Lg));
        assert_eq!(Weapon::from_impulse(0), None);
        assert_eq!(Weapon::from_impulse(9), None);
    }

    #[test]
    fn classify_stub_returns_empty() {
        let paths = classify_firing_paths(&[], &HashMap::new(), &HashMap::new());
        assert!(paths.is_empty());
    }
}
```

- [ ] **Step 2: Register the module**

Read `apps/slipgate-app/src-tauri/src/commands/mod.rs` first to confirm the pattern, then add `pub mod weapon_classifier;` following the same style as existing modules.

- [ ] **Step 3: Run the stub tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: both tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs \
        apps/slipgate-app/src-tauri/src/commands/mod.rs
git commit -m "feat(slipgate-app): weapon_classifier module scaffold with type defs"
```

---

### Task 4: Add test fixtures folder and first integration test stub

**Files:**
- Create: `apps/slipgate-app/assets/weapon-fixtures/.gitkeep`
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Create the fixtures folder**

```bash
mkdir -p apps/slipgate-app/assets/weapon-fixtures
touch apps/slipgate-app/assets/weapon-fixtures/.gitkeep
```

- [ ] **Step 2: Add a test helper in `weapon_classifier.rs`**

Append to the `mod tests` block:

```rust
/// Parse a minimal test config string into `(bindings, aliases, cvars)` for classifier tests.
///
/// Supports only `bind`, `alias`, and cvar assignments - sufficient for the classifier's
/// input without pulling in the full config parser.
fn parse_test_config(src: &str) -> (Vec<(String, String)>, HashMap<String, String>, HashMap<String, String>) {
    let mut bindings = Vec::new();
    let mut aliases = HashMap::new();
    let mut cvars = HashMap::new();
    for raw in src.lines() {
        let line = raw.split("//").next().unwrap_or("").trim();
        if line.is_empty() {
            continue;
        }
        // Tokenize respecting double-quoted strings.
        let tokens = tokenize_line(line);
        if tokens.is_empty() {
            continue;
        }
        match tokens[0].as_str() {
            "bind" if tokens.len() >= 3 => {
                bindings.push((tokens[1].clone(), tokens[2..].join(" ")));
            }
            "alias" if tokens.len() >= 3 => {
                aliases.insert(tokens[1].clone(), tokens[2..].join(" "));
            }
            _ if tokens.len() == 2 => {
                cvars.insert(tokens[0].clone(), tokens[1].clone());
            }
            _ => {}
        }
    }
    (bindings, aliases, cvars)
}

fn tokenize_line(line: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    for ch in line.chars() {
        match ch {
            '"' => {
                in_quotes = !in_quotes;
            }
            c if c.is_whitespace() && !in_quotes => {
                if !current.is_empty() {
                    tokens.push(std::mem::take(&mut current));
                }
            }
            c => current.push(c),
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

#[test]
fn parse_test_config_handles_quoted_bind_body() {
    let (bindings, aliases, _cvars) = parse_test_config(r#"
        alias +rock "weapon 7;+attack"
        bind q "+rock"
        bind mouse1 +attack
    "#);
    assert_eq!(bindings.len(), 2);
    assert_eq!(bindings[0], ("q".to_string(), "+rock".to_string()));
    assert_eq!(bindings[1], ("mouse1".to_string(), "+attack".to_string()));
    assert_eq!(aliases.get("+rock"), Some(&"weapon 7;+attack".to_string()));
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: 3 tests pass (`weapon_from_impulse_maps_all_eight`, `classify_stub_returns_empty`, `parse_test_config_handles_quoted_bind_body`).

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/assets/weapon-fixtures/.gitkeep \
        apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "test(weapon_classifier): add parse_test_config helper and fixtures folder"
```

---

## Phase C: Pass 1 - Alias resolution

### Task 5: Implement `resolve_bind_chain` for plain aliases

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write the failing test**

Add to the `tests` module:

```rust
#[test]
fn resolves_simple_alias_reference() {
    let (bindings, aliases, _) = parse_test_config(r#"
        alias +rock "weapon 7;+attack"
        bind q "+rock"
    "#);
    let resolved = resolve_bind_chain(&bindings[0].0, &bindings[0].1, &aliases, 10);
    assert_eq!(resolved.press_body, "weapon 7;+attack");
    assert_eq!(resolved.origin_chain, vec![
        "q".to_string(),
        "+rock".to_string(),
        "weapon 7;+attack".to_string(),
    ]);
}

#[test]
fn resolves_nested_alias_chain() {
    let (bindings, aliases, _) = parse_test_config(r#"
        alias fire_rl "weapon 7;+attack"
        alias +rock fire_rl
        bind q "+rock"
    "#);
    let resolved = resolve_bind_chain(&bindings[0].0, &bindings[0].1, &aliases, 10);
    assert_eq!(resolved.press_body, "weapon 7;+attack");
}

#[test]
fn depth_limit_prevents_infinite_loop() {
    let (bindings, aliases, _) = parse_test_config(r#"
        alias a b
        alias b a
        bind q a
    "#);
    let resolved = resolve_bind_chain(&bindings[0].0, &bindings[0].1, &aliases, 10);
    // Depth-limited resolution returns the last reached body rather than panicking.
    assert!(resolved.press_body == "a" || resolved.press_body == "b");
    assert!(resolved.origin_chain.len() <= 11); // 1 key + 10 depth
}
```

- [ ] **Step 2: Run tests to see them fail**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier::tests::resolves -- --nocapture
```

Expected: compile error, `resolve_bind_chain` not found.

- [ ] **Step 3: Implement `resolve_bind_chain` and `ResolvedBinding`**

Before the `classify_firing_paths` stub, add:

```rust
/// The result of resolving a bind's command into its underlying firing behavior.
#[derive(Debug, Clone, Default)]
pub(crate) struct ResolvedBinding {
    /// The fully-resolved press-side command body (after following aliases).
    pub press_body: String,
    /// The fully-resolved release-side command body (for `+alias`/`-alias` pairs).
    /// Empty when the trigger is not a `+alias`.
    pub release_body: String,
    /// Ordered chain of names/bodies traversed during resolution. First entry is
    /// the key name; subsequent entries are alias names and/or resolved bodies.
    pub origin_chain: Vec<String>,
}

/// Resolve a bind's command by following alias references up to `max_depth` levels.
///
/// Depth-limited to prevent infinite recursion on mutually-referencing aliases.
pub(crate) fn resolve_bind_chain(
    key: &str,
    command: &str,
    aliases: &HashMap<String, String>,
    max_depth: usize,
) -> ResolvedBinding {
    let mut chain: Vec<String> = vec![key.to_string()];
    let mut current = command.trim().trim_matches('"').to_string();
    for _ in 0..max_depth {
        chain.push(current.clone());
        let trimmed = current.trim();
        // Single-token alias reference?
        if let Some(body) = aliases.get(trimmed).or_else(|| aliases.get(trimmed.trim_start_matches('+'))) {
            current = body.trim().trim_matches('"').to_string();
            continue;
        }
        break;
    }
    ResolvedBinding {
        press_body: current,
        release_body: String::new(),
        origin_chain: chain,
    }
}
```

- [ ] **Step 4: Run tests to see them pass**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier::tests::resolves weapon_classifier::tests::depth_limit -- --nocapture
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): resolve_bind_chain with depth limit"
```

---

### Task 6: Extend resolver for +alias/-alias press/release split

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write the failing test**

```rust
#[test]
fn plus_alias_resolves_press_and_release_bodies() {
    let (bindings, aliases, _) = parse_test_config(r#"
        alias +rock "bind mouse1 +firerocket"
        alias -rock "bind mouse1 +attack"
        bind shift +rock
    "#);
    let resolved = resolve_bind_chain(&bindings[0].0, &bindings[0].1, &aliases, 10);
    assert_eq!(resolved.press_body, "bind mouse1 +firerocket");
    assert_eq!(resolved.release_body, "bind mouse1 +attack");
}

#[test]
fn plain_alias_has_empty_release_body() {
    let (bindings, aliases, _) = parse_test_config(r#"
        alias rock "weapon 7;+attack"
        bind q rock
    "#);
    let resolved = resolve_bind_chain(&bindings[0].0, &bindings[0].1, &aliases, 10);
    assert_eq!(resolved.press_body, "weapon 7;+attack");
    assert!(resolved.release_body.is_empty());
}
```

- [ ] **Step 2: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier::tests::plus_alias weapon_classifier::tests::plain_alias -- --nocapture
```

Expected: `plus_alias_resolves_press_and_release_bodies` fails (release_body is empty), `plain_alias_has_empty_release_body` passes.

- [ ] **Step 3: Extend `resolve_bind_chain`**

Replace the function body:

```rust
pub(crate) fn resolve_bind_chain(
    key: &str,
    command: &str,
    aliases: &HashMap<String, String>,
    max_depth: usize,
) -> ResolvedBinding {
    let mut chain: Vec<String> = vec![key.to_string()];
    let raw = command.trim().trim_matches('"').to_string();
    chain.push(raw.clone());

    // If the trigger command is `+alias_name`, resolve both +alias_name and -alias_name.
    if let Some(alias_name) = raw.strip_prefix('+') {
        if aliases.contains_key(&format!("+{}", alias_name)) || aliases.contains_key(alias_name) {
            let press = resolve_alias_body(&format!("+{}", alias_name), aliases, max_depth, &mut chain);
            let release = {
                let mut release_chain = Vec::new();
                resolve_alias_body(&format!("-{}", alias_name), aliases, max_depth, &mut release_chain)
            };
            return ResolvedBinding {
                press_body: press,
                release_body: release,
                origin_chain: chain,
            };
        }
    }

    // Plain alias or inline command - resolve single-body chain.
    let press = resolve_plain_chain(&raw, aliases, max_depth, &mut chain);
    ResolvedBinding {
        press_body: press,
        release_body: String::new(),
        origin_chain: chain,
    }
}

fn resolve_alias_body(
    name: &str,
    aliases: &HashMap<String, String>,
    max_depth: usize,
    chain: &mut Vec<String>,
) -> String {
    match aliases.get(name) {
        Some(body) => {
            let raw = body.trim().trim_matches('"').to_string();
            chain.push(raw.clone());
            resolve_plain_chain(&raw, aliases, max_depth.saturating_sub(1), chain)
        }
        None => String::new(),
    }
}

fn resolve_plain_chain(
    current: &str,
    aliases: &HashMap<String, String>,
    max_depth: usize,
    chain: &mut Vec<String>,
) -> String {
    let mut body = current.to_string();
    for _ in 0..max_depth {
        let trimmed = body.trim();
        if let Some(next) = aliases
            .get(trimmed)
            .or_else(|| aliases.get(trimmed.trim_start_matches('+')))
        {
            body = next.trim().trim_matches('"').to_string();
            chain.push(body.clone());
            continue;
        }
        break;
    }
    body
}
```

- [ ] **Step 4: Run all tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): resolve +alias/-alias press/release bodies"
```

---

## Phase D: Pass 2 - Fire key classification

### Task 7: Implement `classify_fire_keys`

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write the failing tests**

```rust
#[test]
fn classify_fire_keys_finds_generic_mouse1() {
    let (bindings, aliases, _) = parse_test_config(r#"
        bind mouse1 +attack
        bind q "weapon 7"
    "#);
    let classes = classify_fire_keys(&bindings, &aliases);
    assert_eq!(classes.generic_fire_keys, vec!["mouse1".to_string()]);
    assert!(classes.weapon_specific_fire_keys.is_empty());
}

#[test]
fn classify_fire_keys_recognizes_weapon_specific_mouse1() {
    let (bindings, aliases, _) = parse_test_config(r#"
        alias +rocket "weapon 7;+attack"
        alias -rocket "-attack"
        bind mouse1 +rocket
        bind q "weapon 8"
    "#);
    let classes = classify_fire_keys(&bindings, &aliases);
    assert!(classes.generic_fire_keys.is_empty());
    assert_eq!(
        classes.weapon_specific_fire_keys.get("mouse1"),
        Some(&Weapon::Rl)
    );
}

#[test]
fn classify_fire_keys_allows_multiple_generic_keys() {
    let (bindings, aliases, _) = parse_test_config(r#"
        bind mouse1 +attack
        bind enter +attack
    "#);
    let classes = classify_fire_keys(&bindings, &aliases);
    assert_eq!(classes.generic_fire_keys.len(), 2);
    assert!(classes.generic_fire_keys.contains(&"mouse1".to_string()));
    assert!(classes.generic_fire_keys.contains(&"enter".to_string()));
}
```

- [ ] **Step 2: Run tests**

Expected: compile error, `classify_fire_keys` and `FireKeyClasses` not found.

- [ ] **Step 3: Implement**

Add before `classify_firing_paths`:

```rust
/// Outcome of Pass 2: which keys fire something.
#[derive(Debug, Default)]
pub(crate) struct FireKeyClasses {
    /// Keys whose resolved press body is bare `+attack` / `+fire` / `+fire_ar`
    /// with NO weapon selection. These fire whatever is currently selected.
    pub generic_fire_keys: Vec<String>,
    /// Keys that both select a weapon AND fire. Maps key name to the weapon it fires.
    pub weapon_specific_fire_keys: HashMap<String, Weapon>,
}

pub(crate) fn classify_fire_keys(
    bindings: &[(String, String)],
    aliases: &HashMap<String, String>,
) -> FireKeyClasses {
    let mut classes = FireKeyClasses::default();
    for (key, command) in bindings {
        let resolved = resolve_bind_chain(key, command, aliases, 10);
        let body = resolved.press_body.trim();
        let has_fire = body_contains_fire(body);
        if !has_fire {
            continue;
        }
        match extract_first_weapon(body) {
            Some(weapon) => {
                classes
                    .weapon_specific_fire_keys
                    .insert(key.clone(), weapon);
            }
            None => {
                classes.generic_fire_keys.push(key.clone());
            }
        }
    }
    classes
}

/// True if the body contains a top-level fire command.
pub(crate) fn body_contains_fire(body: &str) -> bool {
    for segment in body.split(|c: char| c == ';' || c == '\n') {
        let t = segment.trim();
        if t == "+attack" || t == "+fire" || t == "+fire_ar" {
            return true;
        }
        if t.starts_with("+fire ") || t.starts_with("+fire_ar ") {
            return true;
        }
    }
    false
}

/// Extract the first weapon referenced by any selection command in the body.
/// Returns None if no specific weapon is selected (e.g., bare `+attack`).
pub(crate) fn extract_first_weapon(body: &str) -> Option<Weapon> {
    for segment in body.split(|c: char| c == ';' || c == '\n') {
        let t = segment.trim();
        if let Some(rest) = t.strip_prefix("impulse ") {
            if let Some(n) = rest.split_whitespace().next() {
                if let Ok(num) = n.parse::<u8>() {
                    if let Some(w) = Weapon::from_impulse(num) {
                        return Some(w);
                    }
                }
            }
        }
        if let Some(rest) = t.strip_prefix("weapon ") {
            if let Some(n) = rest.split_whitespace().next() {
                if let Ok(num) = n.parse::<u8>() {
                    if let Some(w) = Weapon::from_impulse(num) {
                        return Some(w);
                    }
                }
            }
        }
        if let Some(rest) = t.strip_prefix("+fire ").or_else(|| t.strip_prefix("+fire_ar ")) {
            if let Some(n) = rest.split_whitespace().next() {
                if let Ok(num) = n.parse::<u8>() {
                    if let Some(w) = Weapon::from_impulse(num) {
                        return Some(w);
                    }
                }
            }
        }
    }
    None
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier::tests::classify_fire_keys -- --nocapture
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): Pass 2 classify_fire_keys (generic vs weapon-specific)"
```

---

## Phase E: Pass 3 - Path extraction

### Task 8: Rule 1 - Quickfire from inline weapon+attack

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write the failing test**

```rust
#[test]
fn extracts_quickfire_from_weapon_attack_body() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        alias +rock "weapon 7;+attack"
        alias -rock "-attack"
        bind mouse1 +attack
        bind q +rock
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let q_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "q").collect();
    assert_eq!(q_paths.len(), 1);
    assert_eq!(q_paths[0].weapon, Weapon::Rl);
    assert_eq!(q_paths[0].method, Method::Quickfire);
    assert_eq!(q_paths[0].flavor, None);
    assert_eq!(q_paths[0].mechanism, Mechanism::WeaponAttack);
}

#[test]
fn extracts_quickfire_from_plus_fire_body() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        bind mouse1 +attack
        bind q "+fire 7 6 5"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let q_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "q").collect();
    assert_eq!(q_paths.len(), 1);
    assert_eq!(q_paths[0].weapon, Weapon::Rl);
    assert_eq!(q_paths[0].method, Method::Quickfire);
    assert_eq!(q_paths[0].mechanism, Mechanism::PlusFire);
}
```

- [ ] **Step 2: Run tests**

Expected: tests fail because `classify_firing_paths` still returns empty.

- [ ] **Step 3: Replace the `classify_firing_paths` stub**

```rust
pub fn classify_firing_paths(
    bindings: &[(String, String)],
    aliases: &HashMap<String, String>,
    cvars: &HashMap<String, String>,
) -> Vec<FiringPath> {
    let fire_keys = classify_fire_keys(bindings, aliases);
    let mut paths = Vec::new();
    for (key, command) in bindings {
        let resolved = resolve_bind_chain(key, command, aliases, 10);
        extract_paths_from_resolved(key, &resolved, &fire_keys, cvars, &mut paths);
    }
    paths
}

fn extract_paths_from_resolved(
    trigger_key: &str,
    resolved: &ResolvedBinding,
    _fire_keys: &FireKeyClasses,
    _cvars: &HashMap<String, String>,
    out: &mut Vec<FiringPath>,
) {
    let body = &resolved.press_body;
    // Rule 1: Quickfire from inline weapon+attack / +fire / +fire_ar.
    if body_contains_fire(body) {
        if let Some(weapon) = extract_first_weapon(body) {
            let mechanism = detect_quickfire_mechanism(body);
            out.push(FiringPath {
                weapon,
                method: Method::Quickfire,
                flavor: None,
                trigger_key: trigger_key.to_string(),
                fire_key: None,
                source: PathSource::Explicit,
                mechanism,
                origin_alias_chain: resolved.origin_chain.clone(),
            });
        }
    }
}

fn detect_quickfire_mechanism(body: &str) -> Mechanism {
    for segment in body.split(|c: char| c == ';' || c == '\n') {
        let t = segment.trim();
        if t.starts_with("+fire_ar") { return Mechanism::PlusFireAr; }
        if t.starts_with("+fire ") || t == "+fire" { return Mechanism::PlusFire; }
        if t.starts_with("weapon ") { return Mechanism::WeaponAttack; }
        if t.starts_with("impulse ") { return Mechanism::ImpulseAttack; }
    }
    Mechanism::WeaponAttack
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier::tests::extracts_quickfire -- --nocapture
```

Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): Pass 3 rule 1 - quickfire from inline fire"
```

---

### Task 9: Rules 2+3 - Manual-Select via persistent rebind, Manual-Hold via +alias

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[test]
fn extracts_manual_select_from_persistent_rebind() {
    // Press Shift rebinds Mouse1 persistently to fire RL. Manual-Select path.
    let (bindings, aliases, cvars) = parse_test_config(r#"
        alias +firerocket "weapon 7;+attack"
        alias -firerocket "-attack"
        alias select_rl "bind mouse1 +firerocket"
        bind mouse1 +attack
        bind shift select_rl
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let shift_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "shift").collect();
    let rl_manual = shift_paths.iter().find(|p|
        p.weapon == Weapon::Rl
            && p.method == Method::Manual
            && p.flavor == Some(ManualFlavor::Select)
    );
    assert!(rl_manual.is_some(), "expected manual-select RL on shift via persistent rebind");
    assert_eq!(rl_manual.unwrap().fire_key.as_deref(), Some("mouse1"));
    assert_eq!(rl_manual.unwrap().mechanism, Mechanism::RebindFireKey);
}

#[test]
fn extracts_manual_hold_from_plus_minus_alias_rebind() {
    // Hold Shift rebinds Mouse1 temporarily. Manual-Hold path.
    let (bindings, aliases, cvars) = parse_test_config(r#"
        alias +firerocket "weapon 7;+attack"
        alias -firerocket "-attack"
        alias +hold_rl "bind mouse1 +firerocket"
        alias -hold_rl "bind mouse1 +attack"
        bind mouse1 +attack
        bind shift +hold_rl
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let shift_hold: Vec<_> = paths.iter()
        .filter(|p| p.trigger_key == "shift" && p.flavor == Some(ManualFlavor::Hold))
        .collect();
    assert_eq!(shift_hold.len(), 1);
    assert_eq!(shift_hold[0].weapon, Weapon::Rl);
    assert_eq!(shift_hold[0].mechanism, Mechanism::HoldModifierRebind);
}
```

- [ ] **Step 2: Run tests**

Expected: both fail.

- [ ] **Step 3: Add rebind detection and implement rules 2+3**

Add helper for extracting `bind TARGET NEWBODY` statements from a body:

```rust
/// A `bind KEY BODY` statement found inside an alias body.
#[derive(Debug, Clone)]
pub(crate) struct InlineRebind {
    pub target_key: String,
    pub new_body: String,
}

pub(crate) fn extract_inline_rebinds(body: &str) -> Vec<InlineRebind> {
    let mut out = Vec::new();
    for segment in body.split(|c: char| c == ';' || c == '\n') {
        let t = segment.trim();
        if let Some(rest) = t.strip_prefix("bind ") {
            let tokens = tokenize_line(rest);
            if tokens.len() >= 2 {
                out.push(InlineRebind {
                    target_key: tokens[0].clone(),
                    new_body: tokens[1..].join(" "),
                });
            }
        }
    }
    out
}
```

Note: `tokenize_line` currently lives in the `tests` module. Move it out to the module level (make it `pub(crate) fn tokenize_line`) so `extract_inline_rebinds` can use it.

Extend `extract_paths_from_resolved` to emit rules 2 and 3:

```rust
fn extract_paths_from_resolved(
    trigger_key: &str,
    resolved: &ResolvedBinding,
    fire_keys: &FireKeyClasses,
    _cvars: &HashMap<String, String>,
    aliases: &HashMap<String, String>,
    out: &mut Vec<FiringPath>,
) {
    let body = &resolved.press_body;

    // Rule 1: Quickfire from inline fire.
    if body_contains_fire(body) {
        if let Some(weapon) = extract_first_weapon(body) {
            let mechanism = detect_quickfire_mechanism(body);
            out.push(FiringPath {
                weapon,
                method: Method::Quickfire,
                flavor: None,
                trigger_key: trigger_key.to_string(),
                fire_key: None,
                source: PathSource::Explicit,
                mechanism,
                origin_alias_chain: resolved.origin_chain.clone(),
            });
        }
    }

    // Rule 2: Manual-Select via persistent rebind.
    // A press body that rebinds a fire key to a weapon-specific fire creates a
    // persistent manual path for that weapon.
    let is_temporary = !resolved.release_body.is_empty();
    for rebind in extract_inline_rebinds(body) {
        // Resolve the new body to see if it fires a specific weapon.
        let rebind_resolved = resolve_bind_chain(&rebind.target_key, &rebind.new_body, aliases, 10);
        if !body_contains_fire(&rebind_resolved.press_body) {
            continue;
        }
        let Some(weapon) = extract_first_weapon(&rebind_resolved.press_body) else { continue };
        let flavor = if is_temporary {
            ManualFlavor::Hold
        } else {
            ManualFlavor::Select
        };
        let mechanism = if is_temporary {
            Mechanism::HoldModifierRebind
        } else {
            Mechanism::RebindFireKey
        };
        out.push(FiringPath {
            weapon,
            method: Method::Manual,
            flavor: Some(flavor),
            trigger_key: trigger_key.to_string(),
            fire_key: Some(rebind.target_key.clone()),
            source: PathSource::Explicit,
            mechanism,
            origin_alias_chain: resolved.origin_chain.clone(),
        });
    }

    // Rules 4-7 land in later tasks.
    let _ = fire_keys;
}
```

Update the caller in `classify_firing_paths` to pass `aliases`:

```rust
        extract_paths_from_resolved(key, &resolved, &fire_keys, cvars, aliases, &mut paths);
```

- [ ] **Step 4: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier::tests::extracts_manual -- --nocapture
```

Expected: both new tests pass. Re-run all weapon_classifier tests; all should still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): Pass 3 rules 2+3 - manual-select/hold via rebind"
```

---

### Task 10: Rule 4 - Manual-Select from select-only bind + generic fire key

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[test]
fn select_only_bind_with_generic_fire_key_emits_manual_select() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        bind mouse1 +attack
        bind q "weapon 7"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let q_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "q").collect();
    assert_eq!(q_paths.len(), 1);
    assert_eq!(q_paths[0].weapon, Weapon::Rl);
    assert_eq!(q_paths[0].method, Method::Manual);
    assert_eq!(q_paths[0].flavor, Some(ManualFlavor::Select));
    assert_eq!(q_paths[0].fire_key.as_deref(), Some("mouse1"));
}

#[test]
fn select_only_bind_without_generic_fire_key_emits_nothing() {
    // Mouse1 is a weapon-specific quickfire, not generic. Q's select-only bind has
    // no valid manual fire key.
    let (bindings, aliases, cvars) = parse_test_config(r#"
        alias +rocket "weapon 7;+attack"
        alias -rocket "-attack"
        bind mouse1 +rocket
        bind q "weapon 8"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let q_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "q").collect();
    assert!(q_paths.is_empty(), "expected no paths for Q when Mouse1 is weapon-specific");
}

#[test]
fn select_only_bind_emits_one_path_per_generic_fire_key() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        bind mouse1 +attack
        bind enter +attack
        bind q "weapon 7"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let q_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "q").collect();
    assert_eq!(q_paths.len(), 2);
    let fire_keys: Vec<_> = q_paths.iter().filter_map(|p| p.fire_key.clone()).collect();
    assert!(fire_keys.contains(&"mouse1".to_string()));
    assert!(fire_keys.contains(&"enter".to_string()));
}
```

- [ ] **Step 2: Run tests**

Expected: all 3 new tests fail. Existing tests still pass.

- [ ] **Step 3: Implement rule 4**

Add to the bottom of `extract_paths_from_resolved`, before the `let _ = fire_keys;` line:

```rust
    // Rule 4: Manual-Select via select-only bind + generic fire key.
    // If the body selects a weapon without firing and without rebinding a fire key,
    // the weapon is firable via any generic fire key that exists.
    let has_fire = body_contains_fire(body);
    let has_inline_rebind = !extract_inline_rebinds(body).is_empty();
    let weapon_selected = extract_first_weapon(body);
    if !has_fire && !has_inline_rebind {
        if let Some(weapon) = weapon_selected {
            for fire_key in &fire_keys.generic_fire_keys {
                if fire_key == trigger_key {
                    continue;
                }
                out.push(FiringPath {
                    weapon,
                    method: Method::Manual,
                    flavor: Some(ManualFlavor::Select),
                    trigger_key: trigger_key.to_string(),
                    fire_key: Some(fire_key.clone()),
                    source: PathSource::Explicit,
                    mechanism: Mechanism::GenericFireKey,
                    origin_alias_chain: resolved.origin_chain.clone(),
                });
            }
        }
    }
```

Remove the `let _ = fire_keys;` line (it's now used).

- [ ] **Step 4: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): Pass 3 rule 4 - select-only + generic fire key"
```

---

### Task 11: Rule 5 - Preselect-aware manual (mechanism tag only)

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write the failing test**

```rust
#[test]
fn preselect_bare_weapon_is_manual_select_with_preselect_mechanism() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        cl_weaponpreselect 1
        bind mouse1 +attack
        bind q "weapon 7"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let q_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "q").collect();
    assert_eq!(q_paths.len(), 1);
    assert_eq!(q_paths[0].method, Method::Manual);
    assert_eq!(q_paths[0].flavor, Some(ManualFlavor::Select));
    assert_eq!(q_paths[0].mechanism, Mechanism::PreselectWeapon);
}
```

- [ ] **Step 2: Run test**

Expected: fails because mechanism is currently `GenericFireKey`.

- [ ] **Step 3: Branch on preselect cvar in rule 4**

Thread `cvars` into the inner emission. Change the `out.push` inside rule 4 to:

```rust
                let preselect_enabled = cvars
                    .get("cl_weaponpreselect")
                    .map(|v| v != "0")
                    .unwrap_or(false);
                let is_bare_weapon = body.trim().starts_with("weapon ");
                let mechanism = if preselect_enabled && is_bare_weapon {
                    Mechanism::PreselectWeapon
                } else {
                    Mechanism::GenericFireKey
                };
                out.push(FiringPath {
                    weapon,
                    method: Method::Manual,
                    flavor: Some(ManualFlavor::Select),
                    trigger_key: trigger_key.to_string(),
                    fire_key: Some(fire_key.clone()),
                    source: PathSource::Explicit,
                    mechanism,
                    origin_alias_chain: resolved.origin_chain.clone(),
                });
```

Update the `_cvars` parameter name in `extract_paths_from_resolved` to `cvars`.

- [ ] **Step 4: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): Pass 3 rule 5 - preselect mechanism tagging"
```

---

### Task 12: Rules 6+7 - Standalone fire-key quickfires and engine defaults

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[test]
fn weapon_specific_fire_key_emits_quickfire_path() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        alias +rocket "weapon 7;+attack"
        alias -rocket "-attack"
        bind mouse1 +rocket
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let mouse1_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "mouse1").collect();
    assert_eq!(mouse1_paths.len(), 1);
    assert_eq!(mouse1_paths[0].weapon, Weapon::Rl);
    assert_eq!(mouse1_paths[0].method, Method::Quickfire);
}

#[test]
fn engine_default_number_keys_emit_paths_when_unbound() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        bind mouse1 +attack
        bind q "weapon 7"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    // Number keys 1-8 are not explicitly bound; expect 8 engine-default manual paths.
    let defaults: Vec<_> = paths.iter().filter(|p| p.source == PathSource::EngineDefault).collect();
    assert_eq!(defaults.len(), 8);
    let weapons: HashMap<&str, Weapon> = defaults.iter().map(|p| (p.trigger_key.as_str(), p.weapon)).collect();
    assert_eq!(weapons.get("1"), Some(&Weapon::Axe));
    assert_eq!(weapons.get("7"), Some(&Weapon::Rl));
    assert_eq!(weapons.get("8"), Some(&Weapon::Lg));
}

#[test]
fn explicit_number_key_bind_overrides_engine_default() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        bind mouse1 +attack
        bind 7 "impulse 7"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let seven_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "7").collect();
    assert_eq!(seven_paths.len(), 1);
    assert_eq!(seven_paths[0].source, PathSource::Explicit);
}
```

- [ ] **Step 2: Run tests**

Expected: all 3 fail.

- [ ] **Step 3: Implement**

For rule 6 (weapon-specific fire keys already emit quickfire via rule 1 - the weapon_specific_fire_keys test should actually pass already via rule 1 because the resolved press_body of `bind mouse1 +rocket` is `weapon 7;+attack` which triggers rule 1). Verify by running:

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier::tests::weapon_specific_fire_key -- --nocapture
```

If it passes already, proceed to rule 7. If not, investigate (the alias may not be resolving because `+rocket` starts with `+` but has no `-rocket` as a hold pair in this test - actually it does, so resolve_bind_chain takes the +alias branch and returns the press body correctly).

For rule 7, add a post-processing step at the end of `classify_firing_paths`:

```rust
pub fn classify_firing_paths(
    bindings: &[(String, String)],
    aliases: &HashMap<String, String>,
    cvars: &HashMap<String, String>,
) -> Vec<FiringPath> {
    let fire_keys = classify_fire_keys(bindings, aliases);
    let mut paths = Vec::new();
    for (key, command) in bindings {
        let resolved = resolve_bind_chain(key, command, aliases, 10);
        extract_paths_from_resolved(key, &resolved, &fire_keys, cvars, aliases, &mut paths);
    }
    emit_engine_defaults(bindings, &fire_keys, &mut paths);
    paths
}

fn emit_engine_defaults(
    bindings: &[(String, String)],
    fire_keys: &FireKeyClasses,
    out: &mut Vec<FiringPath>,
) {
    if fire_keys.generic_fire_keys.is_empty() {
        return;
    }
    let explicitly_bound: std::collections::HashSet<&str> =
        bindings.iter().map(|(k, _)| k.as_str()).collect();
    for n in 1u8..=8u8 {
        let key = n.to_string();
        if explicitly_bound.contains(key.as_str()) {
            continue;
        }
        let Some(weapon) = Weapon::from_impulse(n) else { continue };
        for fire_key in &fire_keys.generic_fire_keys {
            out.push(FiringPath {
                weapon,
                method: Method::Manual,
                flavor: Some(ManualFlavor::Select),
                trigger_key: key.clone(),
                fire_key: Some(fire_key.clone()),
                source: PathSource::EngineDefault,
                mechanism: Mechanism::GenericFireKey,
                origin_alias_chain: vec![format!("bind {} \"impulse {}\" (engine default)", key, n)],
            });
        }
    }
}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): Pass 3 rules 6+7 - fire-key quickfire and engine defaults"
```

---

## Phase F: Pass 4 - Exclusions

### Task 13: Rocket jump + kill-me name exclusions (RJ + E1)

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[test]
fn rocket_jump_produces_no_weapon_paths() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        alias +rj "weapon 7;+attack;+jump"
        alias -rj "-attack;-jump"
        bind mouse1 +attack
        bind mouse2 +rj
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let mouse2_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "mouse2").collect();
    assert!(mouse2_paths.is_empty(), "rocket jump must not emit weapon paths");
}

#[test]
fn killme_alias_name_excludes_the_bind() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        alias __kill_me "say_team need help"
        bind mouse1 +attack
        bind x "__kill_me; impulse 7 8 6 5"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let x_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "x").collect();
    assert!(x_paths.is_empty(), "kill-me alias name must exclude the bind");
}
```

- [ ] **Step 2: Run tests**

Expected: both fail.

- [ ] **Step 3: Add exclusion helpers and apply them**

Add above `classify_firing_paths`:

```rust
pub(crate) fn is_rocket_jump(body: &str) -> bool {
    body_contains_fire(body) && body_contains_jump(body)
}

pub(crate) fn body_contains_jump(body: &str) -> bool {
    for segment in body.split(|c: char| c == ';' || c == '\n') {
        let t = segment.trim();
        if t == "+jump" || t == "jump" {
            return true;
        }
    }
    false
}

pub(crate) fn matches_killme_name(origin_chain: &[String]) -> bool {
    let re_parts = ["kill_me", "killme", "kill.me"];
    for step in origin_chain {
        let lower = step.to_lowercase();
        if re_parts.iter().any(|p| lower.contains(p)) {
            return true;
        }
    }
    false
}
```

Extend `extract_paths_from_resolved` to short-circuit when a rocket jump or kill-me name is detected:

```rust
fn extract_paths_from_resolved(
    trigger_key: &str,
    resolved: &ResolvedBinding,
    fire_keys: &FireKeyClasses,
    cvars: &HashMap<String, String>,
    aliases: &HashMap<String, String>,
    out: &mut Vec<FiringPath>,
) {
    let body = &resolved.press_body;

    // Exclusion gate (applies to everything below).
    if is_rocket_jump(body) {
        return;
    }
    if matches_killme_name(&resolved.origin_chain) {
        return;
    }

    // ... existing rule 1-4 code unchanged ...
}
```

Also gate `classify_firing_paths` so that excluded binds don't slip into the inline-rebind detection loop via rule 1. The current per-bind gate in `extract_paths_from_resolved` handles that.

- [ ] **Step 4: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): Pass 4 RJ + E1 exclusion rules"
```

---

### Task 14: Kill-me text + announce-without-fire + long-impulse-scan (E2 + E3 + E4)

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Write failing tests**

```rust
#[test]
fn killme_text_in_say_team_excludes_the_bind() {
    // Alias name doesn't match, but the message text contains "kill me".
    let (bindings, aliases, cvars) = parse_test_config(r#"
        alias .msg "say_team {&cb1akill me&cfff} $tp_name_rl"
        bind mouse1 +attack
        bind x ".msg; impulse 7"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    assert!(paths.iter().all(|p| p.trigger_key != "x"));
}

#[test]
fn announce_without_fire_is_excluded() {
    // Bind selects a weapon and says something, no fire path.
    let (bindings, aliases, cvars) = parse_test_config(r#"
        bind mouse1 +attack
        bind x "weapon 7; say_team need help"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    assert!(paths.iter().all(|p| p.trigger_key != "x"));
}

#[test]
fn long_impulse_scan_without_fire_is_excluded() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        bind mouse1 +attack
        bind x "impulse 7 8 6 5 3 5 4"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    assert!(paths.iter().all(|p| p.trigger_key != "x"));
}

#[test]
fn combat_bind_with_commentary_is_kept() {
    // Quickfire RL that also says something - NOT excluded.
    let (bindings, aliases, cvars) = parse_test_config(r#"
        bind mouse1 +attack
        bind q "weapon 7;+attack;say_team enemy rl"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    let q_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "q").collect();
    assert_eq!(q_paths.len(), 1);
    assert_eq!(q_paths[0].method, Method::Quickfire);
}
```

- [ ] **Step 2: Run tests**

Expected: first 3 fail, `combat_bind_with_commentary_is_kept` may already pass.

- [ ] **Step 3: Implement E2, E3, E4**

Add helpers:

```rust
pub(crate) fn contains_killme_text(body: &str, aliases: &HashMap<String, String>) -> bool {
    // Walk the body and any referenced aliases one level deep, collect say_team message text.
    let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut queue: Vec<String> = vec![body.to_string()];
    while let Some(current) = queue.pop() {
        for segment in current.split(|c: char| c == ';' || c == '\n') {
            let t = segment.trim();
            if let Some(msg) = t.strip_prefix("say_team ").or_else(|| t.strip_prefix("say ")) {
                let stripped = strip_qw_color_codes(msg);
                if stripped.to_lowercase().contains("kill me") {
                    return true;
                }
            } else if let Some(body) = aliases.get(t) {
                if visited.insert(t.to_string()) {
                    queue.push(body.clone());
                }
            }
        }
    }
    false
}

fn strip_qw_color_codes(s: &str) -> String {
    // Strip `{&c...&cfff}` / `{&cfff...&cfff}` style color blocks by removing any `{...}` segment
    // that begins with `&c`.
    let mut out = String::new();
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '{' {
            let rest: String = chars.clone().collect();
            if rest.starts_with("&c") {
                // Consume until matching `}`.
                for next in chars.by_ref() {
                    if next == '}' {
                        break;
                    }
                }
                continue;
            }
        }
        // Also strip standalone `&cXYZ` sequences that appear without braces.
        if c == '&' && chars.peek() == Some(&'c') {
            chars.next();
            for _ in 0..3 {
                chars.next();
            }
            continue;
        }
        out.push(c);
    }
    out
}

pub(crate) fn is_announce_without_fire(body: &str, aliases: &HashMap<String, String>) -> bool {
    // Has weapon selection, reaches a say/say_team, has no fire path.
    if body_contains_fire(body) {
        return false;
    }
    if !extract_inline_rebinds(body).is_empty() {
        return false; // rebind path counts as "reachable fire"
    }
    if extract_first_weapon(body).is_none() {
        return false;
    }
    reaches_say(body, aliases)
}

fn reaches_say(body: &str, aliases: &HashMap<String, String>) -> bool {
    let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut queue: Vec<String> = vec![body.to_string()];
    while let Some(current) = queue.pop() {
        for segment in current.split(|c: char| c == ';' || c == '\n') {
            let t = segment.trim();
            if t.starts_with("say_team") || t.starts_with("say ") || t == "say" {
                return true;
            }
            if let Some(body) = aliases.get(t) {
                if visited.insert(t.to_string()) {
                    queue.push(body.clone());
                }
            }
        }
    }
    false
}

pub(crate) fn is_long_impulse_scan(body: &str) -> bool {
    if body_contains_fire(body) {
        return false;
    }
    let mut count = 0;
    for segment in body.split(|c: char| c == ';' || c == '\n') {
        let t = segment.trim();
        if let Some(rest) = t.strip_prefix("impulse ") {
            count += rest.split_whitespace().filter(|tok| tok.parse::<u8>().is_ok()).count();
        } else if let Some(rest) = t.strip_prefix("weapon ") {
            count += rest.split_whitespace().filter(|tok| tok.parse::<u8>().is_ok()).count();
        }
    }
    count >= 4
}
```

Extend the exclusion gate at the top of `extract_paths_from_resolved`:

```rust
    // Exclusion gate (applies to everything below).
    if is_rocket_jump(body) {
        return;
    }
    if matches_killme_name(&resolved.origin_chain) {
        return;
    }
    if contains_killme_text(body, aliases) {
        return;
    }
    if is_announce_without_fire(body, aliases) {
        return;
    }
    if is_long_impulse_scan(body) {
        return;
    }
```

- [ ] **Step 4: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: all pass (20+ tests now).

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "feat(weapon_classifier): Pass 4 E2/E3/E4 exclusion rules"
```

---

## Phase G: Integration

### Task 15: Rotate-weapon filter + wire `classify_chain_binds` to new classifier

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`
- Modify: `apps/slipgate-app/src-tauri/src/commands/ezquake.rs`

- [ ] **Step 1: Write failing test for rotate weapons**

```rust
#[test]
fn weapon_10_rotate_next_produces_no_paths() {
    let (bindings, aliases, cvars) = parse_test_config(r#"
        bind mouse1 +attack
        bind mwheelup "weapon 10"
        bind mwheeldown "weapon 12"
    "#);
    let paths = classify_firing_paths(&bindings, &aliases, &cvars);
    assert!(paths.iter().all(|p| p.trigger_key != "mwheelup"));
    assert!(paths.iter().all(|p| p.trigger_key != "mwheeldown"));
}
```

- [ ] **Step 2: Run test**

Expected: fails - rotate keys currently emit paths because `extract_first_weapon` returns None for weapon 10/12 but Rule 4 does not skip the bind, it just emits no specific-weapon path. Verify by running.

If it already passes (because `extract_first_weapon` returns None for 10/12), skip the implementation step. The test pins the behavior.

If it fails, add a guard in `extract_first_weapon`:

```rust
// Already handled: Weapon::from_impulse(10) and from_impulse(12) return None.
// Ensure no path emission downstream when weapon is None.
```

- [ ] **Step 3: Read the current `classify_chain_binds` entry point**

Open `apps/slipgate-app/src-tauri/src/commands/ezquake.rs` and find the `classify_chain_binds` function and the `ChainBindClassification` struct it returns. Note which field holds the weapon binds (likely `weapon_binds: Vec<WeaponBind>`).

- [ ] **Step 4: Update `ChainBindClassification` to use `FiringPath`**

Change the type of the `weapon_binds` field (or rename to `firing_paths` if consistent - choose based on how often the name appears in callers):

```rust
use crate::commands::weapon_classifier::{classify_firing_paths, FiringPath};

// In ChainBindClassification struct:
pub firing_paths: Vec<FiringPath>,
```

Rename the existing `WeaponBind` field and delete its struct definition at the end of this task (Task 18).

In `classify_chain_binds`, replace the existing call to `analyze_weapon_binds` with:

```rust
let firing_paths = classify_firing_paths(&merged.bindings, &merged.aliases, &merged.cvars);
```

and populate the struct field with `firing_paths`.

- [ ] **Step 5: Fix resulting compile errors by adjusting callers minimally**

`cargo check` will flag where the old `WeaponBind` type is used. The TS/frontend callers will be fixed in Phase H. For now:

- Leave `analyze_weapon_binds` and its `WeaponBind` struct in place (dead code, removed in Task 18).
- Update any Rust-side references in `ezquake.rs` / `lib.rs` that break.

```bash
cd apps/slipgate-app/src-tauri && cargo check
```

Expected: compiles cleanly. If there are warnings about unused `analyze_weapon_binds`, that's expected.

- [ ] **Step 6: Run tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: all pass including the rotate test.

- [ ] **Step 7: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs \
        apps/slipgate-app/src-tauri/src/commands/ezquake.rs
git commit -m "feat(slipgate-app): wire classify_chain_binds to new weapon classifier"
```

---

### Task 16: Create fixture .cfg files

**Files:**
- Create: `apps/slipgate-app/assets/weapon-fixtures/vanilla.cfg`
- Create: `apps/slipgate-app/assets/weapon-fixtures/paradoks_hybrid.cfg`
- Create: `apps/slipgate-app/assets/weapon-fixtures/hangtime.cfg`
- Create: `apps/slipgate-app/assets/weapon-fixtures/killme_paradoks.cfg`
- Create: `apps/slipgate-app/assets/weapon-fixtures/killme_hangtime.cfg`
- Create: `apps/slipgate-app/assets/weapon-fixtures/killme_vikpe.cfg`
- Create: `apps/slipgate-app/assets/weapon-fixtures/preselect_style.cfg`
- Create: `apps/slipgate-app/assets/weapon-fixtures/oldschool_hold.cfg`
- Create: `apps/slipgate-app/assets/weapon-fixtures/rocket_jump.cfg`

- [ ] **Step 1: Create `vanilla.cfg`**

```
// Minimal ezQuake config: default impulse binds, generic Mouse1 fire.
bind 1 "impulse 1"
bind 2 "impulse 2"
bind 3 "impulse 3"
bind 4 "impulse 4"
bind 5 "impulse 5"
bind 6 "impulse 6"
bind 7 "impulse 7"
bind 8 "impulse 8"
bind mouse1 +attack
```

- [ ] **Step 2: Create `paradoks_hybrid.cfg`**

```
// ParadokS hybrid: quickfire SSG on C with continuing manual-select via Mouse1 rebind,
// plus a Shift RL select-and-persist.
alias +boom "weapon 2;+attack;bind mouse1 +boom"
alias -boom "-attack"
alias +rocket "weapon 7;+attack"
alias -rocket "-attack"
alias select_rl "bind mouse1 +rocket"

bind mouse1 +attack
bind c +boom
bind shift select_rl
```

- [ ] **Step 3: Copy HangTime to the fixtures folder**

```bash
cp apps/slipgate-app/assets/teamsays/hangtime.cfg apps/slipgate-app/assets/weapon-fixtures/hangtime.cfg
```

Verify the copy contains `bind mouse1 "+rocket"` or similar weapon-specific Mouse1 binding.

- [ ] **Step 4: Create `killme_paradoks.cfg`**

Use the first kill-me example from the design conversation. Abbreviated form:

```
tempalias __kill_me "if ('$bestweapon' = '$tp_name_rl') then __kill_me_rl_check else __kill_me_check"
tempalias __kill_me_rl_check "if ('$cells' > '0') then .msg.kill.me.rl.cells else .msg.kill.me.rl"
tempalias __kill_me_check "if ('$rockets' > '0') then .msg.kill.me.rox else"
tempalias .msg.kill.me.rl "say_team {&cb1akill me&cfff} {%l} $tp_name_rl:{$rockets}"
tempalias .msg.kill.me.rl.cells "say_team {&cb1akill me&cfff} {%l} $tp_name_rl:{$rockets} c:{$cells}"
tempalias .msg.kill.me.rox "say_team {&cb1akill me&cfff} {%l} r:{$rockets}"

bind mouse1 +attack
bind x "__kill_me; impulse 7 8 6 5 3 5 4"
```

- [ ] **Step 5: Create `killme_hangtime.cfg` and `killme_vikpe.cfg`**

Abbreviated variants:

`killme_hangtime.cfg`:
```
alias .msg.kill.me.rl "say_team $\\$nick {&cb1akill me&cfff} {%l} $tp_name_rl:$rockets"
alias __kill_me "if ('$bestweapon' = '$tp_name_rl') then .msg.kill.me.rl else"
bind mouse1 +attack
bind kp_home "impulse 7;__kill_me"
```

`killme_vikpe.cfg`:
```
alias _killme_rl "say_team $\\$nick {&cf2akill me&cfff} $[{%l}$] $tp_name_rl:{$rockets}"
alias _killme "if $tp_name_rl isin $weapons then _killme_rl else"
bind mouse1 +attack
bind kp_end "impulse 7;_killme"
```

- [ ] **Step 6: Create `preselect_style.cfg`**

```
cl_weaponpreselect 1
bind mouse1 +attack
bind q "weapon 7"
bind e "weapon 8"
bind r "weapon 3"
```

- [ ] **Step 7: Create `oldschool_hold.cfg`**

```
alias +rock "bind mouse1 +rock_shoot"
alias -rock "bind mouse1 +attack"
alias +rock_shoot "weapon 7;+attack;bind mouse1 +rock_shoot"
alias -rock_shoot "-attack"
bind shift +rock
bind mouse1 +attack
```

- [ ] **Step 8: Create `rocket_jump.cfg`**

```
alias +rj "weapon 7;+attack;+jump"
alias -rj "-attack;-jump"
bind mouse1 +attack
bind mouse2 +rj
```

- [ ] **Step 9: Commit fixtures**

```bash
git add apps/slipgate-app/assets/weapon-fixtures/
git commit -m "test(weapon_classifier): add fixture configs for v2 classifier"
```

---

### Task 17: Snapshot integration tests

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs`

- [ ] **Step 1: Add fixture integration tests**

At the bottom of the `#[cfg(test)] mod tests` block:

```rust
/// Integration: load a fixture config file, parse it with the test parser,
/// and return its firing paths.
fn classify_fixture(name: &str) -> Vec<FiringPath> {
    let path = format!("../../../../apps/slipgate-app/assets/weapon-fixtures/{}", name);
    let content = std::fs::read_to_string(&path).unwrap_or_else(|e|
        panic!("failed to read fixture {}: {}", path, e)
    );
    let (bindings, aliases, cvars) = parse_test_config(&content);
    classify_firing_paths(&bindings, &aliases, &cvars)
}

#[test]
fn fixture_vanilla_has_eight_engine_default_paths() {
    let paths = classify_fixture("vanilla.cfg");
    // All 8 number keys are explicit in vanilla.cfg (bind 7 "impulse 7" etc),
    // so they are Explicit, not EngineDefault.
    let manual_paths: Vec<_> = paths.iter().filter(|p| p.method == Method::Manual).collect();
    assert_eq!(manual_paths.len(), 8);
    for p in &manual_paths {
        assert_eq!(p.source, PathSource::Explicit);
        assert_eq!(p.fire_key.as_deref(), Some("mouse1"));
    }
}

#[test]
fn fixture_paradoks_hybrid_c_has_quickfire_and_manual_ssg() {
    let paths = classify_fixture("paradoks_hybrid.cfg");
    let c_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "c").collect();
    assert!(c_paths.iter().any(|p|
        p.weapon == Weapon::Ssg && p.method == Method::Quickfire
    ), "C should have quickfire SSG");
    assert!(c_paths.iter().any(|p|
        p.weapon == Weapon::Ssg
            && p.method == Method::Manual
            && p.flavor == Some(ManualFlavor::Select)
            && p.fire_key.as_deref() == Some("mouse1")
    ), "C should have manual-select SSG via Mouse1 rebind");
}

#[test]
fn fixture_paradoks_hybrid_shift_has_manual_select_rl() {
    let paths = classify_fixture("paradoks_hybrid.cfg");
    let shift_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "shift").collect();
    assert!(shift_paths.iter().any(|p|
        p.weapon == Weapon::Rl
            && p.method == Method::Manual
            && p.flavor == Some(ManualFlavor::Select)
    ));
}

#[test]
fn fixture_hangtime_mouse1_is_rl_quickfire() {
    let paths = classify_fixture("hangtime.cfg");
    assert!(paths.iter().any(|p|
        p.trigger_key == "mouse1"
            && p.weapon == Weapon::Rl
            && p.method == Method::Quickfire
    ));
}

#[test]
fn fixture_hangtime_kp_uparrow_has_no_lg_manual_path() {
    let paths = classify_fixture("hangtime.cfg");
    // Mouse1 is weapon-specific (+rocket), so no generic fire key exists.
    // KP_UPARROW's weapon select should NOT produce a manual LG path.
    assert!(!paths.iter().any(|p|
        p.trigger_key.to_lowercase() == "kp_uparrow"
            && p.weapon == Weapon::Lg
            && p.method == Method::Manual
    ));
}

#[test]
fn fixture_killme_variants_are_all_excluded() {
    for name in &["killme_paradoks.cfg", "killme_hangtime.cfg", "killme_vikpe.cfg"] {
        let paths = classify_fixture(name);
        let kill_me_keys = ["x", "kp_home", "kp_end"];
        for p in &paths {
            assert!(
                !kill_me_keys.contains(&p.trigger_key.to_lowercase().as_str()),
                "{}: trigger_key {} should be excluded",
                name,
                p.trigger_key,
            );
        }
    }
}

#[test]
fn fixture_preselect_style_tags_mechanism() {
    let paths = classify_fixture("preselect_style.cfg");
    let q_paths: Vec<_> = paths.iter().filter(|p| p.trigger_key == "q").collect();
    assert!(q_paths.iter().any(|p| p.mechanism == Mechanism::PreselectWeapon));
}

#[test]
fn fixture_oldschool_hold_classifies_shift_as_hold() {
    let paths = classify_fixture("oldschool_hold.cfg");
    let shift_hold: Vec<_> = paths.iter()
        .filter(|p| p.trigger_key == "shift" && p.flavor == Some(ManualFlavor::Hold))
        .collect();
    assert!(!shift_hold.is_empty(), "shift should have hold-modifier path");
}

#[test]
fn fixture_rocket_jump_produces_no_weapon_paths() {
    let paths = classify_fixture("rocket_jump.cfg");
    assert!(paths.iter().all(|p| p.trigger_key != "mouse2"));
}
```

- [ ] **Step 2: Run integration tests**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier::tests::fixture -- --nocapture
```

Expected: all 9 fixture tests pass. If a test fails, read the output, adjust the fixture (if the expected behavior differs from what the fixture encodes) or fix the classifier bug the test exposed. The fixture tests are the authoritative regression suite; they must all pass before the commit.

- [ ] **Step 3: Run the full weapon_classifier test suite**

```bash
cd apps/slipgate-app/src-tauri && cargo test weapon_classifier --lib
```

Expected: all unit + integration tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/weapon_classifier.rs
git commit -m "test(weapon_classifier): add fixture-based integration tests"
```

---

### Task 18: Delete old `analyze_weapon_binds` and `WeaponBind`

**Files:**
- Modify: `apps/slipgate-app/src-tauri/src/commands/ezquake.rs`

- [ ] **Step 1: Find the old code**

Locate `analyze_weapon_binds` (around line 972), `WeaponBind` struct, and any helper functions that exist only to support it (`extract_rebinds` may still be used elsewhere; `impulse_to_weapon`, `has_attack`, `has_jump` may overlap with the new classifier).

- [ ] **Step 2: Check for remaining callers**

```bash
cd apps/slipgate-app && rg "analyze_weapon_binds|WeaponBind" --type rust
```

If the only references are the struct definition and the function itself (with `classify_chain_binds` now calling the new classifier), proceed. If other callers exist, update them to consume `FiringPath` or delete them.

- [ ] **Step 3: Delete the old code**

Remove:

- The `analyze_weapon_binds` function (entire body)
- The `WeaponBind` struct definition
- Any helper functions unique to the old classifier (if unused elsewhere)

Keep shared helpers like `resolve_command`, `extract_rebinds`, and the config parser itself - those are used by other parts of `ezquake.rs`.

- [ ] **Step 4: Verify build**

```bash
cd apps/slipgate-app/src-tauri && cargo check && cargo test --lib
```

Expected: clean build, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src-tauri/src/commands/ezquake.rs
git commit -m "refactor(slipgate-app): remove old analyze_weapon_binds and WeaponBind"
```

---

## Phase H: Frontend migration

### Task 19: Update TypeScript types and delete `synthesizeModifierWeaponBinds`

**Files:**
- Modify: `apps/slipgate-app/src/types.ts`
- Modify: `apps/slipgate-app/src/components/configMerger.ts`
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx`

- [ ] **Step 1: Read current `types.ts` and find the `WeaponBind` definition**

```bash
rg "WeaponBind|FiringPath" apps/slipgate-app/src/types.ts
```

- [ ] **Step 2: Replace `WeaponBind` with `FiringPath`**

In `types.ts`, replace the existing `WeaponBind` interface with:

```typescript
export type Weapon = "axe" | "sg" | "ssg" | "ng" | "sng" | "gl" | "rl" | "lg";

export type Method = "quickfire" | "manual";

export type ManualFlavor = "select" | "hold";

export type PathSource = "explicit" | "engine_default";

export type Mechanism =
  | "plus_fire"
  | "plus_fire_ar"
  | "weapon_attack"
  | "impulse_attack"
  | "preselect_weapon"
  | "preselect_impulse"
  | "rebind_fire_key"
  | "hold_modifier_rebind"
  | "generic_fire_key";

export interface FiringPath {
  weapon: Weapon;
  method: Method;
  flavor: ManualFlavor | null;
  trigger_key: string;
  fire_key: string | null;
  source: PathSource;
  mechanism: Mechanism;
  origin_alias_chain: string[];
}
```

Also keep a type alias for migration: `export type WeaponBind = FiringPath;` for the first commit, then remove it in Step 4. (Two-step reduces the blast radius of the rename.)

Wait - decide NOW whether to rename or alias. If the `WeaponBind` name appears in more than ~20 locations, use the alias shim for now. Otherwise rename outright.

```bash
rg "WeaponBind" apps/slipgate-app/src -l | wc -l
```

If count > 5, add the alias. If count <= 5, rename in place throughout.

- [ ] **Step 3: Delete `synthesizeModifierWeaponBinds`**

In `configMerger.ts`, find `synthesizeModifierWeaponBinds` (and `synthesizeModifierTeamsayBinds` if it shares machinery - but only delete the weapon variant; teamsay is out of scope). Delete the function and its helpers, then remove the export.

- [ ] **Step 4: Remove callers of `synthesizeModifierWeaponBinds`**

In `ConfigViewer.tsx`, find the `synthesizeModifierWeaponBinds` calls in `primaryWeaponBinds` and `compareWeaponBinds` memos. Replace with direct `firing_paths` consumption:

```typescript
const primaryWeaponBinds = createMemo(() =>
  effectiveConfig()?.firing_paths ?? []
);

const compareWeaponBinds = createMemo(() =>
  compareBinds()?.firing_paths ?? []
);
```

Rename prop pass-through if needed so `ConfigWeaponBindsSection` still receives the data.

- [ ] **Step 5: Build the frontend**

```bash
cd apps/slipgate-app && bun install && bun run build
```

Expected: build succeeds (or surfaces downstream type errors to fix in Tasks 20-21).

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src/types.ts \
        apps/slipgate-app/src/components/configMerger.ts \
        apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "refactor(slipgate-app): replace WeaponBind with FiringPath, drop TS modifier synthesis"
```

---

### Task 20: Update `WeaponBindViz.tsx` (Profile consumer)

**Files:**
- Modify: `apps/slipgate-app/src/components/WeaponBindViz.tsx`
- Modify: `apps/slipgate-app/src/components/ProfileTab.tsx`

- [ ] **Step 1: Read current component**

```bash
cat apps/slipgate-app/src/components/WeaponBindViz.tsx
```

Identify the prop type (`weaponBinds: WeaponBind[]`), the grouping logic (currently groups by weapon), and the per-row render.

- [ ] **Step 2: Update props and grouping**

Replace the prop type:

```typescript
import type { FiringPath, Weapon } from "../types";

interface WeaponBindVizProps {
  firingPaths: FiringPath[];
}
```

Update grouping:

```typescript
function groupByWeapon(paths: FiringPath[]): Map<Weapon, FiringPath[]> {
  const map = new Map<Weapon, FiringPath[]>();
  for (const p of paths) {
    if (!map.has(p.weapon)) map.set(p.weapon, []);
    map.get(p.weapon)!.push(p);
  }
  return map;
}
```

- [ ] **Step 3: Render multiple paths per weapon with flavor + source tags**

Inside the per-weapon render block, iterate over the paths for that weapon:

```tsx
<For each={pathsForWeapon()}>
  {(path) => (
    <div class="firing-path-row" classList={{ "path-default": path.source === "engine_default" }}>
      <span class="trigger-key">{path.trigger_key}</span>
      <Show when={path.method === "manual" && path.fire_key}>
        <span class="fire-key-arrow"> + {path.fire_key}</span>
      </Show>
      <span class="method-tag" classList={{
        "badge-quickfire": path.method === "quickfire",
        "badge-manual-select": path.method === "manual" && path.flavor === "select",
        "badge-manual-hold": path.method === "manual" && path.flavor === "hold",
      }}>
        {path.method === "quickfire" ? "quickfire" : `manual-${path.flavor}`}
      </span>
      <Show when={path.source === "engine_default"}>
        <span class="source-tag">(default)</span>
      </Show>
    </div>
  )}
</For>
```

Use existing DaisyUI semantic classes (`badge-primary`, `badge-secondary`, etc.) rather than custom color classes per the project's "no hardcoded colors" rule. The final class mapping is a design call - pick any existing badge style; the functionality is what the test checks.

- [ ] **Step 4: Update `ProfileTab.tsx` call site**

```bash
rg "WeaponBindViz" apps/slipgate-app/src/components/ProfileTab.tsx
```

Update:

```tsx
<WeaponBindViz firingPaths={props.ezConfig!.firing_paths} />
```

(Previously `weaponBinds={props.ezConfig!.weapon_binds}`.)

- [ ] **Step 5: Build and smoke test**

```bash
cd apps/slipgate-app && bun run build
```

Expected: build succeeds.

Launch the app manually (Windows-side dev run is out of scope for this plan; WSL build verification is sufficient here).

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src/components/WeaponBindViz.tsx \
        apps/slipgate-app/src/components/ProfileTab.tsx
git commit -m "feat(slipgate-app): WeaponBindViz renders FiringPath with flavor + source tags"
```

---

### Task 21: Update `ConfigWeaponBindsSection` (Config Viewer consumer)

**Files:**
- Modify: `apps/slipgate-app/src/components/ConfigDomainBinds.tsx`

- [ ] **Step 1: Read current component**

```bash
sed -n '1,120p' apps/slipgate-app/src/components/ConfigDomainBinds.tsx
```

Identify `ConfigWeaponBindsSection`, its prop type, and how it performs the primary-vs-compare diff (likely pairs by `(weapon, key)`).

- [ ] **Step 2: Update props**

```typescript
interface WeaponBindsProps {
  primaryBinds: FiringPath[];
  compareBinds?: FiringPath[];
}

interface DiffRow {
  weapon: Weapon;
  trigger_key: string;
  fire_key: string | null;
  flavor: ManualFlavor | null;
  primary?: FiringPath;
  compare?: FiringPath;
}
```

- [ ] **Step 3: Update the pairing identity tuple**

Two `FiringPath` entries from different configs belong in the same diff row if `(weapon, trigger_key, fire_key, flavor)` match:

```typescript
function rowKey(p: FiringPath): string {
  return `${p.weapon}|${p.trigger_key}|${p.fire_key ?? ""}|${p.flavor ?? ""}`;
}

function pairRows(primary: FiringPath[], compare: FiringPath[] = []): DiffRow[] {
  const byKey = new Map<string, DiffRow>();
  for (const p of primary) {
    const key = rowKey(p);
    byKey.set(key, {
      weapon: p.weapon,
      trigger_key: p.trigger_key,
      fire_key: p.fire_key,
      flavor: p.flavor,
      primary: p,
    });
  }
  for (const c of compare) {
    const key = rowKey(c);
    const existing = byKey.get(key);
    if (existing) {
      existing.compare = c;
    } else {
      byKey.set(key, {
        weapon: c.weapon,
        trigger_key: c.trigger_key,
        fire_key: c.fire_key,
        flavor: c.flavor,
        compare: c,
      });
    }
  }
  return Array.from(byKey.values());
}
```

- [ ] **Step 4: Update `formatMethod` and render**

```typescript
function formatMethod(p: FiringPath): string {
  if (p.method === "quickfire") return "quickfire";
  return `manual-${p.flavor ?? "select"}`;
}
```

In the diff row render, show the method tag, flavor, source, and origin chain (tooltip). Match the existing visual style of the section - only the data shape changes.

- [ ] **Step 5: Build**

```bash
cd apps/slipgate-app && bun run build
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigDomainBinds.tsx
git commit -m "feat(slipgate-app): ConfigWeaponBindsSection consumes FiringPath + pair-by-identity"
```

---

## Phase I: Final

### Task 22: Manual verification checklist and final commit

**Files:**
- Modify: `apps/slipgate-app/docs/HEALTH.md` (optionally, if a HEALTH item is addressed)

- [ ] **Step 1: Full Rust test suite**

```bash
cd apps/slipgate-app/src-tauri && cargo test --lib
```

Expected: all tests pass.

- [ ] **Step 2: Clippy + fmt**

```bash
cd apps/slipgate-app/src-tauri && cargo clippy --lib -- -D warnings && cargo fmt --check
```

Fix any warnings (cleanup commits are fine).

- [ ] **Step 3: Frontend build and lint**

```bash
cd apps/slipgate-app && bun run build && bunx biome check src/
```

Fix any issues.

- [ ] **Step 4: Manual verification checklist**

Launch the app (Windows-side) and verify:

- [ ] Load ParadokS's real config in the Profile tab. Confirm weapons display shows quickfire + manual paths per weapon, matching hand-expected output.
- [ ] Load HangTime's config. Confirm Mouse1 appears as quickfire RL, and KP_UPARROW (LG select) has NO manual LG path.
- [ ] Load a kill-me-bearing config. Confirm the kill-me keys (X / KP_HOME / etc) produce no weapon paths in the viz.
- [ ] Open the Config Viewer, select two configs side-by-side, confirm the weapon binds section pairs rows by weapon+key+flavor correctly.
- [ ] Confirm engine-default number keys (1-8) appear as dimmed/tagged rows in configs that don't override them.

If any item fails, open a follow-up fix commit before marking this task complete.

- [ ] **Step 5: Update `docs/HEALTH.md` if the classifier cleanup addressed a listed item**

```bash
rg "weapon|classifier|analyze_weapon" apps/slipgate-app/docs/HEALTH.md
```

If a HEALTH item is now fixed, mark it resolved or remove it per the file's existing conventions.

- [ ] **Step 6: Final commit**

```bash
git add apps/slipgate-app/docs/HEALTH.md
git commit -m "docs(slipgate-app): mark weapon classifier v2 rollout complete"
```

Optionally push the branch and prepare a PR.

---

## Self-review notes

- Every task that modifies Rust runs `cargo test weapon_classifier --lib` as verification.
- Every task that modifies TypeScript runs `bun run build` as verification.
- The `FiringPath` type shape in Rust (Task 3) matches the TypeScript shape in Task 19 - both have the same field names and nullability.
- Exclusion rules are tested in Task 13 (RJ + E1) and Task 14 (E2 + E3 + E4), with a positive-case regression (`combat_bind_with_commentary_is_kept`).
- Fixture tests in Task 17 cover every fixture created in Task 16, and every spec requirement from the design doc's fixture list.
- The old `WeaponBind` and `analyze_weapon_binds` are kept functional until Task 18, when they are deleted as dead code after the new classifier is wired up.
- Knowledge-doc deliverable (Tasks 1-2) is complete before any Rust code is written, so the fixtures and prose reference are in place as the ground truth.
- The `synthesizeModifierWeaponBinds` TypeScript helper is deleted in Task 19 before any consumer changes, forcing the frontend to rely on the Rust classifier's output.

## What this plan does NOT cover

- Splitting `ezquake.rs` further (flagged in `HEALTH.md` but out of scope here).
- Adding a second client (FTE) - the `FiringPath` shape is designed to support it but no FTE work is done.
- SetupStyle metadata detection (explicitly cut from the spec during brainstorming).
- Snapshot-file-based regression tests (`.expected.json`) - replaced by targeted assertions in Task 17 because snapshot drift is hard to manage without a review workflow; can be added later if needed.
- Frontend visual polish beyond functional correctness - the WeaponBindViz and ConfigWeaponBindsSection changes render the new fields but don't restyle the surrounding UI.
