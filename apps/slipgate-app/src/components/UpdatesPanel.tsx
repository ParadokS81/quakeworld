import { Show, For, createSignal, onCleanup } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Download } from "lucide-solid";
import type { UpdateCheckResult, UpdateProgress, UpdateResult, ReleaseNote } from "../types";
import Changelog from "./Changelog";

interface UpdatesPanelProps {
  exePath: string | null;
  currentVersion: string | null;
  onAfterUpdate?: () => void;
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

function parseVersion(pe: string | null | undefined) {
  if (!pe) return { semver: null as string | null, build: null as string | null };
  const parts = pe.split(".");
  return {
    semver: parts.slice(0, 3).join("."),
    build: parts[3] ?? null,
  };
}

export default function UpdatesPanel(props: UpdatesPanelProps) {
  const [updateCheck, setUpdateCheck] = createSignal<UpdateCheckResult | null>(null);
  const [updateProgress, setUpdateProgress] = createSignal<UpdateProgress | null>(null);
  const [updateResult, setUpdateResult] = createSignal<UpdateResult | null>(null);
  const [isChecking, setIsChecking] = createSignal(false);
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [error, setError] = createSignal("");

  const [updatesTab, setUpdatesTab] = createSignal<"ezQuake" | "KTX" | "MVDSV" | "QWFWD">("ezQuake");
  const [ktxNotes, setKtxNotes] = createSignal<ReleaseNote[]>([]);
  const [mvdsvNotes, setMvdsvNotes] = createSignal<ReleaseNote[]>([]);
  const [qwfwdNotes, setQwfwdNotes] = createSignal<ReleaseNote[]>([]);

  let unlistenProgress: (() => void) | null = null;
  (async () => {
    unlistenProgress = await listen<UpdateProgress>("update-progress", (event) => {
      setUpdateProgress(event.payload);
    });
  })();
  onCleanup(() => unlistenProgress?.());

  async function checkForUpdate() {
    const path = props.exePath;
    if (!path) return;
    setIsChecking(true);
    setUpdateCheck(null);
    setUpdateResult(null);
    setError("");
    try {
      const [ezResult, ktxResult, mvdsvResult, qwfwdResult] = await Promise.all([
        invoke<UpdateCheckResult>("check_for_update", {
          exePath: path,
          clientName: "ezQuake",
          channel: "stable",
        }),
        invoke<ReleaseNote[]>("get_release_changelog", {
          clientName: "KTX",
          fromVersion: null,
        }).catch((e) => { console.error("KTX fetch error:", e); return [] as ReleaseNote[]; }),
        invoke<ReleaseNote[]>("get_release_changelog", {
          clientName: "MVDSV",
          fromVersion: null,
        }).catch((e) => { console.error("MVDSV fetch error:", e); return [] as ReleaseNote[]; }),
        invoke<ReleaseNote[]>("get_release_changelog", {
          clientName: "QWFWD",
          fromVersion: null,
        }).catch((e) => { console.error("QWFWD fetch error:", e); return [] as ReleaseNote[]; }),
      ]);
      setUpdateCheck(ezResult);
      setKtxNotes(ktxResult);
      setMvdsvNotes(mvdsvResult);
      setQwfwdNotes(qwfwdResult);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsChecking(false);
    }
  }

  async function performUpdate(target: "stable" | "snapshot") {
    const check = updateCheck();
    const path = props.exePath;
    if (!check || !path) return;

    try {
      const running = await invoke<boolean>("check_client_running", { exeName: null });
      if (running) {
        setError("ezQuake is currently running. Close it before updating.");
        return;
      }
    } catch { /* proceed if check fails */ }

    const downloadUrl = target === "snapshot" && check.snapshot
      ? check.snapshot.download_url
      : check.download_url;
    const checksumsUrl = target === "snapshot" && check.snapshot
      ? check.snapshot.checksum_url
      : check.checksums_url;

    setIsUpdating(true);
    setUpdateProgress(null);
    setUpdateResult(null);
    setError("");
    try {
      const result = await invoke<UpdateResult>("download_and_install_update", {
        exePath: path,
        clientName: "ezQuake",
        channel: target,
        downloadUrl,
        checksumsUrl,
      });
      setUpdateResult(result);
      if (result.success) {
        props.onAfterUpdate?.();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div class="sg-profile-cards">
      <Show when={!props.exePath}>
        <div class="sg-card">
          <div class="sg-card-header">
            <Download size={16} />
            <span>Updates</span>
          </div>
          <div class="sg-row">
            <span class="sg-row-value sg-dim">
              Set up ezQuake in MyQuake -&gt; Domains -&gt; Clients to enable updates.
            </span>
          </div>
        </div>
      </Show>

      <Show when={props.exePath}>
        <div class="sg-card">
          <div class="sg-card-header">
            <Download size={16} />
            <span>Updates</span>
            <button
              class="sg-launch-btn"
              style={{ "margin-left": "auto", "font-size": "11px", padding: "2px 10px" }}
              onClick={checkForUpdate}
              disabled={isChecking() || isUpdating()}
            >
              {isChecking() ? "Checking..." : "Check Now"}
            </button>
          </div>

          <div class="sg-updates-tabs">
            <For each={["ezQuake", "KTX", "MVDSV", "QWFWD"] as const}>
              {(tab) => (
                <button
                  class="sg-updates-tab"
                  classList={{ "sg-updates-tab-active": updatesTab() === tab }}
                  onClick={() => setUpdatesTab(tab)}
                >
                  {tab}
                </button>
              )}
            </For>
          </div>

          <Show when={updatesTab() === "ezQuake"}>
            <Row
              label="Current"
              value={(() => {
                const v = parseVersion(props.currentVersion);
                if (!v.semver) return "Unknown";
                return v.build ? `${v.semver} (build ${v.build})` : v.semver;
              })()}
            />

            <Show when={updateCheck()}>
              <Show when={updateCheck()!.release_notes.length > 0 || updateCheck()!.snapshot}>
                <Changelog notes={updateCheck()!.release_notes} snapshot={updateCheck()!.snapshot} currentVersion={updateCheck()!.current_version} />
              </Show>

              <Show when={!updateCheck()!.update_available && !updateCheck()!.snapshot?.newer_than_stable}>
                <div style={{ padding: "8px 0", "font-size": "12px", color: "var(--sg-section-label)", "text-align": "center" }}>
                  You're on the latest stable version
                </div>
              </Show>
            </Show>

            <Show when={isUpdating() && updateProgress()}>
              <div style={{ margin: "8px 0" }}>
                <Show when={updateProgress()!.percent !== null}>
                  <div style={{
                    height: "4px",
                    "border-radius": "2px",
                    background: "var(--sg-stat-border)",
                    overflow: "hidden",
                    "margin-bottom": "4px",
                  }}>
                    <div style={{
                      height: "100%",
                      background: "oklch(var(--p))",
                      "border-radius": "2px",
                      transition: "width 0.3s ease",
                      width: `${updateProgress()!.percent}%`,
                    }} />
                  </div>
                </Show>
                <div style={{ "font-size": "11px", color: "var(--sg-section-label)" }}>
                  {updateProgress()!.message}
                </div>
              </div>
            </Show>

            <Show when={updateResult()}>
              <div style={{
                margin: "8px 0",
                "font-size": "12px",
                color: updateResult()!.success ? "oklch(var(--su))" : "#f87171",
              }}>
                <Show when={updateResult()!.success}>
                  Updated to {updateResult()!.new_version}
                  <Show when={updateResult()!.backup_path}>
                    {" "}-- previous saved as{" "}
                    <span style={{ opacity: 0.7 }}>
                      {updateResult()!.backup_path!.split(/[/\\]/).pop()}
                    </span>
                  </Show>
                </Show>
                <Show when={!updateResult()!.success}>
                  Update failed: {updateResult()!.error}
                </Show>
              </div>
            </Show>

            <Show when={!isUpdating() && !updateResult()?.success && updateCheck()}>
              <div style={{ display: "flex", "justify-content": "center", gap: "10px", padding: "4px 0" }}>
                <Show when={updateCheck()!.update_available}>
                  <button
                    class="sg-launch-btn sg-launch-btn-primary"
                    onClick={() => performUpdate("stable")}
                  >
                    Update to {updateCheck()!.latest_version}
                  </button>
                </Show>
                <Show when={updateCheck()!.snapshot?.available}>
                  <button
                    class="sg-launch-btn sg-launch-btn-snapshot"
                    onClick={() => performUpdate("snapshot")}
                  >
                    Snapshot {updateCheck()!.snapshot!.commit}
                  </button>
                </Show>
              </div>
            </Show>
          </Show>

          <Show when={updatesTab() === "KTX"}>
            <Show when={ktxNotes().length > 0} fallback={
              <div style={{ padding: "12px 0", "font-size": "12px", color: "var(--sg-section-label)", "text-align": "center" }}>
                Click "Check Now" to load KTX changelogs
              </div>
            }>
              <Changelog notes={ktxNotes()} />
            </Show>
          </Show>

          <Show when={updatesTab() === "MVDSV"}>
            <Show when={mvdsvNotes().length > 0} fallback={
              <div style={{ padding: "12px 0", "font-size": "12px", color: "var(--sg-section-label)", "text-align": "center" }}>
                Click "Check Now" to load MVDSV changelogs
              </div>
            }>
              <Changelog notes={mvdsvNotes()} />
            </Show>
          </Show>

          <Show when={updatesTab() === "QWFWD"}>
            <Show when={qwfwdNotes().length > 0} fallback={
              <div style={{ padding: "12px 0", "font-size": "12px", color: "var(--sg-section-label)", "text-align": "center" }}>
                Click "Check Now" to load QWFWD changelogs
              </div>
            }>
              <Changelog notes={qwfwdNotes()} />
            </Show>
          </Show>
        </div>

        <Show when={error()}>
          <div style={{ color: "#f87171", "font-size": "12px" }}>
            {error()}
          </div>
        </Show>
      </Show>
    </div>
  );
}
