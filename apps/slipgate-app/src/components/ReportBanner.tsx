import { createMemo, For, Show } from "solid-js";
import type { PlayerState } from "../lib/simulator/index.js";
import { evaluateTeamsay } from "../lib/simulator/index.js";
import { buildSpanTree, type SpanColor } from "../lib/prettyRender.js";
import type { RuntimeResolver } from "../lib/runtimeResolver.js";
import type { TeamsayBind } from "../types.js";

/**
 * Default tp_msgreport-equivalent template used when no report bind is detected
 * in the user's config. Minimal single-branch form: powerups + colored armor
 * slash health + best weapon + bracketed location.
 */
const FALLBACK_REPORT_SOURCE = "$tp_powerups $colored_armor/%h $bestweapon [{%l}]";

/**
 * Strip the `$qt<body>$qt` wrapping that ezQuake uses inside cvar values so the
 * engine consumes those quotes as arg delimiters at send time. Our simulator
 * substitutes as plain text, leaving literal `"body"` in the output — which
 * shows up as quote marks the player never sees in-game. The regex matches
 * matched `"..."` pairs containing no embedded quote, which safely catches the
 * idiom without eating user-entered literal quotes (ezQuake bodies never use
 * them in practice since they'd break command parsing).
 */
function stripQtQuotes(s: string): string {
  return s.replace(/"([^"\s][^"]*?)"/g, "$1");
}

function colorStyle(c: SpanColor): { class?: string; style?: Record<string, string> } {
  if (c.kind === "qw") return { class: c.class };
  if (c.kind === "hex") return { style: { color: c.value } };
  return { class: "qw-default" };
}

interface ReportBannerProps {
  /** All teamsay binds from the primary config (we filter for label === "report"). */
  teamsayBinds: TeamsayBind[] | undefined;
  /** Current StatePanel state; banner mirrors its values live. */
  state: PlayerState | undefined;
  /** Merged cvars, used to expand tp_name_*, $colored_armor, etc. */
  cvars: Map<string, string>;
  /** All aliases so the walker can follow `__status_report` into its branches. */
  aliases: Record<string, string>;
  /** Primary bind commands keyed by uppercased key name ("1", "MWHEELUP", etc.). */
  bindCommands: Record<string, string>;
  /** Runtime resolver for macro tooltips (used for buildSpanTree). */
  resolver: RuntimeResolver | null;
  /** Click handler — selects the report label so the left pane expands its chain. */
  onClick?: () => void;
}

export default function ReportBanner(props: ReportBannerProps) {
  // Detect report binds: all teamsay binds labeled "report". We do not require
  // `body` to be populated here because the live output comes from walking the
  // entry command (bindCommands[key]) through evaluateTeamsay below — that
  // handles state-aware if/then/else branching, which tb.body cannot.
  const detected = createMemo<TeamsayBind[]>(() => {
    const list = props.teamsayBinds;
    if (!list || list.length === 0) return [];
    return list.filter((tb) => tb.label === "report");
  });

  // Aliases as a Map for evaluateTeamsay's signature.
  const aliasesMap = createMemo<Map<string, string>>(() =>
    new Map(Object.entries(props.aliases)),
  );

  // Live resolved report output. Picks the correct branch for the current
  // PlayerState by walking the entry alias chain with condition evaluation.
  // Falls back to the built-in tp_msgreport template when no report bind is
  // detected in the config.
  const liveOutput = createMemo<string>(() => {
    const st = props.state;
    if (!st) return "";
    const d = detected();
    if (d.length > 0) {
      const entryKey = d[0].key.toUpperCase();
      const entryCmd = props.bindCommands[entryKey];
      if (entryCmd && entryCmd.trim().length > 0) {
        const r = evaluateTeamsay(entryCmd, st, props.cvars, aliasesMap());
        if (r.output.trim().length > 0) return stripQtQuotes(r.output);
      }
      // Fall through to fallback if the bind command did not produce output.
    }
    // Fallback: evaluate the default tp_msgreport template wrapped as say_team
    // so evaluateTeamsay's OUTPUT_COMMANDS path triggers macro expansion.
    const r = evaluateTeamsay(`say_team ${FALLBACK_REPORT_SOURCE}`, st, props.cvars, aliasesMap());
    return stripQtQuotes(r.output);
  });

  // Feed the already-expanded output to buildSpanTree so its color-code parser
  // handles `{&cXXX...&cfff}` spans. No $tokens remain for macro expansion at
  // this point; state/cvars are still passed because the signature requires them.
  const spans = createMemo(() => {
    const st = props.state;
    const text = liveOutput();
    if (!st || text.length === 0) return null;
    return buildSpanTree(text, {
      state: st,
      cvars: props.cvars,
      resolver: props.resolver,
    }).spans;
  });

  const tooltip = () => {
    const d = detected();
    if (d.length > 0) {
      const keys = d.map((t) => t.key).join(", ");
      return `report bound to ${keys} — click to expand chain`;
    }
    return "Default tp_msgreport — no report bind detected in this config";
  };

  return (
    <Show when={props.state}>
      <div
        class="sg-report-banner"
        classList={{ "sg-report-banner-clickable": !!props.onClick }}
        title={tooltip()}
        onClick={props.onClick}
      >
        <div class="sg-report-banner-body">
          <Show when={spans()} fallback={<span class="sg-report-banner-raw">{liveOutput()}</span>}>
            <For each={spans()!}>
              {(s) => {
                const cs = colorStyle(s.color);
                const classes = [`sg-span-${s.origin}`, cs.class].filter(Boolean).join(" ");
                return (
                  <span class={classes} style={cs.style}>
                    {s.text}
                  </span>
                );
              }}
            </For>
          </Show>
        </div>
      </div>
    </Show>
  );
}
