import { For, Show, createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
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

// Weapon layout: 4-wide grid matching Vitals / Powerups. Rows follow the
// in-game 1-8 key order. Each cell owns its own sprite + ammo footer;
// the ammo input sits under the FIRST weapon of each shared-ammo pair
// (sg carries shells for both sg+ssg, ng for ng+sng, gl for gl+rl).
// Cells without ammo render an invisible footer so heights stay aligned.
type WeaponFamily = "shells" | "nails" | "rox" | "cells" | "none";
type AmmoKey = Extract<keyof PlayerState, "shells" | "nails" | "rockets" | "cells">;
interface WeaponCellSpec {
  weapon: Weapon;
  ammoKey: AmmoKey | null;
  ammoLabel: string;
  family: WeaponFamily;
}
const WEAPON_ROW_1: WeaponCellSpec[] = [
  { weapon: "sg",  ammoKey: "shells", ammoLabel: "shells", family: "shells" },
  { weapon: "ssg", ammoKey: null,     ammoLabel: "",       family: "none"   },
  { weapon: "ng",  ammoKey: "nails",  ammoLabel: "nails",  family: "nails"  },
  { weapon: "sng", ammoKey: null,     ammoLabel: "",       family: "none"   },
];
const WEAPON_ROW_2: WeaponCellSpec[] = [
  { weapon: "gl",  ammoKey: "rockets", ammoLabel: "rockets", family: "rox"   },
  { weapon: "rl",  ammoKey: null,      ammoLabel: "",        family: "none"  },
  { weapon: "lg",  ammoKey: "cells",   ammoLabel: "cells",   family: "cells" },
  { weapon: "axe", ammoKey: null,      ammoLabel: "",        family: "none"  },
];

// Priority order for picking a fallback current weapon when the active
// one is unequipped or dropped. Axe is appended as the universal last
// resort so the `currentWeapon in ownedWeapons` invariant always holds.
const WEAPON_FALLBACK_PRIORITY: Weapon[] = ["lg", "rl", "gl", "sng", "ng", "ssg", "sg", "axe"];
function pickFallbackCurrent(owned: Set<Weapon>, excluding: Weapon): { current: Weapon; owned: Set<Weapon> } {
  for (const w of WEAPON_FALLBACK_PRIORITY) {
    if (w !== excluding && owned.has(w)) return { current: w, owned };
  }
  // No other weapon remains in inventory -- add axe so current stays owned.
  const next = new Set(owned);
  next.add("axe");
  return { current: "axe", owned: next };
}

const POWERUPS: Powerup[] = ["quad", "pent", "ring", "biosuit"];
const ARMOR_VISIBLE_CLASSES: Exclude<ArmorClass, "none">[] = ["ga", "ya", "ra"];
const MATCH_STATUSES: MatchStatus[] = ["standby", "countdown", "live", "overtime", "ended"];
// Match types computed client-side by ezQuake in MT_GetMatchType
// (match_tools.c). Surfaced here as ComboInput options so users can
// pick a realistic value while still being able to type anything.
const MATCH_TYPE_OPTIONS: string[] = [
  "empty", "solo", "coop", "ffa", "race", "arena",
  "duel", "2on2", "3on3", "4on4", "tdm", "multiteam",
  "tf_duel", "tf_clanwar", "unknown",
];

// Symbolic pickup-item names used by ezQuake's tp_took / tp_point /
// tp_pickup commands (teamplay.c:2093-2097). At runtime `$took` and
// `$point` carry the RESOLVED `tp_name_<symbol>` string -- the dropdown
// offers whichever value the loaded config resolves each symbol to,
// falling back to the symbol itself when the cvar is default/empty.
const PKITEM_SYMBOLS: string[] = [
  "quad", "pent", "ring", "suit",
  "ra", "ya", "ga", "mh", "health",
  "lg", "rl", "gl", "sng", "ng", "ssg", "pack",
  "cells", "rockets", "nails", "shells",
  "flag", "teammate", "enemy", "eyes", "sentry", "disp",
  "quaded", "pented",
  "rune1", "rune2", "rune3", "rune4",
  "resistance", "strength", "haste", "regeneration",
];
function resolvedPickupOptions(cvars: Map<string, string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const sym of PKITEM_SYMBOLS) {
    const raw = cvars.get(`tp_name_${sym}`);
    // Strip ezQuake color codes and expand nested cvar refs so the
    // dropdown shows plain-text labels (datalist cannot render colour).
    // Fall back to the symbolic name when the cvar is unset or becomes
    // empty after stripping.
    const display = raw !== undefined ? displayColoredCvarValue(raw, cvars) : "";
    const final = display.length === 0 ? sym : display;
    if (seen.has(final)) continue;
    seen.add(final);
    out.push(final);
  }
  return out;
}
// Last-enemy-powerup permutations. Macro_LastSeenPowerup joins present
// powerups with tp_name_separator; we offer each powerup alone plus the
// common two-/three-way combinations so the dropdown covers realistic
// live states without the user having to concatenate manually.
function lastPowerupOptions(cvars: Map<string, string>): string[] {
  const resolve = (name: string, fallback: string) => {
    const raw = cvars.get(name);
    const v = raw !== undefined ? displayColoredCvarValue(raw, cvars) : "";
    return v.length === 0 ? fallback : v;
  };
  const q = resolve("tp_name_quad", "quad");
  const p = resolve("tp_name_pent", "pent");
  const r = resolve("tp_name_ring", "ring");
  const sep = resolve("tp_name_separator", " ");
  const join = (...parts: string[]) => parts.join(sep);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [q, p, r, join(q, p), join(q, r), join(p, r), join(q, p, r)]) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
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
// Bright, colour-preserved weapon sprites — reused from the Profile tab
// so the two surfaces stay visually consistent. The dim `wad/inv_*` set
// is what ezQuake renders in-game when a weapon is NOT owned; we style
// the "not owned" state with opacity instead and always use the bright
// source image.
const WEAPON_SPRITE: Record<Weapon, string> = {
  axe: "/weapons/axe.png",
  sg:  "/weapons/sg.png",
  ssg: "/weapons/ssg.png",
  ng:  "/weapons/ng.png",
  sng: "/weapons/sng.png",
  gl:  "/weapons/gl.png",
  rl:  "/weapons/rl.png",
  lg:  "/weapons/lg.png",
};
const POWERUP_SPRITE: Partial<Record<Powerup, string>> = {
  quad: "/wad/face_quad.png",
  pent: "/wad/face_invul.png",
  ring: "/wad/face_invis.png",
  // biosuit has no face sprite — rendered as text tile.
};

// QWHub mapshot archive. `lg` tier (~40-100KB each) is sized for use as
// a backdrop. The fallback image is served at the root of the bucket and
// substituted in on 404 by the img onError handler.
const MAPSHOT_FALLBACK = "https://a.quake.world/mapshots/default.jpg";
function mapshotUrl(mapname: string): string {
  const m = mapname.trim().toLowerCase();
  if (!m) return MAPSHOT_FALLBACK;
  return `https://a.quake.world/mapshots/webp/lg/${encodeURIComponent(m)}.webp`;
}

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
  // Template management controls are parked for now -- the feature is
  // retained through the props contract so saved templates aren't lost,
  // but the UI is not rendered. The `onSaveAs / onLoadTemplate /
  // onDeleteTemplate / onReset / templates` props stay wired through
  // in preparation for bringing the feature back with its own home.

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
    const nextOwned = new Set(props.state.ownedWeapons);
    // Dropping the current weapon from inventory also unequips it; the
    // `currentWeapon in ownedWeapons` invariant is enforced here.
    if (nextOwned.has(w)) {
      nextOwned.delete(w);
      if (props.state.currentWeapon === w) {
        const fb = pickFallbackCurrent(nextOwned, w);
        props.onChange({ ...props.state, ownedWeapons: fb.owned, currentWeapon: fb.current });
        return;
      }
    } else {
      nextOwned.add(w);
    }
    props.onChange({ ...props.state, ownedWeapons: nextOwned });
  }
  function toggleEquip(w: Weapon) {
    // EQ chip click on non-current weapon: equip (auto-add to owned).
    // EQ chip click on current weapon: unequip, keep in inventory, hand
    // over to the highest-priority other owned weapon (or axe).
    if (props.state.currentWeapon === w) {
      const fb = pickFallbackCurrent(props.state.ownedWeapons, w);
      props.onChange({ ...props.state, currentWeapon: fb.current, ownedWeapons: fb.owned });
      return;
    }
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
      {/* Primary column: sprite tiers (always visible). Claims the left
          half of the panel so sprites can grow into the space the old
          single-column layout left empty on the right. */}
      <div class="sg-state-col sg-state-col-primary">
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

      {/* ── Tier 3: Weapons — 4-wide grid matching Vitals/Powerups ── */}
      <Section title="Weapons">
        <div class="sg-state-weapon-grid">
          <For each={WEAPON_ROW_1}>{(cell) => (
            <WeaponCell
              spec={cell}
              state={props.state}
              cvars={props.cvars}
              onToggleWeapon={toggleWeapon}
              onToggleEquip={toggleEquip}
              onAmmoChange={(k, v) => update(k, v)}
            />
          )}</For>
        </div>
        <div class="sg-state-weapon-grid">
          <For each={WEAPON_ROW_2}>{(cell) => (
            <WeaponCell
              spec={cell}
              state={props.state}
              cvars={props.cvars}
              onToggleWeapon={toggleWeapon}
              onToggleEquip={toggleEquip}
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

      </div>

      {/* Secondary column: always-visible Location tier (wide sprite
          slot with mapshot backdrop + 2x2 field footer, same visual
          vocabulary as the primary tiers), then collapsed disclosures
          for Match / LEDs / Events below. Template management is
          parked for now -- the concept doesn't fit cleanly beside the
          statemachine fields and needs its own home. */}
      <div class="sg-state-col sg-state-col-secondary">
      <Section title="Location">
        {/* Location tier uses 2 columns instead of the default 4 because
            the only element is the wide map slot (spans 2). Trailing empty
            cells were reserving grid width that bled into the secondary
            column and pushed the Match / LEDs / Events disclosures wider
            than they needed to be. */}
        <div class="sg-state-slot-tier sg-state-slot-tier-2">
          <div class="sg-state-slot sg-state-slot-wide sg-state-slot-active">
            <div class="sg-state-slot-sprite sg-state-slot-map">
              <img
                src={mapshotUrl(props.state.mapname)}
                alt={props.state.mapname || "no map"}
                onError={(e) => { e.currentTarget.src = MAPSHOT_FALLBACK; }}
              />
            </div>
            <div class="sg-state-map-footer">
              <div class="sg-state-map-field">
                <label class="sg-state-map-label">Map</label>
                <ComboInput
                  value={props.state.mapname}
                  options={mapOptions()}
                  listId="sg-state-map-options"
                  onChange={(v) => update("mapname", v)}
                />
              </div>
              <div class="sg-state-map-field">
                <label class="sg-state-map-label">Location</label>
                <ComboInput
                  value={props.state.location}
                  options={locOptions()}
                  listId="sg-state-loc-options"
                  onChange={(v) => update("location", v)}
                />
              </div>
              <div class="sg-state-map-field">
                <label class="sg-state-map-label">Last loc</label>
                <ComboInput
                  value={props.state.lastloc}
                  options={locOptions()}
                  listId="sg-state-loc-options"
                  onChange={(v) => update("lastloc", v)}
                />
              </div>
              <div class="sg-state-map-field">
                <label class="sg-state-map-label">Death loc</label>
                <ComboInput
                  value={props.state.deathloc}
                  options={locOptions()}
                  listId="sg-state-loc-options"
                  onChange={(v) => update("deathloc", v)}
                />
              </div>
            </div>
          </div>
        </div>
      </Section>
      <Section title="Match"
        summary={`${props.state.matchstatus}${props.state.matchtype ? " · " + props.state.matchtype : ""}`}
        collapsible
        open={isOpen("match")}
        onToggle={() => toggleDetails("match")}
      >
        {/* $matchname is the client-side auto-formatted demo/screenshot
            description string ("Player vs Enemy - [map]"); not useful
            for teamsay branching since $matchtype covers mode checks
            directly. Field is parked from the UI. */}
        <Row label="Status">
          <EnumSelect value={props.state.matchstatus} options={MATCH_STATUSES}
            onChange={(v) => update("matchstatus", v as MatchStatus)} width="md" />
        </Row>
        <Row label="Type">
          <ComboInput
            value={props.state.matchtype}
            options={MATCH_TYPE_OPTIONS}
            listId="sg-state-matchtype-options"
            onChange={(v) => update("matchtype", v)}
          />
        </Row>
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
        <Row label="Point item">
          <ComboInput
            value={props.state.point}
            options={resolvedPickupOptions(props.cvars)}
            listId="sg-state-point-options"
            onChange={(v) => update("point", v)}
          />
        </Row>
        <Row label="Point loc">
          <ComboInput
            value={props.state.pointloc}
            options={locOptions()}
            listId="sg-state-loc-options"
            onChange={(v) => update("pointloc", v)}
          />
        </Row>
        <Row label="Point at loc">
          <ComboInput
            value={props.state.pointatloc}
            options={locOptions()}
            listId="sg-state-loc-options"
            onChange={(v) => update("pointatloc", v)}
          />
        </Row>
      </Section>

      <Section title="Recent events"
        summary={props.state.took ? `took ${props.state.took}` : "—"}
        collapsible
        open={isOpen("events")}
        onToggle={() => toggleDetails("events")}
      >
        <Row label="Took item">
          <ComboInput
            value={props.state.took}
            options={resolvedPickupOptions(props.cvars)}
            listId="sg-state-took-options"
            onChange={(v) => update("took", v)}
          />
        </Row>
        <Row label="Took loc">
          <ComboInput
            value={props.state.tookloc}
            options={locOptions()}
            listId="sg-state-loc-options"
            onChange={(v) => update("tookloc", v)}
          />
        </Row>
        <Row label="Took at loc">
          <ComboInput
            value={props.state.tookatloc}
            options={locOptions()}
            listId="sg-state-loc-options"
            onChange={(v) => update("tookatloc", v)}
          />
        </Row>
        <Row label="Drop loc">
          <ComboInput
            value={props.state.droploc}
            options={locOptions()}
            listId="sg-state-loc-options"
            onChange={(v) => update("droploc", v)}
          />
        </Row>
        <Row label="Drop time"><NumInput value={props.state.droptime} onChange={(v) => update("droptime", v)} /></Row>
        <Row label="Last enemy powerup">
          <ComboInput
            value={props.state.lastpowerup}
            options={lastPowerupOptions(props.cvars)}
            listId="sg-state-lastpowerup-options"
            onChange={(v) => update("lastpowerup", v)}
          />
        </Row>
      </Section>
      </div>
    </div>
  );
}

/**
 * Sprite slot used by Vitals (face+HP, GA/YA/RA) and Powerups (Q/P/R/B).
 * Layout: [sprite area] above [value input or text label] so the visual
 * rhythm matches the WeaponCell below (sprite on top, number below).
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
 * Single-weapon grid cell. Sprite is a possession toggle; the `EQ` chip
 * toggles the current weapon (click again on the active one to unequip
 * while staying in inventory). Cells for the "first weapon of a shared
 * ammo pair" also render an ammo input in the footer; the others render
 * an invisible placeholder so all four cells in a row share the same
 * height.
 */
function WeaponCell(props: {
  spec: WeaponCellSpec;
  state: PlayerState;
  cvars: Map<string, string>;
  onToggleWeapon: (w: Weapon) => void;
  onToggleEquip: (w: Weapon) => void;
  onAmmoChange: <K extends AmmoKey>(k: K, v: PlayerState[K]) => void;
}) {
  const w = () => props.spec.weapon;
  const owned = () => props.state.ownedWeapons.has(w());
  const current = () => props.state.currentWeapon === w();
  const hasAmmo = () => props.spec.ammoKey !== null && props.spec.family !== "none";
  return (
    <div class="sg-state-weapon-cell">
      <button
        class="sg-state-weapon-sprite"
        classList={{
          "sg-state-weapon-sprite-owned": owned(),
          "sg-state-weapon-sprite-dim": !owned(),
          "sg-state-weapon-sprite-current": current(),
        }}
        onClick={() => props.onToggleWeapon(w())}
        title={`${w()} - click to ${owned() ? "drop" : "pick up"}`}
      >
        <img src={WEAPON_SPRITE[w()]} alt={w()} />
        <span
          class="sg-state-weapon-eq"
          classList={{ "sg-state-weapon-eq-on": current() }}
          title={current() ? `${w()} equipped - click to unequip` : `equip ${w()}`}
          onClick={(e) => {
            e.stopPropagation();
            props.onToggleEquip(w());
          }}
        >
          EQ
        </span>
      </button>
      <Show when={hasAmmo()} fallback={<div class="sg-state-weapon-ammo-placeholder" />}>
        <div class="sg-state-weapon-ammo">
          <img class="sg-state-weapon-ammo-sprite"
            src={AMMO_SPRITE[props.spec.family as Exclude<WeaponFamily, "none">]}
            alt={props.spec.ammoLabel} />
          <input type="number"
            class="sg-state-weapon-ammo-input"
            value={props.state[props.spec.ammoKey!] as number}
            min={0}
            max={200}
            onInput={(e) => props.onAmmoChange(props.spec.ammoKey!, Number(e.currentTarget.value) as never)}
          />
          <span class="sg-state-weapon-ammo-need">
            need &lt; {props.cvars.get(`tp_need_${props.spec.ammoLabel}`) ?? NEED_DEFAULTS[`tp_need_${props.spec.ammoLabel}`] ?? ""}
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

/**
 * Text input + custom dropdown. We own the popup markup so it sizes to the
 * input width instead of Chromium's native datalist heuristic (which picks
 * a popup wide enough for the longest option regardless of how narrow the
 * input is). Typing filters by case-insensitive substring; arrow keys +
 * Enter pick; Escape or blur closes. `listId` stays in the prop list for
 * API continuity but is unused.
 */
function ComboInput(props: {
  value: string;
  options: readonly string[];
  listId: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const [highlight, setHighlight] = createSignal(0);
  const [rect, setRect] = createSignal<{ left: number; top: number; width: number } | null>(null);
  let wrapperEl: HTMLDivElement | undefined;

  const filtered = createMemo(() => {
    const q = props.value.trim().toLowerCase();
    if (!q) return props.options;
    return props.options.filter((o) => o.toLowerCase().includes(q));
  });

  function updateRect() {
    if (!wrapperEl) return;
    const r = wrapperEl.getBoundingClientRect();
    setRect({ left: r.left, top: r.bottom, width: r.width });
  }

  function openPopup() {
    updateRect();
    setOpen(true);
  }

  createEffect(() => {
    if (!open()) return;
    const handler = () => updateRect();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    onCleanup(() => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    });
  });

  function pick(v: string) {
    props.onChange(v);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    const list = filtered();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open()) setOpen(true);
      setHighlight((h) => Math.min(h + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open() && list[highlight()]) {
        e.preventDefault();
        pick(list[highlight()]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div class="sg-state-combo-wrap" ref={wrapperEl}>
      <input type="text" class="input input-xs sg-state-combo-input"
        value={props.value}
        onFocus={() => { setHighlight(0); openPopup(); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onInput={(e) => { props.onChange(e.currentTarget.value); setHighlight(0); openPopup(); }}
        onKeyDown={onKeyDown} />
      <Show when={open() && filtered().length > 0 && rect()}>
        <Portal>
          <div
            class="sg-state-combo-popup"
            style={{
              left: `${rect()!.left}px`,
              top: `${rect()!.top + 2}px`,
              width: `${rect()!.width}px`,
            }}
          >
            <For each={filtered()}>
              {(opt, i) => (
                <button type="button"
                  class="sg-state-combo-option"
                  classList={{ "sg-state-combo-option-active": i() === highlight() }}
                  onMouseEnter={() => setHighlight(i())}
                  onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
                >
                  {opt}
                </button>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
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

// Maps a handful of QW special-byte codepoints to ASCII stand-ins so that
// loc names encoded at the byte level (common in older .loc files) render
// as legible text in dropdowns instead of replacement-char squares.
const QW_CHAR_LOOKUP: Record<number, string> = {
  0: "=", 2: "=", 5: "\u00B7", 10: " ", 14: "\u00B7", 15: "\u00B7",
  16: "[", 17: "]", 18: "0", 19: "1", 20: "2", 21: "3", 22: "4",
  23: "5", 24: "6", 25: "7", 26: "8", 27: "9", 28: "\u00B7",
  29: "=", 30: "=", 31: "=",
};

function qwToAscii(name: string): string {
  let out = "";
  for (const ch of name) {
    let code = ch.charCodeAt(0);
    if (code >= 128) code -= 128;
    if (code >= 32) out += String.fromCharCode(code);
    else out += QW_CHAR_LOOKUP[code] ?? "?";
  }
  return out;
}

function displayLocName(raw: string, cvars: Map<string, string>): string {
  // qwToAscii must run FIRST on the raw byte-level string — it normalises
  // high-byte QW chars (e.g. 0xB7) back to ASCII. Running it later would
  // re-encode unicode substitutes introduced by expandCvarRefs (like the
  // middle dot that `$.` expands to), turning `·` back into `7` etc.
  return stripColorCodes(expandCvarRefs(qwToAscii(raw), cvars)).trim();
}

// Shared display helper for `tp_name_*` cvar values surfaced in
// dropdowns. Expands any `$cvar` refs, strips ezQuake `&cRGB` / `&r`
// colour codes, removes color-wrap braces `{` `}` (ezQuake uses them to
// group coloured segments; they are not part of the logical name), and
// trims. The raw colour-coded value still flows unchanged through the
// simulator and pretty-view layers where colour rendering belongs.
function displayColoredCvarValue(raw: string, cvars: Map<string, string>): string {
  const expanded = stripColorCodes(expandCvarRefs(raw, cvars));
  return expanded.replace(/[{}]/g, "").trim();
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
