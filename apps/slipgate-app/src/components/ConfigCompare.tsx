import { createSignal, createMemo, For, Show } from "solid-js";
import { lookupCvar, parseConfig } from "qw-config";
import type { EzQuakeConfig } from "../types";

interface ConfigCompareProps {
  config: EzQuakeConfig;
  configName: string | null;
  initialCompareText: string | null;
  onBack: () => void;
}

type CompareFilter = "all" | "diff" | "same" | "only_left" | "only_right";

interface CompareRow {
  name: string;
  leftValue: string | undefined;
  rightValue: string | undefined;
  description: string;
}

export default function ConfigCompare(props: ConfigCompareProps) {
  const [pasteText, setPasteText] = createSignal(props.initialCompareText ?? "");
  const [pasteMode, setPasteMode] = createSignal(!props.initialCompareText);
  const [filter, setFilter] = createSignal<CompareFilter>("all");
  const [hideDefaults, setHideDefaults] = createSignal(false);
  const [search, setSearch] = createSignal("");

  // Parse the pasted config text into a cvar map
  const rightCvars = createMemo((): Map<string, string> => {
    const text = pasteText().trim();
    if (!text) return new Map();
    const parsed = parseConfig(text);
    return new Map(parsed.cvars);
  });

  const leftCvars = createMemo(() => new Map(Object.entries(props.config.raw_cvars)));

  // Build unified row list
  const allRows = createMemo((): CompareRow[] => {
    const keys = new Set([...leftCvars().keys(), ...rightCvars().keys()]);
    return Array.from(keys).sort().map(name => {
      const info = lookupCvar(name);
      return {
        name,
        leftValue: leftCvars().get(name),
        rightValue: rightCvars().get(name),
        description: info?.description ?? "",
      };
    });
  });

  const diffCount = createMemo(() =>
    allRows().filter(r => r.leftValue !== undefined && r.rightValue !== undefined && r.leftValue !== r.rightValue).length
  );

  const filteredRows = createMemo(() => {
    const q = search().trim().toLowerCase();
    return allRows().filter(row => {
      // Filter
      switch (filter()) {
        case "diff":
          if (row.leftValue === undefined || row.rightValue === undefined || row.leftValue === row.rightValue) return false;
          break;
        case "same":
          if (row.leftValue !== row.rightValue) return false;
          break;
        case "only_left":
          if (row.rightValue !== undefined) return false;
          break;
        case "only_right":
          if (row.leftValue !== undefined) return false;
          break;
      }
      // Hide defaults
      if (hideDefaults()) {
        const info = lookupCvar(row.name);
        if (info?.default !== undefined) {
          const leftIsDefault = row.leftValue === info.default || row.leftValue === undefined;
          const rightIsDefault = row.rightValue === info.default || row.rightValue === undefined;
          if (leftIsDefault && rightIsDefault) return false;
        }
      }
      // Search
      if (q && !row.name.toLowerCase().includes(q) && !row.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  });

  const onlyLeft = () => allRows().filter(r => r.rightValue === undefined).length;
  const onlyRight = () => allRows().filter(r => r.leftValue === undefined).length;

  function cellClass(row: CompareRow, side: "left" | "right") {
    const val = side === "left" ? row.leftValue : row.rightValue;
    if (val === undefined) return "text-[var(--sg-section-label)] italic";
    if (row.leftValue !== undefined && row.rightValue !== undefined && row.leftValue !== row.rightValue) {
      return side === "left"
        ? "text-[var(--color-warning)] font-mono font-semibold"
        : "text-[var(--color-success)] font-mono font-semibold";
    }
    return "text-[var(--sg-text-dim)] font-mono";
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div class="flex items-center gap-3 px-4 py-2 border-b border-[var(--sg-stat-border)] flex-shrink-0">
        <button
          class="btn btn-ghost btn-xs"
          onClick={props.onBack}
        >
          ← Back
        </button>
        <span class="text-sm font-semibold text-[var(--sg-text-bright)]">
          Config Compare
        </span>
        <div class="flex-1" />
        <Show when={!pasteMode()}>
          <button
            class="btn btn-ghost btn-xs text-[var(--sg-text-dim)]"
            onClick={() => setPasteMode(true)}
          >
            Change right config
          </button>
        </Show>
      </div>

      {/* Paste mode */}
      <Show when={pasteMode()}>
        <div class="flex flex-col gap-3 p-4 border-b border-[var(--sg-stat-border)] flex-shrink-0">
          <p class="text-sm text-[var(--sg-text-dim)]">
            Paste a config file to compare with <span class="font-mono text-[var(--sg-text-bright)]">{props.configName ?? "config.cfg"}</span>:
          </p>
          <textarea
            class="textarea textarea-bordered font-mono text-xs h-32 w-full"
            placeholder={`sensitivity "3"\ncl_maxfps "500"\n...`}
            value={pasteText()}
            onInput={(e) => setPasteText(e.currentTarget.value)}
          />
          <div class="flex gap-2">
            <button
              class="btn btn-primary btn-sm"
              disabled={!pasteText().trim()}
              onClick={() => setPasteMode(false)}
            >
              Compare
            </button>
            <button class="btn btn-ghost btn-sm" onClick={props.onBack}>
              Cancel
            </button>
          </div>
        </div>
      </Show>

      <Show when={!pasteMode() && pasteText().trim()}>
        {/* Column headers */}
        <div class="grid grid-cols-[2fr_1fr_1fr] gap-0 border-b border-[var(--sg-stat-border)] flex-shrink-0">
          <div class="px-4 py-1.5 text-xs font-semibold text-[var(--sg-section-label)] uppercase tracking-wide">
            Cvar
          </div>
          <div class="px-3 py-1.5 text-xs font-semibold text-[var(--sg-section-label)] uppercase tracking-wide border-l border-[var(--sg-stat-border)]">
            {props.configName ?? "Your config"}
          </div>
          <div class="px-3 py-1.5 text-xs font-semibold text-[var(--sg-section-label)] uppercase tracking-wide border-l border-[var(--sg-stat-border)]">
            Comparison
          </div>
        </div>

        {/* Filter bar */}
        <div class="flex items-center gap-2 px-4 py-2 border-b border-[var(--sg-stat-border)] flex-shrink-0 flex-wrap">
          <For each={[
            { id: "all", label: `All (${allRows().length})` },
            { id: "diff", label: `Differences (${diffCount()})` },
            { id: "same", label: "Same" },
            { id: "only_left", label: `Only left (${onlyLeft()})` },
            { id: "only_right", label: `Only right (${onlyRight()})` },
          ] as { id: CompareFilter; label: string }[]}>
            {(f) => (
              <button
                class={`badge cursor-pointer flex-shrink-0 transition-colors ${
                  filter() === f.id ? "badge-primary" : "badge-ghost hover:badge-outline"
                }`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            )}
          </For>

          <div class="flex-1" />

          <label class="flex items-center gap-1.5 text-xs text-[var(--sg-text-dim)] flex-shrink-0 cursor-pointer select-none">
            <input
              type="checkbox"
              class="checkbox checkbox-xs"
              checked={hideDefaults()}
              onChange={(e) => setHideDefaults(e.currentTarget.checked)}
            />
            Hide defaults
          </label>
          <input
            type="text"
            class="input input-xs w-36 font-mono"
            placeholder="Search…"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
        </div>

        {/* Diff rows */}
        <div class="flex-1 overflow-y-auto">
          <Show
            when={filteredRows().length > 0}
            fallback={
              <div class="flex items-center justify-center h-20 text-xs text-[var(--sg-section-label)]">
                No rows match the current filters
              </div>
            }
          >
            <For each={filteredRows()}>
              {(row) => {
                const isDiff = row.leftValue !== undefined && row.rightValue !== undefined && row.leftValue !== row.rightValue;
                const isOnlyLeft = row.rightValue === undefined;
                const isOnlyRight = row.leftValue === undefined;
                return (
                  <div
                    class={`grid grid-cols-[2fr_1fr_1fr] border-b border-[var(--sg-stat-border)] text-sm transition-colors ${
                      isDiff
                        ? "bg-[color-mix(in_oklch,var(--color-warning)_5%,transparent)]"
                        : isOnlyLeft || isOnlyRight
                          ? "bg-[color-mix(in_oklch,var(--sg-stat-border)_15%,transparent)] opacity-60"
                          : ""
                    }`}
                  >
                    <div class="px-4 py-1.5 flex flex-col justify-center">
                      <span class={`font-mono text-xs ${isDiff ? "text-[var(--sg-text-bright)]" : "text-[var(--sg-text-dim)]"}`}>
                        {row.name}
                      </span>
                      <Show when={row.description}>
                        <span class="text-[10px] text-[var(--sg-section-label)] truncate">{row.description}</span>
                      </Show>
                    </div>
                    <div class={`px-3 py-1.5 border-l border-[var(--sg-stat-border)] flex items-center text-xs ${cellClass(row, "left")}`}>
                      {row.leftValue ?? "—"}
                    </div>
                    <div class={`px-3 py-1.5 border-l border-[var(--sg-stat-border)] flex items-center text-xs ${cellClass(row, "right")}`}>
                      {row.rightValue ?? "—"}
                    </div>
                  </div>
                );
              }}
            </For>
          </Show>
        </div>
      </Show>

      {/* Empty right config state */}
      <Show when={!pasteMode() && !pasteText().trim()}>
        <div class="flex flex-col items-center justify-center flex-1 gap-2 text-[var(--sg-text-dim)]">
          <p class="text-sm">No comparison config loaded.</p>
          <button class="btn btn-ghost btn-sm" onClick={() => setPasteMode(true)}>
            Paste a config
          </button>
        </div>
      </Show>
    </div>
  );
}
