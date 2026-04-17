import { describe, expect, test } from "bun:test";
import { createSimulatorResolver, evaluateCondition, evaluateTeamsay } from "./resolver.js";
import { createDefaultPlayerState } from "./defaults.js";

describe("createSimulatorResolver", () => {
  test("engine token resolves to value", () => {
    const s = createDefaultPlayerState(); s.health = 87;
    const r = createSimulatorResolver(s, new Map());
    const res = r.resolve("health");
    expect(res).not.toBeNull();
    expect(res!.display).toBe("87");
    expect(res!.origin).toBe("runtime");
  });
  test("short-form %a -> armor", () => {
    const s = createDefaultPlayerState(); s.armor = 150;
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("a")!.display).toBe("150");
  });
  test("derived %bestweapon", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg", "rl"]);
    s.rockets = 5;
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("bestweapon")!.display).toBe("rl");
  });
  test("unknown token -> null", () => {
    const s = createDefaultPlayerState();
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("sparklemotion")).toBeNull();
  });
  test("tooltip describes source", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const r = createSimulatorResolver(s, new Map());
    expect(r.resolve("health")!.tooltip).toContain("health");
  });
});

describe("evaluateCondition", () => {
  test("expanded then evaluated", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const r = evaluateCondition("$health < 100", s, new Map());
    expect(r.result).toBe(true);
    expect(r.issues).toHaveLength(0);
  });
  test("false isin after expansion", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg"]);
    const cvars = new Map([["tp_name_rl", "rl"], ["tp_name_sg", "sg"]]);
    expect(evaluateCondition("'$tp_name_rl' isin '$weapons'", s, cvars).result).toBe(false);
  });
});

describe("evaluateTeamsay", () => {
  test("plain say_team body passes through", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("say_team hello team", s, new Map(), new Map());
    expect(r.output).toContain("hello team");
    expect(r.issues).toHaveLength(0);
  });

  test("old-form if selects branch", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const r = evaluateTeamsay(
      "if $health < 1 then say_team dead else say_team alive",
      s, new Map(), new Map(),
    );
    expect(r.output).toContain("alive");
    expect(r.trace.some((x) => x.kind === "condition" && x.activeBranch === "else")).toBe(true);
  });

  test("new-form parenthesized if", () => {
    const s = createDefaultPlayerState(); s.health = 0;
    const r = evaluateTeamsay(
      "if ($health < 1) then say_team dead else say_team alive",
      s, new Map(), new Map(),
    );
    expect(r.output).toContain("dead");
  });

  test("follows alias target from branch", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const aliases = new Map([
      ["_report", "if $health < 1 then .lost else _report1"],
      ["_report1", "say_team reporting in"],
    ]);
    const r = evaluateTeamsay("_report", s, new Map(), aliases);
    expect(r.output).toContain("reporting in");
    expect(r.trace.some((x) => x.kind === "alias-follow" && x.text === "_report1")).toBe(true);
  });

  test("missing alias target emits issue", () => {
    const s = createDefaultPlayerState(); s.health = 0;
    const aliases = new Map([["_report", "if $health < 1 then _nope else say_team ok"]]);
    const r = evaluateTeamsay("_report", s, new Map(), aliases);
    expect(r.issues.some((i) => i.kind === "missing-alias" && i.detail.includes("_nope"))).toBe(true);
  });

  test("cyclic alias hits depth cap", () => {
    const s = createDefaultPlayerState();
    const aliases = new Map([["a", "b"], ["b", "a"]]);
    const r = evaluateTeamsay("a", s, new Map(), aliases);
    expect(r.issues.some((i) => i.kind === "depth-cap-reached")).toBe(true);
  });

  test("set_tp skipped with info trace", () => {
    const s = createDefaultPlayerState();
    const r = evaluateTeamsay("set_tp tvs_string_rl rl; say_team hi", s, new Map(), new Map());
    expect(r.output).toContain("hi");
    expect(r.trace.some((x) => x.kind === "skip-side-effect")).toBe(true);
  });
});
