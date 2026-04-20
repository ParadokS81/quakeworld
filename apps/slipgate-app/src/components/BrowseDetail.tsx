import { Show, For, createResource } from "solid-js";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type { ScannedFile, ScanResult } from "../types";
import { categoryDisplayName, assetBundle, CATEGORY_COLOR } from "../lib/assets/bundle";
import ResolutionChain from "./ResolutionChain";

interface BrowseDetailProps {
  scan: ScanResult;
  file: ScannedFile | null;
  exePath: string;
  onOpenInConfigs: (virtualPath: string) => void;
}

const PREVIEW_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);

export default function BrowseDetail(props: BrowseDetailProps) {
  const ext = () => {
    const vp = props.file?.virtual_path ?? "";
    const dot = vp.lastIndexOf(".");
    return dot >= 0 ? vp.slice(dot).toLowerCase() : "";
  };
  const canPreview = () => PREVIEW_EXTS.has(ext());
  const isConfig = () => ext() === ".cfg";

  const [previewUrl] = createResource(
    () => (props.file && canPreview() ? props.file : null),
    async (f: ScannedFile) => {
      if (f.container.kind === "loose") {
        const abs = `${props.scan.root.replace(/\\/g, "/")}/${f.virtual_path}`;
        return convertFileSrc(abs);
      }
      try {
        const bytes = await invoke<number[]>("read_file_bytes", {
          exePath: props.exePath,
          virtualPath: f.virtual_path,
          maxBytes: 2 * 1024 * 1024,
        });
        const blob = new Blob([new Uint8Array(bytes)], { type: guessMime(ext()) });
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    },
  );

  async function openFolder() {
    if (!props.file) return;
    try {
      await invoke("open_containing_folder", {
        exePath: props.exePath,
        virtualPath: props.file.virtual_path,
      });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Show when={props.file} fallback={<p class="text-xs text-[var(--sg-text-dim)] p-2">select a file</p>}>
      {(f) => (
        <div class="text-xs flex flex-col gap-3">
          <section>
            <div class="sg-label">SELECTED</div>
            <div class="font-semibold text-sm">{leafName(f().virtual_path)}</div>
            <div class="text-[var(--sg-text-dim)]">{f().virtual_path}</div>
          </section>

          <section>
            <div class="sg-label">CATEGORY</div>
            <div>
              <span
                class="sg-lens-swatch mr-1"
                style={{ background: CATEGORY_COLOR[f().category_id ?? ""] ?? "oklch(0.5 0 0)" }}
              />
              {categoryDisplayName(f().category_id)}
            </div>
            <div class="text-[var(--sg-text-dim)]">confidence: {f().confidence}</div>
          </section>

          <Show when={canPreview()}>
            <section>
              <div class="sg-label">PREVIEW</div>
              <Show when={previewUrl()} fallback={<div class="sg-browse-preview-empty">(loading)</div>}>
                <img src={previewUrl()!} class="sg-browse-preview" alt={leafName(f().virtual_path)} />
              </Show>
            </section>
          </Show>
          <Show when={!canPreview()}>
            <section>
              <div class="sg-label">PREVIEW</div>
              <div class="sg-browse-preview-empty">preview: {ext() || "no-ext"} - decoder Phase 2</div>
            </section>
          </Show>

          <ResolutionChain scan={props.scan} file={f()} />

          <section>
            <div class="sg-label">FILE</div>
            <div>{f().size.toLocaleString()} bytes</div>
            <Show when={f().mtime > 0}>
              <div class="text-[var(--sg-text-dim)]">modified {new Date(f().mtime * 1000).toLocaleDateString()}</div>
            </Show>
          </section>

          <details>
            <summary class="sg-label cursor-pointer">UNDER THE HOOD</summary>
            <div class="mt-1 text-[var(--sg-text-dim)]">
              <Show when={f().consumed_by.loader_sites.length > 0}>
                <div class="font-mono">loader sites:</div>
                <For each={f().consumed_by.loader_sites}>
                  {(id) => <div class="font-mono pl-2">{id}</div>}
                </For>
              </Show>
              <Show when={f().consumed_by.cvar_bindings.length > 0}>
                <div class="font-mono mt-2">cvar bindings:</div>
                <For each={f().consumed_by.cvar_bindings}>
                  {(idx) => {
                    const b = assetBundle.cvar_bindings[idx];
                    return <div class="font-mono pl-2">{b?.cvar_canonical_id ?? `(binding ${idx})`}</div>;
                  }}
                </For>
              </Show>
              <Show when={f().consumed_by.loader_sites.length === 0 && f().consumed_by.cvar_bindings.length === 0}>
                <div>no direct references</div>
              </Show>
            </div>
          </details>

          <div class="flex flex-col gap-1">
            <Show when={isConfig()}>
              <button class="btn btn-xs btn-primary" onClick={() => props.onOpenInConfigs(f().virtual_path)}>
                Open in Configs
              </button>
            </Show>
            <button class="btn btn-xs btn-outline" onClick={openFolder}>
              Open containing folder
            </button>
          </div>
        </div>
      )}
    </Show>
  );
}

function leafName(vp: string): string {
  const afterColon = vp.includes(":") ? vp.split(":")[1] : vp;
  const parts = afterColon.split("/");
  return parts[parts.length - 1];
}

function guessMime(ext: string): string {
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".gif": return "image/gif";
    case ".webp": return "image/webp";
    default: return "application/octet-stream";
  }
}
