import { createSignal, createMemo, For, Show } from "solid-js";
import { parseConfig, convertConfig, generateReport, writeFteConfig } from "qw-config";
import type { ConversionReport, ConvertedCvar } from "qw-config";
import type { EzQuakeConfig } from "../types";

interface ConfigConverterProps {
  config: EzQuakeConfig;
  configName: string | null;
  onBack: () => void;
}

type ConvertFilter = "all" | "transferred" | "mapped" | "no_equivalent";

export default function ConfigConverter(props: ConfigConverterProps) {
  const [filter, setFilter] = createSignal<ConvertFilter>("all");
  const [search, setSearch] = createSignal("");
  const [copied, setCopied] = createSignal<"config" | "report" | null>(null);

  const configText = createMemo(() =>
    Object.entries(props.config.raw_cvars).map(([k, v]) => `${k} "${v}"`).join("\n")
  );
  const parsed = createMemo(() => parseConfig(configText()));
  const result = createMemo(() => convertConfig(parsed(), "ezquake", "fte"));
  const report = createMemo(() => generateReport(result(), parsed(), "ezquake", "fte"));
  const fteConfigText = createMemo(() => writeFteConfig(result()));

  const allRows = createMemo((): ConvertedCvar[] => {
    const r = report();
    return [...r.transferred, ...r.mapped, ...r.noEquivalent];
  });

  const filteredRows = createMemo(() => {
    const q = search().trim().toLowerCase();
    return allRows().filter(row => {
      if (filter() !== "all" && row.status !== filter()) return false;
      if (q && !row.sourceCvar.toLowerCase().includes(q) && !row.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  });

  const stats = createMemo(() => {
    const r = report();
    const total = r.transferred.length + r.mapped.length + r.noEquivalent.length;
    return {
      total,
      transferred: r.transferred.length,
      mapped: r.mapped.length,
      noEquivalent: r.noEquivalent.length,
      bindsKept: r.bindsKept,
      bindsTotal: r.bindsTotal,
      coverage: r.coverage,
      transferredPct: total > 0 ? (r.transferred.length / total) * 100 : 0,
      mappedPct: total > 0 ? (r.mapped.length / total) * 100 : 0,
      noEquivalentPct: total > 0 ? (r.noEquivalent.length / total) * 100 : 0,
    };
  });

  async function copyFteConfig() {
    try {
      await navigator.clipboard.writeText(fteConfigText());
      setCopied("config");
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }

  async function copyGapReport() {
    const r = report();
    const s = stats();
    const lines: string[] = [
      `// Gap report: ${props.configName ?? "config.cfg"} (ezQuake → FTE)`,
      `// Coverage: ${s.coverage}% — ${s.transferred} transferred, ${s.mapped} mapped, ${s.noEquivalent} no equivalent`,
      "",
      "// == NO EQUIVALENT ==",
      ...r.noEquivalent.map(c => `// ${c.sourceCvar} = "${c.sourceValue}"  —  ${c.description}`),
      "",
      "// == MAPPED ==",
      ...r.mapped.map(c => `// ${c.sourceCvar} → ${c.targetCvar}  (was: "${c.sourceValue}")${c.note ? "  // " + c.note : ""}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied("report");
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }

  function statusIcon(status: string) {
    if (status === "transferred") return <span class="text-[var(--color-success)]">✓</span>;
    if (status === "mapped") return <span class="text-[var(--color-warning)]">⇄</span>;
    return <span class="text-[var(--color-error)]">✗</span>;
  }

  function statusBadgeClass(status: string) {
    if (status === "transferred") return "badge-success";
    if (status === "mapped") return "badge-warning";
    return "badge-error";
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div class="flex items-center gap-3 px-4 py-2 border-b border-[var(--sg-stat-border)] flex-shrink-0 flex-wrap">
        <button class="btn btn-ghost btn-xs" onClick={props.onBack}>
          ← Back
        </button>
        <div class="flex items-center gap-1.5 text-sm">
          <span class="font-mono text-[var(--sg-text-bright)]">{props.configName ?? "config.cfg"}</span>
          <span class="badge badge-primary text-xs px-1.5 h-4">ezQuake</span>
          <span class="text-[var(--sg-section-label)]">→</span>
          <span class="font-mono text-[var(--sg-text-bright)]">fte.cfg</span>
          <span class="badge badge-ghost text-xs px-1.5 h-4">FTE</span>
        </div>
        <div class="flex-1" />
        <button
          class="btn btn-ghost btn-xs"
          onClick={copyGapReport}
        >
          {copied() === "report" ? "✓ Copied!" : "Copy gap report"}
        </button>
        <button
          class="btn btn-primary btn-xs"
          onClick={copyFteConfig}
        >
          {copied() === "config" ? "✓ Copied!" : "Copy fte.cfg"}
        </button>
      </div>

      {/* Summary stats bar */}
      <div class="flex items-stretch gap-0 border-b border-[var(--sg-stat-border)] flex-shrink-0">
        <div class="flex-1 flex flex-col items-center justify-center py-3 border-r border-[var(--sg-stat-border)]">
          <span class="text-2xl font-bold text-[var(--color-success)]">{stats().transferred}</span>
          <span class="text-[10px] text-[var(--sg-section-label)] uppercase tracking-wide mt-0.5">Transferred</span>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center py-3 border-r border-[var(--sg-stat-border)]">
          <span class="text-2xl font-bold text-[var(--color-warning)]">{stats().mapped}</span>
          <span class="text-[10px] text-[var(--sg-section-label)] uppercase tracking-wide mt-0.5">Mapped</span>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center py-3 border-r border-[var(--sg-stat-border)]">
          <span class="text-2xl font-bold text-[var(--color-error)]">{stats().noEquivalent}</span>
          <span class="text-[10px] text-[var(--sg-section-label)] uppercase tracking-wide mt-0.5">No Equivalent</span>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center py-3">
          <span class="text-2xl font-bold text-[var(--sg-text-bright)]">{stats().bindsKept}</span>
          <span class="text-[10px] text-[var(--sg-section-label)] uppercase tracking-wide mt-0.5">
            Binds
            <Show when={stats().bindsTotal > 0}>
              <span class="text-[var(--sg-section-label)]"> / {stats().bindsTotal}</span>
            </Show>
          </span>
        </div>
      </div>

      {/* Coverage progress bar */}
      <div class="px-4 py-2 flex items-center gap-3 border-b border-[var(--sg-stat-border)] flex-shrink-0">
        <span class="text-xs text-[var(--sg-section-label)] w-20 flex-shrink-0">Coverage</span>
        <div class="flex-1 h-3 rounded-full overflow-hidden bg-[var(--sg-stat-bg)] flex">
          <div
            class="h-full bg-[var(--color-success)] transition-all"
            style={{ width: `${stats().transferredPct}%` }}
          />
          <div
            class="h-full bg-[var(--color-warning)] transition-all"
            style={{ width: `${stats().mappedPct}%` }}
          />
          <div
            class="h-full bg-[var(--color-error)] opacity-60 transition-all"
            style={{ width: `${stats().noEquivalentPct}%` }}
          />
        </div>
        <span class="text-sm font-bold text-[var(--sg-text-bright)] w-10 text-right flex-shrink-0">
          {stats().coverage}%
        </span>
      </div>

      {/* Filter pills + search */}
      <div class="flex items-center gap-2 px-4 py-2 border-b border-[var(--sg-stat-border)] flex-shrink-0 flex-wrap">
        <For each={[
          { id: "all" as ConvertFilter, label: `All (${stats().total})` },
          { id: "transferred" as ConvertFilter, label: `Transferred (${stats().transferred})` },
          { id: "mapped" as ConvertFilter, label: `Mapped (${stats().mapped})` },
          { id: "no_equivalent" as ConvertFilter, label: `No equivalent (${stats().noEquivalent})` },
        ]}>
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
        <input
          type="text"
          class="input input-xs w-36 font-mono"
          placeholder="Search cvars…"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
      </div>

      {/* Conversion rows */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={filteredRows().length > 0}
          fallback={
            <div class="flex items-center justify-center h-20 text-xs text-[var(--sg-section-label)]">
              No cvars match the current filters
            </div>
          }
        >
          <For each={filteredRows()}>
            {(row) => (
              <div class="flex items-center gap-3 px-4 py-2 border-b border-[var(--sg-stat-border)] text-sm hover:bg-[color-mix(in_oklch,var(--sg-stat-border)_15%,transparent)] transition-colors">
                {/* Status icon */}
                <span class="text-base w-5 flex-shrink-0 text-center">
                  {statusIcon(row.status)}
                </span>

                {/* Source cvar */}
                <span class="font-mono w-44 flex-shrink-0 truncate text-[var(--sg-text-bright)]" title={row.sourceCvar}>
                  {row.sourceCvar}
                </span>

                {/* Source value */}
                <span class="font-mono w-20 flex-shrink-0 truncate text-[var(--sg-text-dim)]" title={row.sourceValue}>
                  "{row.sourceValue}"
                </span>

                {/* Arrow + target cvar */}
                <Show when={row.status !== "no_equivalent"}>
                  <span class="text-[var(--sg-section-label)] flex-shrink-0">→</span>
                  <span class="font-mono w-44 flex-shrink-0 truncate" title={row.targetCvar}>
                    <Show when={row.status === "mapped"}>
                      <span class="text-[var(--color-warning)]">{row.targetCvar}</span>
                    </Show>
                    <Show when={row.status === "transferred"}>
                      <span class="text-[var(--color-success)]">{row.targetCvar}</span>
                    </Show>
                  </span>
                </Show>
                <Show when={row.status === "no_equivalent"}>
                  <span class="text-[var(--sg-section-label)] text-xs italic flex-shrink-0">no FTE equivalent</span>
                </Show>

                {/* Description */}
                <span class="text-[var(--sg-section-label)] truncate flex-1 text-xs">
                  {row.description}
                </span>

                {/* Note badge */}
                <Show when={row.note}>
                  <span class="badge badge-ghost text-[10px] h-4 px-1.5 flex-shrink-0" title={row.note}>
                    note
                  </span>
                </Show>

                {/* Status badge */}
                <span class={`badge text-[10px] h-4 px-1.5 flex-shrink-0 ${statusBadgeClass(row.status)}`}>
                  {row.status === "no_equivalent" ? "none" : row.status}
                </span>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
