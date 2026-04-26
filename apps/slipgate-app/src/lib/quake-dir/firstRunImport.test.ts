import { describe, expect, test } from "bun:test";
import { runWarehouseBootstrap } from "./firstRunImport";

type AnyInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

describe("runWarehouseBootstrap", () => {
  test("foreign exe triggers import + re-reconcile", async () => {
    const calls: string[] = [];
    const invoke = (async (cmd: string) => {
      calls.push(cmd);
      if (cmd === "reconcile_active_version") return { status: "foreign", sha256: "abc" };
      if (cmd === "import_existing_install") return { version: "3.6.6" };
      return null;
    }) as AnyInvoke;
    await runWarehouseBootstrap({
      invoke,
      client: "ezquake",
      canonicalExePath: "C:\\QW\\ezquake.exe",
    });
    expect(calls).toEqual([
      "reconcile_active_version",
      "import_existing_install",
      "reconcile_active_version",
    ]);
  });

  test("matched exe does NOT trigger import", async () => {
    const calls: string[] = [];
    const invoke = (async (cmd: string) => {
      calls.push(cmd);
      if (cmd === "reconcile_active_version") return { status: "matched", version: "3.6.9" };
      return null;
    }) as AnyInvoke;
    await runWarehouseBootstrap({
      invoke,
      client: "ezquake",
      canonicalExePath: "C:\\QW\\ezquake.exe",
    });
    expect(calls).toEqual(["reconcile_active_version"]);
  });

  test("no exe path skips everything", async () => {
    const calls: string[] = [];
    const invoke = (async (cmd: string) => {
      calls.push(cmd);
      return null;
    }) as AnyInvoke;
    await runWarehouseBootstrap({ invoke, client: "ezquake", canonicalExePath: null });
    expect(calls).toEqual([]);
  });
});
