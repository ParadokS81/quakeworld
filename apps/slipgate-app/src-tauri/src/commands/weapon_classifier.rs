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
        assert!(resolved.origin_chain.len() <= 12); // 1 key + 1 raw push + 10 depth
    }

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
}
