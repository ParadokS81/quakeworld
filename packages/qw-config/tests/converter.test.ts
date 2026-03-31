import { describe, expect, test } from "bun:test";
import { convertConfig } from "../src/converter/converter.js";
import { parseConfig } from "../src/parser/config-parser.js";
import { generateReport } from "../src/converter/report.js";

describe("converter", () => {
  const sampleConfig = 'sensitivity "3.5"\ncl_maxfps "600"\nfov "120"\nbind mouse1 "+attack"\nbind q "impulse 7"';

  test("converts ezquake to fte", () => {
    const parsed = parseConfig(sampleConfig);
    const result = convertConfig(parsed, "ezquake", "fte");
    expect(result.targetCvars.has("cl_maxfps")).toBe(true);
  });

  test("preserves binds", () => {
    const parsed = parseConfig(sampleConfig);
    const result = convertConfig(parsed, "ezquake", "fte");
    expect(result.targetBinds.has("mouse1")).toBe(true);
    expect(result.targetBinds.get("mouse1")).toBe("+attack");
  });

  test("generates report with correct counts", () => {
    const parsed = parseConfig(sampleConfig);
    const result = convertConfig(parsed, "ezquake", "fte");
    const report = generateReport(result, parsed, "ezquake", "fte");
    expect(report.sourceClient).toBe("ezquake");
    expect(report.targetClient).toBe("fte");
    expect(report.transferred.length + report.mapped.length + report.noEquivalent.length).toBeGreaterThan(0);
    expect(report.coverage).toBeGreaterThanOrEqual(0);
    expect(report.coverage).toBeLessThanOrEqual(100);
  });
});
