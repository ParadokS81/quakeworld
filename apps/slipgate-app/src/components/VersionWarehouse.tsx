import { createResource, createSignal, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { Plus } from "lucide-solid";
import {
  listWarehousedVersions,
  readWarehouseIndex,
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
  onSwapComplete?: (newVersion: string) => void;
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

function buildDescriptor(
  v: WarehousedVersion,
  activeVersion: string | null,
): VersionRowDescriptor {
  return {
    client: v.client,
    family: clientFamilyLabel(v.client),
    version: v.version,
    channel: v.channel,
    isActive: v.version === activeVersion,
    blob_sha256: v.blob_sha256,
    // Phase 3.5 fills these in.
    tier2: undefined,
    tier3: undefined,
  };
}

export default function VersionWarehouse(props: Props) {
  const [versions, { refetch: refetchVersions }] = createResource(() =>
    listWarehousedVersions(invoke),
  );
  const [index, { refetch: refetchIndex }] = createResource(() =>
    readWarehouseIndex(invoke),
  );
  const [busy, setBusy] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const activeVersion = (): string | null =>
    index()?.active?.[props.client] ?? null;

  const descriptors = (): VersionRowDescriptor[] => {
    const rows = (versions() ?? []).filter((v) => v.client === props.client);
    const active = activeVersion();
    return rows.map((v) => buildDescriptor(v, active));
  };

  const refresh = async () => {
    await Promise.all([refetchVersions(), refetchIndex()]);
  };

  const handleSwap = async (d: VersionRowDescriptor) => {
    if (!props.quakeDir) {
      setError("No quake dir configured");
      return;
    }
    setBusy(`swap:${d.version}`);
    setError(null);
    try {
      await swapActiveVersion(invoke, {
        client: props.client,
        targetVersion: d.version,
        quakeDir: props.quakeDir,
        targetExeName: props.targetExeName,
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
    if (!confirm(`Delete ${d.family} ${d.version} from warehouse?`)) return;
    setBusy(`del:${d.version}`);
    setError(null);
    try {
      await deleteWarehousedVersion(invoke, props.client, d.version);
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
          disabled
          title="Multi-client management coming in Phase 3.5"
        >
          <Plus class="w-4 h-4" />
          Add Quake client
        </button>
      </div>

      <Show when={error()}>
        <div class="alert alert-error text-sm">{error()}</div>
      </Show>

      <ul class="space-y-1">
        <For each={descriptors()}>
          {(d) => (
            <li class="flex items-center gap-3 p-2 rounded border border-base-300">
              <div class="flex-1 flex items-center gap-2 flex-wrap">
                <span class="text-sm text-base-content/70">{d.family}</span>
                <span class="font-mono">{d.version}</span>
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
                {busy() === `swap:${d.version}` ? "Switching..." : "Switch"}
              </button>
              <button
                class="btn btn-sm btn-ghost"
                disabled={d.isActive || busy() !== null}
                onClick={() => handleDelete(d)}
              >
                {busy() === `del:${d.version}` ? "..." : "Delete"}
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
