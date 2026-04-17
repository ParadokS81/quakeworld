import { describe, expect, test } from "bun:test";
import { applyOnloadChain } from "./onload.js";

describe("applyOnloadChain", () => {
  test("no cl_onload -> returns input unchanged (by value)", () => {
    const cvars = new Map([["tpname", "para"]]);
    const out = applyOnloadChain(cvars, new Map());
    expect(out.get("tpname")).toBe("para");
  });

  test("bare set in cl_onload writes cvar", () => {
    const cvars = new Map([
      ["tpname", "para"],
      ["cl_onload", 'set tpname "foo"'],
    ]);
    const out = applyOnloadChain(cvars, new Map());
    expect(out.get("tpname")).toBe("foo");
  });

  test("alias invocation in cl_onload runs alias body's sets", () => {
    const cvars = new Map([
      ["tpname", "para"],
      ["nick", "para"],
      ["cl_onload", "sr.2"],
    ]);
    const aliases = new Map([
      ["sr.2", 'set tpname $qt{&cfd2$nick:&cfff}$qt'],
    ]);
    const out = applyOnloadChain(cvars, aliases);
    // $qt expands to a literal quote, $nick expands to "para".
    expect(out.get("tpname")).toBe('"{&cfd2para:&cfff}"');
  });

  test("exec + alias invocation -- exec is skipped, alias fires", () => {
    const cvars = new Map([
      ["tpname", "para"],
      ["nick", "para"],
      ["cl_onload", "exec configs/slackers_tp.cfg; clear; sr.2"],
    ]);
    const aliases = new Map([
      ["sr.2", 'set tpname "$nick:"'],
    ]);
    const out = applyOnloadChain(cvars, aliases);
    expect(out.get("tpname")).toBe("para:");
  });

  test("alias recursion depth-capped; cyclic a -> b -> a stops", () => {
    const cvars = new Map([
      ["cl_onload", "a"],
      ["x", "init"],
    ]);
    const aliases = new Map([
      ["a", "b; set x step_a"],
      ["b", "a; set x step_b"],
    ]);
    const out = applyOnloadChain(cvars, aliases);
    // Cycle breaks via visited-set; at least one set should have fired.
    expect(["step_a", "step_b"]).toContain(out.get("x"));
  });

  test("unknown command or alias is ignored, does not crash", () => {
    const cvars = new Map([
      ["cl_onload", "unknown_token; set y 42"],
    ]);
    const out = applyOnloadChain(cvars, new Map());
    expect(out.get("y")).toBe("42");
  });

  test("input map is not mutated", () => {
    const cvars = new Map([
      ["tpname", "para"],
      ["cl_onload", 'set tpname "bar"'],
    ]);
    applyOnloadChain(cvars, new Map());
    expect(cvars.get("tpname")).toBe("para");
  });

  test("semicolons inside quotes are not split", () => {
    const cvars = new Map([
      ["cl_onload", 'set x "a;b;c"'],
    ]);
    const out = applyOnloadChain(cvars, new Map());
    expect(out.get("x")).toBe("a;b;c");
  });
});
