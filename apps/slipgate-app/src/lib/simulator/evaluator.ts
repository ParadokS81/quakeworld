import type { Issue } from "./types.js";

export interface Token {
  kind: "number" | "string" | "op" | "lparen" | "rparen";
  value: string;
}

// Longest-first so <= beats <, etc.
const MULTI_CHAR_OPS = [
  "!isin", "isin",
  "==", "!=", "<>", "<=", ">=",
  "&&", "||",
  "=~", "!~",
  "and", "AND", "or", "OR",
];
const SINGLE_CHAR_OPS = ["<", ">", "=", "+", "-", "*", "/"];

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const c = input[i];

    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (c === "(") { tokens.push({ kind: "lparen", value: "(" }); i++; continue; }
    if (c === ")") { tokens.push({ kind: "rparen", value: ")" }); i++; continue; }

    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      const start = i;
      while (i < n && input[i] !== quote) i++;
      tokens.push({ kind: "string", value: input.slice(start, i) });
      if (i < n) i++;
      continue;
    }

    let matched = false;
    for (const op of MULTI_CHAR_OPS) {
      if (input.startsWith(op, i)) {
        // For alpha keywords and !isin require word boundary.
        if (/^[a-zA-Z!]/.test(op)) {
          const endIdx = i + op.length;
          const boundary = endIdx >= n || !/[\w]/.test(input[endIdx]);
          const leftBoundary = i === 0 || !/[\w]/.test(input[i - 1]) || op.startsWith("!");
          if (!boundary || !leftBoundary) continue;
        }
        tokens.push({ kind: "op", value: op });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (SINGLE_CHAR_OPS.includes(c)) {
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }

    if (/[0-9.]/.test(c)) {
      const start = i;
      while (i < n && /[0-9.]/.test(input[i])) i++;
      tokens.push({ kind: "number", value: input.slice(start, i) });
      continue;
    }

    if (/[\w]/.test(c)) {
      const start = i;
      while (i < n && /[\w\-_.]/.test(input[i])) i++;
      tokens.push({ kind: "string", value: input.slice(start, i) });
      continue;
    }

    i++;
  }

  return tokens;
}

export interface EvaluateResult {
  result: boolean;
  issues: Issue[];
}

type AstNode =
  | { kind: "literal"; value: string }
  | { kind: "binary"; op: string; left: AstNode; right: AstNode }
  | { kind: "unary"; op: string; arg: AstNode };

interface ParseState {
  tokens: Token[];
  pos: number;
  issues: Issue[];
}

function peek(p: ParseState): Token | null {
  return p.pos < p.tokens.length ? p.tokens[p.pos] : null;
}
function consume(p: ParseState): Token | null {
  return p.pos < p.tokens.length ? p.tokens[p.pos++] : null;
}
function expectRParen(p: ParseState): void {
  const tok = consume(p);
  if (!tok || tok.kind !== "rparen") {
    p.issues.push({ kind: "malformed-condition", detail: "expected )" });
  }
}

function parsePrimary(p: ParseState): AstNode {
  const tok = consume(p);
  if (!tok) {
    p.issues.push({ kind: "malformed-condition", detail: "unexpected end of expression" });
    return { kind: "literal", value: "" };
  }
  if (tok.kind === "number" || tok.kind === "string") {
    return { kind: "literal", value: tok.value };
  }
  if (tok.kind === "lparen") {
    const inner = parseExpression(p);
    expectRParen(p);
    return inner;
  }
  if (tok.kind === "op" && tok.value === "-") {
    return { kind: "unary", op: "-", arg: parsePrimary(p) };
  }
  p.issues.push({ kind: "malformed-condition", detail: `unexpected token: ${tok.value}` });
  return { kind: "literal", value: "" };
}

const COMPARISON_OPS = new Set([
  "==", "!=", "<>", "<", "<=", ">", ">=", "=", "isin", "!isin", "=~", "!~",
]);

function parseComparison(p: ParseState): AstNode {
  const left = parseAdditive(p);
  const tok = peek(p);
  if (tok && tok.kind === "op" && COMPARISON_OPS.has(tok.value)) {
    consume(p);
    const right = parseAdditive(p);
    return { kind: "binary", op: tok.value, left, right };
  }
  return left;
}

function parseAdditive(p: ParseState): AstNode {
  let left = parseMultiplicative(p);
  while (true) {
    const tok = peek(p);
    if (!tok || tok.kind !== "op" || (tok.value !== "+" && tok.value !== "-")) break;
    consume(p);
    const right = parseMultiplicative(p);
    left = { kind: "binary", op: tok.value, left, right };
  }
  return left;
}

function parseMultiplicative(p: ParseState): AstNode {
  let left = parsePrimary(p);
  while (true) {
    const tok = peek(p);
    if (!tok || tok.kind !== "op" || (tok.value !== "*" && tok.value !== "/")) break;
    consume(p);
    const right = parsePrimary(p);
    left = { kind: "binary", op: tok.value, left, right };
  }
  return left;
}

function isLogicalOr(op: string): boolean {
  return op === "||" || op === "or" || op === "OR";
}

function isLogicalAnd(op: string): boolean {
  return op === "&&" || op === "and" || op === "AND";
}

function parseOr(p: ParseState): AstNode {
  let left = parseAnd(p);
  while (true) {
    const tok = peek(p);
    if (!tok || tok.kind !== "op" || !isLogicalOr(tok.value)) break;
    consume(p);
    const right = parseAnd(p);
    left = { kind: "binary", op: "||", left, right };
  }
  return left;
}

function parseAnd(p: ParseState): AstNode {
  let left = parseComparison(p);
  while (true) {
    const tok = peek(p);
    if (!tok || tok.kind !== "op" || !isLogicalAnd(tok.value)) break;
    consume(p);
    const right = parseComparison(p);
    left = { kind: "binary", op: "&&", left, right };
  }
  return left;
}

function parseExpression(p: ParseState): AstNode {
  return parseOr(p);
}

function isNumeric(s: string): boolean {
  if (s.length === 0) return false;
  return /^-?\d+(\.\d+)?$/.test(s.trim());
}

function truthy(v: string): boolean {
  if (v === "1" || v.toLowerCase() === "true") return true;
  if (v === "0" || v.toLowerCase() === "false") return false;
  if (isNumeric(v)) return parseFloat(v) !== 0;
  return v.length > 0;
}

function evalNode(node: AstNode, issues: Issue[]): string {
  if (node.kind === "literal") return node.value;
  if (node.kind === "unary" && node.op === "-") {
    const v = evalNode(node.arg, issues);
    if (isNumeric(v)) return String(-parseFloat(v));
    return `-${v}`;
  }
  if (node.kind === "binary") {
    if (node.op === "&&") {
      const l = evalNode(node.left, issues);
      if (!truthy(l)) return "0";
      return truthy(evalNode(node.right, issues)) ? "1" : "0";
    }
    if (node.op === "||") {
      const l = evalNode(node.left, issues);
      if (truthy(l)) return "1";
      return truthy(evalNode(node.right, issues)) ? "1" : "0";
    }
    const l = evalNode(node.left, issues);
    const r = evalNode(node.right, issues);
    return evalBinary(node.op, l, r, issues);
  }
  return "";
}

function evalBinary(op: string, l: string, r: string, issues: Issue[]): string {
  if (op === "==" || op === "=" || op === "!=" || op === "<>") {
    const equal = isNumeric(l) && isNumeric(r)
      ? parseFloat(l) === parseFloat(r)
      : l === r;
    const inequality = op === "!=" || op === "<>";
    return (equal !== inequality) ? "1" : "0";
  }
  if (op === "<") return parseFloat(l) < parseFloat(r) ? "1" : "0";
  if (op === ">") return parseFloat(l) > parseFloat(r) ? "1" : "0";
  if (op === "<=") return parseFloat(l) <= parseFloat(r) ? "1" : "0";
  if (op === ">=") return parseFloat(l) >= parseFloat(r) ? "1" : "0";
  if (op === "isin") return r.indexOf(l) >= 0 ? "1" : "0";
  if (op === "!isin") return r.indexOf(l) >= 0 ? "0" : "1";
  if (op === "=~" || op === "!~") {
    issues.push({ kind: "unsupported-regex", detail: `regex op ${op} not simulated` });
    return "0";
  }
  if (op === "+") {
    if (isNumeric(l) && isNumeric(r)) return String(parseFloat(l) + parseFloat(r));
    return l + r;
  }
  if (op === "-") return String(parseFloat(l) - parseFloat(r));
  if (op === "*") return String(parseFloat(l) * parseFloat(r));
  if (op === "/") {
    const rv = parseFloat(r);
    if (rv === 0) {
      issues.push({ kind: "malformed-condition", detail: "division by zero" });
      return "0";
    }
    return String(parseFloat(l) / rv);
  }
  issues.push({ kind: "unknown-operator", detail: op });
  return "0";
}

export function evaluateExpression(expr: string): EvaluateResult {
  const p: ParseState = { tokens: tokenize(expr), pos: 0, issues: [] };
  const ast = parseExpression(p);
  const value = evalNode(ast, p.issues);
  return { result: value === "1" || value.toLowerCase() === "true", issues: p.issues };
}
