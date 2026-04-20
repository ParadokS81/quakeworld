import { For, Show } from "solid-js";
import type { ScannedFile, ScanResult } from "../types";

interface ResolutionChainProps {
  scan: ScanResult;
  file: ScannedFile;
}

export default function ResolutionChain(props: ResolutionChainProps) {
  const normalized = normalize(props.file);
  const siblings = () => props.scan.files.filter((f) => normalize(f) === normalized);

  return (
    <Show when={siblings().length > 1}>
      <div class="sg-alias-chain-entry">
        <div class="sg-label">RESOLUTION CHAIN</div>
        <div class="font-mono text-[10px]">
          <For each={sortByWinner(siblings())}>
            {(f) => (
              <div class={f.search_path_winner ? "sg-alias-chain-entry-active" : "opacity-60"}>
                {f.search_path_winner ? "[x] " : "    "}
                {f.virtual_path}
                <Show when={f.search_path_winner}>
                  <span class="ml-2 text-xs text-green-400">wins</span>
                </Show>
                <Show when={!f.search_path_winner}>
                  <span class="ml-2 text-xs opacity-70">shadowed</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}

function normalize(f: ScannedFile): string {
  if (f.container.kind === "loose") return f.virtual_path;
  const gamedir = f.container.archive_path.split("/")[0];
  return `${gamedir}/${f.container.entry}`;
}

function sortByWinner(xs: ScannedFile[]): ScannedFile[] {
  return [...xs].sort((a, b) => (a.search_path_winner === b.search_path_winner ? 0 : a.search_path_winner ? -1 : 1));
}
