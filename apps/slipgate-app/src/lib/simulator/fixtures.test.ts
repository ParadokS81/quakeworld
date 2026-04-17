import { describe, expect, test } from "bun:test";
import { parseConfig } from "qw-config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createDefaultPlayerState } from "./defaults.js";
import { evaluateCondition, evaluateTeamsay } from "./resolver.js";

function loadFixture(name: string) {
  const path = join(__dirname, "..", "..", "..", "assets", "teamsays", name);
  const text = readFileSync(path, "utf-8");
  const parsed = parseConfig(text);
  return { cvars: parsed.cvars, aliases: parsed.aliases, binds: parsed.binds };
}

describe("locktar.cfg / _report", () => {
  const fx = loadFixture("locktar.cfg");

  test("health >= 1 -> else branch", () => {
    const s = createDefaultPlayerState(); s.health = 50;
    const body = fx.aliases.get("_report")!;
    const r = evaluateTeamsay(body, s, fx.cvars, fx.aliases);
    const cond = r.trace.find((x) => x.kind === "condition");
    expect(cond?.activeBranch).toBe("else");
  });

  test("health < 1 -> then branch (.lost)", () => {
    const s = createDefaultPlayerState(); s.health = 0;
    const body = fx.aliases.get("_report")!;
    const r = evaluateTeamsay(body, s, fx.cvars, fx.aliases);
    const cond = r.trace.find((x) => x.kind === "condition");
    expect(cond?.activeBranch).toBe("then");
  });
});

describe("locktar.cfg / _report2 weapon branching", () => {
  const fx = loadFixture("locktar.cfg");

  test("owns only sg -> sg/ng branch", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg"]);
    s.shells = 25;
    const r = evaluateCondition("$bestweapon isin $tp_name_sg|$tp_name_ng", s, fx.cvars);
    expect(r.result).toBe(true);
  });

  test("owns rl and lg with cells -> lg branch", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl", "lg"]);
    s.cells = 30; s.rockets = 5;
    const r1 = evaluateCondition("$bestweapon isin $tp_name_sg|$tp_name_ng", s, fx.cvars);
    expect(r1.result).toBe(false);
    const r2 = evaluateCondition("$tp_name_lg isin $qt$weapons$qt", s, fx.cvars);
    expect(r2.result).toBe(true);
  });
});

describe("hangtime.cfg / __kill_me", () => {
  const fx = loadFixture("hangtime.cfg");

  test("bestweapon=rl and cells>=6 path", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 5; s.cells = 10;
    const body = fx.aliases.get("__kill_me")!;
    const r = evaluateTeamsay(body, s, fx.cvars, fx.aliases);
    expect(r.output).toBeTruthy();
    expect(r.trace.filter((x) => x.kind === "condition").length).toBeGreaterThanOrEqual(1);
  });

  test("bestweapon=rl and cells<6: compound condition false", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 5; s.cells = 3;
    const r = evaluateCondition("('$bestweapon' = '$tp_name_rl') and ($cells >= 6)", s, fx.cvars);
    expect(r.result).toBe(false);
    const r2 = evaluateCondition("('$bestweapon' = '$tp_name_rl')", s, fx.cvars);
    expect(r2.result).toBe(true);
  });
});

describe("hangtime.cfg / __check_armor", () => {
  const fx = loadFixture("hangtime.cfg");

  test("bestweapon=rl and need contains 'armor' -> armor-need branch", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["rl"]);
    s.rockets = 5;
    const cvars = new Map(fx.cvars);
    cvars.set("need", "armor");
    const cond = "('$bestweapon' isin '$tp_name_lg $tp_name_rl' AND 'armor' isin '$need')";
    expect(evaluateCondition(cond, s, cvars).result).toBe(true);
  });

  test("bestweapon=sg fails rl/lg-specific branch", () => {
    const s = createDefaultPlayerState();
    s.ownedWeapons = new Set(["sg"]);
    s.shells = 25;
    const cond = "('$bestweapon' isin '$tp_name_lg $tp_name_rl' AND 'armor' isin '$need')";
    expect(evaluateCondition(cond, s, fx.cvars).result).toBe(false);
  });
});

describe("bps.cfg smoke", () => {
  const fx = loadFixture("bps.cfg");

  test("fixture parses with cvars and aliases", () => {
    expect(fx.aliases.size).toBeGreaterThan(0);
    expect(fx.cvars.size).toBeGreaterThan(0);
  });

  test("evaluateCondition works against bps.cfg cvars", () => {
    const s = createDefaultPlayerState();
    s.health = 0;
    expect(evaluateCondition("$health < 1", s, fx.cvars).result).toBe(true);
    s.health = 50;
    expect(evaluateCondition("$health < 1", s, fx.cvars).result).toBe(false);
  });
});
