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

describe("color-stack state machine", () => {
  const ctx = {
    state: createDefaultPlayerState(),
    cvars: new Map<string, string>(),
    resolver: null,
  };

  test("&cRGB sets inline hex color then &r resets to default", () => {
    const r = buildSpanTree("&cf00red&rdefault", ctx);
    expect(r.spans.length).toBe(2);
    expect(r.spans[0].text).toBe("red");
    expect(r.spans[0].color).toEqual({ kind: "hex", value: "#ff0000" });
    expect(r.spans[1].text).toBe("default");
    expect(r.spans[1].color).toEqual({ kind: "default" });
  });

  test("12-bit hex expands each nibble to 24-bit", () => {
    const r = buildSpanTree("&cf13rl", ctx);
    expect(r.spans[0].color).toEqual({ kind: "hex", value: "#ff1133" });
  });

  test("braces push white-default frame, pop restores outer", () => {
    const r = buildSpanTree("{hello}world", ctx);
    expect(r.spans.length).toBe(2);
    expect(r.spans[0].text).toBe("hello");
    expect(r.spans[0].color).toEqual({ kind: "qw", class: "qw-w" });
    expect(r.spans[1].text).toBe("world");
    expect(r.spans[1].color).toEqual({ kind: "default" });
  });

  test("nested brace + &cRGB inside brace", () => {
    const r = buildSpanTree("{&cf13red&cfffwhite}outside", ctx);
    expect(r.spans.map((s) => s.text)).toEqual(["red", "white", "outside"]);
    expect(r.spans[0].color).toEqual({ kind: "hex", value: "#ff1133" });
    expect(r.spans[1].color).toEqual({ kind: "hex", value: "#ffffff" });
    expect(r.spans[2].color).toEqual({ kind: "default" });
  });

  test("&r inside brace resets to white (brace default)", () => {
    const r = buildSpanTree("{&cf00red&rwhite}", ctx);
    expect(r.spans[1].text).toBe("white");
    expect(r.spans[1].color).toEqual({ kind: "qw", class: "qw-w" });
  });

  test("braces are not emitted as literal characters", () => {
    const r = buildSpanTree("a{b}c", ctx);
    const joined = r.spans.map((s) => s.text).join("");
    expect(joined).toBe("abc");
  });
});

describe("$variable substitution", () => {
  const state = createDefaultPlayerState();

  test("$var resolves via cvars and emits variable-origin span", () => {
    const cvars = new Map([["tpname", "para"]]);
    const r = buildSpanTree("hi $tpname", { state, cvars, resolver: null });
    const varSpan = r.spans.find((s) => s.origin === "variable");
    expect(varSpan?.text).toBe("para");
    expect(varSpan?.rawToken).toBe("$tpname");
  });

  test("unresolved $var emits unresolved-origin span preserving raw token", () => {
    const r = buildSpanTree("hi $nope there", { state, cvars: new Map(), resolver: null });
    const bad = r.spans.find((s) => s.origin === "unresolved");
    expect(bad?.text).toBe("$nope");
    expect(bad?.rawToken).toBe("$nope");
  });

  test("nested colors inside substituted value render correctly", () => {
    const cvars = new Map([["tp_name_rl", "{&cfffrl&cfff}"]]);
    const r = buildSpanTree("$tp_name_rl", { state, cvars, resolver: null });
    // Expansion "{&cfffrl&cfff}" produces a white-scope span "rl" then pops.
    const white = r.spans.find((s) => s.text === "rl");
    expect(white?.color).toEqual({ kind: "hex", value: "#ffffff" });
    expect(white?.origin).toBe("variable");
  });
});
