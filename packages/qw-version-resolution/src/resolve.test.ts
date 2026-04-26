import { describe, expect, test } from "bun:test";
import { parseVersionSpec } from "./version-spec";
import { existsAtVersion, defaultAtVersion } from "./resolve";

describe("existsAtVersion", () => {
  test("entity is alive when first <= target <= last", () => {
    const e = { first_seen_version: "3.6.0", last_seen_version: "3.6.9" };
    expect(existsAtVersion(e, parseVersionSpec("3.6.5"))).toBe(true);
  });

  test("entity is alive at exact bounds", () => {
    const e = { first_seen_version: "3.6.0", last_seen_version: "3.6.9" };
    expect(existsAtVersion(e, parseVersionSpec("3.6.0"))).toBe(true);
    expect(existsAtVersion(e, parseVersionSpec("3.6.9"))).toBe(true);
  });

  test("entity is absent before first_seen_version", () => {
    const e = { first_seen_version: "3.6.5" };
    expect(existsAtVersion(e, parseVersionSpec("3.6.0"))).toBe(false);
  });

  test("entity is absent after last_seen_version", () => {
    const e = { first_seen_version: "3.0.0", last_seen_version: "3.6.2" };
    expect(existsAtVersion(e, parseVersionSpec("3.6.5"))).toBe(false);
  });

  test("missing last_seen_version means alive forever forward", () => {
    const e = { first_seen_version: "3.6.0" };
    expect(existsAtVersion(e, parseVersionSpec("head-2026-04-25"))).toBe(true);
  });

  test("missing first_seen_version is treated as 'unknown coverage' = false", () => {
    expect(existsAtVersion({}, parseVersionSpec("3.6.5"))).toBe(false);
  });
});

describe("defaultAtVersion", () => {
  test("walks default_history backward to find effective default", () => {
    const e = {
      default: "1",
      default_history: [
        { version: "3.6.0", value: "0" },
        { version: "3.7.0", value: "1" },
      ],
    };
    expect(defaultAtVersion(e, parseVersionSpec("3.6.9"))).toBe("0");
    expect(defaultAtVersion(e, parseVersionSpec("3.7.0"))).toBe("1");
  });

  test("returns the post-flip value at and after the flip version", () => {
    const e = {
      default_history: [
        { version: "3.6.0", value: "0" },
        { version: "3.7.0", value: "1" },
      ],
    };
    expect(defaultAtVersion(e, parseVersionSpec("3.7.5"))).toBe("1");
    expect(defaultAtVersion(e, parseVersionSpec("3.6.0"))).toBe("0");
  });

  test("falls back to top-level default when no history", () => {
    expect(defaultAtVersion({ default: "5" }, parseVersionSpec("3.6.9"))).toBe("5");
  });

  test("returns null when no default known", () => {
    expect(defaultAtVersion({}, parseVersionSpec("3.6.9"))).toBeNull();
  });

  test("target before first history entry falls back to top-level default", () => {
    const e = {
      default: "fallback",
      default_history: [{ version: "3.6.5", value: "0" }],
    };
    expect(defaultAtVersion(e, parseVersionSpec("3.6.0"))).toBe("fallback");
  });
});
