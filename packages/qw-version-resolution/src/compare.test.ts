import { describe, expect, test } from "bun:test";
import { parseVersionSpec } from "./version-spec";
import { compareVersions } from "./compare";

const v = parseVersionSpec;

describe("compareVersions", () => {
  test("orders semver tags numerically", () => {
    expect(compareVersions(v("3.6.9"), v("3.6.10"))).toBe(-1);
    expect(compareVersions(v("3.7.0"), v("3.6.9"))).toBe(1);
    expect(compareVersions(v("3.6.9"), v("3.6.9"))).toBe(0);
  });

  test("orders dated heads by date", () => {
    expect(compareVersions(v("head-2026-04-25"), v("head-2026-04-26"))).toBe(-1);
    expect(compareVersions(v("head-2026-04-26"), v("head-2026-04-25"))).toBe(1);
    expect(compareVersions(v("head-2026-04-25"), v("head-2026-04-25"))).toBe(0);
  });

  test("tag < head", () => {
    expect(compareVersions(v("3.6.9"), v("head-2026-04-25"))).toBe(-1);
    expect(compareVersions(v("head-2026-04-25"), v("3.6.9"))).toBe(1);
  });

  test("orders build numbers", () => {
    expect(compareVersions(v("build-6697"), v("build-6698"))).toBe(-1);
    expect(compareVersions(v("build-6698"), v("build-6697"))).toBe(1);
    expect(compareVersions(v("build-6698"), v("build-6698"))).toBe(0);
  });

  test("tag < build", () => {
    expect(compareVersions(v("3.6.9"), v("build-6698"))).toBe(-1);
    expect(compareVersions(v("build-6698"), v("3.6.9"))).toBe(1);
  });

  test("head vs build is unordered (returns 0)", () => {
    expect(compareVersions(v("head-2026-04-25"), v("build-6698"))).toBe(0);
    expect(compareVersions(v("build-6698"), v("head-2026-04-25"))).toBe(0);
  });

  test("prerelease-suffixed tag sorts below the clean tag", () => {
    expect(compareVersions(v("3.7.0-rc1"), v("3.7.0"))).toBe(-1);
    expect(compareVersions(v("3.7.0"), v("3.7.0-rc1"))).toBe(1);
  });

  test("two prerelease tags with same numeric base compare lexicographically on the tail", () => {
    expect(compareVersions(v("3.7.0-rc1"), v("3.7.0-rc2"))).toBe(-1);
    expect(compareVersions(v("3.7.0-rc2"), v("3.7.0-rc1"))).toBe(1);
  });
});
