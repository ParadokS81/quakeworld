import { describe, expect, test } from "bun:test";
import { expandDollarCode, qwByteToChar, qwByteColor } from "./charCodeTable.js";

describe("expandDollarCode", () => {
  test("single-char codes map to expected bytes", () => {
    expect(expandDollarCode("]")).toBe(0x11); // gold right bracket
    expect(expandDollarCode(",")).toBe(0x1C); // white bullet
    expect(expandDollarCode(".")).toBe(0x9C); // brown dot
    expect(expandDollarCode("Y")).toBe(0x88); // yellow LED
    expect(expandDollarCode("0")).toBe(0x12); // gold digit zero
  });
  test("returns null for unknown chars", () => {
    expect(expandDollarCode("q")).toBeNull();
    expect(expandDollarCode("!")).toBeNull();
  });
});

describe("qwByteToChar", () => {
  test("printable ASCII round-trips", () => {
    expect(qwByteToChar(0x41)).toBe("A");
    expect(qwByteToChar(0x7E)).toBe("~");
  });
  test("control bytes map to glyphs", () => {
    expect(qwByteToChar(0x10)).toBe("[");
    expect(qwByteToChar(0x11)).toBe("]");
    expect(qwByteToChar(0x12)).toBe("0");
    expect(qwByteToChar(0x1C)).toBe("\u2022"); // bullet dot
    expect(qwByteToChar(0x1E)).toBe("\u2014"); // em dash
  });
});

describe("qwByteColor", () => {
  test("gold range returns g", () => {
    expect(qwByteColor(0x10)).toBe("g");
    expect(qwByteColor(0x1B)).toBe("g");
  });
  test("high-bit range returns b", () => {
    expect(qwByteColor(0x80)).toBe("b");
    // 0x9C is outside the gold variant range (0x90-0x9B), so it falls into brown/high-bit
    expect(qwByteColor(0x9C)).toBe("b");
    expect(qwByteColor(0xA0)).toBe("b");
  });
  test("normal ASCII returns w", () => {
    expect(qwByteColor(0x41)).toBe("w");
    expect(qwByteColor(0x20)).toBe("w");
  });
});
