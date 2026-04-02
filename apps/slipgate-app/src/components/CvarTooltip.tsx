import { Show } from "solid-js";
import { findEquivalent } from "qw-config";
import type { CvarInfo } from "qw-config";

/** Display a cvar value — show empty strings as a visible marker */
function displayVal(val: string | undefined): string {
  if (val === undefined) return "—";
  if (val === "") return '""';
  return val;
}

interface CvarTooltipProps {
  name: string;
  value: string;
  compareValue?: string;
  info: CvarInfo | undefined;
  /** "tooltip" = absolutely positioned below row, "expanded" = inline in document flow */
  mode: "tooltip" | "expanded";
}

export default function CvarTooltip(props: CvarTooltipProps) {
  const fteEquivalent = () => findEquivalent(props.name, "ezquake", "fte");
  const qwclEquivalent = () => findEquivalent(props.name, "ezquake", "qwcl");

  const isChanged = () => props.info?.default !== undefined && props.value !== props.info.default;

  return (
    <div
      class={`text-xs ${
        props.mode === "tooltip"
          ? "absolute left-3 right-auto z-30 mt-0 shadow-lg"
          : "mx-3 my-1"
      }`}
      style={{ "max-width": "480px" }}
    >
      <div class="bg-[var(--sg-stat-bg)] border border-[var(--sg-stat-border)] rounded-md p-3 shadow-lg">
        {/* Header: name + category */}
        <div class="flex justify-between items-baseline gap-4 mb-1.5">
          <span class="font-mono font-semibold text-[var(--color-primary)] text-sm truncate">
            {props.name}
          </span>
          <Show when={props.info?.category}>
            <span class="text-[var(--sg-section-label)] text-[10px] uppercase tracking-wide whitespace-nowrap flex-shrink-0">
              {props.info!.category}
              <Show when={props.info!.group}>
                {" "}› {props.info!.group}
              </Show>
            </span>
          </Show>
        </div>

        {/* Description */}
        <Show when={props.info?.description}>
          <p class="text-[var(--sg-text-dim)] leading-relaxed mb-2 text-xs" style={{ "font-family": "var(--font-sans, sans-serif)" }}>
            {props.info!.description}
          </p>
        </Show>

        {/* Remarks */}
        <Show when={props.info?.remarks}>
          <p class="text-[var(--sg-section-label)] leading-relaxed mb-2 text-[11px] whitespace-pre-wrap">
            {props.info!.remarks}
          </p>
        </Show>

        {/* Metadata grid */}
        <div class="grid gap-x-4 gap-y-1 border-t border-[var(--sg-stat-border)] pt-2 mt-1"
          style={{ "grid-template-columns": props.compareValue !== undefined ? "1fr 1fr 1fr" : "1fr 1fr" }}
        >
          <div>
            <span class="text-[var(--sg-section-label)]">Yours</span>
            <span class={`font-mono ml-2 ${isChanged() ? "text-[var(--sg-text-bright)] font-semibold" : "text-[var(--sg-text-dim)]"}`}>
              {displayVal(props.value)}
            </span>
          </div>

          <Show when={props.compareValue !== undefined}>
            <div>
              <span class="text-[var(--sg-section-label)]">Theirs</span>
              <span class={`font-mono ml-2 ${props.compareValue !== props.value ? "text-[var(--color-success)] font-semibold" : "text-[var(--sg-text-dim)]"}`}>
                {displayVal(props.compareValue)}
              </span>
            </div>
          </Show>

          <div>
            <span class="text-[var(--sg-section-label)]">Default</span>
            <span class="font-mono ml-2 text-[var(--sg-text-dim)]">
              {displayVal(props.info?.default)}
            </span>
          </div>

          <div>
            <span class="text-[var(--sg-section-label)]">Type</span>
            <span class="ml-2 text-[var(--sg-text-dim)]">
              {props.info?.type ?? "—"}
            </span>
          </div>

          <Show when={fteEquivalent()}>
            <div>
              <span class="text-[var(--sg-section-label)]">FTE</span>
              <span class="font-mono ml-2 text-[var(--sg-text-dim)]">{fteEquivalent()}</span>
            </div>
          </Show>

          <Show when={qwclEquivalent()}>
            <div>
              <span class="text-[var(--sg-section-label)]">QWCL</span>
              <span class="font-mono ml-2 text-[var(--sg-text-dim)]">{qwclEquivalent()}</span>
            </div>
          </Show>
        </div>

        {/* Enum values (if present) */}
        <Show when={props.info?.values && props.info!.values!.length > 0}>
          <div class="border-t border-[var(--sg-stat-border)] pt-2 mt-2">
            <p class="text-[var(--sg-section-label)] font-semibold uppercase tracking-wide mb-1 text-[10px]">Values</p>
            <div class="flex flex-col gap-0.5">
              {props.info!.values!.map((v) => (
                <div class="flex gap-2">
                  <span class={`font-mono w-8 flex-shrink-0 ${props.value === v.name ? "text-[var(--color-primary)] font-bold" : "text-[var(--sg-text-dim)]"}`}>
                    {v.name}{props.value === v.name ? " ✓" : ""}
                  </span>
                  <span class="text-[var(--sg-text-dim)]">{v.description}</span>
                </div>
              ))}
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
