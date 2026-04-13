import { For, Show } from "solid-js";
import type { FiringPath, Weapon, MovementKeys } from "../types";
import MouseSvg from "./MouseSvg";
import type { MouseHighlights } from "./MouseSvg";

/* --- Weapon color palette (OKLCH) ---------------------------------------- */

export const WEAPON_COLORS: Record<string, string> = {
  rl:  "oklch(0.7 0.2 30)",     // red/orange
  lg:  "oklch(0.8 0.15 210)",   // cyan
  gl:  "oklch(0.7 0.15 140)",   // green
  sng: "oklch(0.7 0.15 300)",   // purple
  ng:  "oklch(0.6 0.1 300)",    // dim purple
  ssg: "oklch(0.7 0.15 80)",    // yellow
  sg:  "oklch(0.5 0.05 0)",     // gray
  axe: "oklch(0.6 0.1 50)",     // brown
};

const WEAPON_LABELS: Record<string, string> = {
  rl: "RL", lg: "LG", gl: "GL", sng: "SNG", ng: "NG",
  ssg: "SSG", sg: "SG", axe: "AXE",
};

// All 8 weapons in impulse order (1-8)
const ALL_WEAPONS = ["axe", "sg", "ssg", "ng", "sng", "gl", "rl", "lg"];

/* --- Weapon firing-path grid (4x2 + mouse) -------------------------------- */

// Map key name to MouseHighlights key
function toMouseButton(key: string): keyof MouseHighlights | null {
  const map: Record<string, keyof MouseHighlights> = {
    MOUSE1: "mouse1", MOUSE2: "mouse2",
    MOUSE3: "mwheel", MOUSE4: "mouse4", MOUSE5: "mouse5",
    MWHEELUP: "mwheel", MWHEELDOWN: "mwheel",
  };
  return map[key.toUpperCase()] ?? null;
}

function groupByWeapon(paths: FiringPath[]): Map<Weapon, FiringPath[]> {
  const map = new Map<Weapon, FiringPath[]>();
  for (const p of paths) {
    if (!map.has(p.weapon)) map.set(p.weapon, []);
    map.get(p.weapon)!.push(p);
  }
  return map;
}

/**
 * Profile view shows one firing path per weapon. When a weapon has multiple
 * paths (e.g., a hybrid quickfire + manual-select), pick the most representative:
 * quickfire over manual-select over manual-hold, and explicit over engine_default.
 * Tiebreak by classifier emission order (stable via reduce).
 */
function pickPrimaryPath(paths: FiringPath[] | undefined): FiringPath | undefined {
  if (!paths || paths.length === 0) return undefined;
  const score = (p: FiringPath) =>
    (p.method === "quickfire" ? 0 : p.flavor === "select" ? 10 : 20) +
    (p.source === "explicit" ? 0 : 100);
  return paths.reduce((best, cur) => (score(cur) < score(best) ? cur : best));
}

interface WeaponBindVizProps {
  firingPaths: FiringPath[];
  movement?: MovementKeys;
  showMovement?: boolean;
  /** When true, show weapon sprite icons. When false, show large colored acronyms. */
  showIcons?: boolean;
  /** Extra mouse button highlights (e.g. from teamsay binds). Won't override weapon/movement. */
  extraMouseHighlights?: MouseHighlights;
}

export default function WeaponBindViz(props: WeaponBindVizProps) {
  // Group firing paths by weapon for the grid
  const pathsByWeapon = () => groupByWeapon(props.firingPaths);

  // Build mouse button highlights from movement + firing paths
  const mouseHighlights = (): MouseHighlights => {
    const hl: MouseHighlights = {};
    // Movement highlights (jump, move keys on mouse)
    if (props.showMovement !== false && props.movement) {
      const m = props.movement;
      const jumpBtn = toMouseButton(m.jump);
      if (jumpBtn) hl[jumpBtn] = "oklch(0.65 0.18 145)"; // green (jump)
      for (const key of [m.forward, m.back, m.moveleft, m.moveright]) {
        const btn = toMouseButton(key);
        if (btn) hl[btn] = "oklch(0.76 0.13 235)"; // blue (movement)
      }
    }
    // Weapon highlights (trigger key or fire_key on mouse)
    for (const fp of props.firingPaths) {
      const btn = toMouseButton(fp.trigger_key);
      if (btn) hl[btn] = WEAPON_COLORS[fp.weapon] ?? "oklch(0.5 0.05 0)";
      if (fp.fire_key) {
        const fireBtn = toMouseButton(fp.fire_key);
        if (fireBtn && !hl[fireBtn]) {
          hl[fireBtn] = "oklch(0.55 0.06 250)"; // neutral fire button
        }
      }
    }
    // Extra highlights (teamsay etc.) -- don't override existing
    if (props.extraMouseHighlights) {
      for (const [key, color] of Object.entries(props.extraMouseHighlights)) {
        if (!hl[key as keyof MouseHighlights]) {
          hl[key as keyof MouseHighlights] = color;
        }
      }
    }
    return hl;
  };

  return (
    <div class="sg-weapon-grid-wrap">
      {/* Mouse on the left */}
      <div class="sg-weapon-grid-mouse">
        <MouseSvg highlights={mouseHighlights()} />
      </div>

      {/* 4x2 weapon grid */}
      <div class="sg-weapon-grid">
        <For each={ALL_WEAPONS}>
          {(weapon) => {
            const primary = () => pickPrimaryPath(pathsByWeapon().get(weapon as Weapon));
            const bound = () => !!primary();
            const color = WEAPON_COLORS[weapon] ?? "oklch(0.5 0.05 0)";

            return (
              <div class="sg-weapon-cell" classList={{ "sg-weapon-cell-unbound": !bound() }}>
                {/* Headline: icon or large acronym (mutually exclusive) */}
                <Show when={props.showIcons !== false} fallback={
                  <span
                    class="sg-weapon-cell-name"
                    style={bound() ? `color: ${color}` : undefined}
                  >
                    {WEAPON_LABELS[weapon] ?? weapon.toUpperCase()}
                  </span>
                }>
                  <img
                    src={`/weapons/${weapon}.png`}
                    alt={weapon}
                    class="sg-weapon-cell-icon"
                  />
                </Show>
                {/* Summary: one path per weapon. Label first, keys second. */}
                <Show when={primary()}>
                  {(p) => {
                    const isManual = p().method === "manual";
                    const isDefault = p().source === "engine_default";
                    return (
                      <div
                        classList={{ "opacity-50": isDefault }}
                        title={p().origin_alias_chain.length > 0
                          ? p().origin_alias_chain.join(" -> ")
                          : undefined}
                      >
                        <span
                          class="sg-weapon-cell-method"
                          classList={{
                            "sg-weapon-bind-quickfire": !isManual,
                            "sg-weapon-bind-manual": isManual,
                          }}
                        >
                          {isManual ? "manual" : "quickfire"}
                        </span>
                        <span class="sg-weapon-cell-bind">
                          <span class="sg-keycap">{p().trigger_key}</span>
                          <Show when={isManual && p().fire_key}>
                            <span class="sg-weapon-cell-arrow">&rarr;</span>
                            <span class="sg-keycap">{p().fire_key}</span>
                          </Show>
                        </span>
                        <Show when={isDefault}>
                          <span class="text-xs italic opacity-60">(default)</span>
                        </Show>
                      </div>
                    );
                  }}
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
