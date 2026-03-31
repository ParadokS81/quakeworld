import { describe, expect, test } from "bun:test";
import { parseConfig } from "../src/parser/config-parser.js";

describe("config parser", () => {
  test("parses cvar assignments", () => {
    const result = parseConfig('sensitivity "3.5"\ncl_maxfps "600"\nname "ParadokS"');
    expect(result.cvars.get("sensitivity")).toBe("3.5");
    expect(result.cvars.get("cl_maxfps")).toBe("600");
    expect(result.cvars.get("name")).toBe("ParadokS");
  });

  test("parses unquoted values", () => {
    const result = parseConfig("sensitivity 3.5\ncl_maxfps 600");
    expect(result.cvars.get("sensitivity")).toBe("3.5");
  });

  test("parses bind commands", () => {
    const result = parseConfig('bind mouse1 "+attack"\nbind q "impulse 7"\nbind SPACE "+jump"');
    expect(result.binds.get("mouse1")).toBe("+attack");
    expect(result.binds.get("q")).toBe("impulse 7");
    expect(result.binds.get("space")).toBe("+jump");
  });

  test("parses alias commands", () => {
    const result = parseConfig('alias +zoom "fov 90; sensitivity 2"');
    expect(result.aliases.get("+zoom")).toBe("fov 90; sensitivity 2");
  });

  test("detects exec references", () => {
    const result = parseConfig("exec teamplay.cfg\nexec gfx.cfg");
    expect(result.execs).toContain("teamplay.cfg");
    expect(result.execs).toContain("gfx.cfg");
  });

  test("ignores comments and empty lines", () => {
    const result = parseConfig("// comment\nsensitivity 3.5\n\n// another\ncl_maxfps 600");
    expect(result.cvars.size).toBe(2);
    expect(result.unparsed.length).toBe(0);
  });

  test("handles values with spaces in quotes", () => {
    const result = parseConfig('name "Para dokS [sr]"');
    expect(result.cvars.get("name")).toBe("Para dokS [sr]");
  });
});
