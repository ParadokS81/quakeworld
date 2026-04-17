import { describe, expect, test } from "bun:test";
import { tokenize } from "./evaluator.js";

describe("tokenize", () => {
  test("numbers, strings, ops, parens", () => {
    const t = tokenize(`("rl" isin 'lg rl' && 5 > 0)`);
    expect(t.map((x) => x.kind)).toEqual([
      "lparen", "string", "op", "string", "op", "number", "op", "number", "rparen",
    ]);
  });
  test("string quote styles", () => {
    expect(tokenize(`"foo"`)[0].value).toBe("foo");
    expect(tokenize(`'bar'`)[0].value).toBe("bar");
  });
  test("bare identifiers as strings", () => {
    const t = tokenize("rl isin weapons");
    expect(t[0]).toEqual({ kind: "string", value: "rl" });
    expect(t[1]).toEqual({ kind: "op", value: "isin" });
    expect(t[2]).toEqual({ kind: "string", value: "weapons" });
  });
  test("comparison operators", () => {
    for (const op of ["==", "!=", "<>", "<", "<=", ">", ">=", "="]) {
      expect(tokenize(`1 ${op} 1`)[1]).toEqual({ kind: "op", value: op });
    }
  });
  test("logical operator variants", () => {
    expect(tokenize("1 && 2")[1].value).toBe("&&");
    expect(tokenize("1 and 2")[1].value).toBe("and");
    expect(tokenize("1 AND 2")[1].value).toBe("AND");
    expect(tokenize("1 || 2")[1].value).toBe("||");
    expect(tokenize("1 or 2")[1].value).toBe("or");
    expect(tokenize("1 OR 2")[1].value).toBe("OR");
  });
  test("isin and !isin", () => {
    expect(tokenize("a isin b")[1].value).toBe("isin");
    expect(tokenize("a !isin b")[1].value).toBe("!isin");
  });
  test("regex ops", () => {
    expect(tokenize("a =~ b")[1].value).toBe("=~");
    expect(tokenize("a !~ b")[1].value).toBe("!~");
  });
  test("arithmetic", () => {
    for (const op of ["+", "-", "*", "/"]) {
      expect(tokenize(`1 ${op} 1`)[1]).toEqual({ kind: "op", value: op });
    }
  });
});
