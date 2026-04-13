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
    Mouse1: "mouse1", Mouse2: "mouse2",
    Mouse3: "mwheel", Mouse4: "mouse4", Mouse5: "mouse5",
    MWheelUp: "mwheel", MWheelDown: "mwheel",
  };
  return map[key] ?? null;
}

function groupByWeapon(paths: FiringPath[]): Map<Weapon, FiringPath[]> {
  const map = new Map<Weapon, FiringPath[]>();
  for (const p of paths) {
    if (!map.has(p.weapon)) map.set(p.weapon, []);
    map.get(p.weapon)!.push(p);
  }
  return map;
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
            const paths = () => pathsByWeapon().get(weapon as Weapon);
            const bound = () => !!paths()?.length;
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
                {/* One row per firing path when bound */}
                <Show when={bound()}>
                  <For each={paths()}>
                    {(path) => {
                      const isDefault = path.source === "engine_default";
                      const methodLabel = path.method === "quickfire"
                        ? "quickfire"
                        : `manual-${path.flavor}`;
                      return (
                        <div
                          class="sg-firing-path-row"
                          classList={{ "opacity-50": isDefault }}
                          title={path.origin_alias_chain.length > 0
                            ? path.origin_alias_chain.join(" -> ")
                            : undefined}
                        >
                          <span class="sg-weapon-cell-bind">
                            <span class="sg-keycap">{path.trigger_key}</span>
                            <Show when={path.method === "manual" && path.fire_key}>
                              <span class="sg-weapon-cell-arrow">&rarr;</span>
                              <span class="sg-keycap">{path.fire_key}</span>
                            </Show>
                          </span>
                          <span
                            class="badge badge-sm sg-weapon-cell-method"
                            classList={{
                              "badge-primary": path.method === "quickfire",
                              "badge-secondary": path.method === "manual" && path.flavor === "select",
                              "badge-accent": path.method === "manual" && path.flavor === "hold",
                            }}
                          >
                            {methodLabel}
                          </span>
                          <Show when={isDefault}>
                            <span class="text-xs italic opacity-60">(default)</span>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
