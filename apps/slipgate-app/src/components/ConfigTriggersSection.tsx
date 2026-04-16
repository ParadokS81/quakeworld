import { createSignal, createMemo, For, Show } from "solid-js";
import { resolveAliasChain, AliasChainView } from "./AliasChainResolver";
import type { AliasChainResult } from "./AliasChainResolver";

/* ─── Trigger definitions from ezQuake source ────────────────────── */

interface TriggerDef {
  name: string;
  description: string;
  restricted?: boolean;
  eventValue?: number;
  defaultEnabled?: boolean;
}

const F_TRIGGERS: TriggerDef[] = [
  { name: "f_spawn", description: "Executed when your character first spawns into the game", restricted: false },
  { name: "f_respawn", description: "Executed when you respawn after dying", restricted: true },
  { name: "f_death", description: "Executed when you die", restricted: true },
  { name: "f_flagdeath", description: "Executed when you die while carrying the flag (CTF)", restricted: true },
  { name: "f_took", description: "Executed when you pick up an item", restricted: true },
  { name: "f_weaponchange", description: "Executed when your active weapon changes", restricted: false },
  { name: "f_newmap", description: "Executed when a new map is loaded", restricted: false },
  { name: "f_mapend", description: "Executed when the current map ends", restricted: false },
  { name: "f_demostart", description: "Executed when demo recording or playback begins", restricted: false },
  { name: "f_demomatchstart", description: "Executed when the match starts during demo playback (after countdown)", restricted: false },
  { name: "f_demoend", description: "Executed when demo recording or playback ends", restricted: false },
  { name: "f_countdownstart", description: "Executed when the pre-match countdown begins", restricted: false },
  { name: "f_countdownbreak", description: "Executed when the pre-match countdown is cancelled", restricted: false },
  { name: "f_reloadstart", description: "Executed before config is reloaded (cfg_load)", restricted: false },
  { name: "f_reloadend", description: "Executed after config is reloaded (cfg_load)", restricted: false },
  { name: "f_cfgload", description: "Executed when a config file is loaded", restricted: false },
  { name: "f_exit", description: "Executed when quitting the game", restricted: false },
  { name: "f_captureframe", description: "Executed on each captured frame (video recording)", restricted: false },
  { name: "f_sbrefreshdone", description: "Executed when server browser refresh completes", restricted: false },
  { name: "f_sbupdatesourcesdone", description: "Executed when server browser source update completes", restricted: false },
  { name: "f_focusgained", description: "Executed when the game window gains focus", restricted: false },
  { name: "f_freeflyspectate", description: "Executed when entering free-fly spectator mode", restricted: false },
  { name: "f_trackspectate", description: "Executed when entering player-tracking spectator mode", restricted: false },
  { name: "f_conc", description: "Executed on concussion grenade effect (TF)", restricted: true },
  { name: "f_flash", description: "Executed on flash grenade effect (TF)", restricted: true },
  { name: "f_bonusflash", description: "Executed on bonus flash effect", restricted: true },
];

const ON_TRIGGERS: TriggerDef[] = [
  { name: "on_enter", description: "Joining a server as a player", defaultEnabled: true },
  { name: "on_spec_enter", description: "Joining a server as a spectator", defaultEnabled: true },
  { name: "on_enter_ctf", description: "Joining a CTF server as a player", defaultEnabled: true },
  { name: "on_enter_ffa", description: "Joining an FFA server as a player", defaultEnabled: true },
  { name: "on_connect", description: "Server connection established. Also enables on_connect_ctf, on_connect_ffa, on_observe, on_observe_ctf, on_observe_ffa", eventValue: 1 },
  { name: "on_connect_ctf", description: "Connecting to a CTF server", eventValue: 1 },
  { name: "on_connect_ffa", description: "Connecting to an FFA server", eventValue: 1 },
  { name: "on_observe", description: "Joining a server as an observer", eventValue: 1 },
  { name: "on_observe_ctf", description: "Observing on a CTF server", eventValue: 1 },
  { name: "on_observe_ffa", description: "Observing on an FFA server", eventValue: 1 },
  { name: "on_matchstart", description: "Match countdown begins. Also enables on_spec_matchstart", eventValue: 4 },
  { name: "on_spec_matchstart", description: "Match starts while spectating", eventValue: 4 },
  { name: "on_matchend", description: "Match ends. Also enables on_spec_matchend", eventValue: 8 },
  { name: "on_spec_matchend", description: "Match ends while spectating", eventValue: 8 },
  { name: "on_matchbreak", description: "Match is paused/broken. Also enables on_spec_matchbreak", eventValue: 16 },
  { name: "on_spec_matchbreak", description: "Match breaks while spectating", eventValue: 16 },
  { name: "on_admin", description: "Admin status gained on server", eventValue: 128 },
  { name: "on_unadmin", description: "Admin status lost on server", eventValue: 256 },
];

/* ─── Infoset decoder ────────────────────────────────────────────── */

const EVENT_FLAGS: { value: number; label: string }[] = [
  { value: 1, label: "on_connect" },
  { value: 4, label: "on_matchstart" },
  { value: 8, label: "on_matchend" },
  { value: 16, label: "on_matchbreak" },
  { value: 128, label: "on_admin" },
  { value: 256, label: "on_unadmin" },
];

function decodeEventValue(ev: number): string[] {
  return EVENT_FLAGS.filter((f) => (ev & f.value) !== 0).map((f) => f.label);
}

function parseInfosetValue(command: string): number | null {
  const match = command.match(/cmd\s+info\s+ev\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/* ─── Component ──────────────────────────────────────────────────── */

interface ConfigTriggersSectionProps {
  aliases: Record<string, string>;
  compareAliases?: Record<string, string>;
  search: string;
  primaryCvars?: Record<string, string>;
  hideDefaults?: boolean;
}

interface TriggerRow {
  def: TriggerDef;
  userCommand?: string;
  compareCommand?: string;
  isDefined: boolean;
  compareDefined: boolean;
}

export default function ConfigTriggersSection(props: ConfigTriggersSectionProps) {
  const [expanded, setExpanded] = createSignal<string | null>(null);
  const [showGuide, setShowGuide] = createSignal(false);

  function toggleExpand(name: string) {
    setExpanded((prev) => (prev === name ? null : name));
  }

  function findAlias(name: string, aliases: Record<string, string>): string | undefined {
    return aliases[name] ?? aliases[name.toLowerCase()];
  }

  const fTriggerRows = createMemo((): TriggerRow[] => {
    const q = props.search.trim().toLowerCase();
    return F_TRIGGERS
      .map((def) => ({
        def,
        userCommand: findAlias(def.name, props.aliases),
        compareCommand: props.compareAliases ? findAlias(def.name, props.compareAliases) : undefined,
        isDefined: findAlias(def.name, props.aliases) !== undefined,
        compareDefined: props.compareAliases ? findAlias(def.name, props.compareAliases) !== undefined : false,
      }))
      .filter((row) => {
        if (q && !row.def.name.includes(q) && !row.def.description.toLowerCase().includes(q)) return false;
        return true;
      });
  });

  const onTriggerRows = createMemo((): TriggerRow[] => {
    const q = props.search.trim().toLowerCase();
    return ON_TRIGGERS
      .map((def) => ({
        def,
        userCommand: findAlias(def.name, props.aliases),
        compareCommand: props.compareAliases ? findAlias(def.name, props.compareAliases) : undefined,
        isDefined: findAlias(def.name, props.aliases) !== undefined,
        compareDefined: props.compareAliases ? findAlias(def.name, props.compareAliases) !== undefined : false,
      }))
      .filter((row) => {
        if (q && !row.def.name.includes(q) && !row.def.description.toLowerCase().includes(q)) return false;
        return true;
      });
  });

  const infosetAlias = () => findAlias("infoset", props.aliases);
  const infosetValue = () => {
    const cmd = infosetAlias();
    return cmd ? parseInfosetValue(cmd) : null;
  };
  const enabledEvents = () => {
    const ev = infosetValue();
    return ev !== null ? decodeEventValue(ev) : [];
  };

  const isCompare = () => props.compareAliases !== undefined;
  const definedCount = () =>
    fTriggerRows().filter((r) => r.isDefined).length +
    onTriggerRows().filter((r) => r.isDefined).length;

  function getChain(command: string): AliasChainResult {
    return resolveAliasChain(command, props.aliases);
  }

  function renderRow(row: TriggerRow) {
    const isExp = () => expanded() === row.def.name;
    const chain = () => row.userCommand ? getChain(row.userCommand) : { chain: [], macroRefs: new Set<string>() };

    return (
      <>
        <div
          class={isCompare() ? "sg-trigger-row-cmp" : "sg-trigger-row"}
          classList={{
            "sg-trigger-defined": row.isDefined || row.compareDefined,
            "cursor-pointer": row.isDefined,
          }}
          onClick={() => row.isDefined && toggleExpand(row.def.name)}
          title={row.def.description}
        >
          {/* Trigger name + restricted badge */}
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-[var(--sg-section-label)] w-3 flex-shrink-0">
              {row.isDefined ? (isExp() ? "▾" : "▸") : ""}
            </span>
            <span
              class="text-[13px] truncate"
              style={{
                color: (row.isDefined || row.compareDefined)
                  ? "oklch(0.75 0.12 200)"
                  : "var(--sg-section-label)",
              }}
            >
              {row.def.name}
            </span>
            <span class="flex-1" />
            <Show when={row.def.restricted}>
              <span class="text-[10px] text-[var(--color-warning)] uppercase tracking-wide flex-shrink-0">restricted</span>
            </Show>
            <Show when={row.def.defaultEnabled}>
              <span class="text-[10px] text-[var(--color-success)] uppercase tracking-wide flex-shrink-0">default</span>
            </Show>
            <Show when={row.def.eventValue !== undefined && !row.def.defaultEnabled}>
              <span class="text-[10px] text-[var(--sg-section-label)] uppercase tracking-wide flex-shrink-0">ev {row.def.eventValue}</span>
            </Show>
          </div>

          {/* Command preview */}
          <div class="min-w-0">
            <Show when={row.isDefined} fallback={
              <span class="text-xs text-[var(--sg-section-label)] italic">not defined</span>
            }>
              <span class="text-[13px] text-[var(--sg-text-bright)] font-semibold truncate block">
                {row.userCommand}
              </span>
            </Show>
          </div>

          {/* Compare */}
          <Show when={isCompare()}>
            <div class="min-w-0">
              <Show when={row.compareDefined} fallback={
                <span class="text-xs text-[var(--sg-section-label)] italic">not defined</span>
              }>
                <span class="text-[13px] text-[var(--sg-text-bright)] font-semibold truncate block">
                  {row.compareCommand}
                </span>
              </Show>
            </div>
          </Show>
        </div>

        {/* Expanded view */}
        <Show when={isExp() && row.userCommand}>
          <div class="sg-domain-bind-expanded">
            <div class="sg-alias-chain">
              <div class="sg-alias-chain-entry" style="padding-left: 12px">
                <span class="sg-alias-chain-cmd" style="word-break: break-all">
                  {row.userCommand}
                </span>
              </div>
            </div>
            <AliasChainView
              chain={chain().chain}
              macroRefs={chain().macroRefs}
              primaryCvars={props.primaryCvars}
              hideDefaults={props.hideDefaults}
              label="Alias chain"
            />
            <div class="px-4 py-1 text-xs text-[var(--sg-section-label)]">
              {row.def.description}
            </div>
          </div>
        </Show>
      </>
    );
  }

  return (
    <div>
      <div class="sg-category-group-header">
        Triggers
        <span class="text-[11px] font-normal text-[var(--sg-section-label)] ml-2">
          {definedCount()} defined / {F_TRIGGERS.length + ON_TRIGGERS.length} available
        </span>
      </div>

      {/* Expandable info guide */}
      <div
        class="flex items-center gap-1.5 px-4 py-2 border-b border-[var(--sg-stat-border)] cursor-pointer select-none"
        onClick={() => setShowGuide((v) => !v)}
      >
        <span class="text-xs text-[var(--sg-section-label)]">
          {showGuide() ? "▾" : "▸"}
        </span>
        <span class="text-xs text-[var(--color-primary)] font-semibold">
          How triggers work
        </span>
      </div>
      <Show when={showGuide()}>
        <div class="sg-trigger-guide">
          <p>
            <strong>f_triggers</strong> fire on client-side game events (death, spawn, map load, etc.).
            Define them as aliases:
          </p>
          <ul>
            <li><code>alias f_newmap "exec configs/dm3.cfg"</code></li>
            <li><code>alias f_death "play sounds/death.wav"</code></li>
          </ul>

          <p>
            <strong>on_triggers</strong> fire on server connection events (join, match start/end, etc.).
            <code>on_enter</code>, <code>on_spec_enter</code>, <code>on_enter_ctf</code>, <code>on_enter_ffa</code> are enabled by default.
            Others need activation via <code>cmd info ev x</code> where <code>x</code> is the sum of event values.
          </p>

          <p>
            Define an <code>infoset</code> alias to auto-enable on_triggers:
          </p>
          <ul>
            <li><code>alias infoset "cmd info ev 413"</code> — enable all</li>
            <li><code>alias infoset "cmd info ev 8"</code> — enable on_matchend only</li>
          </ul>

          <p>
            <strong>Event values:</strong> 1 = connect, 4 = matchstart, 8 = matchend, 16 = matchbreak, 128 = admin, 256 = unadmin.
            Sum the values you want (e.g. 413 = all).
          </p>

          <p>
            Enabling certain triggers auto-enables variants:
          </p>
          <ul>
            <li><code>on_connect</code> also enables <code>on_connect_ctf</code> <code>on_connect_ffa</code> <code>on_observe</code> <code>on_observe_ctf</code> <code>on_observe_ffa</code></li>
            <li><code>on_matchstart</code> also enables <code>on_spec_matchstart</code></li>
            <li><code>on_matchend</code> also enables <code>on_spec_matchend</code></li>
            <li><code>on_matchbreak</code> also enables <code>on_spec_matchbreak</code></li>
          </ul>

          <p>
            <strong>Restricted</strong> triggers (marked with <span style="color: var(--color-warning)">restricted</span>) cannot use teamplay macros
            (<code>$armor</code>, <code>$health</code>, <code>$location</code>, <code>$powerups</code>, <code>$bestweapon</code>, etc.)
            under competitive rulesets. This prevents automated reporting on events like item pickups or deaths.
          </p>
        </div>
      </Show>

      {/* Infoset status */}
      <Show when={infosetAlias()}>
        <div class="px-4 py-2 border-b border-[var(--sg-stat-border)] flex items-center gap-2">
          <span class="text-[13px] text-[var(--color-primary)] font-semibold">infoset</span>
          <span class="text-[13px] text-[var(--sg-text-dim)]">{infosetAlias()}</span>
          <Show when={infosetValue() !== null}>
            <span class="text-xs text-[var(--sg-section-label)]">
              → enables: {enabledEvents().join(", ")}
            </span>
          </Show>
        </div>
      </Show>

      {/* Column headers */}
      <div
        class={isCompare() ? "sg-trigger-row-cmp" : "sg-trigger-row"}
        style="border-bottom: 1px solid var(--sg-stat-border)"
      >
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Trigger</span>
        <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">
          {isCompare() ? "Your Config" : "Command"}
        </span>
        <Show when={isCompare()}>
          <span class="text-[11px] uppercase tracking-wide text-[var(--sg-section-label)]">Comparison</span>
        </Show>
      </div>

      {/* F_triggers */}
      <div class="sg-domain-bind-category" style="color: var(--sg-section-label)">
        Client Events (f_triggers) — {fTriggerRows().filter((r) => r.isDefined).length} defined
      </div>
      <For each={fTriggerRows()}>{renderRow}</For>

      {/* On_triggers */}
      <div class="sg-domain-bind-category" style="color: var(--sg-section-label)">
        Server Events (on_triggers) — {onTriggerRows().filter((r) => r.isDefined).length} defined
      </div>
      <For each={onTriggerRows()}>{renderRow}</For>
    </div>
  );
}
