import { describe, expect, test } from "bun:test";
import {
  importExistingInstall,
  listWarehousedVersions,
  readWarehouseIndex,
  type WarehousedVersion,
  type WarehouseIndex,
} from "./warehouse";

describe("warehouse wrapper", () => {
  test("listWarehousedVersions forwards to the command", async () => {
    const fixture: WarehousedVersion[] = [
      {
        client: "ezquake",
        version: "3.6.9",
        channel: "stable",
        blob_sha256: "x",
        original_exe_name: "ezquake.exe",
        size_bytes: 1,
        downloaded_at: 1,
        source: "github_release",
      },
    ];
    const calls: string[] = [];
    const invoke = (async (cmd: string) => {
      calls.push(cmd);
      return fixture;
    }) as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    expect(await listWarehousedVersions(invoke)).toEqual(fixture);
    expect(calls).toEqual(["list_warehoused_versions"]);
  });

  test("readWarehouseIndex forwards to the command", async () => {
    const idx: WarehouseIndex = {
      schema_version: 1,
      active: { ezquake: "3.6.9" },
      last_scan: 0,
    };
    const invoke = (async () => idx) as <T>(
      cmd: string,
      args?: Record<string, unknown>,
    ) => Promise<T>;
    expect(await readWarehouseIndex(invoke)).toEqual(idx);
  });

  test("importExistingInstall passes client and exePath", async () => {
    const calls: Array<[string, unknown]> = [];
    const invoke = (async (cmd: string, args?: unknown) => {
      calls.push([cmd, args]);
      return {} as WarehousedVersion;
    }) as <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    await importExistingInstall(invoke, "ezquake", "C:\\QW\\ezquake.exe");
    expect(calls).toEqual([
      ["import_existing_install", { client: "ezquake", exePath: "C:\\QW\\ezquake.exe" }],
    ]);
  });
});
