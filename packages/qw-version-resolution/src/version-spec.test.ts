import { describe, expect, test } from "bun:test";
import { parseVersionSpec } from "./version-spec";

describe("parseVersionSpec", () => {
  test("parses semver tags", () => {
    expect(parseVersionSpec("3.6.9")).toEqual({
      kind: "tag",
      value: "3.6.9",
      display: "3.6.9",
    });
  });

  test("parses dated head strings", () => {
    expect(parseVersionSpec("head-2026-04-25")).toEqual({
      kind: "head",
      date: "2026-04-25",
      display: "head-2026-04-25",
    });
  });

  test("parses build-number strings", () => {
    expect(parseVersionSpec("build-6698")).toEqual({
      kind: "build",
      number: 6698,
      display: "build-6698",
    });
  });

  test("falls back to tag for unrecognized shapes", () => {
    expect(parseVersionSpec("weirdo")).toEqual({
      kind: "tag",
      value: "weirdo",
      display: "weirdo",
    });
  });
});
