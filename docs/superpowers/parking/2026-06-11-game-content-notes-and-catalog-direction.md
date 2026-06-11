# Game-content notes + the id1 content catalog -- strategic direction (2026-06-11)

**What this is:** a strategic direction surfaced in a taxonomy brainstorm during the `demand-driven-l3-concept-authoring` arc (while scoping the rank-1 `visual-projectile` demand). It is NOT yet a planned arc -- it captures a converged design so the thinking survives. Consolidates: a new game-OBJECT note axis, the missing game-content DATA layer, and the verified decisions that shaped both.

## The insight

The L3 corpus is gaining a second organizing axis. So far notes were **demand-domain** (HUD, network, demos -- ranked by FAQ demand). The weapon/powerup/movement discussion surfaced a **game-object** axis: notes organized by what the *thing* is. Game-object notes are deeper, more reusable, and feed the docs site + wiki better than narrow FAQ-slices. Both axes coexist; the rank-1 `visual-projectile` slot is **superseded** by the game-object family below (the cosmetics demand gets answered in the weapon/powerup notes, in context).

## The note family (mirrors the maps item taxonomy)

The maps `item_summary_json` already enumerates the game's content categories (dm3: `ga ra ya | mh h15 h25 bio | pent quad ring | cells shells spikes rockets | gl lg ng rl sng ssg`). The proposed notes mirror it:

- **Weapons, by ammo pair:** `sg/ssg` (shells), `rl/gl` (rockets), `ng/sng` (nails/cells), `lg` (**exists** -- `lightning-gun-customization.md`). Each note = stats + usage + customization + the projectile cosmetics for those weapons. Self-contained (platter, D3).
- **Powerups:** quad / pent / ring / suit. The `v_*cshift` tints, glow/shells, durations, dmm4; cross-links HUD icons, skins, teamplay, the dmm4 note. One note (surface is rich but bounded).
- **Resources:** armor + health + ammo, **grouped** (each item is a value or two). Includes **megahealth** (see decision below).
- **Movement & physics:** separate seed (`2026-06-11-movement-physics-note-seed.md`) -- the `pm_*` family + independent physics + interpolation.

## Verified decisions (2026-06-11)

- **Megahealth -> resources/health, NOT powerups.** Code: `item_health` + `H_MEGA` -> `healtype 2` (`ktx/src/items.c`); powerups are the separate `item_artifact_*` class. Our maps data agrees -- `mh` groups with `h15`/`h25`, not `pent`/`quad`/`ring`. Cross-link powerups for the shared "timed item you track" behavior (mega's overheal-decay is powerup-*like*, but it's HP). Deep mega-timing strategy -> wiki (D7).
- **No bare-stats "overview" note.** A pure stats table is reference data in an L3 costume. Stats live **inline** in each self-contained pair note (platter, D3). A master comparison table, if demand appears, is the signal to extract stats to L1 and render reference -- not to write an L3 stats-note.
- **Weapon stats are L1-class facts, currently un-extracted.** They live in QC game code, not the engine C we walked. Because id1 stats are **frozen**, authoring them into the L3 note (verified + cited from QC, e.g. `combat.c:line`) is a defensible permanent choice, not just an interim. Trigger to graduate to L1 gameplay data: mode/mod variation (KTX tweaks) making the stats vary.
- **Resources grouping confirmed by the maps data** -- armor/health/ammo are exactly the non-weapon, non-powerup keys, each data-light.

## The data gap -> a future "id1 game-content catalog" arc

We have: engine/config L1 (cvars/commands/macros/protocol/QC-builtins, from engine C); **maps** (254, rich -- item/spawn/class summaries from BSPs); KTX gameplay mechanics (modes/rules). We **lack** a base-game content catalog: **weapons / armor / items / monsters as first-class objects with properties** (damage, absorption, values, behavior). The maps *reference* this content (`class_counts_json` knows `item_health`, `weapon_rocketlauncher`) but nothing *defines* it.

That data lives in **QC game code** (qwprogs / `ktx/src` items.c + weapons/combat) -- never extracted. It is **finite, frozen, and extractable**, and high-leverage:
- the **data foundation** under the game-object notes (they reference rows instead of prose);
- **joins to maps** -- "dm3 has 3 megas" (maps) x "mega = 100hp, overheal-decays" (catalog) = answers neither has alone;
- feeds the docs reference layer + the wiki.

This is its **own arc** (L1 game-content extraction), distinct from the player-help L3 authoring.

## Guardrails

- **D7 (the main risk):** weapon/powerup notes carry "a bit of strategy" -- keep it **grounded role** ("RL does 100+splash -> area/combo weapon"), push tactics (rocket-jump routes, switch combos, map usage, mega timing) to the **wiki**. Guides, not strategy guides.
- **DRY:** the trail/particle mechanism (`gl_part_*`) is shared by rocket + nail trails -- explain once in rl/gl, cross-link from ng/sng. The "timed item tracking" behavior is shared by mega + powerups -- cross-link, don't duplicate.
- **weapon-scripts boundary:** `weapon-scripts.md` owns binding/switching; the per-weapon notes own the weapon itself. Cross-link.
- **Self-contained (D3):** each note answers its object fully in one retrieval; no hub/overview dependency.

## Sequencing (probe-first, don't build blind)

1. **Author `rl/gl` first** -- it ships the rank-1 rocket demand AND is the **schema probe**: it reveals exactly which stats, in what shape, the notes need. Stats authored from QC source, in prose.
2. **Then the content-catalog arc**, scoped by what rl/gl proved (not a guessed-up-front model). "Working prototype forces contact with reality."
3. **Remaining game-object notes** reference the catalog; rl/gl gets a light prose-stats -> data refactor.

## Scope framing

Not creep -- **bounded foundational completion.** The game's content is a closed set (the maps item taxonomy enumerates it); the family + catalog have a real DONE, unlike endless FAQ-chasing.

## Memory-worthy

"The L3 corpus has two axes: demand-domain notes + game-object notes; a finite id1 game-content catalog (weapons/armor/items/monsters from QC, joins to maps) is the missing data foundation under the game-object notes." Worth a project memory once the first weapon note + the catalog arc firm it up.
