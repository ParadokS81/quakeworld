import { describe, expect, test } from "bun:test";
import {
  fingerprintExe,
  fingerprintFolder,
  scanClientsInDir,
  familyLabel,
  familyClientKey,
  familyCanonicalExe,
  type ClientFingerprint,
} from "./clientFingerprint";

const sampleFingerprint: ClientFingerprint = {
  kind: "ez_quake",
  version: "3.6.9",
  variant: null,
  product_name: "ezQuake",
  internal_name: "ezquake",
  original_filename: "ezquake.exe",
  file_description: null,
  company_name: null,
};

describe("clientFingerprint wrappers", () => {
  test("fingerprintExe forwards path", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
      calls.push([cmd, args]);
      return sampleFingerprint as T;
    };
    const r = await fingerprintExe(invoke, "C:\\QW\\ezquake.exe");
    expect(r.kind).toBe("ez_quake");
    expect(calls).toEqual([["fingerprint_exe", { path: "C:\\QW\\ezquake.exe" }]]);
  });

  test("fingerprintFolder unwraps the (path, fingerprint) tuple list", async () => {
    const invoke = async <T,>(): Promise<T> =>
      [
        ["C:\\QW\\ezquake.exe", sampleFingerprint],
        ["C:\\QW\\fteqw.exe", { ...sampleFingerprint, kind: "fte", version: "01.20" }],
      ] as T;
    const rows = await fingerprintFolder(invoke, "C:\\QW");
    expect(rows.length).toBe(2);
    expect(rows[0].path).toBe("C:\\QW\\ezquake.exe");
    expect(rows[0].fingerprint.kind).toBe("ez_quake");
    expect(rows[1].fingerprint.kind).toBe("fte");
  });

  test("scanClientsInDir forwards folder + unwraps tuples", async () => {
    const calls: Array<[string, Record<string, unknown> | undefined]> = [];
    const invoke = async <T,>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
      calls.push([cmd, args]);
      return [["C:\\QW\\ezquake.exe", sampleFingerprint]] as T;
    };
    const rows = await scanClientsInDir(invoke, "C:\\QW");
    expect(calls[0][0]).toBe("scan_clients_in_dir");
    expect(calls[0][1]).toEqual({ folder: "C:\\QW" });
    expect(rows[0].fingerprint.kind).toBe("ez_quake");
  });
});

describe("clientFingerprint family helpers", () => {
  test("familyLabel maps kinds to user-facing labels", () => {
    expect(familyLabel("ez_quake")).toBe("ezQuake");
    expect(familyLabel("unez_quake_family")).toBe("unezQuake");
    expect(familyLabel("fte")).toBe("FTE QW");
    expect(familyLabel("unknown")).toBe("Unknown");
  });

  test("familyClientKey maps kinds to warehouse client keys", () => {
    expect(familyClientKey("ez_quake")).toBe("ezquake");
    expect(familyClientKey("unez_quake_family")).toBe("unezquake");
    expect(familyClientKey("fte")).toBe("fte");
    expect(familyClientKey("unknown")).toBeNull();
  });

  test("familyCanonicalExe matches Rust mapping (FTE is fteqw.exe)", () => {
    expect(familyCanonicalExe("ez_quake", null)).toBe("ezquake.exe");
    expect(familyCanonicalExe("ez_quake", "glsl")).toBe("ezquake-glsl.exe");
    expect(familyCanonicalExe("unez_quake_family", null)).toBe("unezquake.exe");
    expect(familyCanonicalExe("fte", null)).toBe("fteqw.exe");
    expect(familyCanonicalExe("unknown", null)).toBeNull();
  });
});
