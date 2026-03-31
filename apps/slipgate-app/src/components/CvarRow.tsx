import { Show } from "solid-js";
import type { CvarInfo } from "qw-config";

interface CvarRowProps {
  name: string;
  value: string;
  info: CvarInfo | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function CvarRow(props: CvarRowProps) {
  const isChanged = () => {
    if (!props.info) return false;
    return props.info.default !== undefined && props.value !== props.info.default;
  };

  return (
    <div
      class={`flex items-center gap-3 px-4 py-2 text-sm cursor-pointer transition-colors border-b border-[var(--sg-stat-border)] hover:bg-[color-mix(in_oklch,var(--sg-stat-border)_20%,transparent)] ${
        props.isExpanded ? "bg-[color-mix(in_oklch,var(--color-primary)_5%,transparent)]" : ""
      } ${!isChanged() && props.info ? "opacity-45" : ""}`}
      onClick={props.onToggle}
    >
      {/* Expand chevron */}
      <span class="text-[var(--sg-section-label)] text-xs w-3 flex-shrink-0 select-none">
        {props.isExpanded ? "▼" : "▶"}
      </span>

      {/* Cvar name */}
      <span
        class={`font-mono w-52 flex-shrink-0 truncate ${
          isChanged() ? "text-[var(--color-primary)]" : "text-[var(--sg-text-dim)]"
        }`}
        title={props.name}
      >
        {props.name}
      </span>

      {/* Value */}
      <span
        class={`font-mono w-28 flex-shrink-0 truncate ${
          isChanged()
            ? "text-[var(--sg-text-bright)] font-semibold"
            : "text-[var(--sg-text-dim)]"
        }`}
        title={props.value}
      >
        {props.value}
      </span>

      {/* Description */}
      <span class="text-[var(--sg-text-dim)] truncate flex-1 text-xs">
        {props.info?.description ?? "Unknown cvar"}
      </span>

      {/* Source badge */}
      <span class="badge badge-ghost text-[10px] h-4 px-1.5 flex-shrink-0 ml-1">
        cfg
      </span>

      {/* Changed indicator */}
      <Show when={isChanged()}>
        <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] flex-shrink-0" title="Changed from default" />
      </Show>
    </div>
  );
}
