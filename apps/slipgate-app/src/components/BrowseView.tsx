import { createSignal, Show } from "solid-js";
import type { ScanResult, ScannedFile, BrowseFilterState } from "../types";
import type { ProfileData } from "../store";
import BrowseFilterLens from "./BrowseFilterLens";
import BrowseTree from "./BrowseTree";
import BrowseDetail from "./BrowseDetail";

interface BrowseViewProps {
  exePath: string | null;
  mergedCvars: Record<string, string>;
  profile: ProfileData | null;
  hideDefaults: boolean;
  scan: ScanResult | null;
  scanError: string | null;
  onOpenInConfigs: (virtualPath: string) => void;
  onSwitchToClientsDomain: () => void;
  onRetryScan: () => void;
}

export default function BrowseView(props: BrowseViewProps) {
  const [selected, setSelected] = createSignal<ScannedFile | null>(null);
  const [filters, setFilters] = createSignal<BrowseFilterState>({
    clients: new Set(),
    gamedirs: new Set(),
    categories: new Set(),
    search: "",
  });
  // When any filter is active, default to hiding non-matching branches. "Show all" reveals dimmed context.
  const [hideDimmed, setHideDimmed] = createSignal(true);

  const filtersActive = () => {
    const f = filters();
    return f.clients.size > 0 || f.gamedirs.size > 0 || f.categories.size > 0 || f.search.trim().length > 0;
  };

  return (
    <Show
      when={props.exePath}
      fallback={
        <div class="flex items-center justify-center h-full text-[var(--sg-text-dim)] text-sm p-8">
          <div>
            <p>Pick an ezQuake install in the Clients domain to browse its files.</p>
          </div>
        </div>
      }
    >
      <Show
        when={!props.scanError}
        fallback={
          <div class="p-4">
            <div class="bg-red-900/30 border border-red-700 rounded p-3 text-sm">
              <p class="font-semibold text-red-300">Scan failed</p>
              <p class="text-red-200">{props.scanError}</p>
              <button class="btn btn-sm btn-outline mt-2" onClick={props.onRetryScan}>Retry</button>
            </div>
          </div>
        }
      >
        <Show when={props.scan} fallback={<div class="p-4 text-sm text-[var(--sg-text-dim)]">Scanning...</div>}>
          {(result) => (
            <div class="flex flex-col h-full">
              <div class="flex-1 grid grid-cols-[220px_1fr_300px] overflow-hidden">
                <div class="border-r border-[var(--sg-stat-border)] p-3 overflow-auto flex flex-col gap-3">
                  <input
                    class="sg-input text-sm w-full"
                    placeholder="search filename or path..."
                    value={filters().search}
                    onInput={(e) => setFilters({ ...filters(), search: e.currentTarget.value })}
                  />
                  <Show when={filtersActive()}>
                    <label class="flex items-center gap-1 text-xs text-[var(--sg-text-dim)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!hideDimmed()}
                        onChange={(e) => setHideDimmed(!e.currentTarget.checked)}
                      />
                      Show all
                    </label>
                  </Show>
                  <BrowseFilterLens
                    scan={result()}
                    filters={filters()}
                    onFiltersChange={setFilters}
                    onSwitchToClientsDomain={props.onSwitchToClientsDomain}
                  />
                </div>
                <div class="overflow-auto">
                  <BrowseTree
                    scan={result()}
                    filters={filters()}
                    hideDefaults={props.hideDefaults}
                    hideDimmed={hideDimmed()}
                    selectedPath={selected()?.virtual_path ?? null}
                    onSelect={setSelected}
                  />
                </div>
                <div class="border-l border-[var(--sg-stat-border)] p-3 overflow-auto">
                  <BrowseDetail
                    scan={result()}
                    file={selected()}
                    exePath={props.exePath!}
                    onOpenInConfigs={props.onOpenInConfigs}
                  />
                </div>
              </div>
              <div class="px-4 py-1 border-t border-[var(--sg-stat-border)] text-xs text-[var(--sg-text-dim)] flex gap-4">
                <span>{result().files.length} files</span>
                <span>{(result().stats.total_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                <span>
                  {result().stats.loaded} loaded - {result().stats.available} available - {result().stats.shipped} shipped - {result().stats.other} other
                </span>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </Show>
  );
}
