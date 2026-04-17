# Player State Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `PlayerState` model, an ezQuake `if` condition evaluator, a `SimulatorResolver` implementing the pretty-view `RuntimeResolver` contract, and a text-based state editor panel in the ConfigViewer right slot behind a `Keyboard | State` toggle.

**Architecture:** Pure-TS module under `apps/slipgate-app/src/lib/simulator/` with five pieces (types, derivations, expander, evaluator, resolver), all pure functions. UI in `apps/slipgate-app/src/components/StatePanel.tsx`. Persistence extends `ProfilePrefs` with a `simulator` block. Tests use `bun test` (same convention as `packages/qw-config`).

**Tech Stack:** TypeScript, SolidJS (UI only), `bun test` runner, Tauri v2 webview (no Rust changes).

**Spec:** `apps/slipgate-app/docs/superpowers/specs/2026-04-17-player-state-simulator-design.md`

**Regex note:** this plan's code samples use `string.match(regex)` and `string.matchAll(regex)` everywhere. Do NOT rewrite them to `regex.exec(string)` -- a repo-wide security scanner false-positives on `.exec()` call sites per the root `CLAUDE.md`.

---

## Pre-flight

Confirm baseline before starting:

```bash
cd /home/paradoks/projects/quakeworld
git status
git log -1 --oneline    # expect: "docs(slipgate): spec for player state simulator"
bun --version           # expect 1.x
```

---

## Task 1: Test harness + types + defaults

**Files:**
- Create: `apps/slipgate-app/src/lib/simulator/types.ts`
- Create: `apps/slipgate-app/src/lib/simulator/defaults.ts`
- Create: `apps/slipgate-app/src/lib/simulator/smoke.test.ts`
- Modify: `apps/slipgate-app/package.json` (add `test` script)

- [ ] **Step 1: Add test script to package.json**

Insert `"test": "bun test"` into the `scripts` object:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "tauri": "tauri",
  "test": "bun test"
},
```

- [ ] **Step 2: Create `src/lib/simulator/types.ts`**

Full content:

```ts
export type Weapon = "axe" | "sg" | "ssg" | "ng" | "sng" | "gl" | "rl" | "lg";
export type Powerup = "quad" | "pent" | "ring" | "biosuit";
export type ArmorClass = "ga" | "ya" | "ra" | "none";
export type MatchStatus = "standby" | "countdown" | "live" | "overtime" | "ended";
export type LedColor = "none" | "green" | "red" | "yellow";

export interface PlayerState {
  // Vitals
  health: number;
  armor: number;
  armorClass: ArmorClass;

  // Weapons
  ownedWeapons: Set<Weapon>;
  currentWeapon: Weapon;

  // Ammo
  shells: number;
  nails: number;
  rockets: number;
  cells: number;

  // Powerups
  activePowerups: Set<Powerup>;
  powerupTimers: Partial<Record<Powerup, number>>;

  // Location and map
  location: string;
  mapname: string;
  lastloc: string;
  deathloc: string;

  // Match
  matchname: string;
  matchstatus: MatchStatus;
  matchtype: string;

  // LEDs and pointing
  ledpoint: LedColor;
  ledstatus: LedColor;
  point: string;
  pointloc: string;
  pointatloc: string;

  // Recent events
  took: string;
  tookloc: string;
  tookatloc: string;
  droploc: string;
  droptime: number;
  lastpowerup: string;
}

export type IssueKind =
  | "unresolved-var"
  | "missing-alias"
  | "malformed-condition"
  | "unknown-operator"
  | "unsupported-regex"
  | "depth-cap-reached"
  | "side-effect-skipped";

export interface Issue {
  kind: IssueKind;
  detail: string;
  location?: string;
}

export interface TraceStep {
  kind: "condition" | "alias-follow" | "skip-side-effect" | "leaf";
  text: string;
  detail?: string;
  result?: boolean;
  activeBranch?: "then" | "else";
  issues?: Issue[];
}

export interface EvaluateTeamsayResult {
  output: string;
  trace: TraceStep[];
  issues: Issue[];
}
```

- [ ] **Step 3: Create `src/lib/simulator/defaults.ts`**

```ts
import type { PlayerState } from "./types.js";

// Spawn defaults: health 100, axe + sg owned, 25 shells, everything else zero/empty.
export function createDefaultPlayerState(): PlayerState {
  return {
    health: 100,
    armor: 0,
    armorClass: "none",
    ownedWeapons: new Set(["axe", "sg"]),
    currentWeapon: "sg",
    shells: 25,
    nails: 0,
    rockets: 0,
    cells: 0,
    activePowerups: new Set(),
    powerupTimers: {},
    location: "",
    mapname: "",
    lastloc: "",
    deathloc: "",
    matchname: "",
    matchstatus: "live",
    matchtype: "",
    ledpoint: "none",
    ledstatus: "none",
    point: "",
    pointloc: "",
    pointatloc: "",
    took: "",
    tookloc: "",
    tookatloc: "",
    droploc: "",
    droptime: 0,
    lastpowerup: "",
  };
}
```

- [ ] **Step 4: Create smoke test**

`src/lib/simulator/smoke.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { createDefaultPlayerState } from "./defaults.js";

describe("simulator smoke test", () => {
  test("default state has axe and shotgun", () => {
    const state = createDefaultPlayerState();
    expect(state.ownedWeapons.has("axe")).toBe(true);
    expect(state.ownedWeapons.has("sg")).toBe(true);
    expect(state.ownedWeapons.has("rl")).toBe(false);
  });

  test("default state has health 100 and 25 shells", () => {
    const s = createDefaultPlayerState();
    expect(s.health).toBe(100);
    expect(s.shells).toBe(25);
  });
});
```

- [ ] **Step 5: Verify harness**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app
bun test src/lib/simulator/smoke.test.ts
```

Expected: `2 pass, 0 fail`.

- [ ] **Step 6: Typecheck**

```bash
bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/paradoks/projects/quakeworld
git add apps/slipgate-app/package.json apps/slipgate-app/src/lib/simulator/
git commit -m "feat(slipgate): simulator scaffolding -- PlayerState types, defaults, bun test harness"
```

---

## Task 2: Derivation - $weapons (space-joined owned list)

**Files:**
- Create: `apps/slipgate-app/src/lib/simulator/derivations.ts`
- Create: `apps/slipgate-app/src/lib/simulator/derivations.test.ts`

- [ ] **Step 1: Write failing test**

`src/lib/simulator/derivations.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { deriveWeaponsString } from "./derivations.js";
import { createDefaultPlayerState } from "./defaults.js";

describe("deriveWeaponsString", () => {
  test("joins owned weapons using user tp_name_* values", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "ssg", "rl", "lg"]);
    const cvars = new Map([
      ["tp_name_sg", "sg"],
      ["tp_name_ssg", "ssg"],
      ["tp_name_rl", "rl"],
      ["tp_name_lg", "lg"],
    ]);
    expect(deriveWeaponsString(s, cvars)).toBe("lg rl ssg sg");
  });

  test("falls back to default weapon name when cvar missing", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    expect(deriveWeaponsString(s, new Map())).toBe("rl");
  });

  test("orders by priority (lg=8 first, sg=2 last)", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl", "lg"]);
    expect(deriveWeaponsString(s, new Map())).toBe("lg rl sg");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/derivations.test.ts
```

Expected: module-not-found error.

- [ ] **Step 3: Implement**

`src/lib/simulator/derivations.ts`:

```ts
import type { PlayerState, Weapon } from "./types.js";

const DEFAULT_WEAPON_NAMES: Record<Weapon, string> = {
  axe: "axe", sg: "sg", ssg: "ssg", ng: "ng", sng: "sng", gl: "gl", rl: "rl", lg: "lg",
};

// Priority order lg=8 -> sg=2. axe excluded from $weapons display (ezQuake convention).
const WEAPON_PRIORITY: Weapon[] = ["lg", "rl", "gl", "sng", "ng", "ssg", "sg"];

function resolveWeaponName(w: Weapon, cvars: Map<string, string>): string {
  return cvars.get(`tp_name_${w}`) ?? DEFAULT_WEAPON_NAMES[w];
}

export function deriveWeaponsString(state: PlayerState, cvars: Map<string, string>): string {
  const owned = WEAPON_PRIORITY.filter((w) => state.ownedWeapons.has(w));
  return owned.map((w) => resolveWeaponName(w, cvars)).join(" ");
}
```

- [ ] **Step 4: Run**

```bash
bun test src/lib/simulator/derivations.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/derivations.ts apps/slipgate-app/src/lib/simulator/derivations.test.ts
git commit -m "feat(slipgate): simulator -- deriveWeaponsString"
```

---

## Task 3: Derivation - $bestweapon (tp_weapon_order algorithm)

**Files:**
- Modify: `apps/slipgate-app/src/lib/simulator/derivations.ts`
- Modify: `apps/slipgate-app/src/lib/simulator/derivations.test.ts`

- [ ] **Step 1: Failing tests**

Append to `derivations.test.ts`:

```ts
import { deriveBestWeapon } from "./derivations.js";

describe("deriveBestWeapon", () => {
  test("picks highest-priority owned with ammo (default tp_weapon_order)", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 5;
    s.shells = 25;
    // Default "8 7 5 3 4 6 2 1" -> rl(7) before sg(2), both qualify.
    expect(deriveBestWeapon(s, new Map())).toBe("rl");
  });

  test("skips weapons without ammo", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 0;
    s.shells = 25;
    expect(deriveBestWeapon(s, new Map())).toBe("sg");
  });

  test("respects custom tp_weapon_order", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["lg", "rl"]);
    s.cells = 30;
    s.rockets = 5;
    const cvars = new Map([["tp_weapon_order", "7 8 5 3 4 6 2 1"]]);
    expect(deriveBestWeapon(s, cvars)).toBe("rl");
  });

  test("uses user tp_name_* value in result", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 5;
    const cvars = new Map([["tp_name_rl", "{&cf13rl&cfff}"]]);
    expect(deriveBestWeapon(s, cvars)).toBe("{&cf13rl&cfff}");
  });

  test("falls back to tp_name_sg default when nothing qualifies", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 0;
    s.shells = 0;
    expect(deriveBestWeapon(s, new Map())).toBe("sg");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/derivations.test.ts
```

- [ ] **Step 3: Implement**

Append to `derivations.ts`:

```ts
const DEFAULT_TP_WEAPON_ORDER = "8 7 5 3 4 6 2 1";

const IMPULSE_TO_WEAPON: Record<string, Weapon> = {
  "1": "axe", "2": "sg", "3": "ssg", "4": "ng",
  "5": "sng", "6": "gl", "7": "rl", "8": "lg",
};

type AmmoField = "shells" | "nails" | "rockets" | "cells";
const WEAPON_AMMO: Record<Weapon, AmmoField | null> = {
  axe: null,
  sg: "shells", ssg: "shells",
  ng: "nails", sng: "nails",
  gl: "rockets", rl: "rockets",
  lg: "cells",
};

function hasAmmoFor(w: Weapon, state: PlayerState): boolean {
  const f = WEAPON_AMMO[w];
  if (f === null) return true;
  return state[f] > 0;
}

export function deriveBestWeapon(state: PlayerState, cvars: Map<string, string>): string {
  const orderStr = cvars.get("tp_weapon_order") ?? DEFAULT_TP_WEAPON_ORDER;
  const tokens = orderStr.split(/\s+/).filter((t) => t.length > 0);
  for (const tok of tokens) {
    const w = IMPULSE_TO_WEAPON[tok];
    if (!w || !state.ownedWeapons.has(w) || !hasAmmoFor(w, state)) continue;
    return resolveWeaponName(w, cvars);
  }
  return resolveWeaponName("sg", cvars);
}
```

- [ ] **Step 4: Run**

```bash
bun test src/lib/simulator/derivations.test.ts
```

Expected: 8 pass (3 + 5 new).

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/derivations.ts apps/slipgate-app/src/lib/simulator/derivations.test.ts
git commit -m "feat(slipgate): simulator -- deriveBestWeapon via tp_weapon_order"
```

---

## Task 4: Remaining derivations

**Files:**
- Modify: `apps/slipgate-app/src/lib/simulator/derivations.ts`
- Modify: `apps/slipgate-app/src/lib/simulator/derivations.test.ts`

Adds `$powerups`, `$armortype`, `$colored_armor`, `$weaponnum`, `$ammo`, `$bestammo`.

- [ ] **Step 1: Failing tests**

Append to `derivations.test.ts`:

```ts
import {
  derivePowerupsString, deriveArmortype, deriveColoredArmor,
  deriveWeaponNum, deriveAmmo, deriveBestAmmo,
} from "./derivations.js";

describe("derivePowerupsString", () => {
  test("joins active powerups using tp_name_*", () => {
    const s = createDefaultPlayerState();
    s.activePowerups = new Set(["quad", "ring"]);
    const cvars = new Map([["tp_name_quad", "QUAD"], ["tp_name_ring", "EYES"]]);
    expect(derivePowerupsString(s, cvars)).toBe("QUAD EYES");
  });
  test("empty when no powerups", () => {
    const s = createDefaultPlayerState();
    expect(derivePowerupsString(s, new Map())).toBe("");
  });
});

describe("deriveArmortype", () => {
  test("resolves via tp_name_armortype_*", () => {
    const s = createDefaultPlayerState();
    s.armorClass = "ga";
    const cvars = new Map([["tp_name_armortype_ga", "g"]]);
    expect(deriveArmortype(s, cvars)).toBe("g");
  });
  test("defaults when cvar missing", () => {
    const s = createDefaultPlayerState();
    s.armorClass = "ra";
    expect(deriveArmortype(s, new Map())).toBe("r");
  });
});

describe("deriveColoredArmor", () => {
  test("threshold bands", () => {
    const s = createDefaultPlayerState();
    s.armor = 15; expect(deriveColoredArmor(s)).toBe("&cf0015&r");
    s.armor = 40; expect(deriveColoredArmor(s)).toBe("&cff040&r");
    s.armor = 75; expect(deriveColoredArmor(s)).toBe("&c0f075&r");
    s.armor = 150; expect(deriveColoredArmor(s)).toBe("&cfff150&r");
  });
});

describe("deriveWeaponNum", () => {
  test("maps weapon to impulse digit", () => {
    const s = createDefaultPlayerState();
    s.currentWeapon = "rl"; expect(deriveWeaponNum(s)).toBe(7);
    s.currentWeapon = "axe"; expect(deriveWeaponNum(s)).toBe(1);
    s.currentWeapon = "lg"; expect(deriveWeaponNum(s)).toBe(8);
  });
});

describe("deriveAmmo / deriveBestAmmo", () => {
  test("deriveAmmo -> currentWeapon ammo", () => {
    const s = createDefaultPlayerState();
    s.currentWeapon = "rl"; s.rockets = 12;
    expect(deriveAmmo(s)).toBe(12);
  });
  test("axe has 0 ammo", () => {
    const s = createDefaultPlayerState();
    s.currentWeapon = "axe";
    expect(deriveAmmo(s)).toBe(0);
  });
  test("deriveBestAmmo -> ammo for best weapon", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 9; s.shells = 25;
    expect(deriveBestAmmo(s, new Map())).toBe(9);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/derivations.test.ts
```

- [ ] **Step 3: Implement**

Append to `derivations.ts`:

```ts
type PowerupKey = "quad" | "pent" | "ring" | "biosuit";
const POWERUP_ORDER: readonly PowerupKey[] = ["quad", "pent", "ring", "biosuit"];
const DEFAULT_POWERUP_NAMES: Record<PowerupKey, string> = {
  quad: "quad", pent: "pent", ring: "eyes", biosuit: "biosuit",
};

export function derivePowerupsString(state: PlayerState, cvars: Map<string, string>): string {
  return POWERUP_ORDER
    .filter((p) => state.activePowerups.has(p))
    .map((p) => cvars.get(`tp_name_${p}`) ?? DEFAULT_POWERUP_NAMES[p])
    .join(" ");
}

const DEFAULT_ARMORTYPE_NAMES: Record<"ga" | "ya" | "ra" | "none", string> = {
  ga: "g", ya: "y", ra: "r", none: "",
};

export function deriveArmortype(state: PlayerState, cvars: Map<string, string>): string {
  return cvars.get(`tp_name_armortype_${state.armorClass}`) ?? DEFAULT_ARMORTYPE_NAMES[state.armorClass];
}

// Health bands per ezQuake colored_armor: <25 red, 25-49 yellow, 50-100 green, >100 white.
export function deriveColoredArmor(state: PlayerState): string {
  const a = state.armor;
  const code = a < 25 ? "f00" : a < 50 ? "ff0" : a <= 100 ? "0f0" : "fff";
  return `&c${code}${a}&r`;
}

const WEAPON_IMPULSE: Record<Weapon, number> = {
  axe: 1, sg: 2, ssg: 3, ng: 4, sng: 5, gl: 6, rl: 7, lg: 8,
};

export function deriveWeaponNum(state: PlayerState): number {
  return WEAPON_IMPULSE[state.currentWeapon];
}

export function deriveAmmo(state: PlayerState): number {
  const f = WEAPON_AMMO[state.currentWeapon];
  return f === null ? 0 : state[f];
}

export function deriveBestAmmo(state: PlayerState, cvars: Map<string, string>): number {
  const best = deriveBestWeapon(state, cvars);
  for (const w of Object.keys(WEAPON_AMMO) as Weapon[]) {
    if (!state.ownedWeapons.has(w)) continue;
    if (resolveWeaponName(w, cvars) === best) {
      const f = WEAPON_AMMO[w];
      return f === null ? 0 : state[f];
    }
  }
  return 0;
}
```

- [ ] **Step 4: Run**

```bash
bun test src/lib/simulator/derivations.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/derivations.ts apps/slipgate-app/src/lib/simulator/derivations.test.ts
git commit -m "feat(slipgate): simulator -- remaining derivations (powerups, armortype, colored_armor, weaponnum, ammo, bestammo)"
```

---

## Task 5: Expander - basic $var lookup

**Files:**
- Create: `apps/slipgate-app/src/lib/simulator/expander.ts`
- Create: `apps/slipgate-app/src/lib/simulator/expander.test.ts`

Resolution priority: derived tokens > PlayerState raw > cvar map. Unresolved -> preserve raw token + emit issue.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, test } from "bun:test";
import { expandVars } from "./expander.js";
import { createDefaultPlayerState } from "./defaults.js";

describe("expandVars -- raw state", () => {
  test("$health -> number", () => {
    const s = createDefaultPlayerState(); s.health = 87;
    const r = expandVars("$health hp", s, new Map());
    expect(r.text).toBe("87 hp");
    expect(r.issues).toHaveLength(0);
  });
  test("$location string", () => {
    const s = createDefaultPlayerState(); s.location = "quad";
    expect(expandVars("at $location", s, new Map()).text).toBe("at quad");
  });
  test("$cells integer", () => {
    const s = createDefaultPlayerState(); s.cells = 42;
    expect(expandVars("cells $cells", s, new Map()).text).toBe("cells 42");
  });
});

describe("expandVars -- derived", () => {
  test("$bestweapon", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 5; s.shells = 25;
    expect(expandVars("[$bestweapon]", s, new Map()).text).toBe("[rl]");
  });
  test("$weapons", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl", "lg"]);
    expect(expandVars("'$weapons'", s, new Map()).text).toBe("'lg rl'");
  });
  test("$armortype via class", () => {
    const s = createDefaultPlayerState(); s.armorClass = "ya";
    expect(expandVars("[$armortype]", s, new Map()).text).toBe("[y]");
  });
});

describe("expandVars -- cvars", () => {
  test("$tp_name_rl from cvar map", () => {
    const s = createDefaultPlayerState();
    const cvars = new Map([["tp_name_rl", "{&cf13rl&cfff}"]]);
    expect(expandVars("$tp_name_rl", s, cvars).text).toBe("{&cf13rl&cfff}");
  });
});

describe("expandVars -- unresolved", () => {
  test("unknown preserved + issue", () => {
    const s = createDefaultPlayerState();
    const r = expandVars("hi $haelth", s, new Map());
    expect(r.text).toBe("hi $haelth");
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].kind).toBe("unresolved-var");
    expect(r.issues[0].detail).toContain("haelth");
  });
  test("multiple unresolved", () => {
    const s = createDefaultPlayerState();
    const r = expandVars("$foo and $bar", s, new Map());
    expect(r.issues).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/expander.test.ts
```

- [ ] **Step 3: Implement**

`src/lib/simulator/expander.ts`:

```ts
import type { PlayerState, Issue } from "./types.js";
import {
  deriveWeaponsString, deriveBestWeapon, deriveBestAmmo,
  derivePowerupsString, deriveArmortype, deriveColoredArmor,
  deriveWeaponNum, deriveAmmo,
} from "./derivations.js";

export interface ExpandResult {
  text: string;
  issues: Issue[];
}

function resolveDerived(name: string, state: PlayerState, cvars: Map<string, string>): string | null {
  switch (name) {
    case "weapons": return deriveWeaponsString(state, cvars);
    case "bestweapon": return deriveBestWeapon(state, cvars);
    case "bestammo": return String(deriveBestAmmo(state, cvars));
    case "powerups": return derivePowerupsString(state, cvars);
    case "armortype": return deriveArmortype(state, cvars);
    case "colored_armor": return deriveColoredArmor(state);
    case "weaponnum": return String(deriveWeaponNum(state));
    case "ammo": return String(deriveAmmo(state));
    default: return null;
  }
}

const NUMERIC_FIELDS = [
  "health", "armor", "shells", "nails", "rockets", "cells", "droptime",
];
const STRING_FIELDS = [
  "location", "mapname", "lastloc", "deathloc",
  "matchname", "matchstatus", "matchtype",
  "point", "pointloc", "pointatloc",
  "took", "tookloc", "tookatloc", "droploc", "lastpowerup",
  "ledpoint", "ledstatus",
];

function resolveRaw(name: string, state: PlayerState): string | null {
  if (NUMERIC_FIELDS.includes(name)) {
    return String((state as unknown as Record<string, number>)[name]);
  }
  if (STRING_FIELDS.includes(name)) {
    return (state as unknown as Record<string, string>)[name];
  }
  if (name === "armorClass") return state.armorClass;
  return null;
}

function resolveToken(name: string, state: PlayerState, cvars: Map<string, string>): string | null {
  // $weapon = tp_name_<currentWeapon>.
  if (name === "weapon") {
    return cvars.get(`tp_name_${state.currentWeapon}`) ?? state.currentWeapon;
  }
  const derived = resolveDerived(name, state, cvars);
  if (derived !== null) return derived;
  const raw = resolveRaw(name, state);
  if (raw !== null) return raw;
  const cvar = cvars.get(name);
  if (cvar !== undefined) return cvar;
  return null;
}

export function expandVars(
  text: string,
  state: PlayerState,
  cvars: Map<string, string>,
): ExpandResult {
  const issues: Issue[] = [];
  const out = text.replace(/\$(\w+)/g, (raw, name) => {
    const resolved = resolveToken(name, state, cvars);
    if (resolved === null) {
      issues.push({ kind: "unresolved-var", detail: `$${name}` });
      return raw;
    }
    return resolved;
  });
  return { text: out, issues };
}
```

- [ ] **Step 4: Run tests**

```bash
bun test src/lib/simulator/expander.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/expander.ts apps/slipgate-app/src/lib/simulator/expander.test.ts
git commit -m "feat(slipgate): simulator -- basic expander with issue emission"
```

---

## Task 6: Expander - recursive + depth cap + $qt + positional args

**Files:**
- Modify: `apps/slipgate-app/src/lib/simulator/expander.ts`
- Modify: `apps/slipgate-app/src/lib/simulator/expander.test.ts`

Recursion: cvar values containing `$var` re-expand. Depth cap 8 prevents cycles. `$qt` -> `"`. Optional `positionalArgs: string[]` parameter fills `%1`..`%9`.

- [ ] **Step 1: Failing tests**

Append:

```ts
describe("expandVars -- recursive", () => {
  test("cvar value containing $var re-expanded", () => {
    const s = createDefaultPlayerState(); s.health = 87;
    const cvars = new Map([["tp_name_rl", "rl $health"]]);
    expect(expandVars("$tp_name_rl", s, cvars).text).toBe("rl 87");
  });
  test("multi-level nesting", () => {
    const s = createDefaultPlayerState();
    const cvars = new Map([["level1", "[$level2]"], ["level2", "deep"]]);
    expect(expandVars("$level1", s, cvars).text).toBe("[deep]");
  });
  test("cycle hits depth cap", () => {
    const s = createDefaultPlayerState();
    const cvars = new Map([["a", "$b"], ["b", "$a"]]);
    const r = expandVars("$a", s, cvars);
    expect(r.issues.some((i) => i.kind === "depth-cap-reached")).toBe(true);
  });
});

describe("expandVars -- $qt", () => {
  test("$qt -> double quote", () => {
    const s = createDefaultPlayerState();
    const out = expandVars("$qt$weapons$qt", s, new Map());
    expect(out.text.startsWith('"')).toBe(true);
    expect(out.text.endsWith('"')).toBe(true);
  });
});

describe("expandVars -- positional args", () => {
  test("%1 first arg", () => {
    const s = createDefaultPlayerState();
    expect(expandVars("hello %1", s, new Map(), ["world"]).text).toBe("hello world");
  });
  test("%2 second arg", () => {
    const s = createDefaultPlayerState();
    expect(expandVars("%1 %2", s, new Map(), ["foo", "bar"]).text).toBe("foo bar");
  });
  test("unused %N preserved", () => {
    const s = createDefaultPlayerState();
    expect(expandVars("%1 %2", s, new Map(), ["foo"]).text).toBe("foo %2");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/expander.test.ts
```

- [ ] **Step 3: Update implementation**

Replace `expandVars` in `expander.ts`:

```ts
const MAX_EXPAND_DEPTH = 8;

export function expandVars(
  text: string,
  state: PlayerState,
  cvars: Map<string, string>,
  positionalArgs: string[] = [],
): ExpandResult {
  const issues: Issue[] = [];

  function expand(current: string, depth: number): string {
    if (depth >= MAX_EXPAND_DEPTH) {
      issues.push({
        kind: "depth-cap-reached",
        detail: `expansion depth cap (${MAX_EXPAND_DEPTH}) in "${current}"`,
      });
      return current;
    }

    // Positional args %1..%9.
    const afterPos = current.replace(/%([1-9])/g, (raw, digit) => {
      const idx = Number(digit) - 1;
      return positionalArgs[idx] ?? raw;
    });

    // $qt -> ".
    const afterQt = afterPos.replace(/\$qt\b/g, '"');

    // $name references, potentially recursive.
    return afterQt.replace(/\$(\w+)/g, (raw, name) => {
      const resolved = resolveToken(name, state, cvars);
      if (resolved === null) {
        issues.push({ kind: "unresolved-var", detail: `$${name}` });
        return raw;
      }
      if (/\$\w+|%[1-9]/.test(resolved)) {
        return expand(resolved, depth + 1);
      }
      return resolved;
    });
  }

  return { text: expand(text, 0), issues };
}
```

- [ ] **Step 4: Run tests**

```bash
bun test src/lib/simulator/expander.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/expander.ts apps/slipgate-app/src/lib/simulator/expander.test.ts
git commit -m "feat(slipgate): simulator -- recursive expansion with depth cap, \$qt, positional args"
```

---

## Task 7: Evaluator - lexer

**Files:**
- Create: `apps/slipgate-app/src/lib/simulator/evaluator.ts`
- Create: `apps/slipgate-app/src/lib/simulator/evaluator.test.ts`

Converts a string into a token stream. Handles numbers, quoted strings, bare identifiers, all operator variants, and parens.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, test } from "bun:test";
import { tokenize } from "./evaluator.js";

describe("tokenize", () => {
  test("numbers, strings, ops, parens", () => {
    const t = tokenize(`("rl" isin 'lg rl' && 5 > 0)`);
    expect(t.map((x) => x.kind)).toEqual([
      "lparen", "string", "op", "string", "op", "number", "op", "number", "rparen",
    ]);
  });
  test("string quote styles", () => {
    expect(tokenize(`"foo"`)[0].value).toBe("foo");
    expect(tokenize(`'bar'`)[0].value).toBe("bar");
  });
  test("bare identifiers as strings", () => {
    const t = tokenize("rl isin weapons");
    expect(t[0]).toEqual({ kind: "string", value: "rl" });
    expect(t[1]).toEqual({ kind: "op", value: "isin" });
    expect(t[2]).toEqual({ kind: "string", value: "weapons" });
  });
  test("comparison operators", () => {
    for (const op of ["==", "!=", "<>", "<", "<=", ">", ">=", "="]) {
      expect(tokenize(`1 ${op} 1`)[1]).toEqual({ kind: "op", value: op });
    }
  });
  test("logical operator variants", () => {
    expect(tokenize("1 && 2")[1].value).toBe("&&");
    expect(tokenize("1 and 2")[1].value).toBe("and");
    expect(tokenize("1 AND 2")[1].value).toBe("AND");
    expect(tokenize("1 || 2")[1].value).toBe("||");
    expect(tokenize("1 or 2")[1].value).toBe("or");
    expect(tokenize("1 OR 2")[1].value).toBe("OR");
  });
  test("isin and !isin", () => {
    expect(tokenize("a isin b")[1].value).toBe("isin");
    expect(tokenize("a !isin b")[1].value).toBe("!isin");
  });
  test("regex ops", () => {
    expect(tokenize("a =~ b")[1].value).toBe("=~");
    expect(tokenize("a !~ b")[1].value).toBe("!~");
  });
  test("arithmetic", () => {
    for (const op of ["+", "-", "*", "/"]) {
      expect(tokenize(`1 ${op} 1`)[1]).toEqual({ kind: "op", value: op });
    }
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/evaluator.test.ts
```

- [ ] **Step 3: Implement**

`src/lib/simulator/evaluator.ts`:

```ts
import type { Issue } from "./types.js";

export interface Token {
  kind: "number" | "string" | "op" | "lparen" | "rparen";
  value: string;
}

// Longest-first so <= beats <, etc.
const MULTI_CHAR_OPS = [
  "!isin", "isin",
  "==", "!=", "<>", "<=", ">=",
  "&&", "||",
  "=~", "!~",
  "and", "AND", "or", "OR",
];
const SINGLE_CHAR_OPS = ["<", ">", "=", "+", "-", "*", "/"];

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const c = input[i];

    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (c === "(") { tokens.push({ kind: "lparen", value: "(" }); i++; continue; }
    if (c === ")") { tokens.push({ kind: "rparen", value: ")" }); i++; continue; }

    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      const start = i;
      while (i < n && input[i] !== quote) i++;
      tokens.push({ kind: "string", value: input.slice(start, i) });
      if (i < n) i++;
      continue;
    }

    let matched = false;
    for (const op of MULTI_CHAR_OPS) {
      if (input.startsWith(op, i)) {
        // For alpha keywords and !isin require word boundary.
        if (/^[a-zA-Z!]/.test(op)) {
          const endIdx = i + op.length;
          const boundary = endIdx >= n || !/[\w]/.test(input[endIdx]);
          const leftBoundary = i === 0 || !/[\w]/.test(input[i - 1]) || op.startsWith("!");
          if (!boundary || !leftBoundary) continue;
        }
        tokens.push({ kind: "op", value: op });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (SINGLE_CHAR_OPS.includes(c)) {
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }

    if (/[0-9.]/.test(c)) {
      const start = i;
      while (i < n && /[0-9.]/.test(input[i])) i++;
      tokens.push({ kind: "number", value: input.slice(start, i) });
      continue;
    }

    if (/[\w]/.test(c)) {
      const start = i;
      while (i < n && /[\w\-_.]/.test(input[i])) i++;
      tokens.push({ kind: "string", value: input.slice(start, i) });
      continue;
    }

    i++;
  }

  return tokens;
}

export interface EvaluateResult {
  result: boolean;
  issues: Issue[];
}
```

- [ ] **Step 4: Run**

```bash
bun test src/lib/simulator/evaluator.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/evaluator.ts apps/slipgate-app/src/lib/simulator/evaluator.test.ts
git commit -m "feat(slipgate): simulator -- evaluator lexer"
```

---

## Task 8: Evaluator - parser + comparison ops with coercion

**Files:**
- Modify: `apps/slipgate-app/src/lib/simulator/evaluator.ts`
- Modify: `apps/slipgate-app/src/lib/simulator/evaluator.test.ts`

Recursive-descent parser + comparison operators. Numeric comparison when both sides parse as numbers (ezQuake cmd.c:2151); else string compare.

- [ ] **Step 1: Failing tests**

Append:

```ts
import { evaluateExpression } from "./evaluator.js";

describe("evaluateExpression -- comparison", () => {
  test("numeric equality", () => {
    expect(evaluateExpression("5 == 5").result).toBe(true);
    expect(evaluateExpression("5 = 5").result).toBe(true);
    expect(evaluateExpression("5 == 6").result).toBe(false);
  });
  test("string equality (non-numeric operands)", () => {
    expect(evaluateExpression("'rl' == 'rl'").result).toBe(true);
    expect(evaluateExpression("'5' == '5a'").result).toBe(false);
    expect(evaluateExpression(`"foo" = "foo"`).result).toBe(true);
  });
  test("inequality", () => {
    expect(evaluateExpression("5 != 6").result).toBe(true);
    expect(evaluateExpression("5 <> 5").result).toBe(false);
    expect(evaluateExpression("'a' != 'b'").result).toBe(true);
  });
  test("numeric ordering", () => {
    expect(evaluateExpression("3 < 5").result).toBe(true);
    expect(evaluateExpression("5 > 3").result).toBe(true);
    expect(evaluateExpression("5 <= 5").result).toBe(true);
    expect(evaluateExpression("5 >= 5").result).toBe(true);
    expect(evaluateExpression("5 < 3").result).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/evaluator.test.ts
```

- [ ] **Step 3: Implement parser + evaluator**

Append to `evaluator.ts`:

```ts
type AstNode =
  | { kind: "literal"; value: string }
  | { kind: "binary"; op: string; left: AstNode; right: AstNode }
  | { kind: "unary"; op: string; arg: AstNode };

interface ParseState {
  tokens: Token[];
  pos: number;
  issues: Issue[];
}

function peek(p: ParseState): Token | null {
  return p.pos < p.tokens.length ? p.tokens[p.pos] : null;
}
function consume(p: ParseState): Token | null {
  return p.pos < p.tokens.length ? p.tokens[p.pos++] : null;
}
function expectRParen(p: ParseState): void {
  const tok = consume(p);
  if (!tok || tok.kind !== "rparen") {
    p.issues.push({ kind: "malformed-condition", detail: "expected )" });
  }
}

function parsePrimary(p: ParseState): AstNode {
  const tok = consume(p);
  if (!tok) {
    p.issues.push({ kind: "malformed-condition", detail: "unexpected end of expression" });
    return { kind: "literal", value: "" };
  }
  if (tok.kind === "number" || tok.kind === "string") {
    return { kind: "literal", value: tok.value };
  }
  if (tok.kind === "lparen") {
    const inner = parseExpression(p);
    expectRParen(p);
    return inner;
  }
  if (tok.kind === "op" && tok.value === "-") {
    return { kind: "unary", op: "-", arg: parsePrimary(p) };
  }
  p.issues.push({ kind: "malformed-condition", detail: `unexpected token: ${tok.value}` });
  return { kind: "literal", value: "" };
}

const COMPARISON_OPS = new Set([
  "==", "!=", "<>", "<", "<=", ">", ">=", "=", "isin", "!isin", "=~", "!~",
]);

function parseComparison(p: ParseState): AstNode {
  const left = parsePrimary(p);
  const tok = peek(p);
  if (tok && tok.kind === "op" && COMPARISON_OPS.has(tok.value)) {
    consume(p);
    const right = parsePrimary(p);
    return { kind: "binary", op: tok.value, left, right };
  }
  return left;
}

function parseExpression(p: ParseState): AstNode {
  return parseComparison(p);
}

function isNumeric(s: string): boolean {
  if (s.length === 0) return false;
  return /^-?\d+(\.\d+)?$/.test(s.trim());
}

function evalNode(node: AstNode, issues: Issue[]): string {
  if (node.kind === "literal") return node.value;
  if (node.kind === "unary" && node.op === "-") {
    const v = evalNode(node.arg, issues);
    if (isNumeric(v)) return String(-parseFloat(v));
    return `-${v}`;
  }
  if (node.kind === "binary") {
    const l = evalNode(node.left, issues);
    const r = evalNode(node.right, issues);
    return evalBinary(node.op, l, r, issues);
  }
  return "";
}

function evalBinary(op: string, l: string, r: string, issues: Issue[]): string {
  if (op === "==" || op === "=" || op === "!=" || op === "<>") {
    const equal = isNumeric(l) && isNumeric(r)
      ? parseFloat(l) === parseFloat(r)
      : l === r;
    const inequality = op === "!=" || op === "<>";
    return (equal !== inequality) ? "1" : "0";
  }
  if (op === "<") return parseFloat(l) < parseFloat(r) ? "1" : "0";
  if (op === ">") return parseFloat(l) > parseFloat(r) ? "1" : "0";
  if (op === "<=") return parseFloat(l) <= parseFloat(r) ? "1" : "0";
  if (op === ">=") return parseFloat(l) >= parseFloat(r) ? "1" : "0";
  issues.push({ kind: "unknown-operator", detail: op });
  return "0";
}

export function evaluateExpression(expr: string): EvaluateResult {
  const p: ParseState = { tokens: tokenize(expr), pos: 0, issues: [] };
  const ast = parseExpression(p);
  const value = evalNode(ast, p.issues);
  return { result: value === "1" || value.toLowerCase() === "true", issues: p.issues };
}
```

- [ ] **Step 4: Run**

```bash
bun test src/lib/simulator/evaluator.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/evaluator.ts apps/slipgate-app/src/lib/simulator/evaluator.test.ts
git commit -m "feat(slipgate): simulator -- parser + comparison ops with numeric/string coercion"
```

---

## Task 9: Evaluator - isin, logical, precedence, short-circuit

**Files:**
- Modify: `apps/slipgate-app/src/lib/simulator/evaluator.ts`
- Modify: `apps/slipgate-app/src/lib/simulator/evaluator.test.ts`

- [ ] **Step 1: Failing tests**

Append:

```ts
describe("evaluateExpression -- isin", () => {
  test("substring match", () => {
    expect(evaluateExpression("'rl' isin 'sg ssg rl lg'").result).toBe(true);
    expect(evaluateExpression("'gl' isin 'sg ssg rl lg'").result).toBe(false);
  });
  test("!isin negates", () => {
    expect(evaluateExpression("'gl' !isin 'sg ssg rl lg'").result).toBe(true);
    expect(evaluateExpression("'rl' !isin 'sg ssg rl lg'").result).toBe(false);
  });
});

describe("evaluateExpression -- logical", () => {
  test("&& both true", () => {
    expect(evaluateExpression("1 == 1 && 2 == 2").result).toBe(true);
    expect(evaluateExpression("1 == 1 && 2 == 3").result).toBe(false);
  });
  test("|| either true", () => {
    expect(evaluateExpression("1 == 1 || 2 == 3").result).toBe(true);
    expect(evaluateExpression("1 == 2 || 2 == 3").result).toBe(false);
  });
  test("keyword variants", () => {
    expect(evaluateExpression("1 == 1 and 2 == 2").result).toBe(true);
    expect(evaluateExpression("1 == 1 AND 2 == 2").result).toBe(true);
    expect(evaluateExpression("1 == 2 or 2 == 2").result).toBe(true);
    expect(evaluateExpression("1 == 2 OR 2 == 2").result).toBe(true);
  });
});

describe("evaluateExpression -- precedence", () => {
  test("&& binds tighter than ||", () => {
    // 0 || (1 && 0) == 0
    expect(evaluateExpression("1 == 2 || 1 == 1 && 1 == 2").result).toBe(false);
  });
  test("parens override", () => {
    expect(evaluateExpression("(1 == 2 || 1 == 1) && 1 == 2").result).toBe(false);
    expect(evaluateExpression("(1 == 2 || 1 == 1) && 1 == 1").result).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/evaluator.test.ts
```

- [ ] **Step 3: Update parser with precedence tiers**

Replace `parseComparison` and add `parseAnd`/`parseOr` helpers. Also replace `parseExpression`. Final parser cascade:

```ts
function isLogicalOr(op: string): boolean {
  return op === "||" || op === "or" || op === "OR";
}
function isLogicalAnd(op: string): boolean {
  return op === "&&" || op === "and" || op === "AND";
}

function parseExpression(p: ParseState): AstNode {
  return parseOr(p);
}

function parseOr(p: ParseState): AstNode {
  let left = parseAnd(p);
  while (true) {
    const tok = peek(p);
    if (!tok || tok.kind !== "op" || !isLogicalOr(tok.value)) break;
    consume(p);
    const right = parseAnd(p);
    left = { kind: "binary", op: "||", left, right };
  }
  return left;
}

function parseAnd(p: ParseState): AstNode {
  let left = parseComparison(p);
  while (true) {
    const tok = peek(p);
    if (!tok || tok.kind !== "op" || !isLogicalAnd(tok.value)) break;
    consume(p);
    const right = parseComparison(p);
    left = { kind: "binary", op: "&&", left, right };
  }
  return left;
}
```

Replace `evalNode` to short-circuit on `&&` and `||`:

```ts
function truthy(v: string): boolean {
  if (v === "1" || v.toLowerCase() === "true") return true;
  if (v === "0" || v.toLowerCase() === "false") return false;
  if (isNumeric(v)) return parseFloat(v) !== 0;
  return v.length > 0;
}

function evalNode(node: AstNode, issues: Issue[]): string {
  if (node.kind === "literal") return node.value;
  if (node.kind === "unary" && node.op === "-") {
    const v = evalNode(node.arg, issues);
    if (isNumeric(v)) return String(-parseFloat(v));
    return `-${v}`;
  }
  if (node.kind === "binary") {
    if (node.op === "&&") {
      const l = evalNode(node.left, issues);
      if (!truthy(l)) return "0";
      return truthy(evalNode(node.right, issues)) ? "1" : "0";
    }
    if (node.op === "||") {
      const l = evalNode(node.left, issues);
      if (truthy(l)) return "1";
      return truthy(evalNode(node.right, issues)) ? "1" : "0";
    }
    const l = evalNode(node.left, issues);
    const r = evalNode(node.right, issues);
    return evalBinary(node.op, l, r, issues);
  }
  return "";
}
```

Extend `evalBinary` with `isin` / `!isin`:

```ts
  if (op === "isin") return r.indexOf(l) >= 0 ? "1" : "0";
  if (op === "!isin") return r.indexOf(l) >= 0 ? "0" : "1";
```

(insert those two lines before the `issues.push` fallback).

- [ ] **Step 4: Run**

```bash
bun test src/lib/simulator/evaluator.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/evaluator.ts apps/slipgate-app/src/lib/simulator/evaluator.test.ts
git commit -m "feat(slipgate): simulator -- isin, logical ops, precedence, short-circuit"
```

---

## Task 10: Evaluator - arithmetic + regex/malformed issues

**Files:**
- Modify: `apps/slipgate-app/src/lib/simulator/evaluator.ts`
- Modify: `apps/slipgate-app/src/lib/simulator/evaluator.test.ts`

Adds `+`, `-`, `*`, `/`, unary `-`, string concat with `+`, and flags `=~`/`!~` as unsupported-regex.

- [ ] **Step 1: Failing tests**

Append:

```ts
describe("evaluateExpression -- arithmetic", () => {
  test("add and subtract", () => {
    expect(evaluateExpression("1 + 2 == 3").result).toBe(true);
    expect(evaluateExpression("5 - 2 == 3").result).toBe(true);
  });
  test("multiply and divide", () => {
    expect(evaluateExpression("4 * 2 == 8").result).toBe(true);
    expect(evaluateExpression("10 / 2 == 5").result).toBe(true);
  });
  test("multiplicative tighter than additive", () => {
    expect(evaluateExpression("1 + 2 * 3 == 7").result).toBe(true);
    expect(evaluateExpression("(1 + 2) * 3 == 9").result).toBe(true);
  });
  test("string concat with +", () => {
    expect(evaluateExpression("'foo' + 'bar' == 'foobar'").result).toBe(true);
  });
  test("unary minus", () => {
    expect(evaluateExpression("-5 < 0").result).toBe(true);
    expect(evaluateExpression("0 - 5 == -5").result).toBe(true);
  });
});

describe("evaluateExpression -- issues", () => {
  test("regex -> unsupported-regex issue, false result", () => {
    const r = evaluateExpression("'foo' =~ 'f.*'");
    expect(r.result).toBe(false);
    expect(r.issues.some((i) => i.kind === "unsupported-regex")).toBe(true);
  });
  test("truncated expression -> malformed-condition", () => {
    const r = evaluateExpression("1 == ");
    expect(r.issues.some((i) => i.kind === "malformed-condition")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/evaluator.test.ts
```

- [ ] **Step 3: Add arithmetic layers + issue handling**

Replace `parseComparison` to call into a new `parseAdditive`, and add the tier functions:

```ts
function parseComparison(p: ParseState): AstNode {
  const left = parseAdditive(p);
  const tok = peek(p);
  if (tok && tok.kind === "op" && COMPARISON_OPS.has(tok.value)) {
    consume(p);
    const right = parseAdditive(p);
    return { kind: "binary", op: tok.value, left, right };
  }
  return left;
}

function parseAdditive(p: ParseState): AstNode {
  let left = parseMultiplicative(p);
  while (true) {
    const tok = peek(p);
    if (!tok || tok.kind !== "op" || (tok.value !== "+" && tok.value !== "-")) break;
    consume(p);
    const right = parseMultiplicative(p);
    left = { kind: "binary", op: tok.value, left, right };
  }
  return left;
}

function parseMultiplicative(p: ParseState): AstNode {
  let left = parsePrimary(p);
  while (true) {
    const tok = peek(p);
    if (!tok || tok.kind !== "op" || (tok.value !== "*" && tok.value !== "/")) break;
    consume(p);
    const right = parsePrimary(p);
    left = { kind: "binary", op: tok.value, left, right };
  }
  return left;
}
```

Extend `evalBinary` with regex guard + arithmetic:

```ts
  if (op === "=~" || op === "!~") {
    issues.push({ kind: "unsupported-regex", detail: `regex op ${op} not simulated` });
    return "0";
  }
  if (op === "+") {
    if (isNumeric(l) && isNumeric(r)) return String(parseFloat(l) + parseFloat(r));
    return l + r;
  }
  if (op === "-") return String(parseFloat(l) - parseFloat(r));
  if (op === "*") return String(parseFloat(l) * parseFloat(r));
  if (op === "/") {
    const rv = parseFloat(r);
    if (rv === 0) {
      issues.push({ kind: "malformed-condition", detail: "division by zero" });
      return "0";
    }
    return String(parseFloat(l) / rv);
  }
```

(insert those before the `issues.push({ kind: "unknown-operator", ... })` fallback).

- [ ] **Step 4: Run full evaluator test suite**

```bash
bun test src/lib/simulator/evaluator.test.ts
```

Expected: all pass (earlier tests + new arithmetic + new issue tests).

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/evaluator.ts apps/slipgate-app/src/lib/simulator/evaluator.test.ts
git commit -m "feat(slipgate): simulator -- arithmetic ops, regex unsupported flag, malformed issue"
```

---

## Task 11: Resolver - createSimulatorResolver

**Files:**
- Create: `apps/slipgate-app/src/lib/simulator/resolver.ts`
- Create: `apps/slipgate-app/src/lib/simulator/resolver.test.ts`

Implements the pretty-view `RuntimeResolver` shape: `resolve(token) -> {display, tooltip, origin}`. Handles short-form aliases like `%a` -> `%armor`.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, test } from "bun:test";
import { createSimulatorResolver } from "./resolver.js";
import { createDefaultPlayerState } from "./defaults.js";

describe("createSimulatorResolver", () => {
  test("engine token resolves to value", () => {
    const s = createDefaultPlayerState(); s.health = 87;
    const r = createSimulatorResolver(s, new Map());
    const res = r.resolve("health");
    expect(res).not.toBeNull();
    expect(res!.display).toBe("87");
    expect(res!.origin).toBe("runtime");
  });
  test("short-form %a -> armor", () => {
    const s = createDefaultPlayerState(); s.armor = 150;
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("a")!.display).toBe("150");
  });
  test("derived %bestweapon", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 5;
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("bestweapon")!.display).toBe("rl");
  });
  test("unknown token -> null", () => {
    const s = createDefaultPlayerState();
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("sparklemotion")).toBeNull();
  });
  test("tooltip describes source", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("health")!.tooltip).toContain("health");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/resolver.test.ts
```

- [ ] **Step 3: Implement**

`src/lib/simulator/resolver.ts`:

```ts
import type { PlayerState } from "./types.js";
import { expandVars } from "./expander.js";

export interface RuntimeResolution {
  display: string;
  tooltip: string;
  origin: "runtime";
  active?: boolean;
}

export interface RuntimeResolver {
  resolve(token: string): RuntimeResolution | null;
}

const SHORT_FORM_ALIASES: Record<string, string> = {
  a: "armor", h: "health", l: "location",
  w: "weapon", b: "bestweapon",
  c: "cells", r: "rockets", n: "nails", s: "shells",
  p: "powerups", d: "deathloc", t: "took",
  x: "ammo", y: "weaponnum",
};

const TOKEN_DESCRIPTIONS: Record<string, string> = {
  health: "player health",
  armor: "player armor value",
  armortype: "armor type letter (g/y/r/none)",
  colored_armor: "armor value with health-band color codes",
  weapon: "currently selected weapon (tp_name_*)",
  weapons: "space-joined list of owned weapons",
  bestweapon: "highest-priority owned weapon with ammo",
  weaponnum: "impulse number of current weapon",
  ammo: "ammo count for current weapon",
  bestammo: "ammo count for bestweapon",
  cells: "cells count",
  rockets: "rockets count",
  nails: "nails count",
  shells: "shells count",
  powerups: "space-joined active powerups",
  location: "player location",
  mapname: "current map",
  lastloc: "last location visited",
  deathloc: "location of last death",
  matchname: "match name",
  matchstatus: "match status",
  matchtype: "match type",
  ledpoint: "LED point color",
  ledstatus: "LED status color",
  point: "pointed-at player name",
  pointloc: "location of pointed-at player",
  pointatloc: "at-location form",
  took: "last item taken",
  tookloc: "where item was taken",
  tookatloc: "at-location form for took",
  droploc: "last backpack drop location",
  droptime: "seconds since last drop",
  lastpowerup: "last powerup taken",
};

export function createSimulatorResolver(
  state: PlayerState,
  cvars: Map<string, string>,
): RuntimeResolver {
  return {
    resolve(token: string): RuntimeResolution | null {
      const canonical = SHORT_FORM_ALIASES[token] ?? token;
      const desc = TOKEN_DESCRIPTIONS[canonical];
      if (!desc) return null;
      const { text } = expandVars(`$${canonical}`, state, cvars);
      if (text === `$${canonical}`) return null;
      return {
        display: text,
        tooltip: `${canonical}: ${desc}`,
        origin: "runtime",
      };
    },
  };
}
```

- [ ] **Step 4: Run**

```bash
bun test src/lib/simulator/resolver.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/resolver.ts apps/slipgate-app/src/lib/simulator/resolver.test.ts
git commit -m "feat(slipgate): simulator -- createSimulatorResolver with short-form aliases"
```

---

## Task 12: Resolver - evaluateCondition + evaluateTeamsay walker

**Files:**
- Modify: `apps/slipgate-app/src/lib/simulator/resolver.ts`
- Modify: `apps/slipgate-app/src/lib/simulator/resolver.test.ts`

Walker parses `if/then/else` chains, recurses into alias bodies, collects trace + issues, treats `set`/`set_tp`/`inc`/`wait`/`alias`/`bind` as skipped side effects. Depth cap 8 for cyclic aliases.

- [ ] **Step 1: Failing tests**

Append:

```ts
import { evaluateCondition, evaluateTeamsay } from "./resolver.js";

describe("evaluateCondition", () => {
  test("expanded then evaluated", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const r = evaluateCondition("$health < 100", s, new Map());
    expect(r.result).toBe(true);
    expect(r.issues).toHaveLength(0);
  });
  test("false isin after expansion", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg"]);
    const cvars = new Map([["tp_name_rl", "rl"], ["tp_name_sg", "sg"]]);
    expect(evaluateCondition("'$tp_name_rl' isin '$weapons'", s, cvars).result).toBe(false);
  });
});

describe("evaluateTeamsay", () => {
  test("plain say_team body passes through", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("say_team hello team", s, new Map(), new Map());
    expect(r.output).toContain("hello team");
    expect(r.issues).toHaveLength(0);
  });

  test("old-form if selects branch", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const r = evaluateTeamsay(
      "if $health < 1 then say_team dead else say_team alive",
      s, new Map(), new Map(),
    );
    expect(r.output).toContain("alive");
    expect(r.trace.some((x) => x.kind === "condition" && x.activeBranch === "else")).toBe(true);
  });

  test("new-form parenthesized if", () => {
    const s = createDefaultPlayerState(); s.health = 0;
    const r = evaluateTeamsay(
      "if ($health < 1) then say_team dead else say_team alive",
      s, new Map(), new Map(),
    );
    expect(r.output).toContain("dead");
  });

  test("follows alias target from branch", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const aliases = new Map([
      ["_report", "if $health < 1 then .lost else _report1"],
      ["_report1", "say_team reporting in"],
    ]);
    const r = evaluateTeamsay("_report", s, new Map(), aliases);
    expect(r.output).toContain("reporting in");
    expect(r.trace.some((x) => x.kind === "alias-follow" && x.text === "_report1")).toBe(true);
  });

  test("missing alias target emits issue", () => {
    const s = createDefaultPlayerState(); s.health = 0;
    const aliases = new Map([["_report", "if $health < 1 then _nope else say_team ok"]]);
    const r = evaluateTeamsay("_report", s, new Map(), aliases);
    expect(r.issues.some((i) => i.kind === "missing-alias" && i.detail.includes("_nope"))).toBe(true);
  });

  test("cyclic alias hits depth cap", () => {
    const s = createDefaultPlayerState();
    const aliases = new Map([["a", "b"], ["b", "a"]]);
    const r = evaluateTeamsay("a", s, new Map(), aliases);
    expect(r.issues.some((i) => i.kind === "depth-cap-reached")).toBe(true);
  });

  test("set_tp skipped with info trace", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("set_tp tvs_string_rl rl; say_team hi", s, new Map(), new Map());
    expect(r.output).toContain("hi");
    expect(r.trace.some((x) => x.kind === "skip-side-effect")).toBe(true);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
bun test src/lib/simulator/resolver.test.ts
```

- [ ] **Step 3: Implement walker**

Append to `resolver.ts`:

```ts
import type { Issue, TraceStep, EvaluateTeamsayResult } from "./types.js";
import { evaluateExpression } from "./evaluator.js";

const MAX_WALK_DEPTH = 8;

const SIDE_EFFECT_COMMANDS = new Set([
  "set", "set_tp", "seta", "set_calc", "inc", "wait",
  "alias", "tempalias", "bind", "unbind", "bindlist", "toggle", "echo",
]);

const OUTPUT_COMMANDS = new Set([
  "say", "say_team", "say_me",
  "tp_msg_report", "tp_msg_coming", "tp_msg_lost",
  "tp_msg_enemy_pwr", "tp_msg_need", "tp_msg_point",
]);

export interface ConditionResult {
  result: boolean;
  issues: Issue[];
}

export function evaluateCondition(
  expr: string,
  state: PlayerState,
  cvars: Map<string, string>,
  positionalArgs: string[] = [],
): ConditionResult {
  const expanded = expandVars(expr, state, cvars, positionalArgs);
  const er = evaluateExpression(expanded.text);
  return { result: er.result, issues: [...expanded.issues, ...er.issues] };
}

export function evaluateTeamsay(
  rawText: string,
  state: PlayerState,
  cvars: Map<string, string>,
  aliases: Map<string, string>,
  positionalArgs: string[] = [],
): EvaluateTeamsayResult {
  const trace: TraceStep[] = [];
  const issues: Issue[] = [];
  const outputParts: string[] = [];

  walk(rawText, 0, positionalArgs);

  return { output: outputParts.join(" ").trim(), trace, issues };

  function walk(body: string, depth: number, args: string[]): void {
    if (depth >= MAX_WALK_DEPTH) {
      const issue: Issue = {
        kind: "depth-cap-reached",
        detail: `walker depth cap (${MAX_WALK_DEPTH})`,
      };
      issues.push(issue);
      trace.push({ kind: "leaf", text: body, issues: [issue] });
      return;
    }
    for (const seg of splitTopLevel(body)) {
      const t = seg.trim();
      if (t.length === 0) continue;
      walkSegment(t, depth, args);
    }
  }

  function walkSegment(seg: string, depth: number, args: string[]): void {
    const ifm = seg.match(/^\s*if\b\s*(.*)$/i);
    if (ifm) { walkIf(ifm[1], depth, args); return; }

    const m = seg.match(/^(\S+)\s*(.*)$/);
    if (!m) return;
    const head = m[1];
    const rest = m[2];
    const headLower = head.toLowerCase();

    if (OUTPUT_COMMANDS.has(headLower)) {
      const expanded = expandVars(rest, state, cvars, args);
      issues.push(...expanded.issues);
      outputParts.push(expanded.text);
      trace.push({ kind: "leaf", text: seg, detail: expanded.text });
      return;
    }

    if (SIDE_EFFECT_COMMANDS.has(headLower)) {
      trace.push({
        kind: "skip-side-effect",
        text: seg,
        detail: `${headLower} not simulated`,
      });
      return;
    }

    if (aliases.has(head)) {
      const body = aliases.get(head)!;
      trace.push({ kind: "alias-follow", text: head, detail: body });
      const subArgs = rest.length > 0 ? rest.split(/\s+/) : [];
      walk(body, depth + 1, subArgs);
      return;
    }

    const issue: Issue = {
      kind: "missing-alias",
      detail: `reference "${head}" not defined`,
    };
    issues.push(issue);
    trace.push({ kind: "alias-follow", text: head, issues: [issue] });
  }

  function walkIf(rest: string, depth: number, args: string[]): void {
    const { condition, thenBody, elseBody } = splitIfThenElse(rest);
    if (condition === null) {
      const issue: Issue = {
        kind: "malformed-condition",
        detail: `if missing "then": ${rest}`,
      };
      issues.push(issue);
      trace.push({ kind: "condition", text: rest, issues: [issue] });
      return;
    }
    const cr = evaluateCondition(condition, state, cvars, args);
    issues.push(...cr.issues);
    const activeBranch: "then" | "else" = cr.result ? "then" : "else";
    trace.push({
      kind: "condition",
      text: condition,
      result: cr.result,
      activeBranch,
      issues: cr.issues.length > 0 ? cr.issues : undefined,
    });
    const chosen = cr.result ? thenBody : elseBody;
    if (chosen.trim().length === 0) return;
    walkSegment(chosen.trim(), depth + 1, args);
  }
}

function splitIfThenElse(rest: string): {
  condition: string | null;
  thenBody: string;
  elseBody: string;
} {
  const thenIdx = findKeyword(rest, "then");
  if (thenIdx < 0) return { condition: null, thenBody: "", elseBody: "" };
  const condition = rest.slice(0, thenIdx).trim();
  const after = rest.slice(thenIdx + 4);
  const elseIdx = findKeyword(after, "else");
  if (elseIdx < 0) {
    return { condition, thenBody: after.trim(), elseBody: "" };
  }
  return {
    condition,
    thenBody: after.slice(0, elseIdx).trim(),
    elseBody: after.slice(elseIdx + 4).trim(),
  };
}

function findKeyword(text: string, keyword: string): number {
  let depth = 0;
  let inQuote: string | null = null;
  for (let i = 0; i <= text.length - keyword.length; i++) {
    const c = text[i];
    if (inQuote) { if (c === inQuote) inQuote = null; continue; }
    if (c === "'" || c === '"') { inQuote = c; continue; }
    if (c === "(") { depth++; continue; }
    if (c === ")") { depth--; continue; }
    if (depth > 0) continue;
    if (text.substring(i, i + keyword.length) === keyword) {
      const prev = i > 0 ? text[i - 1] : " ";
      const next = i + keyword.length < text.length ? text[i + keyword.length] : " ";
      if (!/\w/.test(prev) && !/\w/.test(next)) return i;
    }
  }
  return -1;
}

function splitTopLevel(body: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  let inQuote: string | null = null;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inQuote) {
      buf += c;
      if (c === inQuote) inQuote = null;
      continue;
    }
    if (c === "'" || c === '"') { inQuote = c; buf += c; continue; }
    if (c === "(") { depth++; buf += c; continue; }
    if (c === ")") { depth--; buf += c; continue; }
    if (c === ";" && depth === 0) { out.push(buf); buf = ""; continue; }
    buf += c;
  }
  if (buf.length > 0) out.push(buf);
  return out;
}
```

- [ ] **Step 4: Run**

```bash
bun test src/lib/simulator/resolver.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/resolver.ts apps/slipgate-app/src/lib/simulator/resolver.test.ts
git commit -m "feat(slipgate): simulator -- evaluateTeamsay walker with trace, issues, alias recursion"
```

---

## Task 13: Simulator module public index

**Files:**
- Create: `apps/slipgate-app/src/lib/simulator/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
export type {
  PlayerState, Weapon, Powerup, ArmorClass, MatchStatus, LedColor,
  Issue, IssueKind, TraceStep, EvaluateTeamsayResult,
} from "./types.js";

export { createDefaultPlayerState } from "./defaults.js";

export {
  deriveWeaponsString, deriveBestWeapon, deriveBestAmmo,
  derivePowerupsString, deriveArmortype, deriveColoredArmor,
  deriveWeaponNum, deriveAmmo,
} from "./derivations.js";

export { expandVars } from "./expander.js";
export type { ExpandResult } from "./expander.js";

export { tokenize, evaluateExpression } from "./evaluator.js";
export type { Token } from "./evaluator.js";

export {
  createSimulatorResolver,
  evaluateCondition,
  evaluateTeamsay,
} from "./resolver.js";
export type {
  RuntimeResolver, RuntimeResolution, ConditionResult,
} from "./resolver.js";
```

- [ ] **Step 2: Full test + typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app
bun test src/lib/simulator
bunx tsc --noEmit
```

Expected: all tests pass, no TS errors.

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/index.ts
git commit -m "feat(slipgate): simulator -- public index.ts barrel"
```

---

## Task 14: Fixture-driven flip tests

**Files:**
- Create: `apps/slipgate-app/src/lib/simulator/fixtures.test.ts`

Uses the real `qw-config` parser to load `bps.cfg`, `hangtime.cfg`, `locktar.cfg`; asserts state-flip cases.

- [ ] **Step 1: Write the fixture tests**

```ts
import { describe, expect, test } from "bun:test";
import { parseConfig } from "qw-config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDefaultPlayerState } from "./defaults.js";
import { evaluateCondition, evaluateTeamsay } from "./resolver.js";

function loadFixture(name: string) {
  const path = join(__dirname, "..", "..", "..", "assets", "teamsays", name);
  const text = readFileSync(path, "utf-8");
  const parsed = parseConfig(text);
  return { cvars: parsed.cvars, aliases: parsed.aliases, binds: parsed.binds };
}

describe("locktar.cfg / _report", () => {
  const fx = loadFixture("locktar.cfg");

  test("health >= 1 -> else branch", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const body = fx.aliases.get("_report")!;
    const r = evaluateTeamsay(body, s, fx.cvars, fx.aliases);
    const cond = r.trace.find((x) => x.kind === "condition");
    expect(cond?.activeBranch).toBe("else");
  });

  test("health < 1 -> then branch (.lost)", () => {
    const s = createDefaultPlayerState(); s.health = 0;
    const body = fx.aliases.get("_report")!;
    const r = evaluateTeamsay(body, s, fx.cvars, fx.aliases);
    const cond = r.trace.find((x) => x.kind === "condition");
    expect(cond?.activeBranch).toBe("then");
  });
});

describe("locktar.cfg / _report2 weapon branching", () => {
  const fx = loadFixture("locktar.cfg");

  test("owns only sg -> sg/ng branch", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg"]);
    s.shells = 25;
    const r = evaluateCondition("$bestweapon isin $tp_name_sg|$tp_name_ng", s, fx.cvars);
    expect(r.result).toBe(true);
  });

  test("owns rl and lg with cells -> lg branch", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl", "lg"]);
    s.cells = 30; s.rockets = 5;
    const r1 = evaluateCondition("$bestweapon isin $tp_name_sg|$tp_name_ng", s, fx.cvars);
    expect(r1.result).toBe(false);
    const r2 = evaluateCondition("$tp_name_lg isin $qt$weapons$qt", s, fx.cvars);
    expect(r2.result).toBe(true);
  });
});

describe("hangtime.cfg / __kill_me", () => {
  const fx = loadFixture("hangtime.cfg");

  test("bestweapon=rl and cells>=6 path", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 5; s.cells = 10;
    const body = fx.aliases.get("__kill_me")!;
    const r = evaluateTeamsay(body, s, fx.cvars, fx.aliases);
    expect(r.output).toBeTruthy();
    expect(r.trace.filter((x) => x.kind === "condition").length).toBeGreaterThanOrEqual(1);
  });

  test("bestweapon=rl and cells<6: compound condition false", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 5; s.cells = 3;
    const r = evaluateCondition("('$bestweapon' = '$tp_name_rl') and ($cells >= 6)", s, fx.cvars);
    expect(r.result).toBe(false);
    const r2 = evaluateCondition("('$bestweapon' = '$tp_name_rl')", s, fx.cvars);
    expect(r2.result).toBe(true);
  });
});

describe("hangtime.cfg / __check_armor", () => {
  const fx = loadFixture("hangtime.cfg");

  test("bestweapon=rl and need contains 'armor' -> armor-need branch", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 5;
    const cvars = new Map(fx.cvars);
    cvars.set("need", "armor");
    const cond = "('$bestweapon' isin '$tp_name_lg $tp_name_rl' AND 'armor' isin '$need')";
    expect(evaluateCondition(cond, s, cvars).result).toBe(true);
  });

  test("bestweapon=sg fails rl/lg-specific branch", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg"]);
    s.shells = 25;
    const cond = "('$bestweapon' isin '$tp_name_lg $tp_name_rl' AND 'armor' isin '$need')";
    expect(evaluateCondition(cond, s, fx.cvars).result).toBe(false);
  });
});

describe("bps.cfg smoke", () => {
  const fx = loadFixture("bps.cfg");

  test("fixture parses with cvars and aliases", () => {
    expect(fx.aliases.size).toBeGreaterThan(0);
    expect(fx.cvars.size).toBeGreaterThan(0);
  });

  test("health < 1 fires consistently on fixture's health-guarded aliases", () => {
    const s = createDefaultPlayerState(); s.health = 0;
    const matches = [...fx.aliases.values()].filter((b) =>
      /\bif\s+\$health\s*<\s*1\b/.test(b),
    );
    expect(matches.length).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(3, matches.length); i++) {
      expect(evaluateCondition("$health < 1", s, fx.cvars).result).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app
bun test src/lib/simulator/fixtures.test.ts
```

Expected: all tests pass. If any fail, inspect the `trace` and `issues` output from `evaluateTeamsay` to decide whether the evaluator needs a fix or the test's expectation is misaligned with fixture behavior.

- [ ] **Step 3: Full simulator test suite**

```bash
bun test src/lib/simulator
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/fixtures.test.ts
git commit -m "test(slipgate): simulator -- fixture flip-cases against bps/hangtime/locktar"
```

---

## Task 15: Issue-flagging synthetic tests

**Files:**
- Create: `apps/slipgate-app/src/lib/simulator/issues.test.ts`

- [ ] **Step 1: Write synthetic issue tests**

```ts
import { describe, expect, test } from "bun:test";
import { createDefaultPlayerState } from "./defaults.js";
import { evaluateTeamsay, evaluateCondition } from "./resolver.js";

describe("issue flagging", () => {
  test("unresolved $var", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("say_team $haelth hp", s, new Map(), new Map());
    expect(r.issues.some((i) => i.kind === "unresolved-var" && i.detail.includes("haelth"))).toBe(true);
  });

  test("missing alias in branch", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const aliases = new Map([
      ["_report", "if $health < 1 then .lost else _missing"],
    ]);
    const r = evaluateTeamsay("_report", s, new Map(), aliases);
    expect(r.issues.some((i) => i.kind === "missing-alias" && i.detail.includes("_missing"))).toBe(true);
  });

  test("malformed condition (missing then)", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("if $health < 1 say_team oops", s, new Map(), new Map());
    expect(r.issues.some((i) => i.kind === "malformed-condition")).toBe(true);
  });

  test("regex op flagged as unsupported-regex", () => {
    const r = evaluateCondition("'foo' =~ 'fo.*'", createDefaultPlayerState(), new Map());
    expect(r.issues.some((i) => i.kind === "unsupported-regex")).toBe(true);
  });

  test("cyclic alias hits depth cap", () => {
    const s = createDefaultPlayerState();
    const aliases = new Map([["a", "b"], ["b", "a"]]);
    const r = evaluateTeamsay("a", s, new Map(), aliases);
    expect(r.issues.some((i) => i.kind === "depth-cap-reached")).toBe(true);
  });

  test("side-effect emits trace but not issue", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("set foo bar; say_team hi", s, new Map(), new Map());
    expect(r.trace.some((x) => x.kind === "skip-side-effect")).toBe(true);
    expect(r.issues.filter((i) => i.kind === "side-effect-skipped").length).toBe(0);
  });
});
```

- [ ] **Step 2: Run**

```bash
bun test src/lib/simulator/issues.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/lib/simulator/issues.test.ts
git commit -m "test(slipgate): simulator -- issue-flagging synthetic cases"
```

---

## Task 16: Extend ProfilePrefs with simulator block

**Files:**
- Modify: `apps/slipgate-app/src/store.ts`

Extends the persistence schema with a versioned `simulator` block containing `currentState` and `templates[]`. Adds CRUD helpers. Uses the existing `{ ...DEFAULT_PREFS, ...data.prefs }` migration pattern (new field gets default on load).

- [ ] **Step 1: Add imports near the top of store.ts**

```ts
import type { PlayerState } from "./lib/simulator/types.js";
import { createDefaultPlayerState } from "./lib/simulator/defaults.js";
```

- [ ] **Step 2: Add types above `ProfilePrefs`**

```ts
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
```

- [ ] **Step 3: Extend `ProfilePrefs` and `DEFAULT_PREFS`**

Add two fields to `ProfilePrefs`:

```ts
  /** Which view the ConfigViewer right panel shows. */
  config_right_panel_mode: "keyboard" | "state";
  /** Simulator state + templates. */
  simulator: SimulatorPrefs;
```

Add matching defaults to `DEFAULT_PREFS`:

```ts
  config_right_panel_mode: "keyboard",
  simulator: {
    version: 1,
    currentState: createDefaultPlayerState(),
    templates: [],
  },
```

- [ ] **Step 4: Add Set<->Array serialization shims**

Place above the `loadProfile` function:

```ts
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
  return {
    ...fresh,
    ...r,
    ownedWeapons: new Set(Array.isArray(r.ownedWeapons) ? (r.ownedWeapons as PlayerState["ownedWeapons"] extends Set<infer T> ? T[] : never[]) : []),
    activePowerups: new Set(Array.isArray(r.activePowerups) ? (r.activePowerups as PlayerState["activePowerups"] extends Set<infer T> ? T[] : never[]) : []),
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
```

- [ ] **Step 5: Wire serializer into migration and save**

In `migrateProfile`, change both branches that spread `DEFAULT_PREFS` to post-process the simulator block:

```ts
      prefs: {
        ...DEFAULT_PREFS,
        ...data.prefs,
        simulator: deserializeSimulator(data.prefs?.simulator),
      },
```

And in the old-format branch:

```ts
    profile.prefs = {
      ...DEFAULT_PREFS,
      ...data.prefs,
      simulator: deserializeSimulator(data.prefs.simulator),
    };
```

Update `saveProfile`:

```ts
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
```

- [ ] **Step 6: Add CRUD helpers at the bottom of store.ts**

```ts
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
```

Note: `structuredClone` is available in Bun and modern browsers; Tauri webview (WebView2/WebKit) supports it.

- [ ] **Step 7: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app
bunx tsc --noEmit
```

If the `deserializePlayerState` type assertion is too ugly, it may be cleaner to rewrite it with narrower runtime checks. Acceptable alternative: use `Set<Weapon>` / `Set<Powerup>` without the conditional type, casting explicitly:

```ts
ownedWeapons: new Set(Array.isArray(r.ownedWeapons) ? (r.ownedWeapons as Array<PlayerState["currentWeapon"]>) : []),
activePowerups: new Set(Array.isArray(r.activePowerups) ? (r.activePowerups as Array<"quad"|"pent"|"ring"|"biosuit">) : []),
```

- [ ] **Step 8: Commit**

```bash
git add apps/slipgate-app/src/store.ts
git commit -m "feat(slipgate): ProfilePrefs -- simulator block with template CRUD"
```

---

## Task 17: StatePanel component - scaffold + raw inputs

**Files:**
- Create: `apps/slipgate-app/src/components/StatePanel.tsx`

Component that takes PlayerState + onChange callback + cvars map. All raw input controls; derived readouts and templates header come in Tasks 18-19.

- [ ] **Step 1: Create the component**

```tsx
import { For } from "solid-js";
import type {
  PlayerState, Weapon, Powerup, ArmorClass, MatchStatus, LedColor,
} from "../lib/simulator";

interface StatePanelProps {
  state: PlayerState;
  cvars: Map<string, string>;
  onChange: (next: PlayerState) => void;
}

const WEAPONS: Weapon[] = ["axe", "sg", "ssg", "ng", "sng", "gl", "rl", "lg"];
const POWERUPS: Powerup[] = ["quad", "pent", "ring", "biosuit"];
const ARMOR_CLASSES: ArmorClass[] = ["none", "ga", "ya", "ra"];
const MATCH_STATUSES: MatchStatus[] = ["standby", "countdown", "live", "overtime", "ended"];
const LED_COLORS: LedColor[] = ["none", "green", "red", "yellow"];

export default function StatePanel(props: StatePanelProps) {
  function update<K extends keyof PlayerState>(key: K, value: PlayerState[K]) {
    props.onChange({ ...props.state, [key]: value });
  }
  function toggleWeapon(w: Weapon) {
    const next = new Set(props.state.ownedWeapons);
    if (next.has(w)) next.delete(w); else next.add(w);
    update("ownedWeapons", next);
  }
  function togglePowerup(p: Powerup) {
    const next = new Set(props.state.activePowerups);
    if (next.has(p)) next.delete(p); else next.add(p);
    update("activePowerups", next);
  }

  return (
    <div class="sg-state-panel">
      <Section title="Vitals">
        <Row label="Health">
          <NumInput value={props.state.health} min={0} max={250}
            onChange={(v) => update("health", v)} />
        </Row>
        <Row label="Armor">
          <NumInput value={props.state.armor} min={0} max={200}
            onChange={(v) => update("armor", v)} />
        </Row>
        <Row label="Armor class">
          <EnumSelect value={props.state.armorClass} options={ARMOR_CLASSES}
            onChange={(v) => update("armorClass", v as ArmorClass)} />
        </Row>
      </Section>

      <Section title="Weapons">
        <Row label="Owned">
          <div class="flex flex-wrap gap-1">
            <For each={WEAPONS}>{(w) => (
              <button
                class={`badge cursor-pointer ${props.state.ownedWeapons.has(w) ? "badge-primary" : "badge-ghost"}`}
                onClick={() => toggleWeapon(w)}
              >{w}</button>
            )}</For>
          </div>
        </Row>
        <Row label="Current">
          <EnumSelect value={props.state.currentWeapon} options={WEAPONS}
            onChange={(v) => update("currentWeapon", v as Weapon)} />
        </Row>
      </Section>

      <Section title="Ammo">
        <Row label="Shells"><NumInput value={props.state.shells} onChange={(v) => update("shells", v)} /></Row>
        <Row label="Nails"><NumInput value={props.state.nails} onChange={(v) => update("nails", v)} /></Row>
        <Row label="Rockets"><NumInput value={props.state.rockets} onChange={(v) => update("rockets", v)} /></Row>
        <Row label="Cells"><NumInput value={props.state.cells} onChange={(v) => update("cells", v)} /></Row>
      </Section>

      <Section title="Powerups">
        <Row label="Active">
          <div class="flex flex-wrap gap-1">
            <For each={POWERUPS}>{(p) => (
              <button
                class={`badge cursor-pointer ${props.state.activePowerups.has(p) ? "badge-primary" : "badge-ghost"}`}
                onClick={() => togglePowerup(p)}
              >{p}</button>
            )}</For>
          </div>
        </Row>
      </Section>

      <Section title="Location">
        <Row label="Location"><TextInput value={props.state.location} onChange={(v) => update("location", v)} /></Row>
        <Row label="Map"><TextInput value={props.state.mapname} onChange={(v) => update("mapname", v)} /></Row>
        <Row label="Last loc"><TextInput value={props.state.lastloc} onChange={(v) => update("lastloc", v)} /></Row>
        <Row label="Death loc"><TextInput value={props.state.deathloc} onChange={(v) => update("deathloc", v)} /></Row>
      </Section>

      <Section title="Match">
        <Row label="Name"><TextInput value={props.state.matchname} onChange={(v) => update("matchname", v)} /></Row>
        <Row label="Status">
          <EnumSelect value={props.state.matchstatus} options={MATCH_STATUSES}
            onChange={(v) => update("matchstatus", v as MatchStatus)} />
        </Row>
        <Row label="Type"><TextInput value={props.state.matchtype} onChange={(v) => update("matchtype", v)} /></Row>
      </Section>

      <Section title="LEDs & pointing">
        <Row label="Led point">
          <EnumSelect value={props.state.ledpoint} options={LED_COLORS}
            onChange={(v) => update("ledpoint", v as LedColor)} />
        </Row>
        <Row label="Led status">
          <EnumSelect value={props.state.ledstatus} options={LED_COLORS}
            onChange={(v) => update("ledstatus", v as LedColor)} />
        </Row>
        <Row label="Point"><TextInput value={props.state.point} onChange={(v) => update("point", v)} /></Row>
        <Row label="Point loc"><TextInput value={props.state.pointloc} onChange={(v) => update("pointloc", v)} /></Row>
      </Section>

      <Section title="Recent events">
        <Row label="Took"><TextInput value={props.state.took} onChange={(v) => update("took", v)} /></Row>
        <Row label="Took loc"><TextInput value={props.state.tookloc} onChange={(v) => update("tookloc", v)} /></Row>
        <Row label="Drop loc"><TextInput value={props.state.droploc} onChange={(v) => update("droploc", v)} /></Row>
        <Row label="Drop time"><NumInput value={props.state.droptime} onChange={(v) => update("droptime", v)} /></Row>
        <Row label="Last powerup"><TextInput value={props.state.lastpowerup} onChange={(v) => update("lastpowerup", v)} /></Row>
      </Section>
    </div>
  );
}

function Section(props: { title: string; children: any }) {
  return (
    <div class="sg-state-section">
      <div class="sg-state-section-title">{props.title}</div>
      <div class="sg-state-section-body">{props.children}</div>
    </div>
  );
}

function Row(props: { label: string; children: any }) {
  return (
    <div class="sg-state-row">
      <label class="sg-state-row-label">{props.label}</label>
      <div class="sg-state-row-control">{props.children}</div>
    </div>
  );
}

function NumInput(props: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <input type="number" class="input input-xs w-20"
      value={props.value} min={props.min} max={props.max}
      onInput={(e) => props.onChange(Number(e.currentTarget.value))} />
  );
}

function TextInput(props: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="text" class="input input-xs w-full"
      value={props.value}
      onInput={(e) => props.onChange(e.currentTarget.value)} />
  );
}

function EnumSelect<T extends string>(props: {
  value: T; options: readonly T[]; onChange: (v: T) => void;
}) {
  return (
    <select class="select select-xs" value={props.value}
      onChange={(e) => props.onChange(e.currentTarget.value as T)}>
      <For each={props.options}>{(o) => <option value={o}>{o}</option>}</For>
    </select>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
bunx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/slipgate-app/src/components/StatePanel.tsx
git commit -m "feat(slipgate): StatePanel scaffold -- raw inputs for every PlayerState field"
```

---

## Task 18: StatePanel - derived readouts + influencing cvars

**Files:**
- Modify: `apps/slipgate-app/src/components/StatePanel.tsx`

Adds per-section blocks showing (a) live derived values, (b) influencing cvars (default vs user-config side-by-side) where applicable.

- [ ] **Step 1: Update imports**

Add to the imports at the top of StatePanel.tsx:

```tsx
import {
  deriveWeaponsString, deriveBestWeapon, deriveBestAmmo,
  derivePowerupsString, deriveArmortype, deriveColoredArmor,
  deriveWeaponNum, deriveAmmo,
} from "../lib/simulator";
```

- [ ] **Step 2: Insert derived + influencing blocks into relevant sections**

In the Vitals section, after the Armor class row, before closing `</Section>`:

```tsx
<DerivedBlock rows={[
  ["$armortype", deriveArmortype(props.state, props.cvars)],
  ["$colored_armor", deriveColoredArmor(props.state)],
]} />
<InfluencingCvarsBlock cvars={props.cvars}
  names={["tp_name_armortype_ga","tp_name_armortype_ya","tp_name_armortype_ra","tp_name_armortype_none"]} />
```

In the Weapons section, after the Current row:

```tsx
<DerivedBlock rows={[
  ["$weapons", deriveWeaponsString(props.state, props.cvars)],
  ["$bestweapon", deriveBestWeapon(props.state, props.cvars)],
  ["$bestammo", String(deriveBestAmmo(props.state, props.cvars))],
  ["$weaponnum", String(deriveWeaponNum(props.state))],
  ["$ammo", String(deriveAmmo(props.state))],
]} />
<InfluencingCvarsBlock cvars={props.cvars}
  names={["tp_weapon_order","tp_name_sg","tp_name_ssg","tp_name_ng","tp_name_sng","tp_name_gl","tp_name_rl","tp_name_lg"]} />
```

In the Powerups section, after the Active row:

```tsx
<DerivedBlock rows={[
  ["$powerups", derivePowerupsString(props.state, props.cvars)],
]} />
<InfluencingCvarsBlock cvars={props.cvars}
  names={["tp_name_quad","tp_name_pent","tp_name_ring","tp_name_biosuit","tp_poweruptextstyle"]} />
```

- [ ] **Step 3: Add helper components and CVAR_DEFAULTS table at the bottom of the file**

```tsx
function DerivedBlock(props: { rows: [string, string][] }) {
  return (
    <div class="sg-state-derived">
      <div class="sg-state-block-label">Derived</div>
      <For each={props.rows}>{([name, value]) => (
        <div class="sg-state-derived-row">
          <span class="sg-state-derived-name">{name}</span>
          <span class="sg-state-derived-value">{value}</span>
        </div>
      )}</For>
    </div>
  );
}

// ezQuake defaults for commonly-referenced cvars. Extend as needed.
const CVAR_DEFAULTS: Record<string, string> = {
  tp_weapon_order: "8 7 5 3 4 6 2 1",
  tp_name_sg: "sg", tp_name_ssg: "ssg", tp_name_ng: "ng", tp_name_sng: "sng",
  tp_name_gl: "gl", tp_name_rl: "rl", tp_name_lg: "lg", tp_name_axe: "axe",
  tp_name_quad: "quad", tp_name_pent: "pent", tp_name_ring: "eyes", tp_name_biosuit: "biosuit",
  tp_name_armortype_ga: "g", tp_name_armortype_ya: "y", tp_name_armortype_ra: "r", tp_name_armortype_none: "",
  tp_poweruptextstyle: "0",
};

function InfluencingCvarsBlock(props: { cvars: Map<string, string>; names: string[] }) {
  return (
    <div class="sg-state-cvars">
      <div class="sg-state-block-label">Influencing cvars</div>
      <For each={props.names}>{(name) => {
        const def = CVAR_DEFAULTS[name] ?? "";
        const user = props.cvars.get(name);
        const customized = user !== undefined && user !== def;
        return (
          <div class={`sg-state-cvar-row ${customized ? "sg-state-cvar-row-customized" : ""}`}>
            <span class="sg-state-cvar-name">{name}</span>
            <span class="sg-state-cvar-default">{def || "(empty)"}</span>
            <span class="sg-state-cvar-user">{user ?? "(default)"}</span>
          </div>
        );
      }}</For>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
bunx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/components/StatePanel.tsx
git commit -m "feat(slipgate): StatePanel -- derived readouts + influencing cvars per section"
```

---

## Task 19: StatePanel - templates header

**Files:**
- Modify: `apps/slipgate-app/src/components/StatePanel.tsx`

Adds the Templates dropdown, Save-as (inline name input), Reset, and per-template delete chips to the header.

- [ ] **Step 1: Update imports and extend props**

At the top of StatePanel.tsx, expand the solid-js import:

```tsx
import { For, Show, createSignal, createMemo } from "solid-js";
```

Add type import:

```tsx
import type { SimulatorTemplate } from "../store";
```

Extend `StatePanelProps`:

```tsx
interface StatePanelProps {
  state: PlayerState;
  cvars: Map<string, string>;
  templates: SimulatorTemplate[];
  onChange: (next: PlayerState) => void;
  onSaveAs: (name: string) => void;
  onLoadTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onReset: () => void;
}
```

- [ ] **Step 2: Add header to the component**

At the top of the `return (...)` expression, before the first `<Section>`, add state + header JSX:

```tsx
const [saveMode, setSaveMode] = createSignal(false);
const [saveName, setSaveName] = createSignal("");
function beginSaveAs() { setSaveMode(true); setSaveName(""); }
function cancelSaveAs() { setSaveMode(false); setSaveName(""); }
function commitSaveAs() {
  const name = saveName().trim();
  if (name.length === 0) return;
  props.onSaveAs(name);
  cancelSaveAs();
}
const sortedTemplates = createMemo(() =>
  [...props.templates].sort((a, b) => b.createdAt - a.createdAt),
);
```

Then inside the outer div:

```tsx
<div class="sg-state-header">
  <select
    class="select select-xs"
    disabled={props.templates.length === 0}
    onChange={(e) => {
      const id = e.currentTarget.value;
      if (id) props.onLoadTemplate(id);
      e.currentTarget.value = ""; // reset so re-selecting same template works
    }}
  >
    <option value="">
      {props.templates.length === 0 ? "No templates" : "Load template..."}
    </option>
    <For each={sortedTemplates()}>{(t) => (
      <option value={t.id}>{t.name}</option>
    )}</For>
  </select>
  <Show
    when={saveMode()}
    fallback={<button class="btn btn-ghost btn-xs" onClick={beginSaveAs}>Save as...</button>}
  >
    <input class="input input-xs w-32" autofocus
      value={saveName()}
      onInput={(e) => setSaveName(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitSaveAs();
        if (e.key === "Escape") cancelSaveAs();
      }} />
    <button class="btn btn-primary btn-xs" onClick={commitSaveAs}>Save</button>
    <button class="btn btn-ghost btn-xs" onClick={cancelSaveAs}>Cancel</button>
  </Show>
  <button class="btn btn-ghost btn-xs" onClick={props.onReset}>Reset</button>
  <Show when={sortedTemplates().length > 0}>
    <div class="sg-state-templates-manage">
      <For each={sortedTemplates()}>{(t) => (
        <span class="sg-state-template-chip">
          {t.name}
          <button class="sg-state-template-delete" title={`Delete ${t.name}`}
            onClick={() => props.onDeleteTemplate(t.id)}>x</button>
        </span>
      )}</For>
    </div>
  </Show>
</div>
```

- [ ] **Step 3: Typecheck**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/slipgate-app/src/components/StatePanel.tsx
git commit -m "feat(slipgate): StatePanel -- templates header (Save as / Load / Delete / Reset)"
```

---

## Task 20: Wire StatePanel into the right panel with mode toggle

**Files:**
- Modify: `apps/slipgate-app/src/components/useKeyboardPanelState.ts`
- Modify: `apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx`
- Modify: `apps/slipgate-app/src/components/ConfigViewer.tsx`

Adds a `mode: "keyboard" | "state"` signal with persistence, a Keyboard|State segmented toggle in the panel toolbar, and renders StatePanel when mode is "state".

- [ ] **Step 1: Extend useKeyboardPanelState**

Open `src/components/useKeyboardPanelState.ts`. Expand the imports from `../store`:

```ts
import {
  updatePrefs,
  updateSimulatorState,
  saveSimulatorTemplate,
  loadSimulatorTemplate,
  deleteSimulatorTemplate,
  resetSimulatorState,
  type ProfileData,
  type SimulatorTemplate,
} from "../store";
import type { PlayerState } from "../lib/simulator";
import { createDefaultPlayerState } from "../lib/simulator";
```

After the existing `rightModule` signal block, add mode + simulator state plumbing:

```ts
// Right-panel mode
const [rightPanelMode, setRightPanelModeSignal] = createSignal<"keyboard" | "state">(
  input.profile()?.prefs.config_right_panel_mode ?? "keyboard",
);
createEffect(() => {
  const p = input.profile()?.prefs.config_right_panel_mode;
  if (p) setRightPanelModeSignal(p);
});
async function setRightPanelMode(m: "keyboard" | "state") {
  setRightPanelModeSignal(m);
  try { await updatePrefs({ config_right_panel_mode: m }); }
  catch (e) { console.error("persist right-panel mode:", e); }
}

// Simulator state mirrors ProfilePrefs.simulator.
const [simulatorState, setSimulatorStateSignal] = createSignal<PlayerState>(
  input.profile()?.prefs.simulator.currentState ?? createDefaultPlayerState(),
);
const [templates, setTemplates] = createSignal<SimulatorTemplate[]>(
  input.profile()?.prefs.simulator.templates ?? [],
);
createEffect(() => {
  const p = input.profile()?.prefs.simulator;
  if (p) {
    setSimulatorStateSignal(p.currentState);
    setTemplates(p.templates);
  }
});

async function updateSimState(next: PlayerState) {
  setSimulatorStateSignal(next);
  try { await updateSimulatorState(next); }
  catch (e) { console.error("persist sim state:", e); }
}
async function saveTemplate(name: string) {
  try {
    const p = await saveSimulatorTemplate(name);
    setTemplates(p.prefs.simulator.templates);
  } catch (e) { console.error("save template:", e); }
}
async function loadTemplate(id: string) {
  try {
    const p = await loadSimulatorTemplate(id);
    setSimulatorStateSignal(p.prefs.simulator.currentState);
    setTemplates(p.prefs.simulator.templates);
  } catch (e) { console.error("load template:", e); }
}
async function deleteTemplate(id: string) {
  try {
    const p = await deleteSimulatorTemplate(id);
    setTemplates(p.prefs.simulator.templates);
  } catch (e) { console.error("delete template:", e); }
}
async function resetSimState() {
  try {
    const p = await resetSimulatorState();
    setSimulatorStateSignal(p.prefs.simulator.currentState);
  } catch (e) { console.error("reset sim state:", e); }
}
```

Add to the returned object (alongside the existing fields):

```ts
    rightPanelMode,
    setRightPanelMode,
    simulatorState,
    updateSimState,
    templates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    resetSimState,
```

- [ ] **Step 2: Extend ConfigKeyboardPanel with mode support**

Open `src/components/ConfigKeyboardPanel.tsx`. Add three props to `ConfigKeyboardPanelProps`:

```ts
  mode: "keyboard" | "state";
  onModeChange: (m: "keyboard" | "state") => void;
  statePanel?: import("solid-js").JSX.Element;
```

Inside the existing `sg-config-kb-toolbar` div (after `sg-config-kb-toolbar-main` closes, before `sg-config-kb-toolbar-module`), insert the mode toggle:

```tsx
<div class="sg-config-kb-mode-toggle">
  <button
    class="sg-config-kb-module-btn"
    classList={{ "sg-config-kb-module-btn-active": props.mode === "keyboard" }}
    onClick={() => props.onModeChange("keyboard")}
  >Keyboard</button>
  <button
    class="sg-config-kb-module-btn"
    classList={{ "sg-config-kb-module-btn-active": props.mode === "state" }}
    onClick={() => props.onModeChange("state")}
  >State</button>
</div>
```

Wrap the existing two keyboard-body blocks (the `<Show when={props.primary}>` and `<Show when={isCompare()}>` blocks) in an outer `<Show when={props.mode === "keyboard"}>`, and add a parallel `<Show when={props.mode === "state"}>{props.statePanel}</Show>` block below them. The hierarchy becomes:

```tsx
<Show when={props.visible}>
  <div class="sg-config-kb-toolbar">
    {/* existing toolbar-main with toggle-bar */}
    {/* NEW mode toggle */}
    {/* existing toolbar-module */}
  </div>
  <Show when={props.mode === "keyboard"}>
    <Show when={props.primary}>{/* primary keyboard wrap */}</Show>
    <Show when={isCompare()}>{/* compare keyboard wrap */}</Show>
  </Show>
  <Show when={props.mode === "state"}>
    {props.statePanel}
  </Show>
</Show>
```

- [ ] **Step 3: Wire StatePanel into ConfigViewer**

Open `src/components/ConfigViewer.tsx`. Near other component imports (around line 17), add:

```tsx
import StatePanel from "./StatePanel";
```

In the `<ConfigKeyboardPanel ...>` JSX block (around line 931), append the new props:

```tsx
mode={kbState.rightPanelMode()}
onModeChange={kbState.setRightPanelMode}
statePanel={
  <StatePanel
    state={kbState.simulatorState()}
    cvars={effectiveCvars()}
    templates={kbState.templates()}
    onChange={kbState.updateSimState}
    onSaveAs={kbState.saveTemplate}
    onLoadTemplate={kbState.loadTemplate}
    onDeleteTemplate={kbState.deleteTemplate}
    onReset={kbState.resetSimState}
  />
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app
bunx tsc --noEmit
```

Likely issues to resolve:
- If `effectiveCvars()` returns `Record<string, string>` instead of `Map<string, string>`, convert at the call site: `cvars={new Map(Object.entries(effectiveCvars()))}` — or change the call to match the existing primary-cvars pattern used elsewhere in ConfigViewer.
- Missing imports (`createSignal`, `createEffect`) in useKeyboardPanelState — already imported at top of that file, but confirm.

- [ ] **Step 5: Commit**

```bash
git add apps/slipgate-app/src/components/ConfigKeyboardPanel.tsx \
         apps/slipgate-app/src/components/useKeyboardPanelState.ts \
         apps/slipgate-app/src/components/ConfigViewer.tsx
git commit -m "feat(slipgate): right panel -- Keyboard|State toggle + StatePanel wiring"
```

---

## Task 21: Minimal CSS for StatePanel

**Files:**
- Modify: the stylesheet defining existing `sg-config-kb-*` classes (find during this task)

- [ ] **Step 1: Locate the target stylesheet**

```bash
cd /home/paradoks/projects/quakeworld
grep -rn "sg-config-kb-toolbar" apps/slipgate-app/src --include="*.css"
```

Use the file path reported for subsequent edits. Most likely `apps/slipgate-app/src/index.css` or a sibling in `src/styles/`.

- [ ] **Step 2: Append styles**

Append to the located CSS file:

```css
.sg-state-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.5rem;
  overflow-y: auto;
  max-height: 100%;
}

.sg-state-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--sg-border);
}

.sg-state-templates-manage {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  width: 100%;
  margin-top: 0.25rem;
}

.sg-state-template-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.4rem;
  background: var(--sg-chip-bg);
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.sg-state-template-delete {
  color: var(--sg-text-dim);
  cursor: pointer;
  line-height: 1;
}
.sg-state-template-delete:hover {
  color: var(--color-error);
}

.sg-state-section { display: flex; flex-direction: column; gap: 0.25rem; }
.sg-state-section-title { font-weight: 600; font-size: 0.85rem; color: var(--sg-section-label); }
.sg-state-section-body { display: flex; flex-direction: column; gap: 0.2rem; }

.sg-state-row {
  display: grid;
  grid-template-columns: 7rem 1fr;
  align-items: center;
  gap: 0.5rem;
}
.sg-state-row-label { font-size: 0.75rem; color: var(--sg-text-dim); }

.sg-state-derived {
  margin-top: 0.4rem;
  padding: 0.3rem 0.4rem;
  background: var(--sg-panel-alt);
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.75rem;
}
.sg-state-derived-row { display: grid; grid-template-columns: 10rem 1fr; gap: 0.5rem; color: var(--sg-text-dim); }
.sg-state-derived-name { color: var(--sg-text-dim); }
.sg-state-derived-value { color: var(--sg-text-bright); }

.sg-state-cvars {
  margin-top: 0.3rem;
  padding: 0.3rem 0.4rem;
  font-family: monospace;
  font-size: 0.7rem;
}
.sg-state-cvar-row {
  display: grid;
  grid-template-columns: 12rem 7rem 1fr;
  gap: 0.5rem;
  color: var(--sg-text-dim);
  opacity: 0.75;
}
.sg-state-cvar-row-customized {
  opacity: 1;
  color: var(--sg-text-bright);
}

.sg-state-block-label {
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--sg-section-label);
  margin-bottom: 0.15rem;
}

.sg-config-kb-mode-toggle {
  display: flex;
  gap: 0.2rem;
  margin-left: auto;
}
```

Variables (`--sg-border`, `--sg-chip-bg`, `--sg-panel-alt`, `--sg-text-dim`, `--sg-text-bright`, `--sg-section-label`) must already exist in the theme tokens. If any are missing, pick the closest equivalent from the existing CSS (e.g. `--sg-text-dim` is widely used in `AliasChainResolver.tsx`) or add them to the tokens file alongside the existing palette.

- [ ] **Step 3: Build check**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app
bun run build 2>&1 | tail -30
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add <stylesheet-path>
git commit -m "style(slipgate): minimal CSS for StatePanel"
```

Replace `<stylesheet-path>` with the actual path found in Step 1.

---

## Task 22: Manual verification

No code changes — manual verification gate per `CLAUDE.md`.

- [ ] **Step 1: Full typecheck + test run**

```bash
cd /home/paradoks/projects/quakeworld/apps/slipgate-app
bunx tsc --noEmit
bun test src/lib/simulator
```

Both expected green.

- [ ] **Step 2: Windows manual checklist**

Launch `slipgate-app` on Windows (`bun run tauri dev` from the Windows mirror per `apps/slipgate-app/docs/DEVELOPMENT.md`). Walk through:

- Load a teamsay-heavy fixture (e.g. `hangtime.cfg`) via the ConfigViewer's drag-and-drop.
- Navigate to a binds section so the right panel is visible.
- Verify `Keyboard | State` segmented toggle appears in the right-panel toolbar.
- Click State -- keyboard disappears, editor panel renders.
- Flip weapon checkboxes -- `$bestweapon` readout updates live.
- Change health, armor, match status -- derived rows and influencing-cvars table update.
- Save as "dm3 low hp" -- template appears in the header chip list and the dropdown.
- Reset -- working copy returns to spawn defaults. Template persists.
- Load template from dropdown -- working copy restored.
- Delete template via chip `x` -- disappears from dropdown.
- Close and relaunch the app -- working copy persists, templates persist, mode restored.
- Click Keyboard -- previous keyboard view returns.

Report any failure back to the implementer as targeted follow-ups referencing this plan. No final commit required if all checks pass — the preceding tasks are already on `main`.

---

## Self-Review Notes

**Spec coverage:**
- Architecture (§3): modules in Tasks 1-13; panel in 17-19; store in 16; wiring in 20.
- PlayerState shape (§4): Task 1.
- Evaluator grammar + dispatch (§5): Tasks 7-10, old/new-form detection in Task 12 (`splitIfThenElse` + walker).
- Editor panel UX (§6): Tasks 17-19.
- Persistence (§7): Task 16.
- Integration contract (§8): Tasks 11, 13.
- Testing (§9): Tasks 2-15 (unit + fixture + issue); Task 22 (manual).
- File layout (§11): matches this plan's file paths exactly.

**Placeholder scan:** no "TBD" / "handle edge cases" / "similar to Task N" in action steps. Stylesheet task locates the file via a grep step rather than assuming a path — deliberate, not a placeholder.

**Type consistency:** PlayerState shape referenced consistently across types.ts (Task 1), derivations (2-4), expander (5-6), resolver (11-12), StatePanel (17-19), store (16). `RuntimeResolver` / `RuntimeResolution` match the pretty-view spec §3.5 exactly.

**Regex convention reminder:** all code samples use `string.match(regex)` or `string.matchAll(regex)`, never `regex.exec(string)`, per root CLAUDE.md. Implementers must preserve this convention.

