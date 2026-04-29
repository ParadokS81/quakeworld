# State Management - Slipgate App

## How state works

State lives in two layers that do NOT automatically sync with each other:

1. **Persistence layer** - `tauri-plugin-store` writing to `profile.json` in the app's local data dir. Managed by `src/store.ts`. Has autoSave enabled (writes to disk on every `store.set()`). This is a key-value file store, not a database.

2. **Reactivity layer** - SolidJS `createSignal` calls in `src/App.tsx`. Each major data piece (profile, specs, config, configSource, compareSource, monitor) is a separate signal. App.tsx owns all signals and passes them as props to tab components.

There is no global store pattern (no Zustand, no SolidJS `createStore`, no context providers). The entire app uses vanilla `createSignal` in App.tsx.

## The critical rule

**Calling a store.ts update function does NOT update the UI.** The store functions (`updatePrimaryHardware`, `updatePrimaryClient`, `updateIdentity`, etc.) write to `tauri-plugin-store` and return the updated `ProfileData`. The caller must *also* call the corresponding signal setter (`setProfile(...)`) with the returned value for SolidJS reactivity to fire.

Pattern:
```typescript
const updated = await updatePrimaryHardware({ dpi: 800 });
setProfile(updated);
```

If you skip the `setProfile(updated)` call, the data persists to disk but the UI shows stale values until the next full reload.

This is because `tauri-plugin-store` lives outside SolidJS's reactivity system. The two layers are bridged manually, not automatically.

## Store shape

The single persisted key is `"profile"` containing a `ProfileData` object:

```
ProfileData {
  identity:     ProfileIdentity    // discord, qw_name, team, nationality, colors
  setups:       Setup[]            // currently only setups[0] used
  equipment_history: EquipmentEntry[]  // parked, not wired to UI yet
  prefs:        ProfilePrefs       // map_backdrop + ConfigKeyboardPanel toggles
                                   //   (visible, show_movement, show_weapons, show_teamplay)
                                   //   + config_keyboard_right_module (nav|numpad|mouse)
                                   //   + profile_keyboard_right_module (nav|numpad)
                                   //   + config_right_panel_mode (keyboard|state)
                                   //   + simulator: SimulatorPrefs
                                   //   + alias_chain_mode (pretty|raw) - default pretty
                                   //   + alias_chain_resolver (label|simulator) - default label
}

Setup {
  name: string            // "Desktop"
  primary: boolean
  client: ClientInfo      // exe_path, config_name, version, update_channel
  hardware: SetupHardware // dpi, mouse/mousepad/keyboard, grip/aim, overrides
  quake_dirs: QuakeDirEntry[]  // Phase 3.5b D9: registered quake dirs (0 or 1
                                //   entries today, plural-shaped for future
                                //   Tier-3 multi-dir / clean-room migration roles)
}

QuakeDirEntry {
  path: string
  role: "primary"         // role-string union extends in future arcs
                          //   ("secondary-readonly", "profile", etc.)
  label?: string          // optional user-facing name
}

SimulatorPrefs {
  version: 1              // schema tag for future migration
  currentState: PlayerState  // working-copy state for the simulator panel
  templates: SimulatorTemplate[]  // saved named snapshots of currentState
}
```

`PlayerState` contains `Set<Weapon>` and `Set<Powerup>` fields which do not survive
`JSON.stringify`. Store.ts's `serializePlayerState` / `deserializePlayerState`
helpers normalize them to Array on write and back to Set on read. Applies to
both `currentState` and every template's `state`.

Template CRUD lives alongside the other `updateX` helpers in store.ts:
`updateSimulatorState`, `saveSimulatorTemplate` (silent overwrite by name),
`loadSimulatorTemplate`, `deleteSimulatorTemplate`, `resetSimulatorState`.
Consumers are `useKeyboardPanelState` (state panel signal plumbing) and
`StatePanel.tsx` (UI).

All fields except `topcolor`/`bottomcolor` (default 0) and `map_backdrop` (default "dm3") start null and fill in progressively as the user interacts.

## Data merge priority

Multiple sources can provide the same data point (hardware specs, display resolution, etc.). Priority from highest to lowest:

1. **User overrides** (e.g. `display_res_override`, `audio_out_override`) - saved, take priority over auto-detected
2. **Config-derived** (sensitivity, FOV, player name, colors) - re-parsed from ezQuake config every launch
3. **Auto-detected** (system specs scan) - re-scanned every launch, never persisted to store
4. **null** - not yet available

The distinction matters: auto-detected values (from `get_all_specs()`) are ephemeral and held in the `specs` signal only. User-entered values and overrides persist in the store. Config-derived values are re-read from the `.cfg` on every launch and held in the `ezConfig` signal.

## Schema migration

`migrateProfile()` in store.ts handles schema upgrades. Two migrations are live:

- **v1 to v2**: v1 had top-level `hardware` and `setup` keys. v2 introduced the `setups[]` array. Detection is by duck-typing: if `data.setups` exists and is an array, it is v2. Otherwise it is v1 and gets migrated.
- **v2 quake_dirs gain (2026-04-28, Phase 3.5b D9)**: existing v2 profiles are augmented in place with `setups[*].quake_dirs[]`. Detection is duck-typed: if `setup.quake_dirs` is an array it's already migrated; otherwise `deriveQuakeDirs()` synthesizes a single primary entry from the parent dir of `setup.client.exe_path` (when set), or empty array. No schema-version bump because the field is purely additive and consumers tolerate empty.

Known issue (from HEALTH.md): there is no `schema_version` field. When v3 arrives, `migrateProfile()` will have to duck-type v2 vs v3 unless a version field is added first. The HEALTH report recommends adding `schema_version: 2` now to prevent future ambiguity.

`migrateProfile()` also rescues `ezquake_exe_path` from an old `localStorage` key (from before the profile store existed) and migrates it into `setups[0].client.exe_path`.

### `quake_dirs[]` consumers

- `setPrimaryQuakeDir(path)` -- set or replace the primary entry on the primary setup (used by `AddClientPanel` after a successful first-launch claim per D9 case 1).
- `getPrimaryQuakeDir(profile)` -- read helper used by `AddClientPanel` to decide D9 dispatch (no-primary / matches-primary / foreign-refuse).

## Non-profile state (not persisted)

These signals live only in App.tsx memory and are re-created on every launch:

| Signal | Type | Source | When populated |
|---|---|---|---|
| `specs` | `AllSpecs` | `get_all_specs()` Tauri command | On mount |
| `monitor` | `MonitorInfo` | Tauri `currentMonitor()` API | On mount |
| `ezConfig` | `EzQuakeConfig` | `read_ezquake_config()` | On mount + on config-changed event |
| `configSource` | `ConfigSourceBundle` | `scan_local_install()` | On mount + on config-changed event |
| `compareSource` | `ConfigSourceBundle` | `scan_dropped_input()` | On file drop |

The `config-changed` Tauri event (emitted by `watcher.rs` on 500ms debounce) triggers an automatic re-parse of both `ezConfig` and `configSource`, keeping the UI in sync with on-disk config edits.

## What to watch out for

- **Store writes are fire-and-forget.** `saveProfile()` has no error handling. If the disk is full or the store file is locked, the save fails silently. See HEALTH.md R4.
- **Corrupted `profile.json` is not recoverable.** If the JSON is malformed, `loadProfile()` returns a blank default profile and the old data is gone on next save. No backup or validation layer exists.
- **`equipment_history` and `addEquipmentHistory()` are defined but nothing calls them.** The field initializes on new profiles but is never appended to. Intentionally parked for a future "gear change tracking" feature.
- **Only `setups[0]` is ever used today.** The `setups[]` array exists to support multiple setups (e.g. "Desktop" + "LAN rig") but no UI for adding or switching setups is built yet. `getPrimarySetup()` always returns the first primary or `setups[0]`.

## Files that matter

| File | Role |
|---|---|
| `src/store.ts` (269 lines) | Persistence layer: types, defaults, migration, CRUD functions |
| `src/App.tsx` (~236 lines) | Reactivity layer: all signals, mount logic, event listeners |
| `profile.json` (app local data dir) | On-disk store file, managed by tauri-plugin-store |
