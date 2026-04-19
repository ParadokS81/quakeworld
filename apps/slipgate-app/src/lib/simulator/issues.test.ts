import { describe, expect, test } from "bun:test";
import { createDefaultPlayerState } from "./defaults.js";
import { evaluateTeamsay, evaluateCondition } from "./resolver.js";

describe("issue flagging", () => {
  test("unresolved $var", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("say_team $haelth hp", s, new Map(), new Map());
    expect(r.issues.some((i) => i.kind === "unresolved-var" && i.detail.includes("haelth"))).toBe(true);
  });

  test("missing alias in branch", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const aliases = new Map([
      ["_report", "if $health < 1 then .lost else _missing"],
    ]);
    const r = evaluateTeamsay("_report", s, new Map(), aliases);
    expect(r.issues.some((i) => i.kind === "missing-alias" && i.detail.includes("_missing"))).toBe(true);
  });

  test("malformed condition (missing then)", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("if $health < 1 say_team oops", s, new Map(), new Map());
    expect(r.issues.some((i) => i.kind === "malformed-condition")).toBe(true);
  });

  test("regex op flagged as unsupported-regex", () => {
    const r = evaluateCondition("'foo' =~ 'fo.*'", createDefaultPlayerState(), new Map());
    expect(r.issues.some((i) => i.kind === "unsupported-regex")).toBe(true);
  });

  test("cyclic alias hits depth cap", () => {
    const s = createDefaultPlayerState();
    const aliases = new Map([["a", "b"], ["b", "a"]]);
    const r = evaluateTeamsay("a", s, new Map(), aliases);
    expect(r.issues.some((i) => i.kind === "depth-cap-reached")).toBe(true);
  });

  test("side-effect emits trace but not issue", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("set foo bar; say_team hi", s, new Map(), new Map());
    expect(r.trace.some((x) => x.kind === "skip-side-effect")).toBe(true);
    expect(r.issues.filter((i) => i.kind === "side-effect-skipped").length).toBe(0);
  });
});
