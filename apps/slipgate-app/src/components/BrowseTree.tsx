import { For, createMemo } from "solid-js";
import type { ScanResult, ScannedFile, BrowseFilterState } from "../types";
import BrowseTreeNode, { type TreeNode } from "./BrowseTreeNode";

interface BrowseTreeProps {
  scan: ScanResult;
  filters: BrowseFilterState;
  hideDefaults: boolean;
  hideDimmed: boolean;
  selectedPath: string | null;
  onSelect: (file: ScannedFile) => void;
}

function isFiltersActive(filters: BrowseFilterState): boolean {
  return (
    filters.clients.size > 0 ||
    filters.gamedirs.size > 0 ||
    filters.categories.size > 0 ||
    filters.search.trim().length > 0
  );
}

export default function BrowseTree(props: BrowseTreeProps) {
  const tree = createMemo(() => buildTree(props.scan, props.filters, props.hideDefaults));
  const filtersActive = createMemo(() => isFiltersActive(props.filters));
  const effectiveHideDimmed = createMemo(() => filtersActive() && props.hideDimmed);

  return (
    <div class="p-2 font-mono text-xs">
      <For each={tree().children}>
        {(child) => {
          // Hide top-level branches with no matches when filter-focus mode is on.
          if (effectiveHideDimmed() && !child.hasMatchingFiles) return null;
          return (
            <BrowseTreeNode
              node={child}
              depth={0}
              selectedPath={props.selectedPath}
              onSelect={props.onSelect}
              autoExpand={filtersActive() && child.hasMatchingFiles && child.isDir}
              filtersActive={filtersActive()}
              hideDimmed={effectiveHideDimmed()}
            />
          );
        }}
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
    if (f.container.kind === "archive") {
      placeArchiveEntry(root, f);
    } else {
      placeLooseFile(root, f);
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

function placeLooseFile(root: TreeNode, f: ScannedFile) {
  const parts = f.virtual_path.split("/").filter((p) => p.length > 0);
  if (parts.length === 0) return;
  let cursor = root;
  let built = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    built = built ? `${built}/${part}` : part;
    const isLast = i === parts.length - 1;
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

function placeArchiveEntry(root: TreeNode, f: ScannedFile) {
  if (f.container.kind !== "archive") return;
  // Step 1: descend to the archive file node (rendered as an expandable container).
  const archiveParts = f.container.archive_path.split("/").filter((p) => p.length > 0);
  if (archiveParts.length === 0) return;
  let cursor = root;
  let built = "";
  for (let i = 0; i < archiveParts.length; i++) {
    const part = archiveParts[i];
    built = built ? `${built}/${part}` : part;
    const isArchiveFile = i === archiveParts.length - 1;
    let child = cursor.children.find((c) => c.name === part);
    if (!child) {
      child = {
        name: part,
        fullPath: built,
        isDir: true,
        isArchive: isArchiveFile,
        file: null,
        children: [],
        matchCount: 0,
        hasMatchingFiles: false,
      };
      cursor.children.push(child);
    } else if (isArchiveFile && !child.isArchive) {
      child.isArchive = true;
      child.isDir = true;
    }
    cursor = child;
  }
  // Step 2: nest the entry path inside the archive node.
  const entryParts = f.container.entry.split("/").filter((p) => p.length > 0);
  if (entryParts.length === 0) return;
  let entryBuilt = f.container.archive_path;
  for (let j = 0; j < entryParts.length; j++) {
    const ep = entryParts[j];
    const isLastEntry = j === entryParts.length - 1;
    // fullPath of leaf must equal f.virtual_path ("archive:first/second/third").
    entryBuilt = j === 0 ? `${entryBuilt}:${ep}` : `${entryBuilt}/${ep}`;
    let child = cursor.children.find((c) => c.name === ep);
    if (!child) {
      child = {
        name: ep,
        fullPath: entryBuilt,
        isDir: !isLastEntry,
        isArchive: false,
        file: isLastEntry ? f : null,
        children: [],
        matchCount: 0,
        hasMatchingFiles: false,
      };
      cursor.children.push(child);
    }
    cursor = child;
  }
}
