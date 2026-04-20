import { createSignal, createEffect, Show, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
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
  onOpenInConfigs: (virtualPath: string) => void;
  onSwitchToClientsTab: () => void;
}

export default function BrowseView(props: BrowseViewProps) {
  const [scan, setScan] = createSignal<ScanResult | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [selected, setSelected] = createSignal<ScannedFile | null>(null);
  const [stale, setStale] = createSignal(false);
  const [filters, setFilters] = createSignal<BrowseFilterState>({
    clients: new Set(),
    gamedirs: new Set(),
    categories: new Set(),
    search: "",
  });

  async function runScan() {
    const exe = props.exePath;
    if (!exe) {
      setScan(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ScanResult>("scan_quake_dir", {
        exePath: exe,
        mergedCvars: props.mergedCvars,
      });
      setScan(result);
      setStale(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  // suppress unused-local error for loading — wired in a later task
  void loading;

  onMount(runScan);
  createEffect(() => {
    void props.exePath;
    void Object.keys(props.mergedCvars).length;
    runScan();
  });

  return (
    <Show
      when={props.exePath}
      fallback={
        <div class="flex items-center justify-center h-full text-[var(--sg-text-dim)] text-sm p-8">
          <div>
            <p>Pick an ezQuake install in the Clients tab to browse its files.</p>
          </div>
        </div>
      }
    >
      <Show
        when={!error()}
        fallback={
          <div class="p-4">
            <div class="bg-red-900/30 border border-red-700 rounded p-3 text-sm">
              <p class="font-semibold text-red-300">Scan failed</p>
              <p class="text-red-200">{error()}</p>
              <button class="btn btn-sm btn-outline mt-2" onClick={runScan}>Retry</button>
            </div>
          </div>
        }
      >
        <Show when={scan()} fallback={<div class="p-4 text-sm text-[var(--sg-text-dim)]">Scanning...</div>}>
          {(result) => (
            <div class="flex flex-col h-full">
              <div class="flex items-center gap-3 px-4 py-2 border-b border-[var(--sg-stat-border)]">
                <input
                  class="sg-input text-sm flex-1 max-w-[240px]"
                  placeholder="search filename or path..."
                  value={filters().search}
                  onInput={(e) => setFilters({ ...filters(), search: e.currentTarget.value })}
                />
                <Show when={stale()}>
                  <span class="text-xs text-amber-400">changes detected</span>
                </Show>
                <button class="btn btn-sm btn-outline" onClick={runScan}>
                  Rescan
                </button>
              </div>
              <div class="flex-1 grid grid-cols-[220px_1fr_300px] overflow-hidden">
                <div class="border-r border-[var(--sg-stat-border)] p-3 overflow-auto">
                  <BrowseFilterLens
                    scan={result()}
                    filters={filters()}
                    onFiltersChange={setFilters}
                    onSwitchToClientsTab={props.onSwitchToClientsTab}
                  />
                </div>
                <div class="overflow-auto">
                  <BrowseTree
                    scan={result()}
                    filters={filters()}
                    hideDefaults={props.hideDefaults}
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
                  {result().stats.loaded} loaded - {result().stats.available} available - {result().stats.unreferenced} unreferenced
                </span>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </Show>
  );
}
