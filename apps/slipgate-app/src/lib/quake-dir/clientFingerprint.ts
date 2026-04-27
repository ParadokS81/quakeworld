import type { InvokeFn } from "./invoke-types";

export type ClientKind = "ez_quake" | "unez_quake_family" | "fte" | "unknown";

export interface ClientFingerprint {
  kind: ClientKind;
  version: string | null;
  variant: string | null;
  product_name: string | null;
  internal_name: string | null;
  original_filename: string | null;
  file_description: string | null;
  company_name: string | null;
}

export interface ScannedClient {
  path: string;
  fingerprint: ClientFingerprint;
}

function unwrapTuple(row: [string, ClientFingerprint]): ScannedClient {
  return { path: row[0], fingerprint: row[1] };
}

export async function fingerprintExe(
  invoke: InvokeFn,
  path: string,
): Promise<ClientFingerprint> {
  return invoke<ClientFingerprint>("fingerprint_exe", { path });
}

export async function fingerprintFolder(
  invoke: InvokeFn,
  folder: string,
): Promise<ScannedClient[]> {
  const rows = await invoke<Array<[string, ClientFingerprint]>>("fingerprint_folder", {
    folder,
  });
  return rows.map(unwrapTuple);
}

export async function scanClientsInDir(
  invoke: InvokeFn,
  folder: string,
): Promise<ScannedClient[]> {
  const rows = await invoke<Array<[string, ClientFingerprint]>>("scan_clients_in_dir", {
    folder,
  });
  return rows.map(unwrapTuple);
}

/** UI-friendly family label (capitalization + family naming). */
export function familyLabel(kind: ClientKind): string {
  switch (kind) {
    case "ez_quake":
      return "ezQuake";
    case "unez_quake_family":
      return "unezQuake";
    case "fte":
      return "FTE QW";
    case "unknown":
      return "Unknown";
  }
}

/** Maps fingerprinter `kind` to the warehouse client key. */
export function familyClientKey(kind: ClientKind): string | null {
  switch (kind) {
    case "ez_quake":
      return "ezquake";
    case "unez_quake_family":
      return "unezquake";
    case "fte":
      return "fte";
    case "unknown":
      return null;
  }
}

/** Mirror of Rust's family_canonical_exe. FTE is `fteqw.exe`, not `fte.exe`. */
export function familyCanonicalExe(
  kind: ClientKind,
  variant: string | null,
): string | null {
  let base: string;
  switch (kind) {
    case "ez_quake":
      base = "ezquake";
      break;
    case "unez_quake_family":
      base = "unezquake";
      break;
    case "fte":
      base = "fteqw";
      break;
    case "unknown":
      return null;
  }
  return variant ? `${base}-${variant}.exe` : `${base}.exe`;
}
