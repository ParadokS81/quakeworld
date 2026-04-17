import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseConfig } from "qw-config";
import { buildSpanTree } from "./prettyRender.js";
import { createDefaultPlayerState } from "./simulator/index.js";

function loadFixture(name: string) {
  // __dirname resolves to the directory of this test file: src/lib/
  const path = join(__dirname, "..", "..", "assets", "teamsays", name);
  const text = readFileSync(path, "utf-8");
  return parseConfig(text);
}

describe("fixture: locktar.cfg / tp_name_rlg", () => {
  const fx = loadFixture("locktar.cfg");
  const cvars = fx.cvars;
  const ctx = { state: createDefaultPlayerState(), cvars, resolver: null };

  test("tp_name_rlg renders with no brace/color codes in output", () => {
    const raw = cvars.get("tp_name_rlg")!;
    const r = buildSpanTree(raw, ctx);
    const joined = r.spans.map((s) => s.text).join("");
    expect(joined).not.toMatch(/[{}]/);
    expect(joined).not.toMatch(/&[cr]/);
  });

  test("tp_name_rlg contains a hex-colored rl span", () => {
    const raw = cvars.get("tp_name_rlg")!;
    const r = buildSpanTree(raw, ctx);
    const rl = r.spans.find((s) => s.text === "rl");
    expect(rl).toBeDefined();
    expect(rl?.color.kind).toBe("hex");
  });
});

describe("fixture: hangtime.cfg sample alias body", () => {
  const fx = loadFixture("hangtime.cfg");
  const ctx = { state: createDefaultPlayerState(), cvars: fx.cvars, resolver: null };

  test("renders .msg.lost body without raw color codes in output", () => {
    const body = fx.aliases.get(".msg.lost");
    if (!body) return; // skip if fixture changed
    const r = buildSpanTree(body, ctx);
    const joined = r.spans.map((s) => s.text).join("");
    expect(joined).not.toMatch(/&c[0-9a-f]{3}/);
  });
});
