import { For, Show, createSignal } from "solid-js";
import type { ScannedFile } from "../types";
import { CATEGORY_COLOR } from "../lib/assets/bundle";
import WindowedList from "./WindowedList";

export interface TreeNode {
  name: string;
  fullPath: string;
  isDir: boolean;
  isArchive: boolean;
  file: ScannedFile | null;
  children: TreeNode[];
  matchCount: number;
  hasMatchingFiles: boolean;
}

interface BrowseTreeNodeProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (file: ScannedFile) => void;
  autoExpand: boolean;
}

export default function BrowseTreeNode(props: BrowseTreeNodeProps) {
  const [expanded, setExpanded] = createSignal(props.autoExpand);

  function dimClass() {
    return props.node.hasMatchingFiles ? "" : "opacity-40";
  }

  function handleClick() {
    if (props.node.isDir) {
      setExpanded(!expanded());
    } else if (props.node.file) {
      props.onSelect(props.node.file);
    }
  }

  return (
    <div>
      <div
        class={`sg-browse-row ${dimClass()} ${
          props.selectedPath === props.node.fullPath ? "sg-browse-row-selected" : ""
        }`}
        style={{ "padding-left": `${props.depth * 14}px` }}
        onClick={handleClick}
      >
        <Show
          when={!props.node.isDir}
          fallback={<span class="sg-browse-caret">{expanded() ? "v" : ">"}</span>}
        >
          <span class="sg-browse-state-dot" title={stateTitle(props.node.file!)}>
            {stateGlyph(props.node.file!)}
          </span>
          <span
            class="sg-browse-cat-band"
            style={{ background: CATEGORY_COLOR[props.node.file!.category_id ?? ""] ?? "transparent" }}
          />
        </Show>
        <span class={props.node.isDir ? "font-medium" : ""}>{props.node.name}</span>
        <Show when={props.node.isDir && props.node.children.length > 0}>
          <span class="sg-browse-count">{props.node.children.length}</span>
        </Show>
        <Show when={props.node.isArchive}>
          <span class="sg-browse-chip">pak</span>
        </Show>
        <Show when={props.node.file && props.node.file.confidence === "heuristic"}>
          <span class="sg-browse-conf-hint" title="heuristic classification">?</span>
        </Show>
        <Show when={!props.node.isDir && props.node.file}>
          <span class="sg-browse-size">{formatBytes(props.node.file!.size)}</span>
        </Show>
      </div>
      <Show when={expanded() && props.node.children.length > 0}>
        <Show
          when={props.node.children.length > 200}
          fallback={
            <For each={props.node.children}>
              {(child) => (
                <BrowseTreeNode
                  node={child}
                  depth={props.depth + 1}
                  selectedPath={props.selectedPath}
                  onSelect={props.onSelect}
                  autoExpand={shouldAutoExpand(child)}
                />
              )}
            </For>
          }
        >
          <WindowedList
            items={props.node.children}
            rowHeight={22}
            overscan={10}
            maxVisible={30}
            renderRow={(child) => (
              <BrowseTreeNode
                node={child}
                depth={props.depth + 1}
                selectedPath={props.selectedPath}
                onSelect={props.onSelect}
                autoExpand={false}
              />
            )}
          />
        </Show>
      </Show>
    </div>
  );
}

function stateGlyph(f: ScannedFile): string {
  if (f.consumed_by.loader_sites.length > 0 || f.consumed_by.cvar_bindings.length > 0) return "*";
  if (f.category_id) return "o";
  return "!";
}

function stateTitle(f: ScannedFile): string {
  if (f.consumed_by.loader_sites.length > 0 || f.consumed_by.cvar_bindings.length > 0) return "loaded";
  if (f.category_id) return "available";
  return "unreferenced";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function shouldAutoExpand(n: TreeNode): boolean {
  if (!n.isDir) return false;
  if (n.isArchive) return false;
  return n.children.length <= 100;
}
