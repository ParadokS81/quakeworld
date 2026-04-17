import { describe, expect, test } from "bun:test";
import { tokenize, evaluateExpression } from "./evaluator.js";

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

describe("evaluateExpression -- comparison", () => {
  test("numeric equality", () => {
    expect(evaluateExpression("5 == 5").result).toBe(true);
    expect(evaluateExpression("5 = 5").result).toBe(true);
    expect(evaluateExpression("5 == 6").result).toBe(false);
  });
  test("string equality (non-numeric operands)", () => {
    expect(evaluateExpression("'rl' == 'rl'").result).toBe(true);
    expect(evaluateExpression("'5' == '5a'").result).toBe(false);
    expect(evaluateExpression(`"foo" = "foo"`).result).toBe(true);
  });
  test("inequality", () => {
    expect(evaluateExpression("5 != 6").result).toBe(true);
    expect(evaluateExpression("5 <> 5").result).toBe(false);
    expect(evaluateExpression("'a' != 'b'").result).toBe(true);
  });
  test("numeric ordering", () => {
    expect(evaluateExpression("3 < 5").result).toBe(true);
    expect(evaluateExpression("5 > 3").result).toBe(true);
    expect(evaluateExpression("5 <= 5").result).toBe(true);
    expect(evaluateExpression("5 >= 5").result).toBe(true);
    expect(evaluateExpression("5 < 3").result).toBe(false);
  });
});

describe("evaluateExpression -- isin", () => {
  test("substring match", () => {
    expect(evaluateExpression("'rl' isin 'sg ssg rl lg'").result).toBe(true);
    expect(evaluateExpression("'gl' isin 'sg ssg rl lg'").result).toBe(false);
  });
  test("!isin negates", () => {
    expect(evaluateExpression("'gl' !isin 'sg ssg rl lg'").result).toBe(true);
    expect(evaluateExpression("'rl' !isin 'sg ssg rl lg'").result).toBe(false);
  });
});

describe("evaluateExpression -- logical", () => {
  test("&& both true", () => {
    expect(evaluateExpression("1 == 1 && 2 == 2").result).toBe(true);
    expect(evaluateExpression("1 == 1 && 2 == 3").result).toBe(false);
  });
  test("|| either true", () => {
    expect(evaluateExpression("1 == 1 || 2 == 3").result).toBe(true);
    expect(evaluateExpression("1 == 2 || 2 == 3").result).toBe(false);
  });
  test("keyword variants", () => {
    expect(evaluateExpression("1 == 1 and 2 == 2").result).toBe(true);
    expect(evaluateExpression("1 == 1 AND 2 == 2").result).toBe(true);
    expect(evaluateExpression("1 == 2 or 2 == 2").result).toBe(true);
    expect(evaluateExpression("1 == 2 OR 2 == 2").result).toBe(true);
  });
});

describe("evaluateExpression -- precedence", () => {
  test("&& binds tighter than ||", () => {
    // 0 || (1 && 0) == 0
    expect(evaluateExpression("1 == 2 || 1 == 1 && 1 == 2").result).toBe(false);
  });
  test("parens override", () => {
    expect(evaluateExpression("(1 == 2 || 1 == 1) && 1 == 2").result).toBe(false);
    expect(evaluateExpression("(1 == 2 || 1 == 1) && 1 == 1").result).toBe(true);
  });
});
