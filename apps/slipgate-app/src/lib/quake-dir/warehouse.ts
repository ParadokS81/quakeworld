import type { InvokeFn } from "./invoke-types";

export interface WarehousedVersion {
  client: string;
  version: string;
  channel: "stable" | "snapshot" | "imported" | string;
  blob_sha256: string;
  original_exe_name: string;
  size_bytes: number;
  downloaded_at: number;
  source: string;
  /** Filename-derived variant (e.g. "glsl"). Null for canonical filenames. */
  variant?: string | null;
}

export interface WarehouseIndex {
  schema_version: number;
  active: Record<string, string>;
  last_scan: number;
}

export async function listWarehousedVersions(invoke: InvokeFn): Promise<WarehousedVersion[]> {
  return invoke<WarehousedVersion[]>("list_warehoused_versions");
}

export async function readWarehouseIndex(invoke: InvokeFn): Promise<WarehouseIndex> {
  return invoke<WarehouseIndex>("read_warehouse_index");
}

export async function importExistingInstall(
  invoke: InvokeFn,
  client: string,
  exePath: string,
): Promise<WarehousedVersion> {
  return invoke<WarehousedVersion>("import_existing_install", { client, exePath });
}
