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

describe("$X char-code expansion", () => {
  const state = createDefaultPlayerState();
  const ctx = { state, cvars: new Map<string, string>(), resolver: null };

  test("$] emits gold right bracket with qw-g class", () => {
    const r = buildSpanTree("$]", ctx);
    expect(r.spans.length).toBe(1);
    expect(r.spans[0].text).toBe("]");
    expect(r.spans[0].origin).toBe("charcode");
    expect(r.spans[0].color).toEqual({ kind: "qw", class: "qw-g" });
    expect(r.spans[0].rawToken).toBe("$]");
  });

  test("$, emits white bullet with qw-w class", () => {
    const r = buildSpanTree("$,", ctx);
    expect(r.spans[0].text).toBe("\u2022");
    expect(r.spans[0].color).toEqual({ kind: "qw", class: "qw-w" });
  });

  test("$. emits brown bullet with qw-b class (since 0x9C > 0x9B)", () => {
    const r = buildSpanTree("$.", ctx);
    // 0x9C & 0x7F = 0x1C, which maps to bullet \u2022; color is qw-b because 0x9C >= 0x80
    expect(r.spans[0].text).toBe("\u2022");
    expect(r.spans[0].color).toEqual({ kind: "qw", class: "qw-b" });
  });

  test("unknown $X falls through as literal", () => {
    const r = buildSpanTree("$!x", ctx);
    const joined = r.spans.map((s) => s.text).join("");
    expect(joined).toBe("$!x");
  });
});

describe("%token resolution via RuntimeResolver", () => {
  const state = createDefaultPlayerState();

  test("LabelResolver: %a renders as 'armor' with runtime origin", async () => {
    const { createLabelResolver } = await import("./runtimeResolver.js");
    const r = buildSpanTree("%a", { state, cvars: new Map(), resolver: createLabelResolver() });
    expect(r.spans[0].text).toBe("armor");
    expect(r.spans[0].origin).toBe("runtime");
    expect(r.spans[0].rawToken).toBe("%a");
  });

  test("Unknown %token with resolver returning null falls through as unresolved", async () => {
    const { createLabelResolver } = await import("./runtimeResolver.js");
    const r = buildSpanTree("%nope", { state, cvars: new Map(), resolver: createLabelResolver() });
    expect(r.spans[0].origin).toBe("unresolved");
    expect(r.spans[0].text).toBe("%nope");
  });

  test("No resolver leaves %token as literal text", () => {
    const r = buildSpanTree("%a", { state, cvars: new Map(), resolver: null });
    expect(r.spans[0].origin).toBe("literal");
    expect(r.spans[0].text).toBe("%a");
  });
});

describe("tier 3: if/then/else active-branch dimming", () => {
  const state = createDefaultPlayerState();
  test("active=then marks else spans as branchInactive", () => {
    const r = buildSpanTree("if $health < 1 then a else b", {
      state, cvars: new Map(), resolver: null,
      activeBranches: new Map([["$health < 1", "then"]]),
    });
    const a = r.spans.find((s) => s.text === "a");
    const b = r.spans.find((s) => s.text === "b");
    expect(a?.branchInactive).toBeFalsy();
    expect(b?.branchInactive).toBe(true);
  });
  test("active=else marks then spans as branchInactive", () => {
    const r = buildSpanTree("if $health < 1 then a else b", {
      state, cvars: new Map(), resolver: null,
      activeBranches: new Map([["$health < 1", "else"]]),
    });
    const a = r.spans.find((s) => s.text === "a");
    const b = r.spans.find((s) => s.text === "b");
    expect(a?.branchInactive).toBe(true);
    expect(b?.branchInactive).toBeFalsy();
  });
  test("no activeBranches entry leaves both branches unmarked", () => {
    const r = buildSpanTree("if $health < 1 then a else b", {
      state, cvars: new Map(), resolver: null,
    });
    const a = r.spans.find((s) => s.text === "a");
    const b = r.spans.find((s) => s.text === "b");
    expect(a?.branchInactive).toBeFalsy();
    expect(b?.branchInactive).toBeFalsy();
  });
});
