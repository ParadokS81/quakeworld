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
    if contains_killme_text(body, aliases) {
        return;
    }
    if is_announce_without_fire(body, aliases) {
        return;
    }
    if is_long_impulse_scan(body) {
        return;
    }

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
    //
    // Hold vs Select is decided per-rebind: a rebind is temporary (Hold) only
    // if the release body ALSO rebinds the same target key. A +alias/-alias
    // trigger whose -alias only does `-attack` (without reverting the mouse1
    // rebind) still leaves the rebind persistent — that's Select, not Hold.
    let release_rebinds = extract_inline_rebinds(&resolved.release_body);
    for rebind in extract_inline_rebinds(body) {
        // Resolve the new body to see if it fires a specific weapon.
        let rebind_resolved = resolve_bind_chain(&rebind.target_key, &rebind.new_body, aliases, 10);
        if !body_contains_fire(&rebind_resolved.press_body) {
            continue;
        }
        let Some(weapon) = extract_first_weapon(&rebind_resolved.press_body) else { continue };
        let is_temporary = release_rebinds.iter().any(|rr| rr.target_key == rebind.target_key);
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

    // Rule 4: Manual-Select via select-only bind + generic fire key.
    // If the body selects a weapon without firing and without rebinding a fire key,
    // the weapon is firable via any generic fire key that exists.
    let has_fire = body_contains_fire(body);
    let has_inline_rebind = !extract_inline_rebinds(body).is_empty();
    let weapon_selected = extract_first_weapon(body);
    if !has_fire && !has_inline_rebind {
        if let Some(weapon) = weapon_selected {
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
                    mechanism,
                    origin_alias_chain: resolved.origin_chain.clone(),
                });
            }
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
    // Strip only `&cXXX` color markers (4 chars each). Preserve the text between markers
    // (and any surrounding braces) so substring matches like "kill me" still fire on
    // `{&cb1akill me&cfff}`.
    let mut out = String::new();
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
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

pub(crate) fn tokenize_line(line: &str) -> Vec<String> {
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

    #[test]
    fn killme_text_with_inline_fire_is_excluded_via_e2() {
        // Has inline fire so E3 (announce-without-fire) is not applicable.
        // Uses QW color codes in say_team so strip_qw_color_codes must preserve
        // the "kill me" text for the substring match to fire.
        // Only E2 can catch this.
        let (bindings, aliases, cvars) = parse_test_config(r#"
            bind mouse1 +attack
            bind x "weapon 7;+attack; say_team {&cb1akill me&cfff} rl"
        "#);
        let paths = classify_firing_paths(&bindings, &aliases, &cvars);
        assert!(paths.iter().all(|p| p.trigger_key != "x"),
            "E2 should exclude binds with colored 'kill me' text even when they also have +attack");
    }

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
}
