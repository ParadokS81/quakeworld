import { createResource, createSignal, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { Plus } from "lucide-solid";
import {
  listWarehousedVersions,
  readWarehouseIndex,
  importExistingInstall,
  type WarehousedVersion,
} from "../lib/quake-dir/warehouse";
import {
  swapActiveVersion,
  deleteWarehousedVersion,
} from "../lib/quake-dir/swap";

interface Props {
  client: string;
  quakeDir: string | null;
  targetExeName: string;
  /**
   * The exe slipgate is currently pointed at. When this exe's bytes
   * are not in the warehouse, the panel shows a "Foreign exe — Import"
   * affordance so the user can ingest it without leaving Phase 3 UI.
   */
  currentExePath?: string | null;
  /**
   * Bumped by parent to force a re-fetch of warehouse state when an
   * external event mutates it (e.g. user-initiated path change running
   * reconcile_active_version).
   */
  refreshKey?: number;
  onSwapComplete?: (newVersion: string) => void;
  onImportComplete?: (newVersion: string) => void;
  /** Phase 3.5b: open the AddClientPanel inside ClientsDomain. */
  onAddClient?: () => void;
}

/**
 * Tier 1/2/3 identity descriptor (see reference_three_tier_identity_model).
 * Phase 3 only populates `family`; `tier2` + `tier3` slots are filled by
 * Phase 3.5 (release-cache + fingerprinter) without changing this row's JSX.
 */
interface VersionRowDescriptor {
  client: string;
  family: string;
  version: string;
  variant: string | null;
  channel: string;
  isActive: boolean;
  blob_sha256: string;
  tier2?: { matched: true; releaseDate: string };
  tier3?: {
    reason: string;
    suggestedUpgrade: { version: string; downloadUrl: string };
  };
}

/**
 * Map a warehouse client key to its Tier-1 family label. Phase 3.5 extends
 * the lookup with `unezquake`, `fte`, etc. as those clients become importable.
 */
function clientFamilyLabel(client: string): string {
  switch (client) {
    case "ezQuake":
    case "ezquake":
      return "ezQuake";
    default:
      return client;
  }
}

function activeKey(client: string, variant: string | null | undefined): string {
  return variant ? `${client}:${variant}` : client;
}

function buildDescriptor(
  v: WarehousedVersion,
  activeMap: Record<string, string>,
): VersionRowDescriptor {
  const variant = v.variant ?? null;
  const key = activeKey(v.client, variant);
  return {
    client: v.client,
    family: clientFamilyLabel(v.client),
    version: v.version,
    variant,
    channel: v.channel,
    isActive: activeMap[key] === v.version,
    blob_sha256: v.blob_sha256,
    // Phase 3.5 fills these in.
    tier2: undefined,
    tier3: undefined,
  };
}

export default function VersionWarehouse(props: Props) {
  const [versions, { refetch: refetchVersions }] = createResource(
    () => props.refreshKey ?? 0,
    () => listWarehousedVersions(invoke),
  );
  const [index, { refetch: refetchIndex }] = createResource(
    () => props.refreshKey ?? 0,
    () => readWarehouseIndex(invoke),
  );
  const [busy, setBusy] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const activeVersion = (): string | null =>
    index()?.active?.[props.client] ?? null;

  const descriptors = (): VersionRowDescriptor[] => {
    const rows = (versions() ?? []).filter((v) => v.client === props.client);
    const activeMap = index()?.active ?? {};
    return rows.map((v) => buildDescriptor(v, activeMap));
  };

  const refresh = async () => {
    await Promise.all([refetchVersions(), refetchIndex()]);
  };

  // Foreign exe = current exe path is set, but reconcile didn't match it
  // to any warehoused version (active pointer cleared). Reconcile runs on
  // first-run bootstrap and on user-initiated path change, so by the time
  // the panel renders the index reflects reality.
  const isCurrentForeign = (): boolean => {
    if (!props.currentExePath) return false;
    if (versions.loading || index.loading) return false;
    return activeVersion() === null;
  };

  const handleImportCurrent = async () => {
    if (!props.currentExePath) return;
    setBusy("import:current");
    setError(null);
    try {
      const entry = await importExistingInstall(invoke, props.client, props.currentExePath);
      props.onImportComplete?.(entry.version);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  };

  function rowKey(d: VersionRowDescriptor): string {
    return d.variant ? `${d.version}:${d.variant}` : d.version;
  }

  function targetExeFor(d: VersionRowDescriptor): string {
    if (!d.variant) return props.targetExeName;
    const stem = props.targetExeName.endsWith(".exe")
      ? props.targetExeName.slice(0, -4)
      : props.targetExeName;
    return `${stem}-${d.variant}.exe`;
  }

  const handleSwap = async (d: VersionRowDescriptor) => {
    if (!props.quakeDir) {
      setError("No quake dir configured");
      return;
    }
    setBusy(`swap:${rowKey(d)}`);
    setError(null);
    try {
      await swapActiveVersion(invoke, {
        client: props.client,
        targetVersion: d.version,
        quakeDir: props.quakeDir,
        targetExeName: targetExeFor(d),
        targetVariant: d.variant,
      });
      props.onSwapComplete?.(d.version);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (d: VersionRowDescriptor) => {
    const label = d.variant ? `${d.family} ${d.version} (${d.variant})` : `${d.family} ${d.version}`;
    if (!confirm(`Delete ${label} from warehouse?`)) return;
    setBusy(`del:${rowKey(d)}`);
    setError(null);
    try {
      await deleteWarehousedVersion(invoke, props.client, d.version, d.variant);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Installed versions</h3>
        <button
          class="btn btn-sm btn-ghost"
          disabled={!props.onAddClient}
          onClick={() => props.onAddClient?.()}
          title="Bulk-import Quake clients from a folder or specific exe"
        >
          <Plus class="w-4 h-4" />
          Add Quake client
        </button>
      </div>

      <Show when={error()}>
        <div class="alert alert-error text-sm">{error()}</div>
      </Show>

      <Show when={isCurrentForeign()}>
        <div class="flex items-center gap-3 p-2 rounded border border-warning/40 bg-warning/5">
          <div class="flex-1 text-sm">
            <div class="font-medium">Foreign exe at current path</div>
            <div class="text-xs text-base-content/60 break-all">
              {props.currentExePath}
            </div>
          </div>
          <button
            class="btn btn-sm btn-warning"
            disabled={busy() !== null}
            onClick={handleImportCurrent}
          >
            {busy() === "import:current" ? "Importing..." : "Import"}
          </button>
        </div>
      </Show>

      <ul class="space-y-1">
        <For each={descriptors()}>
          {(d) => (
            <li class="flex items-center gap-3 p-2 rounded border border-base-300">
              <div class="flex-1 flex items-center gap-2 flex-wrap">
                <span class="text-sm text-base-content/70">{d.family}</span>
                <span class="font-mono">{d.version}</span>
                <Show when={d.variant}>
                  {(v) => <span class="badge badge-sm badge-ghost">{v()}</span>}
                </Show>
                <span class="badge badge-sm">{d.channel}</span>
                <Show when={d.isActive}>
                  <span class="badge badge-sm badge-success">active</span>
                </Show>
                <Show when={d.tier2}>
                  {(t2) => (
                    <span
                      class="badge badge-sm badge-info"
                      title={`Verified official release (${t2().releaseDate})`}
                    >
                      verified
                    </span>
                  )}
                </Show>
                <Show when={d.tier3}>
                  {(t3) => (
                    <span
                      class="badge badge-sm badge-warning"
                      title={t3().reason}
                    >
                      unrecognized
                    </span>
                  )}
                </Show>
              </div>
              <button
                class="btn btn-sm btn-primary"
                disabled={
                  d.isActive || busy() !== null || !props.quakeDir
                }
                onClick={() => handleSwap(d)}
              >
                {busy() === `swap:${rowKey(d)}` ? "Switching..." : "Switch"}
              </button>
              <button
                class="btn btn-sm btn-ghost"
                disabled={d.isActive || busy() !== null}
                onClick={() => handleDelete(d)}
              >
                {busy() === `del:${rowKey(d)}` ? "..." : "Delete"}
              </button>
            </li>
          )}
        </For>
        <Show when={descriptors().length === 0}>
          <li class="text-sm text-base-content/60 p-2">
            No versions warehoused yet. Use the updater above to download one.
          </li>
        </Show>
      </ul>
    </div>
  );
}
