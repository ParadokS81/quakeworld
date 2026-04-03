import { For, Show } from "solid-js";
import type { ConfigChain } from "../types";

interface ConfigChainPanelProps {
  configChain: ConfigChain;
  selectedFiles: Set<number>;
  onToggleFile: (index: number) => void;
}

export default function ConfigChainPanel(props: ConfigChainPanelProps) {
  const sourceLabel = (source: string) => {
    switch (source) {
      case "primary": return "primary";
      case "exec": return "exec";
      case "auto_exec": return "autoexec";
      case "cl_onload": return "cl_onload";
      case "bound_exec": return "bound";
      case "alias_exec": return "alias";
      default: return source;
    }
  };

  const sourceColor = (source: string) => {
    switch (source) {
      case "primary": return "text-[var(--color-primary)]";
      case "auto_exec": return "text-[var(--sg-text-bright)]";
      default: return "text-[var(--sg-text-dim)]";
    }
  };

  return (
    <div class="px-4 py-2 bg-[var(--sg-stat-bg)] border-b border-[var(--sg-stat-border)] text-xs text-[var(--sg-text-dim)] flex-shrink-0">
      <span class="text-[var(--sg-section-label)] text-[10px] uppercase tracking-wide">
        Config chain ({props.configChain.files.length} files)
      </span>
      <div class="mt-1 font-mono">
        <For each={props.configChain.files}>
          {(file, i) => {
            const isLast = () => i() === props.configChain.files.length - 1;
            const isSelected = () => props.selectedFiles.has(i());
            return (
              <div class="flex items-center gap-2 py-0.5">
                <span class="text-[var(--sg-section-label)] select-none w-4">
                  {isLast() ? "└─" : "├─"}
                </span>
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs"
                  checked={isSelected()}
                  onChange={() => props.onToggleFile(i())}
                />
                <span
                  class={`min-w-[200px] ${isSelected() ? "text-[var(--sg-text-bright)]" : "text-[var(--sg-text-dim)] line-through opacity-50"}`}
                >
                  {file.relative_path}
                </span>
                <span class={`text-[10px] ${sourceColor(file.source)}`}>{sourceLabel(file.source)}</span>
                <span class="text-[var(--sg-section-label)]">{file.line_count} lines</span>
                <Show when={file.referenced_by && file.source !== "cl_onload" && file.source !== "auto_exec"}>
                  <span class="text-[var(--sg-section-label)]">
                    ← {file.referenced_by!.context}
                  </span>
                </Show>
              </div>
            );
          }}
        </For>
      </div>

      {/* Unresolved exec refs */}
      <Show when={props.configChain.unresolved.length > 0}>
        <div class="mt-2">
          <For each={props.configChain.unresolved}>
            {(u) => (
              <div class="flex items-center gap-2 py-0.5 text-yellow-500">
                <span class="select-none w-4">⚠</span>
                <span>Unresolved: {u.raw_ref}</span>
                <span class="text-[var(--sg-section-label)]">(in {u.referenced_by.file})</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
