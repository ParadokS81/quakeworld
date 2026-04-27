import { Show, For, createSignal, createEffect } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { ArrowLeft, HardDrive } from "lucide-solid";
import type { EzQuakeInstallation, EzQuakeConfig } from "../types";
import type { ProfileData } from "../store";
import { getPrimarySetup } from "../store";
import VersionWarehouse from "./VersionWarehouse";
import AddClientPanel from "./AddClientPanel";
import { userInitiatedReconcile } from "../lib/quake-dir/swap";

const WAREHOUSE_CLIENT = "ezquake";

function quakeDirFromExePath(p: string | null | undefined): string | null {
  if (!p) return null;
  const idx = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
  return idx > 0 ? p.slice(0, idx) : null;
}

interface ClientsDomainProps {
  onConfigLoaded?: (config: EzQuakeConfig, exePath: string, configName: string, version: string | null) => void;
  profile?: ProfileData | null;
}

function Row(props: { label: string; value?: string | null; dim?: boolean; children?: any }) {
  return (
    <div class="sg-row">
      <span class="sg-row-label">{props.label}</span>
      <span class="sg-row-value" classList={{ "sg-dim": props.dim || (!props.value && !props.children) }}>
        {props.children ?? props.value ?? "--"}
      </span>
    </div>
  );
}

export default function ClientsDomain(props: ClientsDomainProps) {
  const [view, setView] = createSignal<"list" | "detail">("list");
  const [exePath, setExePath] = createSignal("");
  const [installation, setInstallation] = createSignal<EzQuakeInstallation | null>(null);
  const [config, setConfig] = createSignal<EzQuakeConfig | null>(null);
  const [selectedConfig, setSelectedConfig] = createSignal("config.cfg");
  const [error, setError] = createSignal("");
  const [addingClient, setAddingClient] = createSignal(false);

  // Bump to force VersionWarehouse to re-fetch when external events
  // (path change reconcile, post-swap reload) mutate warehouse state.
  const [warehouseRefreshKey, setWarehouseRefreshKey] = createSignal(0);

  // Restore saved path from profile store
  createEffect(() => {
    const prof = props.profile;
    if (!prof) return;
    const setup = getPrimarySetup(prof);
    const savedPath = setup.client.exe_path;
    if (savedPath && !exePath()) {
      setExePath(savedPath);
      if (setup.client.config_name) {
        setSelectedConfig(setup.client.config_name);
      }
      validateAndLoad(savedPath);
    }
  });

  async function validateAndLoad(path: string) {
    setError("");
    try {
      const info = await invoke<EzQuakeInstallation>("validate_ezquake_path", { exePath: path });
      setInstallation(info);
      if (info.valid) {
        setExePath(path);
        const cfgName = info.config_files.includes("config.cfg") ? "config.cfg" : info.config_files[0];
        if (cfgName) {
          setSelectedConfig(cfgName);
          await loadConfig(path, cfgName, info.version);
        }
      } else {
        setError("Not a valid ezQuake executable");
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function loadConfig(path: string, cfgName: string, version?: string | null) {
    try {
      const cfg = await invoke<EzQuakeConfig>("read_ezquake_config", {
        exePath: path,
        configName: cfgName,
      });
      setConfig(cfg);
      setError("");
      props.onConfigLoaded?.(cfg, path, cfgName, version ?? null);
    } catch (e) {
      console.error("Failed to load config:", e);
      setError(`Config parse failed: ${e}`);
    }
  }

  async function browseForExe() {
    try {
      const selected = await open({
        title: "Locate ezQuake executable",
        filters: [{ name: "ezQuake", extensions: ["exe"] }],
        multiple: false,
        directory: false,
      });
      if (selected) {
        await validateAndLoad(selected as string);
        // User-initiated path change: reconcile warehouse active pointer
        // against the (possibly-different) bytes now at the canonical path.
        try {
          await userInitiatedReconcile(invoke, WAREHOUSE_CLIENT, selected as string);
          setWarehouseRefreshKey((k) => k + 1);
        } catch (e) {
          console.error("Reconcile after path change failed:", e);
        }
      }
    } catch (e) {
      console.error("File dialog error:", e);
    }
  }

  async function handleConfigChange(cfgName: string) {
    setSelectedConfig(cfgName);
    const path = exePath();
    if (path) {
      await loadConfig(path, cfgName, installation()?.version);
    }
  }

  async function handleClientClick() {
    if (installation()?.valid) {
      setView("detail");
    } else {
      await browseForExe();
      if (installation()?.valid) {
        setView("detail");
      }
    }
  }

  return (
    <div class="sg-profile-cards">
      <Show when={view() === "list"}>
        <div class="sg-card sg-row-clickable" onClick={handleClientClick}>
          <div class="sg-card-header">
            <img src="/logos/ezquake.png" alt="ezQuake" class="sg-client-logo" />
            <span>ezQuake</span>
          </div>
          <div class="sg-row">
            <span class="sg-row-value" classList={{ "sg-dim": !installation()?.valid }}>
              {installation()?.valid ? exePath() : "Click to set up..."}
            </span>
          </div>
        </div>
      </Show>

      <Show when={view() === "detail"}>
        <div
          class="sg-row-clickable"
          style={{
            color: "var(--sg-section-label)",
            "font-size": "12px",
            display: "flex",
            "align-items": "center",
            gap: "4px",
            padding: "0 0 4px",
          }}
          onClick={() => setView("list")}
        >
          <ArrowLeft size={14} />
          Clients
        </div>

        {/* Installation */}
        <div class="sg-card">
          <div class="sg-card-header">
            <HardDrive size={16} />
            <span>Installation</span>
          </div>
          <div class="sg-row sg-row-clickable" onClick={browseForExe}>
            <span class="sg-row-label">Path</span>
            <span
              class="sg-row-value"
              style={{ overflow: "hidden", "text-overflow": "ellipsis" }}
              title={exePath()}
            >
              {exePath()}
            </span>
          </div>
          <div class="sg-row">
            <span class="sg-row-label">Config</span>
            <span class="sg-row-value">
              <select
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  color: "inherit",
                  "font-size": "inherit",
                  "font-weight": "inherit",
                  "font-family": "inherit",
                }}
                value={selectedConfig()}
                onChange={(e) => handleConfigChange(e.currentTarget.value)}
              >
                <For each={installation()?.config_files ?? []}>
                  {(file) => <option value={file} style={{ background: "#1a1a2e" }}>{file}</option>}
                </For>
              </select>
            </span>
          </div>
          <Row label="Player Name" value={config()?.player_name} />
        </div>

        {/* Versions */}
        <Show when={installation()?.valid}>
          <div class="sg-card">
            <div class="sg-card-header">
              <HardDrive size={16} />
              <span>{addingClient() ? "Add Quake client" : "Versions"}</span>
            </div>
            <Show
              when={addingClient()}
              fallback={
                <VersionWarehouse
                  client={WAREHOUSE_CLIENT}
                  quakeDir={quakeDirFromExePath(exePath())}
                  targetExeName="ezquake.exe"
                  currentExePath={exePath() || null}
                  refreshKey={warehouseRefreshKey()}
                  onAddClient={() => setAddingClient(true)}
                  onSwapComplete={() => {
                    const p = exePath();
                    if (p) validateAndLoad(p);
                    setWarehouseRefreshKey((k) => k + 1);
                  }}
                  onImportComplete={() => {
                    const p = exePath();
                    if (p) validateAndLoad(p);
                    setWarehouseRefreshKey((k) => k + 1);
                  }}
                />
              }
            >
              <AddClientPanel
                profile={props.profile ?? null}
                onImportComplete={() => {
                  const p = exePath();
                  if (p) validateAndLoad(p);
                  setWarehouseRefreshKey((k) => k + 1);
                  setAddingClient(false);
                }}
                onClose={() => setAddingClient(false)}
              />
            </Show>
          </div>
        </Show>

        {/*
          Sections dropped from this surface in Phase 3.5a (2026-04-27).
          Code preserved at apps/slipgate-app/src/components/_dropped-clients-sections.tsx
          for future arcs:
            - Updates: extracted into UpdatesPanel.tsx, hosted by FeedTab
            - Input + Video: redundant with Profile's mouse / specs surfaces
            - Launch: VISION says slipgate is not a game launcher; HANDOVER "Tray menu launch"
            - Screenshot POC: HANDOVER "Screenshot POC -> Profile picture generator"
        */}

        <Show when={error()}>
          <div style={{ color: "#f87171", "font-size": "12px" }}>
            {error()}
          </div>
        </Show>
      </Show>
    </div>
  );
}
