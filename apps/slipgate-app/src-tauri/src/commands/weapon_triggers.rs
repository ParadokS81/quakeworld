//! Parse ezQuake's `f_weaponchange` trigger alias.
//!
//! ezQuake auto-runs `f_weaponchange` whenever the active weapon changes. A
//! common pattern (Xantom-style) is to dispatch per-weapon modifier aliases
//! via an `if N == $weaponnum then ALIAS else ALIAS` condition. Those modifier
//! cvars (sensitivity, crosshairimage, ...) are invisible to the bind-chain
//! analysis, so we surface them separately.
//!
//! Supported shapes:
//!   if 8 == $weaponnum then __lg_settings else __default_settings
//!   if 8 == $weaponnum then A else if 7 == $weaponnum then B else C
//!   if 8 == $weaponnum then A                    (no else)
//!   __default_settings                           (unconditional dispatch)

use crate::commands::weapon_classifier::Weapon;
use serde::Serialize;
use std::collections::{HashMap, HashSet};

#[derive(Serialize, Clone, Debug, Default)]
pub struct WeaponChangeDispatch {
    /// Weapon string ("lg", "rl", ...) -> dispatched alias name ("__lg_settings").
    pub per_weapon: HashMap<String, String>,
    /// Fallback alias when no specific branch matches ("__default_settings").
    pub else_alias: Option<String>,
}

pub fn parse_weapon_change_dispatch(
    aliases: &HashMap<String, String>,
) -> Option<WeaponChangeDispatch> {
    let body = aliases.get("f_weaponchange")?.trim();
    let body = body.trim_matches('"').trim();
    if body.is_empty() {
        return None;
    }
    let mut out = WeaponChangeDispatch::default();
    // Split on top-level `;` — nested if/else does not use `;`, so this is safe.
    for stmt in body.split(';') {
        let tokens: Vec<&str> = stmt.split_whitespace().collect();
        if tokens.is_empty() {
            continue;
        }
        parse_statement(&tokens, &mut out);
    }
    if out.per_weapon.is_empty() && out.else_alias.is_none() {
        None
    } else {
        Some(out)
    }
}

fn parse_statement(tokens: &[&str], out: &mut WeaponChangeDispatch) {
    if tokens[0].eq_ignore_ascii_case("if") {
        parse_if(tokens, out);
    } else if tokens.len() == 1 && out.else_alias.is_none() {
        // Bare alias dispatch — runs for every weapon change.
        out.else_alias = Some(tokens[0].to_string());
    }
}

fn parse_if(tokens: &[&str], out: &mut WeaponChangeDispatch) {
    let lower: Vec<String> = tokens.iter().map(|t| t.to_lowercase()).collect();
    let Some(then_idx) = lower.iter().position(|t| t == "then") else {
        return;
    };
    if then_idx < 2 {
        return;
    }

    let cond_tokens = &tokens[1..then_idx];
    let weapon_num = extract_weapon_num(cond_tokens);

    // Match "else" at the top level (first one after "then" — nested if/else
    // inside the then-branch is unusual enough that we skip that shape).
    let else_idx = lower
        .iter()
        .enumerate()
        .skip(then_idx + 1)
        .find(|(_, t)| *t == "else")
        .map(|(i, _)| i);

    let then_end = else_idx.unwrap_or(tokens.len());
    let then_branch = &tokens[then_idx + 1..then_end];

    if let (Some(n), Some(alias_name)) = (weapon_num, branch_alias(then_branch)) {
        if let Some(w) = Weapon::from_impulse(n) {
            out.per_weapon
                .entry(weapon_to_str(w).to_string())
                .or_insert(alias_name);
        }
    }

    if let Some(eidx) = else_idx {
        let else_branch = &tokens[eidx + 1..];
        if !else_branch.is_empty() && else_branch[0].eq_ignore_ascii_case("if") {
            parse_if(else_branch, out);
        } else if let Some(alias_name) = branch_alias(else_branch) {
            if out.else_alias.is_none() {
                out.else_alias = Some(alias_name);
            }
        }
    }
}

fn extract_weapon_num(cond_tokens: &[&str]) -> Option<u8> {
    for t in cond_tokens {
        if let Ok(n) = t.parse::<u8>() {
            if (1..=8).contains(&n) {
                return Some(n);
            }
        }
    }
    None
}

fn branch_alias(tokens: &[&str]) -> Option<String> {
    tokens.first().map(|t| t.to_string())
}

fn weapon_to_str(w: Weapon) -> &'static str {
    match w {
        Weapon::Axe => "axe",
        Weapon::Sg => "sg",
        Weapon::Ssg => "ssg",
        Weapon::Ng => "ng",
        Weapon::Sng => "sng",
        Weapon::Gl => "gl",
        Weapon::Rl => "rl",
        Weapon::Lg => "lg",
    }
}

/// Walk a dispatched alias body and return the `sensitivity N` value it sets.
/// Recurses through nested alias calls (up to `max_depth`) so chains like
/// `__lg_settings -> _lg_sens_helper` still surface the value.
pub fn extract_sensitivity_from_alias(
    alias_name: &str,
    aliases: &HashMap<String, String>,
) -> Option<f64> {
    let mut visited = HashSet::new();
    extract_sens_recursive(alias_name, aliases, &mut visited, 8)
}

fn extract_sens_recursive(
    alias_name: &str,
    aliases: &HashMap<String, String>,
    visited: &mut HashSet<String>,
    remaining_depth: usize,
) -> Option<f64> {
    if remaining_depth == 0 {
        return None;
    }
    if !visited.insert(alias_name.to_string()) {
        return None;
    }
    let body = aliases.get(alias_name)?.trim();
    let body = body.trim_matches('"');
    for stmt in body.split(';') {
        let trimmed = stmt.trim();
        if let Some(rest) = trimmed.strip_prefix("sensitivity ") {
            if let Ok(v) = rest.trim().parse::<f64>() {
                return Some(v);
            }
        }
        // Single-token statement that references another alias — recurse.
        let tokens: Vec<&str> = trimmed.split_whitespace().collect();
        if tokens.len() == 1 && aliases.contains_key(tokens[0]) {
            if let Some(v) =
                extract_sens_recursive(tokens[0], aliases, visited, remaining_depth - 1)
            {
                return Some(v);
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn aliases_from(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn parses_xantom_pattern() {
        let aliases = aliases_from(&[(
            "f_weaponchange",
            "if 8 == $weaponnum then __lg_settings else __default_settings",
        )]);
        let d = parse_weapon_change_dispatch(&aliases).expect("parsed");
        assert_eq!(d.per_weapon.get("lg").map(|s| s.as_str()), Some("__lg_settings"));
        assert_eq!(d.else_alias.as_deref(), Some("__default_settings"));
    }

    #[test]
    fn parses_chained_else_if() {
        let aliases = aliases_from(&[(
            "f_weaponchange",
            "if 8 == $weaponnum then lg_cfg else if 7 == $weaponnum then rl_cfg else default_cfg",
        )]);
        let d = parse_weapon_change_dispatch(&aliases).expect("parsed");
        assert_eq!(d.per_weapon.get("lg").map(|s| s.as_str()), Some("lg_cfg"));
        assert_eq!(d.per_weapon.get("rl").map(|s| s.as_str()), Some("rl_cfg"));
        assert_eq!(d.else_alias.as_deref(), Some("default_cfg"));
    }

    #[test]
    fn parses_reversed_operands() {
        let aliases = aliases_from(&[(
            "f_weaponchange",
            "if $weaponnum == 8 then __lg else __default",
        )]);
        let d = parse_weapon_change_dispatch(&aliases).expect("parsed");
        assert_eq!(d.per_weapon.get("lg").map(|s| s.as_str()), Some("__lg"));
        assert_eq!(d.else_alias.as_deref(), Some("__default"));
    }

    #[test]
    fn returns_none_without_trigger() {
        let aliases: HashMap<String, String> = HashMap::new();
        assert!(parse_weapon_change_dispatch(&aliases).is_none());
    }

    #[test]
    fn if_without_else() {
        let aliases = aliases_from(&[("f_weaponchange", "if 8 == $weaponnum then __lg")]);
        let d = parse_weapon_change_dispatch(&aliases).expect("parsed");
        assert_eq!(d.per_weapon.get("lg").map(|s| s.as_str()), Some("__lg"));
        assert!(d.else_alias.is_none());
    }

    #[test]
    fn extracts_sensitivity() {
        let aliases = aliases_from(&[(
            "__lg_settings",
            "sensitivity 2.5; crosshairimage xantom_lg; crosshaircolor 0 255 255",
        )]);
        assert_eq!(
            extract_sensitivity_from_alias("__lg_settings", &aliases),
            Some(2.5)
        );
    }

    #[test]
    fn extracts_sensitivity_through_nested_alias() {
        let aliases = aliases_from(&[
            ("__lg_settings", "_apply_lg"),
            ("_apply_lg", "sensitivity 0.8; crosshairimage lg"),
        ]);
        assert_eq!(
            extract_sensitivity_from_alias("__lg_settings", &aliases),
            Some(0.8)
        );
    }
}
