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
