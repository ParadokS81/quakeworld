import { describe, expect, test } from "bun:test";
import { buildSpanTree } from "./prettyRender.js";
import { createDefaultPlayerState } from "./simulator/index.js";

describe("buildSpanTree (scaffold)", () => {
  test("empty input produces empty span list", () => {
    const r = buildSpanTree("", {
      state: createDefaultPlayerState(),
      cvars: new Map(),
      resolver: null,
    });
    expect(r.spans).toEqual([]);
  });

  test("plain ASCII produces one literal span", () => {
    const r = buildSpanTree("hello", {
      state: createDefaultPlayerState(),
      cvars: new Map(),
      resolver: null,
    });
    expect(r.spans.length).toBe(1);
    expect(r.spans[0].text).toBe("hello");
    expect(r.spans[0].origin).toBe("literal");
  });
});
