import { For, Show, createSignal, createMemo } from "solid-js";
import type { JSX } from "solid-js";
import type { SimulatorTemplate } from "../store";
import type { LocEntry } from "../types";
import type {
  PlayerState, Weapon, Powerup, ArmorClass, MatchStatus, LedColor,
} from "../lib/simulator";
import {
  deriveWeaponsString, deriveBestWeapon, deriveBestAmmo,
  derivePowerupsString, deriveArmortype, deriveColoredArmor,
  deriveWeaponNum, deriveAmmo,
} from "../lib/simulator";

interface StatePanelProps {
  state: PlayerState;
  cvars: Map<string, string>;
  templates: SimulatorTemplate[];
  // Map of mapname (lowercased) -> locations parsed from .loc files. Empty
  // when no exe path is set or no loc dirs are found.
  locs: Record<string, LocEntry[]>;
  onChange: (next: PlayerState) => void;
  onSaveAs: (name: string) => void;
  onLoadTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onReset: () => void;
}

// Weapon layout: two rows grouping by ammo family. Row 1 holds the two
// fastest-firing pairs (shells, nails) as 2+2. Row 2 holds the remaining
// weapons as 2+1+1: rockets pair, cells single, axe single. Each family
// gets a coloured border keyed to its ammo sprite tint so users can
// recognise the family at a glance; ammo input renders once per family
// centered under the weapon cells.
type WeaponFamily = "shells" | "nails" | "rox" | "cells" | "none";
interface WeaponGroup {
  weapons: Weapon[];
  ammoKey: Extract<keyof PlayerState, "shells" | "nails" | "rockets" | "cells"> | null;
  ammoLabel: string;
  family: WeaponFamily;
}
const WEAPON_ROW_1: WeaponGroup[] = [
  { weapons: ["sg", "ssg"], ammoKey: "shells", ammoLabel: "shells", family: "shells" },
  { weapons: ["ng", "sng"], ammoKey: "nails", ammoLabel: "nails", family: "nails" },
];
const WEAPON_ROW_2: WeaponGroup[] = [
  { weapons: ["gl", "rl"], ammoKey: "rockets", ammoLabel: "rockets", family: "rox" },
  { weapons: ["lg"], ammoKey: "cells", ammoLabel: "cells", family: "cells" },
  { weapons: ["axe"], ammoKey: null, ammoLabel: "", family: "none" },
];

const POWERUPS: Powerup[] = ["quad", "pent", "ring", "biosuit"];
const ARMOR_VISIBLE_CLASSES: Exclude<ArmorClass, "none">[] = ["ga", "ya", "ra"];
const MATCH_STATUSES: MatchStatus[] = ["standby", "countdown", "live", "overtime", "ended"];
const LED_COLORS: LedColor[] = ["none", "green", "red", "yellow"];

// Sprite paths (served from apps/slipgate-app/public/wad/).
const ARMOR_SPRITE: Record<Exclude<ArmorClass, "none">, string> = {
  ga: "/wad/sb_armor1.png",
  ya: "/wad/sb_armor2.png",
  ra: "/wad/sb_armor3.png",
};
const AMMO_SPRITE: Record<Exclude<WeaponFamily, "none">, string> = {
  shells: "/wad/sb_shells.png",
  nails: "/wad/sb_nails.png",
  rox: "/wad/sb_rocket.png",
  cells: "/wad/sb_cells.png",
};
const WEAPON_SPRITE: Partial<Record<Weapon, string>> = {
  sg: "/wad/inv_shotgun.png",
  ssg: "/wad/inv_sshotgun.png",
  ng: "/wad/inv_nailgun.png",
  sng: "/wad/inv_snailgun.png",
  // Q1 WAD conventions: `rlaunch` sprite is the grenade launcher,
  // `srlaunch` is the rocket launcher. Inverted vs their filename sound.
  gl: "/wad/inv_rlaunch.png",
  rl: "/wad/inv_srlaunch.png",
  lg: "/wad/inv_lightng.png",
  // axe has no distinct weapon sprite in this WAD set — rendered as text.
};
const POWERUP_SPRITE: Partial<Record<Powerup, string>> = {
  quad: "/wad/face_quad.png",
  pent: "/wad/face_invul.png",
  ring: "/wad/face_invis.png",
  // biosuit has no face sprite — rendered as text tile.
};

// Face sprite follows ezQuake's statusbar logic: tier by HP band with
// powerup overrides (quad/pent/ring take precedence).
function faceSprite(state: PlayerState): string {
  if (state.activePowerups.has("quad")) return "/wad/face_quad.png";
  if (state.activePowerups.has("pent")) return "/wad/face_invul.png";
  if (state.activePowerups.has("ring")) return "/wad/face_invis.png";
  const hp = state.health;
  if (hp >= 80) return "/wad/face1.png";
  if (hp >= 60) return "/wad/face2.png";
  if (hp >= 40) return "/wad/face3.png";
  if (hp >= 20) return "/wad/face4.png";
  return "/wad/face5.png";
}

export default function StatePanel(props: StatePanelProps) {
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

  // Disclosure state for the secondary tiers. Kept as local component
  // state — persisting is cheap future work but not needed for v1.
  const [openDetails, setOpenDetails] = createSignal<Set<string>>(new Set());
  function toggleDetails(id: string) {
    setOpenDetails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  const isOpen = (id: string) => openDetails().has(id);

  function update<K extends keyof PlayerState>(key: K, value: PlayerState[K]) {
    props.onChange({ ...props.state, [key]: value });
  }
  function toggleWeapon(w: Weapon) {
    const next = new Set(props.state.ownedWeapons);
    if (next.has(w)) next.delete(w); else next.add(w);
    update("ownedWeapons", next);
  }
  function setCurrentWeapon(w: Weapon) {
    // Selecting a weapon as current implies possession — auto-toggle so the
    // state stays internally consistent (the simulator treats currentWeapon
    // as authoritative when it conflicts with ownedWeapons).
    const owned = new Set(props.state.ownedWeapons);
    owned.add(w);
    props.onChange({ ...props.state, currentWeapon: w, ownedWeapons: owned });
  }
  function togglePowerup(p: Powerup) {
    const next = new Set(props.state.activePowerups);
    if (next.has(p)) next.delete(p); else next.add(p);
    update("activePowerups", next);
  }

  // Map and location dropdowns use <datalist> rather than <select> so the
  // input doubles as a free-text field. Typing filters the suggestions;
  // clicking the dropdown arrow on an empty/focused input shows all.
  // Location names from .loc files often contain ezQuake macros like
  // `$loc_name_ra$loc_name_separatorbox`; we resolve those to display
  // text using the loaded cvars (with hardcoded fallbacks for common
  // loc_name_* defaults so the dropdown is useful even without a config).
  const mapOptions = createMemo(() => Object.keys(props.locs).sort());
  const locOptions = createMemo(() => {
    const m = props.state.mapname.trim().toLowerCase();
    const raw = props.locs[m] ?? [];
    // De-dupe by resolved display name so variants of the same spot
    // (e.g. multiple `$loc_name_ra` nodes) don't flood the list.
    const seen = new Set<string>();
    const out: string[] = [];
    for (const entry of raw) {
      const display = displayLocName(entry.name, props.cvars);
      if (seen.has(display)) continue;
      seen.add(display);
      out.push(display);
    }
    return out.sort();
  });

  return (
    <div class="sg-state-panel">
      <div class="sg-state-header">
        <select
          class="select select-xs"
          disabled={props.templates.length === 0}
          onChange={(e) => {
            const id = e.currentTarget.value;
            if (id) props.onLoadTemplate(id);
            e.currentTarget.value = "";
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

      {/* ── Tier 1: Vitals — face+HP slot plus GA/YA/RA armor slots ── */}
      <Section title="Vitals">
        <div class="sg-state-slot-tier">
          {/* HP slot: face sprite reacts to HP band + powerup overrides. */}
          <SpriteSlot
            active
            sprite={faceSprite(props.state)}
            label="HP"
            value={props.state.health}
            min={0}
            max={250}
            onChange={(v) => update("health", v)}
            need={{ cvars: props.cvars, cvarName: "tp_need_health" }}
          />
          {/* Armor class mutex: clicking an inactive class swaps to it.
              Clicking the active one toggles it back to "none" (cleared). */}
          <For each={ARMOR_VISIBLE_CLASSES}>{(c) => {
            const active = () => props.state.armorClass === c;
            return (
              <SpriteSlot
                active={active()}
                armorClass={c}
                sprite={ARMOR_SPRITE[c]}
                label={c.toUpperCase()}
                value={active() ? props.state.armor : 0}
                readOnlyValue={!active()}
                min={0}
                max={200}
                onChange={(v) => {
                  if (active()) update("armor", v);
                }}
                onSlotClick={() => {
                  if (active()) {
                    props.onChange({ ...props.state, armorClass: "none", armor: 0 });
                  } else {
                    update("armorClass", c);
                  }
                }}
                need={{ cvars: props.cvars, cvarName: "tp_need_armor" }}
              />
            );
          }}</For>
        </div>
        <Disclosure label="Details" open={isOpen("vitals-details")}
          onToggle={() => toggleDetails("vitals-details")}>
          <DerivedBlock rows={[
            ["$armortype", deriveArmortype(props.state, props.cvars)],
            ["$colored_armor", deriveColoredArmor(props.state)],
          ]} />
          <InfluencingCvarsBlock cvars={props.cvars}
            names={["tp_name_armortype_ga","tp_name_armortype_ya","tp_name_armortype_ra","tp_name_armortype_none"]} />
        </Disclosure>
      </Section>

      {/* ── Tier 2: Powerups — Q/P/R face sprites + biosuit text tile ── */}
      <Section title="Powerups">
        <div class="sg-state-slot-tier">
          <For each={POWERUPS}>{(p) => {
            const active = () => props.state.activePowerups.has(p);
            return (
              <SpriteSlot
                active={active()}
                sprite={POWERUP_SPRITE[p]}
                textTile={POWERUP_SPRITE[p] ? undefined : p.toUpperCase()}
                label={p}
                onSlotClick={() => togglePowerup(p)}
              />
            );
          }}</For>
        </div>
        <Disclosure label="Details" open={isOpen("powerups-details")}
          onToggle={() => toggleDetails("powerups-details")}>
          <DerivedBlock rows={[
            ["$powerups", derivePowerupsString(props.state, props.cvars)],
          ]} />
          <InfluencingCvarsBlock cvars={props.cvars}
            names={["tp_name_quad","tp_name_pent","tp_name_ring","tp_name_biosuit","tp_poweruptextstyle"]} />
        </Disclosure>
      </Section>

      {/* ── Tier 3: Weapons — 2+2 row then 2+1+1 row, ammo per family ── */}
      <Section title="Weapons">
        <div class="sg-state-weapon-row-2-2">
          <For each={WEAPON_ROW_1}>{(group) => (
            <WeaponFamilyCell
              group={group}
              state={props.state}
              cvars={props.cvars}
              onToggleWeapon={toggleWeapon}
              onSetCurrent={setCurrentWeapon}
              onAmmoChange={(k, v) => update(k, v)}
            />
          )}</For>
        </div>
        <div class="sg-state-weapon-row-2-1-1">
          <For each={WEAPON_ROW_2}>{(group) => (
            <WeaponFamilyCell
              group={group}
              state={props.state}
              cvars={props.cvars}
              onToggleWeapon={toggleWeapon}
              onSetCurrent={setCurrentWeapon}
              onAmmoChange={(k, v) => update(k, v)}
            />
          )}</For>
        </div>
        <Disclosure label="Details" open={isOpen("weapons-details")}
          onToggle={() => toggleDetails("weapons-details")}>
          <DerivedBlock rows={[
            ["$weapons", deriveWeaponsString(props.state, props.cvars)],
            ["$bestweapon", deriveBestWeapon(props.state, props.cvars)],
            ["$bestammo", String(deriveBestAmmo(props.state, props.cvars))],
            ["$weaponnum", String(deriveWeaponNum(props.state))],
            ["$ammo", String(deriveAmmo(props.state))],
          ]} />
          <InfluencingCvarsBlock cvars={props.cvars}
            names={["tp_weapon_order","tp_name_sg","tp_name_ssg","tp_name_ng","tp_name_sng","tp_name_gl","tp_name_rl","tp_name_lg"]} />
        </Disclosure>
      </Section>

      {/* ── Collapsed tiers ── */}
      <Section title="Location"
        summary={props.state.mapname ? `${props.state.mapname}${props.state.location ? " @ " + props.state.location : ""}` : "—"}
        collapsible
        open={isOpen("location")}
        onToggle={() => toggleDetails("location")}
      >
        <Row label="Map">
          <ComboInput
            value={props.state.mapname}
            options={mapOptions()}
            listId="sg-state-map-options"
            onChange={(v) => update("mapname", v)}
          />
        </Row>
        <Row label="Location">
          <ComboInput
            value={props.state.location}
            options={locOptions()}
            listId="sg-state-loc-options"
            onChange={(v) => update("location", v)}
          />
        </Row>
        <Row label="Last loc"><TextInput value={props.state.lastloc} onChange={(v) => update("lastloc", v)} /></Row>
        <Row label="Death loc"><TextInput value={props.state.deathloc} onChange={(v) => update("deathloc", v)} /></Row>
      </Section>

      <Section title="Match"
        summary={`${props.state.matchstatus}${props.state.matchname ? " · " + props.state.matchname : ""}`}
        collapsible
        open={isOpen("match")}
        onToggle={() => toggleDetails("match")}
      >
        <Row label="Name"><TextInput value={props.state.matchname} onChange={(v) => update("matchname", v)} /></Row>
        <Row label="Status">
          <EnumSelect value={props.state.matchstatus} options={MATCH_STATUSES}
            onChange={(v) => update("matchstatus", v as MatchStatus)} width="md" />
        </Row>
        <Row label="Type"><TextInput value={props.state.matchtype} onChange={(v) => update("matchtype", v)} /></Row>
      </Section>

      <Section title="LEDs & pointing"
        summary={`led: ${props.state.ledstatus}${props.state.point ? " · pointing " + props.state.point : ""}`}
        collapsible
        open={isOpen("led")}
        onToggle={() => toggleDetails("led")}
      >
        <Row label="Led point">
          <EnumSelect value={props.state.ledpoint} options={LED_COLORS}
            onChange={(v) => update("ledpoint", v as LedColor)} width="sm" />
        </Row>
        <Row label="Led status">
          <EnumSelect value={props.state.ledstatus} options={LED_COLORS}
            onChange={(v) => update("ledstatus", v as LedColor)} width="sm" />
        </Row>
        <Row label="Point"><TextInput value={props.state.point} onChange={(v) => update("point", v)} /></Row>
        <Row label="Point loc"><TextInput value={props.state.pointloc} onChange={(v) => update("pointloc", v)} /></Row>
        <Row label="Point at loc"><TextInput value={props.state.pointatloc} onChange={(v) => update("pointatloc", v)} /></Row>
      </Section>

      <Section title="Recent events"
        summary={props.state.took ? `took ${props.state.took}` : "—"}
        collapsible
        open={isOpen("events")}
        onToggle={() => toggleDetails("events")}
      >
        <Row label="Took"><TextInput value={props.state.took} onChange={(v) => update("took", v)} /></Row>
        <Row label="Took loc"><TextInput value={props.state.tookloc} onChange={(v) => update("tookloc", v)} /></Row>
        <Row label="Took at loc"><TextInput value={props.state.tookatloc} onChange={(v) => update("tookatloc", v)} /></Row>
        <Row label="Drop loc"><TextInput value={props.state.droploc} onChange={(v) => update("droploc", v)} /></Row>
        <Row label="Drop time"><NumInput value={props.state.droptime} onChange={(v) => update("droptime", v)} /></Row>
        <Row label="Last powerup"><TextInput value={props.state.lastpowerup} onChange={(v) => update("lastpowerup", v)} /></Row>
      </Section>
    </div>
  );
}

/**
 * Sprite slot used by Vitals (face+HP, GA/YA/RA) and Powerups (Q/P/R/B).
 * Layout: [sprite area] above [value input or text label] so the visual
 * rhythm matches the WeaponFamilyCell below (sprite on top, number below).
 * When no value is passed the slot is a pure toggle (powerups).
 */
function SpriteSlot(props: {
  active: boolean;
  sprite?: string;
  textTile?: string;
  label: string;
  armorClass?: "ga" | "ya" | "ra";
  value?: number;
  readOnlyValue?: boolean;
  min?: number;
  max?: number;
  onChange?: (v: number) => void;
  onSlotClick?: () => void;
  need?: { cvars: Map<string, string>; cvarName: string };
}) {
  const customized = () => {
    if (!props.need) return false;
    const def = NEED_DEFAULTS[props.need.cvarName];
    const user = props.need.cvars.get(props.need.cvarName);
    return user !== undefined && user !== def;
  };
  return (
    <div class="sg-state-slot" classList={{
      "sg-state-slot-active": props.active,
      "sg-state-slot-dim": !props.active,
      [`sg-state-slot-armor-${props.armorClass ?? ""}`]: !!props.armorClass,
      "sg-state-slot-need-customized": customized(),
    }}>
      <button class="sg-state-slot-sprite"
        onClick={props.onSlotClick}
        title={props.label}
      >
        <Show when={props.sprite} fallback={<span class="sg-state-slot-text-tile">{props.textTile}</span>}>
          <img src={props.sprite} alt={props.label} />
        </Show>
      </button>
      <div class="sg-state-slot-footer">
        <Show when={props.value !== undefined}
          fallback={<span class="sg-state-slot-label">{props.label}</span>}
        >
          <input type="number"
            class="sg-state-slot-input"
            value={props.value}
            min={props.min}
            max={props.max}
            readOnly={props.readOnlyValue}
            onInput={(e) => props.onChange?.(Number(e.currentTarget.value))}
          />
        </Show>
      </div>
      <Show when={props.need}>
        <span class="sg-state-slot-need">
          need &lt; {props.need!.cvars.get(props.need!.cvarName) ?? NEED_DEFAULTS[props.need!.cvarName] ?? ""}
        </span>
      </Show>
    </div>
  );
}

/**
 * Weapon family card: a framed group (border colour keyed to ammo type)
 * containing one cell per weapon (current-weapon dot above possession
 * sprite), and a single centered ammo input underneath that applies to
 * the whole family. Axe family has no ammo input.
 */
function WeaponFamilyCell(props: {
  group: WeaponGroup;
  state: PlayerState;
  cvars: Map<string, string>;
  onToggleWeapon: (w: Weapon) => void;
  onSetCurrent: (w: Weapon) => void;
  onAmmoChange: <K extends Extract<keyof PlayerState, "shells" | "nails" | "rockets" | "cells">>(k: K, v: PlayerState[K]) => void;
}) {
  const customized = () => {
    if (!props.group.ammoLabel) return false;
    const name = `tp_need_${props.group.ammoLabel}`;
    const def = NEED_DEFAULTS[name];
    const user = props.cvars.get(name);
    return user !== undefined && user !== def;
  };
  return (
    <div class={`sg-state-weapon-family sg-state-fam-${props.group.family}`}
      classList={{ "sg-state-weapon-family-need-customized": customized() }}
    >
      <div class="sg-state-weapon-family-row">
        <For each={props.group.weapons}>{(w) => (
          <div class="sg-state-weapon-family-cell">
            <button
              class="sg-state-weapon-current"
              classList={{ "sg-state-weapon-current-active": props.state.currentWeapon === w }}
              title={`Set ${w} as current weapon`}
              onClick={() => props.onSetCurrent(w)}
            >
              <span class="sg-state-weapon-current-dot" />
            </button>
            <button
              class="sg-state-weapon-sprite"
              classList={{
                "sg-state-weapon-sprite-owned": props.state.ownedWeapons.has(w),
                "sg-state-weapon-sprite-dim": !props.state.ownedWeapons.has(w),
              }}
              onClick={() => props.onToggleWeapon(w)}
              title={w}
            >
              <Show when={WEAPON_SPRITE[w]} fallback={<span class="sg-state-weapon-text">{w.toUpperCase()}</span>}>
                <img src={WEAPON_SPRITE[w]} alt={w} />
              </Show>
            </button>
          </div>
        )}</For>
      </div>
      <Show when={props.group.ammoKey !== null && props.group.family !== "none"}>
        <div class="sg-state-family-ammo">
          <img class="sg-state-family-ammo-sprite"
            src={AMMO_SPRITE[props.group.family as Exclude<WeaponFamily, "none">]}
            alt={props.group.ammoLabel} />
          <input type="number"
            class="sg-state-family-ammo-input"
            value={props.state[props.group.ammoKey!] as number}
            min={0}
            max={200}
            onInput={(e) => props.onAmmoChange(props.group.ammoKey!, Number(e.currentTarget.value) as never)}
          />
          <span class="sg-state-family-ammo-need">
            need &lt; {props.cvars.get(`tp_need_${props.group.ammoLabel}`) ?? NEED_DEFAULTS[`tp_need_${props.group.ammoLabel}`] ?? ""}
          </span>
        </div>
      </Show>
    </div>
  );
}

function Section(props: {
  title: string;
  children: JSX.Element;
  summary?: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  if (!props.collapsible) {
    return (
      <div class="sg-state-section">
        <div class="sg-state-section-title">{props.title}</div>
        <div class="sg-state-section-body">{props.children}</div>
      </div>
    );
  }
  return (
    <div class="sg-state-section sg-state-section-collapsible">
      <button class="sg-state-section-title sg-state-section-title-collapsible"
        onClick={props.onToggle}
      >
        <span class="sg-state-section-caret">{props.open ? "▼" : "▶"}</span>
        <span>{props.title}</span>
        <Show when={!props.open && props.summary}>
          <span class="sg-state-section-summary">{props.summary}</span>
        </Show>
      </button>
      <Show when={props.open}>
        <div class="sg-state-section-body">{props.children}</div>
      </Show>
    </div>
  );
}

function Disclosure(props: { label: string; open: boolean; onToggle: () => void; children: JSX.Element }) {
  return (
    <div class="sg-state-disclosure">
      <button class="sg-state-disclosure-toggle" onClick={props.onToggle}>
        <span class="sg-state-section-caret">{props.open ? "▼" : "▶"}</span>
        <span>{props.label}</span>
      </button>
      <Show when={props.open}>
        <div class="sg-state-disclosure-body">{props.children}</div>
      </Show>
    </div>
  );
}

function Row(props: { label: string; children: JSX.Element }) {
  return (
    <div class="sg-state-row">
      <label class="sg-state-row-label">{props.label}</label>
      <div class="sg-state-row-control">{props.children}</div>
    </div>
  );
}

function NumInput(props: { value: number; min?: number; max?: number; width?: "xs" | "sm"; onChange: (v: number) => void }) {
  const widthClass = props.width === "xs" ? "w-14" : "w-20";
  return (
    <input type="number" class={`input input-xs ${widthClass}`}
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

/**
 * Text input backed by an HTML <datalist>. The browser renders a dropdown
 * arrow that reveals the full option list on click; typing filters the
 * list via substring match. Works in WebView2 natively — no custom
 * open/close state needed.
 */
function ComboInput(props: {
  value: string;
  options: readonly string[];
  listId: string;
  onChange: (v: string) => void;
}) {
  return (
    <>
      <input type="text" class="input input-xs w-full"
        list={props.options.length > 0 ? props.listId : undefined}
        value={props.value}
        onInput={(e) => props.onChange(e.currentTarget.value)} />
      <Show when={props.options.length > 0}>
        <datalist id={props.listId}>
          <For each={props.options}>{(o) => <option value={o} />}</For>
        </datalist>
      </Show>
    </>
  );
}

// Common `loc_name_*` defaults baked into ezQuake. Used as a fallback for
// the location-name resolver when the loaded config doesn't override them,
// so the dropdown remains readable even on a blank config.
const LOC_NAME_DEFAULTS: Record<string, string> = {
  loc_name_ra: "ra", loc_name_ya: "ya", loc_name_ga: "ga",
  loc_name_rl: "rl", loc_name_gl: "gl", loc_name_lg: "lg",
  loc_name_sng: "sng", loc_name_ng: "ng", loc_name_ssg: "ssg", loc_name_sg: "sg",
  loc_name_quad: "quad", loc_name_pent: "pent", loc_name_ring: "ring",
  loc_name_suit: "suit", loc_name_mh: "mh", loc_name_separator: "-",
};

// ezQuake single-character `$<punct>` shortcuts. These bypass the cvar
// identifier scan and map to a specific glyph in the conchar palette.
// For the loc-dropdown labels we just want a readable ASCII-ish stand-in;
// the real-colour rendering belongs to the pretty-view layer, not here.
const SINGLE_CHAR_MACROS: Record<string, string> = {
  ".": "\u00B7", // yellow dot -> middle dot
  ",": ".",      // white dot -> period
};

/**
 * Greedy longest-cvar-prefix expansion for `$name` tokens. ezQuake's own
 * parser picks the longest cvar name starting at `$`, so strings like
 * `$loc_name_separatorgl` resolve as `$loc_name_separator` + `gl` when
 * no cvar named `loc_name_separatorgl` exists.
 *
 * Substituted cvar values are themselves re-expanded (depth-limited) so
 * configs that set `loc_name_separator "$."` correctly collapse into the
 * yellow-dot single-char macro rather than leaving `$.` as literal text.
 */
function expandCvarRefs(raw: string, cvars: Map<string, string>, depth = 0): string {
  if (depth > 4) return raw; // safety against recursive cvar refs
  let out = "";
  let i = 0;
  while (i < raw.length) {
    if (raw[i] !== "$") {
      out += raw[i];
      i++;
      continue;
    }
    let j = i + 1;
    while (j < raw.length && /[a-zA-Z0-9_]/.test(raw[j])) j++;
    let matchedLen = 0;
    let matchedVal: string | undefined;
    for (let len = j - (i + 1); len > 0; len--) {
      const name = raw.substring(i + 1, i + 1 + len);
      const val = cvars.get(name) ?? LOC_NAME_DEFAULTS[name];
      if (val !== undefined) {
        matchedLen = len;
        matchedVal = val;
        break;
      }
    }
    if (matchedVal !== undefined) {
      out += expandCvarRefs(matchedVal, cvars, depth + 1);
      i += 1 + matchedLen;
      continue;
    }
    const nextChar = raw[i + 1];
    if (nextChar !== undefined && SINGLE_CHAR_MACROS[nextChar] !== undefined) {
      out += SINGLE_CHAR_MACROS[nextChar];
      i += 2;
      continue;
    }
    out += raw[i];
    i++;
  }
  return out;
}

// Strip ezQuake color codes (`&cRGB` with 3 hex + `&r` reset) so the
// dropdown labels are readable. The raw values still travel through the
// simulator / resolver unchanged wherever needed elsewhere.
function stripColorCodes(s: string): string {
  return s.replace(/&c[0-9a-fA-F]{3}/g, "").replace(/&r/g, "");
}

function displayLocName(raw: string, cvars: Map<string, string>): string {
  return stripColorCodes(expandCvarRefs(raw, cvars)).trim();
}

function EnumSelect<T extends string>(props: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  width?: "sm" | "md" | "lg";
}) {
  const widthClass =
    props.width === "lg" ? "w-32" :
    props.width === "md" ? "w-24" :
    "w-20";
  return (
    <select class={`select select-xs ${widthClass}`} value={props.value}
      onChange={(e) => props.onChange(e.currentTarget.value as T)}>
      <For each={props.options}>{(o) => <option value={o}>{o}</option>}</For>
    </select>
  );
}

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

// ezQuake default thresholds for tp_need_* cvars. 0 means "never considered
// needed" in practice (shells/nails) but we still render it — the information
// is useful and consistent with how influencing cvars render defaults.
const NEED_DEFAULTS: Record<string, string> = {
  tp_need_health: "50",
  tp_need_armor: "50",
  tp_need_rockets: "5",
  tp_need_cells: "30",
  tp_need_shells: "0",
  tp_need_nails: "0",
};

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
