import { For, Show, createMemo, createResource, createSignal } from "solid-js";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type { ScanResult, ScannedFile } from "../types";

interface MatchesDomainProps {
  exePath: string | null;
  mergedCvars: Record<string, string>;
  scan: ScanResult | null;
  onRescan: () => void;
}

interface MatchBundle {
  id: string;
  demo: ScannedFile | null;
  screenshots: ScannedFile[];
  logs: ScannedFile[];
  mtime: number;
  label: string;
  clients: string[];
}

const DEMO_EXTS = new Set([".dem", ".qwd", ".qwz", ".mvd"]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".tga", ".pcx"]);
const LOG_EXTS = new Set([".log"]);

function leafExt(vp: string): string {
  const leafStart = Math.max(vp.lastIndexOf("/"), vp.lastIndexOf(":"));
  const leaf = leafStart >= 0 ? vp.slice(leafStart + 1) : vp;
  const dot = leaf.lastIndexOf(".");
  return dot > 0 ? leaf.slice(dot).toLowerCase() : "";
}

function leafName(vp: string): string {
  const leafStart = Math.max(vp.lastIndexOf("/"), vp.lastIndexOf(":"));
  return leafStart >= 0 ? vp.slice(leafStart + 1) : vp;
}

function formatDate(mtime: number): string {
  if (!mtime) return "";
  const d = new Date(mtime * 1000);
  return d.toISOString().slice(0, 10);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isDemo(f: ScannedFile): boolean {
  return DEMO_EXTS.has(leafExt(f.virtual_path));
}

function isScreenshot(f: ScannedFile): boolean {
  return f.category_id === "ezquake:asset_category:screenshot";
}

function isLog(f: ScannedFile): boolean {
  return LOG_EXTS.has(leafExt(f.virtual_path));
}

export default function MatchesDomain(props: MatchesDomainProps) {
  const [selected, setSelected] = createSignal<ScannedFile | null>(null);
  const [expandedBundles, setExpandedBundles] = createSignal<Set<string>>(new Set());
  const [showLooseScreenshots, setShowLooseScreenshots] = createSignal(false);

  const bundles = createMemo<MatchBundle[]>(() => {
    const scan = props.scan;
    if (!scan) return [];
    const byId = new Map<string, MatchBundle>();
    for (const f of scan.files) {
      if (!f.match_group_id) continue;
      const existing = byId.get(f.match_group_id);
      const bundle = existing ?? {
        id: f.match_group_id,
        demo: null,
        screenshots: [],
        logs: [],
        mtime: 0,
        label: "",
        clients: [],
      };
      if (isDemo(f)) {
        bundle.demo = f;
        bundle.label = f.virtual_path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? bundle.id;
      } else if (isScreenshot(f) || IMAGE_EXTS.has(leafExt(f.virtual_path))) {
        bundle.screenshots.push(f);
      } else if (isLog(f)) {
        bundle.logs.push(f);
      }
      bundle.mtime = Math.max(bundle.mtime, f.mtime);
      for (const c of f.matched_rules_by) {
        if (!bundle.clients.includes(c)) bundle.clients.push(c);
      }
      if (!existing) byId.set(f.match_group_id, bundle);
    }
    // A "bundle" is useful when there's a demo AND at least one companion. Otherwise
    // the file(s) go into the loose section.
    return [...byId.values()]
      .filter((b) => b.demo !== null && (b.screenshots.length > 0 || b.logs.length > 0))
      .sort((a, b) => b.mtime - a.mtime);
  });

  const looseDemos = createMemo<ScannedFile[]>(() => {
    const scan = props.scan;
    if (!scan) return [];
    const bundleIds = new Set(bundles().map((b) => b.id));
    return scan.files
      .filter((f) => isDemo(f) && (!f.match_group_id || !bundleIds.has(f.match_group_id)))
      .sort((a, b) => b.mtime - a.mtime);
  });

  const looseScreenshots = createMemo<ScannedFile[]>(() => {
    const scan = props.scan;
    if (!scan) return [];
    const bundleIds = new Set(bundles().map((b) => b.id));
    return scan.files
      .filter((f) => isScreenshot(f) && (!f.match_group_id || !bundleIds.has(f.match_group_id)))
      .sort((a, b) => b.mtime - a.mtime);
  });

  function toggleBundle(id: string) {
    const next = new Set(expandedBundles());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedBundles(next);
  }

  const [previewUrl] = createResource(
    () => {
      const f = selected();
      if (!f) return null;
      if (!isScreenshot(f) && !IMAGE_EXTS.has(leafExt(f.virtual_path))) return null;
      return f;
    },
    async (f: ScannedFile) => {
      if (!props.exePath) return null;
      if (f.container.kind === "loose") {
        const abs = `${props.scan?.root.replace(/\\/g, "/") ?? ""}/${f.virtual_path}`;
        return convertFileSrc(abs);
      }
      try {
        const bytes = await invoke<number[]>("read_file_bytes", {
          exePath: props.exePath,
          virtualPath: f.virtual_path,
          maxBytes: 2 * 1024 * 1024,
        });
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    },
  );

  async function openFolder(vp: string) {
    if (!props.exePath) return;
    try {
      await invoke("open_containing_folder", { exePath: props.exePath, virtualPath: vp });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Show
      when={props.exePath && props.scan}
      fallback={
        <div class="flex items-center justify-center h-full text-[var(--sg-text-dim)] text-sm p-8">
          <p>Pick an ezQuake install in the Clients tab to see your matches.</p>
        </div>
      }
    >
      <div class="flex h-full">
        {/* List pane */}
        <div class="flex-1 overflow-auto p-4 text-xs">
          <div class="flex items-center gap-3 mb-3">
            <h2 class="text-sm font-semibold text-[var(--sg-text-bright)]">Matches</h2>
            <span class="text-[var(--sg-text-dim)]">
              {bundles().length} bundled &middot; {looseDemos().length} loose demos &middot; {looseScreenshots().length} loose screenshots
            </span>
            <button class="btn btn-xs btn-outline ml-auto" onClick={props.onRescan}>
              Rescan
            </button>
          </div>

          {/* BUNDLED MATCHES */}
          <section class="mb-6">
            <div class="sg-label mb-2">BUNDLED MATCHES</div>
            <Show
              when={bundles().length > 0}
              fallback={<p class="text-[var(--sg-text-dim)] italic">No auto-recorded matches detected.</p>}
            >
              <For each={bundles()}>
                {(b) => {
                  const open = () => expandedBundles().has(b.id);
                  return (
                    <div class="sg-match-bundle mb-1">
                      <div
                        class={`sg-match-bundle-row ${selected()?.virtual_path === b.demo?.virtual_path ? "sg-match-selected" : ""}`}
                        onClick={() => {
                          toggleBundle(b.id);
                          if (b.demo) setSelected(b.demo);
                        }}
                      >
                        <span class="sg-match-caret">{open() ? "v" : ">"}</span>
                        <span class="sg-match-date">{formatDate(b.mtime)}</span>
                        <span class="sg-match-label">{b.label}</span>
                        <span class="sg-match-chips">
                          <Show when={b.demo}>
                            <span class="sg-match-chip sg-chip-demo" title={b.demo!.virtual_path}>
                              {leafExt(b.demo!.virtual_path).slice(1)}
                            </span>
                          </Show>
                          <Show when={b.screenshots.length > 0}>
                            <span class="sg-match-chip sg-chip-sshot">
                              {b.screenshots.length} sshot{b.screenshots.length === 1 ? "" : "s"}
                            </span>
                          </Show>
                          <Show when={b.logs.length > 0}>
                            <span class="sg-match-chip sg-chip-log">log</span>
                          </Show>
                        </span>
                      </div>
                      <Show when={open()}>
                        <div class="sg-match-bundle-details">
                          <Show when={b.demo}>
                            <MatchFileRow
                              file={b.demo!}
                              selected={selected()?.virtual_path === b.demo!.virtual_path}
                              onClick={() => setSelected(b.demo!)}
                              onOpenFolder={() => openFolder(b.demo!.virtual_path)}
                            />
                          </Show>
                          <For each={b.screenshots}>
                            {(s) => (
                              <MatchFileRow
                                file={s}
                                selected={selected()?.virtual_path === s.virtual_path}
                                onClick={() => setSelected(s)}
                                onOpenFolder={() => openFolder(s.virtual_path)}
                              />
                            )}
                          </For>
                          <For each={b.logs}>
                            {(l) => (
                              <MatchFileRow
                                file={l}
                                selected={selected()?.virtual_path === l.virtual_path}
                                onClick={() => setSelected(l)}
                                onOpenFolder={() => openFolder(l.virtual_path)}
                              />
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </Show>
          </section>

          {/* LOOSE DEMOS */}
          <section class="mb-6">
            <div class="sg-label mb-2">LOOSE DEMOS &middot; {looseDemos().length}</div>
            <Show
              when={looseDemos().length > 0}
              fallback={<p class="text-[var(--sg-text-dim)] italic">No unpaired demos.</p>}
            >
              <For each={looseDemos()}>
                {(f) => (
                  <MatchFileRow
                    file={f}
                    selected={selected()?.virtual_path === f.virtual_path}
                    onClick={() => setSelected(f)}
                    onOpenFolder={() => openFolder(f.virtual_path)}
                  />
                )}
              </For>
            </Show>
          </section>

          {/* LOOSE SCREENSHOTS (collapsed) */}
          <section>
            <div
              class="sg-label mb-2 cursor-pointer"
              onClick={() => setShowLooseScreenshots(!showLooseScreenshots())}
            >
              {showLooseScreenshots() ? "v" : ">"} LOOSE SCREENSHOTS &middot; {looseScreenshots().length}
            </div>
            <Show when={showLooseScreenshots()}>
              <For each={looseScreenshots().slice(0, 200)}>
                {(f) => (
                  <MatchFileRow
                    file={f}
                    selected={selected()?.virtual_path === f.virtual_path}
                    onClick={() => setSelected(f)}
                    onOpenFolder={() => openFolder(f.virtual_path)}
                  />
                )}
              </For>
              <Show when={looseScreenshots().length > 200}>
                <p class="text-[var(--sg-text-dim)] italic pl-4 mt-2">
                  Showing first 200 of {looseScreenshots().length}. Use Browse for full list.
                </p>
              </Show>
            </Show>
          </section>
        </div>

        {/* Detail pane */}
        <div class="w-[320px] border-l border-[var(--sg-stat-border)] p-3 overflow-auto text-xs">
          <Show
            when={selected()}
            fallback={<p class="text-[var(--sg-text-dim)] italic">Pick a match to preview.</p>}
          >
            {(f) => (
              <div class="flex flex-col gap-3">
                <section>
                  <div class="sg-label">SELECTED</div>
                  <div class="font-semibold text-sm">{leafName(f().virtual_path)}</div>
                  <div class="text-[var(--sg-text-dim)] break-all">{f().virtual_path}</div>
                </section>
                <Show when={previewUrl()}>
                  <section>
                    <div class="sg-label">PREVIEW</div>
                    <img src={previewUrl()!} class="sg-browse-preview" alt={leafName(f().virtual_path)} />
                  </section>
                </Show>
                <section>
                  <div class="sg-label">FILE</div>
                  <div>{formatBytes(f().size)}</div>
                  <Show when={f().mtime > 0}>
                    <div class="text-[var(--sg-text-dim)]">{formatDate(f().mtime)}</div>
                  </Show>
                  <Show when={f().matched_rules_by.length > 0}>
                    <div class="text-[var(--sg-text-dim)]">
                      classified by: {f().matched_rules_by.join(", ")}
                    </div>
                  </Show>
                </section>
                <button class="btn btn-xs btn-outline" onClick={() => openFolder(f().virtual_path)}>
                  Open containing folder
                </button>
              </div>
            )}
          </Show>
        </div>
      </div>
    </Show>
  );
}

function MatchFileRow(props: {
  file: ScannedFile;
  selected: boolean;
  onClick: () => void;
  onOpenFolder: () => void;
}) {
  const ext = () => leafExt(props.file.virtual_path);
  const kind = () => {
    if (DEMO_EXTS.has(ext())) return "demo";
    if (LOG_EXTS.has(ext())) return "log";
    if (isScreenshot(props.file) || IMAGE_EXTS.has(ext())) return "sshot";
    return "file";
  };
  return (
    <div
      class={`sg-match-file-row sg-match-file-${kind()} ${props.selected ? "sg-match-selected" : ""}`}
      onClick={props.onClick}
    >
      <span class="sg-match-kind">{kind()}</span>
      <span class="sg-match-leaf">{leafName(props.file.virtual_path)}</span>
      <span class="sg-match-size">{formatBytes(props.file.size)}</span>
    </div>
  );
}
