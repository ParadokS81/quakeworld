import { For, createMemo } from "solid-js";
import type { ScanResult, ScannedFile, BrowseFilterState } from "../types";
import BrowseTreeNode, { type TreeNode } from "./BrowseTreeNode";

interface BrowseTreeProps {
  scan: ScanResult;
  filters: BrowseFilterState;
  hideDefaults: boolean;
  selectedPath: string | null;
  onSelect: (file: ScannedFile) => void;
}

export default function BrowseTree(props: BrowseTreeProps) {
  const tree = createMemo(() => buildTree(props.scan, props.filters, props.hideDefaults));
  return (
    <div class="p-2 font-mono text-xs">
      <For each={tree().children}>
        {(child) => (
          <BrowseTreeNode
            node={child}
            depth={0}
            selectedPath={props.selectedPath}
            onSelect={props.onSelect}
            autoExpand={child.children.length <= 100 && child.name !== "id1"}
          />
        )}
      </For>
    </div>
  );
}

function matchesFilter(file: ScannedFile, filters: BrowseFilterState, hideDefaults: boolean): boolean {
  if (hideDefaults && file.is_default) return false;

  if (filters.categories.size > 0) {
    if (!file.category_id || !filters.categories.has(file.category_id)) return false;
  }

  if (filters.gamedirs.size > 0) {
    const first = file.virtual_path.split("/")[0];
    if (!filters.gamedirs.has(first)) return false;
  }

  if (filters.clients.size > 0) {
    const hasRef = file.consumed_by.loader_sites.length > 0 || file.consumed_by.cvar_bindings.length > 0;
    if (!hasRef) return false;
  }

  if (filters.search.trim().length > 0) {
    const q = filters.search.trim().toLowerCase();
    if (!file.virtual_path.toLowerCase().includes(q)) return false;
  }

  return true;
}

function buildTree(scan: ScanResult, filters: BrowseFilterState, hideDefaults: boolean): TreeNode {
  const root: TreeNode = {
    name: "",
    fullPath: "",
    isDir: true,
    isArchive: false,
    file: null,
    children: [],
    matchCount: 0,
    hasMatchingFiles: false,
  };

  for (const f of scan.files) {
    const parts = f.virtual_path.split("/").filter((p) => p.length > 0);
    if (parts.length === 0) continue;

    let cursor = root;
    let built = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      built = built.length ? `${built}/${part}` : part;
      const isLast = i === parts.length - 1;
      const isArchiveBoundary = part.includes(":");

      if (isArchiveBoundary) {
        const [archiveName, inner] = part.split(":");
        let archiveChild = cursor.children.find((c) => c.name === archiveName);
        if (!archiveChild) {
          archiveChild = {
            name: archiveName,
            fullPath: `${built.split(":")[0]}`,
            isDir: true,
            isArchive: true,
            file: null,
            children: [],
            matchCount: 0,
            hasMatchingFiles: false,
          };
          cursor.children.push(archiveChild);
        }
        const innerParts = inner.split("/").filter((p) => p.length > 0);
        let innerCursor = archiveChild;
        let innerBuilt = `${archiveName}`;
        for (let j = 0; j < innerParts.length; j++) {
          const ipart = innerParts[j];
          innerBuilt = `${innerBuilt}:${ipart}`;
          const iLast = j === innerParts.length - 1;
          let ichild = innerCursor.children.find((c) => c.name === ipart);
          if (!ichild) {
            ichild = {
              name: ipart,
              fullPath: innerBuilt,
              isDir: !iLast,
              isArchive: false,
              file: iLast ? f : null,
              children: [],
              matchCount: 0,
              hasMatchingFiles: false,
            };
            innerCursor.children.push(ichild);
          }
          innerCursor = ichild;
        }
        break;
      }

      let child = cursor.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          fullPath: built,
          isDir: !isLast,
          isArchive: false,
          file: isLast ? f : null,
          children: [],
          matchCount: 0,
          hasMatchingFiles: false,
        };
        cursor.children.push(child);
      }
      cursor = child;
    }
  }

  function post(n: TreeNode) {
    if (!n.isDir) {
      const m = n.file ? matchesFilter(n.file, filters, hideDefaults) : false;
      n.matchCount = m ? 1 : 0;
      n.hasMatchingFiles = m;
      return;
    }
    let count = 0;
    let any = false;
    for (const c of n.children) {
      post(c);
      count += c.matchCount;
      if (c.hasMatchingFiles) any = true;
    }
    n.matchCount = count;
    n.hasMatchingFiles = any;
  }
  post(root);

  function sort(n: TreeNode) {
    n.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of n.children) if (c.isDir) sort(c);
  }
  sort(root);

  return root;
}
