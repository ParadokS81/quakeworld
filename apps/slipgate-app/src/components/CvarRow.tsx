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
  onToggle: () => void;
  onMouseEnter: (e: MouseEvent) => void;
  onMouseLeave: () => void;
}

/** Numeric-aware equality: "1.0" equals "1". */
function valuesEqual(a: string, b: string): boolean {
  if (a === b) return true;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return false;
}

export default function CvarRow(props: CvarRowProps) {
  // A side is "customized" if its value differs from the documented default.
  // Unknown defaults + empty string are treated as default (cfg_save artifact).
  const leftCustomized = () => {
    const def = props.info?.default;
    if (def === undefined) return props.value !== "";
    return !valuesEqual(props.value, def);
  };

  const rightCustomized = () => {
    if (props.compareValue === undefined) return false;
    const def = props.info?.default;
    if (def === undefined) return props.compareValue !== "";
    return !valuesEqual(props.compareValue, def);
  };

  // Name is colored if either side is customized
  const anyCustomized = () => leftCustomized() || rightCustomized();

  return (
    <div
      class={`grid text-sm cursor-pointer transition-colors border-b border-[var(--sg-stat-border)]
        hover:bg-[color-mix(in_oklch,var(--sg-stat-border)_20%,transparent)]
        ${props.isExpanded ? "bg-[color-mix(in_oklch,var(--color-primary)_8%,transparent)]" : ""}
      `}
      style={{
        "grid-template-columns": props.isCompareMode ? "300px 1fr 1fr" : "320px 1fr",
      }}
      onClick={props.onToggle}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      {/* Cvar name + status badges */}
      <span
        class={`pl-12 pr-4 py-1.5 font-mono truncate flex items-center gap-1.5 ${
          props.isObsolete
            ? "text-[var(--sg-section-label)] line-through"
            : anyCustomized()
              ? "text-[var(--color-primary)]"
              : "text-[var(--sg-section-label)]"
        }`}
        title={props.name}
      >
        {props.name}
        <Show when={props.isObsolete}>
          <span class="badge badge-warning text-[9px] h-3.5 px-1 flex-shrink-0 no-underline" style={{ "text-decoration": "none" }}>obsolete</span>
        </Show>
      </span>

      {/* Your value */}
      <span
        class={`px-3 py-1.5 font-mono truncate ${
          leftCustomized()
            ? "text-[var(--sg-text-bright)] font-semibold"
            : "text-[var(--sg-section-label)]"
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
              : rightCustomized()
                ? "text-[var(--sg-text-bright)] font-semibold"
                : "text-[var(--sg-section-label)]"
          }`}
        >
          {props.compareValue ?? "—"}
        </span>
      </Show>
    </div>
  );
}
