import { describe, expect, test } from "bun:test";
import {
  swapActiveVersion,
  deleteWarehousedVersion,
  userInitiatedReconcile,
} from "./swap";

describe("swap wrappers", () => {
  test("swapActiveVersion forwards args with snake_case payload keys", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
      calls.push([cmd, args]);
      return {
        previous_sha256: "abc",
        previous_was_foreign: false,
        new_version: "3.6.9",
        backup_path: null,
      } as T;
    };
    const r = await swapActiveVersion(invoke, {
      client: "ezquake",
      targetVersion: "3.6.9",
      quakeDir: "C:\\QW",
      targetExeName: "ezquake.exe",
    });
    expect(r.new_version).toBe("3.6.9");
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe("swap_active_version");
    expect(calls[0][1]).toEqual({
      client: "ezquake",
      targetVersion: "3.6.9",
      quakeDir: "C:\\QW",
      targetExeName: "ezquake.exe",
    });
  });

  test("deleteWarehousedVersion forwards client + version", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
      calls.push([cmd, args]);
      return null as T;
    };
    await deleteWarehousedVersion(invoke, "ezquake", "3.6.6");
    expect(calls).toEqual([
      ["delete_warehoused_version", { client: "ezquake", version: "3.6.6" }],
    ]);
  });

  test("userInitiatedReconcile forwards client + canonicalExePath", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
      calls.push([cmd, args]);
      return { status: "matched", version: "3.6.9" } as T;
    };
    const r = await userInitiatedReconcile(invoke, "ezquake", "C:\\QW\\ezquake.exe");
    expect(r).toEqual({ status: "matched", version: "3.6.9" });
    expect(calls[0][0]).toBe("reconcile_active_version");
    expect(calls[0][1]).toEqual({
      client: "ezquake",
      canonicalExePath: "C:\\QW\\ezquake.exe",
    });
  });
});
