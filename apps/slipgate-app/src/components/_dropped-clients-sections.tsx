/*
  ============================================================================
  DROPPED CLIENTS-TAB SECTIONS (Phase 3.5a, 2026-04-27)
  ============================================================================

  This file is a frozen reference of the four sections dropped from the
  user-facing surface during the IA restructure. It is NOT imported anywhere.
  All content below is wrapped in this top-level multi-line comment so the
  TypeScript compiler treats it as an empty file.

  Future arcs that may resurface these sections:

    - Input + Video: HANDOVER "Phase 3.5a: Absorb Clients tab into MyQuake
      Domains Clients" (rationale: redundant with Profile's mouse / specs).
      No active resurface plan; the data already lives in Profile and the
      ConfigViewer.

    - Launch: HANDOVER "Tray menu launch". The natural future home is the
      system tray menu (right-click -> Launch / Join / Spec). Matches the
      tray-app philosophy and doesn't burn screen real estate. The
      `launch_ezquake` Tauri command stays callable from Rust.

    - Screenshot POC: HANDOVER "Screenshot POC -> Profile picture generator".
      Future arc graduates the POC into Profile as a "Generate profile
      pictures" feature: 1 button generates 5 standardized screenshots from
      a slipgate-shipped demo. The `capture_screenshot` Tauri command stays
      callable from Rust.

  Provenance: extracted from the previous ClientsTab.tsx component
  (deleted in the same Phase 3.5a commit). For full git history use
  `git log --follow apps/slipgate-app/src/components/ClientsDomain.tsx` and
  the parent commit of the rename.

  ----------------------------------------------------------------------------
  IMPORTS THE ORIGINAL FILE NEEDED FOR THESE SECTIONS
  ----------------------------------------------------------------------------

  import { Show, createSignal } from "solid-js";
  import { invoke } from "@tauri-apps/api/core";
  import { Crosshair, Monitor, Rocket, Camera } from "lucide-solid";
  import type { EzQuakeConfig, MonitorInfo } from "../types";

  ----------------------------------------------------------------------------
  SUPPORTING STATE + HANDLERS
  ----------------------------------------------------------------------------

  // ── Launch ─────────────────────────────────────────────────────────
  const [connectAddress, setConnectAddress] = createSignal("");

  async function launchGame(action?: string) {
    try {
      const server = connectAddress().trim() || undefined;
      await invoke("launch_ezquake", {
        options: {
          exe_path: exePath(),
          action: action && server ? action : null,
          server: server || null,
          extra_args: null,
        },
      });
    } catch (e) {
      setError(String(e));
    }
  }

  // ── Input / Video derived values ──────────────────────────────────
  const effectiveSens = () => {
    const cfg = config();
    if (!cfg) return null;
    return cfg.sensitivity * cfg.m_yaw;
  };

  const effectiveRes = () => {
    const cfg = config();
    if (cfg && cfg.vid_width > 0 && cfg.vid_height > 0) {
      return { w: cfg.vid_width, h: cfg.vid_height };
    }
    const res = props.monitor?.resolution;   // monitor: MonitorInfo | null on the original ClientsTabProps
    if (res) {
      const [w, h] = res.split("x").map(Number);
      if (w > 0 && h > 0) return { w, h };
    }
    return null;
  };

  const effectiveResLabel = () => {
    const r = effectiveRes();
    if (!r) return "Desktop";
    const cfg = config();
    const isFromConfig = cfg && cfg.vid_width > 0;
    return isFromConfig ? `${r.w}x${r.h}` : `${r.w}x${r.h} (Desktop)`;
  };

  // ── Screenshot POC ────────────────────────────────────────────────
  const [captureStatus, setCaptureStatus] = createSignal<string>("");
  const [captureResult, setCaptureResult] = createSignal<string | null>(null);
  const [isCapturing, setIsCapturing] = createSignal(false);

  async function testScreenshotCapture() {
    if (!exePath()) {
      setCaptureStatus("Set ezQuake path first");
      return;
    }
    setIsCapturing(true);
    setCaptureStatus("Launching ezQuake...");
    setCaptureResult(null);

    try {
      const assetsDir = "C:/Users/Administrator/projects/slipgate-app/assets/screenshots";
      const demoPath = `${assetsDir}/bps.qwd`;
      const mapPath = `${assetsDir}/hud.bsp`;
      const outputDir = `${assetsDir}/output`;

      setCaptureStatus("Capture in progress (~12 seconds)...");

      const result = await invoke<{ success: boolean; screenshot_path: string | null; error: string | null }>(
        "capture_screenshot",
        {
          options: {
            exe_path: exePath(),
            output_dir: outputDir,
            demo_path: demoPath,
            map_path: mapPath,
            screenshot_name: "slipgate_poc_001",
          },
        }
      );

      if (result.success) {
        setCaptureStatus("Screenshot captured!");
        setCaptureResult(result.screenshot_path);
      } else {
        setCaptureStatus(`Failed: ${result.error || "Unknown error"}`);
      }
    } catch (e) {
      setCaptureStatus(`Error: ${e}`);
    } finally {
      setIsCapturing(false);
    }
  }

  ----------------------------------------------------------------------------
  JSX SECTIONS (rendered inside the detail view of the old ClientsTab)
  ----------------------------------------------------------------------------

  // ── Input ─────────────────────────────────────────────────────────
  <div class="sg-card">
    <div class="sg-card-header">
      <Crosshair size={16} />
      <span>Input</span>
    </div>
    <Row label="Sensitivity" value={config()?.sensitivity?.toString()} />
    <Row label="m_yaw" value={config()?.m_yaw?.toString()} />
    <Row label="m_pitch" value={config()?.m_pitch?.toString()} />
    <Row label="Effective" value={effectiveSens() !== null ? effectiveSens()!.toFixed(4) : null} />
    <Row label="Raw Input" value={config()?.in_raw ? "Yes" : "No"} />
    <Row label="Mouse Accel" value={config()?.m_accel ? String(config()!.m_accel) : "Off"} />
  </div>

  // ── Video ─────────────────────────────────────────────────────────
  <div class="sg-card">
    <div class="sg-card-header">
      <Monitor size={16} />
      <span>Video</span>
    </div>
    <Row label="FOV" value={config()?.fov?.toFixed(1)} />
    <Row label="Resolution" value={effectiveResLabel()} />
    <Row label="Max FPS" value={config()?.cl_maxfps ? String(config()!.cl_maxfps) : "Unlocked"} />
  </div>

  // ── Launch ────────────────────────────────────────────────────────
  <div class="sg-card">
    <div class="sg-card-header">
      <Rocket size={16} />
      <span>Launch</span>
    </div>
    <div class="sg-row">
      <span class="sg-row-label">Server</span>
      <div class="sg-input-group">
        <input
          type="text"
          class="sg-row-input"
          style={{ width: "200px" }}
          placeholder="ip:port (optional)"
          value={connectAddress()}
          onInput={(e) => setConnectAddress(e.currentTarget.value)}
        />
      </div>
    </div>
    <div class="sg-row" style={{ gap: "8px" }}>
      <span class="sg-row-label" />
      <button class="sg-launch-btn sg-launch-btn-primary" onClick={() => launchGame("connect")}>
        Join
      </button>
      <button class="sg-launch-btn" onClick={() => launchGame("observe")}>
        Spec
      </button>
      <button class="sg-launch-btn" onClick={() => launchGame()}>
        Launch
      </button>
    </div>
  </div>

  // ── Screenshot POC ────────────────────────────────────────────────
  <div class="sg-card">
    <div class="sg-card-header">
      <Camera size={16} />
      <span>Screenshot POC</span>
    </div>
    <div class="sg-row">
      <span class="sg-row-label">Auto-capture</span>
      <button
        class="sg-launch-btn sg-launch-btn-primary"
        onClick={testScreenshotCapture}
        disabled={isCapturing()}
      >
        {isCapturing() ? "Capturing..." : "Take Screenshot"}
      </button>
    </div>
    <Show when={captureStatus()}>
      <div class="sg-row">
        <span class="sg-row-label">Status</span>
        <span class="sg-row-value" style={{ "font-size": "11px" }}>{captureStatus()}</span>
      </div>
    </Show>
    <Show when={captureResult()}>
      <div class="sg-row">
        <span class="sg-row-label">File</span>
        <span class="sg-row-value" style={{ "font-size": "10px", "word-break": "break-all" }}>{captureResult()}</span>
      </div>
    </Show>
  </div>

*/
