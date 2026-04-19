# ezQuake Config Parser

> **Doc type: current** — Describes the parser as actually built. Updated 2026-04-11 after the audit to reflect reality.

The Slipgate app parses ezQuake configuration files to auto-detect player settings, key bindings, weapon systems, teamplay aliases, macros, and triggers. This document covers the parser architecture, supported categories, and known edge cases.

**Related reference:** `EZQUAKE-RESOLUTION.md` for the "absent = default" pattern and resolution decision logic.

## Architecture

**Parser location**: `src-tauri/src/commands/ezquake.rs`

The parser works in stages:

1. **Lexing** — split config into lines, classify as cvar, bind, alias, exec, or skip
2. **Alias resolution** — build a map of alias name → command string
3. **Bind extraction** — build ordered list of (key, command) pairs
4. **Analysis** — derive higher-level data from raw binds/cvars (movement keys, weapon binds, etc.)

### Config loading — chain discovery

ezQuake configs often reference other files via `exec`:
```
cl_onload "exec configs/slackers_tp.cfg; exec configs/servers.cfg"
```

**The parser follows `exec` references recursively** via `walk_exec_refs()` in `src-tauri/src/commands/ezquake.rs` with cycle detection. Entry points tracked: primary config, `autoexec.cfg`, `cl_onload`, `bind`-triggered execs, and alias-triggered execs. The resolver searches in `game_dir`, `cfg_dir`, and `cfg_dir/configs/` for each referenced file. Unresolved refs (files that can't be found, often because they use `$variable` substitution) are tracked as `UnresolvedExec` entries and shown in the viewer as warnings.

## Knowledge sources

| Source | What it tells us | When to use |
|--------|-----------------|-------------|
| [ezQuake docs](https://ezquake.com/docs/) | Official command/cvar descriptions | First reference for any command |
| [ezQuake source](https://github.com/QW-Group/ezquake-source) | Exact implementation behavior | When docs are ambiguous |
| Community configs | Real-world usage patterns | For edge cases and testing |
| User (ParadokS) | Intent, use cases, QW domain knowledge | For design decisions |

## Categories

### 1. Profile & Settings (implemented)

Auto-detected from cvars:

| Field | Cvar | Default | Notes |
|-------|------|---------|-------|
| Player name | `name` | "player" | Supports QW color codes ($x, ^x) |
| Team | `team` | "" | |
| Colors | `topcolor`, `bottomcolor` | 0, 0 | 0-13 palette |
| Sensitivity | `sensitivity` | 12.0 | |
| m_yaw | `m_yaw` | 0.022 | Horizontal mouse multiplier |
| m_pitch | `m_pitch` | 0.022 | Vertical mouse multiplier. Negative = inverted Y |
| m_accel | `m_accel` | 0.0 | Mouse acceleration. >0 = accel enabled |
| FOV | `default_fov` or `fov` | 90.0 | Prefer default_fov if set |
| Resolution | `vid_width`/`vid_height` or `vid_win_width`/`vid_win_height` | desktop | Depends on `vid_fullscreen` |
| Refresh rate | `vid_displayfrequency` | 0 | 0 = use desktop rate |

### 2. Movement Keys (implemented)

Extracted from binds:
- `+forward`, `+back`, `+moveleft`, `+moveright`, `+jump`
- Last bind wins (ezQuake processes top-to-bottom)

### 3. Weapon Binds (implemented, v2 classifier)

Weapon-bind analysis tells the viewer "which keys fire which weapons, and how". Per weapon, the user may see multiple firing paths (a dedicated quickfire key plus a manual-select rebind plus the engine default 1-8 fallback). The classifier emits a flat `Vec<FiringPath>` and the UI groups by weapon at render time.

**Implementation:** `src-tauri/src/commands/weapon_classifier.rs`. Public entry point `classify_firing_paths(bindings, aliases, cvars) -> Vec<FiringPath>`. The module-level doc comment points at the design spec and the shared domain-knowledge reference below.

**Domain knowledge source of truth:** `packages/qw-knowledge/weapon-scripts/README.md`. That doc defines generic vs weapon-specific fire keys, the `+fire` / `+fire_ar` commands, priority-chain semantics, and the non-combat pattern catalogue. This section summarizes only what the parser needs; the README is the reference.

**Design spec:** `docs/superpowers/specs/2026-04-13-weapon-classifier-v2-design.md` is authoritative for rule numbering and terminology.

#### Firing path shapes

A `FiringPath` names one weapon plus one of three shapes:

| Shape | When emitted | Player experience |
|---|---|---|
| **Quickfire** | Press body both selects a weapon AND fires (`+attack` / `+fire` / `+fire_ar`, inline or via alias) | One keypress, weapon fires |
| **Manual-select** | Press body persistently rebinds a fire key to a weapon-specific fire, OR selects a weapon without firing while a generic fire key exists | Two keypresses. Select sticks until overridden |
| **Manual-hold** | `+alias` / `-alias` pair where the press body rebinds a fire key and the release body rebinds the same target (reverting it) | Two keypresses. Select is valid only while the trigger is held |

Data model (see the source file for the full types):

- `Method` = `Quickfire | Manual`
- `ManualFlavor` = `Select | Hold` (set only when `method == Manual`)
- `PathSource` = `Explicit | EngineDefault` (UI dims the engine defaults)
- `Mechanism` = `PlusFire | PlusFireAr | WeaponAttack | ImpulseAttack | PreselectWeapon | PreselectImpulse | RebindFireKey | HoldModifierRebind | GenericFireKey`
- `trigger_key` is the key the player physically presses first. `fire_key` is set only for manual paths.
- `origin_alias_chain` records the resolve trace for tooltips and regression-diff snapshots.

#### ezQuake weapon commands

**`weapon N [N2 N3...]`** - Select weapon with priority fallback. Respects `cl_weaponpreselect`.
```
weapon 7 3 2    // Try RL, then SSG, then SG
```

**`impulse N`** - Immediately select weapon N. Old-school, no fallback, no preselect support.
```
impulse 7       // Select RL
```

**`+fire N [N2 ...]` / `+fire_ar N [N2 ...]`** - Quickfire: select and fire in one action. `+fire_ar` is the anti-rollover variant. See `packages/qw-knowledge/weapon-scripts/README.md` for the behavioral difference.

**Priority chains anchor to the first weapon.** `bind q "weapon 7 5 3 2 1"` is classified as selecting RL; the rest are cascade fallbacks (runtime engine behavior, not player choice) and do not produce separate firing paths. The full chain is preserved in `origin_alias_chain` for the expanded row.

**Impulse → weapon mapping:**
```
1=Axe  2=SG  3=SSG  4=NG  5=SNG  6=GL  7=RL  8=LG
```

#### Weapon-related cvars

| Cvar | Default | Effect on parser |
|------|---------|-----------------|
| `cl_weaponpreselect` | 0 | 1+ tags bare `weapon N` binds with `Mechanism::PreselectWeapon` in Rule 4. Does not change quickfire/manual classification. |
| `cl_weaponhide` | 0 | 1+ = auto-switch to SG/axe after firing. Affects which weapon is "held" but not classification. |
| `cl_weaponhide_axe` | 0 | Use axe instead of SG for hide. |
| `cl_weaponforgetorder` | 0 | 1 = weapon command picks best at time of command, not best-available tracking. |
| `w_switch` | 8 | Auto-switch threshold on weapon pickup. 2 = don't auto-switch to anything above SG. |
| `b_switch` | 8 | Auto-switch threshold on backpack pickup. |

Only `cl_weaponpreselect` flows into the classifier output (via the mechanism tag). The rest are gameplay context the profile surfaces separately.

#### Architecture

`classify_firing_paths` runs four passes:

1. **`classify_fire_keys`** - walk every bind, resolve the press body, and partition keys into `generic_fire_keys` (bare `+attack` / `+fire` / `+fire_ar`, no weapon selection) and `weapon_specific_fire_keys` (both select and fire, e.g. `bind mouse1 +rocket`). This distinction drives Rule 4: a select-only bind has no functional manual path if the config has no generic fire key.
2. **Per-bind rule dispatch** - `extract_paths_from_resolved` applies rules 1 through 6 to each resolved binding after running the exclusion gates. Rule 1 emits quickfire paths. Rule 2 emits manual-select / manual-hold via inline `bind` rebinds inside the press body, with Rule 3 picking Hold when the release body also rebinds the same target. Rule 4 emits manual-select for bare select-only binds paired against each generic fire key, with Rule 5 tagging the mechanism as `PreselectWeapon` when `cl_weaponpreselect != 0` and the body is a bare `weapon N ...`. Rule 6 (weapon-specific fire keys as standalone quickfires) falls out of Rule 1 naturally via alias resolution.
3. **`emit_engine_defaults`** - Rule 7. For every number key 1-8 not explicitly bound and every generic fire key that exists, emit a Manual-Select path with `source = EngineDefault`. Skipped entirely if no generic fire key exists.
4. **`suppress_contested_quickfires`** (post-pass) - count manual-select paths per `fire_key` (case-insensitive). For any fire key rebound by 2+ manual-select paths, drop any standalone Quickfire path whose `trigger_key` is that key. Rationale: with 2+ persistent rebinds the key's at-rest state is whichever trigger cfg_save happened to save last, not a deliberate quickfire. N=1 is left alone (coherent "default + one contextual override"). Manual-hold rebinds revert on release and do not contribute to contention.

#### Exclusion gates

Applied before per-bind rule dispatch. Rule 2 additionally re-runs the rocket-jump and kill-me gates on the rebind destination so mode-toggle patterns (e.g. hangtime's `enablerj` flipping mouse1 between `+rocket` and `+jumprocket`, where the outer body has no `+jump` but the destination does) do not slip past:

| Gate | Predicate | Drops |
|---|---|---|
| **Rocket jump** | `is_rocket_jump` - body contains fire AND `+jump` | Movement scripts like `bind shift "weapon 7;+attack;+jump"` |
| **E1 Kill-me name** | `matches_killme_name` - any step in `origin_chain` contains `kill_me` / `killme` / `kill.me` | `__kill_me`, `.msg.kill.me.rl`, etc. |
| **E2 Kill-me text** | `contains_killme_text` - one-level alias walk reaches a `say` / `say_team` whose message contains "kill me" (after stripping QW color codes) | Teamsay announcements with literal "kill me" text |
| **E3 Announce without fire** | `is_announce_without_fire` - selects a weapon, reaches `say` / `say_team`, has no fire path and no rebind | Location-announce binds that happen to select a weapon |
| **E4 Long impulse scan** | `is_long_impulse_scan` - 4+ sequential `impulse N` / `weapon N` numbers with no fire | Pack-drop scans like `impulse 7 8 6 5 3 5 4` |

#### Known patterns

**Mouse1 rebind system** (ParadokS, Mazer): Mouse1 is a universal fire button that multiple triggers rebind. With 2+ rebinds, the post-pass `suppress_contested_quickfires` correctly drops the spurious "MOUSE1 is a quickfire for whatever cfg_save left behind" path and the real firing paths show up on each rebinding trigger.

**Quickfire with rebind** (ParadokS's C/V hybrid): `+boom = "weapon 2;+attack;bind mouse1 +boom"` fires immediately (Rule 1 emits Quickfire) AND persistently rebinds Mouse1 for continued firing (Rule 2 emits Manual-Select with `fire_key = mouse1`). Both paths appear under SSG in the UI.

**at-system** (Mazer): `at7 = "impulse 7;bind mouse1 +go7"` is a specific case of Rule 2 manual-select via persistent rebind - the at-key itself does not fire, so no Quickfire path is emitted.

**Pack-drop scans** are handled by exclusion gate E4 (long impulse scan), independent of alias name.

**Legacy default number-key binds** are handled by Rule 7 (`emit_engine_defaults`) rather than being filtered in the classifier - an explicit `bind 7 "impulse 7"` written by the player is Rule 4 Explicit, the engine fallback is Rule 7 EngineDefault, and the UI can dim or collapse the latter.

#### Per-weapon modifier triggers (implemented 2026-04-16)

Modifier cvars that change when the active weapon changes can be applied two ways, and the parser catches both:

1. **Oldschool inline injection** - `alias +shaft "weapon 8; sensitivity 0.8; +attack"` sets sens as part of the bind alias chain. Visible from walking the press body, so the Config Viewer's chain expansion already shows it. The `-shaft` release body (paired automatically - see below) typically restores the baseline.
2. **Engine-triggered dispatch** - `alias f_weaponchange "if 8 == $weaponnum then __lg_settings else __default_settings"` is an ezQuake trigger alias the engine runs on every weapon change. The dispatched alias (`__lg_settings`) sets modifier cvars. Invisible to bind-chain walking - a separate parser handles it.

**Implementation:** `src-tauri/src/commands/weapon_triggers.rs`. `parse_weapon_change_dispatch(&aliases)` returns `WeaponChangeDispatch { per_weapon: HashMap<String, String>, else_alias: Option<String> }` - weapon-name → dispatched alias, plus the fallback branch. Handles binary `if N == $weaponnum then A else B`, chained `else if`, operand reversal, and `if` without `else`. `extract_sensitivity_from_alias(name, &aliases)` recursively walks the dispatched body (depth-limited, visit-guarded) to pull `sensitivity N` out of nested alias calls.

**Exposed fields** (on both `EzQuakeConfig` and `ChainBindClassification`):
- `weapon_change_dispatch: Option<WeaponChangeDispatch>` - raw parse, consumed by the Config Viewer's "When {WEAPON} active" modifier block per weapon row.
- `sensitivity_baseline: Option<f64>` - pulled from the else-branch's alias when it sets sensitivity. Supersedes the top-level `sensitivity` cvar as the baseline for the LG-vs-base comparison in the profile tooltip and the modifier block. When both top-level cvar and else-branch sens exist and disagree, the else-branch value wins because it's what actually runs for every non-specific weapon.

**LG sensitivity detection** on `EzQuakeConfig.lg_sensitivity` runs both paths: the oldschool scan (lines ~1455 of `ezquake.rs`) finds `sensitivity N` in alias bodies that also reference `weapon 8` / `+fire 8`; the trigger-dispatch fallback (via `weapon_triggers`) catches Xantom-style configs where the LG sens lives inside `__lg_settings` dispatched by `f_weaponchange`. The two are complementary - oldschool covers inline injection, trigger-dispatch covers hidden dispatch.

#### `+alias` / `-alias` pair rendering (frontend)

When the Config Viewer's weapon-binds expanded view walks an alias chain and encounters a `+X` alias at any depth, it automatically pairs `-X` (when defined) right after `+X`'s subtree at the same indent depth. This surfaces release-side cvar restoration (e.g. `-shaft` reverting sensitivity to 1) that would otherwise be invisible because only the press alias is reachable from the bind body. Implemented in `buildChainBlocks` in `ConfigDomainBinds.tsx`.

### 4. Teamsay binds (implemented)

Team communication binds are now classified by category. The `analyze_teamsay_binds()` function in `ezquake.rs` scans binds for commands that invoke teamsay aliases and categorizes them into:

| Category | Examples |
|---|---|
| **status** | report armor/health/weapon/ammo |
| **death** | announce own death, request help |
| **movement** | "on my way", "coming", "back" |
| **items** | mega, yellow armor, red armor, pent |
| **enemy** | spotted, hear them, location |
| **orders** | teammate commands (attack, defend, hold) |
| **powerups** | pent/quad pickup announcements |
| **confirm** | yes/no/ok/gl/gg |
| **custom** | anything that doesn't fit the above |

Detection uses substring matching on the command body after alias resolution (e.g., commands containing `tp_name_rl` + `$x5` patterns). `tempalias` with `if`/`then`/`else` conditional logic is NOT resolved — the parser sees the literal conditional command and classifies by the observable substrings.

**Custom fallback with content-derived labels.** When a bind does not match any canonical pattern, it previously collapsed under a single `(custom, say_team)` row. Now `classify_say_team()` falls through to `first_say_team_body()` which extracts the readable message content (stripping the `say_team` prefix and leading `$<var>` sender tokens) and uses it as a per-bind label, truncated to 40 chars with `...` suffix if needed. This prevents 8 distinct custom binds from collapsing into one display row.

**Powerup keyword heuristic.** Before falling through to `custom`, the fallback path runs `has_powerup_keyword()` which whitespace-tokenizes the message, strips leading/trailing punctuation from each token, and case-insensitively compares against `{powerup, quad, pent, penta, ring, eyes}`. If any token matches exactly, the bind is promoted from `custom` to `powerups` with the same content-derived label. The whitespace tokenization is deliberate — it keeps compound callouts like `PENT/LIFT` and `RA-PATH` out of the match (the slash-joined tokens never compare equal to the bare keywords), so path/order callouts correctly stay in `custom`.

### 5. Modifier-combo bind synthesis (moved to Rust)

Modifier-combo handling used to live on the frontend as `synthesizeModifierWeaponBinds` / `synthesizeModifierTeamsayBinds` helpers in `configMerger.ts`. Those were deleted when the v2 weapon classifier landed. Modifier combos are now emitted natively by Rule 2 (inline-rebind detection) in `weapon_classifier.rs`, which traces `+alias` / `-alias` press and release bodies to distinguish manual-select from manual-hold. See `extract_paths_from_resolved` for the detail.

### 6. Aliases (implemented)

All aliases from the chain are flattened with last-write-wins semantics (later files override earlier ones). Tracked per source file so the viewer can show which config defined each alias.

### 7. Macros (implemented)

Macros here means teamplay-adjacent variables — `tp_name_*`, `tp_need_*`, `loc_*_name`, etc. — plus user-declared variables via `set`, `set_tp`, `set_calc`. The viewer organizes these into groups (Item Names, Item Need Amounts, Location Names, Teamplay Communications, User Created) and tracks which are customized vs at defaults. The `ConfigTeamplayMacros` component additionally extracts `$variable` references from aliases reachable via teamsay binds to show which macros are actually consumed by the user's bind setup.

### 8. Triggers (implemented)

ezQuake has two trigger systems:

| System | Purpose | Examples |
|---|---|---|
| **`f_*` (client-side)** | Local events | `f_spawn`, `f_death`, `f_newmap`, `f_reloadstart` |
| **`on_*` (server-side, gated)** | Server-sent events | `on_enter`, `on_connect`, `on_matchstart`, `on_matchend` |

The viewer shows both groups with expandable guides. It also parses any `infoset` alias found in the config — `infoset` uses `cmd info ev X` where X is a bitmask specifying which `on_*` triggers the server should send to this client, and the viewer decodes the bitmask to show which triggers are active. Some triggers are flagged as "restricted" (can't use teamplay macros under competitive rulesets) — the viewer shows those badges.

### 9. Command invocations (implemented 2026-04-12/13)

Command invocations are a first-class parsed category alongside cvars, aliases, and binds. Previously the parser discarded them via a `skip_commands` list; now it captures them into `ParsedConfig.command_invocations` and propagates through `ConfigFile` and `EzQuakeConfig`.

**What counts as a command invocation:**
- Lines beginning with `+` or `-` (press/release action commands like `-moveup`, `+attack`)
- Lines whose first token is in the hardcoded `stateful_commands` list: `floodprot`, `mapgroup`, `skygroup`, `filter`, `hud_recalculate`, `sb_sourcemark`, `sb_sourceunmarkall`, `unbind`, `unbindall`, `unaliasall`, `tp_pickup`, `tp_took`, `tp_point`

**Known limitation:** the Rust parser's `stateful_commands` list is a tiny subset of the authoritative ezQuake commands database (which lives in `packages/qw-config/src/data/ezquake-commands.json` with 443 live commands). Any command not in the Rust list gets misclassified as a cvar assignment. This is intentional — plumbing the full database into Rust would require a larger refactor. False positives can be fixed by extending the list.

**The TypeScript side has the authoritative database.** `configMerger.ts` `categorizeBinds` now rewrites bind detection to use `ezquakeCommandSet` and `ktxCommandSet` loaded from qw-config. The hardcoded 65-command set was deleted. New bind categories: `"ktx"` (KTX server-mod commands), `"unresolved"` (not found in any source).

### 10. Future categories (still open)

- **HUD layout** — extract `hud_*` cvars for HUD visualization
- **Visual settings** — `r_drawflat`, `gl_picmip`, particle settings
- **Network settings** — `rate`, `cl_c2sdupe`, `cl_timeout`

## Test configs

| Player | File | Characteristics |
|--------|------|----------------|
| ParadokS | `C:\Games\QuakeWorld\...\config.cfg` | Mouse1 rebind, quickfire GL/SSG/SG, weaponpreselect+weaponhide, slackers_tp.cfg reference |
| Mazer | `C:\Users\Administrator\Downloads\mazer.cfg` | Doom2-era layout, Mouse2=forward, at1-8 system, self-contained |
| BLooD_DoG | (shared in Discord) | Weapon binds in separate fire_ar.cfg, wreg system, Mouse3=forward |

## Edge cases and limitations

- **Conditional aliases**: `tempalias` with `if`/`then`/`else` not resolved (used for teamplay, not weapon binds)
- **Runtime state**: some binds change during gameplay (e.g., mouse1 rebinding). Parser sees config-save-time state.
- **Custom mods**: TF, CTF, and other mods may have different impulse mappings
- **wreg system**: high-ping weapon switching uses `wreg_` aliases — not yet parsed
