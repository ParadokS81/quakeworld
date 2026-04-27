import { load, type Store } from "@tauri-apps/plugin-store";
import type { KeyboardRightModule } from "./components/keyboardModules";
import type { PlayerState } from "./lib/simulator/types.js";
import { createDefaultPlayerState } from "./lib/simulator/defaults.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClientInfo {
  name: string;              // "ezQuake"
  exe_path: string | null;
  config_name: string | null;
  version: string | null;    // "3.6.6.7947" from PE FileVersionRaw
  update_channel: "stable" | "snapshot";  // default "stable"
}

export interface GearSelection {
  handle: string;
  brand: string;
  model: string;
}

export interface SetupHardware {
  dpi: number | null;
  mouse_model: GearSelection | null;
  mousepad_model: GearSelection | null;
  keyboard_name: string | null;
  grip_style: string | null;            // palm, claw, fingertip
  aim_style: string | null;             // wrist, mixed, arm
  display_res_override: string | null;   // null = use auto-detected
  display_hz_override: number | null;    // null = use auto-detected
  audio_out_override: string | null;     // null = use auto-detected
  audio_in_override: string | null;      // null = use auto-detected
}

export interface Setup {
  name: string;
  primary: boolean;
  client: ClientInfo;
  hardware: SetupHardware;
}

export interface EquipmentEntry {
  type: "mouse" | "mousepad" | "keyboard" | "monitor" | "headset";
  name: string;
  from: string | null;   // "2024-03" or null if unknown
  to: string | null;     // null = currently using
}

export interface ProfileIdentity {
  discord_id: string | null;
  discord_username: string | null;
  discord_avatar: string | null;
  qw_name: string | null;
  team: string | null;
  nationality: string | null;
  residence: string | null;
  topcolor: number;
  bottomcolor: number;
}

export interface SimulatorTemplate {
  id: string;
  name: string;
  createdAt: number;
  state: PlayerState;
}

export interface SimulatorPrefs {
  version: 1;
  currentState: PlayerState;
  templates: SimulatorTemplate[];
}

export interface ProfilePrefs {
  map_backdrop: string;
  config_keyboard_visible: boolean;
  config_keyboard_show_movement: boolean;
  config_keyboard_show_weapons: boolean;
  config_keyboard_show_teamplay: boolean;
  /** Last-used right-slot module in the ConfigViewer keyboard panel. */
  config_keyboard_right_module: KeyboardRightModule;
  /** Last-used right-slot module in the Profile keyboard (nav or numpad only). */
  profile_keyboard_right_module: "nav" | "numpad";
  /** Which view the ConfigViewer right panel shows. */
  config_right_panel_mode: "keyboard" | "state";
  /** Pretty-render mode for expanded alias chains. */
  alias_chain_mode: "pretty" | "raw";
  /** Which %token resolver to use in Pretty mode. */
  alias_chain_resolver: "label" | "simulator";
  /** Simulator state + templates. */
  simulator: SimulatorPrefs;
  /** Which top-level view MyQuake shows. */
  my_quake_mode: "browse" | "domains";
  /** Which domain the dir browser is scoped to. */
  my_quake_domain: "clients" | "configs" | "maps" | "matches" | "assets";
  /** Hide default/unmodified entries in the dir browser. */
  browse_hide_defaults: boolean;
}

export interface ProfileData {
  identity: ProfileIdentity;
  setups: Setup[];
  equipment_history: EquipmentEntry[];
  prefs: ProfilePrefs;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_CLIENT: ClientInfo = {
  name: "ezQuake",
  exe_path: null,
  config_name: null,
  version: null,
  update_channel: "stable",
};

const DEFAULT_HARDWARE: SetupHardware = {
  dpi: null,
  mouse_model: null,
  mousepad_model: null,
  keyboard_name: null,
  grip_style: null,
  aim_style: null,
  display_res_override: null,
  display_hz_override: null,
  audio_out_override: null,
  audio_in_override: null,
};

function createDefaultSetup(): Setup {
  return {
    name: "Desktop",
    primary: true,
    client: { ...DEFAULT_CLIENT },
    hardware: { ...DEFAULT_HARDWARE },
  };
}

const DEFAULT_IDENTITY: ProfileIdentity = {
  discord_id: null,
  discord_username: null,
  discord_avatar: null,
  qw_name: null,
  team: null,
  nationality: null,
  residence: null,
  topcolor: 0,
  bottomcolor: 0,
};

const DEFAULT_PREFS: ProfilePrefs = {
  map_backdrop: "dm3",
  config_keyboard_visible: true,
  config_keyboard_show_movement: true,
  config_keyboard_show_weapons: true,
  config_keyboard_show_teamplay: true,
  config_keyboard_right_module: "nav",
  profile_keyboard_right_module: "nav",
  config_right_panel_mode: "keyboard",
  alias_chain_mode: "pretty",
  alias_chain_resolver: "label",
  simulator: {
    version: 1,
    currentState: createDefaultPlayerState(),
    templates: [],
  },
  my_quake_mode: "domains",
  my_quake_domain: "configs",
  browse_hide_defaults: false,
};

function createDefaultProfile(): ProfileData {
  return {
    identity: { ...DEFAULT_IDENTITY },
    setups: [createDefaultSetup()],
    equipment_history: [],
    prefs: { ...DEFAULT_PREFS },
  };
}

// ─── Store singleton ────────────────────────────────────────────────────────

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (!store) {
    store = await load("profile.json", { autoSave: true, defaults: {} });
  }
  return store;
}

// ─── Set<->Array serialization shims ────────────────────────────────────────

// Sets don't survive JSON.stringify. Normalize on save and load.
function serializePlayerState(s: PlayerState): unknown {
  return {
    ...s,
    ownedWeapons: Array.from(s.ownedWeapons),
    activePowerups: Array.from(s.activePowerups),
  };
}

function deserializePlayerState(raw: unknown): PlayerState {
  const fresh = createDefaultPlayerState();
  if (!raw || typeof raw !== "object") return fresh;
  const r = raw as Record<string, unknown>;
  const ownedArr = Array.isArray(r.ownedWeapons) ? r.ownedWeapons : [];
  const powerupArr = Array.isArray(r.activePowerups) ? r.activePowerups : [];
  return {
    ...fresh,
    ...r,
    ownedWeapons: new Set(ownedArr as Array<"axe" | "sg" | "ssg" | "ng" | "sng" | "gl" | "rl" | "lg">),
    activePowerups: new Set(powerupArr as Array<"quad" | "pent" | "ring" | "biosuit">),
  } as PlayerState;
}

function serializeSimulator(s: SimulatorPrefs): unknown {
  return {
    version: s.version,
    currentState: serializePlayerState(s.currentState),
    templates: s.templates.map((t) => ({
      ...t,
      state: serializePlayerState(t.state),
    })),
  };
}

function deserializeSimulator(raw: unknown): SimulatorPrefs {
  if (!raw || typeof raw !== "object") {
    return {
      version: 1,
      currentState: createDefaultPlayerState(),
      templates: [],
    };
  }
  const r = raw as Record<string, unknown>;
  return {
    version: 1,
    currentState: deserializePlayerState(r.currentState),
    templates: Array.isArray(r.templates)
      ? r.templates.map((t) => {
          const tr = t as Record<string, unknown>;
          return {
            id: typeof tr.id === "string" ? tr.id : crypto.randomUUID(),
            name: typeof tr.name === "string" ? tr.name : "unnamed",
            createdAt: typeof tr.createdAt === "number" ? tr.createdAt : Date.now(),
            state: deserializePlayerState(tr.state),
          };
        })
      : [],
  };
}

// ─── Migration from v1 schema ───────────────────────────────────────────────

/** Detect old schema (had top-level `hardware`/`setup` keys) and migrate */
function migrateProfile(data: any): ProfileData {
  // New format — has setups array
  if (data.setups && Array.isArray(data.setups)) {
    return {
      identity: { ...DEFAULT_IDENTITY, ...data.identity },
      setups: data.setups.map((s: any) => ({
        name: s.name ?? "Desktop",
        primary: s.primary ?? true,
        client: { ...DEFAULT_CLIENT, ...s.client },
        hardware: { ...DEFAULT_HARDWARE, ...s.hardware },
      })),
      equipment_history: data.equipment_history ?? [],
      prefs: {
        ...DEFAULT_PREFS,
        ...data.prefs,
        simulator: deserializeSimulator(data.prefs?.simulator),
        my_quake_mode:
          data.prefs?.my_quake_mode === "browse" ? "browse" : "domains",
        my_quake_domain: (["clients", "configs", "maps", "matches", "assets"] as const).includes(
          data.prefs?.my_quake_domain as any,
        )
          ? (data.prefs.my_quake_domain as ProfilePrefs["my_quake_domain"])
          : "configs",
      },
    };
  }

  // Old format — migrate identity + prefs, create default setup
  const profile = createDefaultProfile();
  if (data.identity) {
    profile.identity = { ...DEFAULT_IDENTITY, ...data.identity };
  }
  if (data.prefs) {
    profile.prefs = {
      ...DEFAULT_PREFS,
      ...data.prefs,
      simulator: deserializeSimulator(data.prefs.simulator),
      my_quake_mode:
        data.prefs.my_quake_mode === "browse" ? "browse" : "domains",
      my_quake_domain: (["clients", "configs", "maps", "matches", "assets"] as const).includes(
        data.prefs.my_quake_domain as any,
      )
        ? (data.prefs.my_quake_domain as ProfilePrefs["my_quake_domain"])
        : "configs",
    };
  }

  // Migrate old hardware fields if they had values
  if (data.hardware) {
    const hw = data.hardware;
    if (hw.dpi) profile.setups[0].hardware.dpi = hw.dpi;
    if (hw.keyboard) profile.setups[0].hardware.keyboard_name = hw.keyboard;
  }

  // Migrate ezQuake path from localStorage (older ClientsTab used to save there)
  try {
    const savedPath = localStorage.getItem("ezquake_exe_path");
    if (savedPath) {
      profile.setups[0].client.exe_path = savedPath;
      localStorage.removeItem("ezquake_exe_path");
    }
  } catch {
    // Not in browser context, skip
  }

  return profile;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Load the full profile, migrating from old schema if needed */
export async function loadProfile(): Promise<ProfileData> {
  const s = await getStore();
  const data = await s.get<any>("profile");
  if (!data) {
    // First launch — check localStorage for any ezQuake path to migrate
    const profile = createDefaultProfile();
    try {
      const savedPath = localStorage.getItem("ezquake_exe_path");
      if (savedPath) {
        profile.setups[0].client.exe_path = savedPath;
        localStorage.removeItem("ezquake_exe_path");
        await saveProfile(profile);
      }
    } catch { /* ignore */ }
    return profile;
  }
  return migrateProfile(data);
}

/** Save the full profile */
export async function saveProfile(profile: ProfileData): Promise<void> {
  const s = await getStore();
  const persistable = {
    ...profile,
    prefs: {
      ...profile.prefs,
      simulator: serializeSimulator(profile.prefs.simulator),
    },
  };
  await s.set("profile", persistable);
}

/** Get the primary setup from a profile */
export function getPrimarySetup(profile: ProfileData): Setup {
  return profile.setups.find(s => s.primary) ?? profile.setups[0] ?? createDefaultSetup();
}

/** Update identity fields */
export async function updateIdentity(data: Partial<ProfileIdentity>): Promise<ProfileData> {
  const profile = await loadProfile();
  profile.identity = { ...profile.identity, ...data };
  await saveProfile(profile);
  return profile;
}

/** Update the primary setup's client info */
export async function updatePrimaryClient(data: Partial<ClientInfo>): Promise<ProfileData> {
  const profile = await loadProfile();
  const setup = profile.setups.find(s => s.primary) ?? profile.setups[0];
  if (setup) {
    setup.client = { ...setup.client, ...data };
  }
  await saveProfile(profile);
  return profile;
}

/** Update the primary setup's hardware */
export async function updatePrimaryHardware(data: Partial<SetupHardware>): Promise<ProfileData> {
  const profile = await loadProfile();
  const setup = profile.setups.find(s => s.primary) ?? profile.setups[0];
  if (setup) {
    setup.hardware = { ...setup.hardware, ...data };
  }
  await saveProfile(profile);
  return profile;
}

/** Update prefs */
export async function updatePrefs(data: Partial<ProfilePrefs>): Promise<ProfileData> {
  const profile = await loadProfile();
  profile.prefs = { ...profile.prefs, ...data };
  await saveProfile(profile);
  return profile;
}

/** Add an equipment history entry (e.g. when user swaps mouse) */
export async function addEquipmentHistory(entry: EquipmentEntry): Promise<ProfileData> {
  const profile = await loadProfile();
  profile.equipment_history.push(entry);
  await saveProfile(profile);
  return profile;
}

/** Clear all stored data (logout / reset) */
export async function clearStore(): Promise<void> {
  const s = await getStore();
  await s.clear();
}

/** Update the working-copy simulator state. */
export async function updateSimulatorState(state: PlayerState): Promise<ProfileData> {
  const profile = await loadProfile();
  profile.prefs.simulator.currentState = state;
  await saveProfile(profile);
  return profile;
}

/** Save current working copy as a named template (overwrites same-name silently). */
export async function saveSimulatorTemplate(name: string): Promise<ProfileData> {
  const profile = await loadProfile();
  const sim = profile.prefs.simulator;
  const existing = sim.templates.find((t) => t.name === name);
  if (existing) {
    existing.state = structuredClone(sim.currentState);
    existing.createdAt = Date.now();
  } else {
    sim.templates.push({
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      state: structuredClone(sim.currentState),
    });
  }
  await saveProfile(profile);
  return profile;
}

/** Load a template into the working copy. Updates template's createdAt for recency ordering. */
export async function loadSimulatorTemplate(id: string): Promise<ProfileData> {
  const profile = await loadProfile();
  const t = profile.prefs.simulator.templates.find((x) => x.id === id);
  if (t) {
    profile.prefs.simulator.currentState = structuredClone(t.state);
    t.createdAt = Date.now();
    await saveProfile(profile);
  }
  return profile;
}

/** Delete a named template. */
export async function deleteSimulatorTemplate(id: string): Promise<ProfileData> {
  const profile = await loadProfile();
  profile.prefs.simulator.templates = profile.prefs.simulator.templates.filter(
    (t) => t.id !== id,
  );
  await saveProfile(profile);
  return profile;
}

/** Reset working copy to spawn defaults. Does not touch templates. */
export async function resetSimulatorState(): Promise<ProfileData> {
  const profile = await loadProfile();
  profile.prefs.simulator.currentState = createDefaultPlayerState();
  await saveProfile(profile);
  return profile;
}
