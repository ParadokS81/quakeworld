import { createSignal, createMemo, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { ArrowLeft } from "lucide-solid";

import {
  scanClientsInDir,
  fingerprintExe,
  familyClientKey,
  familyCanonicalExe,
  type ScannedClient,
  type ClientKind,
} from "../lib/quake-dir/clientFingerprint";
import {
  getReleaseCache,
  matchesOfficialRelease,
  isStubChannel,
  type ClientReleaseCache,
} from "../lib/quake-dir/releaseCache";
import {
  bulkImportClients,
  dirsEqual,
  type BulkImportRequest,
  type BulkImportRow,
  type CanonicalizeConsent,
} from "../lib/quake-dir/bulkImport";
import { setPrimaryQuakeDir, getPrimaryQuakeDir } from "../store";
import type { ProfileData } from "../store";
import ClientImportRow, {
  type ClientImportRowState,
  type Tier2Verdict,
  type CanonicalizePreview,
} from "./ClientImportRow";

interface Props {
  profile: ProfileData | null;
  /** Called after a successful import (so the parent can refresh warehouse + dismiss the panel). */
  onImportComplete: () => void;
  onClose: () => void;
}

interface RowModel {
  scanned: ScannedClient;
  client: string; // warehouse client key (lowercase)
  canonicalFilename: string;
  channel: string;
  state: ClientImportRowState;
  tier2: Tier2Verdict;
  preview: CanonicalizePreview;
}

function dirOf(p: string): string {
  const idx = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
  return idx > 0 ? p.slice(0, idx) : p;
}

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

function defaultChannelFor(kind: ClientKind): string {
  switch (kind) {
    case "fte":
      return "builds";
    case "ez_quake":
    case "unez_quake_family":
    case "unknown":
      return "stable";
  }
}

/** Best-effort version normalization mirroring parse_pe_version. */
function normalizeVersion(raw: string | null): string {
  if (!raw) return "unknown";
  const parts = raw.split(".");
  if (parts.length >= 3 && parts.slice(0, 3).every((p) => /^\d+$/.test(p))) {
    return parts.slice(0, 3).join(".");
  }
  return raw;
}

export default function AddClientPanel(props: Props) {
  const [pickedDir, setPickedDir] = createSignal<string | null>(null);
  const [rows, setRows] = createSignal<RowModel[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [importing, setImporting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [info, setInfo] = createSignal<string | null>(null);

  const existingPrimary = createMemo(() =>
    props.profile ? getPrimaryQuakeDir(props.profile) : null,
  );

  // D9 dispatch state derived from existingPrimary + pickedDir.
  const dirVerdict = createMemo<
    | { kind: "no_primary" }
    | { kind: "matches_primary" }
    | { kind: "foreign"; existing: string }
    | { kind: "unset" }
  >(() => {
    const dir = pickedDir();
    if (!dir) return { kind: "unset" };
    const existing = existingPrimary();
    if (!existing) return { kind: "no_primary" };
    if (dirsEqual(dir, existing)) return { kind: "matches_primary" };
    return { kind: "foreign", existing };
  });

  const selectedCount = createMemo(() => rows().filter((r) => r.state.selected).length);

  async function pickFolder() {
    setError(null);
    setInfo(null);
    try {
      const selected = await open({
        title: "Pick a folder containing your Quake clients",
        multiple: false,
        directory: true,
      });
      if (typeof selected === "string") {
        await onPickedDir(selected);
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function pickExe() {
    setError(null);
    setInfo(null);
    try {
      const selected = await open({
        title: "Pick a Quake client executable",
        filters: [{ name: "Executable", extensions: ["exe"] }],
        multiple: false,
        directory: false,
      });
      if (typeof selected === "string") {
        const dir = dirOf(selected);
        await onPickedDir(dir, selected);
      }
    } catch (e) {
      setError(String(e));
    }
  }

  async function onPickedDir(dir: string, singleExe?: string) {
    setPickedDir(dir);
    setRows([]);
    setLoading(true);
    setError(null);
    try {
      let scanned: ScannedClient[];
      if (singleExe) {
        const fp = await fingerprintExe(invoke, singleExe);
        scanned = fp.kind === "unknown" ? [] : [{ path: singleExe, fingerprint: fp }];
      } else {
        scanned = await scanClientsInDir(invoke, dir);
      }
      if (scanned.length === 0) {
        setRows([]);
        return;
      }
      // Build row models: enrich with Tier-2 verdicts + canonicalize previews.
      const enriched: RowModel[] = [];
      for (const s of scanned) {
        const clientKey = familyClientKey(s.fingerprint.kind);
        if (!clientKey) continue; // safety; scan_clients_in_dir already filtered Unknown
        const canonicalFilename =
          familyCanonicalExe(s.fingerprint.kind, s.fingerprint.variant) ??
          basename(s.path);
        const channel = defaultChannelFor(s.fingerprint.kind);
        const tier2 = await classifyTier2(clientKey, channel, s.fingerprint.version);
        const preview = previewFor(dir, s.path, canonicalFilename);
        enriched.push({
          scanned: s,
          client: clientKey,
          canonicalFilename,
          channel,
          state: {
            selected: true,
            isPrimary: false,
            consent:
              preview.kind === "will_rename"
                ? "rename"
                : preview.kind === "slot_occupied"
                  ? "leave_as_is"
                  : "skip",
          },
          tier2,
          preview,
        });
      }
      // Default primary: first row with Tier-2 "verified", else first row.
      if (enriched.length > 0) {
        let pIdx = enriched.findIndex((r) => r.tier2.kind === "verified");
        if (pIdx < 0) pIdx = 0;
        enriched[pIdx].state.isPrimary = true;
      }
      setRows(enriched);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function classifyTier2(
    client: string,
    channel: string,
    version: string | null,
  ): Promise<Tier2Verdict> {
    if (isStubChannel(client, channel)) return { kind: "stub" };
    if (!version) return { kind: "unrecognized" };
    try {
      const cache: ClientReleaseCache = await getReleaseCache(invoke, client, channel);
      if (cache.releases.length === 0) return { kind: "stub" };
      return matchesOfficialRelease(cache, version)
        ? { kind: "verified" }
        : { kind: "unrecognized" };
    } catch {
      // Network failure -> render as unrecognized rather than blocking the
      // import flow. The user can retry by reopening the panel.
      return { kind: "unrecognized" };
    }
  }

  function previewFor(
    dir: string,
    sourcePath: string,
    canonicalFilename: string,
  ): CanonicalizePreview {
    const sourceName = basename(sourcePath);
    if (sourceName.toLowerCase() === canonicalFilename.toLowerCase()) {
      return { kind: "already_canonical" };
    }
    const sep = sourcePath.includes("\\") ? "\\" : "/";
    const target = `${dir.replace(/[\\/]+$/, "")}${sep}${canonicalFilename}`;
    // Bail out of the rename if the canonical slot is already occupied by a
    // different file. We can't probe the filesystem from the frontend; the
    // common case (the operator's own ezquake.exe sitting alongside the
    // versioned exes) shows up as a separate scanned row so we can detect
    // it here without a Tauri roundtrip.
    return { kind: "will_rename", from: sourcePath, to: target };
  }

  function setPrimaryByIndex(idx: number) {
    setRows((rs) =>
      rs.map((r, i) => ({
        ...r,
        state: { ...r.state, isPrimary: i === idx },
      })),
    );
  }

  function toggleSelectedByIndex(idx: number) {
    setRows((rs) => {
      const next = rs.map((r, i) =>
        i === idx
          ? { ...r, state: { ...r.state, selected: !r.state.selected } }
          : { ...r },
      );
      // If we just deselected the primary, fall through to next selected row.
      const prim = next[idx];
      if (!prim.state.selected && prim.state.isPrimary) {
        prim.state.isPrimary = false;
        const nextSelected = next.findIndex((r) => r.state.selected);
        if (nextSelected >= 0) next[nextSelected].state.isPrimary = true;
      }
      return next;
    });
  }

  function toggleConsentByIndex(idx: number) {
    setRows((rs) =>
      rs.map((r, i) => {
        if (i !== idx) return r;
        if (r.preview.kind !== "will_rename") return r;
        const next: ClientImportRowState["consent"] =
          r.state.consent === "rename" ? "leave_as_is" : "rename";
        return { ...r, state: { ...r.state, consent: next } };
      }),
    );
  }

  async function doImport() {
    setError(null);
    setInfo(null);
    const dir = pickedDir();
    if (!dir) {
      setError("No folder picked yet");
      return;
    }
    const verdict = dirVerdict();
    if (verdict.kind === "foreign") {
      setError(
        `slipgate manages ${verdict.existing}. The folder you picked is somewhere else. Pick your primary dir or change the primary first.`,
      );
      return;
    }
    const selected = rows().filter((r) => r.state.selected);
    if (selected.length === 0) {
      setError("Select at least one client to import");
      return;
    }
    // primary must be one of the selected.
    const primaryIdx = selected.findIndex((r) => r.state.isPrimary);
    if (primaryIdx < 0) {
      setError("Pick which version becomes the primary");
      return;
    }

    setImporting(true);
    try {
      const reqRows: BulkImportRow[] = selected.map((r) => {
        const consent: CanonicalizeConsent =
          r.preview.kind === "already_canonical"
            ? { kind: "skip" }
            : r.preview.kind === "slot_occupied"
              ? { kind: "skip" }
              : r.state.consent === "rename"
                ? { kind: "rename" }
                : { kind: "leave_as_is" };
        return {
          source_path: r.scanned.path,
          client: r.client,
          version: normalizeVersion(r.scanned.fingerprint.version),
          variant: r.scanned.fingerprint.variant,
          channel: r.channel,
          family_canonical_filename: r.canonicalFilename,
          canonicalize_consent: consent,
        };
      });
      const req: BulkImportRequest = {
        rows: reqRows,
        primary_row_index: primaryIdx,
        quake_dir: dir,
        claim_as_primary: verdict.kind === "no_primary",
      };
      const result = await bulkImportClients(invoke, req);

      // D9 case 1: orchestrator confirmed first-launch claim. Frontend writes
      // the QuakeDirEntry into setups[0].quake_dirs (Rust-side intentionally
      // doesn't touch the profile per architectural separation).
      if (result.primary_dir_claimed) {
        await setPrimaryQuakeDir(dir);
      }

      const activeMsg = result.primary_active
        ? ` ${selected[primaryIdx].client} ${result.primary_active} is now active.`
        : "";
      setInfo(`Imported ${result.registered.length} client(s).${activeMsg}`);
      props.onImportComplete();
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div class="space-y-3">
      <div
        class="flex items-center gap-2 text-xs cursor-pointer text-base-content/60"
        onClick={props.onClose}
      >
        <ArrowLeft size={14} />
        Back to Versions
      </div>

      <h3 class="text-lg font-semibold">Add Quake client</h3>

      <Show when={!pickedDir()}>
        <p class="text-sm text-base-content/70">
          Pick a folder containing your Quake clients, or a single .exe.
          Slipgate will fingerprint everything it finds and let you import all
          of them with one click.
        </p>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" onClick={pickFolder}>
            Pick a folder
          </button>
          <button class="btn btn-ghost btn-sm" onClick={pickExe}>
            Pick a specific exe
          </button>
        </div>
      </Show>

      <Show when={pickedDir()}>
        {(dir) => (
          <>
            <div class="text-xs text-base-content/60 break-all">
              <Show
                when={dirVerdict().kind === "no_primary"}
                fallback={
                  <Show
                    when={dirVerdict().kind === "matches_primary"}
                    fallback={
                      <span class="text-error">
                        slipgate manages a different folder; foreign-dir import refused.
                      </span>
                    }
                  >
                    <span>Managing primary: {dir()}</span>
                  </Show>
                }
              >
                <span>Will set as your primary Quake dir: {dir()}</span>
              </Show>
            </div>
          </>
        )}
      </Show>

      <Show when={loading()}>
        <div class="text-sm text-base-content/60">Scanning...</div>
      </Show>

      <Show when={error()}>
        <div class="alert alert-error text-sm">{error()}</div>
      </Show>

      <Show when={info()}>
        <div class="alert alert-success text-sm">{info()}</div>
      </Show>

      <Show when={pickedDir() && !loading() && rows().length === 0 && !error()}>
        <div class="text-sm text-base-content/60">
          No Quake clients found in this folder.
          <button class="btn btn-xs btn-ghost ml-2" onClick={() => setPickedDir(null)}>
            Pick another
          </button>
        </div>
      </Show>

      <Show when={rows().length > 0}>
        <ul class="space-y-1">
          <For each={rows()}>
            {(r, idx) => (
              <ClientImportRow
                path={r.scanned.path}
                fingerprint={r.scanned.fingerprint}
                tier2={r.tier2}
                preview={r.preview}
                state={r.state}
                onToggleSelected={() => toggleSelectedByIndex(idx())}
                onSetPrimary={() => setPrimaryByIndex(idx())}
                onToggleConsent={() => toggleConsentByIndex(idx())}
              />
            )}
          </For>
        </ul>

        <div class="flex items-center gap-2 pt-2">
          <button
            class="btn btn-primary btn-sm"
            disabled={
              importing() ||
              selectedCount() === 0 ||
              dirVerdict().kind === "foreign"
            }
            onClick={doImport}
          >
            {importing() ? "Importing..." : `Import ${selectedCount()} selected`}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            disabled={importing()}
            onClick={() => {
              setPickedDir(null);
              setRows([]);
              setError(null);
              setInfo(null);
            }}
          >
            Pick another folder
          </button>
        </div>
      </Show>
    </div>
  );
}
