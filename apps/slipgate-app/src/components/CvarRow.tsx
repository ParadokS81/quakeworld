import { Show } from "solid-js";
import type { CvarInfo } from "qw-config";

interface CvarRowProps {
  name: string;
  value: string;
  compareValue?: string;
  info: CvarInfo | undefined;
  isExpanded: boolean;
  isCompareMode: boolean;
  isObsolete?: boolean;
  isUnknown?: boolean;
  onToggle: () => void;
  onMouseEnter: (e: MouseEvent) => void;
  onMouseLeave: () => void;
}

export default function CvarRow(props: CvarRowProps) {
  const isChanged = () => {
    if (props.info?.default === undefined || props.info?.default === null) return false;
    // Numeric-aware: "1.0" equals "1"
    const na = Number(props.value);
    const nd = Number(props.info.default);
    if (!Number.isNaN(na) && !Number.isNaN(nd)) return na !== nd;
    return props.value !== props.info.default;
  };

  const isDiff = () => {
    if (props.compareValue === undefined) return false;
    const na = Number(props.value);
    const nb = Number(props.compareValue);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na !== nb;
    return props.value !== props.compareValue;
  };

  const isOnlyLeft = () => props.isCompareMode && props.compareValue === undefined;

  return (
    <div
      class={`grid text-sm cursor-pointer transition-colors border-b border-[var(--sg-stat-border)]
        hover:bg-[color-mix(in_oklch,var(--sg-stat-border)_20%,transparent)]
        ${props.isExpanded ? "bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)]" : ""}
        ${isDiff() ? "bg-[color-mix(in_oklch,var(--color-warning)_5%,transparent)]" : ""}
        ${!isChanged() && props.info ? "opacity-45" : ""}
        ${isOnlyLeft() ? "opacity-60" : ""}
      `}
      style={{
        "grid-template-columns": props.isCompareMode ? "240px 1fr 1fr" : "280px 1fr",
      }}
      onClick={props.onToggle}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {/* Cvar name + status badges */}
      <span
        class={`px-4 py-1.5 font-mono truncate flex items-center gap-1.5 ${
          props.isObsolete
            ? "text-[var(--sg-section-label)] line-through"
            : isChanged()
              ? "text-[var(--color-primary)]"
              : "text-[var(--sg-text-dim)]"
        }`}
        title={props.name}
      >
        {props.name}
        <Show when={props.isObsolete}>
          <span class="badge badge-warning text-[9px] h-3.5 px-1 flex-shrink-0 no-underline" style={{ "text-decoration": "none" }}>obsolete</span>
        </Show>
        <Show when={props.isUnknown}>
          <span class="badge badge-ghost text-[9px] h-3.5 px-1 flex-shrink-0">custom</span>
        </Show>
      </span>

      {/* Your value */}
      <span
        class={`px-3 py-1.5 font-mono truncate ${
          isDiff()
            ? "text-[var(--color-warning)] font-semibold"
            : isChanged()
              ? "text-[var(--sg-text-bright)] font-semibold"
              : "text-[var(--sg-text-dim)]"
        }`}
        title={props.value}
      >
        {props.value === "" ? '""' : props.value}
      </span>

      {/* Compare value (only in compare mode) */}
      <Show when={props.isCompareMode}>
        <span
          class={`px-3 py-1.5 font-mono truncate border-l border-[var(--sg-stat-border)] ${
            props.compareValue === undefined
              ? "text-[var(--sg-section-label)] italic"
              : isDiff()
                ? "text-[var(--color-success)] font-semibold"
                : "text-[var(--sg-text-dim)]"
          }`}
        >
          {props.compareValue ?? "—"}
        </span>
      </Show>
    </div>
  );
}
