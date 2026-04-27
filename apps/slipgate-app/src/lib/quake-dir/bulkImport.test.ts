import { describe, expect, test } from "bun:test";
import {
  bulkImportClients,
  renameToCanonical,
  normalizeDir,
  dirsEqual,
  type BulkImportRequest,
} from "./bulkImport";

const sampleReq: BulkImportRequest = {
  rows: [
    {
      source_path: "C:\\QW\\ezquake-3.6.6.exe",
      client: "ezquake",
      version: "3.6.6",
      variant: null,
      channel: "imported",
      family_canonical_filename: "ezquake.exe",
      canonicalize_consent: { kind: "rename" },
    },
  ],
  primary_row_index: 0,
  quake_dir: "C:\\QW",
  claim_as_primary: true,
};

describe("bulkImport wrappers", () => {
  test("bulkImportClients forwards req under the `req` key (matches Rust BulkImportRequest binding)", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
      calls.push([cmd, args]);
      return {
        registered: [],
        renamed: [],
        skipped_canonicalize: [],
        primary_active: null,
        primary_dir_claimed: false,
      } as T;
    };
    await bulkImportClients(invoke, sampleReq);
    expect(calls[0][0]).toBe("bulk_import_clients");
    expect(calls[0][1]).toEqual({ req: sampleReq });
  });

  test("renameToCanonical forwards camelCase args", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
      calls.push([cmd, args]);
      return "C:\\QW\\ezquake.exe" as T;
    };
    const result = await renameToCanonical(
      invoke,
      "C:\\QW\\ezquake-3.6.6.exe",
      "ezquake.exe",
    );
    expect(result).toBe("C:\\QW\\ezquake.exe");
    expect(calls).toEqual([
      [
        "rename_to_canonical",
        { sourcePath: "C:\\QW\\ezquake-3.6.6.exe", targetFilename: "ezquake.exe" },
      ],
    ]);
  });
});

describe("path normalization (D9 case-2 dir comparison)", () => {
  test("trailing slash differences are equal", () => {
    expect(dirsEqual("C:\\QW", "C:\\QW\\")).toBe(true);
  });

  test("forward / back slash differences are equal", () => {
    expect(dirsEqual("C:/QW", "C:\\QW")).toBe(true);
  });

  test("drive letter casing is equal", () => {
    expect(dirsEqual("c:\\qw", "C:\\QW")).toBe(true);
  });

  test("genuinely different dirs are unequal", () => {
    expect(dirsEqual("C:\\QW", "D:\\OldQuake")).toBe(false);
  });

  test("normalizeDir is idempotent", () => {
    const once = normalizeDir("C:\\QW\\");
    expect(normalizeDir(once)).toBe(once);
  });
});
