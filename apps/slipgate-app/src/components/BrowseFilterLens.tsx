import { For, Show, createMemo } from "solid-js";
import type { ScanResult, BrowseFilterState } from "../types";
import { assetBundle, CATEGORY_COLOR } from "../lib/assets/bundle";

interface BrowseFilterLensProps {
  scan: ScanResult;
  filters: BrowseFilterState;
  onFiltersChange: (next: BrowseFilterState) => void;
  onSwitchToClientsDomain: () => void;
}

export default function BrowseFilterLens(props: BrowseFilterLensProps) {
  const categoryCounts = createMemo(() => {
    const counts = new Map<string, number>();
    let other = 0;
    for (const f of props.scan.files) {
      if (!f.category_id) {
        other++;
        continue;
      }
      counts.set(f.category_id, (counts.get(f.category_id) ?? 0) + 1);
    }
    return { byCategory: counts, other };
  });

  const otherBreakdown = createMemo(() => {
    const counts = new Map<string, number>();
    for (const f of props.scan.files) {
      if (f.category_id) continue;
      // Leaf name after any archive ":" boundary and last "/".
      const leafStart = Math.max(f.virtual_path.lastIndexOf("/"), f.virtual_path.lastIndexOf(":"));
      const leaf = leafStart >= 0 ? f.virtual_path.slice(leafStart + 1) : f.virtual_path;
      const dot = leaf.lastIndexOf(".");
      const ext = dot > 0 ? leaf.slice(dot).toLowerCase() : "(no extension)";
      counts.set(ext, (counts.get(ext) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  });

  function setSearch(q: string) {
    props.onFiltersChange({ ...props.filters, search: q });
  }

  function toggle(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function toggleClient(name: string) {
    props.onFiltersChange({ ...props.filters, clients: toggle(props.filters.clients, name) });
  }
  function toggleGamedir(name: string) {
    props.onFiltersChange({ ...props.filters, gamedirs: toggle(props.filters.gamedirs, name) });
  }
  function toggleCategory(canonical: string) {
    props.onFiltersChange({ ...props.filters, categories: toggle(props.filters.categories, canonical) });
  }
  function clearFilters() {
    props.onFiltersChange({ clients: new Set(), gamedirs: new Set(), categories: new Set(), search: props.filters.search });
  }

  const activeCount = createMemo(() =>
    props.filters.clients.size + props.filters.gamedirs.size + props.filters.categories.size,
  );

  return (
    <div class="flex flex-col gap-4 text-xs">
      <section>
        <div class="sg-label">CLIENTS DETECTED</div>
        <For each={props.scan.clients_detected}>
          {(c) => (
            <div
              class={`sg-lens-row ${c.active ? "sg-lens-row-active" : ""} ${props.filters.clients.has(c.name) ? "sg-lens-row-selected" : ""}`}
              onClick={() => (c.active ? toggleClient(c.name) : props.onSwitchToClientsDomain())}
            >
              <span class="sg-lens-indicator">{c.active ? "[*]" : "[ ]"}</span>
              <span>{c.name}</span>
            </div>
          )}
        </For>
      </section>

      <section>
        <div class="sg-label">GAMEDIRS DETECTED</div>
        <For each={props.scan.gamedirs_detected}>
          {(g) => (
            <div
              class={`sg-lens-row ${props.filters.gamedirs.has(g) ? "sg-lens-row-selected" : ""}`}
              onClick={() => toggleGamedir(g)}
            >
              <span>{g}/</span>
            </div>
          )}
        </For>
      </section>

      <section>
        <div class="sg-label">FILTER BY DOMAIN</div>
        <div class="font-semibold">assets</div>
        <For each={Array.from(assetBundle.categories.values())}>
          {(cat) => {
            const count = () => categoryCounts().byCategory.get(cat.canonical_id) ?? 0;
            const selected = () => props.filters.categories.has(cat.canonical_id);
            return (
              <Show when={count() > 0}>
                <div
                  class={`sg-lens-row sg-lens-row-indent ${selected() ? "sg-lens-row-selected" : ""}`}
                  onClick={() => toggleCategory(cat.canonical_id)}
                >
                  <span
                    class="sg-lens-swatch"
                    style={{ background: CATEGORY_COLOR[cat.canonical_id] ?? "oklch(0.5 0.02 0)" }}
                  />
                  <span>{cat.display_name}</span>
                  <span class="sg-lens-count">{count()}</span>
                </div>
              </Show>
            );
          }}
        </For>
        <Show when={categoryCounts().other > 0}>
          <div class="sg-lens-row sg-lens-row-dim">
            <span>other</span>
            <span class="sg-lens-count">{categoryCounts().other}</span>
          </div>
          <For each={otherBreakdown().slice(0, 12)}>
            {([ext, count]) => (
              <div
                class="sg-lens-row sg-lens-row-indent sg-lens-row-dim"
                title={`Filter tree for "${ext}"`}
                onClick={() => setSearch(ext)}
              >
                <span>{ext}</span>
                <span class="sg-lens-count">{count}</span>
              </div>
            )}
          </For>
        </Show>
      </section>

      <Show when={activeCount() > 0}>
        <section class="border-t border-[var(--sg-stat-border)] pt-2">
          <div class="text-[var(--color-primary)]">{activeCount()} filter{activeCount() === 1 ? "" : "s"} active</div>
          <button class="btn btn-xs btn-outline mt-1" onClick={clearFilters}>Clear filters</button>
        </section>
      </Show>
    </div>
  );
}
