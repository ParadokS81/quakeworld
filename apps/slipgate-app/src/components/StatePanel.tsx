import { For } from "solid-js";
import type { JSX } from "solid-js";
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
        <DerivedBlock rows={[
          ["$armortype", deriveArmortype(props.state, props.cvars)],
          ["$colored_armor", deriveColoredArmor(props.state)],
        ]} />
        <InfluencingCvarsBlock cvars={props.cvars}
          names={["tp_name_armortype_ga","tp_name_armortype_ya","tp_name_armortype_ra","tp_name_armortype_none"]} />
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
        <DerivedBlock rows={[
          ["$weapons", deriveWeaponsString(props.state, props.cvars)],
          ["$bestweapon", deriveBestWeapon(props.state, props.cvars)],
          ["$bestammo", String(deriveBestAmmo(props.state, props.cvars))],
          ["$weaponnum", String(deriveWeaponNum(props.state))],
          ["$ammo", String(deriveAmmo(props.state))],
        ]} />
        <InfluencingCvarsBlock cvars={props.cvars}
          names={["tp_weapon_order","tp_name_sg","tp_name_ssg","tp_name_ng","tp_name_sng","tp_name_gl","tp_name_rl","tp_name_lg"]} />
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
        <DerivedBlock rows={[
          ["$powerups", derivePowerupsString(props.state, props.cvars)],
        ]} />
        <InfluencingCvarsBlock cvars={props.cvars}
          names={["tp_name_quad","tp_name_pent","tp_name_ring","tp_name_biosuit","tp_poweruptextstyle"]} />
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
        <Row label="Point at loc"><TextInput value={props.state.pointatloc} onChange={(v) => update("pointatloc", v)} /></Row>
      </Section>

      <Section title="Recent events">
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

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <div class="sg-state-section">
      <div class="sg-state-section-title">{props.title}</div>
      <div class="sg-state-section-body">{props.children}</div>
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
