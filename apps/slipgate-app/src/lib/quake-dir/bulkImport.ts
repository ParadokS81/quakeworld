import type { InvokeFn } from "./invoke-types";
import type { WarehousedVersion } from "./warehouse";

export type CanonicalizeConsent =
  | { kind: "skip" }
  | { kind: "rename" }
  | { kind: "leave_as_is" };

export interface BulkImportRow {
  source_path: string;
  client: string;
  version: string;
  variant: string | null;
  channel: string;
  family_canonical_filename: string;
  canonicalize_consent: CanonicalizeConsent;
}

export interface BulkImportRequest {
  rows: BulkImportRow[];
  primary_row_index: number | null;
  quake_dir: string;
  claim_as_primary: boolean;
}

export interface RenameRecord {
  from: string;
  to: string;
}

export interface BulkImportResult {
  registered: WarehousedVersion[];
  renamed: RenameRecord[];
  skipped_canonicalize: string[];
  primary_active: string | null;
  primary_dir_claimed: boolean;
}

export async function bulkImportClients(
  invoke: InvokeFn,
  req: BulkImportRequest,
): Promise<BulkImportResult> {
  return invoke<BulkImportResult>("bulk_import_clients", { req });
}

export async function renameToCanonical(
  invoke: InvokeFn,
  sourcePath: string,
  targetFilename: string,
): Promise<string> {
  return invoke<string>("rename_to_canonical", {
    sourcePath,
    targetFilename,
  });
}

/**
 * Path-normalize a directory string for D9 case-2 comparison. Lowercases drive
 * letters on Windows, strips trailing separators, normalizes mixed slashes.
 */
export function normalizeDir(p: string): string {
  let s = p.replace(/[\\/]+$/, "");
  s = s.replace(/\\/g, "/");
  // Lowercase the drive letter on Windows-shaped paths.
  s = s.replace(/^([a-z]):/i, (_, l) => `${l.toLowerCase()}:`);
  return s.toLowerCase();
}

export function dirsEqual(a: string, b: string): boolean {
  return normalizeDir(a) === normalizeDir(b);
}
