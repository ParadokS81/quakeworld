import { createSignal, createMemo, For, Show } from "solid-js";
import { resolveAliasChain, AliasChainView } from "./AliasChainResolver";

/* ─── Trigger definitions from ezQuake source ────────────────────── */

interface TriggerDef {
  name: string;
  description: string;
  restricted?: boolean;
  /** For on_triggers: event value for cmd info ev */
  eventValue?: number;
  /** True if enabled by default (no infoset needed) */
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
  /** All aliases from the config (to find trigger definitions) */
  aliases: Record<string, string>;
  compareAliases?: Record<string, string>;
  search: string;
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

  // Look up alias by trigger name (case-insensitive)
  function findAlias(name: string, aliases: Record<string, string>): string | undefined {
    return aliases[name] ?? aliases[name.toLowerCase()];
  }

  const fTriggerRows = createMemo((): TriggerRow[] => {
    const q = props.search.trim().toLowerCase();
    return F_TRIGGERS
      .map((def) => {
        const userCommand = findAlias(def.name, props.aliases);
        const compareCommand = props.compareAliases ? findAlias(def.name, props.compareAliases) : undefined;
        return {
          def,
          userCommand,
          compareCommand,
          isDefined: userCommand !== undefined,
          compareDefined: compareCommand !== undefined,
        };
      })
      .filter((row) => {
        if (q && !row.def.name.includes(q) && !row.def.description.toLowerCase().includes(q)) return false;
        return true;
      });
  });

  const onTriggerRows = createMemo((): TriggerRow[] => {
    const q = props.search.trim().toLowerCase();
    return ON_TRIGGERS
      .map((def) => {
        const userCommand = findAlias(def.name, props.aliases);
        const compareCommand = props.compareAliases ? findAlias(def.name, props.compareAliases) : undefined;
        return {
          def,
          userCommand,
          compareCommand,
          isDefined: userCommand !== undefined,
          compareDefined: compareCommand !== undefined,
        };
      })
      .filter((row) => {
        if (q && !row.def.name.includes(q) && !row.def.description.toLowerCase().includes(q)) return false;
        return true;
      });
  });

  // Decode infoset if present
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

  function getChain(command: string) {
    return resolveAliasChain(command, props.aliases);
  }

  function renderRow(row: TriggerRow) {
    const isExp = () => expanded() === row.def.name;
    const chain = () => row.userCommand ? getChain(row.userCommand) : [];

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
          {/* Trigger name */}
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-[var(--sg-section-label)] w-3">
              {row.isDefined ? (isExp() ? "▾" : "▸") : ""}
            </span>
            <span
              class="font-mono text-[11px]"
              classList={{
                "text-[var(--sg-text-bright)] font-semibold": row.isDefined || row.compareDefined,
                "text-[var(--sg-section-label)]": !row.isDefined && !row.compareDefined,
              }}
            >
              {row.def.name}
            </span>
            <Show when={row.def.restricted}>
              <span class="text-[9px] text-[var(--color-warning)] uppercase tracking-wide">restricted</span>
            </Show>
          </div>

          {/* Status / command preview */}
          <div class="min-w-0">
            <Show when={row.isDefined} fallback={
              <span class="text-[10px] text-[var(--sg-section-label)] italic">not defined</span>
            }>
              <span class="font-mono text-[11px] text-[var(--sg-text-dim)] truncate block">
                {row.userCommand}
              </span>
            </Show>
          </div>

          {/* Compare */}
          <Show when={isCompare()}>
            <div class="min-w-0">
              <Show when={row.compareDefined} fallback={
                <span class="text-[10px] text-[var(--sg-section-label)] italic">not defined</span>
              }>
                <span class="font-mono text-[11px] text-[var(--sg-text-dim)] truncate block">
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
            <AliasChainView chain={chain()} label="Alias chain" />
            <div class="px-4 py-1 text-[10px] text-[var(--sg-section-label)]">
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
        <span class="text-[10px] font-normal text-[var(--sg-section-label)] ml-2">
          {definedCount()} defined / {F_TRIGGERS.length + ON_TRIGGERS.length} available
        </span>
      </div>

      {/* Expandable info guide */}
      <div
        class="flex items-center gap-1 px-4 py-1.5 border-b border-[var(--sg-stat-border)] cursor-pointer select-none"
        onClick={() => setShowGuide((v) => !v)}
      >
        <span class="text-[10px] text-[var(--sg-section-label)]">
          {showGuide() ? "▾" : "▸"}
        </span>
        <span class="text-[10px] text-[var(--color-primary)]">
          How triggers work
        </span>
      </div>
      <Show when={showGuide()}>
        <div class="px-4 py-3 border-b border-[var(--sg-stat-border)] text-[11px] text-[var(--sg-text-dim)] leading-relaxed" style="background: color-mix(in oklch, var(--sg-stat-border) 10%, transparent)">
          <p class="mb-2">
            <strong class="text-[var(--sg-text-bright)]">f_triggers</strong> fire on client-side game events (death, spawn, map load, etc.).
            Define them as aliases: <code class="text-[var(--color-primary)]">alias f_death "echo I died"</code>
          </p>
          <p class="mb-2">
            <strong class="text-[var(--sg-text-bright)]">on_triggers</strong> fire on server events (connect, match start/end, etc.).
            Some are enabled by default, others need activation via <code class="text-[var(--color-primary)]">cmd info ev &lt;value&gt;</code>.
          </p>
          <p class="mb-2">
            Define an <code class="text-[var(--color-primary)]">infoset</code> alias to auto-enable on_triggers:
            <code class="text-[var(--color-primary)] ml-1">alias infoset "cmd info ev 413"</code> (enables all)
          </p>
          <p class="mb-1">
            <strong class="text-[var(--sg-text-bright)]">Event values:</strong> 1=connect, 4=matchstart, 8=matchend, 16=matchbreak, 128=admin, 256=unadmin.
            Sum the values you want (e.g. 413 = all).
          </p>
          <p class="text-[10px]">
            <strong class="text-[var(--color-warning)]">Restricted</strong> triggers cannot use teamplay macros ($armor, $location, etc.).
          </p>
        </div>
      </Show>

      {/* Infoset status */}
      <Show when={infosetAlias()}>
        <div class="px-4 py-2 border-b border-[var(--sg-stat-border)] flex items-center gap-2 text-[11px]">
          <span class="font-mono text-[var(--color-primary)] font-semibold">infoset</span>
          <span class="font-mono text-[var(--sg-text-dim)]">{infosetAlias()}</span>
          <Show when={infosetValue() !== null}>
            <span class="text-[10px] text-[var(--sg-section-label)]">
              → enables: {enabledEvents().join(", ")}
            </span>
          </Show>
        </div>
      </Show>

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
