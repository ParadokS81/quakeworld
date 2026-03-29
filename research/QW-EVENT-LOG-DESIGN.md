# qw-event-log — Design Document

**Purpose:** A Rust crate that consumes parsed MVD messages from vikpe's `quake` crate, maintains a game state machine, and outputs a flat `Vec<GameEvent>` of timestamped events.

**Depends on:** `quake` crate (protocol parser only — not `demo_parser`)

**Compiles to:** Native CLI + WASM (browser replayer, Cloudflare Worker)

---

## Verified Assumptions (from real MVD analysis)

Two 4on4 demos were scanned (`-s- vs ]sr[` on dm2 and dm3, March 2026):

- **Stats frames exist for ALL 8 players** — ~1,300 Stats frames per player per 20-minute match. Health, armor, ammo, weapon, and items are tracked for everyone, not just the POV player.
- **Hidden messages (DamageDone) are present** — 2,400-2,800 per match. Per-hit damage data with attacker, victim, damage amount, and weapon/death type.
- **~210,000 frames per 20-minute demo** — ~77fps server tick rate, ~13ms per frame.
- **Demo files are 13-14MB** uncompressed for a 20-minute 4on4.

---

## Architecture

```
MVD bytes
  │
  ▼
┌──────────────────────────┐
│  quake crate (vikpe's)   │  Parses binary protocol into Message structs
│  Frame iteration +       │  Handles coord/angle encoding, extensions
│  message deserialization  │
└───────────┬──────────────┘
            │  Message stream + FrameHeader timing
            ▼
┌──────────────────────────┐
│  qw-event-log crate      │  THIS BUILD
│                          │
│  GameState (internal)    │  Maintains running world model:
│  ├─ player roster [32]   │    positions, weapons, health, armor,
│  ├─ entity table [512+]  │    items, alive/dead, team frags
│  ├─ model table          │
│  ├─ item spawn registry  │  Correlates messages into semantic events:
│  └─ match clock          │    entity disappears + stat changes = pickup
│                          │
│  Output: Vec<GameEvent>  │  Chronological, Serde-serializable
└───────────┬──────────────┘
            │
            ▼
     Consumers (step 2)
     ├─ WASM in browser (web replayer)
     ├─ Cloudflare Worker (on-demand API + cache)
     ├─ CLI (batch processing)
     └─ Windowed analysis (frag diff graph, heatmaps, etc.)
```

---

## Event Types

All events carry `timestamp_ms: u64` (milliseconds from demo start, ~13ms precision from frame ticks).

Player references use `client_index: u8` (stable protocol-level ID, not name strings).

### Match Lifecycle

| Event | Fields | Source |
|-------|--------|--------|
| **MatchStart** | map, hostname, game_mode, timelimit, teams[], players[] | ServerData + UpdateUserinfo |
| **MatchEnd** | duration_ms, team_scores[], player_scores[] | Intermission |

### Combat

| Event | Fields | Source |
|-------|--------|--------|
| **Kill** | killer, victim, weapon, killer_position, victim_position | Print death messages + DamageDone |
| **PlayerDeath** | client_index, position, is_suicide | Print + UpdateFrags |
| **Spawn** | client_index, position | PlayerInfo (DEAD flag cleared + new position) |
| **DamageDealt** | attacker, victim, damage, weapon | HiddenMessage::DamageDone |

### Items & Economy

| Event | Fields | Source |
|-------|--------|--------|
| **ItemPickup** | client_index, item_type, position | Entity removal + UpdateStat correlation |
| **ItemRespawn** | item_type, position, entity_index | Entity reappearance |
| **PowerupActivated** | client_index, powerup_type | STAT_ITEMS bit change (0→1) |
| **PowerupExpired** | client_index, powerup_type | STAT_ITEMS bit change (1→0) |

### Player State

| Event | Fields | Source |
|-------|--------|--------|
| **WeaponChange** | client_index, from_weapon, to_weapon | STAT_ACTIVEWEAPON change |
| **PlayerPositions** | positions[] (all players, sampled ~2/sec) | PlayerInfo |
| **StatChange** | client_index, stat_type, old_value, new_value | UpdateStat (optional, verbose) |
| **FragCountChange** | client_index, new_frags, team, team_frags | UpdateFrags |

### Text

| Event | Fields | Source |
|-------|--------|--------|
| **ChatMessage** | client_index, message | Print (level=Chat) |
| **ConsoleMessage** | level, message | Print (all other levels) |

---

## Enums

```rust
pub enum WeaponType {
    Axe, Shotgun, SuperShotgun, Nailgun, SuperNailgun,
    GrenadeLauncher, RocketLauncher, LightningGun,
}

pub enum ItemType {
    // Armor
    GreenArmor, YellowArmor, RedArmor,
    // Health
    HealthSmall, HealthMedium, MegaHealth,
    // Weapons (as pickups)
    SuperShotgun, Nailgun, SuperNailgun,
    GrenadeLauncher, RocketLauncher, LightningGun,
    // Ammo
    ShellsSmall, ShellsLarge, NailsSmall, NailsLarge,
    RocketsSmall, RocketsLarge, CellsSmall, CellsLarge,
    // Powerups
    Quad, Pent, Ring, Biosuit,
    // Dropped on death
    Backpack,
}

pub enum PowerupType { Quad, Pent, Ring }

pub enum PrintLevel { Low, Medium, High, Chat }
```

---

## Game Rules (from KTX source code)

### Item Respawn Timers

| Item | Respawn |
|------|---------|
| Armor (GA/YA/RA) | 20s |
| Health packs | 20s |
| Mega Health | 20s after holder's health decays to ≤100 |
| Weapons | 30s |
| Ammo | 20s |
| Quad | 60s |
| Pent / Ring | 300s (5 min) |

### Mega Health Special Behavior

1. Pickup grants +100 health (up to 250 cap)
2. Health decays at 1hp/second until it reaches 100
3. MH item respawns 20s after health drops to ≤100, NOT 20s after pickup

### Powerup Durations

All 30 seconds (Quad, Pent, Ring, Biosuit).

### Weapon Damage

| Weapon | Direct | Splash | Self-splash |
|--------|--------|--------|-------------|
| RL | 110 | 120 - 0.5×dist | ×0.5 |
| GL | — | 120 - 0.5×dist | ×0.5 |
| LG | 30/tick | — | — |
| SNG | 18/nail | — | — |
| SSG | 14 pellets | — | — |
| SG | 6 pellets | — | — |
| Axe | 20 | — | — |

Quad multiplier: 4×.

### Armor Absorption

| Type | Protection | Max |
|------|-----------|-----|
| GA | 30% | 100 |
| YA | 60% | 150 |
| RA | 80% | 200 |

### Item Model Mapping

| Model path | Item |
|-----------|------|
| `progs/armor.mdl` skin 0 | Green Armor |
| `progs/armor.mdl` skin 1 | Yellow Armor |
| `progs/armor.mdl` skin 2 | Red Armor |
| `maps/b_bh25.bsp` | Health 25 |
| `maps/b_bh10.bsp` | Health 15 |
| `maps/b_bh100.bsp` | Mega Health |
| `progs/g_rock2.mdl` | Rocket Launcher |
| `progs/g_light.mdl` | Lightning Gun |
| `progs/g_nail2.mdl` | Super Nailgun |
| `progs/g_nail.mdl` | Nailgun |
| `progs/g_rock.mdl` | Grenade Launcher |
| `progs/g_shot.mdl` | Super Shotgun |
| `progs/quaddama.mdl` | Quad Damage |
| `progs/invulner.mdl` | Pentagram |
| `progs/invisibl.mdl` | Ring of Shadows |
| `progs/suit.mdl` | Biosuit |

---

## State Machine Internals

### GameState (not serialized — internal mutable accumulator)

```
GameState
├── elapsed_ms: u64              # accumulated from FrameHeader.duration_ms
├── model_table: Vec<String>     # model index → model path (from ModelList)
├── players: [Option<PlayerState>; 32]
│   └── PlayerState
│       ├── name, team, colors
│       ├── alive: bool
│       ├── position: Position {x, y, z}
│       ├── weapon: WeaponType
│       ├── health, armor: i32
│       ├── shells, nails, rockets, cells: i32
│       ├── items_bitfield: u32  # IT_* flags (weapons + powerups held)
│       └── frags: i32
├── entities: Vec<EntityState>   # entity index → state
│   └── EntityState
│       ├── active: bool
│       ├── model_index: u8
│       ├── position: Position
│       └── skin_num: u8
├── item_spawns: HashMap<u16, ItemSpawnInfo>  # entity_index → item type + position
├── team_frags: HashMap<String, i32>
└── last_position_sample_ms: u64
```

### Processing Flow (per frame)

```
1. Read FrameHeader → accumulate elapsed_ms
2. If hidden message frame → handle DamageDone, UserCommandWeapon
3. If Stats frame → route UpdateStat to target client_index
4. If regular frame → process all messages:
   - ServerData       → init map, hostname, extensions, model table
   - ModelList         → build model string table
   - UpdateUserinfo    → update player roster
   - UpdateStat        → update player stats, detect weapon/powerup changes
   - UpdateFrags       → update frags, detect kills
   - PlayerInfo        → update positions, detect death/spawn (DEAD/GIB flags)
   - PacketEntities    → update entity table, detect item pickup/respawn
   - SpawnBaseline     → register item spawn positions
   - Print             → parse for kill messages, emit chat/console
   - Intermission      → emit MatchEnd
5. Position sampling: if 500ms since last sample → emit PlayerPositions
```

### Kill Detection (dual strategy)

1. **Print messages** — parse KTX obituary patterns:
   - `"{victim} was railed by {killer}"` → LG
   - `"{victim} rides {killer}'s rocket"` → RL
   - `"{victim} was gibbed by {killer}"` → RL
   - ~30 patterns covering all weapons and suicide types

2. **DamageDone hidden messages** — exact damage, attacker entity, victim entity, death type code. More reliable when available (MVD1 extension). Entity index = client_index + 1 for players.

Both strategies are implemented; DamageDone preferred when available.

### Item Pickup Detection

Correlate three signals within the same frame:
1. Entity with item model index disappears (REMOVE flag or stops appearing)
2. Nearby player's stats change (armor increases, ammo increases, etc.)
3. Player position is close to entity's last known position

For powerups: simpler — watch STAT_ITEMS bitfield for IT_QUAD/IT_INVULNERABILITY/IT_INVISIBILITY bit changes.

---

## Public API

```rust
/// Parse MVD demo bytes into a chronological event log.
pub fn parse_demo(bytes: &[u8]) -> Result<Vec<GameEvent>, ParseError>;

/// Parse with custom options.
pub fn parse_demo_with_options(
    bytes: &[u8],
    options: &ParseOptions,
) -> Result<Vec<GameEvent>, ParseError>;

pub struct ParseOptions {
    /// Position sample interval in ms. Default: 500 (2/sec). 0 = disabled.
    pub position_sample_interval_ms: u64,
    /// Emit StatChange events (verbose). Default: false.
    pub emit_stat_changes: bool,
    /// Emit ConsoleMessage events. Default: true.
    pub emit_console_messages: bool,
}
```

WASM entry point behind `#[cfg(feature = "wasm")]`:
```rust
#[wasm_bindgen]
pub fn parse_demo_wasm(bytes: &[u8]) -> Result<JsValue, JsValue>;
```

---

## Module Structure

```
qw-event-log/
  src/
    lib.rs               # pub API: parse_demo(), re-exports
    types.rs             # Position, WeaponType, ItemType, PowerupType, enums
    events.rs            # GameEvent enum + all event structs
    state.rs             # GameState, PlayerState, EntityState (pub(crate))
    parser.rs            # Frame loop, message dispatch
    kills.rs             # Kill detection (print parsing + DamageDone)
    items.rs             # Item identification (model table), respawn logic
    death_messages.rs    # KTX obituary pattern table
    error.rs             # ParseError
    wasm.rs              # WASM entry point (feature-gated)
  Cargo.toml
```

### Dependencies

```toml
[dependencies]
quake = { path = "../quake" }
serde = { version = "1", features = ["derive"] }

[features]
default = []
wasm = ["dep:wasm-bindgen", "dep:serde-wasm-bindgen"]
```

---

## Output Format

Events serialize as tagged JSON via `#[serde(tag = "type")]`:

```json
{"type": "MatchStart", "timestamp_ms": 0, "map": "dm2", "hostname": "Berlin KTX #3", ...}
{"type": "ItemPickup", "timestamp_ms": 5200, "client_index": 3, "item": "RedArmor", "position": {"x": 1024.0, "y": -512.0, "z": 320.0}}
{"type": "Kill", "timestamp_ms": 8400, "killer": 2, "victim": 5, "weapon": "RocketLauncher", "killer_position": {...}, "victim_position": {...}}
{"type": "PowerupActivated", "timestamp_ms": 62000, "client_index": 3, "powerup": "Quad"}
{"type": "PlayerPositions", "timestamp_ms": 8500, "positions": [{"client_index": 0, "position": {...}, "weapon": "LightningGun", "alive": true}, ...]}
{"type": "DamageDealt", "timestamp_ms": 8390, "attacker": 2, "victim": 5, "damage": 110, "weapon": "RocketLauncher"}
```

---

## Estimated Output Size

Per 20-minute 4on4 demo:
- Events (kills, pickups, weapon changes, chat, damage): ~500KB-1MB JSON
- Position samples (8 players × 2/sec × 1200sec): ~2-3MB JSON
- Total uncompressed: ~3-5MB
- Total gzipped: ~400-750KB

---

## Open Questions for vikpe

1. **Coord accessor** — `Coord(f32)` inner field doesn't appear to be `pub`. We need to extract the f32 value. Options:
   - Add `pub fn value(&self) -> f32` to Coord (tiny upstream PR)
   - Or is there already an accessor/Into impl we missed?

2. **Crate location** — should this live inside the slipgate monorepo as a sibling crate (`rust/crates/qw_event_log/`), or as a separate repo that depends on `quake` via git?

3. **quake crate API stability** — are message struct fields and the frame iteration API likely to change? We depend heavily on: `FrameHeader`, `Message` enum, `PlayerInfo`, `PacketEntityDelta`, `UpdateStat`, `Print`, `HiddenMessage::DamageDone`.

4. **Frame iteration** — does the `quake` crate expose a public frame iterator for MVD files, or do we need to implement our own from the raw binary using `FrameHeader` + body reads? The current `demo_parser` crate handles this internally but the API is metadata-extraction focused.

5. **Entity-to-player mapping** — standard QW convention is entity_index = client_index + 1 for players. Is this always true in MVDSV recordings, or are there edge cases?

6. **WASM binary size** — any concerns about `binrw` codegen size in WASM builds? If the `quake` crate is too heavy for WASM, we might need a minimal MVD reader as an alternative.

---

## What This Unlocks

Data that ktxstats and QW Hub cannot provide today:

- **Spatial data** — heatmaps, position patterns, spawn point analysis
- **Temporal data** — timeline of events, momentum graphs, control phases
- **Weapon hold times** — how long each player holds each weapon
- **Powerup efficiency** — kills during quad, damage during quad, by weapon
- **Item timing accuracy** — correlate voice callouts with actual spawn times
- **Per-engagement breakdowns** — what happened in each fight
- **Voice correlation** — link transcribed comms to in-game events
