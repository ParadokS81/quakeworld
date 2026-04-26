import { describe, expect, test } from "bun:test";
import { getDataRoot } from "./dataRoot";

describe("getDataRoot", () => {
  test("returns the structured info from the Tauri command", async () => {
    let receivedCmd = "";
    const invoke = async <T>(cmd: string): Promise<T> => {
      receivedCmd = cmd;
      return { path: "/fake/appdata", mode: "installed" } as T;
    };
    const result = await getDataRoot(invoke);
    expect(result).toEqual({ path: "/fake/appdata", mode: "installed" });
    expect(receivedCmd).toBe("get_data_root");
  });

  test("propagates errors from the Tauri command", async () => {
    const invoke = async <T>(): Promise<T> => {
      throw "permission denied";
    };
    expect(getDataRoot(invoke)).rejects.toBe("permission denied");
  });
});
