import { Show } from "solid-js";
import type { CvarInfo } from "qw-config";

interface CvarRowProps {
  name: string;
  value: string;
  compareValue?: string;
  info: CvarInfo | undefined;
  isExpanded: boolean;
  isCompareMode: boolean;
  onToggle: () => void;
  onMouseEnter: (e: MouseEvent) => void;
  onMouseLeave: () => void;
}

export default function CvarRow(props: CvarRowProps) {
  const isChanged = () => {
    if (!props.info?.default) return false;
    return props.value !== props.info.default;
  };

  const isDiff = () =>
    props.compareValue !== undefined && props.value !== props.compareValue;

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
      {/* Cvar name */}
      <span
        class={`px-4 py-1.5 font-mono truncate ${
          isChanged() ? "text-[var(--color-primary)]" : "text-[var(--sg-text-dim)]"
        }`}
        title={props.name}
      >
        {props.name}
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
        {props.value}
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
